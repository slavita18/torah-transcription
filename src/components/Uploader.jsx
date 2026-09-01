import { useRef, useState } from 'react'

/**
 * אזור העלאה (גרירה/לחיצה). תומך בתמונות וב-PDF.
 * onFile מקבל את ה-File; ההורה מטפל בעיבוד.
 */
export default function Uploader({ label, hint, accept = 'image/*,application/pdf', onFile, busy, thumb }) {
  const inputRef = useRef()
  const [drag, setDrag] = useState(false)

  const handleFiles = (files) => {
    if (files && files[0]) onFile(files[0])
  }

  return (
    <div
      onClick={() => !busy && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        handleFiles(e.dataTransfer.files)
      }}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
        drag ? 'border-navy-500 bg-navy-50' : 'border-cream-300 bg-white hover:border-navy-200 hover:bg-cream-50'
      } ${busy ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {thumb ? (
        <div className="flex items-center gap-3">
          <img src={thumb} alt="" className="h-16 w-12 rounded-lg object-cover shadow ring-1 ring-cream-200" />
          <div className="text-right">
            <div className="text-sm font-semibold text-navy-900">{label}</div>
            <div className="text-xs text-navy-500">הקובץ נטען ✓ · לחץ להחלפה</div>
          </div>
        </div>
      ) : (
        <div className="py-2">
          <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-navy-50 text-navy-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 16V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-navy-900">{busy ? 'מעבד…' : label}</div>
          {hint && <div className="mt-0.5 text-xs text-navy-500">{hint}</div>}
        </div>
      )}
    </div>
  )
}
