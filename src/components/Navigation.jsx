import { useState } from 'react';

export default function Navigation({ view, setView, onUpdateKeys }) {
  const [showSettings, setShowSettings] = useState(false);
  const [ak, setAk] = useState('');
  const [ok, setOk] = useState('');

  function handleSaveSettings() {
    onUpdateKeys({ anthropicKey: ak.trim() || null, openAiKey: ok.trim() || null });
    setShowSettings(false);
    setAk('');
    setOk('');
  }

  return (
    <>
      <nav className="bg-white border-b border-cream-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setView('home')}
            className="flex items-center gap-2 text-navy-900 hover:text-navy-600 transition-colors"
          >
            <span className="text-2xl">📜</span>
            <span className="font-serif font-bold text-lg hidden sm:inline">תמלול שיעורים</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('library')}
              className={`btn-secondary px-4 py-2 text-sm ${
                view === 'library'
                  ? 'bg-navy-100 border-navy-300 text-navy-800'
                  : 'border-gray-200 text-gray-600 hover:border-navy-200 hover:text-navy-700'
              }`}
            >
              <span>📚</span>
              <span className="hidden sm:inline">ספריית תמלולים</span>
            </button>

            <button
              onClick={() => setShowSettings(true)}
              title="הגדרות מפתחות API"
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              ⚙️
            </button>
          </div>
        </div>
      </nav>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-navy-900 mb-1">עדכון מפתחות API</h3>
            <p className="text-sm text-gray-500 mb-6">השאר שדה ריק כדי לשמור את המפתח הקיים.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">מפתח Anthropic (Claude)</label>
                <input
                  type="password"
                  placeholder="sk-ant-... (השאר ריק לשמור קיים)"
                  value={ak}
                  onChange={e => setAk(e.target.value)}
                  className="input-field text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">מפתח OpenAI (Whisper)</label>
                <input
                  type="password"
                  placeholder="sk-... (השאר ריק לשמור קיים)"
                  value={ok}
                  onChange={e => setOk(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveSettings()}
                  className="input-field text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveSettings}
                className="btn-primary bg-navy-800 hover:bg-navy-900 flex-1 py-2.5 focus:ring-navy-500"
              >
                שמור
              </button>
              <button
                onClick={() => { setShowSettings(false); setAk(''); setOk(''); }}
                className="btn-secondary border-gray-200 text-gray-600 flex-1 py-2.5"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
