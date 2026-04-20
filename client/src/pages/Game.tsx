import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { KeyboardControls, Environment, OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { PlayerController } from "@/components/PlayerController";
import { Track } from "@/components/Track";
import { Model } from "@/components/Track1";
import { GameHUD } from "@/components/GameHUD";
import { GameOverModal } from "@/components/GameOverModal";
import { useGameStore } from "@/hooks/use-game-store";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function Game() {
  const { resetGame } = useGameStore();

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
              <PlayerController />
              <Model />
            </Physics>

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
