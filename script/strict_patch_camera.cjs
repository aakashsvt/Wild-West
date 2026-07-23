const fs = require('fs');
const path = 'client/src/components/player/usePlayerCamera.ts';
let code = fs.readFileSync(path, 'utf8');

// Normalize to LF so strict string replacing works
code = code.replace(/\r\n/g, '\n');

const hookDef = `export function usePlayerCamera(camera: PerspectiveCamera) {`;
const newHookDef = `export function usePlayerCamera(camera: PerspectiveCamera) {
  const shakeState = useRef({ intensity: 0, duration: 0, timeRemaining: 0 });

  const triggerShake = (intensity: number, duration: number) => {
    shakeState.current = { intensity, duration, timeRemaining: duration };
  };`;

const fileEnd = `      const desiredLookAt = CAM_LOOK_OFFSET.clone().add(horsePos);
      camera.lookAt(desiredLookAt);
      fpCameraSnapped.current = false;
    }
  };

  return { updateCamera };
}`;

const newFileEnd = `      const desiredLookAt = CAM_LOOK_OFFSET.clone().add(horsePos);
      camera.lookAt(desiredLookAt);
      fpCameraSnapped.current = false;
    }

    if (shakeState.current.timeRemaining > 0) {
      const { intensity, duration, timeRemaining } = shakeState.current;
      const decay = timeRemaining / duration;
      const t = performance.now() * 0.05;

      const yawShake = Math.sin(t) * 0.05 * intensity * decay;
      const pitchShake = Math.cos(t * 1.2) * 0.05 * intensity * decay;
      const rollShake = Math.sin(t * 1.5) * 0.02 * intensity * decay;
      
      const xOffset = Math.sin(t * 1.7) * 0.2 * intensity * decay;
      const yOffset = Math.cos(t * 1.3) * 0.2 * intensity * decay;

      camera.position.x += xOffset;
      camera.position.y += yOffset;
      camera.rotation.x += pitchShake;
      camera.rotation.y += yawShake;
      camera.rotation.z += rollShake;

      shakeState.current.timeRemaining -= delta;
    }
  };

  return { updateCamera, triggerShake };
}`;

if (!code.includes("triggerShake =")) {
  code = code.replace(hookDef, newHookDef);
  code = code.replace(fileEnd, newFileEnd);
  fs.writeFileSync(path, code);
  console.log("Successfully patched usePlayerCamera with triggerShake!");
} else {
  console.log("Already patched.");
}
