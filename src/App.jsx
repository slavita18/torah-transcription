import { useCallback, useEffect, useRef, useState } from 'react'
import Stage from './three/Stage'
import ControlPanel from './components/ControlPanel'
import { DEFAULT_SETTINGS } from './lib/presets'
import { fileToImage, pdfFirstPage, pdfToImages } from './lib/pdf'
import { autoCropImage } from './lib/cropMarks'
import { splitCoverSpread } from './lib/imageSplit'

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  // לכל נכס נשמרות שתי גרסאות: גולמית (raw) וחתוכה (cropped), כדי לאפשר
  // הפעלה/כיבוי של חיתוך סימני החיתוך ללא העלאה מחדש.
  const [assets, setAssets] = useState({
    frontRaw: null, frontCropped: null, frontMarks: false,
    backRaw: null, backCropped: null, backMarks: false,
    spineRaw: null, spineCropped: null, spineMarks: false,
    spreadRaw: null, // פריסת כריכה אחת
    spreadFront: null, spreadBack: null, spreadSpine: null, // תוצרי הפיצול
    pagesRaw: [], pagesCropped: [], pagesMarks: false,
  })
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
      setStatus('בודק סימני חיתוך…')
      const { dataUrl, cropped, marksDetected } = await autoCropImage(url)
      setAssets((a) => ({ ...a, frontRaw: url, frontCropped: cropped ? dataUrl : url, frontMarks: marksDetected }))
      setStatus(marksDetected ? '✂️ זוהו סימני חיתוך — נחתכו אוטומטית' : '')
    } catch (e) {
      setStatus('שגיאה בקריאת הקובץ')
      console.error(e)
    } finally {
      setBusy(false)
      setTimeout(() => setStatus(''), 1800)
    }
  }

  const onUploadBack = async (file) => {
    setBusy(true)
    try {
      const url = await readAsImage(file)
      const { dataUrl, cropped, marksDetected } = await autoCropImage(url)
      setAssets((a) => ({ ...a, backRaw: url, backCropped: cropped ? dataUrl : url, backMarks: marksDetected }))
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const onUploadSpine = async (file) => {
    setBusy(true)
    try {
      const url = await readAsImage(file)
      const { dataUrl, cropped, marksDetected } = await autoCropImage(url)
      setAssets((a) => ({ ...a, spineRaw: url, spineCropped: cropped ? dataUrl : url, spineMarks: marksDetected }))
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const onUploadSpread = async (file) => {
    setBusy(true)
    setStatus('מעבד פריסת כריכה…')
    try {
      const url = await readAsImage(file)
      setAssets((a) => ({ ...a, spreadRaw: url }))
      update({ coverInput: 'spread' })
    } catch (e) {
      setStatus('שגיאה בקריאת הקובץ')
      console.error(e)
    } finally {
      setBusy(false)
      setTimeout(() => setStatus(''), 1200)
    }
  }

  // פיצול חי של פריסת הכריכה לפי נקודות החיתוך
  useEffect(() => {
    if (settings.coverInput !== 'spread' || !assets.spreadRaw) return
    let cancelled = false
    splitCoverSpread(assets.spreadRaw, {
      parts: settings.spreadParts,
      cutA: settings.spreadCutA,
      cutB: settings.spreadCutB,
      swap: settings.spreadSwap,
    })
      .then(({ front, back, spine }) => {
        if (!cancelled) setAssets((a) => ({ ...a, spreadFront: front, spreadBack: back, spreadSpine: spine }))
      })
      .catch((e) => console.error(e))
    return () => {
      cancelled = true
    }
  }, [assets.spreadRaw, settings.coverInput, settings.spreadParts, settings.spreadCutA, settings.spreadCutB, settings.spreadSwap])

  const onUploadBg = async (file) => {
    setBusy(true)
    try {
      const { dataUrl } = await fileToImage(file)
      update({ bgType: 'image', bgImage: dataUrl, backgroundId: 'custom-image' })
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
        scale: 2.2,
        maxPages: 80,
        onProgress: (i, t) => setStatus(`מרנדר עמוד ${i}/${t}…`),
      })
      // זיהוי וחיתוך סימני חיתוך לכל עמוד
      const cropped = []
      let anyMarks = false
      for (let i = 0; i < pages.length; i++) {
        setStatus(`בודק סימני חיתוך ${i + 1}/${pages.length}…`)
        const res = await autoCropImage(pages[i])
        cropped.push(res.cropped ? res.dataUrl : pages[i])
        if (res.marksDetected) anyMarks = true
      }
      setAssets((a) => ({ ...a, pagesRaw: pages, pagesCropped: cropped, pagesMarks: anyMarks }))
      setSpreadIndex(0)
      // התאמת מספר עמודים אוטומטית לעובי
      update({ pageCount: Math.max(20, pages.length) })
      setStatus(anyMarks ? '✂️ זוהו סימני חיתוך — נחתכו אוטומטית' : '')
    } catch (e) {
      setStatus('שגיאה בעיבוד ה-PDF')
      console.error(e)
    } finally {
      setBusy(false)
      setTimeout(() => setStatus(''), 1800)
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

  // נכסים לתצוגה: מצב פריסה משתמש בתוצרי הפיצול; אחרת קבצים נפרדים (גולמי/חתוך)
  const spread = settings.coverInput === 'spread'
  const view = {
    front: spread ? assets.spreadFront : settings.autoCrop ? assets.frontCropped : assets.frontRaw,
    back: spread ? assets.spreadBack : settings.autoCrop ? assets.backCropped : assets.backRaw,
    spine: spread ? assets.spreadSpine : settings.autoCrop ? assets.spineCropped : assets.spineRaw,
    pages: settings.autoCrop ? assets.pagesCropped : assets.pagesRaw,
  }

  const totalSpreads = Math.max(1, Math.ceil(view.pages.length / 2))
  const hasContent = settings.mode === 'closed' ? !!view.front : view.pages.length > 0

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
            assets={view}
            hasSpread={!!assets.spreadRaw}
            marks={{ front: assets.frontMarks, back: assets.backMarks, spine: assets.spineMarks, pages: assets.pagesMarks }}
            onUploadCover={onUploadCover}
            onUploadBack={onUploadBack}
            onUploadSpine={onUploadSpine}
            onUploadSpread={onUploadSpread}
            onUploadInterior={onUploadInterior}
            onUploadBg={onUploadBg}
            busy={busy}
          />
        </aside>

        {/* אזור התצוגה */}
        <main className="relative min-w-0 flex-1">
          {hasContent ? (
            <Stage
              settings={settings}
              assets={view}
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
          {settings.mode === 'open' && view.pages.length > 0 && (
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
