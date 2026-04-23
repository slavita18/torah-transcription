import { useEffect, useRef } from 'react';

export default function PrintPreview({ text, metadata, typeName, onClose }) {
  const printRef = useRef(null);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handlePrint() {
    window.print();
  }

  const formattedText = text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-size:19px; color:#1e3a8a; display:block; margin-top:24px; margin-bottom:4px;">$1</strong>')
    .replace(/\[(.+?)\]/g, '<em style="color:#5b21b6; font-style:normal; font-weight:500;">[$1]</em>')
    .replace(/\n/g, '<br/>');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 no-print shrink-0">
          <h3 className="font-bold text-navy-900">תצוגת הדפסה</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary bg-navy-800 hover:bg-navy-900 text-sm px-5 py-2 focus:ring-navy-500"
            >
              🖨️ הדפס
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              ✕ סגור
            </button>
          </div>
        </div>

        {/* Print content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div
            ref={printRef}
            style={{
              direction: 'rtl',
              fontFamily: "'Heebo', 'Frank Ruhl Libre', serif",
              padding: '40px',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              lineHeight: '1.9',
            }}
          >
            {/* Document header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '20px', marginBottom: '28px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1e2a5e', margin: '0 0 6px' }}>
                {metadata.name || 'שיעור'}
              </h1>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '14px', color: '#6b7280' }}>
                {metadata.maggid && <span>מגיד: {metadata.maggid}</span>}
                {metadata.topic && <span>נושא: {metadata.topic}</span>}
                <span>{new Date().toLocaleDateString('he-IL')}</span>
              </div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#9ca3af' }}>{typeName}</div>
            </div>

            {/* Content */}
            <div
              style={{ fontSize: '16px', color: '#1f2937' }}
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />

            {/* Footer */}
            <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
              {metadata.topic && `${metadata.topic} | `}תמלול שיעורים תורניים
            </div>
          </div>
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: fixed; top: 0; right: 0; left: 0; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
