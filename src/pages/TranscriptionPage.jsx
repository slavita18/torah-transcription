import { useState } from 'react';
import AudioUploader from '../components/AudioUploader';
import MetadataForm from '../components/MetadataForm';
import AudioPlayer from '../components/AudioPlayer';
import TranscriptionResult from '../components/TranscriptionResult';
import { transcribeAudio } from '../utils/claudeApi';
import { exportToWord } from '../utils/exportWord';

const STEPS = { UPLOAD: 1, PLAYER: 2, RESULT: 3 };

const TYPE_CONFIG = {
  basic:    { label: 'תמלול בסיסי',   desc: 'עריכה קולחת של הדברים כפי שנאמרו',    color: 'bg-blue-600 hover:bg-blue-700',   icon: '📝' },
  extended: { label: 'תמלול מורחב',   desc: 'כותרות, מראי מקומות ועיצוב מקורות',  color: 'bg-teal-600 hover:bg-teal-700',   icon: '📖' },
  summary:  { label: 'סיכום',         desc: 'תמצית הרעיונות העיקריים',             color: 'bg-purple-600 hover:bg-purple-700', icon: '✍️' },
};

const PROGRESS_LABELS = {
  whisper: { icon: '🎙️', text: 'שלב 1/2 — Groq Whisper ממיר שמע לטקסט...', sub: 'זה עשוי לקחת כ-10–30 שניות בהתאם לאורך ההקלטה' },
  claude:  { icon: '✏️', text: 'שלב 2/2 — Claude עורך ומעצב את הטקסט...', sub: 'עוד רגע ותהיה מוכן' },
};

export default function TranscriptionPage({ language, anthropicKey, groqKey }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [metadata, setMetadata] = useState({ name: '', maggid: '', topic: '', terms: '', folder: '', tags: [] });
  const [outputLanguage, setOutputLanguage] = useState('hebrew');
  const [transcriptions, setTranscriptions] = useState({});
  const [loadingType, setLoadingType] = useState(null);
  const [progressStage, setProgressStage] = useState(null); // 'whisper' | 'claude'
  const [error, setError] = useState('');
  const [activeDisplayType, setActiveDisplayType] = useState(null);
  const [cachedRawText, setCachedRawText] = useState(null);

  function handleFileSelected(file) {
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setCachedRawText(null);
    setTranscriptions({});
    setStep(STEPS.PLAYER);
  }

  async function handleTranscribe(type) {
    if (!audioFile) return;
    setError('');
    setLoadingType(type);
    setProgressStage(null);

    try {
      const { edited, rawText } = await transcribeAudio({
        audioFile,
        metadata,
        transcriptionType: type,
        language,
        outputLanguage,
        anthropicApiKey: anthropicKey,
        groqApiKey: groqKey,
        cachedRawText,
        onProgress: setProgressStage,
      });

      // Cache the Whisper result so subsequent transcription types skip step 1
      if (!cachedRawText) setCachedRawText(rawText);

      const updated = { ...transcriptions, [type]: edited };
      setTranscriptions(updated);
      setActiveDisplayType(type);
      setStep(STEPS.RESULT);

      // Auto-download Word doc
      try {
        await exportToWord(edited, { ...metadata, language, date: new Date().toLocaleDateString('he-IL') }, TYPE_CONFIG[type].label);
      } catch {
        // Non-fatal
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingType(null);
      setProgressStage(null);
    }
  }

  function resetToUpload() {
    setStep(STEPS.UPLOAD);
    setAudioFile(null);
    setAudioUrl(null);
    setTranscriptions({});
    setCachedRawText(null);
    setError('');
    setActiveDisplayType(null);
  }

  const isHebrew = language === 'hebrew';
  const progressInfo = progressStage ? PROGRESS_LABELS[progressStage] : null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">
            {isHebrew ? '🔵 שיעורים בעברית' : '🟣 שיעורים באידיש'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === STEPS.UPLOAD && 'שלב 1: העלאת קובץ שמע'}
            {step === STEPS.PLAYER && 'שלב 2: שמיעה ובחירת סוג תמלול'}
            {step === STEPS.RESULT && 'שלב 3: תוצאות'}
          </p>
        </div>
        {step !== STEPS.UPLOAD && (
          <button onClick={resetToUpload} className="btn-secondary border-gray-200 text-gray-500 hover:border-gray-300 text-sm px-4 py-2">
            ← קובץ חדש
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[{ n: 1, label: 'העלאה' }, { n: 2, label: 'האזנה' }, { n: 3, label: 'תמלול' }].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              step >= n ? (isHebrew ? 'bg-navy-800 text-white' : 'bg-purple-700 text-white') : 'bg-gray-100 text-gray-400'
            }`}>
              <span>{n}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < 2 && <div className={`h-0.5 w-8 ${step > n ? (isHebrew ? 'bg-navy-400' : 'bg-purple-400') : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-start gap-2">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="font-medium">שגיאה בתמלול</p>
            <p className="text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === STEPS.UPLOAD && (
        <div className="card">
          <h2 className="section-title">📁 העלאת קובץ שמע</h2>
          <AudioUploader onFileSelected={handleFileSelected} />
        </div>
      )}

      {/* STEP 2: Player + Metadata + Options */}
      {step >= STEPS.PLAYER && audioUrl && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="section-title">📋 פרטי השיעור</h2>
            <MetadataForm metadata={metadata} onChange={setMetadata} language={language} />
          </div>

          {language === 'yiddish' && (
            <div className="card">
              <h2 className="section-title">🌐 שפת הפלט</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setOutputLanguage('yiddish')}
                  className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${outputLanguage === 'yiddish' ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}
                >
                  🟡 תמלול לאידיש
                </button>
                <button
                  onClick={() => setOutputLanguage('hebrew')}
                  className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${outputLanguage === 'hebrew' ? 'border-navy-600 bg-navy-50 text-navy-800' : 'border-gray-200 text-gray-600 hover:border-navy-300'}`}
                >
                  🔵 תמלול לעברית
                </button>
              </div>
            </div>
          )}

          <AudioPlayer
            audioUrl={audioUrl}
            fileName={audioFile?.name}
            transcription={activeDisplayType ? transcriptions[activeDisplayType] : null}
          />

          <div className="card">
            <h2 className="section-title">🚀 סוג התמלול</h2>
            <p className="text-sm text-gray-500 mb-4">
              ניתן להפיק מספר סוגי תמלול לאותו שיעור — Groq רץ פעם אחת ומשמש לכולם
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                const isDone = !!transcriptions[type];
                const isLoading = loadingType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleTranscribe(type)}
                    disabled={!!loadingType}
                    className={`relative h-full min-h-[128px] flex flex-col p-4 rounded-2xl text-white text-right transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${cfg.color}`}
                  >
                    {isDone && <span className="absolute top-2 left-2 bg-white/20 rounded-full px-2 py-0.5 text-xs">✓</span>}
                    <div className="text-2xl mb-2">{isLoading ? '⏳' : cfg.icon}</div>
                    <div className="font-bold text-sm">{cfg.label}</div>
                    <div className="text-xs text-white/80 mt-0.5 leading-tight">{cfg.desc}</div>
                  </button>
                );
              })}
            </div>

            {loadingType && progressInfo && (
              <div className="mt-4 bg-navy-50 border border-navy-100 rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-navy-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-navy-800">
                      {progressInfo.icon} {progressInfo.text}
                    </p>
                    <p className="text-xs text-navy-500">{progressInfo.sub}</p>
                  </div>
                </div>
                <div className="progress-bar-track h-1.5">
                  <div
                    className="progress-bar-fill h-1.5 animate-pulse"
                    style={{ width: progressStage === 'whisper' ? '40%' : '80%' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Results */}
      {step === STEPS.RESULT && Object.keys(transcriptions).length > 0 && (
        <div className="space-y-4">
          {Object.keys(transcriptions).length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {Object.keys(transcriptions).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveDisplayType(type)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    activeDisplayType === type ? 'bg-navy-800 text-white border-navy-800' : 'border-gray-200 text-gray-600 hover:border-navy-200'
                  }`}
                >
                  {TYPE_CONFIG[type]?.label}
                </button>
              ))}
            </div>
          )}

          <TranscriptionResult transcriptions={transcriptions} metadata={{ ...metadata, language }} />

          {Object.keys(transcriptions).length < 3 && (
            <div className="card">
              <h2 className="section-title">➕ הוסף תמלול נוסף</h2>
              {cachedRawText && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">
                  ✓ תמלול Groq כבר זמין — תמלולים נוספים ידלגו על שלב השמע
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(TYPE_CONFIG)
                  .filter(([type]) => !transcriptions[type])
                  .map(([type, cfg]) => (
                    <button
                      key={type}
                      onClick={() => handleTranscribe(type)}
                      disabled={!!loadingType}
                      className={`h-full min-h-[128px] flex flex-col p-4 rounded-2xl text-white text-right transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 ${cfg.color}`}
                    >
                      <div className="text-2xl mb-2">{loadingType === type ? '⏳' : cfg.icon}</div>
                      <div className="font-bold text-sm">{cfg.label}</div>
                      <div className="text-xs text-white/80 mt-0.5">{cfg.desc}</div>
                    </button>
                  ))}
              </div>
              {loadingType && progressInfo && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-4 h-4 border-2 border-navy-500 border-t-transparent rounded-full animate-spin" />
                  <span>{progressInfo.icon} {progressInfo.text}</span>
                </div>
              )}
            </div>
          )}

          {audioUrl && (
            <AudioPlayer
              audioUrl={audioUrl}
              fileName={audioFile?.name}
              transcription={activeDisplayType ? transcriptions[activeDisplayType] : null}
            />
          )}
        </div>
      )}
    </main>
  );
}
