import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/* מצב "פרוספקט" — עורך קנבס A4 בשפת העיצוב של סלאוויטא:
   רקע קלף חמים + מסגרת זהב, ומוסיפים אליו הדמיות שצולמו + בלוקי טקסט.
   ניתן לגרור, לשנות גודל, לערוך טקסט, ולייצא PNG/PDF. */

// גדלי קנבס (פיקסלים לעריכה; ייצוא מוכפל x2)
const SIZES = {
  a4p: { w: 794, h: 1123, label: 'A4 לאורך' },
  a4l: { w: 1123, h: 794, label: 'A4 לרוחב' },
  landscape: { w: 1400, h: 990, label: 'כפולה רחבה' },
}

const BG_STYLES = {
  parchment: {
    label: 'קלף חמים',
    css: 'radial-gradient(115% 80% at 50% 12%, #fdf8ee 0%, #f4e8cf 46%, #e7d2a8 100%)',
    frame: '#b8902f',
    ink: '#3a2a12',
  },
  cream: {
    label: 'שמנת נקי',
    css: 'linear-gradient(180deg, #fffdf8 0%, #f6efe1 100%)',
    frame: '#c29a4a',
    ink: '#2a2a2a',
  },
  royal: {
    label: 'כחול מלכותי',
    css: 'radial-gradient(120% 90% at 50% 10%, #24406e 0%, #172a4d 55%, #0c1a33 100%)',
    frame: '#d8b45a',
    ink: '#f3ecd8',
  },
  wine: {
    label: 'יין',
    css: 'radial-gradient(120% 90% at 50% 10%, #5c2433 0%, #3c1620 60%, #230d13 100%)',
    frame: '#d8b45a',
    ink: '#f3ecd8',
  },
}

let idc = 1
const uid = () => `el_${idc++}`

export default function Prospectus({ captures, pages = [], cover = null }) {
  const [els, setEls] = useState([])
  const [sel, setSel] = useState(null)
  const [bg, setBg] = useState('parchment')
  const [size, setSize] = useState('a4p')
  const [exporting, setExporting] = useState(false)
  const [logoSrc, setLogoSrc] = useState(null)
  const CW = SIZES[size].w
  const CH = SIZES[size].h
  const logoInput = useRef(null)
  const stageRef = useRef(null)
  const wrapRef = useRef(null)
  const [fit, setFit] = useState(1)

  const onLogoFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const rd = new FileReader()
    rd.onload = () => { setLogoSrc(rd.result); addImage(rd.result, 20) }
    rd.readAsDataURL(f)
    e.target.value = ''
  }

  // התאמת הקנבס לגובה החלון
  useEffect(() => {
    const calc = () => {
      if (!wrapRef.current) return
      const aw = wrapRef.current.clientWidth - 48
      const ah = wrapRef.current.clientHeight - 48
      setFit(Math.max(0.2, Math.min(aw / CW, ah / CH)))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [CW, CH])

  const addImage = (src, wPct = 34, opts = {}) => {
    const img = new Image()
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight
      setEls((e) => [
        ...e,
        {
          id: uid(), type: 'image', src, aspect,
          rot: opts.rot || 0,
          shadow: opts.shadow !== false,
          card: !!opts.card,
          xPct: opts.xPct != null ? opts.xPct : (100 - wPct) / 2,
          yPct: opts.yPct != null ? opts.yPct : 30,
          wPct,
        },
      ])
    }
    img.src = src
  }

  const addRule = () =>
    setEls((e) => [...e, { id: uid(), type: 'rule', xPct: 30, yPct: 50, wPct: 40, rot: 0, color: BG_STYLES[bg].frame }])

  // תבנית קטלוג סלאוויטא — דף ספר בודד לאורך. רק מעלים פריטים והכל מסתדר.
  const applyTemplate = () => {
    setSel(null)
    const ink = BG_STYLES[bg].ink
    const gold = BG_STYLES[bg].frame
    setEls([
      { id: uid(), type: 'text', text: 'שם הספר', xPct: 10, yPct: 4, wPct: 80, rot: 0, fontSize: 56, weight: 700, family: "'Frank Ruhl Libre', serif", color: ink, align: 'center' },
      { id: uid(), type: 'text', text: 'על התורה והמועדים', xPct: 15, yPct: 12.5, wPct: 70, rot: 0, fontSize: 23, weight: 500, family: "'Frank Ruhl Libre', serif", color: ink, align: 'center' },
      { id: uid(), type: 'rule', xPct: 35, yPct: 17.5, wPct: 30, rot: 0, color: gold },
      { id: uid(), type: 'text', panel: 'parchment', text: 'כאן הטקסט שלך על תוכן הספר — תיאור, מעלות הספר, הסכמות ועוד. לחיצה כפולה לעריכה.', xPct: 12, yPct: 47, wPct: 76, rot: 0, fontSize: 18, weight: 400, family: "'Heebo', sans-serif", color: '#3a2a12', align: 'right' },
      { id: uid(), type: 'text', panel: 'gold', text: 'עיצוב · עימוד · דפוס', xPct: 6, yPct: 92, wPct: 26, rot: 0, fontSize: 15, weight: 700, family: "'Frank Ruhl Libre', serif", color: '#3a2a12', align: 'center' },
    ])
    // ספר סגור (הירו) — צילום ראשון או הכריכה
    const hero = captures[0] || cover
    if (hero) addImage(hero, 32, { xPct: 34, yPct: 19 })
    // כרטיסי-דף (עמודי פנים) משני צדי הספר
    if (pages[0]) addImage(pages[0], 23, { xPct: 5, yPct: 21, rot: -4, card: true })
    if (pages[1]) addImage(pages[1], 23, { xPct: 72, yPct: 21, rot: 4, card: true })
    // ספר פתוח (צילום שני) או עוד כרטיס-דף
    if (captures[1]) addImage(captures[1], 60, { xPct: 20, yPct: 62 })
    else if (pages[2]) addImage(pages[2], 26, { xPct: 37, yPct: 63, rot: -2, card: true })
    // לוגו
    if (logoSrc) addImage(logoSrc, 18, { xPct: 72, yPct: 90.5 })
  }

  const addText = (preset) => {
    const presets = {
      title: { text: 'שם הספר', fontSize: 54, weight: 700, family: "'Frank Ruhl Libre', serif", color: BG_STYLES[bg].ink, align: 'center', wPct: 70 },
      sub: { text: 'על התורה והמועדים', fontSize: 30, weight: 500, family: "'Frank Ruhl Libre', serif", color: BG_STYLES[bg].ink, align: 'center', wPct: 70 },
      body: { text: 'כאן הטקסט שלך על תוכן הספר — תיאור, מעלות, הסכמות ועוד.', fontSize: 20, weight: 400, family: "'Heebo', sans-serif", color: BG_STYLES[bg].ink, align: 'right', wPct: 60 },
    }
    const p = presets[preset]
    setEls((e) => [...e, { id: uid(), type: 'text', xPct: 15, yPct: 12, rot: 0, ...p }])
  }

  const update1 = (id, patch) => setEls((e) => e.map((el) => (el.id === id ? { ...el, ...patch } : el)))
  const remove1 = (id) => { setEls((e) => e.filter((el) => el.id !== id)); setSel(null) }
  const move = (id, dir) =>
    setEls((e) => {
      const i = e.findIndex((x) => x.id === id)
      if (i < 0) return e
      const j = dir > 0 ? Math.min(e.length - 1, i + 1) : Math.max(0, i - 1)
      const cp = [...e]
      const [it] = cp.splice(i, 1)
      cp.splice(j, 0, it)
      return cp
    })

  // גרירה ושינוי גודל
  const dragRef = useRef(null)
  const onElPointerDown = (e, el, mode) => {
    e.stopPropagation()
    setSel(el.id)
    const startX = e.clientX
    const startY = e.clientY
    dragRef.current = { id: el.id, mode, startX, startY, xPct: el.xPct, yPct: el.yPct, wPct: el.wPct }
    window.addEventListener('pointermove', onDragMove)
    window.addEventListener('pointerup', onDragUp)
  }
  const onDragMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const dxPct = ((e.clientX - d.startX) / fit / CW) * 100
    const dyPct = ((e.clientY - d.startY) / fit / CH) * 100
    if (d.mode === 'move') {
      update1(d.id, { xPct: d.xPct + dxPct, yPct: d.yPct + dyPct })
    } else {
      // ידית שינוי גודל בצד שמאל-תחתון (RTL) — משנה רוחב
      update1(d.id, { wPct: Math.max(6, d.wPct - dxPct) })
    }
  }
  const onDragUp = () => {
    dragRef.current = null
    window.removeEventListener('pointermove', onDragMove)
    window.removeEventListener('pointerup', onDragUp)
  }

  const exportImage = async (type) => {
    if (!stageRef.current || !els.length) return
    setSel(null)
    setExporting(true)
    await new Promise((r) => setTimeout(r, 60))
    try {
      const canvas = await html2canvas(stageRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        width: CW,
        height: CH,
        windowWidth: CW,
        windowHeight: CH,
      })
      if (type === 'pdf') {
        const landscapeMode = CW > CH
        const pdf = new jsPDF({ orientation: landscapeMode ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
        const pw = landscapeMode ? 297 : 210
        const ph = landscapeMode ? 210 : 297
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pw, ph)
        pdf.save(`prospectus-${Date.now()}.pdf`)
      } else {
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/png')
        a.download = `prospectus-${Date.now()}.png`
        a.click()
      }
    } catch (err) {
      console.error('export failed', err)
    } finally {
      setExporting(false)
    }
  }

  const style = BG_STYLES[bg]
  const selEl = els.find((e) => e.id === sel)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* סרגל עליון קומפקטי */}
      <div className="flex flex-wrap items-center gap-2 border-b border-cream-200 bg-white px-3 py-2">
        <span className="text-sm font-bold text-navy-900">🧾 פרוספקט</span>

        {/* הדמיות שצולמו — לחיצה מוסיפה לקנבס */}
        <div className="flex max-w-[38%] items-center gap-1 overflow-x-auto">
          {captures.length === 0 ? (
            <span className="whitespace-nowrap text-[11px] text-navy-400">צלם הדמיות בסטודיו ← יופיעו כאן</span>
          ) : (
            captures.map((c, i) => (
              <button key={i} onClick={() => addImage(c)} title="הוסף לקנבס"
                className="shrink-0 rounded border border-cream-200 bg-cream-50 p-0.5 hover:ring-2 hover:ring-navy-400">
                <img src={c} alt="" className="h-9 w-8 object-contain" />
              </button>
            ))
          )}
        </div>

        <div className="h-6 w-px bg-cream-200" />
        <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={onLogoFile} />
        <button onClick={() => logoInput.current?.click()} className="rounded-lg bg-cream-100 px-2.5 py-1 text-xs text-navy-800 hover:bg-cream-200" title="העלה לוגו">⬆ לוגו</button>
        {logoSrc && (
          <button onClick={() => addImage(logoSrc, 20)} className="rounded-lg bg-cream-100 px-2 py-1 text-xs text-navy-700 hover:bg-cream-200" title="הוסף את הלוגו שוב">➕</button>
        )}

        <div className="h-6 w-px bg-cream-200" />
        <button onClick={applyTemplate} className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200" title="תבנית קטלוג — דף ספר מוכן">📖 תבנית קטלוג</button>
        <button onClick={() => addText('title')} className="rounded-lg bg-cream-100 px-2.5 py-1 text-xs font-semibold text-navy-800 hover:bg-cream-200">➕ כותרת</button>
        <button onClick={() => addText('body')} className="rounded-lg bg-cream-100 px-2.5 py-1 text-xs text-navy-700 hover:bg-cream-200">➕ תוכן</button>
        <button onClick={addRule} className="rounded-lg bg-cream-100 px-2.5 py-1 text-xs text-navy-700 hover:bg-cream-200">➕ קו זהב</button>

        <div className="h-6 w-px bg-cream-200" />
        <select value={size} onChange={(e) => setSize(e.target.value)} className="rounded-lg bg-cream-100 px-2 py-1 text-xs text-navy-800" title="גודל/כיוון">
          {Object.entries(SIZES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={bg} onChange={(e) => setBg(e.target.value)} className="rounded-lg bg-cream-100 px-2 py-1 text-xs text-navy-800" title="רקע">
          {Object.entries(BG_STYLES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <div className="mr-auto flex items-center gap-1.5">
          {els.length > 0 && (
            <button onClick={() => { setEls([]); setSel(null) }} className="rounded-lg px-2 py-1 text-xs text-navy-400 hover:text-red-600" title="נקה קנבס">נקה</button>
          )}
          <button onClick={() => exportImage('png')} disabled={!els.length || exporting}
            className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-700 disabled:opacity-40">
            {exporting ? '…' : '⬇ PNG'}
          </button>
          <button onClick={() => exportImage('pdf')} disabled={!els.length || exporting}
            className="rounded-lg border-2 border-navy-800 px-3 py-1 text-xs font-bold text-navy-800 hover:bg-cream-50 disabled:opacity-40">
            ⬇ PDF
          </button>
        </div>
      </div>

      {/* אזור הקנבס */}
      <div ref={wrapRef} className="relative flex flex-1 items-center justify-center overflow-hidden bg-cream-100 p-4">
        {/* פאנל מאפיינים לאלמנט נבחר */}
        {selEl && (
          <ElementPanel el={selEl} update={(p) => update1(selEl.id, p)} remove={() => remove1(selEl.id)} move={(d) => move(selEl.id, d)} />
        )}

        <div style={{ transform: `scale(${fit})`, transformOrigin: 'center' }}>
          <div
            ref={stageRef}
            onPointerDown={() => setSel(null)}
            style={{
              width: CW,
              height: CH,
              background: style.css,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
            }}
          >
            {/* מסגרת זהב כפולה + יהלומי פינה */}
            {/* זוהר עליון + זוהר זהב תחתון */}
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(60% 42% at 50% 96%, ${style.frame}22, transparent 70%)`, pointerEvents: 'none' }} />
            {/* ויניֶיטה עדינה בקצוות */}
            <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 120px rgba(60,40,10,0.14)', pointerEvents: 'none' }} />
            {/* מסגרת זהב כפולה */}
            <div style={{ position: 'absolute', inset: 20, border: `2px solid ${style.frame}`, borderRadius: 6, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 26, border: `1px solid ${style.frame}88`, borderRadius: 4, pointerEvents: 'none' }} />
            {/* יהלומי פינה */}
            {[[20, 20], [20, 'r'], ['b', 20], ['b', 'r']].map(([v, h], i) => (
              <div key={i} style={{
                position: 'absolute',
                width: 10, height: 10, background: style.frame, transform: 'rotate(45deg)',
                top: v === 'b' ? undefined : 15, bottom: v === 'b' ? 15 : undefined,
                left: h === 'r' ? undefined : 15, right: h === 'r' ? 15 : undefined,
                pointerEvents: 'none',
              }} />
            ))}

            {els.map((el) => (
              <ElementView
                key={el.id}
                el={el}
                selected={el.id === sel}
                onDown={onElPointerDown}
                onText={(t) => update1(el.id, { text: t })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ElementView({ el, selected, onDown, onText }) {
  const common = {
    position: 'absolute',
    left: `${el.xPct}%`,
    top: `${el.yPct}%`,
    width: `${el.wPct}%`,
    transform: `rotate(${el.rot || 0}deg)`,
    cursor: 'move',
    outline: selected ? '2px solid #2563eb' : 'none',
  }
  return (
    <div style={common} onPointerDown={(e) => onDown(e, el, 'move')}>
      {el.type === 'image' ? (
        <div
          style={{
            padding: el.card ? '3.5%' : 0,
            background: el.card ? '#fdfbf5' : 'transparent',
            border: el.card ? '1px solid #e7dcc2' : 'none',
            borderRadius: el.card ? 5 : 3,
            boxShadow: el.shadow === false ? 'none' : '0 16px 26px -8px rgba(30,20,5,0.42)',
          }}
        >
          <img src={el.src} alt="" draggable={false} style={{ width: '100%', display: 'block', pointerEvents: 'none' }} />
        </div>
      ) : el.type === 'rule' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
          <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, transparent, ${el.color}, transparent)` }} />
          <div style={{ width: 8, height: 8, background: el.color, transform: 'rotate(45deg)' }} />
          <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, transparent, ${el.color}, transparent)` }} />
        </div>
      ) : (
        <div
          contentEditable
          suppressContentEditableWarning
          dir="rtl"
          onBlur={(e) => onText(e.currentTarget.textContent)}
          onPointerDown={(e) => { if (selected) e.stopPropagation() }}
          style={{
            fontFamily: el.family,
            fontSize: el.fontSize,
            fontWeight: el.weight,
            color: el.color,
            textAlign: el.align,
            lineHeight: 1.4,
            outline: 'none',
            width: '100%',
            whiteSpace: 'pre-wrap',
            ...(el.panel === 'parchment'
              ? {
                  background: 'linear-gradient(180deg,#fbf3df 0%,#f3e6c6 100%)',
                  border: '1px solid #d8c496',
                  borderRadius: 6,
                  padding: '18px 22px',
                  boxShadow: '0 10px 22px -10px rgba(60,40,10,0.35), inset 0 0 40px rgba(150,110,50,0.08)',
                }
              : el.panel === 'gold'
                ? {
                    background: 'linear-gradient(180deg,#f3e2b0 0%,#e4c778 100%)',
                    border: '1px solid #b8902f',
                    borderRadius: 999,
                    padding: '8px 16px',
                    boxShadow: '0 6px 14px -6px rgba(60,40,10,0.4)',
                  }
                : {}),
          }}
        >
          {el.text}
        </div>
      )}
      {selected && (
        <div
          onPointerDown={(e) => onDown(e, el, 'resize')}
          style={{ position: 'absolute', bottom: -7, left: -7, width: 14, height: 14, borderRadius: 8, background: '#2563eb', border: '2px solid #fff', cursor: 'nwse-resize' }}
        />
      )}
    </div>
  )
}

function ElementPanel({ el, update, remove, move }) {
  return (
    <div className="absolute right-4 top-4 z-20 w-56 rounded-2xl bg-white/95 p-3 text-xs shadow-xl ring-1 ring-cream-200 backdrop-blur">
      <div className="mb-2 font-bold text-navy-900">{el.type === 'text' ? 'טקסט' : 'הדמיה'}</div>
      {el.type === 'text' && (
        <>
          <label className="mb-2 block">גודל גופן
            <input type="range" min="12" max="90" value={el.fontSize} onChange={(e) => update({ fontSize: +e.target.value })} className="w-full accent-navy-700" />
          </label>
          <div className="mb-2 flex items-center gap-2">
            <span>צבע</span>
            <input type="color" value={el.color} onChange={(e) => update({ color: e.target.value })} className="h-6 w-8 rounded" />
            <button onClick={() => update({ weight: el.weight >= 700 ? 400 : 700 })} className="rounded bg-cream-100 px-2 py-1 font-bold">B</button>
            <select value={el.align} onChange={(e) => update({ align: e.target.value })} className="rounded bg-cream-100 px-1 py-1">
              <option value="right">ימין</option>
              <option value="center">מרכז</option>
              <option value="left">שמאל</option>
            </select>
          </div>
        </>
      )}
      {el.type === 'image' && (
        <label className="mb-2 flex items-center gap-2">
          <input type="checkbox" checked={el.shadow !== false} onChange={(e) => update({ shadow: e.target.checked })} className="h-4 w-4 accent-navy-700" />
          צל רך
        </label>
      )}
      {/* מיקום מהיר */}
      <div className="mb-2">
        <span className="mb-1 block text-[11px] text-navy-500">מיקום מהיר</span>
        <div className="grid grid-cols-3 gap-1">
          {[
            { k: 'tr', l: '↗', x: 100 - el.wPct - 4, y: 5 },
            { k: 'tc', l: '⬆', x: (100 - el.wPct) / 2, y: 5 },
            { k: 'tl', l: '↖', x: 4, y: 5 },
            { k: 'cr', l: '→', x: 100 - el.wPct - 4, y: 42 },
            { k: 'cc', l: '●', x: (100 - el.wPct) / 2, y: 42 },
            { k: 'cl', l: '←', x: 4, y: 42 },
            { k: 'br', l: '↘', x: 100 - el.wPct - 4, y: 80 },
            { k: 'bc', l: '⬇', x: (100 - el.wPct) / 2, y: 80 },
            { k: 'bl', l: '↙', x: 4, y: 80 },
          ].map((p) => (
            <button key={p.k} onClick={() => update({ xPct: p.x, yPct: p.y })}
              className="rounded bg-cream-100 py-1 text-navy-700 hover:bg-navy-800 hover:text-white">{p.l}</button>
          ))}
        </div>
      </div>
      <label className="mb-2 block">גודל
        <input type="range" min="6" max="95" value={Math.round(el.wPct)} onChange={(e) => update({ wPct: +e.target.value })} className="w-full accent-navy-700" />
      </label>
      <label className="mb-2 block">סיבוב
        <input type="range" min="-30" max="30" value={el.rot || 0} onChange={(e) => update({ rot: +e.target.value })} className="w-full accent-navy-700" />
      </label>
      <div className="flex items-center gap-1.5">
        <button onClick={() => move(1)} className="flex-1 rounded bg-cream-100 py-1 hover:bg-cream-200">קדימה</button>
        <button onClick={() => move(-1)} className="flex-1 rounded bg-cream-100 py-1 hover:bg-cream-200">אחורה</button>
        <button onClick={remove} className="rounded bg-red-50 px-2 py-1 font-semibold text-red-600 hover:bg-red-100">מחק</button>
      </div>
    </div>
  )
}
