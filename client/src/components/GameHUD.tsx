import { useGameStore } from "@/hooks/use-game-store";
import { useLobbyStore } from "@/hooks/use-lobby-store";
import { useEffect, useMemo } from "react";
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
  const { incrementTime, isPlaying } = useGameStore();
  const { standings, raceResults, socketId, players } = useLobbyStore();

  // Resolve this client's username: socketId → players list → username
  const myUsername = useMemo(
    () => players.find((p) => p.socketId === socketId)?.username ?? null,
    [players, socketId],
  );

  // Sort standings by position (server sets position but sends unsorted)
  const sortedStandings = useMemo(
    () => (standings.length > 0 ? [...standings].sort((a, b) => a.position - b.position) : []),
    [standings],
  );

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

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-5">

      {/* ── Live standings sidebar ───────────────────────────────────────── */}
      <AnimatePresence>
        {sortedStandings.length > 0 && !raceResults && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="absolute right-5 flex flex-col gap-1.5"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-2 px-3 pb-1.5 mb-0.5"
              style={{ borderBottom: `1px solid ${W.borderWarm}50` }}
            >
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${W.borderWarm}60)` }} />
              <span
                className="font-mono text-[9px] tracking-[0.3em] uppercase"
                style={{ color: W.borderWarm }}
              >
                Standings
              </span>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${W.borderWarm}60)` }} />
            </div>

            {/* Player rows */}
            {sortedStandings.map((entry) => {
              const isMe = entry.username === myUsername;
              const color = PLAYER_COLORS[entry.colorIndex] ?? W.goldBright;
              const posLabel = POSITION_LABELS[entry.position - 1] ?? `${entry.position}`;

              return (
                <div
                  key={entry.username}
                  className="flex items-center gap-2 rounded px-3 py-1.5"
                  style={{
                    background: isMe
                      ? `${color}18`
                      : `${W.panelDark}cc`,
                    border: `1px solid ${isMe ? color + "50" : W.borderDim}`,
                    minWidth: "160px",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  {/* Position */}
                  <span
                    className="font-western text-xs w-7 flex-shrink-0 text-right"
                    style={{ color: entry.finished ? W.creamMuted : color }}
                  >
                    {posLabel}
                  </span>

                  {/* Colour dot */}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}80` }}
                  />

                  {/* Name */}
                  <span
                    className="flex-1 font-western text-xs tracking-wide truncate"
                    style={{
                      color: isMe ? W.cream : W.creamMuted,
                      maxWidth: "76px",
                    }}
                  >
                    {entry.username}
                    {isMe && (
                      <span className="font-mono text-[8px] normal-case ml-1" style={{ color: W.borderWarm }}>
                        you
                      </span>
                    )}
                  </span>

                  {/* Score or finished badge */}
                  {entry.finished ? (
                    <span
                      className="font-mono text-[9px] tracking-widest uppercase flex-shrink-0"
                      style={{ color: "#5a8a4a" }}
                    >
                      Finished
                    </span>
                  ) : (
                    <span
                      className="font-mono text-[9px] tabular-nums flex-shrink-0"
                      style={{ color: W.creamMuted }}
                    >
                      {entry.score.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Speedometer panel removed — no persistent speed HUD during racing */}

    </div>
  );
}
