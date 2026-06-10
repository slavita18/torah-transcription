// זיהוי וחיתוך לפי סימני חיתוך (crop / trim marks).
//
// קבצי דפוס כוללים סימני חיתוך — קווים דקים שחורים בפינות, מחוץ לקו החיתוך,
// המסמנים את גודל הספר הסופי (trim). המטרה: לזהות את המסגרת שהסימנים יוצרים
// ולחתוך *בדיוק לקו החיתוך* — לא רק למחוק סימנים ולהשאיר שוליים.
//
// שיטה: מאתרים את גוש התוכן המרכזי, ואז בשוליים שמסביבו מחפשים את הקווים
// האנכיים (קובעים שמאל/ימין) והאופקיים (קובעים עליון/תחתון) של סימני החיתוך.
// אם נמצאה מסגרת תקפה — חותכים אליה. אחרת נופלים לזיהוי "גוש אמנות" כללי.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function longestRun(cov, th) {
  let bestStart = 0
  let bestLen = 0
  let curStart = -1
  for (let i = 0; i < cov.length; i++) {
    if (cov[i] >= th) {
      if (curStart < 0) curStart = i
      const len = i - curStart + 1
      if (len > bestLen) {
        bestLen = len
        bestStart = curStart
      }
    } else {
      curStart = -1
    }
  }
  return { start: bestStart, end: bestStart + bestLen - 1, len: bestLen }
}

function cropToBox(img, W, H, aw, ah, box, quality = 0.92) {
  const sx = Math.max(0, Math.round((box.x0 / aw) * W))
  const sy = Math.max(0, Math.round((box.y0 / ah) * H))
  const sw = Math.min(W - sx, Math.round(((box.x1 - box.x0) / aw) * W))
  const sh = Math.min(H - sy, Math.round(((box.y1 - box.y0) / ah) * H))
  const oc = document.createElement('canvas')
  oc.width = Math.max(1, sw)
  oc.height = Math.max(1, sh)
  oc.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
  return oc.toDataURL('image/jpeg', quality)
}

/**
 * מזהה את מסגרת ה-trim מתוך סימני חיתוך.
 * @returns {object|null} {x0,y0,x1,y1} בקואורדינטות הניתוח, או null
 */
function detectTrimBox(data, aw, ah) {
  const darkAt = (x, y) => {
    const i = (y * aw + x) * 4
    const a = data[i + 3]
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    return a > 20 && l < 120 // קו שחור של סימן חיתוך
  }
  const notWhiteAt = (x, y) => {
    const i = (y * aw + x) * 4
    return data[i + 3] > 20 && (data[i] < 244 || data[i + 1] < 244 || data[i + 2] < 244)
  }

  // גוש התוכן המרכזי (טקסט/אמנות) לפי פרופיל כיסוי
  const colCov = new Float32Array(aw)
  const rowCov = new Float32Array(ah)
  for (let y = 0; y < ah; y++) {
    for (let x = 0; x < aw; x++) {
      if (notWhiteAt(x, y)) {
        colCov[x] += 1
        rowCov[y] += 1
      }
    }
  }
  const maxCol = Math.max(...colCov)
  const maxRow = Math.max(...rowCov)
  if (maxCol === 0 || maxRow === 0) return null
  const colBand = longestRun(colCov, maxCol * 0.4)
  const rowBand = longestRun(rowCov, maxRow * 0.4)
  const cLeft = colBand.start
  const cRight = colBand.end
  const cTop = rowBand.start
  const cBottom = rowBand.end

  // צריך שוליים אמיתיים סביב התוכן כדי שיהיה מקום לסימנים
  if (cLeft < 3 && cRight > aw - 4 && cTop < 3 && cBottom > ah - 4) return null

  const minMark = Math.max(5, Math.round(Math.min(aw, ah) * 0.01)) // אורך מינימלי של סימן

  // סימנים אנכיים — בשוליים שמעל/מתחת לתוכן (קובעים trim שמאל/ימין)
  const vMark = new Int32Array(aw)
  for (let x = 0; x < aw; x++) {
    let c = 0
    for (let y = 0; y < cTop; y++) if (darkAt(x, y)) c++
    for (let y = cBottom + 1; y < ah; y++) if (darkAt(x, y)) c++
    vMark[x] = c
  }
  // סימנים אופקיים — בשוליים מימין/משמאל לתוכן (קובעים trim עליון/תחתון)
  const hMark = new Int32Array(ah)
  for (let y = 0; y < ah; y++) {
    let c = 0
    for (let x = 0; x < cLeft; x++) if (darkAt(x, y)) c++
    for (let x = cRight + 1; x < aw; x++) if (darkAt(x, y)) c++
    hMark[y] = c
  }

  let trimLeft = -1
  let trimRight = -1
  for (let x = 0; x < aw; x++) {
    if (vMark[x] >= minMark) {
      if (trimLeft < 0) trimLeft = x
      trimRight = x
    }
  }
  let trimTop = -1
  let trimBottom = -1
  for (let y = 0; y < ah; y++) {
    if (hMark[y] >= minMark) {
      if (trimTop < 0) trimTop = y
      trimBottom = y
    }
  }

  // ולידציה: המסגרת חייבת להקיף את התוכן (הסימנים מחוץ לתוכן), ולהיות בתוך הדף
  const valid =
    trimLeft >= 0 && trimRight > trimLeft &&
    trimTop >= 0 && trimBottom > trimTop &&
    trimLeft < cLeft && trimRight > cRight &&
    trimTop < cTop && trimBottom > cBottom &&
    (trimRight - trimLeft) > aw * 0.3 && (trimBottom - trimTop) > ah * 0.3
  if (!valid) return null

  // חיתוך מעט פנימה מקו הסימן עצמו, כדי שהקו הדק לא יישאר בקצה
  const inset = Math.max(1, Math.round(Math.min(aw, ah) * 0.004))
  return {
    x0: trimLeft + inset,
    y0: trimTop + inset,
    x1: trimRight - inset,
    y1: trimBottom - inset,
  }
}

/** זיהוי גוש אמנות כללי (גיבוי כשאין סימני חיתוך) */
function detectArtworkBox(data, aw, ah) {
  const colCov = new Float32Array(aw)
  const rowCov = new Float32Array(ah)
  for (let y = 0; y < ah; y++) {
    for (let x = 0; x < aw; x++) {
      const i = (y * aw + x) * 4
      const ink = data[i + 3] > 20 && (data[i] < 244 || data[i + 1] < 244 || data[i + 2] < 244)
      if (ink) {
        colCov[x] += 1
        rowCov[y] += 1
      }
    }
  }
  const maxCol = Math.max(...colCov)
  const maxRow = Math.max(...rowCov)
  if (maxCol === 0 || maxRow === 0) return null
  const colRun = longestRun(colCov, maxCol * 0.5)
  const rowRun = longestRun(rowCov, maxRow * 0.5)
  const frac = (colRun.len / aw) * (rowRun.len / ah)
  if (frac < 0.25) return null
  return { x0: colRun.start, y0: rowRun.start, x1: colRun.end + 1, y1: rowRun.end + 1 }
}

/**
 * חיתוך אוטומטי. מנסה קודם לפי סימני חיתוך (trim), אחרת לפי גוש אמנות.
 * @returns {Promise<{dataUrl:string, cropped:boolean, marksDetected:boolean}>}
 */
export async function autoCropImage(dataUrl, opts = {}) {
  const { analysisMax = 1100, minTrim = 0.01 } = opts
  try {
    const img = await loadImage(dataUrl)
    const W = img.naturalWidth
    const H = img.naturalHeight
    if (!W || !H) return { dataUrl, cropped: false, marksDetected: false }

    const scale = Math.min(1, analysisMax / Math.max(W, H))
    const aw = Math.max(1, Math.round(W * scale))
    const ah = Math.max(1, Math.round(H * scale))
    const ac = document.createElement('canvas')
    ac.width = aw
    ac.height = ah
    const actx = ac.getContext('2d', { willReadFrequently: true })
    actx.drawImage(img, 0, 0, aw, ah)
    const { data } = actx.getImageData(0, 0, aw, ah)

    // 1) ניסיון מדויק לפי סימני חיתוך
    const trim = detectTrimBox(data, aw, ah)
    if (trim) {
      return { dataUrl: cropToBox(img, W, H, aw, ah, trim), cropped: true, marksDetected: true }
    }

    // 2) גיבוי: גוש אמנות
    const box = detectArtworkBox(data, aw, ah)
    if (box) {
      const cw = ((box.x1 - box.x0) / aw) * W
      const ch = ((box.y1 - box.y0) / ah) * H
      const trimmedEnough = (W - cw) / W > minTrim || (H - ch) / H > minTrim
      if (cw > 8 && ch > 8 && trimmedEnough) {
        return { dataUrl: cropToBox(img, W, H, aw, ah, box, 0.9), cropped: true, marksDetected: false }
      }
    }
    return { dataUrl, cropped: false, marksDetected: false }
  } catch (e) {
    console.error('autoCropImage failed', e)
    return { dataUrl, cropped: false, marksDetected: false }
  }
}
