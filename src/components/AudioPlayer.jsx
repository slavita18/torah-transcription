import { useEffect, useRef, useState } from 'react';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(sec) {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function AudioPlayer({ audioUrl, fileName, transcription, activeType }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [activeParaIndex, setActiveParaIndex] = useState(-1);

  const paragraphs = transcription
    ? transcription.split('\n').filter(p => p.trim().length > 0)
    : [];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (paragraphs.length > 0 && audio.duration > 0) {
        const idx = Math.floor((audio.currentTime / audio.duration) * paragraphs.length);
        setActiveParaIndex(Math.min(idx, paragraphs.length - 1));
      }
    };

    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadedmetadata', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [paragraphs.length]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }

  function handleSeek(e) {
    const audio = audioRef.current;
    if (!audio) return;
    const val = parseFloat(e.target.value);
    audio.currentTime = val;
    setCurrentTime(val);
  }

  function rewind10() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  }

  function setPlaybackRate(s) {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = s;
    setSpeed(s);
  }

  function scrollToActivePara() {
    if (activeParaIndex >= 0) {
      document.getElementById(`para-${activeParaIndex}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500 border-b border-gray-100 pb-3">
        <span>🎵</span>
        <span className="truncate font-medium text-gray-700">{fileName}</span>
      </div>

      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Progress Bar */}
      <div className="space-y-1">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.5"
          value={currentTime}
          onChange={handleSeek}
          className="w-full accent-navy-800"
          style={{ background: `linear-gradient(to left, #1e3a8a ${(currentTime / (duration || 1)) * 100}%, #e5e7eb ${(currentTime / (duration || 1)) * 100}%)` }}
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={rewind10}
            title="חזור 10 שניות"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
          >
            <span>↩️</span>
            <span>10 שנ'</span>
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-navy-800 hover:bg-navy-900 text-white flex items-center justify-center text-xl shadow-md transition-all active:scale-95"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>

        {/* Speed controls */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setPlaybackRate(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                speed === s
                  ? 'bg-navy-800 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              x{s}
            </button>
          ))}
        </div>
      </div>

      {/* Sync text display */}
      {transcription && paragraphs.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-600">📄 תמלול מסונכרן</p>
            {activeParaIndex >= 0 && (
              <button
                onClick={scrollToActivePara}
                className="text-xs text-navy-500 hover:text-navy-700 underline"
              >
                עבור לפסקה הנוכחית
              </button>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto space-y-2 rounded-xl bg-gray-50 p-4 text-sm leading-relaxed">
            {paragraphs.map((para, idx) => (
              <p
                key={idx}
                id={`para-${idx}`}
                className={`transition-all duration-300 rounded-lg px-2 py-1 ${
                  idx === activeParaIndex ? 'paragraph-highlight font-medium' : 'text-gray-700'
                }`}
              >
                {para}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
