import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, type RapierRigidBody, CuboidCollider } from "@react-three/rapier";
import { useRef, useState } from "react";
import { Vector3, Quaternion, Euler } from "three";
import { useKeyboardControls } from "@react-three/drei";
import { useGameStore } from "@/hooks/use-game-store";
import { Car } from "./Car";
const MAX_SPEED = 40;
const ACCELERATION = 80;
const TURN_SPEED = 3.5;
const BRAKE_FORCE = 5;
const JUMP_FORCE = 10; // Simple jump if stuck
const HEIGHT = 5;

export function PlayerController() {
  const body = useRef<RapierRigidBody>(null);
  const [subscribeKeys, getKeys] = useKeyboardControls();
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
    const targetOffset = new Vector3(0, 2, 0);
    const desiredTarget = posVec.clone().add(targetOffset);
    cameraTarget.current.lerp(desiredTarget, 0.1);


    const camOffset = new Vector3(0, 10, -16).applyEuler(eulerRot);
    const desiredCamPos = posVec.clone().add(camOffset);

    // Smooth camera movement
    cameraPosition.current.lerp(desiredCamPos, 0.05);

    camera.position.copy(cameraPosition.current);
    camera.lookAt(cameraTarget.current);
  });

  return (
    <RigidBody
      ref={body}
      position={[-340, 5.5787, 410]}
      rotation={[0, 1.396, 0]}
      colliders={false}
      mass={1}
      friction={0.5}
      restitution={0.2}
      linearDamping={0.5}
      angularDamping={0.5}
      canSleep={false}
      enabledRotations={[true, true, true]} // Allow some tilt? Maybe lock X/Z for simpler arcade feel
    >
      <CuboidCollider args={[0.5, 0.5, 1.2]} position={[0, 0.5, 0]} />
      {/* Bike Model Placeholder - could be a loaded GLB */}
      <Car />
      {/* <group>
      
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.8, 0.8, 2.5]} />
          <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
        </mesh>

       
        <mesh position={[0, 0.4, 1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.4, 16]} />
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[0, 0.4, -1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.4, 16]} />
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.2} />
        </mesh>

     
        <mesh position={[0, 0.8, 1.2]}>
          <boxGeometry args={[0.4, 0.2, 0.2]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={2} />
        </mesh>
        <pointLight position={[0, 1, 1.5]} intensity={2} color="#ffff00" distance={10} />
      </group> */}
    </RigidBody>
  );
}
