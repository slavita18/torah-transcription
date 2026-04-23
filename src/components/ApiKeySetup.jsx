import { useState } from 'react';
import { saveApiKey } from '../utils/storage';

export default function ApiKeySetup({ onSave }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  function handleSave() {
    const trimmed = key.trim();
    if (!trimmed.startsWith('sk-ant-')) {
      setError('מפתח API לא תקין — צריך להתחיל ב-sk-ant-');
      return;
    }
    saveApiKey(trimmed);
    onSave(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md mx-4 text-center">
        <div className="text-5xl mb-4">🔑</div>
        <h2 className="text-2xl font-bold text-navy-900 mb-2">הגדרת מפתח API</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          כדי להשתמש באפליקציה יש להזין מפתח API של Anthropic.
          <br />
          ניתן לקבל מפתח בכתובת{' '}
          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy-500 underline"
          >
            console.anthropic.com
          </a>
        </p>
        <input
          type="password"
          placeholder="sk-ant-api..."
          value={key}
          onChange={e => { setKey(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          className="input-field mb-3 text-left ltr"
          dir="ltr"
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          onClick={handleSave}
          className="btn-primary bg-navy-800 hover:bg-navy-900 w-full py-3 text-lg focus:ring-navy-500"
        >
          שמור והמשך
        </button>
        <p className="text-xs text-gray-400 mt-4">המפתח נשמר מקומית בדפדפן בלבד ולא נשלח לשום שרת.</p>
      </div>
    </div>
  );
}
