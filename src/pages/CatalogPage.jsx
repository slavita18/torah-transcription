import { useState, useEffect, useCallback } from 'react';
import { catalogPages } from '../data/catalogPages';

const TOTAL = catalogPages.length;

export default function CatalogPage() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(null); // 'next' | 'prev'

  const goTo = useCallback((index) => {
    if (animating || index < 0 || index >= TOTAL) return;
    setDirection(index > current ? 'next' : 'prev');
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 250);
  }, [animating, current]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') goTo(current + 1);
      if (e.key === 'ArrowRight') goTo(current - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, goTo]);

  const isFirst = current === 0;
  const isLast = current === TOTAL - 1;

  return (
    <div className="flex flex-col items-center min-h-0 flex-1 py-4 px-2 bg-amber-50/30" dir="rtl">

      {/* Header */}
      <div className="w-full max-w-3xl mb-4 flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-navy-900">
          <span className="text-2xl">📖</span>
          <h1 className="font-serif font-bold text-xl">קטלוג מצומצם</h1>
        </div>
        <div className="text-sm text-gray-500 bg-white border border-gray-200 rounded-full px-4 py-1 shadow-sm">
          דף {current + 1} מתוך {TOTAL}
        </div>
      </div>

      {/* Page viewer */}
      <div className="relative w-full max-w-3xl flex items-center gap-2 md:gap-4">

        {/* Right arrow (RTL: previous page) */}
        <button
          onClick={() => goTo(current - 1)}
          disabled={isFirst}
          aria-label="דף קודם"
          className={`flex-shrink-0 w-11 h-11 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center text-xl shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-navy-400
            ${isFirst
              ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-white/50'
              : 'border-navy-200 text-navy-700 bg-white hover:bg-navy-50 hover:border-navy-400 hover:shadow-md active:scale-95 cursor-pointer'
            }`}
        >
          ›
        </button>

        {/* Page card */}
        <div className="flex-1 min-w-0">
          <div
            className={`bg-white rounded-2xl shadow-md border border-amber-100 overflow-hidden transition-all duration-200
              ${animating ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}
            style={{ minHeight: '60vh' }}
          >
            {/* Page number strip */}
            <div className="bg-navy-800 text-white text-center py-2 text-sm font-medium tracking-wider">
              עמוד {current + 1}
            </div>

            {/* Page content */}
            <div
              className="p-6 md:p-10 text-base leading-8 text-gray-800 catalog-content"
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: catalogPages[current] }}
            />
          </div>
        </div>

        {/* Left arrow (RTL: next page) */}
        <button
          onClick={() => goTo(current + 1)}
          disabled={isLast}
          aria-label="דף הבא"
          className={`flex-shrink-0 w-11 h-11 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center text-xl shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-navy-400
            ${isLast
              ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-white/50'
              : 'border-navy-200 text-navy-700 bg-white hover:bg-navy-50 hover:border-navy-400 hover:shadow-md active:scale-95 cursor-pointer'
            }`}
        >
          ‹
        </button>
      </div>

      {/* Dot navigation */}
      <div className="flex gap-1.5 mt-5 flex-wrap justify-center max-w-xs">
        {Array.from({ length: TOTAL }, (_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`עמוד ${i + 1}`}
            className={`rounded-full transition-all duration-150 focus:outline-none
              ${i === current
                ? 'w-5 h-2.5 bg-navy-700'
                : 'w-2.5 h-2.5 bg-gray-300 hover:bg-navy-300'
              }`}
          />
        ))}
      </div>

      {/* Keyboard hint */}
      <p className="mt-4 text-xs text-gray-400">
        ניתן לנווט גם עם מקשי החצים ← →
      </p>
    </div>
  );
}
