import { useCallback, useEffect, useRef, useState } from 'react'
import Stage from './three/Stage'
import ControlPanel from './components/ControlPanel'
import Prospectus from './components/Prospectus'
import CropEditor from './components/CropEditor'
import { DEFAULT_SETTINGS } from './lib/presets'
import { fileToImage, pdfFirstPage, pdfToImages } from './lib/pdf'
import { autoCropImage, detectTrimFraction, cropToFraction } from './lib/cropMarks'
import { splitCoverSpread } from './lib/imageSplit'
import { computeThicknessCm } from './lib/dimensions'

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
  const [recording, setRecording] = useState(false)
  const [captures, setCaptures] = useState([]) // הדמיות שצולמו לפרוספקט
  const [paneFocus, setPaneFocus] = useState('split') // split | studio | prospectus
  const [cropTarget, setCropTarget] = useState(null) // { kind, src, initial }
  const glRef = useRef(null)

  // פתיחת עורך חיתוך ידני לנכס — מזהה קו-חיתוך אוטומטי כנקודת פתיחה
  const openCrop = async (kind) => {
    const rawByKind = {
      front: assets.frontRaw,
      back: assets.backRaw,
      spine: assets.spineRaw,
      pages: assets.pagesRaw?.[0],
    }
    const src = rawByKind[kind]
    if (!src) return
    setStatus('מזהה קו חיתוך…')
    const auto = await detectTrimFraction(src)
    setStatus('')
    setCropTarget({ kind, src, initial: auto || { x0: 0.05, y0: 0.05, x1: 0.95, y1: 0.95 } })
  }

  // החלת החיתוך הידני. לעמודי פנים — מחיל את אותה תיבה על כל העמודים.
  const applyCrop = async (box) => {
    const { kind } = cropTarget
    setCropTarget(null)
    setBusy(true)
    setStatus('חותך…')
    try {
      if (kind === 'pages') {
        const out = []
        for (let i = 0; i < assets.pagesRaw.length; i++) {
          setStatus(`חותך עמוד ${i + 1}/${assets.pagesRaw.length}…`)
          out.push(await cropToFraction(assets.pagesRaw[i], box))
        }
        setAssets((a) => ({ ...a, pagesCropped: out, pagesMarks: true }))
      } else {
        const rawKey = `${kind}Raw`
        const cropped = await cropToFraction(assets[rawKey], box)
        setAssets((a) => ({ ...a, [`${kind}Cropped`]: cropped, [`${kind}Marks`]: true }))
      }
      update({ autoCrop: true })
      setStatus('✓ נחתך')
    } catch (e) {
      console.error(e)
      setStatus('שגיאה בחיתוך')
    } finally {
      setBusy(false)
      setTimeout(() => setStatus(''), 1400)
    }
  }

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

  // פיצול חי של פריסת הכריכה לפי נקודות החיתוך.
  // במצב "שדרה אוטומטית" (spineAuto) רוחב השדרה נגזר מעובי הספר בפועל, כך
  // שהחיתוך נופל בדיוק במקום שבו השדרה אמורה להתחיל — לא בשליש שרירותי.
  useEffect(() => {
    if (settings.coverInput !== 'spread' || !assets.spreadRaw) return
    let cancelled = false
    let cutA = settings.spreadCutA
    let cutB = settings.spreadCutB
    if (settings.spreadParts === 3 && settings.spineAuto) {
      const coverW = Math.max(1, settings.width)
      const spineW = Math.max(0.2, computeThicknessCm(settings))
      const total = 2 * coverW + spineW
      cutA = coverW / total
      cutB = (coverW + spineW) / total
    }
    splitCoverSpread(assets.spreadRaw, {
      parts: settings.spreadParts,
      cutA,
      cutB,
      swap: settings.spreadSwap,
    })
      .then(({ front, back, spine }) => {
        if (!cancelled) setAssets((a) => ({ ...a, spreadFront: front, spreadBack: back, spreadSpine: spine }))
      })
      .catch((e) => console.error(e))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.spreadRaw, settings.coverInput, settings.spreadParts, settings.spreadCutA, settings.spreadCutB, settings.spreadSwap, settings.spineAuto, settings.width, settings.pageCount, settings.thicknessScale, settings.coverType])

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
      // מזהים את קו החיתוך מעמוד אחד שיש בו סימני חיתוך, ומחילים על כל הספר
      // (כל העמודים באותו גודל ומיקום trim) — כך אין כשלים פר-עמוד.
      setStatus('מזהה סימני חיתוך…')
      let frac = null
      for (let i = 0; i < pages.length && !frac; i++) {
        frac = await detectTrimFraction(pages[i])
      }
      const cropped = []
      let anyMarks = false
      if (frac) {
        anyMarks = true
        for (let i = 0; i < pages.length; i++) {
          setStatus(`חותך עמוד ${i + 1}/${pages.length}…`)
          cropped.push(await cropToFraction(pages[i], frac))
        }
      } else {
        // אין סימני חיתוך — גיבוי: חיתוך גוש אמנות פר-עמוד
        for (let i = 0; i < pages.length; i++) {
          const res = await autoCropImage(pages[i])
          cropped.push(res.cropped ? res.dataUrl : pages[i])
        }
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

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  // הקלטת סרטון של דפדוף אוטומטי דרך כל הספר (WebM)
  const recordFlipThrough = async () => {
    const gl = glRef.current
    if (!gl || recording) return
    const offset = settings.startLeft ? 1 : 0
    const total = Math.max(1, Math.ceil((view.pages.length + offset) / 2))
    setRecording(true)
    setStatus('🎬 מקליט דפדוף…')
    try {
      setSpreadIndex(0)
      await sleep(500)
      const canvas = gl.domElement
      const stream = canvas.captureStream(30)
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
      const chunks = []
      rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data)
      const stopped = new Promise((res) => {
        rec.onstop = res
      })
      rec.start()
      await sleep(800)
      for (let i = 0; i < total - 1; i++) {
        setFlipReq((r) => ({ dir: 1, n: r.n + 1 }))
        await sleep(1700)
      }
      await sleep(900)
      rec.stop()
      await stopped
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `book-flip-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      setStatus('שגיאה בהקלטה')
    } finally {
      setRecording(false)
      setTimeout(() => setStatus(''), 1500)
    }
  }

  // צילום ההדמיה הנוכחית לפרוספקט — ברקע שקוף לגזירה נקייה
  const captureForProspectus = async () => {
    const gl = glRef.current
    if (!gl) return
    const prev = {
      bgType: settings.bgType, backgroundId: settings.backgroundId,
      bgColor: settings.bgColor, bgTop: settings.bgTop, bgBottom: settings.bgBottom, bgImage: settings.bgImage,
    }
    update({ bgType: 'transparent' })
    await sleep(160)
    const data = gl.domElement.toDataURL('image/png')
    update(prev)
    setCaptures((c) => [...c, data])
    setStatus('📸 ההדמיה נוספה לפרוספקט')
    setTimeout(() => setStatus(''), 1600)
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
      <header className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-lg text-white shadow">
            📚
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-navy-900">
              מחולל הדמיות ספרים <span className="align-middle text-[10px] font-bold text-emerald-600">v21</span>
            </h1>
            <p className="text-xs text-navy-500">הדמיות תלת-ממד ופרוספקטים לספרים עבריים · RTL</p>
          </div>
        </div>

        {/* בורר תצוגה — סטודיו / מפוצל / פרוספקט (הכל בדף אחד; שום דבר לא נמחק) */}
        <div className="flex rounded-2xl bg-cream-100 p-1">
          {[
            { id: 'studio', label: 'סטודיו' },
            { id: 'split', label: 'מפוצל' },
            { id: 'prospectus', label: 'פרוספקט' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setPaneFocus(m.id)}
              className={`rounded-xl px-3.5 py-1.5 text-sm font-bold transition-all ${
                paneFocus === m.id ? 'bg-white text-navy-900 shadow' : 'text-navy-500 hover:text-navy-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {hasContent && (
            <button
              onClick={captureForProspectus}
              title="צלם את ההדמיה הנוכחית והוסף אותה לפרוספקט"
              className="btn-secondary border-navy-200 text-navy-800 hover:bg-cream-50 focus:ring-navy-500"
            >
              📸 צלם לפרוספקט{captures.length > 0 ? ` (${captures.length})` : ''}
            </button>
          )}
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
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* לוח בקרה של הסטודיו */}
        <aside className={`w-80 shrink-0 overflow-hidden border-l border-cream-200 bg-white ${paneFocus === 'prospectus' ? 'hidden' : ''}`}>
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
            onEditCrop={openCrop}
            rawAssets={assets}
            busy={busy}
          />
        </aside>

        {/* אזור הסטודיו (הדמיה תלת-ממד) */}
        <main className={`relative min-w-0 ${paneFocus === 'prospectus' ? 'hidden' : paneFocus === 'studio' ? 'flex-1' : 'flex-1'}`}>
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
              <div className="mx-1 h-6 w-px bg-cream-200" />
              <button
                onClick={recordFlipThrough}
                disabled={recording || totalSpreads < 2}
                title="הקלטת סרטון דפדוף"
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
              >
                <span className={recording ? 'animate-pulse' : ''}>●</span>
                {recording ? 'מקליט…' : 'הקלט סרטון'}
              </button>
            </div>
          )}
        </main>

        {/* אזור הפרוספקט — תמיד קיים; המצב נשמר גם כשעוברים פוקוס */}
        <section className={`flex min-w-0 flex-col ${paneFocus === 'studio' ? 'hidden' : 'flex-1'}`}>
          <Prospectus captures={captures} pages={view.pages} cover={view.front} />
        </section>
      </div>

      {cropTarget && (
        <CropEditor
          src={cropTarget.src}
          initial={cropTarget.initial}
          title={{ front: 'חיתוך כריכה קדמית', back: 'חיתוך כריכה אחורית', spine: 'חיתוך שדרה', pages: 'חיתוך עמודי פנים (חל על כל העמודים)' }[cropTarget.kind]}
          onApply={applyCrop}
          onCancel={() => setCropTarget(null)}
        />
      )}
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
