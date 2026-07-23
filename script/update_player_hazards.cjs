const fs = require('fs');

const targetPath = 'client/src/components/player/PlayerController.tsx';
let code = fs.readFileSync(targetPath, 'utf8');

// 1. Add stunState ref
code = code.replace(
  /const stunnedUntil = useRef<number>\(0\);/,
  `const stunnedUntil = useRef<number>(0);\n  const stunState = useRef<"NONE" | "FALL" | "STUMBLE" | "KICKED">("NONE");`
);

// 2. Update KICK_RANGE handler to set stunState
code = code.replace(
  /stunnedUntil\.current = performance\.now\(\) \+ 2000;/,
  `stunnedUntil.current = performance.now() + 2000;\n      stunState.current = "KICKED";`
);

// 3. Update useFrame to use stunState and reset it
code = code.replace(
  /const isStunned = stunnedUntil\.current > now;/,
  `const isStunned = stunnedUntil.current > now;\n    if (!isStunned) stunState.current = "NONE";\n    const currentStunState = isStunned ? stunState.current : "NONE";`
);

// 4. Update usePlayerStateMachine call
code = code.replace(
  /updateStateMachine\(\n      now, inputs, isStunned, currentSpeed, currentAnimationName\.current\n    \);/,
  `updateStateMachine(\n      now, inputs, currentStunState, currentSpeed, currentAnimationName.current\n    );`
);

// 5. Add useEffect for hazard-impact
const hazardEffect = `
  useEffect(() => {
    const handleHazard = (e: any) => {
      const { severity } = e.detail;
      if (severity === "major") {
        stunnedUntil.current = performance.now() + 3000;
        stunState.current = "FALL";
      } else {
        stunnedUntil.current = performance.now() + 1000;
        stunState.current = "STUMBLE";
      }
    };
    window.addEventListener("hazard-impact", handleHazard);
    return () => window.removeEventListener("hazard-impact", handleHazard);
  }, []);
`;

// Insert the hazard effect right before the useFrame block
code = code.replace(
  /  useFrame\(\(state, delta\) => \{/,
  `${hazardEffect}\n  useFrame((state, delta) => {`
);

// Wait, I need to make sure we reduce velocity in the physics when stumbling/falling!
// It was requested in HAZARDS_AND_COLLISIONS_PLAN.md:
// "Temporarily reduce the horse's speed by 30% to 50%. The momentum is interrupted but not stopped completely."
// "The horse's forward velocity drops to zero instantly."
// I should dispatch an event to the movement hook, or pass isStunned / currentStunState into updateMovement!
// Let's modify updateMovement signature in PlayerController:
code = code.replace(
  /const { velocity, currentSpeed, forwardDir, displaySpeedKmh } = updateMovement\(\n      delta, body\.current, inputs, isStunned, lastPosition\n    \);/,
  `const { velocity, currentSpeed, forwardDir, displaySpeedKmh } = updateMovement(\n      delta, body.current, inputs, currentStunState, lastPosition\n    );`
);


fs.writeFileSync(targetPath, code);
console.log("Updated PlayerController");
