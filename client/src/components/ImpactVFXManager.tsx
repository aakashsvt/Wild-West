import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  rotVelocity: THREE.Euler;
  scale: number;
  life: number;
  maxLife: number;
  type: "splinter" | "debris";
};

export function ImpactVFXManager() {
  const particlesRef = useRef<Particle[]>([]);
  
  const splinterMeshRef = useRef<THREE.InstancedMesh>(null);
  const debrisMeshRef = useRef<THREE.InstancedMesh>(null);
  
  const dummy = new THREE.Object3D();

  useEffect(() => {
    const onHazard = (e: any) => {
      const { impactAngle, hazardPosition } = e.detail;
      if (!hazardPosition) return;
      
      const newParticles: Particle[] = [];
      const isHurdle = impactAngle === "hurdle";
      const count = isHurdle ? 50 : 35; // Massively increased count
      
      for (let i = 0; i < count; i++) {
        const velY = Math.random() * 25 + 15; // Higher launch
        const velX = (Math.random() - 0.5) * 40; // Wider spread
        const velZ = (Math.random() - 0.5) * 40; // Wider spread
        
        newParticles.push({
          position: new THREE.Vector3(hazardPosition[0], hazardPosition[1] + 2.5, hazardPosition[2]),
          velocity: new THREE.Vector3(velX, velY, velZ),
          rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
          rotVelocity: new THREE.Euler((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15),
          scale: isHurdle ? Math.random() * 1.5 + 0.8 : Math.random() * 2.5 + 1.2, // 2-3x larger
          life: 0,
          maxLife: Math.random() * 0.8 + 1.0, // Live for 1.0 to 1.8 seconds
          type: isHurdle ? "splinter" : "debris"
        });
      }
      
      particlesRef.current = [...newParticles, ...particlesRef.current].slice(0, 300);
    };
    
    window.addEventListener("hazard-impact", onHazard);
    return () => window.removeEventListener("hazard-impact", onHazard);
  }, []);

  useFrame((_, delta) => {
    const splinters: Particle[] = [];
    const debris: Particle[] = [];
    
    const dt = Math.min(delta, 0.1);
    
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life += dt;
      
      if (p.life >= p.maxLife) {
        particlesRef.current.splice(i, 1);
        continue;
      }
      
      p.velocity.y -= 45 * dt; // Stronger gravity for punchier physics
      
      p.position.addScaledVector(p.velocity, dt);
      
      p.rotation.x += p.rotVelocity.x * dt;
      p.rotation.y += p.rotVelocity.y * dt;
      p.rotation.z += p.rotVelocity.z * dt;
      
      if (p.type === "splinter") splinters.push(p);
      else debris.push(p);
    }
    
    if (splinterMeshRef.current) {
      splinterMeshRef.current.count = splinters.length;
      splinters.forEach((p, i) => {
        dummy.position.copy(p.position);
        dummy.rotation.copy(p.rotation);
        // Stays large until the end, then rapidly shrinks
        const shrink = Math.max(0, 1 - Math.pow(p.life / p.maxLife, 3));
        dummy.scale.set(p.scale * 0.2, p.scale, p.scale * 0.2).multiplyScalar(shrink);
        dummy.updateMatrix();
        splinterMeshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      splinterMeshRef.current.instanceMatrix.needsUpdate = true;
    }
    
    if (debrisMeshRef.current) {
      debrisMeshRef.current.count = debris.length;
      debris.forEach((p, i) => {
        dummy.position.copy(p.position);
        dummy.rotation.copy(p.rotation);
        const shrink = Math.max(0, 1 - Math.pow(p.life / p.maxLife, 3));
        dummy.scale.set(p.scale, p.scale, p.scale).multiplyScalar(shrink);
        dummy.updateMatrix();
        debrisMeshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      debrisMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={splinterMeshRef} args={[undefined as any, undefined as any, 300]}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#d4a373" roughness={0.7} />
      </instancedMesh>
      
      <instancedMesh ref={debrisMeshRef} args={[undefined as any, undefined as any, 300]}>
        <dodecahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial color="#8a817c" roughness={0.9} />
      </instancedMesh>
    </>
  );
}
