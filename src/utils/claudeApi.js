const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_WHISPER_MODEL = 'whisper-large-v3';

// ── Step 1: Groq Whisper ──────────────────────────────────────────────────────

async function transcribeWithWhisper(audioFile, groqApiKey) {
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', GROQ_WHISPER_MODEL);
  formData.append('response_format', 'text');

  const response = await fetch(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqApiKey}` },
    body: formData,
  });

  if (!response.ok) {
    let errMsg = `שגיאת Groq (${response.status})`;
    try {
      const errData = await response.json();
      errMsg = errData.error?.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const text = await response.text();
  if (!text || !text.trim()) throw new Error('Groq לא החזיר טקסט — ייתכן שהקובץ ריק או לא תקין');
  return text.trim();
}

// ── Step 2: Claude editing ────────────────────────────────────────────────────

function buildClaudePrompt(type, metadata, language, outputLanguage, rawText) {
  const { maggid, topic, terms } = metadata;
  const isYiddish = language === 'yiddish';
  const outputInYiddish = isYiddish && outputLanguage === 'yiddish';

  const langNote = isYiddish
    ? outputInYiddish
      ? 'השיעור הוא באידיש. הפלט יהיה באידיש.'
      : 'השיעור הוא באידיש. תרגם ועבד את הטקסט לעברית.'
    : 'השיעור בעברית. הפלט יהיה בעברית.';

  const rawSection = `להלן התמלול הגולמי שהופק על ידי מחשב:\n---\n${rawText}\n---\n`;

  const prompts = {
    basic: `אתה עורך תמלול שיעור תורני.
שם המגיד: ${maggid || 'לא צוין'}. נושא: ${topic || 'לא צוין'}. מונחים מיוחדים: ${terms || 'לא צוינו'}.
${langNote}

${rawSection}
הנחיות:
- ערוך את הטקסט כך שיהיה קולח, מקצועי וברור
- שמור על רצף הרעיונות והקצב המקורי
- אל תוסיף תוכן חדש — רק ערוך ושפר
- התעלם מרעשי רקע, הפסקות ואמירות אקראיות שאינן חלק מהשיעור
- חלק לפסקאות לפי זרימת הרעיונות
- הפלט יהיה קריא ומסודר, מוכן לקריאה תוך כדי שמיעה`,

    extended: `אתה עורך תמלול שיעור תורני ברמה גבוהה.
שם המגיד: ${maggid || 'לא צוין'}. נושא: ${topic || 'לא צוין'}. מונחים מיוחדים: ${terms || 'לא צוינו'}.
${langNote}

${rawSection}
הנחיות:
- ערוך את הטקסט בצורה קולחת ומקצועית
- הוסף כותרות לפי נושאי המשנה של השיעור — סמן אותן עם ** בתחילה ובסוף
- הוסף מראי מקומות (פסוקים, מקורות) שמוזכרים — סמן אותם בסוגריים מרובעים [כך]
- זיהוי אוטומטי של פסוקים וציטוטים — עצב אותם במרכאות כפולות
- עריכה קלה בלבד — אל תוסיף תוכן חדש
- חלק לפסקאות ברורות לפי נושאי המשנה`,

    summary: `אתה מסכם שיעור תורני.
שם המגיד: ${maggid || 'לא צוין'}. נושא: ${topic || 'לא צוין'}.
${langNote}

${rawSection}
הנחיות:
- כתוב סיכום תמציתי וברור של השיעור
- שמור על עיקרי הרעיונות לפי סדרם
- אל תוסיף דברים שלא נאמרו
- חלק לנקודות עיקריות עם מספור`,
  };

  return prompts[type];
}

async function editWithClaude(rawText, type, metadata, language, outputLanguage, anthropicApiKey) {
  const prompt = buildClaudePrompt(type, metadata, language, outputLanguage, rawText);

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    let errMsg = `שגיאת Claude (${response.status})`;
    try {
      const errData = await response.json();
      errMsg = errData.error?.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Full pipeline: Whisper (audio→text) → Claude (text→edited).
 * @param {File}     audioFile
 * @param {object}   metadata         - { maggid, topic, terms, ... }
 * @param {string}   transcriptionType - 'basic' | 'extended' | 'summary'
 * @param {string}   language         - 'hebrew' | 'yiddish'
 * @param {string}   outputLanguage   - 'hebrew' | 'yiddish'
 * @param {string}   anthropicApiKey
 * @param {string}   groqApiKey
 * @param {string|null} cachedRawText - reuse Groq result from a prior run
 * @param {Function} onProgress       - called with 'whisper' | 'claude'
 * @returns {{ edited: string, rawText: string }}
 */
export async function transcribeAudio({
  audioFile,
  metadata,
  transcriptionType,
  language,
  outputLanguage,
  anthropicApiKey,
  groqApiKey,
  cachedRawText = null,
  onProgress,
}) {
  if (!anthropicApiKey) throw new Error('מפתח Anthropic API לא הוגדר');
  if (!groqApiKey) throw new Error('מפתח Groq API לא הוגדר');

  let rawText = cachedRawText;

  if (!rawText) {
    onProgress?.('whisper');
    rawText = await transcribeWithWhisper(audioFile, groqApiKey);
  }

  onProgress?.('claude');
  const edited = await editWithClaude(rawText, transcriptionType, metadata, language, outputLanguage, anthropicApiKey);

  return { edited, rawText };
}
