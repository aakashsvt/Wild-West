import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";

export function Track() {
  // Using the path where we expect the file to be moved
  const { scene } = useGLTF("/models/track.glb");

  // Clone the scene to avoid mutation issues if reused
  const clonedScene = useMemo(() => {
    const s = scene.clone();
    s.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;

      console.log("Mesh name:", mesh.name); // 👈 ADD THIS
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return s;
  }, [scene]);

  return (
    <RigidBody type="fixed" colliders="trimesh" position={[0, 0, 0]}  friction={1} restitution={0.2}>
      <primitive object={clonedScene} scale={[1, 1, 1]} />
    </RigidBody>
  );
}

// Preload to avoid loading stutters
useGLTF.preload("/models/track.glb");
