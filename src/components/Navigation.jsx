import { saveApiKey } from '../utils/storage';

export default function Navigation({ view, setView, setApiKey }) {
  function handleChangeKey() {
    const newKey = prompt('הזן מפתח API חדש:');
    if (newKey && newKey.trim()) {
      saveApiKey(newKey.trim());
      setApiKey(newKey.trim());
    }
  }

  return (
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
            onClick={handleChangeKey}
            title="שנה מפתח API"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ⚙️
          </button>
        </div>
      </div>
    </nav>
  );
}
