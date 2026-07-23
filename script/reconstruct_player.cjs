const fs = require('fs');

const path = 'client/src/components/player/PlayerController.tsx';
let code = fs.readFileSync(path, 'utf8');

// The file is corrupted. I will replace the entire useFrame function.
// Let's find where useFrame starts and ends.
const useFrameStart = code.indexOf('useFrame((state, delta) => {');
const useFrameEnd = code.lastIndexOf('});') + 3;

if (useFrameStart === -1 || useFrameEnd === -1) {
  console.log("Could not find useFrame block");
  process.exit(1);
}

const newUseFrame = `useFrame((state, delta) => {
    if (!body.current || !isPlaying) return;

    const now = performance.now();
    const isStunned = stunnedUntil.current > now;
    if (!isStunned) stunState.current = "NONE";
    const currentStunState = isStunned ? stunState.current : "NONE";
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
      delta, body.current, inputs, currentStunState, lastPosition
    );

    updateStateMachine(
      now, inputs, currentStunState, currentSpeed, currentAnimationName.current
    );

    const wantsLean = currentStunState === "NONE" && !keys.jump && keys.forward && !keys.run && !isBoosting && (keys.left || keys.right);
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
  });`;

const before = code.substring(0, useFrameStart);
const after = code.substring(useFrameEnd);

fs.writeFileSync(path, before + newUseFrame + after);
console.log("Successfully replaced useFrame");
