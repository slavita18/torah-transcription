import { useEffect, useRef, useState } from 'react'

/* עורך חיתוך ידני — גורר מלבן על התמונה כדי לקבוע בדיוק את קו החיתוך (trim).
   מקבל תיבה התחלתית (זיהוי אוטומטי אם היה) ומחזיר תיבה יחסית 0..1.
   פותר מקרים שבהם זיהוי הסימנים לא מדויק — המשתמש קובע ידנית. */
export default function CropEditor({ src, title = 'כוונון חיתוך', initial, onApply, onCancel }) {
  const [box, setBox] = useState(initial || { x0: 0.06, y0: 0.06, x1: 0.94, y1: 0.94 })
  const imgWrapRef = useRef(null)
  const drag = useRef(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const calc = () => {
      const el = imgWrapRef.current
      if (el) setDims({ w: el.clientWidth, h: el.clientHeight })
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  const clamp01 = (v) => Math.max(0, Math.min(1, v))
  const start = (e, mode) => {
    e.preventDefault()
    e.stopPropagation()
    drag.current = { mode, sx: e.clientX, sy: e.clientY, box: { ...box } }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d || !dims.w) return
    const dx = (e.clientX - d.sx) / dims.w
    const dy = (e.clientY - d.sy) / dims.h
    let { x0, y0, x1, y1 } = d.box
    const m = d.mode
    if (m === 'move') {
      const w = x1 - x0
      const h = y1 - y0
      x0 = clamp01(x0 + dx); y0 = clamp01(y0 + dy)
      x0 = Math.min(x0, 1 - w); y0 = Math.min(y0, 1 - h)
      x1 = x0 + w; y1 = y0 + h
    } else {
      if (m.includes('l')) x0 = clamp01(Math.min(x0 + dx, x1 - 0.03))
      if (m.includes('r')) x1 = clamp01(Math.max(x1 + dx, x0 + 0.03))
      if (m.includes('t')) y0 = clamp01(Math.min(y0 + dy, y1 - 0.03))
      if (m.includes('b')) y1 = clamp01(Math.max(y1 + dy, y0 + 0.03))
    }
    setBox({ x0, y0, x1, y1 })
  }
  const onUp = () => {
    drag.current = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }

  const L = `${box.x0 * 100}%`
  const T = `${box.y0 * 100}%`
  const Wd = `${(box.x1 - box.x0) * 100}%`
  const Hd = `${(box.y1 - box.y0) * 100}%`
  const handle = (mode, style, cursor) => (
    <div
      onPointerDown={(e) => start(e, mode)}
      style={{ position: 'absolute', width: 16, height: 16, background: '#2563eb', border: '2px solid #fff', borderRadius: 3, cursor, touchAction: 'none', ...style }}
    />
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onPointerDown={onCancel}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-4 shadow-2xl" onPointerDown={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy-900">✂️ {title}</h3>
          <span className="text-[11px] text-navy-400">גרור את המסגרת לקו החיתוך — הכל שמחוצה לה ייחתך</span>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-cream-100 p-2">
          <div ref={imgWrapRef} className="relative" style={{ maxHeight: '64vh', maxWidth: '100%' }}>
            <img src={src} alt="" draggable={false} className="block max-h-[64vh] max-w-full select-none" style={{ pointerEvents: 'none' }} />
            {/* הצללת האזור שמחוץ למסגרת */}
            <div style={{ position: 'absolute', inset: 0, boxShadow: `0 0 0 9999px rgba(0,0,0,0.0)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
              {/* ארבעה מלבנים כהים סביב תיבת החיתוך */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: T, background: 'rgba(20,20,30,0.55)' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: `${box.y1 * 100}%`, background: 'rgba(20,20,30,0.55)' }} />
              <div style={{ position: 'absolute', top: T, height: Hd, left: 0, width: L, background: 'rgba(20,20,30,0.55)' }} />
              <div style={{ position: 'absolute', top: T, height: Hd, right: 0, left: `${box.x1 * 100}%`, background: 'rgba(20,20,30,0.55)' }} />
            </div>
            {/* תיבת החיתוך */}
            <div
              onPointerDown={(e) => start(e, 'move')}
              style={{ position: 'absolute', left: L, top: T, width: Wd, height: Hd, border: '2px solid #2563eb', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)', cursor: 'move', touchAction: 'none' }}
            >
              {handle('tl', { left: -8, top: -8 }, 'nwse-resize')}
              {handle('tr', { right: -8, top: -8 }, 'nesw-resize')}
              {handle('bl', { left: -8, bottom: -8 }, 'nesw-resize')}
              {handle('br', { right: -8, bottom: -8 }, 'nwse-resize')}
              {handle('t', { left: 'calc(50% - 8px)', top: -8 }, 'ns-resize')}
              {handle('b', { left: 'calc(50% - 8px)', bottom: -8 }, 'ns-resize')}
              {handle('l', { left: -8, top: 'calc(50% - 8px)' }, 'ew-resize')}
              {handle('r', { right: -8, top: 'calc(50% - 8px)' }, 'ew-resize')}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={() => setBox({ x0: 0, y0: 0, x1: 1, y1: 1 })}
            className="rounded-lg bg-cream-100 px-3 py-1.5 text-xs text-navy-600 hover:bg-cream-200"
          >
            ללא חיתוך
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-navy-500 hover:text-navy-800">ביטול</button>
            <button
              onClick={() => onApply(box)}
              className="rounded-lg bg-navy-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-navy-700"
            >
              ✓ החל חיתוך
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
