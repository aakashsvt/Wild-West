import { useEffect, useCallback } from "react";
import { useSocketEvent } from "@/hooks/use-socket";
import type { RacePlayerState } from "@shared/types/multiplayer";
import type { RapierRigidBody } from "@react-three/rapier";
import { Vector3 } from "three";

export type ImpactSeverity = "minor" | "medium" | "major";
export type ImpactSource = "ENVIRONMENT" | "PLAYER_KICK";

export function usePlayerImpacts(
  bodyRef: React.MutableRefObject<RapierRigidBody | null>,
  stunnedUntil: React.MutableRefObject<number>,
  stunState: React.MutableRefObject<"NONE" | "FALL" | "STUMBLE" | "KICKED">,
  triggerShake: (intensity: number, duration: number) => void,
  shakeConfigRef: React.MutableRefObject<any>
) {

  const triggerStun = useCallback((severity: ImpactSeverity, source: ImpactSource) => {
    const now = performance.now();
    const isCurrentlyFalling = stunState.current === "FALL" && stunnedUntil.current > now;
    
    // Priority System: Don't override a major fall with a minor stumble
    if (isCurrentlyFalling && severity !== "major") return;

    if (source === "ENVIRONMENT") {
      if (severity === "major") {
        triggerShake(shakeConfigRef.current.majorIntensity, shakeConfigRef.current.majorDuration);
        if (bodyRef.current) {
          const vel = bodyRef.current.linvel();
          bodyRef.current.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
        }
        stunnedUntil.current = now + 3000;
        stunState.current = "FALL";
      } else if (severity === "medium") {
        triggerShake(shakeConfigRef.current.mediumIntensity, shakeConfigRef.current.mediumDuration);
        stunnedUntil.current = now + 1500;
        stunState.current = "STUMBLE";
        if (bodyRef.current) {
          const vel = bodyRef.current.linvel();
          bodyRef.current.setLinvel({ x: vel.x * 0.2, y: vel.y, z: vel.z * 0.2 }, true);
        }
      } else {
        triggerShake(shakeConfigRef.current.minorIntensity, shakeConfigRef.current.minorDuration);
        stunnedUntil.current = now + 1000;
        stunState.current = "STUMBLE";
        if (bodyRef.current) {
          const vel = bodyRef.current.linvel();
          bodyRef.current.setLinvel({ x: vel.x * 0.5, y: vel.y, z: vel.z * 0.5 }, true);
        }
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
      triggerStun(e.detail.severity, "ENVIRONMENT");
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
