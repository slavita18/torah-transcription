import { useRef, useState } from 'react';

const ACCEPTED = '.mp3,.wav,.m4a,.ogg,.webm';
const MAX_SIZE_MB = 25;

export default function AudioUploader({ onFileSelected }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  function processFile(file) {
    if (!file) return;
    setError('');

    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_SIZE_MB) {
      setError(`הקובץ גדול מדי (${sizeMB.toFixed(1)} MB). הגבלה: ${MAX_SIZE_MB} MB`);
      return;
    }

    const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/x-m4a'];
    if (!allowed.some(t => file.type.startsWith('audio')) && !file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
      setError('יש להעלות קובץ שמע בפורמט mp3, wav, m4a, ogg');
      return;
    }

    onFileSelected(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-navy-500 bg-navy-50 scale-[1.02]'
            : 'border-gray-200 bg-cream-50 hover:border-navy-300 hover:bg-cream-100'
          }
        `}
      >
        <div className="text-6xl mb-4">🎙️</div>
        <p className="text-xl font-semibold text-navy-900 mb-2">גרור קובץ שמע לכאן</p>
        <p className="text-gray-500 mb-4">או לחץ לבחירת קובץ</p>
        <span className="inline-block bg-navy-100 text-navy-700 text-sm px-4 py-2 rounded-full">
          MP3 · WAV · M4A · OGG
        </span>
        <p className="text-xs text-gray-400 mt-3">גודל מקסימלי: {MAX_SIZE_MB} MB</p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={e => processFile(e.target.files[0])}
        />
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
