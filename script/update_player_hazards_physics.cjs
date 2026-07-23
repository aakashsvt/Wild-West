const fs = require('fs');

const path = 'client/src/components/player/PlayerController.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /if \(severity === "major"\) \{/,
  `if (severity === "major") {
        if (body.current) {
          const vel = body.current.linvel();
          body.current.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
        }`
);

code = code.replace(
  /\} else \{\n        stunnedUntil.current = performance.now\(\) \+ 1000;\n        stunState.current = "STUMBLE";\n      \}/,
  `} else {
        stunnedUntil.current = performance.now() + 1000;
        stunState.current = "STUMBLE";
        if (body.current) {
          const vel = body.current.linvel();
          body.current.setLinvel({ x: vel.x * 0.5, y: vel.y, z: vel.z * 0.5 }, true);
        }
      }`
);

fs.writeFileSync(path, code);
console.log("Updated PlayerController with physics response");
