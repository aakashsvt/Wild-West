import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, type RapierRigidBody, CuboidCollider } from "@react-three/rapier";
import { useRef } from "react";
import { Vector3, Quaternion, Euler } from "three";
import { useKeyboardControls } from "@react-three/drei";
import { useGameStore } from "@/hooks/use-game-store";
import { Model } from "./CowboyXHorse_GLB_v01";
import { BotHorses } from "./BotHorses";

const PLAYER_START_POSITION: [number, number, number] = [-340, 5.5787, 410];
const MAX_SPEED = 30;
const ACCELERATION = 50;
const TURN_SPEED = 8;
const BRAKE_FORCE = 5;

export function PlayerController() {
  const horseRef = useRef<any>(null);
  const currentAction = useRef<any>(null);
  const body = useRef<RapierRigidBody>(null);
  const [, getKeys] = useKeyboardControls();
  const { setSpeed, addScore, isPlaying } = useGameStore();
  const camera = useThree((state) => state.camera);

  // Smoothing camera
  const cameraTarget = useRef(new Vector3());
  const cameraPosition = useRef(new Vector3());

  // Store distance traveled for scoring
  const lastPosition = useRef(new Vector3());

  useFrame((state, delta) => {
    if (!body.current || !isPlaying) return;

    const { forward, backward, left, right, jump } = getKeys();


    const impulse = { x: 0, y: 0, z: 0 };
    const torque = { x: 0, y: 0, z: 0 };

    const linvel = body.current.linvel();
    const currentSpeed = Math.sqrt(linvel.x ** 2 + linvel.z ** 2);
    const { x, y, z } = body.current.translation();

    // Update global speed state for HUD
    setSpeed(Math.round(currentSpeed * 2)); // Fake km/h

    // Calculate rotation
    const rotation = body.current.rotation();
    const eulerRot = new Euler().setFromQuaternion(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));

    // Movement Logic
    const direction = new Vector3(0, 0, 1).applyEuler(eulerRot);
    if (jump) {
      playAnimation("JUMP");
    } else if (forward) {
      if (left) {
        playAnimation("RUN_LEFT"); // if exists, else RUN
      } else if (right) {
        playAnimation("RUN_RIGHT"); // optional
      } else {
        playAnimation("RUN");
      }
    } else if (backward) {
      playAnimation("WALK");
    } else if (left) {
      playAnimation("TURN_LEFT");
    } else if (right) {
      playAnimation("TURN_RIGHT");
    } else {
      if (currentSpeed > 15) {
        playAnimation("RUN");
      } else if (currentSpeed > 6) {
        playAnimation("WALK");
      } else {
        playAnimation("IDLE");
      }
    }
    if (forward && currentSpeed < MAX_SPEED) {
      impulse.x += direction.x * ACCELERATION * delta;
      impulse.z += direction.z * ACCELERATION * delta;

    }

    if (backward) {
      impulse.x -= direction.x * BRAKE_FORCE * delta;
      impulse.z -= direction.z * BRAKE_FORCE * delta;
    }

    if (left) {
      torque.y += TURN_SPEED * delta;
      // Banking effect
      // torque.z -= TURN_SPEED * 0.5 * delta;
    }

    if (right) {
      torque.y -= TURN_SPEED * delta;
      // Banking effect
      // torque.z += TURN_SPEED * 0.5 * delta;
    }

    // Apply forces
    body.current.applyImpulse(impulse, true);
    body.current.applyTorqueImpulse(torque, true);

    // Camera Follow Logic (Third Person)
    const bodyPos = body.current.translation();
    const posVec = new Vector3(bodyPos.x, bodyPos.y, bodyPos.z);

    // Calculate distance score
    const dist = posVec.distanceTo(lastPosition.current);
    if (dist > 0.1) {
      addScore(Math.floor(dist));
      lastPosition.current.copy(posVec);
    }

    // Camera target is slightly above the player
    const targetOffset = new Vector3(0, 5, 0);
    const desiredTarget = posVec.clone().add(targetOffset);
    cameraTarget.current.lerp(desiredTarget, 0.1);


    const camOffset = new Vector3(0, 6, -12).applyEuler(eulerRot);
    const desiredCamPos = posVec.clone().add(camOffset);

    // Smooth camera movement
    cameraPosition.current.lerp(desiredCamPos, 0.05);

    camera.position.copy(cameraPosition.current);
    camera.lookAt(cameraTarget.current);


    console.log("speed", x, y, z, direction, impulse, torque);
  });

  const playAnimation = (name: string) => {
    const actions = horseRef.current?.actions;
    if (!actions || !actions[name]) return;

    const next = actions[name];

    if (currentAction.current === next) return;

    currentAction.current?.fadeOut(0.2);
    next.reset().fadeIn(0.2).play();

    currentAction.current = next;
  };

  return (
    <>
      <RigidBody
        ref={body}
        position={PLAYER_START_POSITION}
        // position={[500, 6.5787, 0]}
        rotation={[0, 1.2, 0]}
        colliders={false}
        mass={1}
        friction={1}
        restitution={0.8}
        linearDamping={1}
        angularDamping={1}
        canSleep={false}
        enabledRotations={[true, true, true]} // Allow some tilt? Maybe lock X/Z for simpler arcade feel
      >
        {/* <CuboidCollider args={[0.5, 0.5, 2.2]} position={[0, 0.5, 0]} restitution={0.2} /> */}
        <CuboidCollider args={[1.5, 0.2, 0.2]} position={[0, 0.5, 2]} />
        <CuboidCollider args={[1.5, 0.2, 0.2]} position={[0, 0.5, -2]} />
        <CuboidCollider args={[0.2, 0.2, 2]} position={[0.5, 0.5, 0]} />
        <CuboidCollider args={[0.2, 0.2, 2]} position={[-0.5, 0.5, 0]} />
        {/* <CuboidCollider args={[0.5, 1, 2]} position={[0, 1.7, 0]} /> */}
        <Model ref={horseRef} />
      </RigidBody>
      <BotHorses playerBodyRef={body} playerStartPosition={PLAYER_START_POSITION} />
    </>
  );
}
