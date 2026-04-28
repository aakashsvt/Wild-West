import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { KeyboardControls, Environment, OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useMemo, useRef, useEffect } from "react";


import type { RapierRigidBody } from "@react-three/rapier"
import { PlayerController } from "@/components/PlayerController";
import { Track } from "@/components/Track";
import { Model } from "@/components/Track1";
import { GameHUD } from "@/components/GameHUD";
import { GameOverModal } from "@/components/GameOverModal";
import { useGameStore } from "@/hooks/use-game-store";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

const MotionBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    direction: { value: new THREE.Vector2(0, 0) },
    strength: { value: 0.0 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 direction;
    uniform float strength;
    varying vec2 vUv;

    void main() {
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(vUv, center);

      // keep center sharp (horse area)
      float mask = smoothstep(0.25, 0.6, dist);

      vec4 color = vec4(0.0);
      float total = 0.0;

      for (float i = -8.0; i <= 8.0; i++) {
        float percent = i / 8.0;
        vec2 offset = direction * percent * strength * mask;
        color += texture2D(tDiffuse, vUv + offset);
        total += 1.0;
      }

      gl_FragColor = color / total;
    }
  `
}

type Props = {
  speedRef: React.MutableRefObject<number>
  playerRef: React.MutableRefObject<RapierRigidBody | null>
}


export function MotionBlurEffect({ speedRef, playerRef }: Props) {
  const { gl, scene, camera, size } = useThree()

  const composer = useRef<EffectComposer | null>(null)
  const blurPass = useRef<ShaderPass | null>(null)
  const tempVec = useRef(new THREE.Vector3())

  useEffect(() => {
    const renderPass = new RenderPass(scene, camera)
    const shaderPass = new ShaderPass(MotionBlurShader)
    const outputPass = new OutputPass()

    const comp = new EffectComposer(gl)
    comp.addPass(renderPass)
    comp.addPass(shaderPass)

    // ✅ THIS FIXES COLOR
    comp.addPass(outputPass)

    comp.setSize(size.width, size.height)

    composer.current = comp
    blurPass.current = shaderPass

    gl.autoClear = false

    return () => comp.dispose()
  }, [gl, scene, camera, size])

  useFrame(() => {
    const comp = composer.current
    const blur = blurPass.current
    const body = playerRef.current

    if (!comp || !blur || !body) return

    const speed = speedRef.current || 0

    // 🐎 get horse position
    const pos = body.translation()
    tempVec.current.set(pos.x, pos.y, pos.z)

    // convert to screen space (-1 to 1)
    tempVec.current.project(camera)

    // direction toward horse
    const dirX = tempVec.current.x * 0.03
    const dirY = tempVec.current.y * 0.03

    blur.uniforms.direction.value.set(dirX, dirY)

    // speed-based intensity
    blur.uniforms.strength.value = THREE.MathUtils.clamp(speed * 0.4, 0.2, 1.0)

    gl.clear()
    comp.render()
  }, 1)

  return null
}

export default function Game() {
  const { resetGame } = useGameStore();
  const playerRef = useRef<RapierRigidBody | null>(null)
  const speedRef = useRef(0)

  const { speed } = useGameStore()

  useEffect(() => {
    speedRef.current = speed
  }, [speed])
  const keyboardMap = useMemo(() => [
    { name: "forward", keys: ["ArrowUp", "KeyW"] },
    { name: "backward", keys: ["ArrowDown", "KeyS"] },
    { name: "left", keys: ["ArrowLeft", "KeyA"] },
    { name: "right", keys: ["ArrowRight", "KeyD"] },
    { name: "jump", keys: ["Space"] },
  ], []);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      <GameHUD />
      <GameOverModal />

      <div className="absolute top-4 left-4 z-10">
        <Link href="/" className="px-4 py-2 bg-black/50 text-white/50 hover:text-white rounded-lg border border-white/10 backdrop-blur transition-colors text-sm uppercase font-bold tracking-wider" onClick={resetGame}>
          Exit Race
        </Link>
      </div>

      <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ position: [0, 5, 10], fov: 60 }} gl={{
          toneMapping: THREE.LinearToneMapping,   // ✅ Linear mapping
          outputColorSpace: THREE.SRGBColorSpace,
          toneMappingExposure: 1
        }}>
          <Suspense fallback={null}>
            <Environment files="/models/Cannon_Exterior.hdr" background={true} blur={0}
            />
            {/* <ambientLight intensity={1} />


            <directionalLight
              position={[10, 70, 10]}
              intensity={1}
              castShadow
              shadow-mapSize={[2048, 2048]}
            >
              <orthographicCamera attach="shadow-camera" args={[-50, 50, -50, 50, 0.1, 100]} />
            </directionalLight> */}
            {/* 
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} /> */}

            <Physics gravity={[0, -9.81, 0]} debug={false}>
              <PlayerController playerRef={playerRef} />
              <Model />
            </Physics>

            <MotionBlurEffect speedRef={speedRef} playerRef={playerRef} />
          </Suspense>
        </Canvas>
      </KeyboardControls>

      {/* Loading Overlay */}
      <Suspense fallback={
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <div className="text-white font-display text-xl animate-pulse">Loading Track Data...</div>
        </div>
      }>
        <></>
      </Suspense>
    </div>
  );
}
