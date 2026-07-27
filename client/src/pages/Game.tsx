import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { KeyboardControls, Environment, OrbitControls, Stars, Stats } from "@react-three/drei";
import { Suspense, useMemo, useRef, useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useControls } from "leva";

import type { RapierRigidBody } from "@react-three/rapier"
import { PlayerController } from "@/components/player/PlayerController";
import { RemotePlayers } from "@/components/RemotePlayers";
import { SunLight } from "@/components/SunLight";
import { Model } from "@/components/Track1";
import { GameHUD } from "@/components/GameHUD";
import { TouchControls } from "@/components/TouchControls";
import { GameOverModal } from "@/components/GameOverModal";
import { useGameStore } from "@/hooks/use-game-store";
import { useLobbyStore } from "@/hooks/use-lobby-store";
import { getSocket, useSocketEvent } from "@/hooks/use-socket";
import { Loader2 } from "lucide-react";
import { Link, Redirect } from "wouter";
import { PostProcessingPipeline } from "@/components/PostProcessingPipeline";
import { DamageOverlay } from "@/components/DamageOverlay";

// ── Western palette — matches Home and LoadingScreen ─────────────────────────
const W = {
  bg: "#0a0603",
  borderWarm: "#6b3820",
  borderGold: "#a07030",
  gold: "#c8922a",
  goldBright: "#d4a853",
  cream: "#e8d5b0",
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
    // TEMP: shortened for faster dev iteration — revert to 1000/2000/3000/3600 before real testing
    const timers = [
      setTimeout(() => setStep(2), 150),
      setTimeout(() => setStep(1), 300),
      setTimeout(() => setStep("GO"), 450),
      setTimeout(onDone, 600),
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

// ── Shaders and Post-Processing moved to @/components/PostProcessingPipeline.tsx ──

// Fog — finalized via a live Leva panel (see wildwest_fog_slider_panel_plan
// memory), now baked in as a plain constant.
//
// FOG1 (original, preserved for reference/rollback): near 400 / far 2200 /
// color #dcdeea — see wildwest_fog_implemented memory (color pixel-sampled
// from this scene's horizon-haze band, near/far widened from an initial
// 80/900 guess that fogged things too close).
//
// Current (final): far pulled in from 2200 to 1350, tighter/closer fog
// falloff. near/color unchanged from FOG1.
function FogController() {
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.Fog(new THREE.Color('#dcdeea'), 400, 1350)
    return () => {
      scene.fog = null
    }
  }, [scene])

  return null
}

// ── Game ──────────────────────────────────────────────────────────────────────
type GamePhase = "loading" | "countdown" | "done";

export default function Game() {
  const { resetGame } = useGameStore();
  const playerRef = useRef<RapierRigidBody | null>(null)
  const isFirstPersonRef = useRef(false)

  const { enableOrbitControls } = useControls("Debug", {
    enableOrbitControls: false
  });

  const { score, timeElapsed, isPlaying, isGameOver } = useGameStore()
  const { roomId, setLobbyState, setStandings, setRaceResults, resetLobby } = useLobbyStore()

  if (!roomId) return <Redirect to="/lobby" />;

  // Notify server when this player leaves the game page so other clients
  // receive a lobby:state update and remove this player immediately.
  useEffect(() => {
    return () => {
      getSocket().emit('lobby:leave');
      resetLobby();
    };
  }, [resetLobby]);

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
  useSocketEvent('lobby:state', setLobbyState);
  useSocketEvent('race:standings', setStandings);
  useSocketEvent('race:results', setRaceResults);
  const keyboardMap = useMemo(() => [
    { name: "forward", keys: ["ArrowUp", "KeyW"] },
    { name: "backward", keys: ["ArrowDown", "KeyS"] },
    { name: "left", keys: ["ArrowLeft", "KeyA"] },
    { name: "right", keys: ["ArrowRight", "KeyD"] },
    { name: "jump", keys: ["Space"] },
    { name: "kickLeft", keys: ["KeyQ"] },
    { name: "kickRight", keys: ["KeyE"] },
    { name: "toggleView", keys: ["KeyV"] },
    { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
    { name: "boost", keys: ["KeyX"] },
    { name: "toggleLookPitch", keys: ["KeyL"] },
  ], []);

  return (
    <div className="w-full h-screen bg-[#0a0603] overflow-hidden relative">
      <DamageOverlay />
      <GameHUD />
      <GameOverModal />
      <TouchControls />

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
        <Canvas shadows camera={{ position: [0, 5, 10], fov: 60, near: 0.05 }} gl={{
          toneMapping: THREE.LinearToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMappingExposure: 1
        }}>
          {enableOrbitControls && <OrbitControls />}
          <Stats />
          {/* Second stats.js panel pinned to the MB (JS heap) readout, so
              RAM is always visible instead of only reachable by clicking
              to cycle the panel above. */}
          <Stats showPanel={2} className="mem-stats" />
          <FogController />
          <Suspense fallback={null}>
            <Environment files="/models/Cannon_Exterior.hdr" background={true} blur={0} />
            <Physics gravity={[0, -300, 0]} debug={false}>
              <SunLight playerRef={playerRef} />
              <PlayerController playerRef={playerRef} isFirstPersonRef={isFirstPersonRef} />
              <RemotePlayers />
              <Model />
              <SceneReadyProbe onReady={handleSceneReady} />
            </Physics>
            <PostProcessingPipeline playerRef={playerRef} isFirstPersonRef={isFirstPersonRef} />
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
