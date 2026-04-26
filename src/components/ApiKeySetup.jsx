import { useState } from 'react';
import { saveApiKey, saveOpenAiApiKey } from '../utils/storage';

export default function ApiKeySetup({ onSave }) {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [errors, setErrors] = useState({});

  function validate() {
    const errs = {};
    if (!anthropicKey.trim().startsWith('sk-ant-')) {
      errs.anthropic = 'מפתח לא תקין — צריך להתחיל ב-sk-ant-';
    }
    if (!openAiKey.trim().startsWith('sk-')) {
      errs.openai = 'מפתח לא תקין — צריך להתחיל ב-sk-';
    }
    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    saveApiKey(anthropicKey.trim());
    saveOpenAiApiKey(openAiKey.trim());
    onSave({ anthropicKey: anthropicKey.trim(), openAiKey: openAiKey.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-lg mx-4 text-center">
        <div className="text-5xl mb-4">🔑</div>
        <h2 className="text-2xl font-bold text-navy-900 mb-2">הגדרת מפתחות API</h2>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          האפליקציה משתמשת בשני שירותים: Whisper לתמלול שמע, Claude לעריכה ועיבוד.
        </p>

        {/* Anthropic key */}
        <div className="text-right mb-5">
          <label className="block text-sm font-semibold text-navy-800 mb-1.5">
            מפתח Anthropic API
            <span className="text-gray-400 font-normal mr-1">(לעריכה ועיבוד עם Claude)</span>
          </label>
          <input
            type="password"
            placeholder="sk-ant-api03-..."
            value={anthropicKey}
            onChange={e => { setAnthropicKey(e.target.value); setErrors(p => ({ ...p, anthropic: '' })); }}
            className="input-field text-left"
            dir="ltr"
          />
          {errors.anthropic && <p className="text-red-500 text-xs mt-1.5">{errors.anthropic}</p>}
          <p className="text-xs text-gray-400 mt-1">
            קבל מפתח בכתובת{' '}
            <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-navy-500 underline">
              console.anthropic.com
            </a>
          </p>
        </div>

        {/* OpenAI key */}
        <div className="text-right mb-8">
          <label className="block text-sm font-semibold text-navy-800 mb-1.5">
            מפתח OpenAI API
            <span className="text-gray-400 font-normal mr-1">(לתמלול שמע עם Whisper)</span>
          </label>
          <input
            type="password"
            placeholder="sk-proj-..."
            value={openAiKey}
            onChange={e => { setOpenAiKey(e.target.value); setErrors(p => ({ ...p, openai: '' })); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="input-field text-left"
            dir="ltr"
          />
          {errors.openai && <p className="text-red-500 text-xs mt-1.5">{errors.openai}</p>}
          <p className="text-xs text-gray-400 mt-1">
            קבל מפתח בכתובת{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-navy-500 underline">
              platform.openai.com/api-keys
            </a>
          </p>
        </div>

        <button
          onClick={handleSave}
          className="btn-primary bg-navy-800 hover:bg-navy-900 w-full py-3 text-lg focus:ring-navy-500"
        >
          שמור והתחל
        </button>
        <p className="text-xs text-gray-400 mt-4">המפתחות נשמרים מקומית בדפדפן בלבד ולא נשלחים לשום שרת.</p>
      </div>
    </div>
  );
}
