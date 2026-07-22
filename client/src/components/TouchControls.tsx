import { useEffect, useRef, useState } from "react";

// Touchscreen controls for mobile/iPad — deliberately fully separate from
// the keyboard input system (PlayerController.tsx, KeyboardControls in
// Game.tsx) rather than adding a parallel input path there. drei's
// KeyboardControls just listens for real `keydown`/`keyup` events on
// `window` (see node_modules/@react-three/drei/web/KeyboardControls.js) and
// matches on `event.code` — so dispatching synthetic KeyboardEvents with
// the same `code` values already bound in Game.tsx's keyboardMap makes the
// existing game logic react exactly as if a physical key were pressed,
// with zero changes to PlayerController.tsx or the keyboard system. This
// also means PC keyboard/mouse controls are completely untouched: this
// component only ever ADDS events, never reads or removes anything from
// the existing system.
//
// Scope for this first pass: movement joystick + jump/run/view-toggle
// buttons. Deliberately not including a touch-drag look/camera control yet
// (the third-person camera already auto-follows the horse's heading
// without needing manual look input to be playable) — can add if asked.
//
// Sizing: first version used fixed pixel values (64px buttons, 110px
// joystick) — looked tiny/cramped on a 13" iPad Pro's much larger viewport
// (confirmed live: 57-60fps, connects fine, but layout didn't scale).
// Switched to vw-based clamp() sizing so targets stay comfortably sized
// across phone and tablet screens, plus safe-area-inset-bottom so controls
// don't sit under the home-indicator swipe zone.

function dispatchKey(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

// Fractions of the joystick's own rendered radius (measured live, not a
// fixed px value) — deadzone and max travel both scale with however big
// the joystick actually renders on this device.
const JOYSTICK_DEADZONE_FRACTION = 0.14;
const JOYSTICK_MAX_TRAVEL_FRACTION = 0.75;

// Bumped from a flat 20px — mobile Safari's viewport sizing doesn't always
// match the real visible area (the classic 100vh-vs-actual-chrome quirk),
// so the buttons were partially clipped below the visible edge even with
// a small safe-area margin. Larger flat minimum plus the real inset.
const SAFE_BOTTOM = "max(40px, calc(env(safe-area-inset-bottom) + 20px))";
const SAFE_SIDE = "max(24px, calc(env(safe-area-inset-left) + 12px))";

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(
      "ontouchstart" in window || window.matchMedia("(pointer: coarse)").matches,
    );
  }, []);
  return isTouch;
}

function Joystick() {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const touchId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  // Measured from the base element's actual rendered size at touch-start,
  // not a hardcoded px constant, so deadzone/max-travel scale with
  // whatever size clamp() actually picked on this device.
  const radius = useRef({ deadzone: 10, maxTravel: 50 });
  const active = useRef({ forward: false, backward: false, left: false, right: false });

  const setDirection = (dx: number, dy: number) => {
    const dz = radius.current.deadzone;
    const wantForward = dy < -dz;
    const wantBackward = dy > dz;
    const wantLeft = dx < -dz;
    const wantRight = dx > dz;

    const changes: Array<[keyof typeof active.current, boolean, string]> = [
      ["forward", wantForward, "KeyW"],
      ["backward", wantBackward, "KeyS"],
      ["left", wantLeft, "KeyA"],
      ["right", wantRight, "KeyD"],
    ];
    for (const [name, want, code] of changes) {
      if (want && !active.current[name]) {
        active.current[name] = true;
        dispatchKey("keydown", code);
      } else if (!want && active.current[name]) {
        active.current[name] = false;
        dispatchKey("keyup", code);
      }
    }
  };

  const releaseAll = () => {
    setDirection(0, 0);
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
  };

  const handleStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    touchId.current = touch.identifier;
    const rect = baseRef.current!.getBoundingClientRect();
    origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const r = rect.width / 2;
    radius.current = {
      deadzone: r * JOYSTICK_DEADZONE_FRACTION,
      maxTravel: r * JOYSTICK_MAX_TRAVEL_FRACTION,
    };
  };

  const handleMove = (e: React.TouchEvent) => {
    const touch = Array.from(e.touches).find((t) => t.identifier === touchId.current);
    if (!touch) return;
    let dx = touch.clientX - origin.current.x;
    let dy = touch.clientY - origin.current.y;
    const dist = Math.hypot(dx, dy);
    const maxTravel = radius.current.maxTravel;
    if (dist > maxTravel) {
      dx = (dx / dist) * maxTravel;
      dy = (dy / dist) * maxTravel;
    }
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    setDirection(dx, dy);
  };

  const handleEnd = (e: React.TouchEvent) => {
    const stillDown = Array.from(e.touches).some((t) => t.identifier === touchId.current);
    if (stillDown) return;
    touchId.current = null;
    releaseAll();
  };

  return (
    <div
      ref={baseRef}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      style={{
        position: "absolute",
        left: SAFE_SIDE,
        bottom: SAFE_BOTTOM,
        width: "clamp(96px, 13vw, 170px)",
        height: "clamp(96px, 13vw, 170px)",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.3)",
        touchAction: "none",
      }}
    >
      <div
        ref={knobRef}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "42%",
          height: "42%",
          marginLeft: "-21%",
          marginTop: "-21%",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.4)",
          transition: "transform 0.05s linear",
        }}
      />
    </div>
  );
}

function TouchButton({
  code,
  label,
  hold,
  style,
}: {
  code: string;
  label: string;
  hold: boolean;
  style?: React.CSSProperties;
}) {
  const handleStart = (e: React.TouchEvent) => {
    e.preventDefault();
    dispatchKey("keydown", code);
    if (!hold) {
      // Tap-only actions (view toggle) — release on the same frame's next
      // tick so the edge-detected toggle logic in PlayerController sees a
      // clean down-then-up rather than a held key.
      requestAnimationFrame(() => dispatchKey("keyup", code));
    }
  };
  const handleEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (hold) dispatchKey("keyup", code);
  };

  return (
    <div
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      style={{
        width: "clamp(56px, 8vw, 92px)",
        height: "clamp(56px, 8vw, 92px)",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.3)",
        color: "rgba(255,255,255,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "clamp(11px, 1.4vw, 16px)",
        fontWeight: 600,
        userSelect: "none",
        touchAction: "none",
        ...style,
      }}
    >
      {label}
    </div>
  );
}

export function TouchControls() {
  const isTouch = useIsTouchDevice();
  if (!isTouch) return null;

  return (
    <div
      style={{
        // Fixed (anchored to the real browser viewport) rather than
        // absolute (anchored to the parent game container) — the parent's
        // height is set via Tailwind's h-screen (100vh), which on mobile
        // Safari doesn't reliably match the actual visible area once
        // browser chrome/safe zones are accounted for.
        position: "fixed",
        inset: 0,
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <Joystick />
      </div>
      <div
        style={{
          position: "absolute",
          right: SAFE_SIDE,
          bottom: SAFE_BOTTOM,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "clamp(10px, 1.5vw, 20px)",
          pointerEvents: "auto",
        }}
      >
        <TouchButton code="KeyV" label="VIEW" hold={false} />
        <div style={{ display: "flex", gap: "clamp(10px, 1.5vw, 20px)" }}>
          <TouchButton code="ShiftLeft" label="RUN" hold={true} />
          <TouchButton code="Space" label="JUMP" hold={true} />
        </div>
      </div>
    </div>
  );
}
