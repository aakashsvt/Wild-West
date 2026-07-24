/*
Based on gltfjsx@6.5.3 output for CowboyXHorse_NLA_V42.glb (public/models/CowboyXHorse_NLA_V42.tsx),
adapted to match the CowboyXHorse_NLA_V11.jsx wrapper pattern: forwardRef + useImperativeHandle exposing
{ actions, hoofBones, horseHeadBone }, cloned per-instance animations, shadow casting, and the same
roughness/specularIntensity material tweaks. This GLB's textures are raw JPEG/PNG (not KTX2), so no
withKTX2 loader is used here, unlike V11.
*/

import React, { forwardRef, useImperativeHandle, useEffect } from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

// Same rule as CowboyXHorse_NLA_V11.jsx: GLTFLoader sanitizes node names (dots
// stripped, "_N" suffixes on collisions), and cowboy_rig/horse_rig each have
// their own "foot.l"/"foot.r" bones — scoped to Horse_Body's own
// skeleton.bones to avoid picking the cowboy's.
const HOOF_BONE_RE = /^foot(_dupli_001)?[lr](_\d+)?$/i;
const HORSE_HEAD_BONE_RE = /^headx(_\d+)?$/i;

export const Model42 = forwardRef((props, ref) => {
  const group = React.useRef();
  const { scene, animations } = useGLTF("/models/CowboyXHorse_NLA_V42.glb");
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const localAnimations = React.useMemo(
    () => animations.map((clip) => clip.clone()),
    [animations],
  );
  const { nodes, materials } = useGraph(clone);
  const { actions, mixer } = useAnimations(localAnimations, group);
  const hoofBones = React.useMemo(() => {
    const skeleton = nodes.Horse_Body?.skeleton;
    if (!skeleton) return [];
    return skeleton.bones.filter((b) => HOOF_BONE_RE.test(b.name));
  }, [nodes]);
  const horseHeadBone = React.useMemo(() => {
    const skeleton = nodes.Horse_Body?.skeleton;
    if (!skeleton) return null;
    const found = skeleton.bones.find((b) => HORSE_HEAD_BONE_RE.test(b.name)) ?? null;
    if (!found) {
      console.warn(
        "[horseHeadBone] No match; horse skeleton bone names:",
        skeleton.bones.map((b) => b.name),
      );
    }
    return found;
  }, [nodes]);
  useImperativeHandle(ref, () => ({
    actions,
    mixer,
    hoofBones,
    horseHeadBone,
  }));
  useEffect(() => {
    group.current?.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, []);
  // Same tweak as CowboyXHorse_NLA_V11.jsx — see that file for the reasoning
  // (reflections looked flatter than GameDemo; lowering roughness on the
  // baked roughnessMap + bumping specularIntensity on the two
  // KHR_materials_specular materials fixes it without a pipeline change).
  useEffect(() => {
    const standard = [
      materials.CowboyOutfit,
      materials.Horse_Outfit_Baked,
      materials.HorseBaked,
      materials.CowboyHairs,
    ];
    for (const mat of standard) {
      if (mat) mat.roughness *= 0.98;
    }
    const specular = [materials.Cowboy_Skin_Hairs, materials.HorseHairs_Baked];
    for (const mat of specular) {
      if (!mat) continue;
      mat.roughness *= 0.95;
      if ("specularIntensity" in mat) mat.specularIntensity = 1.05;
    }
  }, [materials]);
  return (
    <group ref={group} {...props} dispose={null} scale={3}>
      <group name="Scene">
        <group name="saddle_rig">
          <primitive object={nodes.c_pos_1} />
          <primitive object={nodes.root_refx_1} />
          <skinnedMesh
            name="saddle_seat"
            geometry={nodes.saddle_seat.geometry}
            material={materials.Horse_Outfit_Baked}
            skeleton={nodes.saddle_seat.skeleton}
          />
        </group>
        <group name="cowboy_rig">
          <primitive object={nodes.c_pos_2} />
          <primitive object={nodes.c_arms_polel} />
          <primitive object={nodes.c_arms_poler} />
          <primitive object={nodes.c_foot_ikr_1} />
          <primitive object={nodes.c_leg_poler_1} />
          <primitive object={nodes.c_foot_ikl_1} />
          <primitive object={nodes.c_leg_polel_1} />
          <primitive object={nodes.c_hand_ikr} />
          <primitive object={nodes.c_hand_ikl} />
          <primitive object={nodes.root_refx_2} />
          <skinnedMesh
            name="Bandage002"
            geometry={nodes.Bandage002.geometry}
            material={materials.CowboyOutfit}
            skeleton={nodes.Bandage002.skeleton}
          />
          <skinnedMesh
            name="Belt002"
            geometry={nodes.Belt002.geometry}
            material={materials.CowboyOutfit}
            skeleton={nodes.Belt002.skeleton}
          />
          <skinnedMesh
            frustumCulled={false}
            name="Boot002"
            geometry={nodes.Boot002.geometry}
            material={materials.CowboyOutfit}
            skeleton={nodes.Boot002.skeleton}
          />
          <skinnedMesh
            name="Hair_cap002"
            geometry={nodes.Hair_cap002.geometry}
            material={materials.Cowboy_Skin_Hairs}
            skeleton={nodes.Hair_cap002.skeleton}
          />
          <skinnedMesh
            name="Hair_cut002"
            geometry={nodes.Hair_cut002.geometry}
            material={materials.CowboyHairs}
            skeleton={nodes.Hair_cut002.skeleton}
          />
          <skinnedMesh
            name="Hat002"
            geometry={nodes.Hat002.geometry}
            material={materials.CowboyOutfit}
            skeleton={nodes.Hat002.skeleton}
          />
          <skinnedMesh
            name="Holster002"
            geometry={nodes.Holster002.geometry}
            material={materials.CowboyOutfit}
            skeleton={nodes.Holster002.skeleton}
          />
          <skinnedMesh
            name="Jacket_Optimized002"
            geometry={nodes.Jacket_Optimized002.geometry}
            material={materials.CowboyOutfit}
            skeleton={nodes.Jacket_Optimized002.skeleton}
          />
          <skinnedMesh
            frustumCulled={false}
            name="Jeans002"
            geometry={nodes.Jeans002.geometry}
            material={materials.CowboyOutfit}
            skeleton={nodes.Jeans002.skeleton}
          />
          <skinnedMesh
            name="Plane002"
            geometry={nodes.Plane002.geometry}
            material={nodes.Plane002.material}
            skeleton={nodes.Plane002.skeleton}
          />
          <skinnedMesh
            name="SB_sidestepd005"
            geometry={nodes.SB_sidestepd005.geometry}
            material={materials.Cowboy_Skin_Hairs}
            skeleton={nodes.SB_sidestepd005.skeleton}
          />
          <skinnedMesh
            name="Scarf002"
            geometry={nodes.Scarf002.geometry}
            material={materials.CowboyOutfit}
            skeleton={nodes.Scarf002.skeleton}
          />
          <skinnedMesh
            name="Shirt_Optimized_2002"
            geometry={nodes.Shirt_Optimized_2002.geometry}
            material={materials.CowboyOutfit}
            skeleton={nodes.Shirt_Optimized_2002.skeleton}
          />
          <group name="eye_brow002">
            <skinnedMesh
              name="eye_browR002"
              geometry={nodes.eye_browR002.geometry}
              material={materials.SBM_eye_browL}
              skeleton={nodes.eye_browR002.skeleton}
              morphTargetDictionary={nodes.eye_browR002.morphTargetDictionary}
              morphTargetInfluences={nodes.eye_browR002.morphTargetInfluences}
            />
            <skinnedMesh
              name="eye_browR002_1"
              geometry={nodes.eye_browR002_1.geometry}
              material={materials.SBM_eye_browR}
              skeleton={nodes.eye_browR002_1.skeleton}
              morphTargetDictionary={nodes.eye_browR002_1.morphTargetDictionary}
              morphTargetInfluences={nodes.eye_browR002_1.morphTargetInfluences}
            />
          </group>
          <skinnedMesh
            name="eye_iris002"
            geometry={nodes.eye_iris002.geometry}
            material={materials.Cowboy_Skin_Hairs}
            skeleton={nodes.eye_iris002.skeleton}
            morphTargetDictionary={nodes.eye_iris002.morphTargetDictionary}
            morphTargetInfluences={nodes.eye_iris002.morphTargetInfluences}
          />
          <skinnedMesh
            name="Michael_head002"
            geometry={nodes.Michael_head002.geometry}
            material={materials.Cowboy_Skin_Hairs}
            skeleton={nodes.Michael_head002.skeleton}
            morphTargetDictionary={nodes.Michael_head002.morphTargetDictionary}
            morphTargetInfluences={nodes.Michael_head002.morphTargetInfluences}
          />
          <skinnedMesh
            name="Raincoat004"
            geometry={nodes.Raincoat004.geometry}
            material={materials.CowboyOutfit}
            skeleton={nodes.Raincoat004.skeleton}
            morphTargetDictionary={nodes.Raincoat004.morphTargetDictionary}
            morphTargetInfluences={nodes.Raincoat004.morphTargetInfluences}
          />
          <skinnedMesh
            name="SB_sidestepd006"
            geometry={nodes.SB_sidestepd006.geometry}
            material={materials.Cowboy_Skin_Hairs}
            skeleton={nodes.SB_sidestepd006.skeleton}
            morphTargetDictionary={nodes.SB_sidestepd006.morphTargetDictionary}
            morphTargetInfluences={nodes.SB_sidestepd006.morphTargetInfluences}
          />
          <skinnedMesh
            name="SB_sidestepd007"
            geometry={nodes.SB_sidestepd007.geometry}
            material={materials.Cowboy_Skin_Hairs}
            skeleton={nodes.SB_sidestepd007.skeleton}
            morphTargetDictionary={nodes.SB_sidestepd007.morphTargetDictionary}
            morphTargetInfluences={nodes.SB_sidestepd007.morphTargetInfluences}
          />
          <group name="SB_sidestepd008">
            <skinnedMesh
              name="eye_cornea004"
              geometry={nodes.eye_cornea004.geometry}
              material={materials.Cowboy_Skin_Hairs}
              skeleton={nodes.eye_cornea004.skeleton}
              morphTargetDictionary={nodes.eye_cornea004.morphTargetDictionary}
              morphTargetInfluences={nodes.eye_cornea004.morphTargetInfluences}
            />
            <skinnedMesh
              name="eye_cornea004_1"
              geometry={nodes.eye_cornea004_1.geometry}
              material={materials.eyes_cornea_blind}
              skeleton={nodes.eye_cornea004_1.skeleton}
              morphTargetDictionary={
                nodes.eye_cornea004_1.morphTargetDictionary
              }
              morphTargetInfluences={
                nodes.eye_cornea004_1.morphTargetInfluences
              }
            />
          </group>
          <skinnedMesh
            name="SB_sidestepd009"
            geometry={nodes.SB_sidestepd009.geometry}
            material={materials.Cowboy_Skin_Hairs}
            skeleton={nodes.SB_sidestepd009.skeleton}
            morphTargetDictionary={nodes.SB_sidestepd009.morphTargetDictionary}
            morphTargetInfluences={nodes.SB_sidestepd009.morphTargetInfluences}
          />
          <skinnedMesh
            name="Tongue_1002"
            geometry={nodes.Tongue_1002.geometry}
            material={materials.Cowboy_Skin_Hairs}
            skeleton={nodes.Tongue_1002.skeleton}
            morphTargetDictionary={nodes.Tongue_1002.morphTargetDictionary}
            morphTargetInfluences={nodes.Tongue_1002.morphTargetInfluences}
          />
        </group>
        <group name="char_grp004" />
        <group name="horse_rig" position={[0, -0.001, 0]}>
          <primitive object={nodes.c_pos} />
          <primitive object={nodes.c_foot_ikr} />
          <primitive object={nodes.c_leg_poler} />
          <primitive object={nodes.c_foot_ikl} />
          <primitive object={nodes.c_leg_polel} />
          <primitive object={nodes.root_refx} />
          <primitive object={nodes.c_foot_ik_dupli_001l} />
          <primitive object={nodes.c_leg_pole_dupli_001l} />
          <primitive object={nodes.c_foot_ik_dupli_001r} />
          <primitive object={nodes.c_leg_pole_dupli_001r} />
          <primitive object={nodes.c_spline_inter_01x} />
          <primitive object={nodes.c_spline_inter_02x} />
          <primitive object={nodes.c_spline_inter_03x} />
          <primitive object={nodes.eye_offset_refl} />
          <primitive object={nodes.c_eye_targetx} />
          <primitive object={nodes.eye_offset_refr} />
          <primitive object={nodes.bot_bend_refl} />
          <primitive object={nodes.bot_bend_refr} />
          <skinnedMesh
            name="belt_head"
            geometry={nodes.belt_head.geometry}
            material={materials.Horse_Outfit_Baked}
            skeleton={nodes.belt_head.skeleton}
          />
          <skinnedMesh
            name="eyel"
            geometry={nodes.eyel.geometry}
            material={materials["Horse.001"]}
            skeleton={nodes.eyel.skeleton}
          />
          <skinnedMesh
            name="eyer"
            geometry={nodes.eyer.geometry}
            material={materials["Horse.001"]}
            skeleton={nodes.eyer.skeleton}
          />
          <skinnedMesh
            name="horse_hair"
            geometry={nodes.horse_hair.geometry}
            material={materials.HorseHairs_Baked}
            skeleton={nodes.horse_hair.skeleton}
          />
          <skinnedMesh
            name="belt_saddle"
            geometry={nodes.belt_saddle.geometry}
            material={materials.Horse_Outfit_Baked}
            skeleton={nodes.belt_saddle.skeleton}
            morphTargetDictionary={nodes.belt_saddle.morphTargetDictionary}
            morphTargetInfluences={nodes.belt_saddle.morphTargetInfluences}
          />
          <skinnedMesh
            name="Horse_Body"
            geometry={nodes.Horse_Body.geometry}
            material={materials.HorseBaked}
            skeleton={nodes.Horse_Body.skeleton}
            morphTargetDictionary={nodes.Horse_Body.morphTargetDictionary}
            morphTargetInfluences={nodes.Horse_Body.morphTargetInfluences}
          />
          <skinnedMesh
            name="Horse_TAIL"
            geometry={nodes.Horse_TAIL.geometry}
            material={materials.HorseHairs_Baked}
            skeleton={nodes.Horse_TAIL.skeleton}
            morphTargetDictionary={nodes.Horse_TAIL.morphTargetDictionary}
            morphTargetInfluences={nodes.Horse_TAIL.morphTargetInfluences}
          />
        </group>
      </group>
    </group>
  );
});

useGLTF.preload("/models/CowboyXHorse_NLA_V42.glb");
