import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";

export function Track() {
  const { scene } = useGLTF("/models/track.glb");


  useMemo(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.name === "EnvironmentSphere") {

          const mat = child.material as THREE.MeshStandardMaterial;

          // 🔥 Use emissiveMap instead of map
          const skyTexture = mat.emissiveMap;

          if (skyTexture) {
            child.material = new THREE.MeshBasicMaterial({
              map: skyTexture,
              side: THREE.BackSide,
              depthWrite: false,
            });

            child.frustumCulled = false;
            child.renderOrder = -1;
          }
        }
      }
    });
  }, [scene]);


  return (
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={scene} />
    </RigidBody>
  );
}

// Preload to avoid loading stutters
useGLTF.preload("/models/track.glb");
