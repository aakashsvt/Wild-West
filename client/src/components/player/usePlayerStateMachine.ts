import { useRef, MutableRefObject } from "react";
import { WALK2RUN_DURATION_MS, WALK2RUN_ENTER_FADE } from "./constants";

export type PlayerInputs = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  kickLeft: boolean;
  kickRight: boolean;
  run: boolean;
  isBoosting: boolean;
};

export function usePlayerStateMachine(
  playAnimation: (name: string, type?: "base" | "overlay", fadeDuration?: number) => void
) {
  const transitioningToRun = useRef(false);
  const walk2RunStartedAt = useRef(0);

  const updateStateMachine = (
    now: number,
    inputs: PlayerInputs,
    isStunned: boolean,
    currentSpeed: number,
    currentAnimationName: string
  ) => {
    const {
      forward,
      backward,
      left,
      right,
      jump,
      kickLeft,
      kickRight,
      run,
      isBoosting,
    } = inputs;

    // WALK2RUN only ever applies to the plain straight-run case below (no
    // boost, no turn, no jump) — leaving that exact state for ANY reason
    // (releasing Shift, turning, boosting, jumping) clears the in-progress
    // flag so no stale transition can resume from a stale timestamp later.
    const inStraightRunState = forward && run && !isBoosting && !left && !right && !jump;
    if (!inStraightRunState) {
      transitioningToRun.current = false;
    }

    if (!isStunned) {
      if (jump) {
        playAnimation("JUMP");
      } else if (forward) {
        if (run || isBoosting) {
          if (left) playAnimation("RUN_LEFT");
          else if (right) playAnimation("RUN_RIGHT");
          else if (isBoosting) {
            playAnimation("RUN_BOOST");
            if (kickLeft) playAnimation("RUN_KICK_LEFT", "overlay");
            else if (kickRight) playAnimation("RUN_KICK_RIGHT", "overlay");
          } else {
            if (!transitioningToRun.current && currentAnimationName === "WALK") {
              transitioningToRun.current = true;
              walk2RunStartedAt.current = now;
            }
            if (transitioningToRun.current && now - walk2RunStartedAt.current < WALK2RUN_DURATION_MS) {
              playAnimation("WALK2RUN", "base", WALK2RUN_ENTER_FADE);
            } else {
              transitioningToRun.current = false;
              playAnimation("RUN");
            }
            if (kickLeft) playAnimation("RUN_KICK_LEFT", "overlay");
            else if (kickRight) playAnimation("RUN_KICK_RIGHT", "overlay");
          }
        } else {
          playAnimation("WALK");
        }
      } else if (backward) {
        playAnimation("WALK");
      } else if (left) {
        playAnimation("TURN_LEFT");
      } else if (right) {
        playAnimation("TURN_RIGHT");
      } else {
        if (currentSpeed > 15) playAnimation("RUN");
        else if (currentSpeed > 6) playAnimation("WALK");
        else playAnimation("IDLE");
      }
    } else {
      playAnimation("IDLE");
    }
  };

  return { updateStateMachine, transitioningToRun, walk2RunStartedAt };
}
