import React from "react";
import { Hazard, type HazardSeverity } from "./Hazard";
import { Box } from "@react-three/drei";

type ObstacleProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
  severity?: HazardSeverity;
};

export function Obstacle({
  position,
  rotation = [0, 0, 0],
  size = [3, 3, 3],
  severity = "major"
}: ObstacleProps) {
  return (
    <Hazard position={position} rotation={rotation} size={size} severity={severity}>
      <Box args={size} castShadow receiveShadow>
        <meshStandardMaterial color="#8B4513" />
      </Box>
    </Hazard>
  );
}
