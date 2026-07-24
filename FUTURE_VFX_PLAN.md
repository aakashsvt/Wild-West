# Future VFX and Audio Plan

The core physics and post-processing for hazard collisions are complete. The following are the remaining polish items to implement:

## 1. Particle Visual Effects (VFX)
Instantiating a quick particle emitter exactly at the point of collision:
- **Dust/Dirt kickup**.
- **Splinters/Debris** flying away from the wooden obstacle upon impact.

## 2. Layered Audio (SFX)
An impact needs multiple layered sounds triggered simultaneously:
- **Material Thud**: Wood breaking, metal clanging, or a dull dirt thud.
- **Vocalization**: The horse whinnying or neighing in distress.
- **Rider**: The cowboy grunting.

## 3. Controller Haptics
- Using the browser's `navigator.vibrate()` API if they are playing on mobile, or gamepad rumble API.
