import { getSocket } from "@/hooks/use-socket";
import { NETWORK_STATE_INTERVAL } from "./constants";
import { Vector3 } from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";

export function usePlayerNetwork() {
  const lastNetworkStateAt = useRef(0);

  const updateNetwork = (
    time: number,
    body: RapierRigidBody,
    velocity: Vector3,
    displaySpeedKmh: number,
    currentAnimationName: string,
    currentOverlayName: string | null
  ) => {
    if (time - lastNetworkStateAt.current >= NETWORK_STATE_INTERVAL) {
      const socket = getSocket();
      const pos = body.translation();
      const rot = body.rotation();
      const linvel = body.linvel();

      if (socket.connected) {
        socket.volatile.emit("race:state", {
          position: [pos.x, pos.y, pos.z],
          rotation: [rot.x, rot.y, rot.z, rot.w],
          velocity: [velocity.x, linvel.y, velocity.z],
          speed: displaySpeedKmh,
          animation: currentAnimationName,
          overlay: currentOverlayName,
          sentAt: Date.now(),
        });
      }

      lastNetworkStateAt.current = time;
    }
  };

  return { updateNetwork };
}
