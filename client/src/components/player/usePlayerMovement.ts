import { Vector3, Quaternion, Euler } from "three";
import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import {
  MAX_SPEED,
  TURN_SPEED,
  BOOST_SPEED_MULTIPLIER,
  WALK_TARGET_SPEED,
  BACKWARD_WALK_SPEED_MULT,
  FALL_RECOIL_DURATION_MS,
  FALL_RECOIL_SPEED_MULTIPLIER,
  STUMBLE_MEDIUM_RECOIL_DURATION_MS,
  STUMBLE_MEDIUM_RECOIL_SPEED_MULT,
  STUMBLE_MINOR_RECOIL_DURATION_MS,
  STUMBLE_MINOR_RECOIL_SPEED_MULT,
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
    stunState: "NONE" | "FALL" | "STUMBLE" | "STUMBLE_SIDE" | "KICKED",
    stunnedUntil: number,
    lastPosition: MutableRefObject<Vector3>
  ) => {
    const { forward, backward, left, right, run, isBoosting } = inputs;
    const linvel = rb.linvel();
    const velocity = new Vector3(linvel.x, linvel.y, linvel.z);
    const rotation = rb.rotation();
    const quat1 = new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const euler = new Euler().setFromQuaternion(quat1);
    const forwardDir = new Vector3(0, 0, 1).applyEuler(euler).normalize();
    const currentSpeed = Math.sqrt(linvel.x ** 2 + linvel.z ** 2);

    if (stunState !== "NONE") {
      const timeLeft = stunnedUntil - performance.now();
      let recoilSpeed = 0;
      
      // Actively push backward during the first fraction of the stun so physics damping doesn't eat the bounce
      if (stunState === "FALL" && timeLeft > (3000 - FALL_RECOIL_DURATION_MS)) {
        recoilSpeed = -MAX_SPEED * FALL_RECOIL_SPEED_MULTIPLIER;
      } else if (stunState === "STUMBLE") {
        if (timeLeft > (1500 - STUMBLE_MEDIUM_RECOIL_DURATION_MS)) recoilSpeed = -WALK_TARGET_SPEED * STUMBLE_MEDIUM_RECOIL_SPEED_MULT;
        else if (timeLeft > (1000 - STUMBLE_MINOR_RECOIL_DURATION_MS) && timeLeft <= 1000) recoilSpeed = -WALK_TARGET_SPEED * STUMBLE_MINOR_RECOIL_SPEED_MULT;
      }

      if (recoilSpeed !== 0) {
        const targetVelocity = forwardDir.clone().multiplyScalar(recoilSpeed);
        velocity.lerp(targetVelocity, delta * 15);
        rb.setLinvel({ x: velocity.x, y: linvel.y, z: velocity.z }, true);
      }

      if (stunState !== "STUMBLE_SIDE") {
        return {
          velocity,
          currentSpeed,
          forwardDir
        };
      }
    }

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
      if (stunState === "STUMBLE_SIDE") {
        // Player can move forward during a hurdle stumble, but at a noticeably slower speed
        targetSpeed = WALK_TARGET_SPEED * 0.6;
      } else {
        targetSpeed = isBoosting
          ? MAX_SPEED * BOOST_SPEED_MULTIPLIER
          : run
          ? MAX_SPEED
          : WALK_TARGET_SPEED;
      }
    } else if (backward) {
      if (stunState !== "STUMBLE_SIDE") {
        targetSpeed = -WALK_TARGET_SPEED * BACKWARD_WALK_SPEED_MULT;
      }
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

    const isWalking = (forward || backward) && !run && !isBoosting;

    if (stunState === "STUMBLE_SIDE") {
      // During stumble, directly set the full target velocity.
      // The normal lerp(0.2) is too weak — Rapier's friction kills the tiny velocity before the next frame.
      const stumbleVelocity = forwardDir.clone().multiplyScalar(targetSpeed);
      rb.setLinvel({ x: stumbleVelocity.x, y: linvel.y, z: stumbleVelocity.z }, true);
    } else {
      velocity.lerp(targetVelocity, isWalking ? 0.9 : 0.2);
      rb.setLinvel({ x: velocity.x, y: linvel.y, z: velocity.z }, true);
    }

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
