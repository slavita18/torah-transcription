import { useState } from 'react';
import { getApiKey, getOpenAiApiKey, saveApiKey, saveOpenAiApiKey } from './utils/storage';
import ApiKeySetup from './components/ApiKeySetup';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import TranscriptionPage from './pages/TranscriptionPage';
import LibraryPage from './pages/LibraryPage';

export default function App() {
  const [anthropicKey, setAnthropicKey] = useState(getApiKey);
  const [openAiKey, setOpenAiKey] = useState(getOpenAiApiKey);
  const [view, setView] = useState('home');
  const [language, setLanguage] = useState('hebrew');

  function handleLanguageSelect(lang) {
    setLanguage(lang);
    setView('transcription');
  }

  function handleKeysSave({ anthropicKey: ak, openAiKey: ok }) {
    setAnthropicKey(ak);
    setOpenAiKey(ok);
  }

  function handleUpdateKeys({ anthropicKey: ak, openAiKey: ok }) {
    if (ak) { saveApiKey(ak); setAnthropicKey(ak); }
    if (ok) { saveOpenAiApiKey(ok); setOpenAiKey(ok); }
  }

  if (!anthropicKey || !openAiKey) {
    return <ApiKeySetup onSave={handleKeysSave} />;
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col" dir="rtl">
      <Navigation view={view} setView={setView} onUpdateKeys={handleUpdateKeys} />

      {view === 'home' && (
        <HomePage onSelect={handleLanguageSelect} />
      )}

      {view === 'transcription' && (
        <TranscriptionPage
          key={language}
          language={language}
          anthropicKey={anthropicKey}
          openAiKey={openAiKey}
        />
      )}

      {view === 'library' && (
        <LibraryPage />
      )}

      <footer className="text-center py-6 text-xs text-gray-300 border-t border-cream-200 mt-auto">
        תמלול שיעורים תורניים • Whisper + Claude AI
      </footer>
    </div>
  );
}
