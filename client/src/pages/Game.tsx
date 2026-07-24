import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { KeyboardControls, Environment, OrbitControls, Stars, Stats } from "@react-three/drei";
import { Suspense, useMemo, useRef, useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

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

// ── HeatHazeShader ────────────────────────────────────────────────────────────
// From gamedemo_vfx_ideas_backlog's parked "heat haze/mirage" idea, added to
// wild-west instead. Two failed-then-fixed attempts at "not a cheap glitch":
//  1. A naive full-screen sine-wave UV distortion reads as a "wavy TV" glitch
//     (the exact risk flagged in that backlog note).
//  2. A first fix masked it to a horizon band and drove distortion off
//     screen-Y with two overlapping sine frequencies — better, but low-order
//     sine waves at that scale are too smooth/coherent: whole horizontal
//     scanlines shift together in a regular, correlated ripple, which reads
//     as a swirly "melting/hallucinating" effect rather than heat shimmer.
// Fixed by swapping the sine wobble for actual 2D value noise (fine-grained,
// varies with both X and Y so it doesn't look like sliding horizontal bands)
// at small amplitude and fast time evolution — closer to the fine, jittery
// shimmer real heat distortion has, rather than a big smooth wave. Distortion
// is still masked to a horizon band only (fades to 0 in the sky and near the
// close-up ground right under the horse) — real heat shimmer is a
// distant-horizon phenomenon, not a full-screen effect.
const HeatHazeShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
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
uniform float time;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 uv = vUv;

  // Narrow soft band centered on the horizon — 0 in the sky, 0 right under
  // the horse, peaks in the distant-ground/horizon zone in between.
  float horizonY = 0.5;
  float bandWidth = 0.16;
  float mask = 1.0 - smoothstep(0.0, bandWidth, abs(uv.y - horizonY));

  // Fine-grained noise sampled at two scales/speeds and blended, so it
  // doesn't repeat in an obviously periodic way. Aspect-corrected x so the
  // noise cells read as roughly square instead of screen-stretched.
  vec2 noiseUv = vec2(uv.x * 2.2, uv.y * 5.0);
  float n1 = valueNoise(noiseUv * 3.0 + vec2(time * 1.6, time * 0.6));
  float n2 = valueNoise(noiseUv * 7.0 - vec2(time * 2.3, time * 1.1));
  float wobble = (n1 * 0.6 + n2 * 0.4) * 2.0 - 1.0; // remap [0,1] -> [-1,1]

  // Mostly horizontal displacement (real heat shimmer is dominated by
  // sideways light-bending through horizontal air layers), tiny vertical
  // component so it doesn't look like a perfectly axis-locked slide.
  vec2 offset = vec2(wobble * 0.0009, wobble * 0.00015) * mask;
  gl_FragColor = texture2D(tDiffuse, uv + offset);
}
`,
};

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
    vec2 offset = (uv - vec2(0.5)) * t * strength * edge * 0.2;

    color += texture2D(tDiffuse, uv - offset);
    total += 1.0;
  }

  gl_FragColor = color / total;
}
`
}

// Color grading — values below are the final look, hand-picked live via a
// Leva tuning panel (see wildwest_color_grading_panel_plan memory) and then
// baked in here as the new defaults.
const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 0.93 },
    saturation: { value: 0.96 },
    contrast: { value: 1.02 },
    gamma: { value: 0.92 },
    temperature: { value: 0.0 },
    tint: { value: 0.0 },
    vignette: { value: 1.0 },
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
uniform float brightness;
uniform float saturation;
uniform float contrast;
uniform float gamma;
uniform float temperature;
uniform float tint;
uniform float vignette;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);

  color.rgb *= brightness;

  // contrast pivots around mid-gray so 1.0 stays a no-op
  color.rgb = (color.rgb - 0.5) * contrast + 0.5;

  // midtone power curve — distinct from contrast/brightness, standard
  // "gamma" grading knob. max() guards pow() against negative input.
  color.rgb = pow(max(color.rgb, 0.0), vec3(1.0 / gamma));

  // temperature: warm (+) boosts red/cuts blue, cool (-) the reverse
  color.rgb += vec3(temperature * 0.15, 0.0, -temperature * 0.15);
  // tint: magenta (+) boosts red+blue/cuts green, green (-) the reverse
  color.rgb += vec3(tint * 0.1, -tint * 0.15, tint * 0.1);

  // luminance-based saturation mix — same Rec.709 weights the rest of the
  // codebase's saturate() work uses (see Track1.tsx's sky bake)
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  color.rgb = mix(vec3(luma), color.rgb, saturation);

  // vignette: darken toward screen edges, 0 = no effect
  float dist = distance(vUv, vec2(0.5));
  float vig = 1.0 - smoothstep(0.35, 0.9, dist) * vignette;
  color.rgb *= vig;

  gl_FragColor = color;
}
`
}

type Props = {
  playerRef: React.MutableRefObject<RapierRigidBody | null>
  isFirstPersonRef: React.MutableRefObject<boolean>
}

export function MotionBlurEffect({ playerRef, isFirstPersonRef }: Props) {
  const { gl, scene, camera, size } = useThree()

  const composer = useRef<EffectComposer | null>(null)
  const blurPass = useRef<ShaderPass | null>(null)
  const heatHazePass = useRef<ShaderPass | null>(null)
  const tempVec = useRef(new THREE.Vector3())

  useEffect(() => {
    const renderPass = new RenderPass(scene, camera)
    // Heat haze runs right after the base render and before bloom, so bloom
    // picks up the already-distorted image — light bending through hot air
    // happens before it reaches the "lens", so this ordering is the more
    // physically coherent one (and avoids dragging bloom highlights sideways
    // in a rubbery way, which distorting an already-bloomed image would do).
    const heatPass = new ShaderPass(HeatHazeShader)
    // Tuned live via the Leva panel (see wildwest_color_grading_panel_plan
    // memory) and baked in as the new defaults.
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.15,
      0.65,
      0.47,
    )
    const shaderPass = new ShaderPass(MotionBlurShader)
    // Grading runs after bloom/motion-blur so it grades the final composited
    // image rather than perturbing bloom's own light-additive math, and
    // right before the output pass that handles final color-space conversion.
    const gradePass = new ShaderPass(ColorGradeShader)
    const outputPass = new OutputPass()

    const comp = new EffectComposer(gl)
    comp.addPass(renderPass)
    comp.addPass(heatPass)
    comp.addPass(bloomPass)
    comp.addPass(shaderPass)
    comp.addPass(gradePass)

    // ✅ THIS FIXES COLOR
    comp.addPass(outputPass)

    comp.setSize(size.width, size.height)

    composer.current = comp
    blurPass.current = shaderPass
    heatHazePass.current = heatPass

    gl.autoClear = false

    return () => comp.dispose()
  }, [gl, scene, camera, size])

  useFrame((state) => {
    const comp = composer.current
    const blur = blurPass.current
    const heat = heatHazePass.current
    const body = playerRef.current

    if (heat) heat.uniforms.time.value = state.clock.elapsedTime

    if (!comp || !blur || !body) return

    // 🚀 get REAL velocity (not projected position)
    const vel = body.linvel()

    // convert world velocity → camera space
    tempVec.current.set(vel.x, vel.y, vel.z)
    tempVec.current.applyQuaternion(camera.quaternion.clone().invert())

    // normalize direction (2D screen direction)
    const dirX = THREE.MathUtils.clamp(tempVec.current.x * 0.02, -1, 1)
    const dirY = THREE.MathUtils.clamp(-tempVec.current.y * 0.02, -1, 1)

    blur.uniforms.direction.value.set(dirX, dirY)

    // Intensity gated to the RUN range only — it used to ramp off the
    // store's display speed (raw velocity * 1.5), which is already ~9-22 at
    // a normal walk, so the shader's edge samples were visibly blurring
    // during walk. RUN_BLUR_START matches the RUN animation's own threshold
    // (PlayerController.tsx, currentSpeed > 15) and RUN_BLUR_MAX matches the
    // observed near-full-gallop speed used for the FP FOV curve
    // (FP_FOV_RUN_MAX_SPEED) — so blur is 0 at idle/walk and ramps in only
    // once actually running.
    const rawSpeed = Math.hypot(vel.x, vel.z)
    const RUN_BLUR_START = 15
    const RUN_BLUR_MAX = 45
    let intensity = THREE.MathUtils.clamp(
      (rawSpeed - RUN_BLUR_START) / (RUN_BLUR_MAX - RUN_BLUR_START),
      0,
      1
    )

    // This shader averages 20 *discrete* radial samples rather than a true
    // continuous blur — fine at third-person scale, but in first-person the
    // horse's head/neck is a large, high-contrast dark silhouette sitting
    // right in the blurred screen-edge region, and at the wider FP FOV the
    // same pixel-space sample spacing covers more visually "busy" content.
    // That combination makes the discrete samples visible as separated
    // ghost layers instead of blending smoothly — reported as looking like
    // "3D without glasses" / color layers. Confirmed via an A/B test against
    // GameDemo (which has no motion blur pass at all and doesn't show the
    // issue in first-person) that motion blur is the actual cause, not
    // bloom (both builds have bloom). A 20% cut still showed the artifact,
    // so first-person disables blur entirely instead, matching GameDemo.
    if (isFirstPersonRef.current) {
      intensity = 0
    }

    blur.uniforms.strength.value = intensity

    gl.clear()
    comp.render()
  }, 1)

  return null
}

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
            <MotionBlurEffect playerRef={playerRef} isFirstPersonRef={isFirstPersonRef} />
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
