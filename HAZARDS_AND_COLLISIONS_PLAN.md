# Task 2: Hazard Collisions & Impact Effects

## Overview
The goal of this task is to implement physics-accurate impact responses when the player crashes into hazards (e.g., jump hurdles, fences, or animals). Rather than overhauling the core movement system, we will use a high-visual-impact, low-risk approach utilizing Rapier physics, screen shake, and the existing stun state machine.

## Implementation Plan

### 1. Create the Hazard Component (`client/src/components/Hazard.tsx`)
We will create a standalone component that can be placed anywhere in the 3D world.
- **Physics**: Wrap the 3D model in a `<RigidBody type="fixed">` so it cannot be moved by the player but still registers physical impacts.
- **Collision Detection**: Add a `<CuboidCollider>` with an `onCollisionEnter` event listener.
- **The Bounce**: When the collider detects an object named `"player"`, it will grab the player's rigid body and apply a massive backwards physical impulse (`playerRb.applyImpulse({ x: 0, y: 5, z: -50 }, true)`).
- **The Signal**: Dispatch a global JavaScript event (`window.dispatchEvent(new CustomEvent("hazard-impact"))`) to notify the rest of the game.

### 2. Update `PlayerController.tsx`
We will hook into the existing "stun" logic (currently used for multiplayer kicks) to handle the hazard impact gracefully.
- **Event Listener**: Add a `useEffect` to listen for `"hazard-impact"`.
- **Lock Controls**: When the event fires, set `stunnedUntil.current = performance.now() + 2000` to lock the player's controls for 2 seconds.
- **Camera Shake**: Introduce a `cameraShakeTime` ref. On impact, set it to `0.5` seconds. Inside the `useFrame` camera logic, apply randomized `x` and `y` noise to the camera position while the shake timer is active.
- **Animation Blending**: Inside the `useFrame` stun check, change the fallback animation from `"IDLE"` to the designated impact/stumble animation from the `CowboyXHorse_NLA_V42` model.

## Why this approach?
- **High Visual Impact**: The combination of a physical bounce, a locked animation state, and violent camera shake feels incredibly polished to players and clients.
- **Low Risk**: By isolating the hazard logic into its own component and using a simple CustomEvent, we completely avoid tangling with the massive spaghetti code of the horse movement math.
- **Fast Execution**: This entire system can be built, polished, and edge-case tested within 2 to 3 days.
