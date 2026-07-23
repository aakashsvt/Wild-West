import { Vector3, Quaternion, Euler } from "three";
import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import {
  MAX_SPEED,
  TURN_SPEED,
  BOOST_SPEED_MULTIPLIER,
  WALK_TARGET_SPEED,
} from "./constants";
import { PlayerInputs } from "./usePlayerStateMachine";
import { MutableRefObject } from "react";

export function usePlayerMovement(
  setSpeed: (speed: number) => void,
  addScore: (score: number) => void
) {
  const updateMovement = (
    delta: number,
    rb: RapierRigidBody,
    inputs: PlayerInputs,
    isStunned: boolean,
    lastPosition: MutableRefObject<Vector3>
  ) => {
    const { forward, backward, left, right, run, isBoosting } = inputs;
    const linvel = rb.linvel();
    const velocity = new Vector3(linvel.x, linvel.y, linvel.z);

    if (isStunned) {
      rb.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
      return {
        velocity: new Vector3(0, linvel.y, 0),
        currentSpeed: 0,
        forwardDir: new Vector3(0, 0, 1) // default fallback
      };
    }

    const rotation = rb.rotation();
    const quat1 = new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const euler = new Euler().setFromQuaternion(quat1);
    const forwardDir = new Vector3(0, 0, 1).applyEuler(euler).normalize();
    const currentSpeed = Math.sqrt(linvel.x ** 2 + linvel.z ** 2);

    // =========================
    // 🔁 TURNING (SMOOTH)
    // =========================
    if (left || right) {
      const turnDir = left ? 1 : -1;
      const turnSpeedFactor = THREE.MathUtils.lerp(
        1.2,
        0.4,
        currentSpeed / MAX_SPEED
      );
      const turnAmount = turnDir * TURN_SPEED * turnSpeedFactor * delta;

      const deltaQuat = new Quaternion().setFromAxisAngle(
        new Vector3(0, 1, 0),
        turnAmount
      );
      const targetQuat = quat1.clone().multiply(deltaQuat);
      quat1.slerp(targetQuat, 0.5);
      rb.setRotation({ x: quat1.x, y: quat1.y, z: quat1.z, w: quat1.w }, true);
    }

    // =========================
    // 🐎 FORWARD MOVEMENT (SMOOTH)
    // =========================
    let targetSpeed = 0;
    if (forward) {
      targetSpeed = isBoosting
        ? MAX_SPEED * BOOST_SPEED_MULTIPLIER
        : run
        ? MAX_SPEED
        : WALK_TARGET_SPEED;
    } else if (backward) {
      targetSpeed = -MAX_SPEED * 0.4;
    }

    const forwardSpeed = velocity.dot(forwardDir);
    const displaySpeed = Math.abs(forwardSpeed);
    const displaySpeedKmh = Math.round(displaySpeed * 1.5);
    
    setSpeed(displaySpeedKmh);

    const newForwardSpeed = THREE.MathUtils.lerp(
      forwardSpeed,
      targetSpeed,
      delta * 4
    );
    const targetVelocity = forwardDir.clone().multiplyScalar(newForwardSpeed);

    const isWalking = forward && !run && !isBoosting;
    velocity.lerp(targetVelocity, isWalking ? 0.9 : 0.2);

    rb.setLinvel({ x: velocity.x, y: linvel.y, z: velocity.z }, true);

    // =========================
    // 📈 SCORE
    // =========================
    const pos = rb.translation();
    const posVec = new Vector3(pos.x, pos.y, pos.z);
    const dist = posVec.distanceTo(lastPosition.current);
    
    if (dist > 0.1) {
      addScore(Math.floor(dist));
      lastPosition.current.copy(posVec);
    }

    return { velocity, currentSpeed, forwardDir, displaySpeedKmh };
  };

  return { updateMovement };
}
