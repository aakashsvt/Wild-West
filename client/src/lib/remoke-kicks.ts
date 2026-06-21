import type { RapierRigidBody } from "@react-three/rapier";

interface RemoteKickState {
  socketId: string;
  isKicking: boolean;
  stunnedUntil?: number;
}

// Lookup from rigid body → its remote's kick state. Populated by each
// RemoteRider on mount; consulted by PlayerController's collision handler so
// it can tell whether the other body in a collision is currently mid-kick.
const map = new Map<RapierRigidBody, RemoteKickState>();

export function registerRemoteBody(body: RapierRigidBody, socketId: string) {
  map.set(body, { socketId, isKicking: false, stunnedUntil: 0 });
}

export function unregisterRemoteBody(body: RapierRigidBody) {
  map.delete(body);
}

export function setRemoteKicking(body: RapierRigidBody, isKicking: boolean) {
  const state = map.get(body);
  if (state) state.isKicking = isKicking;
}

export function isRemoteKicking(body: RapierRigidBody): boolean {
  return map.get(body)?.isKicking ?? false;
}

export function getSocketIdForBody(body: RapierRigidBody): string | null {
  return map.get(body)?.socketId ?? null;
}

export function setRemoteStun(body: RapierRigidBody, durationMs: number) {
  const state = map.get(body);
  console.log("aaaaasetRemoteStun", body, durationMs, state);
  if (!state) return;
  state.stunnedUntil = performance.now() + durationMs;
}

export function isRemoteStunned(body: RapierRigidBody): boolean {
  const state = map.get(body);
  if (!state) return false;
  return (state.stunnedUntil ?? 0) > performance.now();
}
