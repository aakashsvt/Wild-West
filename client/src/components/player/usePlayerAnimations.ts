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
    fadeDuration = 0.2,
    timeScale = 1
  ) => {
    const actions = horseRef.current?.actions;

    if (!actions || !actions[name]) return;

    const next = actions[name];

    // =========================
    // BASE ANIMATIONS
    // =========================
    if (type === "base") {
      if (currentBaseAction.current === next) {
        // If it's the same animation but the timescale changed (e.g. from forward to reverse), update it
        next.setEffectiveTimeScale(timeScale);
        return;
      }

      currentBaseAction.current?.fadeOut(fadeDuration);
      next.reset().setEffectiveTimeScale(timeScale).fadeIn(fadeDuration).play();

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
      next.setEffectiveWeight(1); // Set valid weight instead of magic '2'
      next.fadeIn(0.05).play();

      currentOverlayAction.current = next;
      currentOverlayName.current = name;
      lastKickedAt.current = performance.now();
      collisionHitsDuringOverlay.current.clear();

      const mixer = next.getMixer();
      
      // Cleanup previous listener if it exists
      if ((currentOverlayAction as any)._onFinishListener) {
        mixer.removeEventListener("finished", (currentOverlayAction as any)._onFinishListener);
      }

      const onFinish = (e: any) => {
        if (e.action === next) {
          next.fadeOut(0.1);

          if (currentOverlayAction.current === next) {
            currentOverlayAction.current = null;
            currentOverlayName.current = null;
          }

          collisionHitsDuringOverlay.current.clear();
          mixer.removeEventListener("finished", onFinish);
          delete (currentOverlayAction as any)._onFinishListener;
        }
      };

      (currentOverlayAction as any)._onFinishListener = onFinish;
      mixer.addEventListener("finished", onFinish);
    }
  };

  return {
    playAnimation,
    currentAnimationName,
    currentOverlayName,
    currentBaseAction,
    lastKickedAt,
    collisionHitsDuringOverlay
  };
}
