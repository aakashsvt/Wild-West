import React, { useRef } from "react";
import { RigidBody, CuboidCollider, type RapierRigidBody, interactionGroups } from "@react-three/rapier";
import * as THREE from "three";

export type HazardSeverity = "minor" | "medium" | "major";

export type HazardImpactEventDetail = {
  impactVelocity: number;
  hazardPosition: THREE.Vector3Tuple;
  impactAngle?: string;
};

type HazardProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
  severity?: HazardSeverity;
  children?: React.ReactNode;
};

export function Hazard({
  position,
  rotation = [0, 0, 0],
  size = [1, 1, 1],
  severity = "minor",
  children
}: HazardProps) {
  const rb = useRef<RapierRigidBody>(null);

  const handleCollision = (e: any) => {
    // 1) Check if the collided object is the player
    if (e.other.rigidBodyObject?.name !== "player") return;
    
    // 2) Get exactly where on the Hazard the player hit (world space)
    let impactPoint = new THREE.Vector3(...position);
    if (e.manifold && e.manifold.solverContactPoint) {
       const p = e.manifold.solverContactPoint(0);
       if (p) impactPoint.set(p.x, p.y, p.z);
    }
    
    // 3) Get the player's position and forward direction
    const playerBody = e.other.rigidBody;
    const playerPos = playerBody.translation();
    const playerQuat = playerBody.rotation();
    
    const pVec = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
    
    // Direction vector from the player's center TO the exact impact point
    const dirToImpact = impactPoint.clone().sub(pVec).normalize();
    
    // The player's forward and right vectors based on their current rotation
    const quaternion = new THREE.Quaternion(playerQuat.x, playerQuat.y, playerQuat.z, playerQuat.w);
    // In our game, the horse models often face +Z or -Z depending on the start, but we use Euler(0, PLAYER_START_ROTATION_Y, 0).
    // Let's assume +Z is forward based on standard ThreeJS.
    const forwardVec = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
    const rightVec = new THREE.Vector3(-1, 0, 0).applyQuaternion(quaternion).normalize();
    
    // 4) DOT PRODUCT! This is how AAA games calculate angles for crashes.
    const forwardDot = dirToImpact.dot(forwardVec);
    const rightDot = dirToImpact.dot(rightVec);
    
    // Determine the string based on the dot products
    // forwardDot > 0.707 means it's within a 90-degree cone in FRONT of the player.
    // forwardDot < -0.707 means it's strictly BEHIND the player.
    let impactAngle = "main-body";
    
    if (forwardDot > 0.6) {
      if (rightDot > 0.4) impactAngle = "sensor-front-right";
      else if (rightDot < -0.4) impactAngle = "sensor-front-left";
      else impactAngle = "sensor-front";
    } else if (forwardDot < -0.5) {
      if (rightDot > 0.4) impactAngle = "sensor-rear-right";
      else if (rightDot < -0.4) impactAngle = "sensor-rear-left";
      else impactAngle = "sensor-rear";
    } else {
      // It's mostly on the side
      impactAngle = rightDot > 0 ? "sensor-right" : "sensor-left";
    }

    // 5) Calculate the impact intensity (force)
    const vel = playerBody.linvel();
    const impactVelocity = Math.hypot(vel.x, vel.z);
    
    // Convert string to plain English for the log
    const readableDirection = impactAngle.replace("sensor-", "").replace("-", " ").toUpperCase();
    console.log(`[IMPACT DIRECTION] Hit: ${readableDirection} (${impactAngle}) | Force: ${impactVelocity.toFixed(1)}`);

    // Dispatch a global event so the PlayerController can pick it up
    window.dispatchEvent(
      new CustomEvent<HazardImpactEventDetail>("hazard-impact", {
        detail: {
          impactVelocity,
          hazardPosition: position,
          impactAngle
        }
      })
    );
  };

  return (
    <RigidBody 
      ref={rb} 
      type="fixed" 
      position={position} 
      rotation={rotation}
      colliders={false}
      onCollisionEnter={handleCollision}
      collisionGroups={interactionGroups(2, [0, 1])}
    >
      <CuboidCollider 
        args={[size[0] / 2, size[1] / 2, size[2] / 2]} 
      />
      {children}
    </RigidBody>
  );
}
