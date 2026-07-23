const fs = require('fs');

const path = 'client/src/components/player/usePlayerCamera.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Add shakeState ref inside the hook
code = code.replace(
  /export function usePlayerCamera\(camera: PerspectiveCamera\) \{/,
  `export function usePlayerCamera(camera: PerspectiveCamera) {\n  const shakeState = useRef({ intensity: 0, duration: 0, timeRemaining: 0 });\n\n  const triggerShake = (intensity: number, duration: number) => {\n    shakeState.current = { intensity, duration, timeRemaining: duration };\n  };`
);

// 2. Add shake logic at the VERY END of updateCamera and update the return statement
code = code.replace(
  /      camera\.lookAt\(desiredLookAt\);\n      fpCameraSnapped\.current = false;\n    \}\n  \};\n\n  return \{ updateCamera \};\n\}/,
  `      camera.lookAt(desiredLookAt);\n      fpCameraSnapped.current = false;\n    }\n\n    if (shakeState.current.timeRemaining > 0) {\n      const { intensity, duration, timeRemaining } = shakeState.current;\n      const decay = timeRemaining / duration;\n      const t = performance.now() * 0.05;\n\n      const yawShake = Math.sin(t) * 0.05 * intensity * decay;\n      const pitchShake = Math.cos(t * 1.2) * 0.05 * intensity * decay;\n      const rollShake = Math.sin(t * 1.5) * 0.02 * intensity * decay;\n      \n      const xOffset = Math.sin(t * 1.7) * 0.2 * intensity * decay;\n      const yOffset = Math.cos(t * 1.3) * 0.2 * intensity * decay;\n\n      camera.position.x += xOffset;\n      camera.position.y += yOffset;\n      camera.rotation.x += pitchShake;\n      camera.rotation.y += yawShake;\n      camera.rotation.z += rollShake;\n\n      shakeState.current.timeRemaining -= delta;\n    }\n  };\n\n  return { updateCamera, triggerShake };\n}`
);

fs.writeFileSync(path, code);
console.log("Successfully patched usePlayerCamera with triggerShake");
