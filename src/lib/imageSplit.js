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
 * מפצל פריסת כריכה.
 * @param {string} dataUrl תמונת הפריסה
 * @param {object} opts
 * @param {2|3} opts.parts מספר חלקים (2 = קדמי+אחורי, 3 = כולל שדרה)
 * @param {number} opts.cutA חיתוך ראשון (יחס 0..1) — גבול אחורי/שדרה
 * @param {number} opts.cutB חיתוך שני (יחס 0..1) — גבול שדרה/קדמי (רק ל-3 חלקים)
 * @returns {Promise<{front:string, back:string, spine:string|null}>}
 */
export async function splitCoverSpread(dataUrl, { parts = 2, cutA = 0.5, cutB = 0.5 } = {}) {
  const img = await loadImage(dataUrl)
  const W = img.naturalWidth

  if (parts === 3) {
    const a = Math.min(cutA, cutB)
    const b = Math.max(cutA, cutB)
    return {
      back: crop(img, 0, a * W),
      spine: crop(img, a * W, (b - a) * W),
      front: crop(img, b * W, (1 - b) * W),
    }
  }
  // 2 חלקים — שמאל אחורית, ימין קדמית
  return {
    back: crop(img, 0, cutA * W),
    front: crop(img, cutA * W, (1 - cutA) * W),
    spine: null,
  }
}
