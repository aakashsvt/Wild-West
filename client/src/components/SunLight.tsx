import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { DirectionalLight, Vector3 } from "three";
import type { RapierRigidBody } from "@react-three/rapier";

// Direction the "sun" sits relative to the player.
const SUN_OFFSET = new Vector3(15, 25, -10);

type Props = {
  playerRef: React.MutableRefObject<RapierRigidBody | null>;
};

// Shadow camera frustum follows the player every frame instead of covering the
// whole (very large) map — keeps shadow map resolution sharp anywhere on the track.
//
// Deliberately no ambient/hemisphere light here, and intensity kept low: this is
// attempt #2 at a real shadow, added on top of the ORIGINAL, untouched color
// profile (LinearToneMapping, exposure 1, no Environment intensity overrides).
// Start low and increase in small steps — going straight to a high-contrast
// value is what wrecked the scene's color the first time around.
export function SunLight({ playerRef }: Props) {
  const lightRef = useRef<DirectionalLight>(null);
  const { scene } = useThree();

  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    scene.add(light.target);
    return () => {
      scene.remove(light.target);
    };
  }, [scene]);

  useFrame(() => {
    const light = lightRef.current;
    const body = playerRef.current;
    if (!light || !body) return;
    const pos = body.translation();
    light.position.set(pos.x + SUN_OFFSET.x, pos.y + SUN_OFFSET.y, pos.z + SUN_OFFSET.z);
    light.target.position.set(pos.x, pos.y, pos.z);
    light.target.updateMatrixWorld();
  });

  return (
    <directionalLight
      ref={lightRef}
      color={0xfff2d9}
      intensity={2}
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-camera-near={1}
      shadow-camera-far={60}
      shadow-camera-left={-15}
      shadow-camera-right={15}
      shadow-camera-top={15}
      shadow-camera-bottom={-15}
      shadow-bias={-0.0005}
      shadow-normalBias={0.02}
    />
  );
}
