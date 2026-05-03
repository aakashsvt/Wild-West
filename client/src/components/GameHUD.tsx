import { useGameStore } from "@/hooks/use-game-store";
import { useLobbyStore } from "@/hooks/use-lobby-store";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Western player colours — must match Lobby.tsx
const PLAYER_COLORS = ["#d4a853", "#c0392b", "#2980b9", "#5a8a4a"];
const POSITION_LABELS = ["1st", "2nd", "3rd", "4th"];

// Western palette — same tokens as Home, LoadingScreen, GameTransitionOverlay
const W = {
  bg:         "#0a0603",
  panelDark:  "#130a04",
  panelMid:   "#1e0f06",
  borderDim:  "#3d1e0a",
  borderWarm: "#6b3820",
  borderGold: "#a07030",
  gold:       "#c8922a",
  goldBright: "#d4a853",
  goldPale:   "#e8c87a",
  cream:      "#e8d5b0",
  creamMuted: "#b89a72",
  rust:       "#8b3d1f",
} as const;

export function GameHUD() {
  const { speed, score, timeElapsed, incrementTime, isPlaying } = useGameStore();
  const { standings, raceResults } = useLobbyStore();
  const mySocketId = typeof window !== "undefined" ? (window as any).__socketId : null;

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      incrementTime(1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, incrementTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isPlaying) return null;

  const panelStyle: React.CSSProperties = {
    background: `${W.panelDark}e8`,
    border: `1px solid ${W.borderWarm}70`,
    boxShadow: "0 4px 24px rgba(0,0,0,0.65)",
    backdropFilter: "blur(6px)",
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-5">

      {/* ── Top bar: Score (left) + Time (right) ─────────────────────────── */}
      <div className="flex justify-between items-start gap-3">

        {/* Score */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="rounded px-4 py-3 min-w-[120px]"
          style={panelStyle}
        >
          <div
            className="text-[10px] font-mono tracking-[0.25em] uppercase mb-1"
            style={{ color: W.creamMuted }}
          >
            ✦ Bounty
          </div>
          <div
            className="font-western leading-none tabular-nums"
            style={{
              fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
              color: W.goldBright,
              textShadow: `1px 1px 0 #0a0603, 0 0 20px ${W.gold}60`,
            }}
          >
            {score.toLocaleString()}
          </div>
        </motion.div>

        {/* Time */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="rounded px-4 py-3 min-w-[120px] text-right"
          style={panelStyle}
        >
          <div
            className="text-[10px] font-mono tracking-[0.25em] uppercase mb-1"
            style={{ color: W.creamMuted }}
          >
            Trail Time ✦
          </div>
          <div
            className="font-western leading-none tabular-nums"
            style={{
              fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
              color: W.cream,
              textShadow: `1px 1px 0 #0a0603`,
            }}
          >
            {formatTime(timeElapsed)}
          </div>
        </motion.div>
      </div>

      {/* ── Race results overlay ──────────────────────────────────────────── */}
      <AnimatePresence>
        {raceResults && raceResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div
              className="rounded px-8 py-7 min-w-[300px]"
              style={{
                background: "rgba(19,10,4,0.95)",
                border: `1px solid rgba(107,56,32,0.7)`,
                boxShadow: "0 8px 40px rgba(0,0,0,0.8)",
                backdropFilter: "blur(10px)",
              }}
            >
              {/* Title */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, #a07030)" }} />
                <h3
                  className="font-western tracking-wider text-shadow-western"
                  style={{ fontSize: "1.5rem", color: "#e8d5b0" }}
                >
                  Race Over
                </h3>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, #a07030)" }} />
              </div>

              {/* Results rows */}
              <div className="flex flex-col gap-3">
                {raceResults.map((r) => {
                  const posColor = PLAYER_COLORS[r.position - 1] ?? W.cream;
                  return (
                    <div
                      key={r.username}
                      className="flex items-center gap-3 px-3 py-2 rounded-sm"
                      style={{
                        background: `${posColor}10`,
                        border: `1px solid ${posColor}30`,
                      }}
                    >
                      <span
                        className="font-western w-10 text-right flex-shrink-0"
                        style={{ color: posColor, fontSize: "1.1rem" }}
                      >
                        {POSITION_LABELS[r.position - 1] ?? `${r.position}`}
                      </span>
                      <span
                        className="flex-1 font-western text-sm tracking-wide truncate"
                        style={{ color: W.cream }}
                      >
                        {r.username}
                      </span>
                      <span
                        className="font-mono text-xs"
                        style={{ color: W.creamMuted }}
                      >
                        {r.score.toLocaleString()}
                      </span>
                      <span
                        className="font-mono text-xs"
                        style={{ color: W.borderWarm }}
                      >
                        {formatTime(r.timeTaken)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom-right: Speedometer ─────────────────────────────────────── */}
      <div className="flex justify-end">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded px-5 py-4 w-44"
          style={panelStyle}
        >
          {/* Speed number */}
          <div className="flex items-baseline gap-2 justify-end">
            <span
              className="font-western tabular-nums leading-none"
              style={{
                fontSize: "clamp(2.8rem, 5vw, 3.8rem)",
                color: speed > 75 ? W.goldBright : W.cream,
                textShadow:
                  speed > 75
                    ? `1px 1px 0 #0a0603, 0 0 30px ${W.gold}80`
                    : `1px 1px 0 #0a0603`,
                transition: "color 0.3s, text-shadow 0.3s",
              }}
            >
              {Math.abs(speed)}
            </span>
            <span
              className="font-mono text-xs tracking-widest uppercase pb-1"
              style={{ color: W.creamMuted }}
            >
              km/h
            </span>
          </div>

          <div
            className="text-[9px] font-mono tracking-[0.3em] uppercase mt-1 text-right"
            style={{ color: `${W.borderWarm}` }}
          >
            ✦ Speed
          </div>
        </motion.div>
      </div>

    </div>
  );
}
