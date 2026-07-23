import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HORSE_HEAD_LEAN_ANGLE, HORSE_HEAD_LEAN_SMOOTH_SPEED } from "./constants";

export function HorseHeadTilt({
  horseRef,
  turnLeanInput,
}: {
  horseRef: React.MutableRefObject<any>;
  turnLeanInput: React.MutableRefObject<{ active: boolean; dir: number }>;
}) {
  const appliedTilt = useRef(0);
  const previousApplied = useRef(0);
  useFrame((_, delta) => {
    const headBone = horseRef.current?.horseHeadBone;
    if (!headBone) return;
    const target = turnLeanInput.current.active
      ? turnLeanInput.current.dir * HORSE_HEAD_LEAN_ANGLE
      : 0;
    appliedTilt.current = THREE.MathUtils.lerp(
      appliedTilt.current,
      target,
      Math.min(1, delta * HORSE_HEAD_LEAN_SMOOTH_SPEED),
    );
    headBone.rotation.z += appliedTilt.current - previousApplied.current;
    previousApplied.current = appliedTilt.current;
  });
  return null;
}
