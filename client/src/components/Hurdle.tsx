import React, { useRef, useState } from "react";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getPlayerBody } from "./player/playerBody";

type HurdleProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  thickness?: number;
};

// Reusable vectors to avoid per-frame GC
const _playerPos = new THREE.Vector3();
const _hurdleCenter = new THREE.Vector3();
const _localPos = new THREE.Vector3();
const _invQuat = new THREE.Quaternion();

export function Hurdle({ position, rotation = [0, 0, 0], width = 4, height = 1.2, thickness = 1.0 }: HurdleProps) {
  const rbRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<THREE.Group>(null);
  const hasBeenHit = useRef(false);
  const [isFalling, setIsFalling] = useState(false);
  
  const postWidth = thickness;
  const barHeight = thickness;

  // Sensor half-extents (must match the CuboidCollider args below)
  const sensorHalfX = width / 2;
  const sensorHalfY = height / 2;
  const sensorHalfZ = 2.5;

  const dispatchHurdleImpact = (playerVelocity: { x: number; y: number; z: number }) => {
    if (hasBeenHit.current) return;
    hasBeenHit.current = true;
    setIsFalling(true);

    const speed = Math.hypot(playerVelocity.x, playerVelocity.z);

    // Dispatch event for stumble animation + camera shake
    window.dispatchEvent(
      new CustomEvent("hazard-impact", {
        detail: {
          impactVelocity: speed,
          impactAngle: "hurdle",
          hazardPosition: position,
        },
      }),
    );
  };

  // Using onIntersectionEnter because the collider is ALWAYS a sensor.
  // This means the horse NEVER physically collides with the hurdle — it just passes through.
  const handleIntersection = (e: any) => {
    if (hasBeenHit.current) return; // Only trigger once
    if (e.other.rigidBodyObject?.name === "player") {
      const vel = e.other.rigidBody?.linvel() || { x: 0, y: 0, z: 0 };
      dispatchHurdleImpact(vel);
    }
  };

  // Continuous overlap check for very slow speeds where Rapier's discrete
  // sensor intersection events can be missed by the broad-phase.
  const checkTimer = useRef(0);
  
  useFrame((_, delta) => {
    // Animate the hurdle falling forward/backward when hit
    if (isFalling && groupRef.current) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        -Math.PI / 2,
        delta * 10
      );
      return;
    }

    if (hasBeenHit.current || !rbRef.current) return;

    // Throttle to every ~150ms for performance
    checkTimer.current += delta;
    if (checkTimer.current < 0.15) return;
    checkTimer.current = 0;

    // Get the player's RigidBody from the global singleton
    const playerRb = getPlayerBody();
    if (!playerRb) return;

    const pTrans = playerRb.translation();
    _playerPos.set(pTrans.x, pTrans.y, pTrans.z);

    // Get hurdle world position and rotation from the Rapier body
    const hTrans = rbRef.current.translation();
    const hRot = rbRef.current.rotation();
    
    // The sensor center is offset by [0, height/2, 0] in local space
    _hurdleCenter.set(hTrans.x, hTrans.y + sensorHalfY, hTrans.z);

    // Transform player position into hurdle's local space
    _localPos.copy(_playerPos).sub(_hurdleCenter);
    _invQuat.set(hRot.x, hRot.y, hRot.z, hRot.w).invert();
    _localPos.applyQuaternion(_invQuat);

    // Check if the player center is inside the sensor box (AABB test in local space)
    const margin = 1.5; // Extra margin for the player's own collider radius
    if (
      Math.abs(_localPos.x) < sensorHalfX + margin &&
      Math.abs(_localPos.y) < sensorHalfY + margin &&
      Math.abs(_localPos.z) < sensorHalfZ + margin
    ) {
      const vel = playerRb.linvel();
      dispatchHurdleImpact(vel);
    }
  });

  return (
    <RigidBody 
      ref={rbRef}
      type="fixed"
      position={position} 
      rotation={rotation}
      colliders={false}
    >
      {/* 
        ALWAYS a sensor — the horse passes right through without any physics blocking.
        Detection happens via onIntersectionEnter.
        Z thickness is increased to 2.5 to prevent high-speed tunneling without CCD.
      */}
      <CuboidCollider 
        args={[width / 2, height / 2, 2.5]} 
        position={[0, height / 2, 0]} 
        sensor
        onIntersectionEnter={handleIntersection}
      />

      {/* Visuals */}
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* Left Post */}
        <mesh position={[-width / 2 + postWidth / 2, height / 2, 0]}>
          <boxGeometry args={[postWidth, height, postWidth]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        
        {/* Right Post */}
        <mesh position={[width / 2 - postWidth / 2, height / 2, 0]}>
          <boxGeometry args={[postWidth, height, postWidth]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        
        {/* Top Horizontal Bar */}
        <mesh position={[0, height - barHeight / 2, 0]}>
          <boxGeometry args={[width, barHeight, postWidth]} />
          <meshStandardMaterial color="#A0522D" />
        </mesh>
      </group>
    </RigidBody>
  );
}
