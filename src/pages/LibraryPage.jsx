import { useState } from 'react';
import { getLibrary, deleteFromLibrary, getFolders } from '../utils/storage';
import { exportToWord } from '../utils/exportWord';
import { exportToPdf } from '../utils/exportPdf';

const TYPE_LABELS = { basic: 'תמלול בסיסי', extended: 'תמלול מורחב', summary: 'סיכום' };
const LANG_LABELS = { hebrew: 'עברית', yiddish: 'אידיש' };

function EntryCard({ entry, onDelete, onView }) {
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExportWord() {
    setExporting(true);
    try {
      await exportToWord(entry.text, entry, TYPE_LABELS[entry.transcriptionType] || '');
    } catch (e) {
      alert('שגיאה: ' + e.message);
    }
    setExporting(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(entry.text);
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-navy-900 text-lg leading-tight">{entry.name || '—'}</h3>
            {entry.transcriptionType && (
              <span className="text-xs bg-navy-100 text-navy-700 px-2 py-0.5 rounded-full">
                {TYPE_LABELS[entry.transcriptionType]}
              </span>
            )}
            {entry.language && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {LANG_LABELS[entry.language] || entry.language}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            {entry.maggid && <span>👤 {entry.maggid}</span>}
            {entry.topic && <span>📌 {entry.topic}</span>}
            {entry.folder && <span>📁 {entry.folder}</span>}
            <span>📅 {entry.date}</span>
          </div>

          {(entry.tags || []).length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {entry.tags.map(tag => (
                <span key={tag} className="text-xs bg-cream-200 text-gray-700 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-2 rounded-lg text-gray-400 hover:text-navy-700 hover:bg-navy-50 transition-colors text-sm"
            title="הצג טקסט"
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-sm"
            title="העתק"
          >
            📋
          </button>
          <button
            onClick={handleExportWord}
            disabled={exporting}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-sm"
            title="ייצוא Word"
          >
            {exporting ? '⏳' : '📄'}
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors text-sm"
            title="מחק"
          >
            🗑️
          </button>
        </div>
      </div>

      {expanded && entry.text && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div
            className="bg-cream-50 rounded-xl p-4 text-sm leading-7 text-gray-700 max-h-64 overflow-y-auto whitespace-pre-wrap"
            dir="rtl"
          >
            {entry.text}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [filterFolder, setFilterFolder] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [library, setLibrary] = useState(getLibrary);

  const folders = getFolders();

  const allTags = [...new Set(library.flatMap(e => e.tags || []))];

  function handleDelete(id) {
    if (!confirm('האם אתה בטוח שברצונך למחוק תמלול זה?')) return;
    deleteFromLibrary(id);
    setLibrary(getLibrary());
  }

  const filtered = library.filter(entry => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (entry.name || '').toLowerCase().includes(q) ||
      (entry.maggid || '').toLowerCase().includes(q) ||
      (entry.topic || '').toLowerCase().includes(q) ||
      (entry.text || '').toLowerCase().includes(q);

    const matchFolder = !filterFolder || entry.folder === filterFolder;
    const matchTag = !filterTag || (entry.tags || []).includes(filterTag);

    return matchSearch && matchFolder && matchTag;
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-navy-900">📚 ספריית תמלולים</h1>
        <span className="text-sm text-gray-400">{library.length} תמלולים שמורים</span>
      </div>

      {/* Search + filters */}
      <div className="card space-y-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  חפש לפי שם, מגיד, נושא או טקסט..."
          className="input-field"
        />
        <div className="flex gap-3 flex-wrap">
          <select
            value={filterFolder}
            onChange={e => setFilterFolder(e.target.value)}
            className="input-field w-auto flex-1 min-w-32"
          >
            <option value="">כל התיקיות</option>
            {folders.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
            className="input-field w-auto flex-1 min-w-32"
          >
            <option value="">כל התגיות</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(search || filterFolder || filterTag) && (
            <button
              onClick={() => { setSearch(''); setFilterFolder(''); setFilterTag(''); }}
              className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200"
            >
              נקה פילטרים
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {library.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-lg font-medium">הספרייה ריקה</p>
          <p className="text-sm mt-2">תמלולים שמורים יופיעו כאן</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🔍</div>
          <p>לא נמצאו תמלולים תואמים</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onDelete={handleDelete}
              onView={() => {}}
            />
          ))}
        </div>
      )}
    </main>
  );
}
