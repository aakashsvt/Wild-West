import { useGameStore } from "@/hooks/use-game-store";
import { useEffect } from "react";
import { motion } from "framer-motion";

export function GameHUD() {
  const { speed, score, timeElapsed, incrementTime, isPlaying } = useGameStore();

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
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isPlaying) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="bg-black/50 backdrop-blur-md p-4 rounded-lg border border-primary/30 clip-diagonal box-shadow-neon shadow-primary/20">
          <div className="text-xs text-primary uppercase font-bold tracking-widest">Score</div>
          <div className="text-4xl font-display text-white text-shadow-neon">{score.toLocaleString()}</div>
        </div>
        
        <div className="bg-black/50 backdrop-blur-md p-4 rounded-lg border border-secondary/30 clip-diagonal box-shadow-neon shadow-secondary/20">
          <div className="text-xs text-secondary uppercase font-bold tracking-widest">Time</div>
          <div className="text-4xl font-display text-white text-shadow-neon">{formatTime(timeElapsed)}</div>
        </div>
      </div>

      {/* Speedometer */}
      <div className="flex justify-end items-end">
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Radial Gradient BG */}
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
