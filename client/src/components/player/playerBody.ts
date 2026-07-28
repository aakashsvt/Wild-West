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
let _isJumping: boolean = false;
let _jumpHeight: number = 0;

export function setPlayerBody(body: RapierRigidBody | null) {
  _playerBody = body;
}

export function getPlayerBody(): RapierRigidBody | null {
  return _playerBody;
}

export function setPlayerJumping(jumping: boolean) {
  _isJumping = jumping;
}

export function getPlayerJumping(): boolean {
  return _isJumping;
}

export function setPlayerJumpHeight(height: number) {
  _jumpHeight = height;
}

export function getPlayerJumpHeight(): number {
  return _jumpHeight;
}
