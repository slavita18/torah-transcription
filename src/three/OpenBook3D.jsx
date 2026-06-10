import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useImageTexture } from '../lib/textures'
import { SCALE, computeThicknessCm } from '../lib/dimensions'

/**
 * חומר לדף. חשוב: יוצרים אותו ב-useMemo התלוי בטקסטורה, כדי שכשהטקסטורה
 * נטענת (מ-null למפה) ה-shader יתקמפל מחדש ויראה את התוכן (אחרת הדף נשאר לבן).
 */
function usePageMaterial(tex, color, side = THREE.DoubleSide) {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex || null,
        color: tex ? '#ffffff' : color,
        // הארה-עצמית מהטקסטורה — שומרת על ההדפס חד וקריא גם בזווית/בתאורה חלשה
        emissive: tex ? '#ffffff' : '#000000',
        emissiveMap: tex || null,
        emissiveIntensity: tex ? 0.55 : 0,
        roughness: 0.82,
        side,
      }),
    [tex, color, side],
  )
}

/** דף שטוח הנשען על הכריכה, מוטה לפי זווית הפתיחה */
function FlatPage({ url, sign, W, H, tilt, color, y = 0.002 }) {
  const tex = useImageTexture(url)
  const mat = usePageMaterial(tex, color)
  return (
    <group rotation={[0, 0, sign * tilt]}>
      <mesh position={[(sign * W) / 2, y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat} receiveShadow>
        <planeGeometry args={[W, H]} />
      </mesh>
    </group>
  )
}

/** דף דו-צדדי (לקיפול/דפדוף) — חזית ואחור עם טקסטורות שונות */
function Leaf({ frontUrl, backUrl, W, H, rotationZ, refObj }) {
  const f = useImageTexture(frontUrl)
  const b = useImageTexture(backUrl)
  const fm = usePageMaterial(f, '#ffffff', THREE.FrontSide)
  const bm = usePageMaterial(b, '#ffffff', THREE.FrontSide)
  return (
    <group ref={refObj} rotation={[0, 0, rotationZ]}>
      <mesh position={[-W / 2, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={fm} castShadow>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh position={[-W / 2, -0.012, 0]} rotation={[Math.PI / 2, 0, 0]} material={bm}>
        <planeGeometry args={[W, H]} />
      </mesh>
    </group>
  )
}

/** ערימת דפים + כריכה מתחת לכל צד */
function SideBlock({ sign, W, H, tilt, stackT, board, overhang, coverColor, pageColor, finish }) {
  return (
    <group rotation={[0, 0, sign * tilt]}>
      <mesh position={[(sign * W) / 2, -stackT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, stackT, H]} />
        <meshStandardMaterial color={pageColor} roughness={0.95} />
      </mesh>
      <mesh position={[(sign * (W + overhang)) / 2, -stackT - board / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + overhang, board, H + overhang * 2]} />
        <meshPhysicalMaterial
          color={coverColor}
          roughness={finish === 'glossy' ? 0.2 : 0.7}
          clearcoat={finish === 'glossy' ? 0.8 : 0.1}
        />
      </mesh>
    </group>
  )
}

/** דף מתהפך — אנימציה סביב ציר השדרה (לדפדוף) */
function FlippingLeaf({ active, fromSign, frontUrl, backUrl, W, H, tilt, onDone }) {
  const ref = useRef()
  const t = useRef(0)
  const f = useImageTexture(frontUrl)
  const b = useImageTexture(backUrl)
  const fm = usePageMaterial(f, '#ffffff', THREE.FrontSide)
  const bm = usePageMaterial(b, '#ffffff', THREE.FrontSide)
  useEffect(() => {
    if (active) t.current = 0
  }, [active])
  useFrame((_, delta) => {
    if (!active || !ref.current) return
    t.current = Math.min(1, t.current + delta * 1.6)
    const e = t.current < 0.5 ? 2 * t.current * t.current : 1 - Math.pow(-2 * t.current + 2, 2) / 2
    const start = fromSign * tilt
    const end = -fromSign * tilt
    ref.current.rotation.z = start + (end - start) * e
    if (t.current >= 1) onDone?.()
  })
  if (!active) return null
  return (
    <group ref={ref}>
      <mesh position={[(fromSign * W) / 2, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} material={fm} castShadow>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh position={[(fromSign * W) / 2, -0.014, 0]} rotation={[Math.PI / 2, 0, 0]} material={bm}>
        <planeGeometry args={[W, H]} />
      </mesh>
    </group>
  )
}

/**
 * ספר פתוח. RTL: הדף בעל המספר הנמוך נמצא בצד ימין.
 * pages = מערך dataURL של עמודי הפנים.
 */
export default function OpenBook3D({ settings, pages, spreadIndex, setSpreadIndex, flipReq }) {
  const W = settings.width * SCALE
  const H = settings.height * SCALE
  const T = computeThicknessCm(settings) * SCALE
  const board = (settings.coverType === 'hard' ? 0.28 : 0.07) * SCALE
  const overhang = (settings.coverType === 'hard' ? 0.4 : 0.05) * SCALE
  const tilt = ((180 - settings.openAngle) / 2) * (Math.PI / 180)
  const stackT = Math.max(0.02, T / 2 - board)

  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2))
  const idx = Math.min(spreadIndex, totalSpreads - 1)

  // RTL: ימין = אינדקס נמוך
  const rightUrl = pages[idx * 2] || null
  const leftUrl = pages[idx * 2 + 1] || null
  const nextRight = pages[idx * 2 + 2] || null
  const nextLeft = pages[idx * 2 + 3] || null

  const turning = settings.openPose === 'turning'
  const turn = ((settings.turnAngle ?? 55) * Math.PI) / 180

  const [flip, setFlip] = useState(null)
  const lastReq = useRef(0)
  useEffect(() => {
    if (!flipReq || flipReq.n === lastReq.current || flip) return
    lastReq.current = flipReq.n
    const dir = flipReq.dir
    const next = idx + dir
    if (next < 0 || next > totalSpreads - 1) return
    const fromSign = dir > 0 ? -1 : 1
    const front = dir > 0 ? leftUrl : rightUrl
    const back = dir > 0 ? pages[next * 2] : pages[next * 2 + 1]
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlip({ fromSign, target: next, front, back })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipReq])

  const common = { W, H, tilt, stackT, board, overhang, coverColor: settings.coverColor, pageColor: settings.pageColor, finish: settings.finish }

  return (
    <group position={[0, settings.floatY + stackT + board, 0]}>
      <SideBlock sign={1} {...common} />
      <SideBlock sign={-1} {...common} />

      {/* דף ימני (סטטי) */}
      <FlatPage url={rightUrl} sign={1} W={W} H={H} tilt={tilt} color={settings.pageColor} />

      {/* דף שמאלי: במצב "דפדוף" מציגים מתחתיו את העמוד הבא ומעליו עלה מורם */}
      {turning ? (
        <>
          <FlatPage url={nextLeft || leftUrl} sign={-1} W={W} H={H} tilt={tilt} color={settings.pageColor} />
          {!flip && <Leaf frontUrl={leftUrl} backUrl={nextRight} W={W} H={H} rotationZ={-tilt + turn} />}
        </>
      ) : (
        <FlatPage url={leftUrl} sign={-1} W={W} H={H} tilt={tilt} color={settings.pageColor} />
      )}

      <FlippingLeaf
        active={!!flip}
        fromSign={flip?.fromSign || -1}
        frontUrl={flip?.front}
        backUrl={flip?.back}
        W={W}
        H={H}
        tilt={tilt}
        onDone={() => {
          const target = flip.target
          setFlip(null)
          setSpreadIndex(target)
        }}
      />
    </group>
  )
}
