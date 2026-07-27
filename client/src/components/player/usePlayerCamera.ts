import { useRef, MutableRefObject, useCallback } from "react";
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

// Static variables to prevent per-frame garbage collection
const _horsePos = new Vector3();
const _quat = new Quaternion();
const _fpPos = new Vector3();
const _yawedDir = new Vector3();
const _pitchAxis = new Vector3();
const _fpLookDir = new Vector3();
const _fpLookAt = new Vector3();
const _scaledOffset = new Vector3();
const _desiredCamPos = new Vector3();
const _desiredLookAt = new Vector3();
const _up = new Vector3(0, 1, 0);

export function usePlayerCamera(camera: PerspectiveCamera) {
  const shakeState = useRef({ intensity: 0, duration: 0, timeRemaining: 0 });

  const triggerShake = useCallback((intensity: number, duration: number) => {
    shakeState.current = { intensity, duration, timeRemaining: duration };
  }, []);
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
    _horsePos.set(bodyPos.x, bodyPos.y, bodyPos.z);
    const rotation = rb.rotation();
    _quat.set(rotation.x, rotation.y, rotation.z, rotation.w);

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

      _fpPos.set(0, FIRST_PERSON_HEIGHT_DEFAULT, FIRST_PERSON_FORWARD)
        .applyQuaternion(_quat)
        .add(_horsePos);

      _yawedDir.copy(forwardDir)
        .applyAxisAngle(_up, mouseYawOffset);
      _pitchAxis.crossVectors(_yawedDir, _up).normalize();
      _fpLookDir.copy(_yawedDir).applyAxisAngle(_pitchAxis, mousePitchOffset);
      _fpLookAt.copy(_fpLookDir)
        .multiplyScalar(FIRST_PERSON_LOOK_DISTANCE)
        .add(_fpPos);

      const jumpAction = horseRef.current?.actions?.JUMP;
      if (jumpAction && jumpAction.isRunning()) {
        const t = jumpAction.time % JUMP_CAMERA_BOB_DURATION;
        const bob = jumpCameraBobOffset(t) * jumpAction.getEffectiveWeight();
        _fpPos.y += bob;
      }

      if (!fpCameraSnapped.current) {
        camera.position.copy(_fpPos);
        fpCameraSnapped.current = true;
      } else {
        const t = Math.min(1, delta * 40);
        camera.position.lerp(_fpPos, t);
      }
      
      camera.lookAt(_fpLookAt);
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
      _scaledOffset.set(
        baseOffset.x * fovDollyScale,
        baseOffset.y,
        baseOffset.z * fovDollyScale
      );
      _desiredCamPos.copy(_scaledOffset).applyQuaternion(_quat).add(_horsePos);

      if (!cameraSnapped.current) {
        camera.position.copy(_desiredCamPos);
        cameraSnapped.current = true;
      } else {
        camera.position.lerp(_desiredCamPos, 1 - Math.pow(0.001, delta));
      }

      _desiredLookAt.copy(CAM_LOOK_OFFSET).add(_horsePos);
      camera.lookAt(_desiredLookAt);
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
