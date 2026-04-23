const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const API_URL = 'https://api.anthropic.com/v1/messages';

function getAudioMimeType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  const map = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    webm: 'audio/webm',
  };
  return map[ext] || 'audio/mpeg';
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildPrompt(type, metadata, language, outputLanguage) {
  const { maggid, topic, terms } = metadata;
  const isYiddish = language === 'yiddish';
  const outputInYiddish = isYiddish && outputLanguage === 'yiddish';

  const langNote = isYiddish
    ? outputInYiddish
      ? 'השיעור הוא באידיש. הפלט יהיה באידיש.'
      : 'השיעור הוא באידיש. תרגם ותמלל לעברית.'
    : 'השיעור הוא בעברית. הפלט יהיה בעברית.';

  const prompts = {
    basic: `אתה מתמלל שיעור תורני.
שם המגיד: ${maggid || 'לא צוין'}. נושא: ${topic || 'לא צוין'}. מונחים מיוחדים: ${terms || 'לא צוינו'}.
${langNote}

הנחיות:
- אל תעשה תמלול מילה במילה
- ערוך את השפה כך שתהיה קולחת, מקצועית וברורה
- שמור על רצף הרעיונות והקצב המקורי
- אל תוסיף תוכן חדש — רק ערוך ושפר
- הפלט צריך להיות קריא ומסודר, מוכן לקריאה תוך כדי שמיעה
- אם יש רעשי רקע או קטעים לא ברורים — התעלם מהם בחן והתמקד בדברים המשמעותיים
- חלק לפסקאות לפי זרימת הרעיונות`,

    extended: `אתה מתמלל שיעור תורני ברמה גבוהה.
שם המגיד: ${maggid || 'לא צוין'}. נושא: ${topic || 'לא צוין'}. מונחים מיוחדים: ${terms || 'לא צוינו'}.
${langNote}

הנחיות:
- ערוך את השפה בצורה קולחת ומקצועית
- הוסף כותרות לפי נושאי המשנה של השיעור (סמן כותרות עם **)
- הוסף מראי מקומות (פסוקים, מקורות) שמוזכרים — סמן אותם בבירור בסוגריים מרובעים
- זיהוי אוטומטי של פסוקים וציטוטים — עצב אותם כך: "הפסוק במירכאות כפולות"
- עריכה קלה בלבד — אל תוסיף תוכן חדש
- חלק לפסקאות ברורות לפי נושאי המשנה`,

    summary: `אתה מסכם שיעור תורני.
שם המגיד: ${maggid || 'לא צוין'}. נושא: ${topic || 'לא צוין'}.
${langNote}

הנחיות:
- כתוב סיכום תמציתי וברור של השיעור
- שמור על עיקרי הרעיונות לפי סדרם
- אל תוסיף דברים שלא נאמרו
- הסיכום יהיה קריא ומסודר
- חלק לנקודות עיקריות עם מספור`,
  };

  return prompts[type];
}

export async function transcribeAudio(audioFile, metadata, transcriptionType, language, outputLanguage, apiKey) {
  if (!apiKey) throw new Error('מפתח API לא הוגדר');

  const prompt = buildPrompt(transcriptionType, metadata, language, outputLanguage);
  const dataUrl = await fileToBase64(audioFile);
  const base64Data = dataUrl.split(',')[1];
  const mimeType = getAudioMimeType(audioFile.name);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'audio',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    let errMsg = `שגיאת API: ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData.error?.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  return data.content[0].text;
}
