const fs = require('fs');

const backup = fs.readFileSync('client/src/components/PlayerController.tsx.backup', 'utf8');
const lines = backup.split(/\r?\n/);

const newImports = `import {
  PLAYER_START_POSITION, MAX_SPEED, WALK_TARGET_SPEED, TURN_SPEED, BRAKE_FORCE,
  BOOST_SPEED_MULTIPLIER, WALK2RUN_DURATION_MS, WALK2RUN_ENTER_FADE, WALK2RUN_LEAN_ANGLE,
  WALK2RUN_LEAN_SMOOTH_SPEED, WALK_LEAN_ANGLE, WALK_LEAN_SMOOTH_SPEED, PLAYER_START_ROTATION_Y,
  CAM_OFFSET, CAM_OFFSET_RUN, CAM_LOOK_OFFSET, CAM_OFFSET_REFERENCE_FOV, FIRST_PERSON_HEIGHT_DEFAULT,
  FIRST_PERSON_FORWARD, FIRST_PERSON_LOOK_DISTANCE, MOUSE_LOOK_SENSITIVITY, MOUSE_LOOK_YAW_LIMIT,
  MOUSE_LOOK_PITCH_LIMIT, TP_FOV_WALK, TP_FOV_RUN, FP_FOV_RUN_START_SPEED, FP_FOV_RUN_MAX_SPEED,
  FP_FOV_IDLE, FP_FOV_RUN, JUMP_CAMERA_BOB_DURATION, NETWORK_STATE_INTERVAL, START_LANE_SPACING,
  jumpCameraBobOffset
} from './player/constants';
import { HorseHeadTilt } from './player/HorseHeadTilt';
import { usePlayerMovement } from './player/usePlayerMovement';
import { usePlayerCamera } from './player/usePlayerCamera';
import { usePlayerAnimations } from './player/usePlayerAnimations';
import { usePlayerNetwork } from './player/usePlayerNetwork';
import { usePlayerStateMachine } from './player/usePlayerStateMachine';`;

const useFrameAndHooks = `
  const { updateMovement } = usePlayerMovement(setSpeed, addScore);
  const { updateCamera } = usePlayerCamera(camera);
  const { updateNetwork } = usePlayerNetwork();
  const { playAnimation, currentAnimationName, currentOverlayName, collisionHitsDuringOverlay, lastKickedAt } = usePlayerAnimations(horseRef);
  const { updateStateMachine, transitioningToRun, walk2RunStartedAt } = usePlayerStateMachine(playAnimation);

  useFrame((state, delta) => {
    if (!body.current || !isPlaying) return;

    const now = performance.now();
    const isStunned = stunnedUntil.current > now;
    const keys = getKeys();
    const isBoosting = keys.forward && keys.boost;

    if (keys.toggleView && !toggleViewWasDown.current) {
      isFirstPersonRef.current = !isFirstPersonRef.current;
      if (isFirstPersonRef.current) {
        mouseYawOffset.current = 0;
        mousePitchOffset.current = 0;
      }
    }
    toggleViewWasDown.current = keys.toggleView;

    if (keys.toggleLookPitch && !toggleLookPitchWasDown.current) {
      pitchUnlockedRef.current = !pitchUnlockedRef.current;
      if (!pitchUnlockedRef.current) mousePitchOffset.current = 0;
    }
    toggleLookPitchWasDown.current = keys.toggleLookPitch;

    const inputs = { ...keys, isBoosting };

    const { velocity, currentSpeed, forwardDir, displaySpeedKmh } = updateMovement(
      delta, body.current, inputs, isStunned, lastPosition
    );

    updateStateMachine(
      now, inputs, isStunned, currentSpeed, currentAnimationName.current
    );

    const wantsLean = !isStunned && !keys.jump && keys.forward && !keys.run && !isBoosting && (keys.left || keys.right);
    turnLeanInput.current.active = wantsLean;
    turnLeanInput.current.dir = keys.left ? 1 : -1;
    if (leanGroupRef.current) {
      const targetLean = wantsLean ? (keys.left ? WALK_LEAN_ANGLE : -WALK_LEAN_ANGLE) : 0;
      leanGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        leanGroupRef.current.rotation.z, targetLean, Math.min(1, delta * WALK_LEAN_SMOOTH_SPEED)
      );

      const walk2RunProgress = transitioningToRun.current
        ? THREE.MathUtils.clamp((now - walk2RunStartedAt.current) / WALK2RUN_DURATION_MS, 0, 1)
        : null;
      const targetForwardLean = walk2RunProgress !== null
          ? Math.sin(walk2RunProgress * Math.PI) * WALK2RUN_LEAN_ANGLE
          : 0;
      leanGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        leanGroupRef.current.rotation.x, targetForwardLean, Math.min(1, delta * WALK2RUN_LEAN_SMOOTH_SPEED)
      );
    }

    updateCamera(
      delta, body.current, isFirstPersonRef.current,
      mouseYawOffset.current, mousePitchOffset.current,
      forwardDir, currentSpeed, horseRef, keys.run
    );

    updateNetwork(
      state.clock.elapsedTime, body.current, velocity, displaySpeedKmh,
      currentAnimationName.current, currentOverlayName.current
    );
  });
`;

let newLines = [];
let skipMode = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Replace top constants with newImports
  if (i === 26) {
    newLines.push(newImports);
    skipMode = true;
    continue;
  }
  if (skipMode && line.includes('type Props = {')) {
    skipMode = false;
  }
  if (skipMode) continue;

  // Skip old refs
  if (line.includes('const currentAction = useRef<any>(null);')) continue;
  if (line.includes('const currentBaseAction = useRef<any>(null);')) continue;
  if (line.includes('const currentOverlayAction = useRef<any>(null);')) continue;
  if (line.includes('const currentAnimationName = useRef("IDLE");')) continue;
  if (line.includes('// Active overlay (kick) name so it can be broadcast alongside the base')) continue;
  if (line.includes('// animation. currentAnimationName tracks only base animations; without this')) continue;
  if (line.includes('// ref, peers never see kicks.')) continue;
  if (line.includes('const currentOverlayName = useRef<string | null>(null);')) continue;
  if (line.includes('const lastNetworkStateAt = useRef(0);')) continue;
  if (line.includes('const lastKickedAt = useRef(0);')) continue;
  if (line.includes('// WALK2RUN transition — true while the one-shot "picking up speed" clip is')) continue;
  if (line.includes('// playing on the way from WALK into the RUN loop.')) continue;
  if (line.includes('const transitioningToRun = useRef(false);')) continue;
  if (line.includes('const walk2RunStartedAt = useRef(0);')) continue;
  if (line.includes('const collisionHitsDuringOverlay = useRef<Set<number>>(new Set());')) continue;

  // Replace old useFrame
  if (line.includes('useFrame((state, delta) => {')) {
    newLines.push(useFrameAndHooks);
    skipMode = true;
    continue;
  }
  
  if (skipMode && line.trim() === 'return (') {
    // End of old playAnimation function and useFrame block
    // WAIT, actually the playAnimation was defined AFTER useFrame!
    // It's all skipped until `return (`
    skipMode = false;
  }

  if (skipMode) continue;

  newLines.push(line);
}

fs.writeFileSync('client/src/components/PlayerController.tsx', newLines.join('\\n'));
