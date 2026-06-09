/* eslint-disable react-hooks/immutability */
import { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import Book3D from './Book3D'
import OpenBook3D from './OpenBook3D'
import { makeGradientTexture } from '../lib/textures'
import { CAMERA_PRESETS } from '../lib/presets'

/** מגדיר את רקע הסצנה לפי ההגדרות (כולל בייצוא תמונה) */
function Background({ settings }) {
  const { scene, gl } = useThree()
  useEffect(() => {
    let tex = null
    if (settings.bgType === 'transparent') {
      scene.background = null
      gl.setClearColor(0x000000, 0)
    } else if (settings.bgType === 'solid') {
      gl.setClearColor(0xffffff, 1)
      scene.background = new THREE.Color(settings.bgColor)
    } else {
      gl.setClearColor(0xffffff, 1)
      tex = makeGradientTexture(settings.bgTop, settings.bgBottom)
      scene.background = tex
    }
    return () => tex?.dispose()
  }, [scene, gl, settings.bgType, settings.bgColor, settings.bgTop, settings.bgBottom])
  return null
}

/** ממקם את המצלמה לפי הפריסט הנבחר */
function CameraRig({ cameraId, controls }) {
  const { camera } = useThree()
  useEffect(() => {
    const p = CAMERA_PRESETS.find((c) => c.id === cameraId) || CAMERA_PRESETS[0]
    camera.position.set(...p.pos)
    camera.lookAt(0, 0, 0)
    if (controls.current) {
      controls.current.target.set(0, 0, 0)
      controls.current.update()
    }
  }, [cameraId, camera, controls])
  return null
}

/** רושם את ה-gl לצורך ייצוא תמונה */
function CaptureBridge({ glRef }) {
  const { gl } = useThree()
  useEffect(() => {
    glRef.current = gl
  }, [gl, glRef])
  return null
}

export default function Stage({ settings, assets, spreadIndex, setSpreadIndex, flipReq, glRef }) {
  const controls = useRef()
  const transparent = settings.bgType === 'transparent'

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      camera={{ fov: 35, position: [4.2, 1.6, 5.2], near: 0.1, far: 100 }}
    >
      <CaptureBridge glRef={glRef} />
      <Background settings={settings} />
      <CameraRig cameraId={settings.cameraId} controls={controls} />

      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#ffffff', '#9aa3b2', 0.6]} />
      <directionalLight
        position={[4, 8, 6]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-6, 4, -3]} intensity={0.55} />
      <directionalLight position={[0, 2, 8]} intensity={0.4} />

      {settings.mode === 'closed' ? (
        <Book3D
          settings={settings}
          frontUrl={assets.front}
          backUrl={assets.back}
          spineUrl={assets.spine}
        />
      ) : (
        <OpenBook3D
          settings={settings}
          pages={assets.pages}
          spreadIndex={spreadIndex}
          setSpreadIndex={setSpreadIndex}
          flipReq={flipReq}
        />
      )}

      {settings.shadow && !transparent && (
        <ContactShadows
          position={[
            0,
            settings.mode === 'closed' ? -(settings.height * 0.13) / 2 - 0.05 : -0.02,
            0,
          ]}
          opacity={0.45}
          scale={12}
          blur={2.4}
          far={6}
          resolution={1024}
        />
      )}

      <OrbitControls
        ref={controls}
        enablePan={false}
        minDistance={2}
        maxDistance={16}
        autoRotate={settings.autoRotate}
        autoRotateSpeed={1.2}
        enableDamping
      />
    </Canvas>
  )
}
