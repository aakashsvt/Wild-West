const fs = require('fs');

// --- UPDATE usePlayerCamera.ts ---
const camPath = 'client/src/components/player/usePlayerCamera.ts';
let camCode = fs.readFileSync(camPath, 'utf8');

// Add shakeState ref
camCode = camCode.replace(
  /export function usePlayerCamera\(camera: PerspectiveCamera\) \{/,
  `export function usePlayerCamera(camera: PerspectiveCamera) {\n  const shakeState = useRef({ intensity: 0, duration: 0, timeRemaining: 0 });\n\n  const triggerShake = (intensity: number, duration: number) => {\n    shakeState.current = { intensity, duration, timeRemaining: duration };\n  };`
);

// Add the shake math at the end of updateCamera
camCode = camCode.replace(
  /camera\.updateProjectionMatrix\(\);\n  \};\n\n  return \{ updateCamera \};/,
  `camera.updateProjectionMatrix();\n\n    if (shakeState.current.timeRemaining > 0) {\n      const { intensity, duration, timeRemaining } = shakeState.current;\n      const decay = timeRemaining / duration;\n      const t = performance.now() * 0.05;\n\n      const yawShake = Math.sin(t) * 0.05 * intensity * decay;\n      const pitchShake = Math.cos(t * 1.2) * 0.05 * intensity * decay;\n      const rollShake = Math.sin(t * 1.5) * 0.02 * intensity * decay;\n      \n      const xOffset = Math.sin(t * 1.7) * 0.2 * intensity * decay;\n      const yOffset = Math.cos(t * 1.3) * 0.2 * intensity * decay;\n\n      camera.position.x += xOffset;\n      camera.position.y += yOffset;\n      camera.rotation.x += pitchShake;\n      camera.rotation.y += yawShake;\n      camera.rotation.z += rollShake;\n\n      shakeState.current.timeRemaining -= delta;\n    }\n  };\n\n  return { updateCamera, triggerShake };`
);

fs.writeFileSync(camPath, camCode);


// --- UPDATE PlayerController.tsx ---
const ctrlPath = 'client/src/components/player/PlayerController.tsx';
let ctrlCode = fs.readFileSync(ctrlPath, 'utf8');

if (!ctrlCode.includes('import { useControls, button } from "leva";')) {
  ctrlCode = ctrlCode.replace(
    /import \{ usePlayerNetwork \} from '\.\/usePlayerNetwork';/,
    `import { usePlayerNetwork } from './usePlayerNetwork';\nimport { useControls, button } from "leva";`
  );
}

ctrlCode = ctrlCode.replace(
  /const \{ updateCamera \} = usePlayerCamera\(camera\);/,
  `const { updateCamera, triggerShake } = usePlayerCamera(camera);\n\n  useControls("AAA Camera Shake", {\n    "Minor Impact": button(() => triggerShake(0.8, 0.3)),\n    "Major Impact": button(() => triggerShake(2.5, 0.7)),\n  });`
);

fs.writeFileSync(ctrlPath, ctrlCode);
console.log("Applied AAA camera shake and Leva controls!");
