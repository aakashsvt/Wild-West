import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useRef, useEffect } from "react";
import type { RapierRigidBody } from "@react-three/rapier";
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { useControls } from 'leva';

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
    chromaticAberration: { value: 0.0 },
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
uniform float chromaticAberration;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);

  // CHROMATIC ABERRATION (RGB SPLIT)
  if (chromaticAberration > 0.0) {
    vec2 dir = vUv - vec2(0.5); // Push channels outward from center
    color.r = texture2D(tDiffuse, vUv - dir * chromaticAberration).r;
    color.b = texture2D(tDiffuse, vUv + dir * chromaticAberration).b;
  }

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

export function PostProcessingPipeline({ playerRef, isFirstPersonRef }: Props) {
  const { gl, scene, camera, size } = useThree()

  const { crashEffectMode } = useControls("Crash Effects (Debug)", {
    crashEffectMode: {
      label: "Active Effect",
      options: {
        "Both (1 & 2)": "both",
        "1. Glitch Only": "glitch",
        "2. Drain Only": "drain",
        "None": "none"
      }
    }
  })

  const composer = useRef<EffectComposer | null>(null)
  const blurPass = useRef<ShaderPass | null>(null)
  const heatHazePass = useRef<ShaderPass | null>(null)
  const colorGradePass = useRef<ShaderPass | null>(null)
  const tempVec = useRef(new THREE.Vector3())
  const chromaticIntensity = useRef(0)
  const currentSaturation = useRef(0.96) // Base western look saturation

  // Sync with the same thresholds used in usePlayerImpacts.ts
  const { minorSpeed, majorSpeed } = useControls("Impact Thresholds & Time Dilation", {
    minorSpeed: { value: 20, min: 1, max: 100, step: 1 },
    majorSpeed: { value: 45, min: 1, max: 200, step: 1 },
    hitStopMajorMs: { value: 250, min: 0, max: 1000, step: 10 },
    hitStopMediumMs: { value: 100, min: 0, max: 1000, step: 10 },
  });

  const minSpeedRef = useRef(minorSpeed);
  const majSpeedRef = useRef(majorSpeed);
  minSpeedRef.current = minorSpeed;
  majSpeedRef.current = majorSpeed;

  // Listen for physical impacts to trigger the post-processing glitch and color drain
  useEffect(() => {
    const onHazard = (e: any) => {
      const { impactVelocity: vel, impactAngle } = e.detail;
      
      if (impactAngle === "hurdle") {
        // Absolutely NO post-processing effects for hurdles (no RGB shift, no black screen)
        // Hurdles only trigger physical camera shake via usePlayerImpacts.ts
        return;
      }

      if (
        impactAngle === "sensor-left" || 
        impactAngle === "sensor-right" || 
        impactAngle === "sensor-rear" || 
        impactAngle === "sensor-rear-left" || 
        impactAngle === "sensor-rear-right" ||
        impactAngle === "side-swipe" || 
        impactAngle === "rear-end"
      ) {
        chromaticIntensity.current = 0.03; // Tiny micro-glitch
        // No color drain on a side-swipe, rear hit, or hurdle crash
        return;
      }
      
      // Head-on or diagonal-front collisions get the massive effect
      if (vel >= majSpeedRef.current) {
        chromaticIntensity.current = 0.10; // Subtle peak
        currentSaturation.current = 0.15; // Massive color drain (almost black & white)
      } else if (vel >= minSpeedRef.current) {
        chromaticIntensity.current = 0.04; // Very light peak
        currentSaturation.current = 0.50; // Moderate color drain
      }
    };
    window.addEventListener("hazard-impact", onHazard);
    return () => window.removeEventListener("hazard-impact", onHazard);
  }, []);

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
    colorGradePass.current = gradePass

    gl.autoClear = false

    return () => comp.dispose()
  }, [gl, scene, camera, size])

  useFrame((state, delta) => {
    // Prevent huge jumps when tabbing back in (cap delta to 100ms)
    const dt = Math.min(delta, 0.1)

    const comp = composer.current
    const blur = blurPass.current
    const heat = heatHazePass.current
    const grade = colorGradePass.current
    const body = playerRef.current

    if (grade) {
      // 1. Decay the chromatic glitch extremely slowly over time
      if (chromaticIntensity.current > 0) {
        chromaticIntensity.current = Math.max(0, chromaticIntensity.current - dt * 0.035); // Super slow fade
      }
      // Only apply to shader if enabled in Leva
      grade.uniforms.chromaticAberration.value = 
        (crashEffectMode === "both" || crashEffectMode === "glitch") ? chromaticIntensity.current : 0;

      // 2. Slowly bleed color (saturation) back into the world
      if (currentSaturation.current < 0.96) {
        // Lerp moves 40% of the remaining distance per second (takes ~4-5s to visually recover)
        // Cap lerp factor at 1.0 to guarantee we never overshoot
        currentSaturation.current = THREE.MathUtils.lerp(currentSaturation.current, 0.96, Math.min(dt * 0.4, 1.0)); 
      }
      // Only apply to shader if enabled in Leva
      grade.uniforms.saturation.value = 
        (crashEffectMode === "both" || crashEffectMode === "drain") ? currentSaturation.current : 0.96;
    }

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
