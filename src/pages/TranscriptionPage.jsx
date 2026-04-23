import { useState } from 'react';
import AudioUploader from '../components/AudioUploader';
import MetadataForm from '../components/MetadataForm';
import AudioPlayer from '../components/AudioPlayer';
import TranscriptionResult from '../components/TranscriptionResult';
import { transcribeAudio } from '../utils/claudeApi';
import { exportToWord } from '../utils/exportWord';

const STEPS = { UPLOAD: 1, PLAYER: 2, RESULT: 3 };

const TYPE_CONFIG = {
  basic: { label: 'תמלול בסיסי', desc: 'עריכה קולחת של הדברים כפי שנאמרו', color: 'bg-blue-600 hover:bg-blue-700', icon: '📝' },
  extended: { label: 'תמלול מורחב', desc: 'כותרות, מראי מקומות ועיצוב מקורות', color: 'bg-teal-600 hover:bg-teal-700', icon: '📖' },
  summary: { label: 'סיכום', desc: 'תמצית הרעיונות העיקריים', color: 'bg-purple-600 hover:bg-purple-700', icon: '✍️' },
};

export default function TranscriptionPage({ language, apiKey }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [metadata, setMetadata] = useState({
    name: '', maggid: '', topic: '', terms: '', folder: '', tags: [],
  });
  const [outputLanguage, setOutputLanguage] = useState('hebrew');
  const [transcriptions, setTranscriptions] = useState({});
  const [loadingType, setLoadingType] = useState(null);
  const [error, setError] = useState('');
  const [activeDisplayType, setActiveDisplayType] = useState(null);

  function handleFileSelected(file) {
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setStep(STEPS.PLAYER);
  }

  async function handleTranscribe(type) {
    if (!audioFile) return;
    setError('');
    setLoadingType(type);

    try {
      const text = await transcribeAudio(
        audioFile,
        metadata,
        type,
        language,
        outputLanguage,
        apiKey
      );

      const updated = { ...transcriptions, [type]: text };
      setTranscriptions(updated);
      setActiveDisplayType(type);
      setStep(STEPS.RESULT);

      // Auto-download Word doc
      try {
        await exportToWord(text, {
          ...metadata,
          language,
          date: new Date().toLocaleDateString('he-IL'),
        }, TYPE_CONFIG[type].label);
      } catch {
        // Silent - auto download failure is non-fatal
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingType(null);
    }
  }

  function resetToUpload() {
    setStep(STEPS.UPLOAD);
    setAudioFile(null);
    setAudioUrl(null);
    setTranscriptions({});
    setError('');
    setActiveDisplayType(null);
  }

  const isHebrew = language === 'hebrew';

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
          <button
            onClick={resetToUpload}
            className="btn-secondary border-gray-200 text-gray-500 hover:border-gray-300 text-sm px-4 py-2"
          >
            ← קובץ חדש
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: 'העלאה' },
          { n: 2, label: 'האזנה' },
          { n: 3, label: 'תמלול' },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              step >= n
                ? isHebrew ? 'bg-navy-800 text-white' : 'bg-purple-700 text-white'
                : 'bg-gray-100 text-gray-400'
            }`}>
              <span>{n}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < 2 && <div className={`flex-1 h-0.5 w-8 ${step > n ? (isHebrew ? 'bg-navy-400' : 'bg-purple-400') : 'bg-gray-200'}`} />}
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
        <div className="space-y-6">
          <div className="card">
            <h2 className="section-title">📁 העלאת קובץ שמע</h2>
            <AudioUploader onFileSelected={handleFileSelected} />
          </div>
        </div>
      )}

      {/* STEP 2: Player + Metadata + Options */}
      {step >= STEPS.PLAYER && audioUrl && (
        <div className="space-y-6">
          {/* Metadata form */}
          <div className="card">
            <h2 className="section-title">📋 פרטי השיעור</h2>
            <MetadataForm metadata={metadata} onChange={setMetadata} language={language} />
          </div>

          {/* Yiddish output language */}
          {language === 'yiddish' && (
            <div className="card">
              <h2 className="section-title">🌐 שפת הפלט</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setOutputLanguage('yiddish')}
                  className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${
                    outputLanguage === 'yiddish'
                      ? 'border-purple-600 bg-purple-50 text-purple-800'
                      : 'border-gray-200 text-gray-600 hover:border-purple-300'
                  }`}
                >
                  🟡 תמלול לאידיש
                </button>
                <button
                  onClick={() => setOutputLanguage('hebrew')}
                  className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${
                    outputLanguage === 'hebrew'
                      ? 'border-navy-600 bg-navy-50 text-navy-800'
                      : 'border-gray-200 text-gray-600 hover:border-navy-300'
                  }`}
                >
                  🔵 תמלול לעברית
                </button>
              </div>
            </div>
          )}

          {/* Audio player */}
          <AudioPlayer
            audioUrl={audioUrl}
            fileName={audioFile?.name}
            transcription={activeDisplayType ? transcriptions[activeDisplayType] : null}
            activeType={activeDisplayType}
          />

          {/* Transcription type buttons */}
          <div className="card">
            <h2 className="section-title">🚀 סוג התמלול</h2>
            <p className="text-sm text-gray-500 mb-4">ניתן להפיק מספר סוגי תמלול לאותו שיעור</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                const isDone = !!transcriptions[type];
                const isLoading = loadingType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleTranscribe(type)}
                    disabled={!!loadingType}
                    className={`relative p-4 rounded-2xl text-white text-right transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${cfg.color}`}
                  >
                    {isDone && (
                      <span className="absolute top-2 left-2 bg-white/20 rounded-full px-2 py-0.5 text-xs">✓</span>
                    )}
                    <div className="text-2xl mb-2">{isLoading ? '⏳' : cfg.icon}</div>
                    <div className="font-bold text-sm">{cfg.label}</div>
                    <div className="text-xs text-white/80 mt-0.5 leading-tight">{cfg.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Loading indicator */}
            {loadingType && (
              <div className="mt-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-4 h-4 border-2 border-navy-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-sm text-gray-600">
                    מתמלל... {TYPE_CONFIG[loadingType]?.label} — זה עשוי לקחת מספר דקות
                  </span>
                </div>
                <div className="progress-bar-track h-2">
                  <div className="progress-bar-fill h-2 animate-pulse" style={{ width: '70%' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Results */}
      {step === STEPS.RESULT && Object.keys(transcriptions).length > 0 && (
        <div className="space-y-4">
          {/* Tab selector if multiple types done */}
          {Object.keys(transcriptions).length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {Object.keys(transcriptions).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveDisplayType(type)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    activeDisplayType === type
                      ? 'bg-navy-800 text-white border-navy-800'
                      : 'border-gray-200 text-gray-600 hover:border-navy-200'
                  }`}
                >
                  {TYPE_CONFIG[type]?.label}
                </button>
              ))}
            </div>
          )}

          <TranscriptionResult
            transcriptions={transcriptions}
            metadata={{ ...metadata, language }}
          />

          {/* Add more transcriptions */}
          <div className="card">
            <h2 className="section-title">➕ הוסף תמלול נוסף</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(TYPE_CONFIG)
                .filter(([type]) => !transcriptions[type])
                .map(([type, cfg]) => (
                  <button
                    key={type}
                    onClick={() => handleTranscribe(type)}
                    disabled={!!loadingType}
                    className={`p-4 rounded-2xl text-white text-right transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 ${cfg.color}`}
                  >
                    <div className="text-2xl mb-2">{loadingType === type ? '⏳' : cfg.icon}</div>
                    <div className="font-bold text-sm">{cfg.label}</div>
                    <div className="text-xs text-white/80 mt-0.5">{cfg.desc}</div>
                  </button>
                ))}
            </div>
            {loadingType && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-navy-500 border-t-transparent rounded-full animate-spin" />
                מתמלל...
              </div>
            )}
          </div>

          {/* Player stays visible */}
          {audioUrl && (
            <AudioPlayer
              audioUrl={audioUrl}
              fileName={audioFile?.name}
              transcription={activeDisplayType ? transcriptions[activeDisplayType] : null}
              activeType={activeDisplayType}
            />
          )}
        </div>
      )}
    </main>
  );
}
