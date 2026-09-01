// פיצול "פריסת כריכה" (קובץ אחד הכולל כריכה אחורית + שדרה + כריכה קדמית)
// לחלקים נפרדים. ספר עברי (RTL) — בפריסה שטוחה: שמאל = אחורית, אמצע = שדרה,
// ימין = קדמית.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function crop(img, x, w) {
  const W = img.naturalWidth
  const H = img.naturalHeight
  const sx = Math.max(0, Math.round(x))
  const sw = Math.max(1, Math.min(W - sx, Math.round(w)))
  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, sx, 0, sw, H, 0, 0, sw, H)
  return canvas.toDataURL('image/jpeg', 0.92)
}

/**
 * מפצל פריסת כריכה. ברירת מחדל RTL: שמאל = קדמית, ימין = אחורית.
 * @param {string} dataUrl תמונת הפריסה
 * @param {object} opts
 * @param {2|3} opts.parts מספר חלקים
 * @param {number} opts.cutA חיתוך ראשון (יחס 0..1)
 * @param {number} opts.cutB חיתוך שני (יחס 0..1) — רק ל-3 חלקים
 * @param {boolean} opts.swap החלפת קדמי/אחורי
 * @returns {Promise<{front:string, back:string, spine:string|null}>}
 */
export async function splitCoverSpread(dataUrl, { parts = 2, cutA = 0.5, cutB = 0.5, swap = false } = {}) {
  const img = await loadImage(dataUrl)
  const W = img.naturalWidth

  let left
  let right
  let spine = null
  if (parts === 3) {
    const a = Math.min(cutA, cutB)
    const b = Math.max(cutA, cutB)
    left = crop(img, 0, a * W)
    spine = crop(img, a * W, (b - a) * W)
    right = crop(img, b * W, (1 - b) * W)
  } else {
    left = crop(img, 0, cutA * W)
    right = crop(img, cutA * W, (1 - cutA) * W)
  }

  // RTL: ברירת מחדל קדמית=שמאל, אחורית=ימין; swap מחליף
  return swap
    ? { front: right, back: left, spine }
    : { front: left, back: right, spine }
}

