import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useImageTexture } from '../lib/textures'
import { SCALE, computeThicknessCm } from '../lib/dimensions'

/**
 * חצי-דף (מהשדרה כלפי חוץ) עם עמק עדין: קצה השדרה (x=0) נמוך, והדף עולה
 * בעדינות כלפי הקצה החיצוני — כמו עמוד אמיתי בספר פתוח. שני חצאי-הדפים
 * נפגשים בדיוק בשדרה (x=0, z=0) ולכן אין רווח/חריץ באמצע.
 * sign=+1 → מימין (x∈[0,W]); sign=-1 → משמאל (x∈[-W,0]). ה-UV נשמר תקין.
 */
function makeHalfPageGeometry(W, H, sign, rise) {
  const g = new THREE.PlaneGeometry(W, H, 40, 1)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i) // -W/2..W/2
    const x = px + sign * (W / 2) // sign=+1 → [0,W]; sign=-1 → [-W,0]
    const d = Math.abs(x) / W // 0 בשדרה, 1 בקצה החיצוני
    const z = rise * Math.sin(d * (Math.PI / 2)) // עמק חלק
    pos.setX(i, x)
    pos.setZ(i, z)
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
  return g
}

function useHalfGeometry(W, H, sign, rise) {
  return useMemo(() => makeHalfPageGeometry(W, H, sign, rise), [W, H, sign, rise])
}

/**
 * חומר לדף. עם תוכן: MeshBasicMaterial לא-מואר עם toneMapped=false — ההדפס
 * מוצג *בדיוק* כמו המקור (שחור חד על לבן), בלי שתאורה/חשיפה ישטפו את פיקסלי
 * הקצה של הטקסט. תחושת הנפח מגיעה מהגאומטריה המעוקלת ומצל-השדרה, לא מהצללה.
 */
function usePageMaterial(tex, color, side = THREE.DoubleSide) {
  return useMemo(() => {
    if (tex) {
      return new THREE.MeshBasicMaterial({ map: tex, side, toneMapped: false })
    }
    return new THREE.MeshStandardMaterial({ color, roughness: 0.9, side })
  }, [tex, color, side])
}

/** טקסטורת צל-שדרה: ליבה כהה דקה עם דעיכה רכה לצדדים (קו עדין, לא פס עבה) */
function makeGutterTexture() {
  const w = 128
  const c = document.createElement('canvas')
  c.width = w
  c.height = 4
  const ctx = c.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0.0, 'rgba(26,18,10,0)')
  grad.addColorStop(0.44, 'rgba(26,18,10,0.10)')
  grad.addColorStop(0.5, 'rgba(26,18,10,0.6)')
  grad.addColorStop(0.56, 'rgba(26,18,10,0.10)')
  grad.addColorStop(1.0, 'rgba(26,18,10,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, 4)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** חצי-דף סטטי, נשען בזווית פתיחה עדינה סביב ציר השדרה (x=0) */
function HalfPage({ url, sign, W, H, rise, openTilt, color, y = 0.004 }) {
  const tex = useImageTexture(url)
  const geo = useHalfGeometry(W, H, sign, rise)
  const mat = usePageMaterial(tex, color)
  return (
    <group rotation={[0, 0, sign * openTilt]}>
      <mesh geometry={geo} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat} receiveShadow castShadow />
    </group>
  )
}

/** ערימת דפים + כריכה שטוחה מתחת לצד אחד (מהשדרה כלפי חוץ) */
function SideBlock({ sign, W, H, openTilt, stackT, board, overhang, coverColor, pageColor, finish }) {
  const cx = (sign * W) / 2
  const coverW = W + overhang
  return (
    <group rotation={[0, 0, sign * openTilt]}>
      {/* ערימת הדפים */}
      <mesh position={[cx, -stackT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, stackT, H]} />
        <meshStandardMaterial color={pageColor} roughness={0.96} />
      </mesh>
      {/* לוח הכריכה — קצה פנימי בשדרה (x=0), בולט מעט בקצה החיצוני ובראש/תחתית */}
      <mesh position={[(sign * coverW) / 2, -stackT - board / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[coverW, board, H + overhang * 2]} />
        <meshPhysicalMaterial
          color={coverColor}
          roughness={finish === 'glossy' ? 0.25 : 0.72}
          clearcoat={finish === 'glossy' ? 0.8 : 0.12}
        />
      </mesh>
    </group>
  )
}

/** דף מתהפך — קשת דפדוף טבעית דרך מאונך, ציר בשדרה (x=0) */
function FlippingLeaf({ active, fromSign, frontUrl, backUrl, W, H, rise, openTilt, onHalf, onDone }) {
  const ref = useRef()
  const t = useRef(0)
  const half = useRef(false)
  const f = useImageTexture(frontUrl)
  const bRaw = useImageTexture(backUrl)
  // הצד האחורי מסתובב 180° יחד עם הדף — מסובבים את הטקסטורה כדי לתקן.
  const b = useMemo(() => {
    if (!bRaw) return null
    const c = bRaw.clone()
    c.center.set(0.5, 0.5)
    c.rotation = Math.PI
    c.needsUpdate = true
    return c
  }, [bRaw])
  const geo = useHalfGeometry(W, H, fromSign, rise)
  const fm = usePageMaterial(f, '#ffffff', THREE.FrontSide)
  const bm = usePageMaterial(b, '#ffffff', THREE.FrontSide)
  useEffect(() => {
    if (active) {
      t.current = 0
      half.current = false
    }
  }, [active])
  useFrame((_, delta) => {
    if (!active || !ref.current) return
    t.current = Math.min(1, t.current + delta * 0.7)
    const e = t.current < 0.5 ? 2 * t.current * t.current : 1 - Math.pow(-2 * t.current + 2, 2) / 2
    const start = fromSign * openTilt
    const end = fromSign * (Math.PI - openTilt)
    ref.current.rotation.z = start + (end - start) * e
    ref.current.position.y = Math.sin(Math.PI * e) * W * 0.14
    if (!half.current && t.current >= 0.5) {
      half.current = true
      onHalf?.()
    }
    if (t.current >= 1) onDone?.()
  })
  if (!active) return null
  return (
    <group ref={ref}>
      <mesh geometry={geo} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={fm} castShadow />
      <mesh geometry={geo} position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={bm} />
    </group>
  )
}

/**
 * ספר פתוח. RTL: הדף בעל המספר הנמוך מימין.
 */
export default function OpenBook3D({ settings, pages, spreadIndex, setSpreadIndex, flipReq }) {
  const W = settings.width * SCALE
  const H = settings.height * SCALE
  const T = computeThicknessCm(settings) * SCALE
  const board = (settings.coverType === 'hard' ? 0.5 : 0.16) * SCALE
  const overhang = (settings.coverType === 'hard' ? 0.75 : 0.12) * SCALE
  // זווית פתיחה עדינה סביב השדרה — הדפים נפגשים בשדרה, בלי רווח.
  const openTilt = Math.max(0, ((180 - settings.openAngle) / 2) * (Math.PI / 180))
  const stackT = Math.max(0.02, T / 2 - board)

  const pose = settings.openPose || 'curved'
  const rise = pose === 'flat' ? W * 0.015 : W * 0.06 // עומק העמק/עקמומיות
  const offset = settings.startLeft ? 1 : 0

  const g = (i) => pages[i] || null
  const totalSpreads = Math.max(1, Math.ceil((pages.length + offset) / 2))
  const idx = Math.min(spreadIndex, totalSpreads - 1)

  const gutterTex = useMemo(() => makeGutterTexture(), [])
  const [flip, setFlip] = useState(null)
  const lastReq = useRef(0)

  useEffect(() => {
    if (!flipReq || flipReq.n === lastReq.current || flip) return
    lastReq.current = flipReq.n
    const dir = flipReq.dir
    const next = idx + dir
    if (next < 0 || next > totalSpreads - 1) return
    const fromSign = dir > 0 ? -1 : 1
    const sbase = idx * 2 - offset
    const nbase = next * 2 - offset
    const front = dir > 0 ? g(sbase + 1) : g(sbase)
    const back = dir > 0 ? g(nbase) : g(nbase + 1)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlip({ fromSign, target: next, front, back })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipReq])

  const sbase = idx * 2 - offset
  let rightUrl
  let leftUrl
  if (flip) {
    const nbase = flip.target * 2 - offset
    if (flip.fromSign < 0) {
      rightUrl = g(sbase)
      leftUrl = g(nbase + 1)
    } else {
      leftUrl = g(sbase + 1)
      rightUrl = g(nbase)
    }
  } else {
    rightUrl = g(sbase)
    leftUrl = g(sbase + 1)
  }

  const common = { W, H, openTilt, stackT, board, overhang, coverColor: settings.coverColor, pageColor: settings.pageColor, finish: settings.finish }
  const rootRot = pose === 'standing' ? [-0.5, 0, 0] : [0, 0, 0]

  return (
    <group rotation={rootRot}>
      <group position={[0, settings.floatY + stackT + board, 0]}>
        <SideBlock sign={1} {...common} />
        <SideBlock sign={-1} {...common} />

        <HalfPage url={rightUrl} sign={1} W={W} H={H} rise={rise} openTilt={openTilt} color={settings.pageColor} />
        <HalfPage url={leftUrl} sign={-1} W={W} H={H} rise={rise} openTilt={openTilt} color={settings.pageColor} />

        {/* צל-שדרה רך ודק: ליבה כהה דקה עם דעיכה לצדדים — קו עדין לאורך המרכז */}
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W * 0.13, H * 0.985]} />
          <meshBasicMaterial map={gutterTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>

        <FlippingLeaf
          active={!!flip}
          fromSign={flip?.fromSign || -1}
          frontUrl={flip?.front}
          backUrl={flip?.back}
          W={W}
          H={H}
          rise={rise}
          openTilt={openTilt}
          onDone={() => {
            const target = flip.target
            setFlip(null)
            setSpreadIndex(target)
          }}
        />
      </group>
    </group>
  )
}
