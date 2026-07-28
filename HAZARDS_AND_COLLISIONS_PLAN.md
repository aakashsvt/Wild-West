# Task 2: Hazard Collisions & Impact Effects

## Overview
The goal of this task is to implement physics-accurate impact responses when the player crashes into hazards (e.g., jump hurdles, fences, or animals). Rather than overhauling the core movement system, we will use a high-visual-impact, low-risk approach utilizing Rapier physics, screen shake, and the existing stun state machine.

## Collision Behaviors

Based on the severity of the impact, the horse will exhibit one of two behaviors:

### 1. Minor Collision (The "Stumble")
- **Trigger**: The horse is moving at a slow speed (walking/trotting) and hits an obstacle, or clips a small obstacle/side-collision at higher speeds.
- **Behavior**:
  - **Animation**: Play the **Stumble** animation.
  - **Physics/Movement**: Temporarily reduce the horse's speed by 30% to 50%. The momentum is interrupted but not stopped completely.
  - **Recovery**: Blend back into normal movement (walk/trot/gallop) and recover speed after the animation finishes.

### 2. Major Collision (The "Fall")
- **Trigger**: The horse is moving at a high speed (cantering/galloping) and hits a large, solid obstacle dead-on.
- **Behavior**:
  - **Animation**: Play the **Fall** animation.
  - **Physics/Movement**: The horse's forward velocity drops to zero instantly. (If applicable, the rider is dismounted or thrown).
  - **Recovery**: Play a **"Get Up"** animation to transition back to an idle state before controls are unlocked.

## Implementation Plan

### 1. Create the Hazard Component (`client/src/components/Hazard.tsx`)
We will create a standalone component that can be placed anywhere in the 3D world.
- **Physics**: Wrap the 3D model in a `<RigidBody type="fixed">` so it cannot be moved by the player but still registers physical impacts.
- **Collision Detection**: Add a `<CuboidCollider>` with an `onCollisionEnter` event listener. Calculate the impact severity (based on player velocity) during the collision.
- **The Bounce**: When the collider detects an object named `"player"`, apply a backwards physical impulse to the player based on the collision severity.
- **The Signal**: Dispatch a global JavaScript event (`window.dispatchEvent(new CustomEvent("hazard-impact", { detail: { severity: "minor" | "major" } }))`) to notify the rest of the game.

### 2. Update `PlayerController.tsx`
We will hook into the existing "stun" logic (currently used for multiplayer kicks) to handle the hazard impact gracefully.
- **Event Listener**: Add a `useEffect` to listen for `"hazard-impact"` and read the `severity` from the event detail.
- **Lock Controls**: When the event fires, set `stunnedUntil.current` based on severity (e.g., 1000ms for stumble, 3000ms for fall) to lock the player's controls.
- **Camera Shake**: Introduce a `cameraShakeTime` ref. On impact, set it to `0.5` seconds (longer for major collisions). Inside the `useFrame` camera logic, apply randomized `x` and `y` noise to the camera position while the shake timer is active.
- **Animation Blending**: Inside the `useFrame` stun check, change the fallback animation from `"IDLE"` to the designated **Stumble** or **Fall** animation from the `CowboyXHorse_NLA_V42` model based on the impact severity.

## Why this approach?
- **High Visual Impact**: The combination of a physical bounce, a locked animation state, and violent camera shake feels incredibly polished to players and clients.
- **Low Risk**: By isolating the hazard logic into its own component and using a simple CustomEvent, we completely avoid tangling with the massive spaghetti code of the horse movement math.
- **Fast Execution**: This entire system can be built, polished, and edge-case tested within 2 to 3 days.

## 5. AAA Polish & "Game Feel" Factors
To elevate the collision system from a basic web game to a production-level AAA experience (like Red Dead Redemption), we will inject these crucial "Game Feel" elements:

### A. Camera Shake (Screen Shake)
The camera must physically react to the impact. 
- **Minor Stumble**: A quick, sharp jolt on the Y-axis. (Intensity: 0.3, Duration: 0.2s)
- **Major Fall**: A violent, multi-axis shaking with noise that takes 0.5 seconds to decay. (Intensity: 1.0, Duration: 0.5s)

### B. Hit-Stop (Time Dilation)
The secret to heavy, meaty impacts in AAA games (like Zelda or God of War) is "Hit-Stop". 
- For a **Major Fall**, we briefly pause the animation and physical movement for **~50 milliseconds** the exact frame the horse hits the wall, before violently throwing the horse backward. This tricks the brain into feeling immense weight.

### C. Layered Audio (SFX)
An impact needs multiple layered sounds triggered simultaneously:
- **Material Thud**: Wood breaking, metal clanging, or a dull dirt thud.
- **Vocalization**: The horse whinnying or neighing in distress.
- **Rider**: The cowboy grunting.

### D. Particle Visual Effects (VFX)
Instantiating a quick particle emitter exactly at the point of collision:
- **Dust/Dirt kickup**.
- **Splinters/Debris** flying away from the obstacle.

### E. Post-Processing & UI
- **Chromatic Aberration / Radial Blur**: For a major fall, briefly distorting the screen edges to simulate the rider's disorientation.
- **Controller Haptics**: Using the browser's `navigator.vibrate()` API if they are playing on mobile, or gamepad rumble API.

## Progress Checkpoint (Completed)

As of the current implementation, we have successfully architected and built the following AAA physics and collision features:

- **Unified Impact System (usePlayerImpacts.ts)**: Extracted all stun logic from the PlayerController into a centralized hook. This hook successfully arbitrates both environmental collisions (hazards) and multiplayer interactions (kicks) with priority protection (minor impacts cannot overwrite major stun timers).
- **Procedural Obstacle Spawning**: Developed Obstacle.tsx and ObstacleSpawner.tsx to procedurally drop physics-based wooden cubes along the track spline, serving as interactive hazards.
- **Dynamic Physics Measurement**: Hazard.tsx now acts as a pure sensor. On collision, it broadcasts the precise impactVelocity via a global event, allowing the game logic to categorize it dynamically rather than relying on hardcoded triggers.
- **Live-Tuning Leva UI**: Introduced an ""Impact Thresholds"" folder in the Leva UI so severity brackets (minorSpeed, majorSpeed) can be tuned in real-time.
- **Active Physics Recoil (usePlayerMovement.ts)**: Solved the issue where Rapier's harsh linearDamping and track friction would swallow collisions by actively applying a continuous backwards velocity curve during the first ~300ms of a stun, forcefully separating the player from the obstacle wall.
- **Reverse Animations & TimeScale Manipulation**: Upgraded usePlayerAnimations.ts to accept mathematical 	imeScale parameters. We completely removed the static forward stumble animation (which clipped into walls) and replaced it with a physics-driven, reverse-walk animation (	imeScale = -1.5) that perfectly syncs with the physical recoil. This is also applied when the player naturally holds the S (Backward) key.
- **Centralized Constants**: Extracted all physics multipliers, stun durations, and animation speeds out of component logic into properly named, modular constants in constants.ts.

- **Hit-Stop (Time Dilation)**: Implemented an engine-level freeze frame upon impact. The `PlayerController` intercepts the `useFrame` loop, zeroes out the `Rapier` rigid body velocity, and halts the `AnimationMixer` via an exposed `useImperativeHandle` from the GLTF component. The physical recoil bounce is delayed until the hit-stop timer resolves.
- **Hit-Stop Leva Controls**: Added configurable time-dilation durations (e.g. 250ms for major, 100ms for medium) to the UI so developers can live-tune the kinesthetic weight of the crash.
- **Bug Fix - Camera Near Clipping**: Decreased the `<Canvas>` camera `near` plane to `0.05` to prevent the horse mesh from getting sliced when backing up directly into the lens.
- **Bug Fix - Skinned Mesh Frustum Culling**: Selectively applied `frustumCulled={false}` to the `Jeans002` and `Boot002` sub-meshes to prevent the rider's legs from popping out of existence during the reverse-walk animation, preserving overall performance for remote players.
- **Bug Fix - Camera Sprint Offset**: Updated `PlayerController` to restrict the third-person zoom-out effect to `keys.run && keys.forward`, preventing awkward camera snaps when pressing Shift while standing still.

## Progress Checkpoint 2 (Completed)

- **Post-Processing Pipeline Refactoring**: Extracted a massive block of shaders and post-processing nodes out of `Game.tsx` into a dedicated, single-responsibility `PostProcessingPipeline.tsx` component.
- **Dynamic Chromatic Aberration**: Repurposed the custom `ColorGradeShader` to handle RGB channel splitting natively, saving performance over adding a new pass. Triggered via a `hazard-impact` listener with slow decay to simulate a concussion.
- **Dynamic Color Drain**: Added dynamic desaturation alongside the glitch. Major crashes instantly drain the world to near black-and-white, slowly bleeding back to normal over ~5 seconds.
- **Bug Fix - Delta Time Spiral**: Capped `delta` time inside the post-processing `useFrame` loop to `100ms` max, preventing a known bug where switching browser tabs caused the time delta to multiply and permanently break the shader math.
- **Crash Effect Debug UI**: Added a `Leva` panel to instantly A/B test the glitch and color drain effects individually.
- **Accurate Directional Impact Angle Math**: Upgraded `Hazard.tsx` to read the exact physics `contact normal` (`e.manifold.normal()`) instead of the obstacle's center position. Added a strict dot-product threshold (0.80) to flawlessly differentiate between direct Head-On crashes, Side-Swipes, and Rear-End collisions.
- **Side-Swipe Stumble System**: Routed the new `impactAngle` through the system. Side-swiping a fence no longer triggers a massive Hit-Stop or color drain. Instead, it triggers a minor micro-glitch, a 30% speed reduction, and properly triggers the horse's built-in `STUMBLE` animation clip without breaking forward momentum.

## Progress Checkpoint 3 (Completed Today)

- **Hurdle Mechanics Overhaul**: Completely re-engineered Hurdles. They are now permanent `sensor` objects so the horse seamlessly passes through them instead of bouncing backward. Fixed high-speed "tunneling" by thickening the detection zone.
- **Cinematic Hurdle Destruction**: Instead of using buggy Rapier `dynamic` physics (which caused them to fall through the world), hurdles now execute a smooth -90 degree visual tipping animation via `useFrame` when smashed.
- **Render Loop Garbage Collection (Performance)**: Eliminated GC stuttering in `usePlayerCamera.ts` and `usePlayerMovement.ts` by replacing per-frame object instantiations (`new Vector3()`) with persistent module-level static vectors.
- **Animation Memory Leak Fix**: Patched a massive memory leak in `usePlayerAnimations.ts` by correctly tracking and cleaning up interrupted Three.js `AnimationMixer` event listeners.
- **UI Damage Overlay (`DamageOverlay.tsx`)**: Replaced the expensive post-processing color drain with a highly-performant UI layer using `framer-motion`. Displays a black vignette for regular obstacle impacts, and a distinct, sharp red-and-black flash specifically for hurdle crashes.
- **Loss of Control Mechanics**: Enhanced the kinesthetic weight of a hurdle crash by completely freezing steering and acceleration inputs during the stumble animation, forcing the player into a helpless forward coast at 60% speed until recovery.
- **3D Particle VFX (`ImpactVFXManager.tsx`)**: Built a zero-garbage, high-performance particle system using `THREE.InstancedMesh`. Smashing hurdles triggers an explosion of 50 wooden splinters, while crashing into major obstacles blasts 35 chunks of dirt/rock debris. Particles possess full simulated gravity and rotational velocity, lingering for ~1.5s before rapidly shrinking away.

*(Future VFX and Audio tasks have been migrated to `FUTURE_VFX_PLAN.md`)*

## Progress Checkpoint 4 (Completed Today)

- **Removed Hit-Stop Mechanics**: Removed the engine-level freeze frame (time dilation) from all minor, medium, and major obstacle collisions. Recoil forces now apply instantly for smoother pacing.
- **Collision Balance**: Reduced the backward recoil physical force on major head-on collisions by 30%.
- **Hurdle Dual-Detection Physics**: Fixed a bug where Rapier's discrete `onIntersectionEnter` sensors would fail to register slow-moving horses. Built a `useFrame` AABB distance-overlap fallback to guarantee detection at a crawl.
- **Global Player Singleton**: Created a highly performant `playerBody.ts` module singleton to store the player's `RigidBody` and real-time state, bypassing deep React prop threading.
- **Dynamic Jump Height Collisions**: Resolved an issue where jumping was purely cosmetic and still resulted in crashes. The physics engine now reads the exact, millisecond-accurate `jumpHeight` of the saddle from the animation curve. If the horse's vertical height clears 50% of the hurdle's physical height, the collision is seamlessly bypassed for a clean jump. Jumping too early/late accurately results in a crash.
- **Procedural Hurdle Variation**: Increased the spawn density of hurdles on the track and added procedural height randomization (between 70% and 130% of the base size).
- **Debug Utilities**: Added a new Leva UI panel with buttons to "Reset Player Position" (teleport back to spawn) and "Reset Obstacles" (remounts the physics track).
- **Custom WebGL Profiling**: Built a custom `DrawCallOverlay` to accurately profile GPU performance. It safely hooks into the core `WebGLRenderer` to accumulate the true sum of Draw Calls and Triangles across *all* Post-Processing passes, overcoming a bug where Three.js resets the counter per-pass.
- **Massive Physics & React Optimization (Walls)**: Completely rewrote the `Track1.tsx` terrain boundary generation. Consolidated **600 distinct RigidBodies** into **1 single Fixed RigidBody** utilizing compound mathematical colliders. Completely deleted 600 invisible WebGL meshes that were pointlessly taxing the JS Heap and React reconciler. This eliminated the massive CPU bottleneck and locked in smooth FPS.
