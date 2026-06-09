import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * ממיר קובץ PDF למערך של תמונות (dataURL), עמוד אחר עמוד.
 * @param {File} file קובץ ה-PDF
 * @param {object} opts אפשרויות
 * @param {number} opts.scale רזולוציית רינדור (ברירת מחדל 1.5)
 * @param {number} opts.maxPages מספר עמודים מרבי לרינדור
 * @param {(loaded:number,total:number)=>void} opts.onProgress דיווח התקדמות
 * @returns {Promise<{pages: string[], width: number, height: number}>}
 */
export async function pdfToImages(file, opts = {}) {
  const { scale = 1.5, maxPages = 60, onProgress } = opts
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const total = Math.min(pdf.numPages, maxPages)
  const pages = []
  let aspect = { width: 0, height: 0 }

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    if (i === 1) aspect = { width: canvas.width, height: canvas.height }
    pages.push(canvas.toDataURL('image/jpeg', 0.85))
    onProgress?.(i, total)
    page.cleanup()
  }

  return { pages, width: aspect.width, height: aspect.height }
}

/**
 * רינדור עמוד יחיד מ-PDF (שימושי לכריכה — לוקח את העמוד הראשון).
 */
export async function pdfFirstPage(file, scale = 2) {
  const { pages, width, height } = await pdfToImages(file, { scale, maxPages: 1 })
  return { dataUrl: pages[0], width, height }
}

/**
 * טוען תמונה מקובץ ומחזיר dataURL + יחס מימדים.
 */
export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () =>
        resolve({ dataUrl: reader.result, width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
