import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useImageTexture } from '../lib/textures'
import { SCALE, computeThicknessCm } from '../lib/dimensions'

/** דף יחיד שטוח (מישור) הנשען על הכריכה, מוטה לפי זווית הפתיחה */
function FlatPage({ url, sign, W, H, tilt, color }) {
  const tex = useImageTexture(url)
  return (
    <group rotation={[0, 0, sign * tilt]}>
      <mesh position={[(sign * W) / 2, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial
          map={tex || null}
          color={tex ? '#ffffff' : color}
          roughness={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

/** ערימת דפים + כריכה מתחת לכל צד */
function SideBlock({ sign, W, H, tilt, stackT, board, overhang, coverColor, pageColor, finish }) {
  return (
    <group rotation={[0, 0, sign * tilt]}>
      {/* ערימת דפים */}
      <mesh position={[(sign * W) / 2, -stackT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, stackT, H]} />
        <meshStandardMaterial color={pageColor} roughness={0.95} />
      </mesh>
      {/* כריכה מתחת (עם overhang קל בצד החיצוני) */}
      <mesh
        position={[(sign * (W + overhang)) / 2, -stackT - board / 2, 0]}
        castShadow
        receiveShadow
      >
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

/** דף מתהפך — אנימציה סביב ציר השדרה */
function FlippingPage({ active, fromSign, frontUrl, backUrl, W, H, tilt, onDone }) {
  const ref = useRef()
  const t = useRef(0)
  const frontTex = useImageTexture(frontUrl)
  const backTex = useImageTexture(backUrl)

  useEffect(() => {
    if (active) t.current = 0
  }, [active])

  useFrame((_, delta) => {
    if (!active || !ref.current) return
    t.current = Math.min(1, t.current + delta * 1.6)
    const e = t.current < 0.5 ? 2 * t.current * t.current : 1 - Math.pow(-2 * t.current + 2, 2) / 2
    // מסתובב מצד fromSign אל הצד הנגדי, מעל לכיפה
    const start = fromSign * tilt
    const end = -fromSign * tilt
    ref.current.rotation.z = start + (end - start) * e
    if (t.current >= 1) onDone?.()
  })

  if (!active) return null
  return (
    <group ref={ref}>
      <mesh position={[(fromSign * W) / 2, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={frontTex || null} color="#fff" roughness={0.9} side={THREE.FrontSide} />
      </mesh>
      <mesh position={[(fromSign * W) / 2, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={backTex || null} color="#fff" roughness={0.9} side={THREE.FrontSide} />
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

  const [flip, setFlip] = useState(null) // {fromSign, target, front, back}

  // בקשת דפדוף מבחוץ: flipReq = { dir, n }
  const lastReq = useRef(0)
  useEffect(() => {
    if (!flipReq || flipReq.n === lastReq.current || flip) return
    lastReq.current = flipReq.n
    const dir = flipReq.dir
    const next = idx + dir
    if (next < 0 || next > totalSpreads - 1) return
    // התקדמות (dir=+1): הדף משמאל מתהפך ימינה (RTL)
    const fromSign = dir > 0 ? -1 : 1
    const front = dir > 0 ? leftUrl : rightUrl
    const back = dir > 0 ? pages[next * 2] : pages[next * 2 + 1]
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlip({ fromSign, target: next, front, back })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipReq])

  return (
    <group position={[0, settings.floatY + stackT + board, 0]}>
      <SideBlock sign={1} {...{ W, H, tilt, stackT, board, overhang, coverColor: settings.coverColor, pageColor: settings.pageColor, finish: settings.finish }} />
      <SideBlock sign={-1} {...{ W, H, tilt, stackT, board, overhang, coverColor: settings.coverColor, pageColor: settings.pageColor, finish: settings.finish }} />

      <FlatPage url={rightUrl} sign={1} W={W} H={H} tilt={tilt} color={settings.pageColor} />
      <FlatPage url={leftUrl} sign={-1} W={W} H={H} tilt={tilt} color={settings.pageColor} />

      <FlippingPage
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
