import { useEffect, useMemo, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";

// Ported from GameDemo's hoof-footfall dust trail (main.js — see
// gamedemo_dust_trail_implemented memory): same procedural dust texture,
// pooled-sprite cluster-per-footfall rendering, and clearance-crossing
// footfall detection. GameDemo detects footfall via a BVH-accelerated
// raycast against ground meshes; wild-west has no such raycast target set up
// and Rapier already keeps the horse glued to terrain via physics, so
// clearance is measured relative to the RigidBody's own translation instead
// of a scene raycast (cheaper, and avoids reintroducing the unaccelerated
// -raycast perf trap from gamedemo_perf_raycast_bvh_fix).
// Each pooled puff is its own Sprite/SpriteMaterial pair — three.js gives
// every one of these its own draw call (no automatic instancing across
// separate Sprite objects), and they're alpha-blended, so more of them
// on screen at once is a real fill-rate/draw-call cost, not a free knob.
// 96 (paired with 6-8 puffs/footfall) measurably dropped fps; settled here.
const DUST_POOL_SIZE = 64;
const MODEL_SCALE = 3; // Model11's fixed <group scale={3}>, plays the same role as GameDemo's PLAYER_SCALE
const CLEARANCE_THRESHOLD = 0.45 * MODEL_SCALE;
// Master multiplier on top of the per-puff spawn/fade opacity below — tuned
// live via a Leva panel 2026-07-09, then baked in and the panel removed
// (see wildwest_dust_trail_color_panel memory).
const DUST_OPACITY_MULTIPLIER = 0.46;

function createDustTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // SpriteMaterial is unlit, so it never gets the HDR brightness boost lit
  // surfaces get before tone mapping compresses them down — pushed bright,
  // no dark rim, so it holds its own against this scene's sunlit look.
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  // Matched to this track's actual sand color (pixel-sampled in-game:
  // ~rgb(255,165,105), R channel fully saturated) so the dust reads as
  // "kicked-up ground" instead of an unrelated tan. R stays maxed to match
  // that highlight; G/B are trimmed below the plain highlight values so
  // overall luminance still clears wild-west's bloom threshold (0.97, at
  // strength 0.2) without the whole puff blowing out into a glowing blob.
  // Core color and mid-stop position tuned live via Leva 2026-07-09 (see
  // wildwest_dust_trail_color_panel memory) — mid stop pushed way out to
  // 0.95 so the bright core fills nearly the whole puff before falling off.
  gradient.addColorStop(0, "rgba(235,176,124,0.7)");
  gradient.addColorStop(0.95, "rgba(240,155,95,0.42)");
  gradient.addColorStop(1, "rgba(240,155,95,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type Puff = {
  sprite: THREE.Sprite;
  age: number;
  life: number;
  active: boolean;
  baseScale: number;
};

export function useDustTrail(
  horseRef: React.MutableRefObject<any>,
  bodyRef: React.MutableRefObject<RapierRigidBody | null>,
) {
  const { scene } = useThree();
  const texture = useMemo(() => createDustTexture(), []);
  const pool = useRef<Puff[]>([]);
  const poolCursor = useRef(0);
  const hoofWasDown = useRef<boolean[]>([]);
  const hoofWorldPos = useRef(new THREE.Vector3());

  useEffect(() => {
    const puffs: Puff[] = [];
    for (let i = 0; i < DUST_POOL_SIZE; i++) {
      // toneMapped:false skips tone-mapping compression for this material
      // specifically — an unlit sprite tops out at linear 1.0 while sun-lit
      // terrain starts from a much higher HDR value, so without this the
      // sprite reads as dim next to the environment.
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      scene.add(sprite);
      puffs.push({ sprite, age: 0, life: 0, active: false, baseScale: 1 });
    }
    pool.current = puffs;
    return () => {
      puffs.forEach((p) => {
        scene.remove(p.sprite);
        p.sprite.material.dispose();
      });
      pool.current = [];
      // Material.dispose() doesn't touch its map — dispose the texture
      // itself too, since live-tuning the panel creates a fresh
      // CanvasTexture on every color change.
      texture.dispose();
    };
  }, [scene, texture]);

  function spawnPuff(
    groundPoint: THREE.Vector3,
    offsetX: number,
    offsetZ: number,
    scaleMul: number,
  ) {
    const puffs = pool.current;
    if (puffs.length === 0) return;
    const p = puffs[poolCursor.current];
    poolCursor.current = (poolCursor.current + 1) % puffs.length;
    p.sprite.position.set(
      groundPoint.x + offsetX,
      // Raised from 0.1*MODEL_SCALE — on sloped terrain the RigidBody-based
      // groundY can sit a bit below the actual visual surface at the hoof's
      // x/z, which was partially burying/occluding puffs against the ground.
      groundPoint.y + 0.3 * MODEL_SCALE,
      groundPoint.z + offsetZ,
    );
    // Opacity raised 0.55 -> 0.85 for more emit intensity per the user's
    // request. Scale (size/count) left untouched this round — intensity,
    // not size or quantity, is the lever being tuned here.
    p.baseScale = MODEL_SCALE * scaleMul * (1.1 + Math.random() * 0.35);
    p.sprite.scale.set(p.baseScale, p.baseScale, 1);
    p.sprite.material.rotation = Math.random() * Math.PI * 2;
    p.sprite.material.opacity = 0.85 * DUST_OPACITY_MULTIPLIER;
    p.sprite.visible = true;
    p.age = 0;
    // Longer-lived than GameDemo's 0.45-0.8s — puffs were fading out before
    // they had much chance to catch the eye, especially blurred by the
    // running camera's motion-blur pass.
    p.life = 0.65 + Math.random() * 0.45;
    p.active = true;
  }

  // A single billboarded sprite always faces the camera as one flat circle,
  // which reads as a pale ground decal rather than a puff — spawn a jittered
  // cluster per footfall instead of one sprite. 6-8 (bumped from GameDemo's
  // 3-4) measurably cost fps once the longer lifetime kept more of them
  // alive at once — 5 is the compromise between "visible" and "cheap."
  function spawnDust(groundPoint: THREE.Vector3) {
    const puffCount = 4 + Math.floor(Math.random() * 3);
    // Puffs used to get a fully independent random angle each, which let
    // 2-3 of them land almost on top of each other by chance. Wherever that
    // happened, the overlapping bright area bloomed harder than an isolated
    // puff (bloom's blur adds up over a bigger contiguous bright patch),
    // showing up as an occasional white "bulb" in the middle of a cluster.
    // Giving each puff its own angular slice (with a little jitter so it
    // doesn't look mechanically even) keeps them spread apart instead.
    const angleStep = (Math.PI * 2) / puffCount;
    for (let i = 0; i < puffCount; i++) {
      const angle = i * angleStep + (Math.random() - 0.5) * angleStep * 0.7;
      const dist = (0.4 + Math.random() * 0.45) * MODEL_SCALE;
      spawnPuff(
        groundPoint,
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        0.65 + Math.random() * 0.35,
      );
    }
  }

  useFrame((_, delta) => {
    const puffs = pool.current;
    for (const p of puffs) {
      if (!p.active) continue;
      p.age += delta;
      const t = p.age / p.life;
      if (t >= 1) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      p.sprite.material.opacity = (1 - t) * DUST_OPACITY_MULTIPLIER;
      const scale = p.baseScale * (1 + t);
      p.sprite.scale.set(scale, scale, 1);
      p.sprite.position.y += delta * 0.15 * MODEL_SCALE;
    }

    const body = bodyRef.current;
    const hoofBones: THREE.Bone[] | undefined = horseRef.current?.hoofBones;
    if (!body || !hoofBones || hoofBones.length === 0) return;

    // RigidBody's own translation approximates local ground height — its
    // colliders are offset upward from the body origin, so the origin sits
    // near where the hooves actually contact the terrain.
    const groundY = body.translation().y;
    hoofBones.forEach((bone, i) => {
      bone.getWorldPosition(hoofWorldPos.current);
      const clearance = hoofWorldPos.current.y - groundY;
      const isDown = clearance <= CLEARANCE_THRESHOLD;
      if (isDown && !hoofWasDown.current[i]) {
        spawnDust(
          new THREE.Vector3(
            hoofWorldPos.current.x,
            groundY,
            hoofWorldPos.current.z,
          ),
        );
      }
      hoofWasDown.current[i] = isDown;
    });
  });
}
