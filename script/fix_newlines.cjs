const fs = require('fs');
let code = fs.readFileSync('client/src/components/PlayerController.tsx', 'utf8');
code = code.replace(/\\n/g, '\n');
fs.writeFileSync('client/src/components/PlayerController.tsx', code);
