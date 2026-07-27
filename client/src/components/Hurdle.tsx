import React, { useRef } from "react";
import { RigidBody, CuboidCollider, interactionGroups } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

type HurdleProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  thickness?: number;
};

export function Hurdle({ position, rotation = [0, 0, 0], width = 4, height = 1.2, thickness = 1.0 }: HurdleProps) {
  const [physicsType, setPhysicsType] = React.useState<"fixed" | "dynamic">("fixed");
  const [isHit, setIsHit] = React.useState(false);
  const rbRef = useRef<RapierRigidBody>(null);
  
  const postWidth = thickness;
  const barHeight = thickness;

  const handleCollision = (e: any) => {
    if (e.other.rigidBodyObject?.name === "player") {
      setPhysicsType("dynamic");
      setIsHit(true); // Make the hurdle a sensor so it stops physically blocking the horse
      
      const playerVelocity = e.other.rigidBody?.linvel() || { x: 0, y: 0, z: 0 };
      const speed = Math.hypot(playerVelocity.x, playerVelocity.z);

      // Give React/Rapier a frame to switch to dynamic, then apply a massive impulse!
      setTimeout(() => {
        if (rbRef.current) {
          const impulseDir = new THREE.Vector3(playerVelocity.x, 20, playerVelocity.z).normalize();
          rbRef.current.applyImpulse(impulseDir.multiplyScalar(400), true);
          rbRef.current.applyTorqueImpulse(new THREE.Vector3(Math.random() * 100, Math.random() * 100, Math.random() * 100), true);
        }
      }, 50);
      
      window.dispatchEvent(
        new CustomEvent("hazard-impact", {
          detail: {
            impactVelocity: speed,
            impactAngle: "hurdle",
          },
        }),
      );
    }
  };

  return (
    <RigidBody 
      ref={rbRef}
      type={physicsType} 
      position={position} 
      rotation={rotation}
      colliders={false}
      mass={5} 
      onCollisionEnter={handleCollision}
    >
      {/* Physics Collider (Solid, but low mass allows it to be knocked away) */}
      <CuboidCollider 
        args={[width / 2, height / 2, thickness / 2]} 
        position={[0, height / 2, 0]} 
        sensor={isHit}
      />

      {/* Visuals */}
      <group position={[0, 0, 0]}>
        {/* Left Post */}
        <mesh position={[-width / 2 + postWidth / 2, height / 2, 0]}>
          <boxGeometry args={[postWidth, height, postWidth]} />
          <meshStandardMaterial color="#8B4513" /> {/* Brown Wood Color */}
        </mesh>
        
        {/* Right Post */}
        <mesh position={[width / 2 - postWidth / 2, height / 2, 0]}>
          <boxGeometry args={[postWidth, height, postWidth]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        
        {/* Top Horizontal Bar */}
        <mesh position={[0, height - barHeight / 2, 0]}>
          <boxGeometry args={[width, barHeight, postWidth]} />
          <meshStandardMaterial color="#A0522D" /> {/* Slightly lighter brown */}
        </mesh>
      </group>
    </RigidBody>
  );
}
