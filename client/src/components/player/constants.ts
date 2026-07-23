import * as THREE from 'three';
import { Vector3 } from 'three';

// const PLAYER_START_POSITION: [number, number, number] = [-340, 5.5787, 410];

// x/z match GameDemo's spawn point exactly (main.js: player.position.set(412.4, 0, 15.3) —
// see gamedemo_spawn_location_fix memory); y stays high so Rapier's fall+collision settles
// it onto the terrain, since wild-west has no manual snapToGround raycast like GameDemo does.
export const PLAYER_START_POSITION: [number, number, number] = [412.4, 150, 15.3];

export const MAX_SPEED = 286;
// W alone target speed (walk) — no Shift held. The velocity-lerp push each
// frame is proportional to this target (`velocity.lerp(targetVelocity, 0.2)`
// below), so a too-low target (originally 12, picked from the animation
// thresholds without empirical testing) produces too weak a push to
// reliably build speed against this RigidBody's friction/damping — see
// wildwest_walk_run_shift_plan memory for the debug-logged trace that
// caught this. 60 is a moderate push that builds real, sustained walking
// speed. Shift+W still targets MAX_SPEED exactly as before.
export const WALK_TARGET_SPEED = 60;
export const TURN_SPEED = 2;
export const BRAKE_FORCE = 5;
// RUN_BOOST — held button (X), not a timed burst: while held + moving
// forward, target speed is boosted and the RUN_BOOST clip plays on loop via
// the normal playAnimation crossfade (default LoopRepeat, same as every
// other base clip) for exactly as long as the key is held, so animation and
// speed always stay in sync. Releasing X crossfades straight back to
// RUN/WALK. Tune live.
export const BOOST_SPEED_MULTIPLIER = 1.5;
// WALK2RUN — plays once when transitioning from WALK into RUN (Shift
// pressed while already walking forward), then hands off to the regular RUN
// loop. Driven by a plain elapsed-time check against the clip's own real
// duration (733ms, confirmed from the source GLB) rather than relying on
// AnimationMixer's "finished" event/LoopOnce timing — the same class of bug
// that broke RUN_BOOST (animation state decoupled from what should drive
// it) is avoided by tying the cutover to one directly-computed condition.
export const WALK2RUN_DURATION_MS = 733;
// The mechanical timing is correct (see memory), but a full 0.2s crossfade
// blending WALK's arbitrary loop phase against WALK2RUN's fixed start pose
// reads as mushy/unnatural — WALK2RUN is itself an authored "picking up
// speed" clip, not a loop, so it doesn't need much blend-in to already look
// like a deliberate motion. Snappier entry than the default 0.2s used
// everywhere else; the WALK2RUN->RUN handoff at the end keeps the normal
// 0.2s since that's a real loop-to-loop crossfade. Tune live.
export const WALK2RUN_ENTER_FADE = 0.08;
// Procedural "weight" layered on top of the baked WALK2RUN clip, same
// technique as WALK_LEAN_ANGLE (turn bank) and JUMP_CAMERA_BOB (jump dip)
// below — the clip itself reads as stiff, so this adds a forward body-pitch
// that surges in then eases back out over the transition, like leaning into
// the acceleration. Peaks at the midpoint (sine bump: 0 at start, full
// WALK2RUN_LEAN_ANGLE at 50%, back to 0 exactly as RUN takes over).
export const WALK2RUN_LEAN_ANGLE = THREE.MathUtils.degToRad(7);
export const WALK2RUN_LEAN_SMOOTH_SPEED = 10;
// Baked TURN_LEFT/TURN_RIGHT clip looked wrong for continuous in-motion
// steering while walking (it reads better for a sharp turn-in-place, which
// is why it's kept for that case below) — WALK now keeps playing during a
// walking turn, and this procedurally banks the visual model into the turn
// instead, via a wrapping <group ref={leanGroupRef}> around Model11.
export const WALK_LEAN_ANGLE = THREE.MathUtils.degToRad(3);
export const WALK_LEAN_SMOOTH_SPEED = 6; // per-second lerp rate toward the target lean
// Horse's own head tilts more than the whole-body lean above, for a
// clearer "looking into the turn" read. Applied to the actual horse head
// bone (Model11's horseHeadBone) — a previous attempt at this accidentally
// grabbed the cowboy's head bone instead, see HeadTilt component below.
export const HORSE_HEAD_LEAN_ANGLE = THREE.MathUtils.degToRad(12);
export const HORSE_HEAD_LEAN_SMOOTH_SPEED = 8;
// Matches GameDemo's spawn facing (main.js: player.rotation.y = Math.PI).
export const PLAYER_START_ROTATION_Y = Math.PI;
// Camera follow — ported verbatim from GameDemo's tuned values (main.js:484-488).
// GameDemo switches offset on a Shift/run key; wild-west has no separate
// walk/run key, so currentSpeed vs. MAX_SPEED stands in for "is running".
export const CAM_OFFSET = new Vector3(0, 10.12, -12.3);
export const CAM_OFFSET_RUN = new Vector3(0, 10.8, -14.6);
export const CAM_LOOK_OFFSET = new Vector3(0, 8.8, 0);
// CAM_OFFSET/CAM_OFFSET_RUN were tuned against GameDemo's fixed camera FOV
// (main.js: `new THREE.PerspectiveCamera(60, ...)`), so framing is only
// correct at FOV 60 — narrower FOV keeps the camera at the same fixed
// distance while the cone shrinks, so the rider "zooms in" and crops out of
// frame (reported below FOV ~57-60). Pulling the camera further back (x/z
// only, height untouched) as FOV narrows compensates without the vertical
// bob a full (x/y/z) dolly caused when tried first.
export const CAM_OFFSET_REFERENCE_FOV = 60;
// First-person — raised above CAM_LOOK_OFFSET.y (which is roughly chest
// height, the third-person look-AT target) for true rider eye level, sitting
// upright on the saddle above the horse's head. Nudged forward so the camera
// sits in front of the head/hat mesh instead of inside it. Height and FOV
// are live-tunable via the "First Person" Leva panel below — these are just
// the starting defaults.
export const FIRST_PERSON_HEIGHT_DEFAULT = 9.0;
export const FIRST_PERSON_FORWARD = 1.0;
export const FIRST_PERSON_LOOK_DISTANCE = 40;
// Mouse look, first-person only — a head-turn independent of steering
// (WASD still controls where the horse actually travels). Yaws just the
// look-at target, not fpPos itself, so the camera stays anchored to the
// horse's position and only the view direction swivels, like turning your
// head while riding. Radians per pixel of mouse movementX/Y.
export const MOUSE_LOOK_SENSITIVITY = 0.0012;
// Yaw: 90° each way = 180° total left-right, as requested. Pitch is kept
// noticeably tighter than yaw — a head can turn further sideways than it
// can tip up/down before it stops looking natural.
export const MOUSE_LOOK_YAW_LIMIT = THREE.MathUtils.degToRad(90);
export const MOUSE_LOOK_PITCH_LIMIT = THREE.MathUtils.degToRad(12);
// Third person FOV now switches with the same isRunning threshold as
// CAM_OFFSET/CAM_OFFSET_RUN below, rather than being a fixed manual value.
// TP_FOV_RUN matches CAM_OFFSET_REFERENCE_FOV exactly (both 60) so the dolly
// compensation is a no-op while running — only the walk FOV needs pull-back.
export const TP_FOV_WALK = 45;
export const TP_FOV_RUN = 55;
// Speed-based FOV curve, first-person only — 80 at idle/walk, gradually
// widening to 90 as speed climbs through the run range. Thresholds match
// the WALK/RUN animation cutoffs just above (currentSpeed 6/15), not
// MAX_SPEED (286) — MAX_SPEED is a lerp target real gameplay rarely gets
// close to, which is what made the earlier camera-bob attempt look broken
// (see wildwest_camera_bob_reverted memory). FP_FOV_RUN_MAX_SPEED is an
// observed near-full-gallop speed instead, so the curve actually reaches
// its top end during normal play.
export const FP_FOV_RUN_START_SPEED = 15;
export const FP_FOV_RUN_MAX_SPEED = 45;
export const FP_FOV_IDLE = 80;
export const FP_FOV_RUN = 90;
// Jump is cosmetic-only (no rigidbody displacement, see
// wildwest_jump_physics_failed memory — real jump physics were tried and
// rejected three times). The FP camera is otherwise anchored purely to the
// rigidbody, so it never moved while the JUMP clip visually raised the
// mesh, making the horse appear to clip into the camera. This bob is a
// camera-only overlay — it doesn't touch physics/collision at all, just
// lifts the camera in sync with the animation so it reads as "the rider
// jumps too."
//
// First two passes used a hand-guessed curve (symmetric sine, then an
// asymmetric rise/fall/overshoot shape) and both were reported as
// mistimed — the camera visibly rose and fell about a second before the
// horse's own motion. Root cause: the guessed curve peaked at 30% of the
// clip, but the JUMP clip's actual baked vertical motion (extracted
// directly from CowboyXHorse_NLA_V11.glb — the "c_pos" translation
// channel under the "saddle_rig" node, i.e. the bone that actually carries
// the rider/saddle, as opposed to the horse_rig/cowboy_rig's own "c_pos"
// bones which are flat zero) peaks at 67% of the clip and dips into a
// landing crouch near the end. JUMP_CAMERA_BOB_KEYFRAMES below is that
// real data (local Y translation, 1/30s samples, LINEAR-interpolated same
// as the source clip) so the camera bob is sample-for-sample in sync with
// what the rig itself does — no more guessed timing.
export const JUMP_CAMERA_BOB_DURATION = 1.3333333730697632; // matches the JUMP clip's own duration
// [time (s), local Y translation] pairs for saddle_rig's c_pos bone.
export const JUMP_CAMERA_BOB_KEYFRAMES: Array<[number, number]> = [
  [0, 0],
  [0.0333, -0.0086],
  [0.0667, -0.0024],
  [0.1, 0.0023],
  [0.1333, -0.0024],
  [0.1667, -0.0193],
  [0.2, -0.0458],
  [0.2333, -0.0796],
  [0.2667, -0.1211],
  [0.3, -0.151],
  [0.3333, -0.1524],
  [0.3667, -0.101],
  [0.4, 0.0065],
  [0.4333, 0.1519],
  [0.4667, 0.3126],
  [0.5, 0.4715],
  [0.5333, 0.6154],
  [0.5667, 0.7285],
  [0.6, 0.7967],
  [0.6333, 0.8215],
  [0.6667, 0.8171],
  [0.7, 0.8013],
  [0.7333, 0.7944],
  [0.7667, 0.8177],
  [0.8, 0.879],
  [0.8333, 0.9731],
  [0.8667, 1.0768],
  [0.9, 1.1434],
  [0.9333, 1.1194],
  [0.9667, 1.0263],
  [1, 0.8205],
  [1.0333, 0.562],
  [1.0667, 0.3317],
  [1.1, 0.1421],
  [1.1333, -0.0074],
  [1.1667, -0.1099],
  [1.2, -0.1594],
  [1.2333, -0.1834],
  [1.2667, -0.174],
  [1.3, -0.1232],
  [1.3333, -0.0567],
];
// The rig's local units get scaled up by the model group's own scale={3}
// (see CowboyXHorse_NLA_V11.jsx) to reach world units. This multiplier is
// purely a feel knob on top of that — 1.0 reproduces the real bake as-is.
export const JUMP_CAMERA_BOB_SCALE = 3.0;
export const JUMP_CAMERA_BOB_INTENSITY = 1.3;

// t is clip time in seconds (not normalized) — linearly interpolates the
// real baked keyframes above and returns a world-space Y offset.
export function jumpCameraBobOffset(t: number): number {
  const kf = JUMP_CAMERA_BOB_KEYFRAMES;
  if (t <= kf[0][0]) return kf[0][1] * JUMP_CAMERA_BOB_SCALE * JUMP_CAMERA_BOB_INTENSITY;
  for (let i = 1; i < kf.length; i++) {
    if (t <= kf[i][0]) {
      const [t0, y0] = kf[i - 1];
      const [t1, y1] = kf[i];
      const localY = THREE.MathUtils.lerp(y0, y1, (t - t0) / (t1 - t0));
      return localY * JUMP_CAMERA_BOB_SCALE * JUMP_CAMERA_BOB_INTENSITY;
    }
  }
  const last = kf[kf.length - 1][1];
  return last * JUMP_CAMERA_BOB_SCALE * JUMP_CAMERA_BOB_INTENSITY;
}
export const NETWORK_STATE_INTERVAL = 1 / 30;
export const START_LANE_SPACING = 10;