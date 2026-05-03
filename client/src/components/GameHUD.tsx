import { useGameStore } from "@/hooks/use-game-store";
import { useLobbyStore } from "@/hooks/use-lobby-store";
import { useEffect } from "react";
import { motion } from "framer-motion";

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

      {/* Final results overlay */}
      <AnimatePresence>
        {raceResults && raceResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-8 min-w-[320px]">
              <h3 className="text-2xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-primary mb-6 text-center uppercase tracking-widest">
                Race Over
              </h3>
              <div className="flex flex-col gap-3">
                {raceResults.map((r) => (
                  <div key={r.username} className="flex items-center gap-4">
                    <span className="text-2xl font-black font-display w-12 text-right" style={{ color: PLAYER_COLORS[r.position - 1] ?? "#fff" }}>
                      {POSITION_LABELS[r.position - 1] ?? `${r.position}`}
                    </span>
                    <span className="flex-1 font-bold text-white text-lg">{r.username}</span>
                    <span className="text-white/50 font-mono text-sm">{r.score.toLocaleString()} pts</span>
                    <span className="text-white/30 font-mono text-xs">{formatTime(r.timeTaken)}</span>
                  </div>
                ))}
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
