import { useFrame, useThree } from "@react-three/fiber";
import {
  RigidBody,
  type RapierRigidBody,
  CuboidCollider,
  CapsuleCollider,
  RoundCuboidCollider,
} from "@react-three/rapier";
import { useEffect, useMemo, useRef, useCallback } from "react";
import { Vector3, Quaternion, Euler } from "three";
import { useKeyboardControls } from "@react-three/drei";
import { useGameStore } from "@/hooks/use-game-store";
import { useLobbyStore } from "@/hooks/use-lobby-store";
import { getSocket, useSocketEvent } from "@/hooks/use-socket";
import { useDustTrail } from "@/hooks/use-dust-trail";
import type { Vec3Tuple, RacePlayerState } from "@shared/types/multiplayer";
import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { Model42 } from "../CowboyXHorse_NLA_V42";
import {
  isRemoteKicking,
  getSocketIdForBody,
  setRemoteStun,
} from "@/lib/remoke-kicks";

// const PLAYER_START_POSITION: [number, number, number] = [-340, 5.5787, 410];
import {
  PLAYER_START_POSITION, MAX_SPEED, WALK_TARGET_SPEED, TURN_SPEED, BRAKE_FORCE,
  BOOST_SPEED_MULTIPLIER, WALK2RUN_DURATION_MS, WALK2RUN_ENTER_FADE, WALK2RUN_LEAN_ANGLE,
  WALK2RUN_LEAN_SMOOTH_SPEED, WALK_LEAN_ANGLE, WALK_LEAN_SMOOTH_SPEED, PLAYER_START_ROTATION_Y,
  CAM_OFFSET, CAM_OFFSET_RUN, CAM_LOOK_OFFSET, CAM_OFFSET_REFERENCE_FOV, FIRST_PERSON_HEIGHT_DEFAULT,
  FIRST_PERSON_FORWARD, FIRST_PERSON_LOOK_DISTANCE, MOUSE_LOOK_SENSITIVITY, MOUSE_LOOK_YAW_LIMIT,
  MOUSE_LOOK_PITCH_LIMIT, TP_FOV_WALK, TP_FOV_RUN, FP_FOV_RUN_START_SPEED, FP_FOV_RUN_MAX_SPEED,
  FP_FOV_IDLE, FP_FOV_RUN, JUMP_CAMERA_BOB_DURATION, NETWORK_STATE_INTERVAL, START_LANE_SPACING,
  jumpCameraBobOffset
} from './constants';
import { HorseHeadTilt } from './HorseHeadTilt';
import { usePlayerMovement } from './usePlayerMovement';
import { usePlayerCamera } from './usePlayerCamera';
import { usePlayerAnimations } from './usePlayerAnimations';
import { usePlayerNetwork } from './usePlayerNetwork';
import { useControls, button } from "leva";
import { usePlayerStateMachine } from './usePlayerStateMachine';
import { usePlayerImpacts } from './usePlayerImpacts';
type Props = {
  playerRef: React.MutableRefObject<RapierRigidBody | null>;
  isFirstPersonRef: React.MutableRefObject<boolean>;
};
export function PlayerController({ playerRef, isFirstPersonRef }: Props) {
  const horseRef = useRef<any>(null);
  const leanGroupRef = useRef<THREE.Group>(null);
  // Shared with HorseHeadTilt below so it can read the same turn state
  // without recomputing it — updated once per frame in the main loop.
  const turnLeanInput = useRef({ active: false, dir: 0 });
  const body = useRef<RapierRigidBody>(null);
  const [, getKeys] = useKeyboardControls();
  const { setSpeed, addScore, isPlaying } = useGameStore();
  const players = useLobbyStore((state) => state.players);
  const socketId = useLobbyStore((state) => state.socketId);
  const camera = useThree((state) => state.camera as PerspectiveCamera);
  const glDomElement = useThree((state) => state.gl.domElement);

  // First-person mouse look — see MOUSE_LOOK_SENSITIVITY above. Click the
  // canvas to lock the pointer (standard browser-game pattern; Escape
  // releases it same as any pointer-locked page), then movementX/Y yaws
  // and pitches the FP look-at target, clamped, only while in first person.
  const mouseYawOffset = useRef(0);
  const mousePitchOffset = useRef(0);
  // Look up/down (pitch) is locked off by default — toggled via "L"
  // (see toggleLookPitch handling in the main useFrame below). Yaw
  // (left/right) is always active in FP; only pitch is gated.
  const pitchUnlockedRef = useRef(false);
  useEffect(() => {
    const handleClick = () => {
      if (document.pointerLockElement !== glDomElement) {
        glDomElement.requestPointerLock();
      }
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== glDomElement) return;
      if (!isFirstPersonRef.current) return;
      mouseYawOffset.current = THREE.MathUtils.clamp(
        mouseYawOffset.current - e.movementX * MOUSE_LOOK_SENSITIVITY,
        -MOUSE_LOOK_YAW_LIMIT,
        MOUSE_LOOK_YAW_LIMIT,
      );
      if (pitchUnlockedRef.current) {
        mousePitchOffset.current = THREE.MathUtils.clamp(
          mousePitchOffset.current - e.movementY * MOUSE_LOOK_SENSITIVITY,
          -MOUSE_LOOK_PITCH_LIMIT,
          MOUSE_LOOK_PITCH_LIMIT,
        );
      }
    };
    glDomElement.addEventListener("click", handleClick);
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      glDomElement.removeEventListener("click", handleClick);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [glDomElement, isFirstPersonRef]);

  // Snapshot players when the game starts so that players leaving mid-race
  // don't shift lane offsets and teleport everyone back to spawn.
  const playersSnapshot = useRef(players);
  useEffect(() => {
    if (!isPlaying) playersSnapshot.current = players;
  }, [isPlaying, players]);

  const startTransform = useMemo(() => {
    const activePlayers = playersSnapshot.current;
    const playerIndex = activePlayers.findIndex(
      (player) => player.socketId === (socketId ?? getSocket().id),
    );
    const laneCount = Math.max(activePlayers.length, 1);
    const laneIndex = playerIndex >= 0 ? playerIndex : 0;
    const centerIndex = (laneCount - 1) / 2;
    const spawnEuler = new Euler(0, PLAYER_START_ROTATION_Y, 0);
    const right = new Vector3(1, 0, 0).applyEuler(spawnEuler).normalize();
    const position = new Vector3(...PLAYER_START_POSITION).addScaledVector(
      right,
      (laneIndex - centerIndex) * START_LANE_SPACING,
    );

    return {
      euler: spawnEuler,
      position,
      positionTuple: [position.x, position.y, position.z] as Vec3Tuple,
    };
  }, [socketId]);

  const fpHeight = FIRST_PERSON_HEIGHT_DEFAULT;

  // GameDemo snaps the camera straight to the follow position on the first
  // frame instead of lerping from a stale start, which otherwise drags the
  // camera through solid terrain for dozens of frames on load.
  const cameraSnapped = useRef(false);
  const fpCameraSnapped = useRef(false);
  const toggleViewWasDown = useRef(false);
  const toggleLookPitchWasDown = useRef(false);

  // Store distance traveled for scoring
  const lastPosition = useRef(new Vector3());
  const proximityContacts = useRef<Set<string>>(new Set());
  const stunnedUntil = useRef<number>(0);
  const stunState = useRef<"NONE" | "FALL" | "STUMBLE" | "KICKED">("NONE");

  useEffect(() => {
    playerRef.current = body.current;
  }, [playerRef]);

  useDustTrail(horseRef, body);
  useEffect(() => {
    const spawnPosition = startTransform.position;
    const spawnEuler = startTransform.euler;
    const initialTarget = spawnPosition.clone().add(CAM_LOOK_OFFSET);
    const initialCameraPosition = spawnPosition
      .clone()
      .add(CAM_OFFSET.clone().applyEuler(spawnEuler));

    lastPosition.current.copy(spawnPosition);

    camera.position.copy(initialCameraPosition);
    camera.lookAt(initialTarget);
  }, [camera, startTransform]);




  const { updateMovement } = usePlayerMovement(setSpeed, addScore);
  const { updateCamera, triggerShake } = usePlayerCamera(camera);

  const shakeConfig = useControls("Camera Shake", {
    minorIntensity: { value: 0.3, min: 0.1, max: 5.0, step: 0.1 },
    minorDuration: { value: 0.2, min: 0.1, max: 2.0, step: 0.1 },
    "Test Minor": button((get) => triggerShake(get("Camera Shake.minorIntensity"), get("Camera Shake.minorDuration"))),
    mediumIntensity: { value: 0.6, min: 0.1, max: 5.0, step: 0.1 },
    mediumDuration: { value: 0.35, min: 0.1, max: 2.0, step: 0.1 },
    "Test Medium": button((get) => triggerShake(get("Camera Shake.mediumIntensity"), get("Camera Shake.mediumDuration"))),
    majorIntensity: { value: 1.0, min: 0.1, max: 5.0, step: 0.1 },
    majorDuration: { value: 0.5, min: 0.1, max: 2.0, step: 0.1 },
    "Test Major": button((get) => triggerShake(get("Camera Shake.majorIntensity"), get("Camera Shake.majorDuration"))),
  });
  const shakeConfigRef = useRef(shakeConfig);
  shakeConfigRef.current = shakeConfig;

  const colliderConfig = useControls("Player Collider", {
    horseWidth: { value: 0.92, min: 0.1, max: 2.0, step: 0.01 },
    riderWidth: { value: 1.2, min: 0.1, max: 2.0, step: 0.01 },
  });
  const { updateNetwork } = usePlayerNetwork();
  const { playAnimation, currentAnimationName, currentOverlayName, collisionHitsDuringOverlay, lastKickedAt } = usePlayerAnimations(horseRef);
  const { updateStateMachine, transitioningToRun, walk2RunStartedAt } = usePlayerStateMachine(playAnimation);


  usePlayerImpacts(body, stunnedUntil, stunState, triggerShake, shakeConfigRef);

  useFrame((state, delta) => {
    if (!body.current || !isPlaying) return;

    const now = performance.now();
    const isStunned = stunnedUntil.current > now;
    if (!isStunned) stunState.current = "NONE";
    const currentStunState = isStunned ? stunState.current : "NONE";
    const keys = getKeys();
    const isBoosting = keys.forward && keys.boost;

    if (keys.toggleView && !toggleViewWasDown.current) {
      isFirstPersonRef.current = !isFirstPersonRef.current;
      if (isFirstPersonRef.current) {
        mouseYawOffset.current = 0;
        mousePitchOffset.current = 0;
      }
    }
    toggleViewWasDown.current = keys.toggleView;

    if (keys.toggleLookPitch && !toggleLookPitchWasDown.current) {
      pitchUnlockedRef.current = !pitchUnlockedRef.current;
      if (!pitchUnlockedRef.current) mousePitchOffset.current = 0;
    }
    toggleLookPitchWasDown.current = keys.toggleLookPitch;

    const inputs = { ...keys, isBoosting };

    const { velocity, currentSpeed, forwardDir, displaySpeedKmh } = updateMovement(
      delta, body.current, inputs, currentStunState, lastPosition
    );

    updateStateMachine(
      now, inputs, currentStunState, currentSpeed, currentAnimationName.current
    );

    const wantsLean = currentStunState === "NONE" && !keys.jump && keys.forward && !keys.run && !isBoosting && (keys.left || keys.right);
    turnLeanInput.current.active = wantsLean;
    turnLeanInput.current.dir = keys.left ? 1 : -1;
    if (leanGroupRef.current) {
      const targetLean = wantsLean ? (keys.left ? WALK_LEAN_ANGLE : -WALK_LEAN_ANGLE) : 0;
      leanGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        leanGroupRef.current.rotation.z, targetLean, Math.min(1, delta * WALK_LEAN_SMOOTH_SPEED)
      );

      const walk2RunProgress = transitioningToRun.current
        ? THREE.MathUtils.clamp((now - walk2RunStartedAt.current) / WALK2RUN_DURATION_MS, 0, 1)
        : null;
      const targetForwardLean = walk2RunProgress !== null
          ? Math.sin(walk2RunProgress * Math.PI) * WALK2RUN_LEAN_ANGLE
          : 0;
      leanGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        leanGroupRef.current.rotation.x, targetForwardLean, Math.min(1, delta * WALK2RUN_LEAN_SMOOTH_SPEED)
      );
    }

    updateCamera(
      delta, body.current, isFirstPersonRef.current,
      mouseYawOffset.current, mousePitchOffset.current,
      forwardDir, currentSpeed, horseRef, keys.run
    );

    updateNetwork(
      state.clock.elapsedTime, body.current, velocity, displaySpeedKmh,
      currentAnimationName.current, currentOverlayName.current
    );
  });

  return (
    <RigidBody
      name="player"
      ref={body}
      position={startTransform.positionTuple}
      // position={[500, 6.5787, 0]}
      rotation={[0, PLAYER_START_ROTATION_Y, 0]}
      colliders={false}
      mass={10}
      friction={0.5}
      restitution={0}
      linearDamping={1}
      angularDamping={8}
      canSleep={false}
      dominanceGroup={10}
      enabledRotations={[false, false, false]} // Allow some tilt? Maybe lock X/Z for simpler arcade feel
      ccd
    >
      {/* <CuboidCollider args={[0.5, 0.5, 2.2]} position={[0, 0.5, 0]} restitution={0.2} /> */}
      {/* <CuboidCollider args={[1.5, 0.5, 0.5]} position={[0, 0.5, 2]} />
      <CuboidCollider args={[1.5, 0.5, 0.5]} position={[0, 0.5, -2]} />
      <CuboidCollider args={[0.5, 0.5, 2]} position={[0.5, 0.5, 0]} />
      <CuboidCollider args={[0.5, 0.5, 2]} position={[-0.5, 0.5, 0]} /> */}
      {/* <CuboidCollider args={[0.5, 1, 2]} position={[0, 1.7, 0]} /> */}
      {/* <RoundCuboidCollider
        args={[1.4, 0.7, 5, 0.2]}
        position={[0, 0.9, 1]}
        restitution={0}

      /> */}
      <RoundCuboidCollider
        args={[colliderConfig.riderWidth, 1.7, 2, 0.2]}
        position={[0, 7, 0]}
        restitution={0}
      />
      <RoundCuboidCollider
        args={[colliderConfig.horseWidth, 2.7, 5, 0.2]}
        position={[0, 2.9, 1]}
        restitution={0}
      />
      {/* Sensor used to detect kick hits in front of the rider */}
      <RoundCuboidCollider
        args={[3, 5, 5, 0.2]}
        position={[0, 5.2, 1]}
        sensor
        onCollisionEnter={({ other }) => {
          console.log("aaaaaacollision enter", other.rigidBody);
          if (!other.rigidBody) return;
          const otherBody = other.rigidBody as RapierRigidBody;
          const otherHandle = otherBody.handle;
          if (collisionHitsDuringOverlay.current.has(otherHandle)) return;
          if (!currentOverlayName.current) return;
          const now = performance.now();
          if (now - lastKickedAt.current > 1500) return;
          const targetSocketId = getSocketIdForBody(otherBody);
          if (!targetSocketId) return;
          const myId = socketId ?? getSocket().id;
          if (targetSocketId === myId) return;
          collisionHitsDuringOverlay.current.add(otherHandle);
          console.log(
            `aaaaaa[kick] ${myId} hit ${targetSocketId} with ${currentOverlayName.current}`,
          );
          setRemoteStun(otherBody, 2000);
        }}
      />
      {/* <RoundCuboidCollider
        args={[1.6, 2.7, 5, 0.2]}
        position={[0, 2.9, 1]}

        sensor
        onCollisionEnter={({ other }) => {
          if (!other.rigidBody) return;
          const otherId = other.rigidBody.handle;
          proximityContacts.current.add(otherId.toString());
        }}
        onCollisionExit={({ other }) => {
          if (!other.rigidBody) return;
          const otherId = other.rigidBody.handle;
          proximityContacts.current.delete(otherId.toString());
        }}
      /> */}

      {/* <CapsuleCollider args={[1, 0.5]} position={[0, 0.7, -2]} rotation={[0, 0, Math.PI / 2]} />
      <CapsuleCollider args={[1, 0.5]} position={[0, 0.7, 3]} rotation={[0, 0, Math.PI / 2]} /> */}
      <group ref={leanGroupRef}>
        <Model42 ref={horseRef} />
        <HorseHeadTilt horseRef={horseRef} turnLeanInput={turnLeanInput} />
      </group>
    </RigidBody>
  );
}
