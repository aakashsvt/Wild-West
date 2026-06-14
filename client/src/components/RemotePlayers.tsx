import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, RoundCuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Euler,
  type KeyframeTrack,
  LoopOnce,
  MathUtils,
  Quaternion,
  Vector3,
} from "three";
import { useLobbyStore } from "@/hooks/use-lobby-store";
import { getSocket, useSocketEvent } from "@/hooks/use-socket";
import type { PlayerInfo, RacePlayerState, Vec3Tuple } from "@shared/types/multiplayer";
import { Model } from "./CowboyXHorse_GLB_v01";
import { Model1 } from "./CowboyXHorse_GLB_v08";
import { Model11 } from "./CowboyXHorse_NLA_V11";
import { registerRemoteBody, setRemoteKicking, unregisterRemoteBody } from "@/lib/remoke-kicks";
const PLAYER_COLORS = ["#d4a853", "#c0392b", "#2980b9", "#5a8a4a"];
const PLAYER_START_POSITION: Vec3Tuple = [422.5, 7, -25.1];
const PLAYER_START_ROTATION_Y = 2.5;
const START_LANE_SPACING = 5;
const MAX_EXTRAPOLATION_SECONDS = 0.12;

type RemoteRiderProps = {
  player: PlayerInfo;
  playerIndex: number;
  playerCount: number;
};

function getLaneStartPosition(playerIndex: number, playerCount: number) {
  const laneCount = Math.max(playerCount, 1);
  const centerIndex = (laneCount - 1) / 2;
  const spawnEuler = new Euler(0, PLAYER_START_ROTATION_Y, 0);
  const right = new Vector3(1, 0, 0).applyEuler(spawnEuler).normalize();

  return new Vector3(...PLAYER_START_POSITION).addScaledVector(
    right,
    (playerIndex - centerIndex) * START_LANE_SPACING,
  );
}

function RemoteRider({ player, playerIndex, playerCount }: RemoteRiderProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const horseRef = useRef<any>(null);
  const currentAction = useRef<any>(null);
  const lastAnimation = useRef<string | null>(null);
  const currentOverlayAction = useRef<any>(null);
  // Last overlay we acted on. Snapshots resend the same overlay name for the
  // duration of the kick; tracking the last one prevents replaying every frame.
  const lastOverlay = useRef<string | null>(null);
  const lastSentAt = useRef(0);
  const lastReceivedAt = useRef(0);
  const hasSnapshot = useRef(false);

  const startPosition = useMemo(
    () => getLaneStartPosition(playerIndex, playerCount),
    [playerIndex, playerCount],
  );
  const startRotation = useMemo(
    () => new Quaternion().setFromEuler(new Euler(0, PLAYER_START_ROTATION_Y, 0)),
    [],
  );

  const currentPosition = useRef(startPosition.clone());
  const basePosition = useRef(startPosition.clone());
  const targetPosition = useRef(startPosition.clone());
  const velocity = useRef(new Vector3());
  const currentRotation = useRef(startRotation.clone());
  const targetRotation = useRef(startRotation.clone());

  const playAnimation = useCallback((name: string) => {
    if (lastAnimation.current === name) return;

    const actions = horseRef.current?.actions;
    if (!actions) {
      return;
    }

    const fallbackAction = actions.RUN ?? actions.WALK ?? actions.IDLE ?? actions[Object.keys(actions)[0]];
    const next = actions[name] ?? fallbackAction;
    if (!next || currentAction.current === next) return;

    currentAction.current?.fadeOut?.(0.12);
    next.reset?.().fadeIn?.(0.12).play?.();
    currentAction.current = next;
    lastAnimation.current = name;
  }, []);

  // Mirrors PlayerController's overlay branch. The kick clip is masked to
  // leg-only tracks on first play so it never competes with RUN for the
  // rider's upper body — full kick weight, zero torso displacement.
  const playOverlay = useCallback((name: string) => {
    const actions = horseRef.current?.actions;
    const next = actions?.[name];
    if (!next) return;
    if (currentOverlayAction.current === next && next.isRunning?.()) return;

    const overlayClip = next.getClip();
    if (!(overlayClip as any).__legMasked) {
      const include = /leg|foot|thigh|knee|shin|ankle|toe|calf|tibia|fibula/i;
      const exclude =
        /hip|pelvis|root|spine|neck|head|chest|shoulder|arm|hand|finger|torso/i;
      const original = overlayClip.tracks;
      const filtered = original.filter(
        (t: KeyframeTrack) => include.test(t.name) && !exclude.test(t.name),
      );
      if (filtered.length > 0) {
        overlayClip.tracks = filtered;
      } else {
        console.warn(
          "[kick] No leg tracks matched; clip kept whole. Bones:",
          original.map((t: KeyframeTrack) => t.name),
        );
      }
      (overlayClip as any).__legMasked = true;
    }

    currentOverlayAction.current?.fadeOut?.(0.1);

    next.reset();
    next.setLoop(LoopOnce, 1);
    next.clampWhenFinished = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(2);
    next.fadeIn(0.05).play();
    currentOverlayAction.current = next;

    const mixer = next.getMixer();
    const onFinish = (e: any) => {
      if (e.action !== next) return;
      next.fadeOut(0.1);
      if (currentOverlayAction.current === next) {
        currentOverlayAction.current = null;
      }
      mixer.removeEventListener("finished", onFinish);
    };
    mixer.addEventListener("finished", onFinish);
  }, []);

  const onPlayerState = useCallback(
    (state: RacePlayerState) => {
      if (state.socketId !== player.socketId || state.sentAt <= lastSentAt.current) return;

      lastSentAt.current = state.sentAt;
      lastReceivedAt.current = performance.now();
      hasSnapshot.current = true;

      basePosition.current.set(
        state.position[0],
        state.position[1],
        state.position[2],
      );
      targetPosition.current.copy(basePosition.current);
      velocity.current.set(
        state.velocity[0],
        state.velocity[1],
        state.velocity[2],
      );
      targetRotation.current.set(
        state.rotation[0],
        state.rotation[1],
        state.rotation[2],
        state.rotation[3],
      );

      playAnimation(state.animation);

      // Overlay (kick): sender keeps publishing the same name for the duration
      // of the action, so only trigger on the transition. Clear the latch when
      // the sender clears the overlay so the next kick of the same kind fires.
      const incomingOverlay = state.overlay ?? null;
      if (incomingOverlay) {
        if (incomingOverlay !== lastOverlay.current) {
          playOverlay(incomingOverlay);
          lastOverlay.current = incomingOverlay;
        }
      } else {
        lastOverlay.current = null;
      }

      if (bodyRef.current) {
        setRemoteKicking(bodyRef.current, !!incomingOverlay);
      }
    },
    [player.socketId, playAnimation, playOverlay],
  );

  useSocketEvent("race:player-state", onPlayerState);

  useEffect(() => {
    const rb = bodyRef.current;
    if (!rb) return;
    registerRemoteBody(rb, player.socketId);
    return () => {
      unregisterRemoteBody(rb);
    }

  }, [player.socketId]);

  useEffect(() => {
    currentPosition.current.copy(startPosition);
    basePosition.current.copy(startPosition);
    targetPosition.current.copy(startPosition);
    currentRotation.current.copy(startRotation);
    targetRotation.current.copy(startRotation);

    bodyRef.current?.setNextKinematicTranslation(
      {
        x: startPosition.x,
        y: startPosition.y,
        z: startPosition.z,
      },
    );
    bodyRef.current?.setNextKinematicRotation(
      {
        x: startRotation.x,
        y: startRotation.y,
        z: startRotation.z,
        w: startRotation.w,
      },
    );
  }, [startPosition, startRotation]);

  useFrame(() => {
    if (!bodyRef.current || !hasSnapshot.current) return;

    const now = performance.now();
    const ageMs = now - lastReceivedAt.current;
    const extrapolationSeconds = Math.min(ageMs / 1000, MAX_EXTRAPOLATION_SECONDS);
    targetPosition.current.copy(basePosition.current).addScaledVector(
      velocity.current,
      extrapolationSeconds,
    );

    const distanceToTarget = currentPosition.current.distanceTo(targetPosition.current);
    if (distanceToTarget > 25) {
      currentPosition.current.copy(targetPosition.current);
      currentRotation.current.copy(targetRotation.current);
    } else {
      currentPosition.current.lerp(targetPosition.current, 0.28);
      currentRotation.current.slerp(targetRotation.current, 0.25);
    }

    // Move remotes as kinematic bodies so Rapier can solve contacts against
    // the local dynamic horse instead of treating updates as teleports.
    bodyRef.current.setNextKinematicTranslation(
      {
        x: currentPosition.current.x,
        y: currentPosition.current.y,
        z: currentPosition.current.z,
      },
    );
    bodyRef.current.setNextKinematicRotation(
      {
        x: currentRotation.current.x,
        y: currentRotation.current.y,
        z: currentRotation.current.z,
        w: currentRotation.current.w,
      },
    );
  });

  const color = PLAYER_COLORS[player.colorIndex] ?? "#e8d5b0";

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      position={[startPosition.x, startPosition.y, startPosition.z]}
      rotation={[0, PLAYER_START_ROTATION_Y, 0]}
      colliders={false}
      mass={0.1}
      friction={0.5}
      restitution={0}
      linearDamping={1}
      angularDamping={8}
      canSleep={false}
      dominanceGroup={10}
      enabledRotations={[false, false, false]}
      ccd
    >
      <RoundCuboidCollider
        args={[1.4, 0.7, 3, 0.2]}
        position={[0, 0.9, 0]}
        restitution={0}
      />
      <RoundCuboidCollider
        args={[1.4, 2.7, 3, 0.2]}
        position={[0, 2.9, 0]}
        restitution={0}
      />
      <group>
        {/* <Model1 ref={horseRef} /> */}
        <Model11 ref={horseRef} />
        <Html position={[0, 5.2, 0]} center distanceFactor={35} style={{ pointerEvents: "none" }}>
          <div
            style={{
              background: "rgba(19, 10, 4, 0.82)",
              border: `1px solid ${color}80`,
              borderRadius: 4,
              boxShadow: "0 4px 18px rgba(0,0,0,0.5)",
              color,
              fontFamily: "serif",
              fontSize: 12,
              letterSpacing: "0.08em",
              padding: "4px 8px",
              textShadow: "1px 1px 0 #0a0603",
              whiteSpace: "nowrap",
            }}
          >
            {player.username}
          </div>
        </Html>
      </group>
    </RigidBody>
  );
}

export function RemotePlayers() {
  const players = useLobbyStore((state) => state.players);
  const socketId = useLobbyStore((state) => state.socketId);
  const mySocketId = socketId ?? getSocket().id;

  const remotePlayers = useMemo(
    () =>
      players
        .map((player, index) => ({ player, index }))
        .filter(({ player }) => player.socketId !== mySocketId),
    [mySocketId, players],
  );

  return (
    <>
      {remotePlayers.map(({ player, index }) => (
        <RemoteRider
          key={player.socketId}
          player={player}
          playerIndex={index}
          playerCount={players.length}
        />
      ))}
    </>
  );
}
