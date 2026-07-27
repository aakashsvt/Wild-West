import { useRef } from "react";
import {
  WALK2RUN_DURATION_MS,
  WALK2RUN_ENTER_FADE,
  MIN_SLIDE_SPEED_FOR_STUMBLE,
  STUMBLE_ANIMATION_TIMESCALE,
  BACKWARD_ANIMATION_TIMESCALE,
} from "./constants";

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

// Define all valid base states corresponding to GLTF animation names
export enum PlayerState {
  IDLE = "IDLE",
  WALK = "WALK",
  RUN = "RUN",
  RUN_LEFT = "RUN_LEFT",
  RUN_RIGHT = "RUN_RIGHT",
  RUN_BOOST = "RUN_BOOST",
  WALK2RUN = "WALK2RUN",
  TURN_LEFT = "TURN_LEFT",
  TURN_RIGHT = "TURN_RIGHT",
  JUMP = "JUMP",
  // HAZARDS:
  STUMBLE = "STUMBLE",
  FALL = "FALL",
}

// Define all valid overlay states (kicks, etc.)
export enum PlayerOverlayState {
  RUN_KICK_LEFT = "RUN_KICK_LEFT",
  RUN_KICK_RIGHT = "RUN_KICK_RIGHT",
  NONE = "NONE"
}

export function usePlayerStateMachine(
  playAnimation: (name: string, type?: "base" | "overlay", fadeDuration?: number, timeScale?: number) => void
) {
  const transitioningToRun = useRef(false);
  const walk2RunStartedAt = useRef(0);

  const updateStateMachine = (
    now: number,
    inputs: PlayerInputs,
    stunState: "NONE" | "FALL" | "STUMBLE" | "STUMBLE_SIDE" | "KICKED",
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

    // Track state of walk-to-run transition
    const inStraightRunState = forward && run && !isBoosting && !left && !right && !jump;
    if (!inStraightRunState) {
      transitioningToRun.current = false;
    }

    // 1. Determine Base State
    let targetBaseState = PlayerState.IDLE;
    let fadeOverride: number | undefined = undefined;
    let targetTimeScale = 1;

    if (stunState === "NONE") {
      if (jump) {
        targetBaseState = PlayerState.JUMP;
      } else if (forward) {
        if (run || isBoosting) {
          if (left) targetBaseState = PlayerState.RUN_LEFT;
          else if (right) targetBaseState = PlayerState.RUN_RIGHT;
          else if (isBoosting) targetBaseState = PlayerState.RUN_BOOST;
          else {
            if (!transitioningToRun.current && currentAnimationName === PlayerState.WALK) {
              transitioningToRun.current = true;
              walk2RunStartedAt.current = now;
            }
            if (transitioningToRun.current && now - walk2RunStartedAt.current < WALK2RUN_DURATION_MS) {
              targetBaseState = PlayerState.WALK2RUN;
              fadeOverride = WALK2RUN_ENTER_FADE;
            } else {
              transitioningToRun.current = false;
              targetBaseState = PlayerState.RUN;
            }
          }
        } else {
          targetBaseState = PlayerState.WALK;
        }
      } else if (backward) {
        targetBaseState = PlayerState.WALK;
        targetTimeScale = BACKWARD_ANIMATION_TIMESCALE; // Play walk backwards if moving backward
      } else if (left) {
        targetBaseState = PlayerState.TURN_LEFT;
      } else if (right) {
        targetBaseState = PlayerState.TURN_RIGHT;
      } else {
        if (currentSpeed > 15) targetBaseState = PlayerState.RUN;
        else if (currentSpeed > 6) targetBaseState = PlayerState.WALK;
        else targetBaseState = PlayerState.IDLE;
      }
    } else {
      // Handle the various stun states
      if (stunState === "FALL") {
        targetBaseState = PlayerState.FALL;
      } else if (stunState === "STUMBLE") {
        // Only play the reverse walk animation if the horse is physically sliding backward from the recoil.
        // Once friction stops the slide, seamlessly fall back to IDLE while they remain stunned.
        if (currentSpeed > MIN_SLIDE_SPEED_FOR_STUMBLE) {
          targetBaseState = PlayerState.WALK;
          targetTimeScale = STUMBLE_ANIMATION_TIMESCALE; // Play walk quickly in reverse for the bounce back
        } else {
          targetBaseState = PlayerState.IDLE;
        }
      } else if (stunState === "STUMBLE_SIDE") {
        targetBaseState = PlayerState.STUMBLE; // Play the actual STUMBLE animation clip!
        targetTimeScale = 1.0; // Play it at normal speed
      } else {
        targetBaseState = PlayerState.IDLE; // "KICKED" falls back to IDLE unless we have a hit animation
      }
    }

    // Apply Base State
    playAnimation(targetBaseState, "base", fadeOverride, targetTimeScale);


    // 2. Determine Overlay State (Kicks)
    let targetOverlayState = PlayerOverlayState.NONE;

    // ENHANCEMENT: Relaxed kicking constraints so you can kick even if you aren't sprinting straight!
    if (stunState === "NONE") {
       if (kickLeft) targetOverlayState = PlayerOverlayState.RUN_KICK_LEFT;
       else if (kickRight) targetOverlayState = PlayerOverlayState.RUN_KICK_RIGHT;
    }

    // Apply Overlay State (only trigger if it's not NONE)
    if (targetOverlayState !== PlayerOverlayState.NONE) {
      playAnimation(targetOverlayState, "overlay");
    }
  };

  return { updateStateMachine, transitioningToRun, walk2RunStartedAt };
}
