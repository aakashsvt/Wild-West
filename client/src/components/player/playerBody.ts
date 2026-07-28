/**
 * Module-level singleton for the player's Rapier RigidBody.
 * 
 * Set once by PlayerController on mount, read by any component that needs
 * to locate the player (e.g. Hurdle's slow-speed overlap check).
 * 
 * This avoids threading a React ref through many layers of components.
 */
import type { RapierRigidBody } from "@react-three/rapier";

let _playerBody: RapierRigidBody | null = null;

export function setPlayerBody(body: RapierRigidBody | null) {
  _playerBody = body;
}

export function getPlayerBody(): RapierRigidBody | null {
  return _playerBody;
}
