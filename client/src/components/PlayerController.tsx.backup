import { useFrame, useThree } from "@react-three/fiber";
import {
  RigidBody,
  type RapierRigidBody,
  CuboidCollider,
  CapsuleCollider,
  RoundCuboidCollider,
} from "@react-three/rapier";
import { useEffect, useMemo, useRef, useCallback } from "react";
import { Vector3, Quaternion, Euler } from "three";
import { useKeyboardControls } from "@react-three/drei";
import { useGameStore } from "@/hooks/use-game-store";
import { useLobbyStore } from "@/hooks/use-lobby-store";
import { getSocket, useSocketEvent } from "@/hooks/use-socket";
import { useDustTrail } from "@/hooks/use-dust-trail";
import type { Vec3Tuple, RacePlayerState } from "@shared/types/multiplayer";
import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { Model42 } from "./CowboyXHorse_NLA_V42";
import {
  isRemoteKicking,
  getSocketIdForBody,
  setRemoteStun,
} from "@/lib/remoke-kicks";

// const PLAYER_START_POSITION: [number, number, number] = [-340, 5.5787, 410];

// x/z match GameDemo's spawn point exactly (main.js: player.position.set(412.4, 0, 15.3) —
// see gamedemo_spawn_location_fix memory); y stays high so Rapier's fall+collision settles
// it onto the terrain, since wild-west has no manual snapToGround raycast like GameDemo does.
const PLAYER_START_POSITION: [number, number, number] = [412.4, 150, 15.3];

const MAX_SPEED = 286;
// W alone target speed (walk) — no Shift held. The velocity-lerp push each
// frame is proportional to this target (`velocity.lerp(targetVelocity, 0.2)`
// below), so a too-low target (originally 12, picked from the animation
// thresholds without empirical testing) produces too weak a push to
// reliably build speed against this RigidBody's friction/damping — see
// wildwest_walk_run_shift_plan memory for the debug-logged trace that
// caught this. 60 is a moderate push that builds real, sustained walking
// speed. Shift+W still targets MAX_SPEED exactly as before.
const WALK_TARGET_SPEED = 60;
const TURN_SPEED = 2;
const BRAKE_FORCE = 5;
// RUN_BOOST — held button (X), not a timed burst: while held + moving
// forward, target speed is boosted and the RUN_BOOST clip plays on loop via
// the normal playAnimation crossfade (default LoopRepeat, same as every
// other base clip) for exactly as long as the key is held, so animation and
// speed always stay in sync. Releasing X crossfades straight back to
// RUN/WALK. Tune live.
const BOOST_SPEED_MULTIPLIER = 1.5;
// WALK2RUN — plays once when transitioning from WALK into RUN (Shift
// pressed while already walking forward), then hands off to the regular RUN
// loop. Driven by a plain elapsed-time check against the clip's own real
// duration (733ms, confirmed from the source GLB) rather than relying on
// AnimationMixer's "finished" event/LoopOnce timing — the same class of bug
// that broke RUN_BOOST (animation state decoupled from what should drive
// it) is avoided by tying the cutover to one directly-computed condition.
const WALK2RUN_DURATION_MS = 733;
// The mechanical timing is correct (see memory), but a full 0.2s crossfade
// blending WALK's arbitrary loop phase against WALK2RUN's fixed start pose
// reads as mushy/unnatural — WALK2RUN is itself an authored "picking up
// speed" clip, not a loop, so it doesn't need much blend-in to already look
// like a deliberate motion. Snappier entry than the default 0.2s used
// everywhere else; the WALK2RUN->RUN handoff at the end keeps the normal
// 0.2s since that's a real loop-to-loop crossfade. Tune live.
const WALK2RUN_ENTER_FADE = 0.08;
// Procedural "weight" layered on top of the baked WALK2RUN clip, same
// technique as WALK_LEAN_ANGLE (turn bank) and JUMP_CAMERA_BOB (jump dip)
// below — the clip itself reads as stiff, so this adds a forward body-pitch
// that surges in then eases back out over the transition, like leaning into
// the acceleration. Peaks at the midpoint (sine bump: 0 at start, full
// WALK2RUN_LEAN_ANGLE at 50%, back to 0 exactly as RUN takes over).
const WALK2RUN_LEAN_ANGLE = THREE.MathUtils.degToRad(7);
const WALK2RUN_LEAN_SMOOTH_SPEED = 10;
// Baked TURN_LEFT/TURN_RIGHT clip looked wrong for continuous in-motion
// steering while walking (it reads better for a sharp turn-in-place, which
// is why it's kept for that case below) — WALK now keeps playing during a
// walking turn, and this procedurally banks the visual model into the turn
// instead, via a wrapping <group ref={leanGroupRef}> around Model11.
const WALK_LEAN_ANGLE = THREE.MathUtils.degToRad(3);
const WALK_LEAN_SMOOTH_SPEED = 6; // per-second lerp rate toward the target lean
// Horse's own head tilts more than the whole-body lean above, for a
// clearer "looking into the turn" read. Applied to the actual horse head
// bone (Model11's horseHeadBone) — a previous attempt at this accidentally
// grabbed the cowboy's head bone instead, see HeadTilt component below.
const HORSE_HEAD_LEAN_ANGLE = THREE.MathUtils.degToRad(12);
const HORSE_HEAD_LEAN_SMOOTH_SPEED = 8;
// Matches GameDemo's spawn facing (main.js: player.rotation.y = Math.PI).
const PLAYER_START_ROTATION_Y = Math.PI;
// Camera follow — ported verbatim from GameDemo's tuned values (main.js:484-488).
// GameDemo switches offset on a Shift/run key; wild-west has no separate
// walk/run key, so currentSpeed vs. MAX_SPEED stands in for "is running".
const CAM_OFFSET = new Vector3(0, 10.12, -12.3);
const CAM_OFFSET_RUN = new Vector3(0, 10.8, -14.6);
const CAM_LOOK_OFFSET = new Vector3(0, 8.8, 0);
// CAM_OFFSET/CAM_OFFSET_RUN were tuned against GameDemo's fixed camera FOV
// (main.js: `new THREE.PerspectiveCamera(60, ...)`), so framing is only
// correct at FOV 60 — narrower FOV keeps the camera at the same fixed
// distance while the cone shrinks, so the rider "zooms in" and crops out of
// frame (reported below FOV ~57-60). Pulling the camera further back (x/z
// only, height untouched) as FOV narrows compensates without the vertical
// bob a full (x/y/z) dolly caused when tried first.
const CAM_OFFSET_REFERENCE_FOV = 60;
// First-person — raised above CAM_LOOK_OFFSET.y (which is roughly chest
// height, the third-person look-AT target) for true rider eye level, sitting
// upright on the saddle above the horse's head. Nudged forward so the camera
// sits in front of the head/hat mesh instead of inside it. Height and FOV
// are live-tunable via the "First Person" Leva panel below — these are just
// the starting defaults.
const FIRST_PERSON_HEIGHT_DEFAULT = 9.0;
const FIRST_PERSON_FORWARD = 1.0;
const FIRST_PERSON_LOOK_DISTANCE = 40;
// Mouse look, first-person only — a head-turn independent of steering
// (WASD still controls where the horse actually travels). Yaws just the
// look-at target, not fpPos itself, so the camera stays anchored to the
// horse's position and only the view direction swivels, like turning your
// head while riding. Radians per pixel of mouse movementX/Y.
const MOUSE_LOOK_SENSITIVITY = 0.0012;
// Yaw: 90° each way = 180° total left-right, as requested. Pitch is kept
// noticeably tighter than yaw — a head can turn further sideways than it
// can tip up/down before it stops looking natural.
const MOUSE_LOOK_YAW_LIMIT = THREE.MathUtils.degToRad(90);
const MOUSE_LOOK_PITCH_LIMIT = THREE.MathUtils.degToRad(12);
// Third person FOV now switches with the same isRunning threshold as
// CAM_OFFSET/CAM_OFFSET_RUN below, rather than being a fixed manual value.
// TP_FOV_RUN matches CAM_OFFSET_REFERENCE_FOV exactly (both 60) so the dolly
// compensation is a no-op while running — only the walk FOV needs pull-back.
const TP_FOV_WALK = 45;
const TP_FOV_RUN = 55;
// Speed-based FOV curve, first-person only — 80 at idle/walk, gradually
// widening to 90 as speed climbs through the run range. Thresholds match
// the WALK/RUN animation cutoffs just above (currentSpeed 6/15), not
// MAX_SPEED (286) — MAX_SPEED is a lerp target real gameplay rarely gets
// close to, which is what made the earlier camera-bob attempt look broken
// (see wildwest_camera_bob_reverted memory). FP_FOV_RUN_MAX_SPEED is an
// observed near-full-gallop speed instead, so the curve actually reaches
// its top end during normal play.
const FP_FOV_RUN_START_SPEED = 15;
const FP_FOV_RUN_MAX_SPEED = 45;
const FP_FOV_IDLE = 80;
const FP_FOV_RUN = 90;
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
const JUMP_CAMERA_BOB_DURATION = 1.3333333730697632; // matches the JUMP clip's own duration
// [time (s), local Y translation] pairs for saddle_rig's c_pos bone.
const JUMP_CAMERA_BOB_KEYFRAMES: Array<[number, number]> = [
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
const JUMP_CAMERA_BOB_SCALE = 3.0;
const JUMP_CAMERA_BOB_INTENSITY = 1.3;

// t is clip time in seconds (not normalized) — linearly interpolates the
// real baked keyframes above and returns a world-space Y offset.
function jumpCameraBobOffset(t: number): number {
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
const NETWORK_STATE_INTERVAL = 1 / 30;
const START_LANE_SPACING = 10;

// Rendered as a sibling AFTER <Model11> below so this useFrame subscribes
// (and therefore runs) after Model11's own internal useAnimations mixer
// update each frame. Order matters: the mixer sets horseHeadBone's
// quaternion (three.js keeps .rotation in sync with it) fresh every frame,
// so applying our tilt in a callback that runs BEFORE the mixer would just
// get silently overwritten and never appear on screen.
//
// IMPORTANT: WALK doesn't appear to animate this bone's Z rotation at all,
// so nothing ever resets it between frames. A naive `rotation.z +=` here
// compounds forever for as long as a turn is held, spiraling the head into
// a broken-looking twist within a couple of seconds (found via live
// testing). Fixed by tracking our own previously-applied amount and
// subtracting it back out before adding the new one each frame, so we only
// ever have a single frame's worth of tilt applied on top of whatever the
// mixer set — safe whether or not the mixer touches this bone.
function HorseHeadTilt({
  horseRef,
  turnLeanInput,
}: {
  horseRef: React.MutableRefObject<any>;
  turnLeanInput: React.MutableRefObject<{ active: boolean; dir: number }>;
}) {
  const appliedTilt = useRef(0);
  const previousApplied = useRef(0);
  useFrame((_, delta) => {
    const headBone = horseRef.current?.horseHeadBone;
    if (!headBone) return;
    const target = turnLeanInput.current.active
      ? turnLeanInput.current.dir * HORSE_HEAD_LEAN_ANGLE
      : 0;
    appliedTilt.current = THREE.MathUtils.lerp(
      appliedTilt.current,
      target,
      Math.min(1, delta * HORSE_HEAD_LEAN_SMOOTH_SPEED),
    );
    headBone.rotation.z += appliedTilt.current - previousApplied.current;
    previousApplied.current = appliedTilt.current;
  });
  return null;
}

type Props = {
  playerRef: React.MutableRefObject<RapierRigidBody | null>;
  isFirstPersonRef: React.MutableRefObject<boolean>;
};
export function PlayerController({ playerRef, isFirstPersonRef }: Props) {
  const horseRef = useRef<any>(null);
  const leanGroupRef = useRef<THREE.Group>(null);
  // Shared with HorseHeadTilt below so it can read the same turn state
  // without recomputing it — updated once per frame in the main loop.
  const turnLeanInput = useRef({ active: false, dir: 0 });
  const currentAction = useRef<any>(null);
  const currentBaseAction = useRef<any>(null);
  const currentOverlayAction = useRef<any>(null);
  const currentAnimationName = useRef("IDLE");
  // Active overlay (kick) name so it can be broadcast alongside the base
  // animation. currentAnimationName tracks only base animations; without this
  // ref, peers never see kicks.
  const currentOverlayName = useRef<string | null>(null);
  const lastNetworkStateAt = useRef(0);
  const lastKickedAt = useRef(0);
  // WALK2RUN transition — true while the one-shot "picking up speed" clip is
  // playing on the way from WALK into the RUN loop.
  const transitioningToRun = useRef(false);
  const walk2RunStartedAt = useRef(0);
  const body = useRef<RapierRigidBody>(null);
  const [, getKeys] = useKeyboardControls();
  const { setSpeed, addScore, isPlaying } = useGameStore();
  const players = useLobbyStore((state) => state.players);
  const socketId = useLobbyStore((state) => state.socketId);
  const camera = useThree((state) => state.camera as PerspectiveCamera);
  const glDomElement = useThree((state) => state.gl.domElement);

  // First-person mouse look — see MOUSE_LOOK_SENSITIVITY above. Click the
  // canvas to lock the pointer (standard browser-game pattern; Escape
  // releases it same as any pointer-locked page), then movementX/Y yaws
  // and pitches the FP look-at target, clamped, only while in first person.
  const mouseYawOffset = useRef(0);
  const mousePitchOffset = useRef(0);
  // Look up/down (pitch) is locked off by default — toggled via "L"
  // (see toggleLookPitch handling in the main useFrame below). Yaw
  // (left/right) is always active in FP; only pitch is gated.
  const pitchUnlockedRef = useRef(false);
  useEffect(() => {
    const handleClick = () => {
      if (document.pointerLockElement !== glDomElement) {
        glDomElement.requestPointerLock();
      }
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== glDomElement) return;
      if (!isFirstPersonRef.current) return;
      mouseYawOffset.current = THREE.MathUtils.clamp(
        mouseYawOffset.current - e.movementX * MOUSE_LOOK_SENSITIVITY,
        -MOUSE_LOOK_YAW_LIMIT,
        MOUSE_LOOK_YAW_LIMIT,
      );
      if (pitchUnlockedRef.current) {
        mousePitchOffset.current = THREE.MathUtils.clamp(
          mousePitchOffset.current - e.movementY * MOUSE_LOOK_SENSITIVITY,
          -MOUSE_LOOK_PITCH_LIMIT,
          MOUSE_LOOK_PITCH_LIMIT,
        );
      }
    };
    glDomElement.addEventListener("click", handleClick);
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      glDomElement.removeEventListener("click", handleClick);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [glDomElement, isFirstPersonRef]);

  // Snapshot players when the game starts so that players leaving mid-race
  // don't shift lane offsets and teleport everyone back to spawn.
  const playersSnapshot = useRef(players);
  useEffect(() => {
    if (!isPlaying) playersSnapshot.current = players;
  }, [isPlaying, players]);

  const startTransform = useMemo(() => {
    const activePlayers = playersSnapshot.current;
    const playerIndex = activePlayers.findIndex(
      (player) => player.socketId === (socketId ?? getSocket().id),
    );
    const laneCount = Math.max(activePlayers.length, 1);
    const laneIndex = playerIndex >= 0 ? playerIndex : 0;
    const centerIndex = (laneCount - 1) / 2;
    const spawnEuler = new Euler(0, PLAYER_START_ROTATION_Y, 0);
    const right = new Vector3(1, 0, 0).applyEuler(spawnEuler).normalize();
    const position = new Vector3(...PLAYER_START_POSITION).addScaledVector(
      right,
      (laneIndex - centerIndex) * START_LANE_SPACING,
    );

    return {
      euler: spawnEuler,
      position,
      positionTuple: [position.x, position.y, position.z] as Vec3Tuple,
    };
  }, [socketId]);

  const fpHeight = FIRST_PERSON_HEIGHT_DEFAULT;

  // GameDemo snaps the camera straight to the follow position on the first
  // frame instead of lerping from a stale start, which otherwise drags the
  // camera through solid terrain for dozens of frames on load.
  const cameraSnapped = useRef(false);
  const fpCameraSnapped = useRef(false);
  const toggleViewWasDown = useRef(false);
  const toggleLookPitchWasDown = useRef(false);

  // Store distance traveled for scoring
  const lastPosition = useRef(new Vector3());
  const proximityContacts = useRef<Set<string>>(new Set());
  const collisionHitsDuringOverlay = useRef<Set<number>>(new Set());
  const stunnedUntil = useRef<number>(0);

  useEffect(() => {
    playerRef.current = body.current;
  }, [playerRef]);

  useDustTrail(horseRef, body);
  useEffect(() => {
    const spawnPosition = startTransform.position;
    const spawnEuler = startTransform.euler;
    const initialTarget = spawnPosition.clone().add(CAM_LOOK_OFFSET);
    const initialCameraPosition = spawnPosition
      .clone()
      .add(CAM_OFFSET.clone().applyEuler(spawnEuler));

    lastPosition.current.copy(spawnPosition);

    camera.position.copy(initialCameraPosition);
    camera.lookAt(initialTarget);
  }, [camera, startTransform]);

  // Listen for remote player state updates to detect when nearby remotes are kicking
  const handleRemotePlayerState = useCallback((state: RacePlayerState) => {
    if (!body.current) return;

    // Only care if the remote has a kick overlay
    if (!state.overlay) return;

    // Check distance from local player to remote player
    const localPos = body.current.translation();
    const remotePos = new Vector3(
      state.position[0],
      state.position[1],
      state.position[2],
    );
    const distance = Math.hypot(
      localPos.x - remotePos.x,
      localPos.y - remotePos.y,
      localPos.z - remotePos.z,
    );

    // If remote is within kick range (~10 units), stun the local player
    const KICK_RANGE = 10;
    if (distance < KICK_RANGE) {
      stunnedUntil.current = performance.now() + 2000;
      console.log(
        `aaaaa[LOCAL STUN] Remote player at distance ${distance.toFixed(1)} is kicking, local player stunned`,
      );
    }
  }, []);

  useSocketEvent("race:player-state", handleRemotePlayerState);

  useFrame((state, delta) => {
    if (!body.current || !isPlaying) return;

    const rb = body.current;

    // Check if locally stunned - if so, skip movement and return early
    const now = performance.now();
    const isStunned = stunnedUntil.current > now;
    if (isStunned) {
      const linvel = rb.linvel();
      rb.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
      playAnimation("IDLE");
      return;
    }

    const {
      forward,
      backward,
      left,
      right,
      jump,
      kickLeft,
      kickRight,
      toggleView,
      run,
      boost,
      toggleLookPitch,
    } = getKeys();

    // RUN_BOOST — active for as long as X + forward are held, independent
    // of the run/Shift key (so it works whether or not Shift is also down).
    const isBoosting = forward && boost;

    // Edge-detect so holding V doesn't rapidly flip the view every frame.
    // isFirstPersonRef is shared with MotionBlurEffect (Game.tsx), which
    // dials back blur strength in first-person — see that file for why.
    if (toggleView && !toggleViewWasDown.current) {
      isFirstPersonRef.current = !isFirstPersonRef.current;
      // Reset mouse-look so entering FP always starts looking straight
      // ahead instead of wherever a stale offset left off.
      if (isFirstPersonRef.current) {
        mouseYawOffset.current = 0;
        mousePitchOffset.current = 0;
      }
    }
    toggleViewWasDown.current = toggleView;

    // "L" toggles look up/down (pitch) on/off — locked (off) by default.
    // Re-locking snaps pitch back to level immediately rather than leaving
    // it wherever it was pointed.
    if (toggleLookPitch && !toggleLookPitchWasDown.current) {
      pitchUnlockedRef.current = !pitchUnlockedRef.current;
      if (!pitchUnlockedRef.current) mousePitchOffset.current = 0;
    }
    toggleLookPitchWasDown.current = toggleLookPitch;

    const impulse = { x: 0, y: 0, z: 0 };
    const torque = { x: 0, y: 0, z: 0 };

    // current velocity
    const linvel = rb.linvel();
    const velocity = new Vector3(linvel.x, linvel.y, linvel.z);

    const rotation = rb.rotation();
    const quat1 = new Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w,
    );
    const euler = new Euler().setFromQuaternion(quat1);

    // forward direction
    const forwardDir = new Vector3(0, 0, 1).applyEuler(euler).normalize();

    // speed
    const currentSpeed = Math.sqrt(linvel.x ** 2 + linvel.z ** 2);

    // =========================
    // �️ PROXIMITY REPULSION
    // =========================
    // if (proximityContacts.current.size > 0) {
    //   // Keep local repulsion minimal; remote pause is the main collision fix.
    //   const repulsionDir = new Vector3(0, 0, 0);
    //   proximityContacts.current.forEach(() => {
    //     repulsionDir.z += 1;
    //   });
    //   if (repulsionDir.length() > 0) {
    //     repulsionDir.normalize();
    //     velocity.addScaledVector(repulsionDir, 0.2);
    //   }
    // }

    // =========================
    // �🔁 TURNING (SMOOTH)
    // =========================

    if (left || right) {
      const turnDir = left ? 1 : -1;

      const turnSpeedFactor = THREE.MathUtils.lerp(
        1.2,
        0.4,
        currentSpeed / MAX_SPEED,
      );

      const turnAmount = turnDir * TURN_SPEED * turnSpeedFactor * delta;

      // 🔥 rotate around Y axis WITHOUT resetting
      const deltaQuat = new Quaternion().setFromAxisAngle(
        new Vector3(0, 1, 0),
        turnAmount,
      );

      // quat1.multiply(deltaQuat) // ← THIS IS THE KEY
      // 🔥 target rotation (current + delta)
      const targetQuat = quat1.clone().multiply(deltaQuat);

      // 🔥 smooth toward target
      quat1.slerp(targetQuat, 0.5);
      rb.setRotation(
        {
          x: quat1.x,
          y: quat1.y,
          z: quat1.z,
          w: quat1.w,
        },
        true,
      );
    }

    // =========================
    // 🐎 FORWARD MOVEMENT (SMOOTH)
    // =========================

    let targetSpeed = 0;

    if (forward) {
      targetSpeed = isBoosting
        ? MAX_SPEED * BOOST_SPEED_MULTIPLIER
        : run
          ? MAX_SPEED
          : WALK_TARGET_SPEED;
    } else if (backward) targetSpeed = -MAX_SPEED * 0.4;

    const forwardSpeed = velocity.dot(forwardDir);

    // convert to positive "km/h feel"
    const displaySpeed = Math.abs(forwardSpeed);
    const displaySpeedKmh = Math.round(displaySpeed * 1.5);

    setSpeed(displaySpeedKmh);

    // smooth acceleration
    const newForwardSpeed = THREE.MathUtils.lerp(
      forwardSpeed,
      targetSpeed,
      delta * 4,
    );

    // desired velocity
    const targetVelocity = forwardDir.clone().multiplyScalar(newForwardSpeed);

    // 🔥 blend instead of overwrite (IMPORTANT)
    // Walking (forward, no Shift) needs a much stronger blend than run's
    // original 0.2 — at low target speeds, this RigidBody's ground contact
    // periodically wipes out a large fraction of horizontal velocity every
    // couple of frames (confirmed via debug-logged raw linvel traces, see
    // wildwest_walk_run_shift_plan memory), and only a strong enough
    // per-frame reassertion nets real sustained speed instead of being
    // fully cancelled out. Run/backward keep the original 0.2 exactly as
    // tuned before — MAX_SPEED's own larger push already clears this on
    // its own, so changing its blend would only risk its already-tuned feel.
    const isWalking = forward && !run && !isBoosting;
    velocity.lerp(targetVelocity, isWalking ? 0.9 : 0.2);

    // =========================
    // 🧲 APPLY
    // =========================

    rb.setLinvel(
      {
        x: velocity.x,
        y: linvel.y,
        z: velocity.z,
      },
      true,
    );
    // =========================
    // 🎞 ANIMATIONS
    
    // =========================
    // WALK2RUN only ever applies to the plain straight-run case below (no
    // boost, no turn, no jump) — leaving that exact state for ANY reason
    // (releasing Shift, turning, boosting, jumping) clears the in-progress
    // flag so no stale transition can resume from a stale timestamp later.
    const inStraightRunState = forward && run && !isBoosting && !left && !right && !jump;
    if (!inStraightRunState) {
      transitioningToRun.current = false;
    }
    if (!isStunned) {
      if (jump) {
        playAnimation("JUMP");
      } else if (forward) {
        // Turn choice now branches on the actual run key first — previously
        // left/right was checked before run, so RUN_LEFT/RUN_RIGHT played
        // any time you turned while holding W, even without Shift. Boosting
        // counts as running for this branch too (no dedicated boost-turn
        // clips exist), so a boosted turn still uses RUN_LEFT/RUN_RIGHT.
        if (run || isBoosting) {
          if (left) playAnimation("RUN_LEFT");
          else if (right) playAnimation("RUN_RIGHT");
          else if (isBoosting) {
            playAnimation("RUN_BOOST");
            if (kickLeft) playAnimation("RUN_KICK_LEFT", "overlay");
            else if (kickRight) playAnimation("RUN_KICK_RIGHT", "overlay");
          } else {
            // Plain run, no boost, no turn — the only case WALK2RUN can
            // trigger from. Starts the transition the moment we arrive here
            // coming from WALK; stays on WALK2RUN for exactly its own real
            // clip duration (measured from the source GLB), then hands off
            // to the regular RUN loop via the same crossfade every other
            // clip switch already uses.
            if (!transitioningToRun.current && currentAnimationName.current === "WALK") {
              transitioningToRun.current = true;
              walk2RunStartedAt.current = now;
            }
            if (transitioningToRun.current && now - walk2RunStartedAt.current < WALK2RUN_DURATION_MS) {
              playAnimation("WALK2RUN", "base", WALK2RUN_ENTER_FADE);
            } else {
              transitioningToRun.current = false;
              playAnimation("RUN");
            }
            if (kickLeft) playAnimation("RUN_KICK_LEFT", "overlay");
            else if (kickRight) playAnimation("RUN_KICK_RIGHT", "overlay");
          }
        } else {
          // Was TURN_LEFT/TURN_RIGHT here too — replaced with a procedural
          // lean (see WALK_LEAN_ANGLE below) so WALK just keeps playing.
          playAnimation("WALK");
        }
      } else if (backward) {
        playAnimation("WALK");
      } else if (left) {
        playAnimation("TURN_LEFT");
      } else if (right) {
        playAnimation("TURN_RIGHT");
      } else {
        if (currentSpeed > 15) playAnimation("RUN");
        else if (currentSpeed > 6) playAnimation("WALK");
        else playAnimation("IDLE");
      }
    } else {
      playAnimation("IDLE");
    }

    // =========================
    // 🏇 PROCEDURAL WALK-TURN LEAN
    // =========================
    // Banks the visual model into the turn only for the walking-turn case
    // above (forward, no Shift, no jump/stun) — running turns and
    // stationary turn-in-place keep their own baked clips untouched.
    const wantsLean = !isStunned && !jump && forward && !run && !isBoosting && (left || right);
    turnLeanInput.current.active = wantsLean;
    turnLeanInput.current.dir = left ? 1 : -1;
    if (leanGroupRef.current) {
      const targetLean = wantsLean ? (left ? WALK_LEAN_ANGLE : -WALK_LEAN_ANGLE) : 0;
      leanGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        leanGroupRef.current.rotation.z,
        targetLean,
        Math.min(1, delta * WALK_LEAN_SMOOTH_SPEED),
      );

      // WALK2RUN forward-pitch "weight" — see WALK2RUN_LEAN_ANGLE above.
      // Independent axis (x) from the turn bank (z) above, so both can
      // apply at once with no conflict.
      const walk2RunProgress = transitioningToRun.current
        ? THREE.MathUtils.clamp(
            (now - walk2RunStartedAt.current) / WALK2RUN_DURATION_MS,
            0,
            1,
          )
        : null;
      const targetForwardLean =
        walk2RunProgress !== null
          ? Math.sin(walk2RunProgress * Math.PI) * WALK2RUN_LEAN_ANGLE
          : 0;
      leanGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        leanGroupRef.current.rotation.x,
        targetForwardLean,
        Math.min(1, delta * WALK2RUN_LEAN_SMOOTH_SPEED),
      );
    }

    // =========================
    // 📈 SCORE (same as yours)
    // =========================

    const pos = rb.translation();
    const posVec = new Vector3(pos.x, pos.y, pos.z);

    const dist = posVec.distanceTo(lastPosition.current);
    if (dist > 0.1) {
      addScore(Math.floor(dist));
      lastPosition.current.copy(posVec);
    }

    // Camera Follow Logic — ported verbatim from GameDemo's main.js
    // (camOffset/camOffsetRun/camLookOffset, rotated by the horse's full
    // quaternion, frame-rate-independent exponential follow, fixed FOV)
    // for third person; first person is new (see FIRST_PERSON_OFFSET).
    const bodyPos = body.current.translation();
    const horsePos = new Vector3(bodyPos.x, bodyPos.y, bodyPos.z);
    const quat = new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);

    if (isFirstPersonRef.current) {
      const fovT = THREE.MathUtils.clamp(
        (currentSpeed - FP_FOV_RUN_START_SPEED) / (FP_FOV_RUN_MAX_SPEED - FP_FOV_RUN_START_SPEED),
        0,
        1
      );
      const targetFpFov = THREE.MathUtils.lerp(FP_FOV_IDLE, FP_FOV_RUN, fovT);
      // Smoothed in time too (not just as a function of instantaneous
      // speed) so the FOV widens/narrows gradually rather than snapping
      // every time currentSpeed crosses the run threshold.
      const newFov = THREE.MathUtils.lerp(camera.fov, targetFpFov, Math.min(1, delta * 3));
      if (Math.abs(camera.fov - newFov) > 0.01) {
        camera.fov = newFov;
        camera.updateProjectionMatrix();
      }

      // Reported as a "3D layers"/ghosting effect while moving, only in
      // first person. Ruled out: motion blur (disabled entirely in FP,
      // issue persisted), bloom threshold (no visible static difference in
      // an A/B test), R3F double-rendering (disabled once any useFrame
      // claims a render priority, which MotionBlurEffect does). Leading
      // theory: FIRST_PERSON_OFFSET was a raw, zero-smoothed copy of the
      // Rapier rigid body's position/rotation every frame — any per-step
      // physics noise (contact resolution against the terrain trimesh)
      // gets displayed completely unfiltered, unlike third-person which
      // low-pass-filters it via the exponential lerp below. A tight lerp
      // here (converges in ~2-3 frames, not the laggy multi-frame
      // third-person one) should remove single-frame noise spikes without
      // feeling delayed.
      const fpPos = new Vector3(0, fpHeight, FIRST_PERSON_FORWARD).applyQuaternion(quat).add(horsePos);
      // Look-at target is computed from the un-bobbed fpPos (below) so its
      // height stays anchored to the rider's normal eye line. If the target
      // rose by the same bob amount as the camera, the camera would just
      // translate straight up with a level pitch — which is what pushed the
      // horse's head/neck out of the bottom of frame during a jump. Keeping
      // the target lower makes the camera tilt down toward the horse as it
      // rises, the way your head naturally pitches down when you hop.
      // Mouse yaw rotates only the look-at direction, not fpPos above — the
      // camera stays anchored to the horse's actual position/heading, and
      // only the view swivels, independent of steering.
      const yawedDir = forwardDir
        .clone()
        .applyAxisAngle(new Vector3(0, 1, 0), mouseYawOffset.current);
      // Pitch rotates around the "right" axis derived from the yawed
      // direction, so up/down stays correct regardless of which way you're
      // currently yawed.
      const pitchAxis = new Vector3().crossVectors(yawedDir, new Vector3(0, 1, 0)).normalize();
      const fpLookDir = yawedDir.applyAxisAngle(pitchAxis, mousePitchOffset.current);
      const fpLookAt = fpLookDir.clone().multiplyScalar(FIRST_PERSON_LOOK_DISTANCE).add(fpPos);

      // Weighted by the JUMP action's own crossfade weight, not just
      // isRunning(), so the bob eases in/out smoothly with the animation's
      // own fade rather than snapping when JUMP starts/finishes fading.
      const jumpAction = horseRef.current?.actions?.JUMP;
      if (jumpAction && jumpAction.isRunning()) {
        // Modulo by the clip's own duration (not a guessed value) so a held
        // jump key (default LoopRepeat) re-samples the same real curve each
        // cycle instead of drifting out of sync.
        const t = jumpAction.time % JUMP_CAMERA_BOB_DURATION;
        const bob = jumpCameraBobOffset(t) * jumpAction.getEffectiveWeight();
        fpPos.y += bob; // only the camera itself rises — fpLookAt above stays put
      }
      if (!fpCameraSnapped.current) {
        camera.position.copy(fpPos);
        fpCameraSnapped.current = true;
      } else {
        const t = Math.min(1, delta * 40);
        camera.position.lerp(fpPos, t);
      }
      camera.lookAt(fpLookAt);
      cameraSnapped.current = false; // re-snap (no lerp-in) when switching back to third person
    } else {
      // Was `currentSpeed > 15`, meant as a stand-in for "is running" back
      // when this comment assumed there was no separate run key — there is
      // one (`run`, bound to Shift, see the RUN animation branch above).
      // WALK_TARGET_SPEED (60) easily pushes currentSpeed past 15 during
      // plain walking, so FOV/CAM_OFFSET_RUN were flipping to "running"
      // without Shift held. Use the actual key state instead.
      const isRunning = run;
      const targetTpFov = isRunning ? TP_FOV_RUN : TP_FOV_WALK;
      const newTpFov = THREE.MathUtils.lerp(camera.fov, targetTpFov, Math.min(1, delta * 1.8));
      if (Math.abs(camera.fov - newTpFov) > 0.01) {
        camera.fov = newTpFov;
        camera.updateProjectionMatrix();
      }

      const fovDollyScale =
        Math.tan(THREE.MathUtils.degToRad(CAM_OFFSET_REFERENCE_FOV) / 2) /
        Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      const baseOffset = isRunning ? CAM_OFFSET_RUN : CAM_OFFSET;
      const scaledOffset = new Vector3(
        baseOffset.x * fovDollyScale,
        baseOffset.y,
        baseOffset.z * fovDollyScale,
      );
      const desiredCamPos = scaledOffset
        .applyQuaternion(quat)
        .add(horsePos);

      if (!cameraSnapped.current) {
        camera.position.copy(desiredCamPos);
        cameraSnapped.current = true;
      } else {
        camera.position.lerp(desiredCamPos, 1 - Math.pow(0.001, delta));
      }

      const desiredLookAt = CAM_LOOK_OFFSET.clone().add(horsePos);
      camera.lookAt(desiredLookAt);
      fpCameraSnapped.current = false; // re-snap (no lerp-in) when switching to first person
    }

    if (
      state.clock.elapsedTime - lastNetworkStateAt.current >=
      NETWORK_STATE_INTERVAL
    ) {
      const socket = getSocket();
      const pos = rb.translation();
      const rot = rb.rotation();
      // console.log("sending network state", {
      //   position: [pos.x, pos.y, pos.z],
      //   rotation: [rot.x, rot.y, rot.z, rot.w], velocity: [velocity.x, linvel.y, velocity.z],
      //   speed: displaySpeedKmh,
      //   animation: currentAnimationName.current,
      //   overlay: currentOverlayName.current,
      // });
      if (socket.connected) {
        socket.volatile.emit("race:state", {
          position: [pos.x, pos.y, pos.z],
          rotation: [rot.x, rot.y, rot.z, rot.w],
          velocity: [velocity.x, linvel.y, velocity.z],
          speed: displaySpeedKmh,
          animation: currentAnimationName.current,
          overlay: currentOverlayName.current,
          sentAt: Date.now(),
        });
      }

      lastNetworkStateAt.current = state.clock.elapsedTime;
    }
  });

  // const playAnimation = (name: string) => {
  //   const actions = horseRef.current?.actions;
  //   if (!actions || !actions[name]) return;

  //   const next = actions[name];

  //   if (currentAction.current === next) return;

  //   currentAction.current?.fadeOut(0.2);
  //   next.reset().fadeIn(0.2).play();

  //   currentAction.current = next;
  //   currentAnimationName.current = name;
  // };
  const playAnimation = (
    name: string,
    type: "base" | "overlay" = "base",
    fadeDuration = 0.2,
  ) => {
    const actions = horseRef.current?.actions;

    if (!actions || !actions[name]) return;

    const next = actions[name];

    // =========================
    // BASE ANIMATIONS
    // =========================

    if (type === "base") {
      if (currentBaseAction.current === next) return;

      currentBaseAction.current?.fadeOut(fadeDuration);
      next.reset().fadeIn(fadeDuration).play();

      currentBaseAction.current = next;
      currentAnimationName.current = name;
    }

    // =========================
    // OVERLAY ANIMATIONS
    // =========================
    else {
      if (currentOverlayAction.current === next && next.isRunning()) {
        return;
      }

      // Mask the kick clip to leg-only tracks the first time it plays. Three
      // .js has no per-bone weight, so a full-pose kick at high weight blends
      // the rider's spine toward the kick's "lean forward" pose and the
      // cowboy sinks into the horse. Stripping the clip's torso/arm tracks
      // means RUN owns every non-leg bone outright — the kick can then run
      // at full weight (legs stretch all the way) without ever touching the
      // rider's upper body.
      const overlayClip = next.getClip();
      if (!(overlayClip as any).__legMasked) {
        const include = /leg|foot|thigh|knee|shin|ankle|toe|calf|tibia|fibula/i;
        const exclude =
          /hip|pelvis|root|spine|neck|head|chest|shoulder|arm|hand|finger|torso/i;
        const original = overlayClip.tracks;
        const filtered = original.filter(
          (t: THREE.KeyframeTrack) =>
            include.test(t.name) && !exclude.test(t.name),
        );
        if (filtered.length > 0) {
          overlayClip.tracks = filtered;
        } else {
          console.warn(
            "[kick] No leg tracks matched; clip kept whole. Bones:",
            original.map((t: THREE.KeyframeTrack) => t.name),
          );
        }
        (overlayClip as any).__legMasked = true;
      }

      currentOverlayAction.current?.fadeOut(0.1);

      next.reset();

      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
      next.setEffectiveTimeScale(1);
      // High weight is now safe — the masked clip can only influence legs.
      // Effective leg blend is ~67% kick / 33% RUN; everything above the
      // pelvis is 100% RUN because the clip has no track for those bones.
      next.setEffectiveWeight(2);

      next.fadeIn(0.05).play();

      currentOverlayAction.current = next;
      currentOverlayName.current = name;
      // mark kick start
      lastKickedAt.current = performance.now();
      collisionHitsDuringOverlay.current.clear();

      const mixer = next.getMixer();

      const onFinish = (e: any) => {
        if (e.action === next) {
          next.fadeOut(0.1);

          if (currentOverlayAction.current === next) {
            currentOverlayAction.current = null;
            currentOverlayName.current = null;
          }

          // clear hits when overlay finishes
          collisionHitsDuringOverlay.current.clear();

          mixer.removeEventListener("finished", onFinish);
        }
      };

      mixer.addEventListener("finished", onFinish);
    }
  };
  return (
    <RigidBody
      ref={body}
      position={startTransform.positionTuple}
      // position={[500, 6.5787, 0]}
      rotation={[0, PLAYER_START_ROTATION_Y, 0]}
      colliders={false}
      mass={10}
      friction={0.5}
      restitution={0}
      linearDamping={1}
      angularDamping={8}
      canSleep={false}
      dominanceGroup={10}
      enabledRotations={[false, false, false]} // Allow some tilt? Maybe lock X/Z for simpler arcade feel
      ccd
    >
      {/* <CuboidCollider args={[0.5, 0.5, 2.2]} position={[0, 0.5, 0]} restitution={0.2} /> */}
      {/* <CuboidCollider args={[1.5, 0.5, 0.5]} position={[0, 0.5, 2]} />
      <CuboidCollider args={[1.5, 0.5, 0.5]} position={[0, 0.5, -2]} />
      <CuboidCollider args={[0.5, 0.5, 2]} position={[0.5, 0.5, 0]} />
      <CuboidCollider args={[0.5, 0.5, 2]} position={[-0.5, 0.5, 0]} /> */}
      {/* <CuboidCollider args={[0.5, 1, 2]} position={[0, 1.7, 0]} /> */}
      {/* <RoundCuboidCollider
        args={[1.4, 0.7, 5, 0.2]}
        position={[0, 0.9, 1]}
        restitution={0}

      /> */}
      <RoundCuboidCollider
        args={[1.4, 1.7, 2, 0.2]}
        position={[0, 7, 0]}
        restitution={0}
      />
      <RoundCuboidCollider
        args={[1.4, 2.7, 5, 0.2]}
        position={[0, 2.9, 1]}
        restitution={0}
      />
      {/* Sensor used to detect kick hits in front of the rider */}
      <RoundCuboidCollider
        args={[3, 5, 5, 0.2]}
        position={[0, 5.2, 1]}
        // sensor
        onCollisionEnter={({ other }) => {
          console.log("aaaaaacollision enter", other.rigidBody);
          if (!other.rigidBody) return;
          const otherBody = other.rigidBody as RapierRigidBody;
          const otherHandle = otherBody.handle;
          if (collisionHitsDuringOverlay.current.has(otherHandle)) return;
          if (!currentOverlayName.current) return;
          const now = performance.now();
          if (now - lastKickedAt.current > 1500) return;
          const targetSocketId = getSocketIdForBody(otherBody);
          if (!targetSocketId) return;
          const myId = socketId ?? getSocket().id;
          if (targetSocketId === myId) return;
          collisionHitsDuringOverlay.current.add(otherHandle);
          console.log(
            `aaaaaa[kick] ${myId} hit ${targetSocketId} with ${currentOverlayName.current}`,
          );
          setRemoteStun(otherBody, 2000);
        }}
      />
      {/* <RoundCuboidCollider
        args={[1.6, 2.7, 5, 0.2]}
        position={[0, 2.9, 1]}

        sensor
        onCollisionEnter={({ other }) => {
          if (!other.rigidBody) return;
          const otherId = other.rigidBody.handle;
          proximityContacts.current.add(otherId.toString());
        }}
        onCollisionExit={({ other }) => {
          if (!other.rigidBody) return;
          const otherId = other.rigidBody.handle;
          proximityContacts.current.delete(otherId.toString());
        }}
      /> */}

      {/* <CapsuleCollider args={[1, 0.5]} position={[0, 0.7, -2]} rotation={[0, 0, Math.PI / 2]} />
      <CapsuleCollider args={[1, 0.5]} position={[0, 0.7, 3]} rotation={[0, 0, Math.PI / 2]} /> */}
      <group ref={leanGroupRef}>
        <Model42 ref={horseRef} />
        <HorseHeadTilt horseRef={horseRef} turnLeanInput={turnLeanInput} />
      </group>
    </RigidBody>
  );
}
