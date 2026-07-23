# Player Architecture & Collision Physics

This document outlines the architecture of the Player Controller and the hazard collision system. It serves as a blueprint for how movement, animations, and physics interact in the game.

## 1. Core Architecture: The Conductor Pattern
The `PlayerController.tsx` file no longer contains heavy game logic. Instead, it acts as a "Conductor", running exactly one `useFrame` loop that calls five single-responsibility hooks in a strict, sequenced order. This ensures zero race conditions and a stable 60fps loop.

The order of execution inside `useFrame`:
1. **`updateMovement`**: Reads player inputs and updates physics velocities.
2. **`updateStateMachine`**: Decides which animation should play based on the current velocity and inputs.
3. **Procedural Leaning**: Calculates physical leaning/banking for the horse model when turning.
4. **`updateCamera`**: Adjusts the First-Person or Third-Person camera to track the newly calculated position.
5. **`updateNetwork`**: Broadcasts the final calculated position, velocity, and animation states to the socket server.

---

## 2. The Hook Ecosystem (`client/src/components/player/`)

- **`constants.ts`**: Contains all magic numbers for the game (Max speeds, turn multipliers, FOV angles, durations). If you need to tweak the game feel, change it here.
- **`usePlayerMovement.ts`**: Handles Rapier `RigidBody` manipulation. Takes keyboard inputs and converts them into rotational quaternions and linear velocities.
- **`usePlayerStateMachine.ts`**: The brain of the animations. It evaluates the inputs and physics to spit out a strongly typed `PlayerState` enum.
- **`usePlayerAnimations.ts`**: Handles the Three.js `AnimationMixer`. It crossfades between base animations (Walk, Run) and dynamically masks leg tracks for overlay animations (Kicks).
- **`usePlayerCamera.ts`**: Manages the lerping of the camera position and dynamic Field of View (FOV) zooming based on sprint speed.
- **`usePlayerNetwork.ts`**: Throttles and dispatches state to the remote server.

---

## 3. The State Machine Enums
To prevent silent typos and ensure type safety, all animations are now strictly defined via Enums in `usePlayerStateMachine.ts`:

- **`PlayerState`**: Dictates the full-body movement (`IDLE`, `WALK`, `RUN`, `RUN_LEFT`, `RUN_RIGHT`, `JUMP`, `STUMBLE`, `FALL`).
- **`PlayerOverlayState`**: Dictates additive upper/lower body overlays (`RUN_KICK_LEFT`, `RUN_KICK_RIGHT`, `NONE`). Kicks can now be triggered from any non-stunned state.

---

## 4. The Hazard Collision System
Hazards are implemented using a detached, event-driven architecture to keep the movement logic clean.

### The `<Hazard />` Component
- A reusable component wrapping a `RigidBody type="fixed"`.
- Uses a `CuboidCollider` listening for `onCollisionEnter`.
- If the object hitting it is `name="player"`, it immediately dispatches a global JavaScript event: `"hazard-impact"` along with the severity (`minor` or `major`).

### Impact Resolution
Inside `PlayerController.tsx`, an event listener waits for `"hazard-impact"`:
1. **Minor Impact (The Stumble)**: 
   - Sets `stunState = "STUMBLE"` for 1000ms.
   - Instantly reduces the player's physical `RigidBody` velocity by exactly **50%**, allowing them to slide forward realistically while losing momentum.
2. **Major Impact (The Fall)**:
   - Sets `stunState = "FALL"` for 3000ms.
   - Instantly sets the player's physical `RigidBody` velocity to **0** for a hard stop.

When `stunState` is anything other than `"NONE"`, `usePlayerMovement` completely ignores all user keyboard inputs, locking their controls until the stun timer expires.
