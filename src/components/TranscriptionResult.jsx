import { useRef, useState } from 'react';
import { exportToWord } from '../utils/exportWord';
import { exportToPdf, createPrintableElement } from '../utils/exportPdf';
import { saveToLibrary } from '../utils/storage';
import PrintPreview from './PrintPreview';

const TYPE_LABELS = {
  basic: 'תמלול בסיסי',
  extended: 'תמלול מורחב',
  summary: 'סיכום',
};

function TranscriptionCard({ type, text, metadata }) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const contentId = `transcription-content-${type}`;
  const label = TYPE_LABELS[type];

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExportWord() {
    setExporting(true);
    try {
      await exportToWord(text, { ...metadata, date: new Date().toLocaleDateString('he-IL') }, label);
    } catch (e) {
      alert('שגיאה בייצוא Word: ' + e.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    try {
      await exportToPdf(contentId, { ...metadata, date: new Date().toLocaleDateString('he-IL') }, label);
    } catch (e) {
      alert('שגיאה בייצוא PDF: ' + e.message);
    } finally {
      setExporting(false);
    }
  }

  function handleSave() {
    saveToLibrary({
      name: metadata.name,
      maggid: metadata.maggid,
      topic: metadata.topic,
      folder: metadata.folder,
      tags: metadata.tags,
      language: metadata.language,
      transcriptionType: type,
      text,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const formattedText = text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-navy-800 text-lg block mt-5 mb-1">$1</strong>')
    .replace(/\[(.+?)\]/g, '<em class="text-purple-700 not-italic font-medium">[$1]</em>')
    .replace(/\n/g, '<br/>');

  return (
    <div className="card space-y-4 border-t-4" style={{ borderTopColor: type === 'basic' ? '#2563eb' : type === 'extended' ? '#0d9488' : '#7c3aed' }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-bold text-navy-900">{label}</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            className="btn-secondary border-gray-200 text-gray-600 hover:border-navy-200 hover:text-navy-700 text-sm px-3 py-2 focus:ring-navy-500"
          >
            {copied ? '✓ הועתק' : '📋 העתק'}
          </button>
          <button
            onClick={handleExportWord}
            disabled={exporting}
            className="btn-secondary border-blue-200 text-blue-700 hover:border-blue-400 text-sm px-3 py-2 focus:ring-blue-500"
          >
            {exporting ? '⏳' : '📄'} Word
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="btn-secondary border-red-200 text-red-600 hover:border-red-400 text-sm px-3 py-2 focus:ring-red-500"
          >
            {exporting ? '⏳' : '📕'} PDF
          </button>
          <button
            onClick={() => setShowPrint(true)}
            className="btn-secondary border-gray-200 text-gray-600 hover:border-gray-400 text-sm px-3 py-2"
          >
            🖨️ הדפסה
          </button>
          <button
            onClick={handleSave}
            className={`btn-secondary text-sm px-3 py-2 ${
              saved
                ? 'border-green-300 text-green-700 bg-green-50'
                : 'border-green-200 text-green-700 hover:border-green-400'
            }`}
          >
            {saved ? '✓ נשמר' : '💾 שמור'}
          </button>
        </div>
      </div>

      <div
        id={contentId}
        className="bg-cream-50 rounded-xl p-6 text-base leading-8 text-gray-800 max-h-96 overflow-y-auto"
        dir="rtl"
        dangerouslySetInnerHTML={{ __html: formattedText }}
      />

      {showPrint && (
        <PrintPreview
          text={text}
          metadata={metadata}
          typeName={label}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

export default function TranscriptionResult({ transcriptions, metadata }) {
  const types = Object.entries(transcriptions).filter(([, v]) => v);

  if (types.length === 0) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-navy-900 text-center">✨ תוצאות התמלול</h2>
      {types.map(([type, text]) => (
        <TranscriptionCard key={type} type={type} text={text} metadata={metadata} />
      ))}
    </div>
  );
}
