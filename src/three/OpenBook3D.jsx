import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useImageTexture } from '../lib/textures'
import { SCALE, computeThicknessCm } from '../lib/dimensions'

/**
 * גאומטריית דף עם עקמומיות עדינה (בליטה לכיוון מעלה) לתחושת ספר אמיתי.
 * amp=0 → מישור שטוח. הקמירה ב-z המקומי (שהופך ל-Y אחרי הסיבוב).
 */
function makeCurvedPageGeometry(W, H, amp) {
  const g = new THREE.PlaneGeometry(W, H, 28, 1)
  if (amp > 0) {
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const t = (x + W / 2) / W // 0..1 לאורך רוחב הדף
      pos.setZ(i, amp * Math.sin(Math.PI * t))
    }
    pos.needsUpdate = true
    g.computeVertexNormals()
  }
  return g
}

function usePageGeometry(W, H, amp) {
  return useMemo(() => makeCurvedPageGeometry(W, H, amp), [W, H, amp])
}

/**
 * חומר לדף. כשיש תוכן (טקסטורה) משתמשים ב-MeshBasicMaterial לא-מואר עם
 * toneMapped=false — כך ההדפס מוצג בדיוק כמו המקור (שחור חד על לבן), בלי
 * ש-PBR או tone-mapping ישטפו את הניגודיות. דף ריק נשאר עם חומר מואר רגיל.
 */
function usePageMaterial(tex, color, side = THREE.DoubleSide) {
  return useMemo(() => {
    if (tex) {
      return new THREE.MeshBasicMaterial({ map: tex, side, toneMapped: false })
    }
    return new THREE.MeshStandardMaterial({ color, roughness: 0.85, side })
  }, [tex, color, side])
}

/** דף בודד (נשען), מוטה לפי זווית הפתיחה, עם עקמומיות אופציונלית */
function Page({ url, sign, W, H, tilt, amp, color, y = 0.002 }) {
  const tex = useImageTexture(url)
  const geo = usePageGeometry(W, H, amp)
  const mat = usePageMaterial(tex, color)
  return (
    <group rotation={[0, 0, sign * tilt]}>
      <mesh geometry={geo} position={[(sign * W) / 2, y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat} receiveShadow />
    </group>
  )
}

/** עלה דו-צדדי (לדף מתהפך/מסולסל) */
function Leaf({ frontUrl, backUrl, W, H, amp, rotationZ, refObj }) {
  const f = useImageTexture(frontUrl)
  const b = useImageTexture(backUrl)
  const geo = usePageGeometry(W, H, amp)
  const fm = usePageMaterial(f, '#ffffff', THREE.FrontSide)
  const bm = usePageMaterial(b, '#ffffff', THREE.FrontSide)
  return (
    <group ref={refObj} rotation={[0, 0, rotationZ]}>
      <mesh geometry={geo} position={[-W / 2, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={fm} castShadow />
      <mesh geometry={geo} position={[-W / 2, -0.012, 0]} rotation={[Math.PI / 2, 0, 0]} material={bm} />
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

/** דף מתהפך — אנימציית דפדוף בקשת טבעית מעל הספר (דרך מאונך), עם סלסול */
function FlippingLeaf({ active, fromSign, frontUrl, backUrl, W, H, tilt, onHalf, onDone }) {
  const ref = useRef()
  const t = useRef(0)
  const half = useRef(false)
  const f = useImageTexture(frontUrl)
  const bRaw = useImageTexture(backUrl)
  // הצד האחורי מסתובב 180° יחד עם הדף, ולכן התוכן מופיע מסובב 180°.
  // מסובבים את הטקסטורה ב-180° כדי לבטל זאת — וההדפס מופיע ישר.
  const b = useMemo(() => {
    if (!bRaw) return null
    const c = bRaw.clone()
    c.center.set(0.5, 0.5)
    c.rotation = Math.PI
    c.needsUpdate = true
    return c
  }, [bRaw])
  const geo = usePageGeometry(W, H, W * 0.06)
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
    // קשת המתרוממת דרך מאונך (midpoint תמיד אנכי) אל הצד הנגדי
    const start = fromSign * tilt
    const end = fromSign * (Math.PI - tilt)
    ref.current.rotation.z = start + (end - start) * e
    // הרמה ניכרת של הדף מעל הספר בשיא הקשת
    ref.current.position.y = Math.sin(Math.PI * e) * W * 0.12
    if (!half.current && t.current >= 0.5) {
      half.current = true
      onHalf?.()
    }
    if (t.current >= 1) onDone?.()
  })
  if (!active) return null
  return (
    <group ref={ref}>
      <mesh geometry={geo} position={[(fromSign * W) / 2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={fm} castShadow />
      <mesh geometry={geo} position={[(fromSign * W) / 2, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={bm} />
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
  const board = (settings.coverType === 'hard' ? 0.28 : 0.07) * SCALE
  const overhang = (settings.coverType === 'hard' ? 0.4 : 0.05) * SCALE
  const tilt = ((180 - settings.openAngle) / 2) * (Math.PI / 180)
  const stackT = Math.max(0.02, T / 2 - board)

  const pose = settings.openPose || 'curved'
  const curveAmp = pose === 'flat' ? 0 : W * 0.05 // עקמומיות עדינה
  const offset = settings.startLeft ? 1 : 0

  const g = (i) => pages[i] || null
  const totalSpreads = Math.max(1, Math.ceil((pages.length + offset) / 2))
  const idx = Math.min(spreadIndex, totalSpreads - 1)

  const turning = pose === 'turning'
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
    const sbase = idx * 2 - offset
    const nbase = next * 2 - offset
    // העלה: חזית = הדף שמתרומם (מהמקור), אחור = הדף שייחשף בצד הנחיתה (היעד)
    const front = dir > 0 ? g(sbase + 1) : g(sbase)
    const back = dir > 0 ? g(nbase) : g(nbase + 1)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlip({ fromSign, target: next, front, back })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipReq])

  // עמודים מוצגים. בזמן דפדוף: צד הנחיתה נשאר על המקור (העלה מכסה אותו עד הסוף),
  // והצד הנגדי כבר מציג את היעד — נחשף טבעית מתחת לדף המתרומם.
  const sbase = idx * 2 - offset
  let rightUrl
  let leftUrl
  if (flip) {
    const nbase = flip.target * 2 - offset
    if (flip.fromSign < 0) {
      // התקדמות: הדף השמאלי מתרומם ונוחת מימין
      rightUrl = g(sbase) // נשאר עד הסוף, מתחלף מתחת לעלה הנוחת
      leftUrl = g(nbase + 1) // היעד נחשף משמאל
    } else {
      // אחורה: הדף הימני מתרומם ונוחת משמאל
      leftUrl = g(sbase + 1)
      rightUrl = g(nbase) // היעד נחשף מימין
    }
  } else {
    rightUrl = g(sbase)
    leftUrl = g(sbase + 1)
  }
  const nextLeft = g(sbase + 3)
  const nextRight = g(sbase + 2)

  const common = { W, H, tilt, stackT, board, overhang, coverColor: settings.coverColor, pageColor: settings.pageColor, finish: settings.finish }
  const rootRot = pose === 'standing' ? [-0.55, 0, 0] : [0, 0, 0]

  return (
    <group rotation={rootRot}>
      <group position={[0, settings.floatY + stackT + board, 0]}>
        <SideBlock sign={1} {...common} />
        <SideBlock sign={-1} {...common} />

        <Page url={rightUrl} sign={1} W={W} H={H} tilt={tilt} amp={curveAmp} color={settings.pageColor} />

        {turning && !flip ? (
          <>
            <Page url={nextLeft || leftUrl} sign={-1} W={W} H={H} tilt={tilt} amp={curveAmp} color={settings.pageColor} />
            <Leaf frontUrl={leftUrl} backUrl={nextRight} W={W} H={H} amp={W * 0.12} rotationZ={-tilt + turn} />
          </>
        ) : (
          <Page url={leftUrl} sign={-1} W={W} H={H} tilt={tilt} amp={curveAmp} color={settings.pageColor} />
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
    </group>
  )
}
