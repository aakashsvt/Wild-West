const fs = require('fs');

const path = 'client/src/components/player/usePlayerMovement.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Update signature
code = code.replace(
  /isStunned: boolean,/,
  `stunState: "NONE" | "FALL" | "STUMBLE" | "KICKED",`
);

// 2. Update logic
code = code.replace(
  /    if \(isStunned\) \{\n      rb\.setLinvel\(\{ x: 0, y: linvel\.y, z: 0 \}, true\);\n      return \{\n        velocity: new Vector3\(0, linvel\.y, 0\),\n        currentSpeed: 0,\n        forwardDir: new Vector3\(0, 0, 1\) \/\/ default fallback\n      \};\n    \}/,
  `    if (stunState !== "NONE") {
      // If falling or kicked, stop completely. If stumbling, allow sliding momentum.
      if (stunState === "FALL" || stunState === "KICKED") {
        rb.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
      }
      return {
        velocity,
        currentSpeed: Math.sqrt(linvel.x ** 2 + linvel.z ** 2),
        forwardDir: new Vector3(0, 0, 1)
      };
    }`
);

fs.writeFileSync(path, code);
console.log("Updated usePlayerMovement");
