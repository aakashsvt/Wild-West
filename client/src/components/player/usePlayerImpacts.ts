import { useEffect, useCallback } from "react";
import { useSocketEvent } from "@/hooks/use-socket";
import type { RacePlayerState } from "@shared/types/multiplayer";
import type { RapierRigidBody } from "@react-three/rapier";
import { Vector3 } from "three";
import * as THREE from "three";
import { useControls } from "leva";
import { useRef } from "react";

export type ImpactSeverity = "minor" | "medium" | "major";
export type ImpactSource = "ENVIRONMENT" | "PLAYER_KICK";

export function usePlayerImpacts(
  bodyRef: React.MutableRefObject<RapierRigidBody | null>,
  stunnedUntil: React.MutableRefObject<number>,
  hitStopUntil: React.MutableRefObject<number>,
  stunState: React.MutableRefObject<"NONE" | "FALL" | "STUMBLE" | "KICKED">,
  triggerShake: (intensity: number, duration: number) => void,
  shakeConfigRef: React.MutableRefObject<any>
) {

  const thresholdControls = useControls("Impact Thresholds & Time Dilation", {
    minorSpeed: { value: 20, min: 1, max: 100, step: 1 },
    majorSpeed: { value: 45, min: 1, max: 200, step: 1 },
    hitStopMajorMs: { value: 250, min: 0, max: 1000, step: 10 },
    hitStopMediumMs: { value: 100, min: 0, max: 1000, step: 10 },
  });
  const thresholdsRef = useRef(thresholdControls);
  thresholdsRef.current = thresholdControls;

  const triggerStun = useCallback((severity: ImpactSeverity, source: ImpactSource) => {
    const now = performance.now();
    const isCurrentlyFalling = stunState.current === "FALL" && stunnedUntil.current > now;
    
    // Priority System: Don't override a major fall with a minor stumble
    if (isCurrentlyFalling && severity !== "major") return;

    if (source === "ENVIRONMENT") {
      // Calculate forward direction to bounce the player backwards
      let forwardDir = new Vector3(0, 0, 1);
      let currentYVel = 0;
      if (bodyRef.current) {
          const rotation = bodyRef.current.rotation();
          const quat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
          const euler = new THREE.Euler().setFromQuaternion(quat);
          forwardDir = new Vector3(0, 0, 1).applyEuler(euler).normalize();
          currentYVel = bodyRef.current.linvel().y;
      }

      // HEAD-ON CRASH LOGIC
      if (severity === "major") {
        const hitStopDuration = thresholdsRef.current.hitStopMajorMs; // Configurable freeze
        hitStopUntil.current = now + hitStopDuration;
        triggerShake(shakeConfigRef.current.majorIntensity, shakeConfigRef.current.majorDuration);
        
        // Wait for the Hit-Stop freeze to end before applying the massive backwards recoil impulse
        setTimeout(() => {
          if (bodyRef.current) {
            bodyRef.current.setLinvel({ x: -forwardDir.x * 35, y: currentYVel, z: -forwardDir.z * 35 }, true);
          }
        }, hitStopDuration);
        
        stunnedUntil.current = now + 3000;
        stunState.current = "FALL";
      } else if (severity === "medium") {
        const hitStopDuration = thresholdsRef.current.hitStopMediumMs; // Configurable freeze
        hitStopUntil.current = now + hitStopDuration;
        triggerShake(shakeConfigRef.current.mediumIntensity, shakeConfigRef.current.mediumDuration);
        
        setTimeout(() => {
          if (bodyRef.current) {
            bodyRef.current.setLinvel({ x: -forwardDir.x * 25, y: currentYVel, z: -forwardDir.z * 25 }, true);
          }
        }, hitStopDuration);
        stunnedUntil.current = now + 1500;
        stunState.current = "STUMBLE";
      } else {
        triggerShake(shakeConfigRef.current.minorIntensity, shakeConfigRef.current.minorDuration);
        setTimeout(() => {
          if (bodyRef.current) {
            bodyRef.current.setLinvel({ x: -forwardDir.x * 15, y: currentYVel, z: -forwardDir.z * 15 }, true);
          }
        }, 10);
        stunnedUntil.current = now + 1000;
        stunState.current = "STUMBLE";
      }
    } else if (source === "PLAYER_KICK") {
      // Violent sideways/multi-axis shake for getting kicked by a player
      triggerShake(shakeConfigRef.current.majorIntensity * 1.5, shakeConfigRef.current.majorDuration);
      if (bodyRef.current) {
        const vel = bodyRef.current.linvel();
        // Knock their speed down and simulate a rough hit
        bodyRef.current.setLinvel({ x: vel.x * 0.1, y: vel.y, z: vel.z * 0.1 }, true);
      }
      stunnedUntil.current = now + 2000;
      stunState.current = "KICKED"; 
    }
  }, [triggerShake, bodyRef, stunnedUntil, stunState, shakeConfigRef]);

  // 1. Listen for Hazards (Cubes/Fences)
  useEffect(() => {
    const handleHazard = (e: any) => {
      const { impactVelocity } = e.detail;
      
      let severity: ImpactSeverity = "minor";
      if (impactVelocity >= thresholdsRef.current.majorSpeed) {
        severity = "major";
      } else if (impactVelocity >= thresholdsRef.current.minorSpeed) {
        severity = "medium";
      }

      console.log(`[IMPACT MANAGER] Processed severity: ${severity}`);
      triggerStun(severity, "ENVIRONMENT");
    };
    window.addEventListener("hazard-impact", handleHazard);
    return () => window.removeEventListener("hazard-impact", handleHazard);
  }, [triggerStun]);

  // 2. Listen for Multiplayer Kicks
  const handleRemotePlayerState = useCallback((state: RacePlayerState) => {
    if (!bodyRef.current) return;
    if (!state.overlay) return; // Only care if remote is kicking (has an overlay animation active)

    const localPos = bodyRef.current.translation();
    const remotePos = new Vector3(state.position[0], state.position[1], state.position[2]);
    const distance = Math.hypot(localPos.x - remotePos.x, localPos.y - remotePos.y, localPos.z - remotePos.z);

    const KICK_RANGE = 10;
    if (distance < KICK_RANGE) {
      console.log(`[LOCAL STUN] Remote player at distance ${distance.toFixed(1)} is kicking! Local player stunned.`);
      triggerStun("major", "PLAYER_KICK");
    }
  }, [triggerStun, bodyRef]);

  useSocketEvent("race:player-state", handleRemotePlayerState);
}
