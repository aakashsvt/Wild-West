const fs = require('fs');

const backup = fs.readFileSync('client/src/components/PlayerController.tsx.backup', 'utf8');
const lines = backup.split(/\r?\n/);
const returnIndex = lines.findIndex(l => l.trim() === 'return (');
const footer = lines.slice(returnIndex).join('\n');

const current = fs.readFileSync('client/src/components/PlayerController.tsx', 'utf8');
fs.writeFileSync('client/src/components/PlayerController.tsx', current + '\n' + footer);
console.log("Footer appended");
