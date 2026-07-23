const fs = require('fs');

let lines = fs.readFileSync('client/src/components/PlayerController.tsx.backup', 'utf-8').split('\n');
let constants = lines.slice(25, 233).join('\n');

// Safely replace 'const ' with 'export const ' for actual top-level constants
constants = constants.replace(/^const /gm, 'export const ');

// Fix the local variables inside the function that were accidentally exported
constants = constants.replace(/export const kf /g, 'const kf ')
                     .replace(/export const localY /g, 'const localY ')
                     .replace(/export const last /g, 'const last ')
                     .replace(/export const \[\s*t0/g, 'const [t0')
                     .replace(/export const \[\s*t1/g, 'const [t1');

// Ensure the function is exported
constants = constants.replace(/function jumpCameraBobOffset/, 'export function jumpCameraBobOffset');

const header = `import * as THREE from 'three';\nimport { Vector3 } from 'three';\n\n`;

fs.writeFileSync('client/src/components/player/constants.ts', header + constants);
console.log("Fixed constants.ts");
