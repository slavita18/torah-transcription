import { useState } from 'react';
import { getFolders } from '../utils/storage';

const TAGS = ['פרשת שבוע', 'הלכה', 'מוסר', 'חסידות', 'אחר'];

export default function MetadataForm({ metadata, onChange, language }) {
  const folders = getFolders();
  const [newFolder, setNewFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  function handleChange(field, value) {
    onChange({ ...metadata, [field]: value });
  }

  function handleFolderSelect(e) {
    if (e.target.value === '__new__') {
      setShowNewFolder(true);
    } else {
      handleChange('folder', e.target.value);
    }
  }

  function handleAddFolder() {
    if (newFolder.trim()) {
      handleChange('folder', newFolder.trim());
      setShowNewFolder(false);
      setNewFolder('');
    }
  }

  function toggleTag(tag) {
    const current = metadata.tags || [];
    const updated = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    handleChange('tags', updated);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">שם השיעור *</label>
          <input
            type="text"
            value={metadata.name || ''}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="לדוגמה: פרשת לך לך — אמונה ובטחון"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">שם המגיד</label>
          <input
            type="text"
            value={metadata.maggid || ''}
            onChange={e => handleChange('maggid', e.target.value)}
            placeholder="לדוגמה: הרב ישראל כהן"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">נושא</label>
          <input
            type="text"
            value={metadata.topic || ''}
            onChange={e => handleChange('topic', e.target.value)}
            placeholder="לדוגמה: אמונה ובטחון"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">תיקייה / אוסף</label>
          {showNewFolder ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolder}
                onChange={e => setNewFolder(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
                placeholder="שם התיקייה החדשה"
                className="input-field flex-1"
                autoFocus
              />
              <button onClick={handleAddFolder} className="btn-primary bg-navy-700 hover:bg-navy-800 px-4 text-sm focus:ring-navy-500">
                הוסף
              </button>
              <button onClick={() => setShowNewFolder(false)} className="px-3 py-2 text-gray-400 hover:text-gray-600">✕</button>
            </div>
          ) : (
            <select
              value={metadata.folder || ''}
              onChange={handleFolderSelect}
              className="input-field"
            >
              <option value="">— ללא תיקייה —</option>
              {folders.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
              <option value="__new__">+ צור תיקייה חדשה</option>
            </select>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          מונחים מיוחדים / שמות <span className="text-gray-400 font-normal">(יסייע לדיוק התמלול)</span>
        </label>
        <textarea
          value={metadata.terms || ''}
          onChange={e => handleChange('terms', e.target.value)}
          placeholder="לדוגמה: ר' מאיר בעל הנס, בית יוסף, אבות דרבי נתן..."
          rows={2}
          className="input-field resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">תגיות</label>
        <div className="flex flex-wrap gap-2">
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              type="button"
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                (metadata.tags || []).includes(tag)
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-navy-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {language === 'yiddish' && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-purple-700 text-sm flex items-center gap-2">
          <span>🟣</span>
          <span>שיעור באידיש — תוכל לבחור שפת הפלט בשלב הבא</span>
        </div>
      )}
    </div>
  );
}
