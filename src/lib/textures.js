import { useEffect, useState } from 'react'
import * as THREE from 'three'

/**
 * טוען dataURL לטקסטורת three עם ניהול צבע נכון (sRGB).
 * מחזיר null עד שהטקסטורה מוכנה.
 */
export function useImageTexture(dataUrl) {
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    if (!dataUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTexture(null)
      return
    }
    let disposed = false
    const loader = new THREE.TextureLoader()
    loader.load(dataUrl, (tex) => {
      if (disposed) {
        tex.dispose()
        return
      }
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      tex.needsUpdate = true
      setTexture(tex)
    })
    return () => {
      disposed = true
    }
  }, [dataUrl])

  // ניקוי הטקסטורה הקודמת כשמתחלפת
  useEffect(() => () => texture?.dispose(), [texture])

  return texture
}

/**
 * יוצר טקסטורה פרוצדורלית של שולי דפים (ערימת נייר עם קווים דקים).
 * @param {string} baseColor צבע הנייר
 * @param {'horizontal'|'vertical'} dir כיוון הקווים
 */
export function makePageEdgeTexture(baseColor = '#f4ecd8', dir = 'vertical') {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, size, size)

  // קווים דקים המדמים דפים נערמים
  const lines = 220
  for (let i = 0; i < lines; i++) {
    const p = (i / lines) * size
    const shade = 0.12 + Math.random() * 0.18
    ctx.strokeStyle = `rgba(120, 100, 70, ${shade})`
    ctx.lineWidth = Math.random() > 0.85 ? 1.2 : 0.5
    ctx.beginPath()
    if (dir === 'vertical') {
      ctx.moveTo(p, 0)
      ctx.lineTo(p, size)
    } else {
      ctx.moveTo(0, p)
      ctx.lineTo(size, p)
    }
    ctx.stroke()
  }

  // הצללה עדינה בקצוות
  const grad = ctx.createLinearGradient(0, 0, dir === 'vertical' ? size : 0, dir === 'vertical' ? 0 : size)
  grad.addColorStop(0, 'rgba(0,0,0,0.18)')
  grad.addColorStop(0.12, 'rgba(0,0,0,0)')
  grad.addColorStop(0.88, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.18)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * יוצר טקסטורת רקע גרדיאנט אנכי לשימוש כרקע הסצנה.
 */
export function makeGradientTexture(top = '#dfe7f2', bottom = '#a9b7cc') {
  const w = 16
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, top)
  grad.addColorStop(1, bottom)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** צבע אחיד כטקסטורה (לרקע אחיד) — מחזיר THREE.Color */
export function colorBackground(color) {
  return new THREE.Color(color)
}
