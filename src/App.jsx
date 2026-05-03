import { useState } from 'react';
import { getApiKey, getGroqApiKey, saveApiKey, saveGroqApiKey } from './utils/storage';
import ApiKeySetup from './components/ApiKeySetup';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import TranscriptionPage from './pages/TranscriptionPage';
import LibraryPage from './pages/LibraryPage';
import CatalogPage from './pages/CatalogPage';

export default function App() {
  const [anthropicKey, setAnthropicKey] = useState(getApiKey);
  const [groqKey, setGroqKey] = useState(getGroqApiKey);
  const [view, setView] = useState('home');
  const [language, setLanguage] = useState('hebrew');

  function handleLanguageSelect(lang) {
    setLanguage(lang);
    setView('transcription');
  }

  function handleKeysSave({ anthropicKey: ak, groqKey: gk }) {
    setAnthropicKey(ak);
    setGroqKey(gk);
  }

  function handleUpdateKeys({ anthropicKey: ak, groqKey: gk }) {
    if (ak) { saveApiKey(ak); setAnthropicKey(ak); }
    if (gk) { saveGroqApiKey(gk); setGroqKey(gk); }
  }

  if (!anthropicKey || !groqKey) {
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
          groqKey={groqKey}
        />
      )}

      {view === 'library' && (
        <LibraryPage />
      )}

      {view === 'catalog' && (
        <CatalogPage />
      )}

      <footer className="text-center py-6 text-xs text-gray-300 border-t border-cream-200 mt-auto">
        תמלול שיעורים תורניים • Groq Whisper + Claude AI
      </footer>
    </div>
  );
}
