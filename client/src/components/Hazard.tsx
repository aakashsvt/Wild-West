import React, { useRef } from "react";
import { RigidBody, CuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

export type HazardSeverity = "minor" | "medium" | "major";

export type HazardImpactEventDetail = {
  impactVelocity: number;
  impactAngle: "head-on" | "side-swipe" | "rear-end";
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
      let impactAngle: "head-on" | "side-swipe" | "rear-end" = "head-on";

      if (e.other.rigidBody) {
        const vel = e.other.rigidBody.linvel();
        impactVelocity = Math.hypot(vel.x, vel.y, vel.z);

        const playerPos = e.other.rigidBody.translation();

        // 1. Get 2D direction player is moving (ignore Y/jumping for angle calculations)
        const vel2D = new THREE.Vector2(vel.x, vel.z);
        if (vel2D.lengthSq() > 0.1) {
          vel2D.normalize();
          
          // 2. Determine the exact angle of impact
          // Instead of using the center of the hazard (which fails on long fences),
          // we use the actual physical contact normal from the physics engine!
          let normal2D = new THREE.Vector2();

          if (e.manifold && typeof e.manifold.normal === "function") {
            const normal = e.manifold.normal(); // Points OUT of the surface
            // We want the vector pointing INTO the surface to compare with our velocity
            normal2D.set(-normal.x, -normal.z);
            if (normal2D.lengthSq() > 0) normal2D.normalize();
          } else {
            // Fallback to center-position math
            normal2D.set(position[0] - playerPos.x, position[2] - playerPos.z).normalize();
          }
          
          // 3. Dot product determines the angle
          const dot = vel2D.dot(normal2D);

          // Tighten the threshold so only direct hits (within ~35 degrees) are "head-on"
          if (dot > 0.80) {
            impactAngle = "head-on";
          } else if (dot > -0.3) {
            impactAngle = "side-swipe";
          } else {
            impactAngle = "rear-end";
          }
        }
      }

      console.log(`💥 [HAZARD IMPACT] Player hit obstacle! Force: ${impactVelocity.toFixed(1)} | Angle: ${impactAngle}`);

      // Dispatch a global event so the PlayerController can pick it up
      window.dispatchEvent(
        new CustomEvent<HazardImpactEventDetail>("hazard-impact", {
          detail: {
            impactVelocity,
            impactAngle,
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
