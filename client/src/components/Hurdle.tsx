import React, { useRef, useState } from "react";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

type HurdleProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  thickness?: number;
};

export function Hurdle({ position, rotation = [0, 0, 0], width = 4, height = 1.2, thickness = 1.0 }: HurdleProps) {
  const rbRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<THREE.Group>(null);
  const hasBeenHit = useRef(false);
  const [isFalling, setIsFalling] = useState(false);
  
  const postWidth = thickness;
  const barHeight = thickness;

  // Using onIntersectionEnter because the collider is ALWAYS a sensor.
  // This means the horse NEVER physically collides with the hurdle — it just passes through.
  const handleIntersection = (e: any) => {
    if (hasBeenHit.current) return; // Only trigger once
    if (e.other.rigidBodyObject?.name === "player") {
      hasBeenHit.current = true;
      setIsFalling(true);
      
      const playerVelocity = e.other.rigidBody?.linvel() || { x: 0, y: 0, z: 0 };
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
    }
  };

  // Animate the hurdle falling forward/backward when hit
  useFrame((_, delta) => {
    if (isFalling && groupRef.current) {
      // Rotate 90 degrees backwards smoothly
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        -Math.PI / 2,
        delta * 10
      );
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
