import { useGameStore } from "@/hooks/use-game-store";
import { useLobbyStore } from "@/hooks/use-lobby-store";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PLAYER_COLORS = ["#ec4899", "#60a5fa", "#4ade80", "#facc15"];
const POSITION_LABELS = ["1ST", "2ND", "3RD", "4TH"];

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

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8">
      {/* Top Bar — Score + Time + Standings */}
      <div className="flex justify-between items-start gap-4">
        <div className="bg-black/50 backdrop-blur-md p-4 rounded-lg border border-primary/30 clip-diagonal box-shadow-neon shadow-primary/20">
          <div className="text-xs text-primary uppercase font-bold tracking-widest">Score</div>
          <div className="text-4xl font-display text-white text-shadow-neon">{score.toLocaleString()}</div>
        </div>

        {/* Live standings panel — only when in a lobby session */}
        {standings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 min-w-[180px]"
          >
            <div className="text-xs text-white/50 uppercase font-bold tracking-widest mb-2">Race</div>
            <div className="flex flex-col gap-1">
              {standings.map((s, i) => (
                <div
                  key={s.username}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="text-white/40 font-mono w-7 text-right text-xs">
                    {POSITION_LABELS[s.position - 1] ?? `${s.position}TH`}
                  </span>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PLAYER_COLORS[s.colorIndex] ?? "#fff" }}
                  />
                  <span className={`flex-1 font-bold truncate max-w-[80px] ${s.finished ? "text-white/50" : "text-white"}`}>
                    {s.username}
                  </span>
                  {s.finished && (
                    <span className="text-green-400 text-xs font-mono">✓</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="bg-black/50 backdrop-blur-md p-4 rounded-lg border border-secondary/30 clip-diagonal box-shadow-neon shadow-secondary/20">
          <div className="text-xs text-secondary uppercase font-bold tracking-widest">Time</div>
          <div className="text-4xl font-display text-white text-shadow-neon">{formatTime(timeElapsed)}</div>
        </div>
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

      {/* Speedometer */}
      <div className="flex justify-end items-end">
        <div className="relative w-64 h-64 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-full blur-xl" />
          <div className="text-right">
            <div className="text-8xl font-display font-black text-white italic text-shadow-neon leading-none">
              {Math.abs(speed)}
            </div>
            <div className="text-xl text-primary font-bold uppercase tracking-widest">km/h</div>
          </div>
        </div>
      </div>
    </div>
  );
}
