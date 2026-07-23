const fs = require('fs');

const path = 'client/src/components/player/PlayerController.tsx';
let code = fs.readFileSync(path, 'utf8');

// The fuzzy matcher deleted from `toggleLookPitchWasDown` to `Math.min(1, delta * WALK_LEAN_SMOOTH_SPEED)`
// I will just read the backup, grab those lines, fix them, and insert them back in.
// Or just write the exact string manually.

code = code.replace(
  /if \(\!pitchUnlockedRef\.current\) mousePitchOffset\.current = 0;\n      \);/,
  `if (!pitchUnlockedRef.current) mousePitchOffset.current = 0;
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
      );`
);

fs.writeFileSync(path, code);
console.log("Restored missing lines and fixed isStunned to currentStunState");
