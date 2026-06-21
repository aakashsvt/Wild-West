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
import type { Vec3Tuple, RacePlayerState } from "@shared/types/multiplayer";
import { Model } from "./CowboyXHorse_GLB_v01";
import { Model1 } from "./CowboyXHorse_GLB_v08";
import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { Model11 } from "./CowboyXHorse_NLA_V11";
import {
  isRemoteKicking,
  getSocketIdForBody,
  setRemoteStun,
} from "@/lib/remoke-kicks";
// const PLAYER_START_POSITION: [number, number, number] = [-340, 5.5787, 410];

const PLAYER_START_POSITION: [number, number, number] = [422.5, 150, -25.1];

const MAX_SPEED = 260;
const ACCELERATION = 50;
const TURN_SPEED = 2;
const BRAKE_FORCE = 5;
const PLAYER_START_ROTATION_Y = 2.5;
const CAMERA_TARGET_OFFSET = new Vector3(0, 10, 0);
const CAMERA_FOLLOW_OFFSET = new Vector3(0, 12, -14);

const CAMERA_HEIGHT = 12;
const CAMERA_DISTANCE = 14;
const LOOK_AHEAD = 60;
const FOLLOW_LERP = 0.1;
const FOV_BASE = 60;
const FOV_BOOST = 5;
const NETWORK_STATE_INTERVAL = 1 / 30;
const START_LANE_SPACING = 10;
type Props = {
  playerRef: React.MutableRefObject<RapierRigidBody | null>;
};
export function PlayerController({ playerRef }: Props) {
  const horseRef = useRef<any>(null);
  const currentAction = useRef<any>(null);
  const currentBaseAction = useRef<any>(null);
  const currentOverlayAction = useRef<any>(null);
  const currentAnimationName = useRef("IDLE");
  // Active overlay (kick) name so it can be broadcast alongside the base
  // animation. currentAnimationName tracks only base animations; without this
  // ref, peers never see kicks.
  const currentOverlayName = useRef<string | null>(null);
  const lastNetworkStateAt = useRef(0);
  const lastKickedAt = useRef(0);
  const body = useRef<RapierRigidBody>(null);
  const [, getKeys] = useKeyboardControls();
  const { setSpeed, addScore, isPlaying } = useGameStore();
  const players = useLobbyStore((state) => state.players);
  const socketId = useLobbyStore((state) => state.socketId);
  const camera = useThree((state) => state.camera as PerspectiveCamera);

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

  // Smooth the follow anchor and facing while keeping the offset distance fixed.
  const cameraTarget = useRef(new Vector3());
  const cameraAnchor = useRef(new Vector3());
  const cameraRotation = useRef(new Quaternion());

  // Store distance traveled for scoring
  const lastPosition = useRef(new Vector3());
  const proximityContacts = useRef<Set<string>>(new Set());
  const collisionHitsDuringOverlay = useRef<Set<number>>(new Set());
  const stunnedUntil = useRef<number>(0);

  useEffect(() => {
    playerRef.current = body.current;
  }, [playerRef]);
  useEffect(() => {
    const spawnPosition = startTransform.position;
    const spawnEuler = startTransform.euler;
    const spawnRotation = new Quaternion().setFromEuler(spawnEuler);
    const initialTarget = spawnPosition.clone().add(CAMERA_TARGET_OFFSET);
    const initialCameraPosition = spawnPosition
      .clone()
      .add(CAMERA_FOLLOW_OFFSET.clone().applyEuler(spawnEuler));

    cameraAnchor.current.copy(spawnPosition);
    cameraRotation.current.copy(spawnRotation);
    cameraTarget.current.copy(initialTarget);
    lastPosition.current.copy(spawnPosition);

    camera.position.copy(initialCameraPosition);
    camera.lookAt(initialTarget);
  }, [camera, startTransform]);

  // Listen for remote player state updates to detect when nearby remotes are kicking
  const handleRemotePlayerState = useCallback((state: RacePlayerState) => {
    if (!body.current) return;

    // Only care if the remote has a kick overlay
    if (!state.overlay) return;

    // Check distance from local player to remote player
    const localPos = body.current.translation();
    const remotePos = new Vector3(
      state.position[0],
      state.position[1],
      state.position[2],
    );
    const distance = Math.hypot(
      localPos.x - remotePos.x,
      localPos.y - remotePos.y,
      localPos.z - remotePos.z,
    );

    // If remote is within kick range (~10 units), stun the local player
    const KICK_RANGE = 10;
    if (distance < KICK_RANGE) {
      stunnedUntil.current = performance.now() + 2000;
      console.log(
        `aaaaa[LOCAL STUN] Remote player at distance ${distance.toFixed(1)} is kicking, local player stunned`,
      );
    }
  }, []);

  useSocketEvent("race:player-state", handleRemotePlayerState);

  useFrame((state, delta) => {
    if (!body.current || !isPlaying) return;

    const rb = body.current;

    // Check if locally stunned - if so, skip movement and return early
    const now = performance.now();
    const isStunned = stunnedUntil.current > now;
    if (isStunned) {
      const linvel = rb.linvel();
      rb.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
      playAnimation("IDLE");
      return;
    }

    const { forward, backward, left, right, jump, kickLeft, kickRight } =
      getKeys();

    const impulse = { x: 0, y: 0, z: 0 };
    const torque = { x: 0, y: 0, z: 0 };

    // current velocity
    const linvel = rb.linvel();
    const velocity = new Vector3(linvel.x, linvel.y, linvel.z);

    const rotation = rb.rotation();
    const quat1 = new Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w,
    );
    const euler = new Euler().setFromQuaternion(quat1);

    // forward direction
    const forwardDir = new Vector3(0, 0, 1).applyEuler(euler).normalize();

    // speed
    const currentSpeed = Math.sqrt(linvel.x ** 2 + linvel.z ** 2);

    // =========================
    // �️ PROXIMITY REPULSION
    // =========================
    // if (proximityContacts.current.size > 0) {
    //   // Keep local repulsion minimal; remote pause is the main collision fix.
    //   const repulsionDir = new Vector3(0, 0, 0);
    //   proximityContacts.current.forEach(() => {
    //     repulsionDir.z += 1;
    //   });
    //   if (repulsionDir.length() > 0) {
    //     repulsionDir.normalize();
    //     velocity.addScaledVector(repulsionDir, 0.2);
    //   }
    // }

    // =========================
    // �🔁 TURNING (SMOOTH)
    // =========================

    if (left || right) {
      const turnDir = left ? 1 : -1;

      const turnSpeedFactor = THREE.MathUtils.lerp(
        1.2,
        0.4,
        currentSpeed / MAX_SPEED,
      );

      const turnAmount = turnDir * TURN_SPEED * turnSpeedFactor * delta;

      // 🔥 rotate around Y axis WITHOUT resetting
      const deltaQuat = new Quaternion().setFromAxisAngle(
        new Vector3(0, 1, 0),
        turnAmount,
      );

      // quat1.multiply(deltaQuat) // ← THIS IS THE KEY
      // 🔥 target rotation (current + delta)
      const targetQuat = quat1.clone().multiply(deltaQuat);

      // 🔥 smooth toward target
      quat1.slerp(targetQuat, 0.5);
      rb.setRotation(
        {
          x: quat1.x,
          y: quat1.y,
          z: quat1.z,
          w: quat1.w,
        },
        true,
      );
    }

    // =========================
    // 🐎 FORWARD MOVEMENT (SMOOTH)
    // =========================

    let targetSpeed = 0;

    if (forward) targetSpeed = MAX_SPEED;
    else if (backward) targetSpeed = -MAX_SPEED * 0.4;

    const forwardSpeed = velocity.dot(forwardDir);

    // convert to positive "km/h feel"
    const displaySpeed = Math.abs(forwardSpeed);
    const displaySpeedKmh = Math.round(displaySpeed * 1.5);

    setSpeed(displaySpeedKmh);

    // smooth acceleration
    const newForwardSpeed = THREE.MathUtils.lerp(
      forwardSpeed,
      targetSpeed,
      delta * 4,
    );

    // desired velocity
    const targetVelocity = forwardDir.clone().multiplyScalar(newForwardSpeed);

    // 🔥 blend instead of overwrite (IMPORTANT)
    velocity.lerp(targetVelocity, 0.2);

    // =========================
    // 🧲 APPLY
    // =========================

    rb.setLinvel(
      {
        x: velocity.x,
        y: linvel.y,
        z: velocity.z,
      },
      true,
    );
    // =========================
    // 🎞 ANIMATIONS
    // =========================
    if (!isStunned) {
      if (jump) {
        playAnimation("JUMP");
      } else if (forward) {
        if (left) playAnimation("RUN_LEFT");
        else if (right) playAnimation("RUN_RIGHT");
        else {
          playAnimation("RUN");
          if (kickLeft) playAnimation("RUN_KICK_LEFT", "overlay");
          else if (kickRight) playAnimation("RUN_KICK_RIGHT", "overlay");
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

    // =========================
    // 📈 SCORE (same as yours)
    // =========================

    const pos = rb.translation();
    const posVec = new Vector3(pos.x, pos.y, pos.z);

    const dist = posVec.distanceTo(lastPosition.current);
    if (dist > 0.1) {
      addScore(Math.floor(dist));
      lastPosition.current.copy(posVec);
    }

    // Camera Follow Logic (Third Person)
    // 🚀 NEW CAMERA SYSTEM (RACING STYLE)

    const camPos = new Vector3();
    const targetPos = new Vector3();
    const forwards = new Vector3();
    const rightVec = new Vector3();
    const up = new Vector3(0, 1, 0);

    // get horse position
    const bodyPos = body.current.translation();
    const horsePos = new Vector3(bodyPos.x, bodyPos.y, bodyPos.z);

    // rotation → forward direction
    const quat = new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    forwards.set(0, 0, 1).applyQuaternion(quat).normalize();

    // right vector
    rightVec.crossVectors(forwards, up).normalize();

    // dynamic distance (speed-based)
    const dynamicDistance = CAMERA_DISTANCE;

    // turn anticipation (subtle sideways shift)
    const turnOffset = rightVec
      .clone()
      .multiplyScalar(Math.sign(linvel.x) * Math.min(currentSpeed * 0.05, 2));

    // desired camera position
    const desiredCamPos = horsePos
      .clone()
      .add(forwards.clone().multiplyScalar(-dynamicDistance))
      .add(new Vector3(0, CAMERA_HEIGHT, 0))
      .add(turnOffset);

    // smooth follow
    camera.position.lerp(desiredCamPos, FOLLOW_LERP);

    // look ahead target
    targetPos.copy(horsePos).add(forwards.clone().multiplyScalar(LOOK_AHEAD));

    camera.lookAt(targetPos);

    // 🔥 FOV boost (VERY IMPORTANT for speed feel)
    const targetFov = FOV_BASE + Math.min(currentSpeed * 0.3, FOV_BOOST);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1);
    camera.updateProjectionMatrix();

    if (
      state.clock.elapsedTime - lastNetworkStateAt.current >=
      NETWORK_STATE_INTERVAL
    ) {
      const socket = getSocket();
      const pos = rb.translation();
      const rot = rb.rotation();
      // console.log("sending network state", {
      //   position: [pos.x, pos.y, pos.z],
      //   rotation: [rot.x, rot.y, rot.z, rot.w], velocity: [velocity.x, linvel.y, velocity.z],
      //   speed: displaySpeedKmh,
      //   animation: currentAnimationName.current,
      //   overlay: currentOverlayName.current,
      // });
      if (socket.connected) {
        socket.volatile.emit("race:state", {
          position: [pos.x, pos.y, pos.z],
          rotation: [rot.x, rot.y, rot.z, rot.w],
          velocity: [velocity.x, linvel.y, velocity.z],
          speed: displaySpeedKmh,
          animation: currentAnimationName.current,
          overlay: currentOverlayName.current,
          sentAt: Date.now(),
        });
      }

      lastNetworkStateAt.current = state.clock.elapsedTime;
    }
  });

  // const playAnimation = (name: string) => {
  //   const actions = horseRef.current?.actions;
  //   if (!actions || !actions[name]) return;

  //   const next = actions[name];

  //   if (currentAction.current === next) return;

  //   currentAction.current?.fadeOut(0.2);
  //   next.reset().fadeIn(0.2).play();

  //   currentAction.current = next;
  //   currentAnimationName.current = name;
  // };
  const playAnimation = (name: string, type: "base" | "overlay" = "base") => {
    const actions = horseRef.current?.actions;

    if (!actions || !actions[name]) return;

    const next = actions[name];

    // =========================
    // BASE ANIMATIONS
    // =========================

    if (type === "base") {
      if (currentBaseAction.current === next) return;

      currentBaseAction.current?.fadeOut(0.2);

      next.reset().fadeIn(0.2).play();

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

      // Mask the kick clip to leg-only tracks the first time it plays. Three
      // .js has no per-bone weight, so a full-pose kick at high weight blends
      // the rider's spine toward the kick's "lean forward" pose and the
      // cowboy sinks into the horse. Stripping the clip's torso/arm tracks
      // means RUN owns every non-leg bone outright — the kick can then run
      // at full weight (legs stretch all the way) without ever touching the
      // rider's upper body.
      const overlayClip = next.getClip();
      if (!(overlayClip as any).__legMasked) {
        const include = /leg|foot|thigh|knee|shin|ankle|toe|calf|tibia|fibula/i;
        const exclude =
          /hip|pelvis|root|spine|neck|head|chest|shoulder|arm|hand|finger|torso/i;
        const original = overlayClip.tracks;
        const filtered = original.filter(
          (t: THREE.KeyframeTrack) =>
            include.test(t.name) && !exclude.test(t.name),
        );
        if (filtered.length > 0) {
          overlayClip.tracks = filtered;
        } else {
          console.warn(
            "[kick] No leg tracks matched; clip kept whole. Bones:",
            original.map((t: THREE.KeyframeTrack) => t.name),
          );
        }
        (overlayClip as any).__legMasked = true;
      }

      currentOverlayAction.current?.fadeOut(0.1);

      next.reset();

      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
      next.setEffectiveTimeScale(1);
      // High weight is now safe — the masked clip can only influence legs.
      // Effective leg blend is ~67% kick / 33% RUN; everything above the
      // pelvis is 100% RUN because the clip has no track for those bones.
      next.setEffectiveWeight(2);

      next.fadeIn(0.05).play();

      currentOverlayAction.current = next;
      currentOverlayName.current = name;
      // mark kick start
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

          // clear hits when overlay finishes
          collisionHitsDuringOverlay.current.clear();

          mixer.removeEventListener("finished", onFinish);
        }
      };

      mixer.addEventListener("finished", onFinish);
    }
  };
  return (
    <RigidBody
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
        args={[1.4, 1.7, 2, 0.2]}
        position={[0, 7, 0]}
        restitution={0}
      />
      <RoundCuboidCollider
        args={[1.4, 2.7, 5, 0.2]}
        position={[0, 2.9, 1]}
        restitution={0}
      />
      {/* Sensor used to detect kick hits in front of the rider */}
      <RoundCuboidCollider
        args={[3, 5, 5, 0.2]}
        position={[0, 5.2, 1]}
        // sensor
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
      {/* <Model ref={horseRef} />
       */}
      {/* <Model1 ref={horseRef} /> */}
      <Model11 ref={horseRef} />
    </RigidBody>
  );
}
