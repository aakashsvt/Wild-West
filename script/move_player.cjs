const fs = require('fs');
const path = require('path');

const srcPath = 'client/src/components/PlayerController.tsx';
const destPath = 'client/src/components/player/PlayerController.tsx';

// 1. Move the file
let code = fs.readFileSync(srcPath, 'utf8');

// 2. Fix imports in PlayerController.tsx
code = code.replace(/from '\.\/player\//g, "from './");
code = code.replace(/from "\.\/CowboyXHorse_NLA_V42"/g, 'from "../CowboyXHorse_NLA_V42"');

fs.writeFileSync(destPath, code);
fs.unlinkSync(srcPath);

// 3. Update Game.tsx import
const gamePath = 'client/src/pages/Game.tsx';
let gameCode = fs.readFileSync(gamePath, 'utf8');
gameCode = gameCode.replace(/import \{ PlayerController \} from "@\/components\/PlayerController";/, 'import { PlayerController } from "@/components/player/PlayerController";');
fs.writeFileSync(gamePath, gameCode);

// 4. Remove backup if it exists
try {
  fs.unlinkSync('client/src/components/PlayerController.tsx.backup');
} catch (e) {}

console.log("Moved PlayerController and updated imports!");
