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
 * מזהה את מסגרת ה-trim מתוך סימני חיתוך בפינות.
 * שיטה: סימן חיתוך אנכי (קו אנכי) מופיע באותו x גם בשוליים העליונים וגם
 * בתחתונים; אופקי — באותו y משמאל ומימין. הצטלבות זו מבדילה אותם מתוכן.
 * (סימני החיתוך מרונדרים כאפור, לכן הסף רחב.)
 * @returns {object|null} {x0,y0,x1,y1} בקואורדינטות הניתוח, או null
 */
function detectTrimBox(data, aw, ah) {
  const dark = (x, y) => {
    const i = (y * aw + x) * 4
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    return data[i + 3] > 20 && l < 150
  }
  const bandY = Math.round(0.15 * ah) // רוחב שוליים עליון/תחתון לסריקה
  const bandX = Math.round(0.15 * aw) // רוחב שוליים שמאל/ימין
  const minLen = Math.max(8, Math.round(0.012 * Math.min(aw, ah))) // אורך מינימלי לקו סימן

  // סימנים אנכיים — אותו x בשוליים העליונים וגם התחתונים → trim שמאל/ימין
  const vTop = new Int32Array(aw)
  const vBot = new Int32Array(aw)
  for (let x = 0; x < aw; x++) {
    let t = 0
    let b = 0
    for (let y = 0; y < bandY; y++) if (dark(x, y)) t++
    for (let y = ah - bandY; y < ah; y++) if (dark(x, y)) b++
    vTop[x] = t
    vBot[x] = b
  }
  // סימנים אופקיים — אותו y משמאל וגם מימין → trim עליון/תחתון
  const hLeft = new Int32Array(ah)
  const hRight = new Int32Array(ah)
  for (let y = 0; y < ah; y++) {
    let l = 0
    let r = 0
    for (let x = 0; x < bandX; x++) if (dark(x, y)) l++
    for (let x = aw - bandX; x < aw; x++) if (dark(x, y)) r++
    hLeft[y] = l
    hRight[y] = r
  }

  // סימן חיתוך הוא *קו דק* (מקבץ צר של פיקסלים), לא "רמה" רחבה. בכריכה
  // מלאת-הדפס (full bleed) ההדפס ממלא את השוליים ויוצר רמה רחבה — לכן
  // מחפשים מקבצים צרים בלבד ולוקחים את הקצה הפנימי של המקבץ החיצוני משני הצדדים.
  const maxMarkW = Math.max(2, Math.round(0.012 * Math.min(aw, ah))) // רוחב מרבי של קו-סימן
  const gapTol = 2 // סובלנות רווח בין פיקסלים במקבץ

  // מקבצי עמודות/שורות שעומדים בתנאי (קו נוכח בשתי הרצועות הנגדיות)
  const clusters = (n, ok) => {
    const runs = []
    let s = -1
    let gap = 0
    for (let i = 0; i < n; i++) {
      if (ok(i)) {
        if (s < 0) s = i
        gap = 0
      } else if (s >= 0) {
        if (++gap > gapTol) {
          runs.push({ start: s, end: i - gap })
          s = -1
        }
      }
    }
    if (s >= 0) runs.push({ start: s, end: n - 1 })
    return runs
  }

  const vRuns = clusters(aw, (x) => vTop[x] >= minLen && vBot[x] >= minLen)
  const hRuns = clusters(ah, (y) => hLeft[y] >= minLen && hRight[y] >= minLen)
  const thinV = vRuns.filter((r) => r.end - r.start + 1 <= maxMarkW)
  const thinH = hRuns.filter((r) => r.end - r.start + 1 <= maxMarkW)

  let x0 = -1
  let x1 = -1
  let y0 = -1
  let y1 = -1
  if (thinV.length >= 2 && thinH.length >= 2) {
    // קצה פנימי של המקבץ החיצוני מכל צד (הקו של קו-החיתוך)
    x0 = thinV[0].end
    x1 = thinV[thinV.length - 1].start
    y0 = thinH[0].end
    y1 = thinH[thinH.length - 1].start
  } else {
    // גיבוי: השיטה הישנה (קצה חיצוני-פנימי מכלל העמודות/שורות המתאימות)
    for (let x = 0; x < aw; x++) {
      if (vTop[x] >= minLen && vBot[x] >= minLen) {
        if (x0 < 0) x0 = x
        x1 = x
      }
    }
    for (let y = 0; y < ah; y++) {
      if (hLeft[y] >= minLen && hRight[y] >= minLen) {
        if (y0 < 0) y0 = y
        y1 = y
      }
    }
  }

  // ולידציה: מסגרת בתוך הדף, ממוקמת בשוליים (לא בקצה ולא במרכז)
  const ok =
    x0 >= 2 && x1 > x0 && y0 >= 2 && y1 > y0 &&
    x0 < aw * 0.25 && x1 > aw * 0.75 &&
    y0 < ah * 0.25 && y1 > ah * 0.75
  if (!ok) return null

  // חיתוך מעט פנימה מקו הסימן עצמו, כדי שהקו הדק לא יישאר בקצה
  const inset = Math.max(1, Math.round(0.004 * Math.min(aw, ah)))
  return { x0: x0 + inset, y0: y0 + inset, x1: x1 - inset, y1: y1 - inset }
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
  const { analysisMax = 1200, minTrim = 0.01 } = opts
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

/**
 * מזהה את מסגרת ה-trim ומחזיר אותה כיחסים (0..1) של מימדי התמונה — או null.
 * שימושי לזיהוי קו החיתוך מעמוד אחד והחלתו על כל העמודים.
 */
export async function detectTrimFraction(dataUrl, opts = {}) {
  const { analysisMax = 1200 } = opts
  try {
    const img = await loadImage(dataUrl)
    const W = img.naturalWidth
    const H = img.naturalHeight
    if (!W || !H) return null
    const scale = Math.min(1, analysisMax / Math.max(W, H))
    const aw = Math.max(1, Math.round(W * scale))
    const ah = Math.max(1, Math.round(H * scale))
    const ac = document.createElement('canvas')
    ac.width = aw
    ac.height = ah
    const ctx = ac.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, aw, ah)
    const { data } = ctx.getImageData(0, 0, aw, ah)
    const box = detectTrimBox(data, aw, ah)
    if (!box) return null
    return { x0: box.x0 / aw, y0: box.y0 / ah, x1: box.x1 / aw, y1: box.y1 / ah }
  } catch (e) {
    console.error('detectTrimFraction failed', e)
    return null
  }
}

/** חותך תמונה לפי מלבן יחסי (0..1). */
export async function cropToFraction(dataUrl, f, quality = 0.9) {
  try {
    const img = await loadImage(dataUrl)
    const W = img.naturalWidth
    const H = img.naturalHeight
    const sx = Math.max(0, Math.round(f.x0 * W))
    const sy = Math.max(0, Math.round(f.y0 * H))
    const sw = Math.min(W - sx, Math.round((f.x1 - f.x0) * W))
    const sh = Math.min(H - sy, Math.round((f.y1 - f.y0) * H))
    if (sw < 8 || sh < 8) return dataUrl
    const oc = document.createElement('canvas')
    oc.width = sw
    oc.height = sh
    oc.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    return oc.toDataURL('image/jpeg', quality)
  } catch (e) {
    console.error('cropToFraction failed', e)
    return dataUrl
  }
}
