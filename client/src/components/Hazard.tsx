import React, { useRef } from "react";
import { RigidBody, CuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

export type HazardSeverity = "minor" | "medium" | "major";

export const IMPACT_THRESHOLDS = {
  MINOR: 20,
  MEDIUM: 40
};

export type HazardImpactEventDetail = {
  severity: HazardSeverity;
  hazardPosition: THREE.Vector3Tuple;
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
    // Check if the collided object is the player
    if (e.other.rigidBodyObject && e.other.rigidBodyObject.name === "player") {
      
      // Calculate the impact intensity (force) based on the player's velocity at the exact moment of collision
      let impactVelocity = 0;
      if (e.other.rigidBody) {
        const vel = e.other.rigidBody.linvel();
        impactVelocity = Math.hypot(vel.x, vel.y, vel.z);
      }

      let dynamicSeverity: HazardSeverity = "minor";
      if (impactVelocity >= IMPACT_THRESHOLDS.MEDIUM) {
        dynamicSeverity = "major";
      } else if (impactVelocity >= IMPACT_THRESHOLDS.MINOR) {
        dynamicSeverity = "medium";
      }

      console.log(`💥 [HAZARD IMPACT] Player hit obstacle with a velocity force of: ${impactVelocity.toFixed(2)} units/sec! (Severity: ${dynamicSeverity})`);

      // Dispatch a global event so the PlayerController can pick it up
      window.dispatchEvent(
        new CustomEvent<HazardImpactEventDetail>("hazard-impact", {
          detail: {
            severity: dynamicSeverity,
            hazardPosition: position,
          }
        })
      );
    }
  };

  return (
    <RigidBody ref={rb} type="fixed" position={position} rotation={rotation}>
      <CuboidCollider 
        args={[size[0] / 2, size[1] / 2, size[2] / 2]} 
        onCollisionEnter={handleCollision} 
      />
      {children}
    </RigidBody>
  );
}
