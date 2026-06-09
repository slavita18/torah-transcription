// זיהוי אוטומטי וחיתוך של סימני חיתוך (crop / trim marks) ושוליים לבנים.
//
// קבצי הכנה לדפוס כוללים לעיתים סימני חיתוך — קווים דקים שחורים בפינות,
// מופרדים מהאמנות בשוליים לבנים (אזור ה-bleed). הפונקציות כאן מזהות את
// "גוש האמנות" המרכזי (המלבן הצבעוני המלא) וחותכות אליו, כך שההדמיה
// משתמשת בכריכה/בעמוד הנקיים בלבד — בלי הסימנים והשוליים.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** מוצא את הריצף הרציף הארוך ביותר של אינדקסים שבהם cov[i] >= th */
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

/** האם יש "דיו" (פיקסל לא-לבן) מחוץ לטווח [a,b] במערך הכיסוי */
function inkOutside(cov, a, b, th = 0.004) {
  for (let i = 0; i < cov.length; i++) {
    if (i < a || i > b) {
      if (cov[i] >= th) return true
    }
  }
  return false
}

/**
 * מזהה גוש אמנות וחותך אליו.
 * @returns {Promise<{dataUrl:string, cropped:boolean, marksDetected:boolean}>}
 */
export async function autoCropImage(dataUrl, opts = {}) {
  const {
    whiteThreshold = 244, // מעליו נחשב "לבן" (רקע)
    coverageRatio = 0.5, // יחס לכיסוי המרבי כדי להיכלל בגוש
    minBlockFraction = 0.25, // אם הגוש קטן מזה — לא חותכים (לא אמין)
    minTrim = 0.012, // חיתוך מינימלי משמעותי (יחסית לממד)
    analysisMax = 900, // רזולוציית ניתוח מרבית
  } = opts

  try {
    const img = await loadImage(dataUrl)
    const W = img.naturalWidth
    const H = img.naturalHeight
    if (!W || !H) return { dataUrl, cropped: false, marksDetected: false }

    // קנבס ניתוח מוקטן למהירות
    const scale = Math.min(1, analysisMax / Math.max(W, H))
    const aw = Math.max(1, Math.round(W * scale))
    const ah = Math.max(1, Math.round(H * scale))
    const ac = document.createElement('canvas')
    ac.width = aw
    ac.height = ah
    const actx = ac.getContext('2d', { willReadFrequently: true })
    actx.drawImage(img, 0, 0, aw, ah)
    const { data } = actx.getImageData(0, 0, aw, ah)

    const colCov = new Float32Array(aw)
    const rowCov = new Float32Array(ah)
    for (let y = 0; y < ah; y++) {
      for (let x = 0; x < aw; x++) {
        const i = (y * aw + x) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        const ink = a > 20 && (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold)
        if (ink) {
          colCov[x] += 1
          rowCov[y] += 1
        }
      }
    }
    for (let x = 0; x < aw; x++) colCov[x] /= ah
    for (let y = 0; y < ah; y++) rowCov[y] /= aw

    const maxCol = Math.max(...colCov)
    const maxRow = Math.max(...rowCov)
    if (maxCol === 0 || maxRow === 0) return { dataUrl, cropped: false, marksDetected: false }

    const colRun = longestRun(colCov, maxCol * coverageRatio)
    const rowRun = longestRun(rowCov, maxRow * coverageRatio)

    const blockFrac = (colRun.len / aw) * (rowRun.len / ah)
    if (blockFrac < minBlockFraction) {
      // הגוש קטן מדי — ככל הנראה כריכה בהירה; לא חותכים כדי לא לפגוע בתוכן
      return { dataUrl, cropped: false, marksDetected: false }
    }

    // האם יש סימנים/דיו מחוץ לגוש (אינדיקציה לסימני חיתוך)
    const marksDetected =
      inkOutside(colCov, colRun.start, colRun.end) || inkOutside(rowCov, rowRun.start, rowRun.end)

    // המרת גבולות לרזולוציה המקורית
    const x0 = Math.round((colRun.start / aw) * W)
    const x1 = Math.round(((colRun.end + 1) / aw) * W)
    const y0 = Math.round((rowRun.start / ah) * H)
    const y1 = Math.round(((rowRun.end + 1) / ah) * H)
    const cw = x1 - x0
    const ch = y1 - y0

    const trimmedEnough =
      (W - cw) / W > minTrim || (H - ch) / H > minTrim
    if (cw < 8 || ch < 8 || !trimmedEnough) {
      return { dataUrl, cropped: false, marksDetected: false }
    }

    const oc = document.createElement('canvas')
    oc.width = cw
    oc.height = ch
    const octx = oc.getContext('2d')
    octx.drawImage(img, x0, y0, cw, ch, 0, 0, cw, ch)
    const out = oc.toDataURL('image/jpeg', 0.9)
    return { dataUrl: out, cropped: true, marksDetected }
  } catch (e) {
    console.error('autoCropImage failed', e)
    return { dataUrl, cropped: false, marksDetected: false }
  }
}
