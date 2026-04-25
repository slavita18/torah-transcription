import { useState } from 'react';
import { getApiKey } from './utils/storage';
import ApiKeySetup from './components/ApiKeySetup';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import TranscriptionPage from './pages/TranscriptionPage';
import LibraryPage from './pages/LibraryPage';
import PodcastGeneratorPage from './pages/PodcastGeneratorPage';

export default function App() {
  const [apiKey, setApiKey] = useState(getApiKey);
  const [view, setView] = useState('home'); // 'home' | 'transcription' | 'library' | 'podcast'
  const [language, setLanguage] = useState('hebrew'); // 'hebrew' | 'yiddish'

  function handleLanguageSelect(lang) {
    setLanguage(lang);
    setView('transcription');
  }

  if (!apiKey) {
    return <ApiKeySetup onSave={setApiKey} />;
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col" dir="rtl">
      <Navigation view={view} setView={setView} setApiKey={setApiKey} />

      {view === 'home' && (
        <HomePage onSelect={handleLanguageSelect} />
      )}

      {view === 'transcription' && (
        <TranscriptionPage
          key={language}
          language={language}
          apiKey={apiKey}
        />
      )}

      {view === 'library' && (
        <LibraryPage />
      )}

      {view === 'podcast' && (
        <PodcastGeneratorPage />
      )}

      <footer className="text-center py-6 text-xs text-gray-300 border-t border-cream-200 mt-auto">
        תמלול שיעורים תורניים • מבוסס על Claude AI
      </footer>
    </div>
  );
}
