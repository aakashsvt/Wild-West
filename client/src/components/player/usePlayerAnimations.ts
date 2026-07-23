import { useRef } from "react";
import * as THREE from "three";

export function usePlayerAnimations(horseRef: React.MutableRefObject<any>) {
  const currentBaseAction = useRef<any>(null);
  const currentOverlayAction = useRef<any>(null);
  const currentAnimationName = useRef("IDLE");
  const currentOverlayName = useRef<string | null>(null);
  const lastKickedAt = useRef(0);
  const collisionHitsDuringOverlay = useRef<Set<number>>(new Set());

  const playAnimation = (
    name: string,
    type: "base" | "overlay" = "base",
    fadeDuration = 0.2
  ) => {
    const actions = horseRef.current?.actions;

    if (!actions || !actions[name]) return;

    const next = actions[name];

    // =========================
    // BASE ANIMATIONS
    // =========================
    if (type === "base") {
      if (currentBaseAction.current === next) return;

      currentBaseAction.current?.fadeOut(fadeDuration);
      next.reset().fadeIn(fadeDuration).play();

      currentBaseAction.current = next;
      currentAnimationName.current = name;
    }
    // =========================
    // OVERLAY ANIMATIONS
    // =========================
    else {
      if (currentOverlayAction.current === next && next.isRunning()) {
        return;
      }

      const overlayClip = next.getClip();
      if (!(overlayClip as any).__legMasked) {
        const include = /leg|foot|thigh|knee|shin|ankle|toe|calf|tibia|fibula/i;
        const exclude =
          /hip|pelvis|root|spine|neck|head|chest|shoulder|arm|hand|finger|torso/i;
        const original = overlayClip.tracks;
        const filtered = original.filter(
          (t: THREE.KeyframeTrack) =>
            include.test(t.name) && !exclude.test(t.name)
        );
        if (filtered.length > 0) {
          overlayClip.tracks = filtered;
        } else {
          console.warn(
            "[kick] No leg tracks matched; clip kept whole. Bones:",
            original.map((t: THREE.KeyframeTrack) => t.name)
          );
        }
        (overlayClip as any).__legMasked = true;
      }

      currentOverlayAction.current?.fadeOut(0.1);

      next.reset();
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
      next.setEffectiveTimeScale(1);
      next.setEffectiveWeight(2);
      next.fadeIn(0.05).play();

      currentOverlayAction.current = next;
      currentOverlayName.current = name;
      lastKickedAt.current = performance.now();
      collisionHitsDuringOverlay.current.clear();

      const mixer = next.getMixer();
      const onFinish = (e: any) => {
        if (e.action === next) {
          next.fadeOut(0.1);

          if (currentOverlayAction.current === next) {
            currentOverlayAction.current = null;
            currentOverlayName.current = null;
          }

          collisionHitsDuringOverlay.current.clear();
          mixer.removeEventListener("finished", onFinish);
        }
      };

      mixer.addEventListener("finished", onFinish);
    }
  };

  return {
    playAnimation,
    currentAnimationName,
    currentOverlayName,
    lastKickedAt,
    collisionHitsDuringOverlay
  };
}
