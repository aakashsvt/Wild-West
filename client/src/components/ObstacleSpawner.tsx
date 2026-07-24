import React, { useMemo } from "react";
import * as THREE from "three";
import { Obstacle } from "./Obstacle";
import trackPointsData from "../../public/models/spline.json";
import type { HazardSeverity } from "./Hazard";
import { useControls } from "leva";

// Need to type cast or assert depending on tsconfig, but since Track1 does it:
const trackPoints = trackPointsData as Array<{x: number, y: number, z: number}>;

const TRACK_OFFSET = 410;
const offsetz = 20;

export function ObstacleSpawner() {
  const { yOffset, scaleMultiplier } = useControls("Obstacles", {
    yOffset: { value: 5.5, min: -10, max: 20, step: 0.1 },
    scaleMultiplier: { value: 1.0, min: 0.1, max: 5.0, step: 0.1 }
  });

  const obstacles = useMemo(() => {
    const items = [];
    const points = trackPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    
    // We skip the first few points so players don't spawn exactly on top of an obstacle
    for (let i = 5; i < points.length - 5; i += 10) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const normal = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      
      const offset = (Math.random() * 40) - 20; 
      const pos = p1.clone().add(normal.clone().multiplyScalar(offset));
      const angle = Math.atan2(dir.z, dir.x);
      
      const size: [number, number, number] = [
        2 + Math.random() * 3, 
        2 + Math.random() * 2, 
        2 + Math.random() * 3
      ];
      const severity: HazardSeverity = Math.random() > 0.5 ? "major" : "minor";

      items.push({
        baseY: pos.y,
        position: [pos.x + TRACK_OFFSET, pos.y, pos.z + offsetz] as [number, number, number],
        rotation: [0, -angle, 0] as [number, number, number],
        baseSize: size,
        severity,
      });
    }
    
    return items;
  }, []);

  return (
    <>
      {obstacles.map((obs, idx) => {
        const finalSize = [
          obs.baseSize[0] * scaleMultiplier, 
          obs.baseSize[1] * scaleMultiplier, 
          obs.baseSize[2] * scaleMultiplier
        ] as [number, number, number];
        
        return (
          <Obstacle 
            key={idx} 
            position={[obs.position[0], obs.baseY + yOffset + finalSize[1] / 2, obs.position[2]]} 
            rotation={obs.rotation} 
            size={finalSize}
            severity={obs.severity}
          />
        );
      })}
    </>
  );
}
