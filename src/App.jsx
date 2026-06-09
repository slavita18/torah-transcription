import { useCallback, useRef, useState } from 'react'
import Stage from './three/Stage'
import ControlPanel from './components/ControlPanel'
import { DEFAULT_SETTINGS } from './lib/presets'
import { fileToImage, pdfFirstPage, pdfToImages } from './lib/pdf'

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [assets, setAssets] = useState({ front: null, back: null, spine: null, pages: [] })
  const [spreadIndex, setSpreadIndex] = useState(0)
  const [flipReq, setFlipReq] = useState({ dir: 0, n: 0 })
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const glRef = useRef(null)

  const update = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), [])

  /* קריאת קובץ כתמונה — תמונה רגילה או עמוד ראשון של PDF */
  const readAsImage = async (file) => {
    if (file.type === 'application/pdf') {
      const { dataUrl } = await pdfFirstPage(file)
      return dataUrl
    }
    const { dataUrl } = await fileToImage(file)
    return dataUrl
  }

  const onUploadCover = async (file) => {
    setBusy(true)
    setStatus('מעבד כריכה…')
    try {
      const url = await readAsImage(file)
      setAssets((a) => ({ ...a, front: url }))
    } catch (e) {
      setStatus('שגיאה בקריאת הקובץ')
      console.error(e)
    } finally {
      setBusy(false)
      setStatus('')
    }
  }

  const onUploadBack = async (file) => {
    setBusy(true)
    try {
      const url = await readAsImage(file)
      setAssets((a) => ({ ...a, back: url }))
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const onUploadInterior = async (file) => {
    setBusy(true)
    setStatus('מרנדר עמודים…')
    try {
      const { pages } = await pdfToImages(file, {
        scale: 1.4,
        maxPages: 80,
        onProgress: (i, t) => setStatus(`מרנדר עמוד ${i}/${t}…`),
      })
      setAssets((a) => ({ ...a, pages }))
      setSpreadIndex(0)
      // התאמת מספר עמודים אוטומטית לעובי
      update({ pageCount: Math.max(20, pages.length) })
    } catch (e) {
      setStatus('שגיאה בעיבוד ה-PDF')
      console.error(e)
    } finally {
      setBusy(false)
      setTimeout(() => setStatus(''), 1200)
    }
  }

  const exportPng = () => {
    const gl = glRef.current
    if (!gl) return
    requestAnimationFrame(() => {
      const data = gl.domElement.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = data
      a.download = `book-mockup-${settings.mode}-${Date.now()}.png`
      a.click()
    })
  }

  const totalSpreads = Math.max(1, Math.ceil(assets.pages.length / 2))
  const hasContent = settings.mode === 'closed' ? !!assets.front : assets.pages.length > 0

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream-50">
      {/* כותרת */}
      <header className="z-20 flex items-center justify-between border-b border-cream-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-lg text-white shadow">
            📚
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-navy-900">מחולל הדמיות ספרים</h1>
            <p className="text-xs text-navy-500">הדמיה תלת-ממדית לספרים עבריים · נפתח מימין לשמאל</p>
          </div>
        </div>
        <button
          onClick={exportPng}
          disabled={!hasContent}
          className="btn-primary bg-navy-800 hover:bg-navy-700 focus:ring-navy-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 18v1a1 1 0 001 1h14a1 1 0 001-1v-1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          הורד תמונה
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* לוח בקרה */}
        <aside className="w-80 shrink-0 border-l border-cream-200 bg-white">
          <ControlPanel
            settings={settings}
            update={update}
            assets={assets}
            onUploadCover={onUploadCover}
            onUploadBack={onUploadBack}
            onUploadInterior={onUploadInterior}
            busy={busy}
          />
        </aside>

        {/* אזור התצוגה */}
        <main className="relative min-w-0 flex-1">
          {hasContent ? (
            <Stage
              settings={settings}
              assets={assets}
              spreadIndex={spreadIndex}
              setSpreadIndex={setSpreadIndex}
              flipReq={flipReq}
              glRef={glRef}
            />
          ) : (
            <EmptyState mode={settings.mode} />
          )}

          {/* סטטוס עיבוד */}
          {status && (
            <div className="absolute right-1/2 top-5 translate-x-1/2 rounded-full bg-navy-900/90 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
              {status}
            </div>
          )}

          {/* ניווט דפדוף — מצב פתוח */}
          {settings.mode === 'open' && assets.pages.length > 0 && (
            <div className="absolute bottom-6 right-1/2 flex translate-x-1/2 items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 shadow-xl ring-1 ring-cream-200 backdrop-blur">
              {/* RTL: "הבא" מתקדם בתוכן (דף משמאל מתהפך ימינה) */}
              <button
                onClick={() => setFlipReq((r) => ({ dir: -1, n: r.n + 1 }))}
                disabled={spreadIndex <= 0}
                className="rounded-xl bg-cream-100 px-3 py-1.5 text-sm font-semibold text-navy-700 hover:bg-cream-200 disabled:opacity-30"
              >
                → הקודם
              </button>
              <span className="min-w-[88px] text-center text-xs font-semibold tabular-nums text-navy-700">
                גיליון {spreadIndex + 1} / {totalSpreads}
              </span>
              <button
                onClick={() => setFlipReq((r) => ({ dir: 1, n: r.n + 1 }))}
                disabled={spreadIndex >= totalSpreads - 1}
                className="rounded-xl bg-navy-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-30"
              >
                הבא ←
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function EmptyState({ mode }) {
  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-b from-cream-50 to-cream-100 p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-4xl shadow-md">
          {mode === 'closed' ? '📕' : '📖'}
        </div>
        <h2 className="mb-2 text-xl font-bold text-navy-900">
          {mode === 'closed' ? 'העלה כריכה כדי להתחיל' : 'העלה PDF של תוכן הספר'}
        </h2>
        <p className="text-sm text-navy-500">
          {mode === 'closed'
            ? 'גרור תמונה או קובץ PDF של הכריכה אל הלוח שמימין, וקבל מיד הדמיה תלת-ממדית של הספר הסגור.'
            : 'גרור קובץ PDF של פנים הספר, וקבל הדמיה של הספר הפתוח עם אפשרות דפדוף בכל זווית.'}
        </p>
      </div>
    </div>
  )
}
