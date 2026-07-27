import React, { useMemo } from "react";
import * as THREE from "three";
import { Hurdle } from "./Hurdle";
import trackPointsData from "../../public/models/spline.json";
import { useControls } from "leva";

const trackPoints = trackPointsData as Array<{x: number, y: number, z: number}>;

const TRACK_OFFSET = 410;
const offsetz = 20;

export function HurdleSpawner() {
  const { yOffset, width, height, thickness } = useControls("Hurdles", {
    yOffset: { value: 2.0, min: -10, max: 20, step: 0.1 },
    width: { value: 12.0, min: 2.0, max: 40.0, step: 0.1 },
    height: { value: 3.5, min: 0.5, max: 10.0, step: 0.1 },
    thickness: { value: 1.0, min: 0.1, max: 5.0, step: 0.1 }
  });

  const hurdles = useMemo(() => {
    const items = [];
    const points = trackPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    
    // Spawn a hurdle every 5 spline points for maximum density!
    for (let i = 8; i < points.length - 8; i += 5) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      
      // Calculate angle for the hurdle so it sits perpendicular to the track direction
      const angle = Math.atan2(dir.x, dir.z); // Using x/z because we want Y rotation
      
      items.push({
        baseY: p1.y,
        position: [p1.x + TRACK_OFFSET, p1.y, p1.z + offsetz] as [number, number, number],
        rotation: [0, angle, 0] as [number, number, number],
      });
    }
    
    return items;
  }, []);

  return (
    <>
      {hurdles.map((obs, idx) => (
        <Hurdle 
          key={idx} 
          position={[obs.position[0], obs.baseY + yOffset, obs.position[2]]} 
          rotation={obs.rotation} 
          width={width}
          height={height}
          thickness={thickness}
        />
      ))}
    </>
  );
}
