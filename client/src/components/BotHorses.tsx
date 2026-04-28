import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Euler, MathUtils, Quaternion, Vector3 } from "three";
import { useGameStore } from "@/hooks/use-game-store";
import { Model } from "./CowboyXHorse_GLB_v01";
import trackPoints from "../../public/models/spline.json";

const BOT_COUNT = 4;
const BOT_MIN_SPEED = 0;
const BOT_MAX_SPEED = 13;
const BOT_SPEED_SMOOTHING = 3;
const BOT_TRAVEL_DIRECTION = -1;

const TRACK_OFFSET_X = 410;
const TRACK_OFFSET_Z = 20;
const TRACK_WALL_HALF_WIDTH = 30;
const TRACK_SAFE_HALF_WIDTH = TRACK_WALL_HALF_WIDTH - 18;
const BOT_TRACK_HEIGHT_OFFSET = 1.5;

const MIN_PLAYER_CLEARANCE = 9;
const MIN_BOT_CLEARANCE = 8;

type BotSpawn = {
  id: number;
  position: [number, number, number];
  rotationY: number;
  laneOffset: number;
  baseSpeed: number;
  speedVariance: number;
  speedPhase: number;
  lookAheadDistance: number;
};

type TrackSample = {
  index: number;
  t: number;
  point: Vector3;
  direction: Vector3;
  normal: Vector3;
  length: number;
};

type BotHorsesProps = {
  playerBodyRef: RefObject<RapierRigidBody | null>;
  playerStartPosition: [number, number, number];
};

type BotHorseProps = {
  spawn: BotSpawn;
};

const TRACK_POINTS = trackPoints.map(
  (p) => new Vector3(p.x + TRACK_OFFSET_X, p.y, p.z + TRACK_OFFSET_Z),
);

function wrapIndex(index: number) {
  const len = TRACK_POINTS.length;
  return ((index % len) + len) % len;
}

function getSegment(index: number) {
  const start = TRACK_POINTS[wrapIndex(index)];
  const end = TRACK_POINTS[wrapIndex(index + 1)];

  const delta = new Vector3().subVectors(end, start);
  const length = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
  const direction =
    length > 0.0001
      ? new Vector3(delta.x / length, 0, delta.z / length)
      : new Vector3(0, 0, 1);
  const normal = new Vector3(-direction.z, 0, direction.x);

  return { start, end, direction, normal, length };
}

function sampleTrack(index: number, t: number): TrackSample {
  const clampedT = MathUtils.clamp(t, 0, 1);
  const segment = getSegment(index);
  const point = segment.start.clone().lerp(segment.end, clampedT);

  return {
    index: wrapIndex(index),
    t: clampedT,
    point,
    direction: segment.direction,
    normal: segment.normal,
    length: segment.length,
  };
}

function projectToTrack(position: Vector3): TrackSample {
  let closest = sampleTrack(0, 0);
  let closestDistSq = Number.POSITIVE_INFINITY;

  for (let i = 0; i < TRACK_POINTS.length; i += 1) {
    const segment = getSegment(i);

    const vx = segment.end.x - segment.start.x;
    const vz = segment.end.z - segment.start.z;
    const segmentLenSq = vx * vx + vz * vz;

    if (segmentLenSq < 0.00001) continue;

    const px = position.x - segment.start.x;
    const pz = position.z - segment.start.z;

    const t = MathUtils.clamp((px * vx + pz * vz) / segmentLenSq, 0, 1);
    const point = new Vector3(
      segment.start.x + vx * t,
      segment.start.y + (segment.end.y - segment.start.y) * t,
      segment.start.z + vz * t,
    );

    const dx = position.x - point.x;
    const dz = position.z - point.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < closestDistSq) {
      closestDistSq = distSq;
      closest = {
        index: i,
        t,
        point,
        direction: segment.direction,
        normal: segment.normal,
        length: segment.length,
      };
    }
  }

  return closest;
}

function moveAlongTrack(index: number, t: number, distance: number): TrackSample {
  let currentIndex = wrapIndex(index);
  let currentT = MathUtils.clamp(t, 0, 1);
  let remaining = distance;
  let guard = 0;
  const maxGuard = TRACK_POINTS.length * 4;

  while (Math.abs(remaining) > 0.001 && guard < maxGuard) {
    const segment = getSegment(currentIndex);

    if (segment.length < 0.0001) {
      currentIndex = wrapIndex(currentIndex + (remaining > 0 ? 1 : -1));
      currentT = remaining > 0 ? 0 : 1;
      guard += 1;
      continue;
    }

    if (remaining > 0) {
      const available = (1 - currentT) * segment.length;
      if (remaining <= available) {
        currentT += remaining / segment.length;
        remaining = 0;
      } else {
        remaining -= available;
        currentIndex = wrapIndex(currentIndex + 1);
        currentT = 0;
      }
    } else {
      const available = currentT * segment.length;
      if (-remaining <= available) {
        currentT += remaining / segment.length;
        remaining = 0;
      } else {
        remaining += available;
        currentIndex = wrapIndex(currentIndex - 1);
        currentT = 1;
      }
    }

    guard += 1;
  }

  return sampleTrack(currentIndex, currentT);
}

function distanceToSquaredXZ(a: Vector3, b: Vector3) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function createBotSpawns(anchor: Vector3): BotSpawn[] {
  const anchorProjection = projectToTrack(anchor);
  const anchorOnTrack = anchorProjection.point
    .clone()
    .setY(anchorProjection.point.y + BOT_TRACK_HEIGHT_OFFSET);
  const spawns: BotSpawn[] = [];
  const usedPoints: Vector3[] = [];

  for (let i = 0; i < BOT_COUNT; i += 1) {
    let created: BotSpawn | null = null;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const alongTrack = MathUtils.randFloatSpread(100);
      const sample = moveAlongTrack(anchorProjection.index, anchorProjection.t, alongTrack);

      const laneOffset = MathUtils.clamp(
        MathUtils.randFloatSpread(TRACK_SAFE_HALF_WIDTH * 2),
        -TRACK_SAFE_HALF_WIDTH,
        TRACK_SAFE_HALF_WIDTH,
      );

      const spawnPoint = sample.point.clone().addScaledVector(sample.normal, laneOffset);
      spawnPoint.y = sample.point.y + BOT_TRACK_HEIGHT_OFFSET;

      const farFromPlayer =
        distanceToSquaredXZ(spawnPoint, anchorOnTrack) >
        MIN_PLAYER_CLEARANCE * MIN_PLAYER_CLEARANCE;
      const farFromBots = usedPoints.every(
        (point) =>
          distanceToSquaredXZ(point, spawnPoint) > MIN_BOT_CLEARANCE * MIN_BOT_CLEARANCE,
      );

      if (!farFromPlayer || !farFromBots) continue;

      created = {
        id: i,
        position: [spawnPoint.x, spawnPoint.y, spawnPoint.z],
        rotationY: Math.atan2(
          sample.direction.x * BOT_TRAVEL_DIRECTION,
          sample.direction.z * BOT_TRAVEL_DIRECTION,
        ),
        laneOffset,
        baseSpeed: MathUtils.randFloat(14, 24),
        speedVariance: MathUtils.randFloat(1.5, 4),
        speedPhase: MathUtils.randFloat(0, Math.PI * 2),
        lookAheadDistance: MathUtils.randFloat(12, 20),
      };

      usedPoints.push(spawnPoint);
      break;
    }

    if (!created) {
      const fallbackDistance = (i - (BOT_COUNT - 1) / 2) * 12;
      const sample = moveAlongTrack(
        anchorProjection.index,
        anchorProjection.t,
        fallbackDistance,
      );
      const laneOffset = MathUtils.clamp(
        (i - (BOT_COUNT - 1) / 2) * 5,
        -TRACK_SAFE_HALF_WIDTH,
        TRACK_SAFE_HALF_WIDTH,
      );
      const spawnPoint = sample.point.clone().addScaledVector(sample.normal, laneOffset);
      spawnPoint.y = sample.point.y + BOT_TRACK_HEIGHT_OFFSET;

      created = {
        id: i,
        position: [spawnPoint.x, spawnPoint.y, spawnPoint.z],
        rotationY: Math.atan2(
          sample.direction.x * BOT_TRAVEL_DIRECTION,
          sample.direction.z * BOT_TRAVEL_DIRECTION,
        ),
        laneOffset,
        baseSpeed: 18,
        speedVariance: 2.5,
        speedPhase: i * 0.9,
        lookAheadDistance: 16,
      };
    }

    spawns.push(created);
  }

  return spawns;
}

function BotHorse({ spawn }: BotHorseProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const horseRef = useRef<any>(null);
  const currentAction = useRef<any>(null);
  const laneOffset = useRef(spawn.laneOffset);
  const lookAheadDistance = useRef(spawn.lookAheadDistance);
  const baseSpeed = useRef(spawn.baseSpeed);
  const speedVariance = useRef(spawn.speedVariance);
  const speedPhase = useRef(spawn.speedPhase);
  const currentSpeed = useRef(BOT_MIN_SPEED);
  const yaw = useRef(spawn.rotationY);
  const rotationQuat = useRef(new Quaternion());
  const progress = useRef<TrackSample>(
    projectToTrack(new Vector3(spawn.position[0], spawn.position[1], spawn.position[2])),
  );
  const isPlaying = useGameStore((state) => state.isPlaying);

  const playAnimation = (name: string) => {
    const actions = horseRef.current?.actions;
    if (!actions) return;

    const fallbackAction = actions.RUN ?? actions[Object.keys(actions)[0]];
    const next = actions[name] ?? fallbackAction;
    if (!next || currentAction.current === next) return;

    currentAction.current?.fadeOut?.(0.2);
    next.reset?.().fadeIn?.(0.2).play?.();
    currentAction.current = next;
  };

  useFrame((state, delta) => {
    if (!bodyRef.current || !isPlaying) return;

    const progressSample = progress.current;

    const speedWave = Math.sin(state.clock.elapsedTime * 0.75 + speedPhase.current);
    const desiredSpeed = MathUtils.clamp(
      baseSpeed.current + speedWave * speedVariance.current,
      BOT_MIN_SPEED,
      BOT_MAX_SPEED,
    );
    currentSpeed.current = MathUtils.damp(
      currentSpeed.current,
      desiredSpeed,
      BOT_SPEED_SMOOTHING,
      delta,
    );

    const nextSample = moveAlongTrack(
      progressSample.index,
      progressSample.t,
      currentSpeed.current * delta * BOT_TRAVEL_DIRECTION,
    );
    progress.current = nextSample;

    const aheadSample = moveAlongTrack(
      nextSample.index,
      nextSample.t,
      Math.max(4, lookAheadDistance.current * 0.5) * BOT_TRAVEL_DIRECTION,
    );

    const heading = aheadSample.point.clone().sub(nextSample.point).setY(0);
    if (heading.lengthSq() < 0.0001) {
      heading.copy(nextSample.direction);
    } else {
      heading.normalize();
    }

    const targetYaw = Math.atan2(heading.x, heading.z);
    yaw.current = MathUtils.lerp(
      yaw.current,
      targetYaw,
      MathUtils.clamp(delta * 6, 0, 1),
    );

    const nextPosition = nextSample.point
      .clone()
      .addScaledVector(nextSample.normal, laneOffset.current);
    nextPosition.y = nextSample.point.y + BOT_TRACK_HEIGHT_OFFSET;

    rotationQuat.current.setFromEuler(new Euler(0, yaw.current, 0));
    bodyRef.current.setNextKinematicTranslation({
      x: nextPosition.x,
      y: nextPosition.y,
      z: nextPosition.z,
    });
    bodyRef.current.setNextKinematicRotation({
      x: rotationQuat.current.x,
      y: rotationQuat.current.y,
      z: rotationQuat.current.z,
      w: rotationQuat.current.w,
    });

    if (currentSpeed.current > 12) {
      playAnimation("RUN");
    } else {
      playAnimation("WALK");
    }
  });

  useEffect(() => {
    if (!bodyRef.current) return;
    const initial = progress.current;
    const startPoint = initial.point.clone().addScaledVector(initial.normal, laneOffset.current);
    startPoint.y = initial.point.y + BOT_TRACK_HEIGHT_OFFSET;
    bodyRef.current.setTranslation(
      {
        x: startPoint.x,
        y: startPoint.y,
        z: startPoint.z,
      },
      true,
    );
    rotationQuat.current.setFromEuler(new Euler(0, yaw.current, 0));
    bodyRef.current.setRotation(
      {
        x: rotationQuat.current.x,
        y: rotationQuat.current.y,
        z: rotationQuat.current.z,
        w: rotationQuat.current.w,
      },
      true,
    );
    playAnimation("RUN");
  }, []);

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      position={spawn.position}
      rotation={[0, spawn.rotationY, 0]}
      colliders={false}
      friction={1}
      canSleep={false}
    >
      <CuboidCollider args={[1.5, 0.2, 0.2]} position={[0, 0.5, 2]} />
      <CuboidCollider args={[1.5, 0.2, 0.2]} position={[0, 0.5, -2]} />
      <CuboidCollider args={[0.2, 0.2, 2]} position={[0.5, 0.5, 0]} />
      <CuboidCollider args={[0.2, 0.2, 2]} position={[-0.5, 0.5, 0]} />
      <Model ref={horseRef} />
    </RigidBody>
  );
}

export function BotHorses({ playerBodyRef, playerStartPosition }: BotHorsesProps) {
  const [spawns, setSpawns] = useState<BotSpawn[]>([]);
  const isPlaying = useGameStore((state) => state.isPlaying);

  const fallbackAnchor = useMemo(
    () => new Vector3(...playerStartPosition),
    [playerStartPosition],
  );

  useEffect(() => {
    if (!isPlaying) return;

    const bodyPosition = playerBodyRef.current?.translation();
    const anchor = bodyPosition
      ? new Vector3(bodyPosition.x, bodyPosition.y, bodyPosition.z)
      : fallbackAnchor;

    setSpawns(createBotSpawns(anchor));
  }, [fallbackAnchor, isPlaying, playerBodyRef]);

  return (
    <>
      {spawns.map((spawn) => (
        <BotHorse key={spawn.id} spawn={spawn} />
      ))}
    </>
  );
}
