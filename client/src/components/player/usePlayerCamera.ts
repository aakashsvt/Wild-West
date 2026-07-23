import { useRef, MutableRefObject } from "react";
import { PerspectiveCamera, Vector3, Quaternion } from "three";
import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import {
  FP_FOV_RUN_START_SPEED,
  FP_FOV_RUN_MAX_SPEED,
  FP_FOV_IDLE,
  FP_FOV_RUN,
  FIRST_PERSON_FORWARD,
  FIRST_PERSON_HEIGHT_DEFAULT,
  FIRST_PERSON_LOOK_DISTANCE,
  JUMP_CAMERA_BOB_DURATION,
  jumpCameraBobOffset,
  TP_FOV_RUN,
  TP_FOV_WALK,
  CAM_OFFSET_REFERENCE_FOV,
  CAM_OFFSET_RUN,
  CAM_OFFSET,
  CAM_LOOK_OFFSET,
} from "./constants";

export function usePlayerCamera(camera: PerspectiveCamera) {
  const shakeState = useRef({ intensity: 0, duration: 0, timeRemaining: 0 });

  const triggerShake = (intensity: number, duration: number) => {
    shakeState.current = { intensity, duration, timeRemaining: duration };
  };
  const cameraSnapped = useRef(false);
  const fpCameraSnapped = useRef(false);

  const updateCamera = (
    delta: number,
    rb: RapierRigidBody,
    isFirstPerson: boolean,
    mouseYawOffset: number,
    mousePitchOffset: number,
    forwardDir: Vector3,
    currentSpeed: number,
    horseRef: MutableRefObject<any>,
    isRunning: boolean
  ) => {
    const bodyPos = rb.translation();
    const horsePos = new Vector3(bodyPos.x, bodyPos.y, bodyPos.z);
    const rotation = rb.rotation();
    const quat = new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);

    if (isFirstPerson) {
      const fovT = THREE.MathUtils.clamp(
        (currentSpeed - FP_FOV_RUN_START_SPEED) /
          (FP_FOV_RUN_MAX_SPEED - FP_FOV_RUN_START_SPEED),
        0,
        1
      );
      const targetFpFov = THREE.MathUtils.lerp(FP_FOV_IDLE, FP_FOV_RUN, fovT);
      const newFov = THREE.MathUtils.lerp(
        camera.fov,
        targetFpFov,
        Math.min(1, delta * 3)
      );
      
      if (Math.abs(camera.fov - newFov) > 0.01) {
        camera.fov = newFov;
        camera.updateProjectionMatrix();
      }

      const fpPos = new Vector3(0, FIRST_PERSON_HEIGHT_DEFAULT, FIRST_PERSON_FORWARD)
        .applyQuaternion(quat)
        .add(horsePos);

      const yawedDir = forwardDir
        .clone()
        .applyAxisAngle(new Vector3(0, 1, 0), mouseYawOffset);
      const pitchAxis = new Vector3()
        .crossVectors(yawedDir, new Vector3(0, 1, 0))
        .normalize();
      const fpLookDir = yawedDir.applyAxisAngle(pitchAxis, mousePitchOffset);
      const fpLookAt = fpLookDir
        .clone()
        .multiplyScalar(FIRST_PERSON_LOOK_DISTANCE)
        .add(fpPos);

      const jumpAction = horseRef.current?.actions?.JUMP;
      if (jumpAction && jumpAction.isRunning()) {
        const t = jumpAction.time % JUMP_CAMERA_BOB_DURATION;
        const bob = jumpCameraBobOffset(t) * jumpAction.getEffectiveWeight();
        fpPos.y += bob;
      }

      if (!fpCameraSnapped.current) {
        camera.position.copy(fpPos);
        fpCameraSnapped.current = true;
      } else {
        const t = Math.min(1, delta * 40);
        camera.position.lerp(fpPos, t);
      }
      
      camera.lookAt(fpLookAt);
      cameraSnapped.current = false;
    } else {
      const targetTpFov = isRunning ? TP_FOV_RUN : TP_FOV_WALK;
      const newTpFov = THREE.MathUtils.lerp(
        camera.fov,
        targetTpFov,
        Math.min(1, delta * 1.8)
      );
      if (Math.abs(camera.fov - newTpFov) > 0.01) {
        camera.fov = newTpFov;
        camera.updateProjectionMatrix();
      }

      const fovDollyScale =
        Math.tan(THREE.MathUtils.degToRad(CAM_OFFSET_REFERENCE_FOV) / 2) /
        Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      const baseOffset = isRunning ? CAM_OFFSET_RUN : CAM_OFFSET;
      const scaledOffset = new Vector3(
        baseOffset.x * fovDollyScale,
        baseOffset.y,
        baseOffset.z * fovDollyScale
      );
      const desiredCamPos = scaledOffset.applyQuaternion(quat).add(horsePos);

      if (!cameraSnapped.current) {
        camera.position.copy(desiredCamPos);
        cameraSnapped.current = true;
      } else {
        camera.position.lerp(desiredCamPos, 1 - Math.pow(0.001, delta));
      }

      const desiredLookAt = CAM_LOOK_OFFSET.clone().add(horsePos);
      camera.lookAt(desiredLookAt);
      fpCameraSnapped.current = false;
    }

    if (shakeState.current.timeRemaining > 0) {
      const { intensity, duration, timeRemaining } = shakeState.current;
      const decay = timeRemaining / duration;
      const t = performance.now() * 0.05;

      const yawShake = Math.sin(t) * 0.05 * intensity * decay;
      const pitchShake = Math.cos(t * 1.2) * 0.05 * intensity * decay;
      const rollShake = Math.sin(t * 1.5) * 0.02 * intensity * decay;
      
      const xOffset = Math.sin(t * 1.7) * 0.2 * intensity * decay;
      const yOffset = Math.cos(t * 1.3) * 0.2 * intensity * decay;

      camera.position.x += xOffset;
      camera.position.y += yOffset;
      camera.rotation.x += pitchShake;
      camera.rotation.y += yawShake;
      camera.rotation.z += rollShake;

      shakeState.current.timeRemaining -= delta;
    }
  };

  return { updateCamera, triggerShake };
}
