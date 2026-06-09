import { useMemo } from 'react'
import * as THREE from 'three'
import { useImageTexture, makePageEdgeTexture } from '../lib/textures'
import { FINISHES } from '../lib/presets'
import { SCALE, computeThicknessCm } from '../lib/dimensions'

function darken(hex, amount = 0.4) {
  const c = new THREE.Color(hex)
  c.multiplyScalar(1 - amount)
  return c
}

function useCoverMaterials({ frontTex, backTex, spineTex, coverColor, spineColor, finish }) {
  const f = FINISHES.find((x) => x.id === finish) || FINISHES[0]

  const make = (map, color) =>
    new THREE.MeshPhysicalMaterial({
      map: map || null,
      color: map ? '#ffffff' : color,
      roughness: f.roughness,
      metalness: f.metalness,
      clearcoat: f.clearcoat,
      clearcoatRoughness: 0.4,
    })

  return useMemo(() => {
    const edge = new THREE.MeshPhysicalMaterial({
      color: darken(coverColor, 0.45),
      roughness: f.roughness,
      metalness: f.metalness,
      clearcoat: f.clearcoat * 0.5,
    })
    const front = make(frontTex, coverColor)
    const back = make(backTex, coverColor)
    const spine = make(spineTex, spineColor)
    // סדר פאות BoxGeometry: 0:+X 1:-X 2:+Y 3:-Y 4:+Z 5:-Z
    return {
      front: [edge, edge, edge, edge, front, edge.clone()],
      back: [edge.clone(), edge.clone(), edge.clone(), edge.clone(), edge.clone(), back],
      spine: [spine, edge.clone(), edge.clone(), edge.clone(), edge.clone(), edge.clone()],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontTex, backTex, spineTex, coverColor, spineColor, finish])
}

/**
 * ספר סגור תלת-ממדי. RTL — השדרה בצד ימין (+X), הפתיחה בצד שמאל.
 */
export default function Book3D({ settings, frontUrl, backUrl, spineUrl }) {
  const frontTex = useImageTexture(frontUrl)
  const backTex = useImageTexture(backUrl)
  const spineTex = useImageTexture(settings.spineUseCover ? null : spineUrl)

  const pageEdge = useMemo(
    () => makePageEdgeTexture(settings.pageColor, 'vertical'),
    [settings.pageColor],
  )
  const pageEdgeH = useMemo(
    () => makePageEdgeTexture(settings.pageColor, 'horizontal'),
    [settings.pageColor],
  )

  const dims = useMemo(() => {
    const W = settings.width * SCALE
    const H = settings.height * SCALE
    const T = computeThicknessCm(settings) * SCALE
    const board = (settings.coverType === 'hard' ? 0.28 : 0.07) * SCALE
    const overhang = (settings.coverType === 'hard' ? 0.4 : 0.04) * SCALE
    return {
      W, H, T, board, overhang,
      pagesW: W - overhang * 2,
      pagesH: H - overhang * 2,
      pagesT: Math.max(0.01, T - board * 2),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.width, settings.height, settings.pageCount, settings.thicknessScale, settings.coverType])

  const mats = useCoverMaterials({
    frontTex,
    backTex,
    spineTex,
    coverColor: settings.coverColor,
    spineColor: settings.spineUseCover ? settings.coverColor : settings.spineColor,
    finish: settings.finish,
  })

  const pagesMat = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ map: pageEdge, roughness: 0.95 })
    const sideH = new THREE.MeshStandardMaterial({ map: pageEdgeH, roughness: 0.95 })
    const plain = new THREE.MeshStandardMaterial({ color: settings.pageColor, roughness: 0.95 })
    // 0:+X(שדרה-מוסתר) 1:-X(חזית הדפים) 2:+Y(עליון) 3:-Y(תחתון) 4:+Z 5:-Z
    return [plain, side, sideH, sideH, plain, plain]
  }, [pageEdge, pageEdgeH, settings.pageColor])

  const { W, H, T, board, pagesW, pagesH, pagesT } = dims

  return (
    <group position={[0, settings.floatY, 0]} castShadow>
      {/* גוש הדפים */}
      <mesh material={pagesMat} castShadow receiveShadow>
        <boxGeometry args={[pagesW, pagesH, pagesT]} />
      </mesh>

      {/* כריכה קדמית */}
      <mesh position={[0, 0, T / 2 - board / 2]} material={mats.front} castShadow receiveShadow>
        <boxGeometry args={[W, H, board]} />
      </mesh>

      {/* כריכה אחורית */}
      <mesh position={[0, 0, -T / 2 + board / 2]} material={mats.back} castShadow receiveShadow>
        <boxGeometry args={[W, H, board]} />
      </mesh>

      {/* שדרה — בצד ימין (+X) עבור ספר עברי */}
      <mesh position={[W / 2 - board / 2, 0, 0]} material={mats.spine} castShadow receiveShadow>
        <boxGeometry args={[board, H, T]} />
      </mesh>

      {/* הבלטת קצה הכריכה הקשה בצד הפתיחה (overhang) */}
      {settings.coverType === 'hard' && (
        <mesh position={[-W / 2 + board / 2, 0, 0]} material={mats.front[0]}>
          <boxGeometry args={[board, H, T]} />
        </mesh>
      )}
    </group>
  )
}
