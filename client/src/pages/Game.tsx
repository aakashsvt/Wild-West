import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { KeyboardControls, Environment, OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useMemo, useRef, useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { RapierRigidBody } from "@react-three/rapier"
import { PlayerController } from "@/components/PlayerController";
import { Track } from "@/components/Track";
import { Model } from "@/components/Track1";
import { GameHUD } from "@/components/GameHUD";
import { GameOverModal } from "@/components/GameOverModal";
import { useGameStore } from "@/hooks/use-game-store";
import { useLobbyStore } from "@/hooks/use-lobby-store";
import { getSocket, useSocketEvent } from "@/hooks/use-socket";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

// ── Western palette — matches Home and LoadingScreen ─────────────────────────
const W = {
  bg:         "#0a0603",
  borderWarm: "#6b3820",
  borderGold: "#a07030",
  gold:       "#c8922a",
  goldBright: "#d4a853",
  cream:      "#e8d5b0",
  creamMuted: "#b89a72",
} as const;

// ── SceneReadyProbe — renders inside Canvas/Physics, fires onReady after first rendered frame ──
function SceneReadyProbe({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const t = setTimeout(onReady, 150);
      return () => clearTimeout(t);
    });
    return () => cancelAnimationFrame(raf);
  }, [onReady]);
  return null;
}

// ── GameTransitionOverlay — purely visual, zero effect on game logic ──────────
type OverlayPhase = "loading" | "countdown";

function GameTransitionOverlay({
  phase,
  onDone,
}: {
  phase: OverlayPhase;
  onDone: () => void;
}) {
  // Animated dots for loading phase
  const [dots, setDots] = useState(1);
  useEffect(() => {
    if (phase !== "loading") return;
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(id);
  }, [phase]);

  // Countdown: 3 → 2 → 1 → "GO!" then fires onDone
  const [step, setStep] = useState<number | "GO">(3);
  useEffect(() => {
    if (phase !== "countdown") return;
    const timers = [
      setTimeout(() => setStep(2), 1000),
      setTimeout(() => setStep(1), 2000),
      setTimeout(() => setStep("GO"), 3000),
      setTimeout(onDone, 3600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase, onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none overflow-hidden"
      style={{ background: W.bg }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
    >
      {/* Warm radial gradient from top */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 130% 80% at 50% 0%,
            #2d140a 0%, #1a0a04 40%, ${W.bg} 72%)`,
        }}
      />
      {/* Subtle earthy grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            `linear-gradient(to right, rgba(139,90,43,0.10) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(139,90,43,0.10) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Corner vignette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 65% 65% at 50% 50%,
            transparent 20%, rgba(10,6,3,0.82) 100%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 w-full max-w-lg">
        {/* Top ornament */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${W.borderGold})` }} />
          <span className="text-xs tracking-[0.35em] font-mono" style={{ color: W.gold }}>✦</span>
          <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${W.borderGold})` }} />
        </div>

        {/* Title */}
        <h1
          className="font-western text-center leading-tight tracking-wider text-shadow-western"
          style={{ fontSize: "clamp(2.2rem, 6vw, 3.8rem)", color: W.cream }}
        >
          Wild West Rider
        </h1>

        {phase === "loading" ? (
          <>
            <p
              className="text-sm tracking-[0.25em] uppercase font-mono text-center"
              style={{ color: W.creamMuted }}
            >
              {"Mounting up" + ".".repeat(dots)}
            </p>
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="font-western text-4xl"
              style={{ color: W.goldBright }}
            >
              ✦
            </motion.span>
          </>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={String(step)}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="font-western text-center"
              style={{
                fontSize: "clamp(5rem, 18vw, 10rem)",
                color: step === "GO" ? W.cream : W.goldBright,
                textShadow:
                  step === "GO"
                    ? `2px 2px 0 #0a0603, 0 0 60px rgba(232,213,176,0.5)`
                    : `2px 2px 0 #0a0603, 0 0 60px rgba(200,146,42,0.6)`,
                lineHeight: 1,
              }}
            >
              {step}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Bottom ornament */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${W.borderWarm})` }} />
          <span className="text-[10px] tracking-[0.3em] font-mono" style={{ color: W.borderWarm }}>
            ✦ &nbsp; CANYON RACER &nbsp; ✦
          </span>
          <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${W.borderWarm})` }} />
        </div>
      </div>
    </motion.div>
  );
}

// ── MotionBlurShader ──────────────────────────────────────────────────────────
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
  vec2 uv = vUv;

  float dist = distance(uv, vec2(0.5));

  // tighter edge (less area affected)
  float edge = smoothstep(0.3, 0.85, dist);

  vec4 color = vec4(0.0);
  float total = 0.0;

  for (float i = 0.0; i < 20.0; i++) {
    float t = i / 20.0;

    // 🔥 REDUCED stretch (0.6 instead of 1.0)
    vec2 offset = (uv - vec2(0.5)) * t * strength * edge * 0.6;

    color += texture2D(tDiffuse, uv - offset);
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

    // 🚀 get REAL velocity (not projected position)
    const vel = body.linvel()

    // convert world velocity → camera space
    tempVec.current.set(vel.x, vel.y, vel.z)
    tempVec.current.applyQuaternion(camera.quaternion.clone().invert())

    // normalize direction (2D screen direction)
    const dirX = THREE.MathUtils.clamp(tempVec.current.x * 0.02, -1, 1)
    const dirY = THREE.MathUtils.clamp(-tempVec.current.y * 0.02, -1, 1)

    blur.uniforms.direction.value.set(dirX, dirY)

    // 🎯 Asphalt-style intensity curve
    const intensity = THREE.MathUtils.clamp(
      Math.pow(speed, 1.3) * 0.15,
      0.0,
      1.2
    )

    blur.uniforms.strength.value = intensity

    gl.clear()
    comp.render()
  }, 1)

  return null
}

// ── Game ──────────────────────────────────────────────────────────────────────
type GamePhase = "loading" | "countdown" | "done";

export default function Game() {
  const { resetGame } = useGameStore();
  const playerRef = useRef<RapierRigidBody | null>(null)
  const speedRef = useRef(0)

  const { speed, score, timeElapsed, isPlaying, isGameOver } = useGameStore()
  const { setStandings, setRaceResults } = useLobbyStore()

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  // Overlay phase — drives visual only, no effect on game logic
  const [phase, setPhase] = useState<GamePhase>("loading");
  const handleSceneReady = useCallback(() => setPhase("countdown"), []);
  const handleOverlayDone = useCallback(() => setPhase("done"), []);


  // Emit periodic score update while racing
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      getSocket().emit('race:update', { score, timeTaken: timeElapsed });
    }, 5000);
    return () => clearInterval(id);
  }, [isPlaying, score, timeElapsed]);

  // Emit finish signal when game ends
  useEffect(() => {
    if (!isGameOver) return;
    getSocket().emit('race:finish', { score, timeTaken: timeElapsed });
  }, [isGameOver, score, timeElapsed]);

  // Subscribe to server-authoritative standings
  useSocketEvent('race:standings', setStandings);
  useSocketEvent('race:results', setRaceResults);
  const keyboardMap = useMemo(() => [
    { name: "forward", keys: ["ArrowUp", "KeyW"] },
    { name: "backward", keys: ["ArrowDown", "KeyS"] },
    { name: "left", keys: ["ArrowLeft", "KeyA"] },
    { name: "right", keys: ["ArrowRight", "KeyD"] },
    { name: "jump", keys: ["Space"] },
  ], []);

  return (
    <div className="w-full h-screen bg-[#0a0603] overflow-hidden relative">
      <GameHUD />
      <GameOverModal />

      <div className="absolute bottom-5 left-5 z-10">
        <Link
          href="/"
          onClick={resetGame}
          className="font-western text-sm tracking-wider rounded px-4 py-2 transition-colors"
          style={{
            background: "rgba(19,10,4,0.85)",
            border: "1px solid rgba(107,56,32,0.6)",
            color: "rgba(184,154,114,0.8)",
            backdropFilter: "blur(6px)",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#e8d5b0")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(184,154,114,0.8)")}
        >
          ✦ Exit Race
        </Link>
      </div>

      <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ position: [0, 5, 10], fov: 60 }} gl={{
          toneMapping: THREE.LinearToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMappingExposure: 1
        }}>
          <Suspense fallback={null}>
            <Environment files="/models/Cannon_Exterior.hdr" background={true} blur={0} />
            <Physics gravity={[0, -9.81, 0]} debug={false}>
              <PlayerController playerRef={playerRef} />
              <Model />
              <SceneReadyProbe onReady={handleSceneReady} />
            </Physics>
            <MotionBlurEffect speedRef={speedRef} playerRef={playerRef} />
          </Suspense>
        </Canvas>
      </KeyboardControls>

      <AnimatePresence>
        {phase !== "done" && (
          <GameTransitionOverlay phase={phase} onDone={handleOverlayDone} />
        )}
      </AnimatePresence>
    </div>
  );
}
