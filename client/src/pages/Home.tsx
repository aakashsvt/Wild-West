import { Leaderboard } from "@/components/Leaderboard";
import { useGameStore } from "@/hooks/use-game-store";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Play, Trophy, Settings, Flag } from "lucide-react";

export default function Home() {
  const { startGame } = useGameStore();
  const [_, setLocation] = useLocation();

  const handleStart = () => {
    startGame();
    setLocation("/game");
  };

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-background to-black text-white overflow-hidden relative">
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{ 
             backgroundImage: 'linear-gradient(to right, #4f46e5 1px, transparent 1px), linear-gradient(to bottom, #ec4899 1px, transparent 1px)', 
             backgroundSize: '40px 40px',
             transform: 'perspective(500px) rotateX(60deg) translateY(-100px) scale(2)',
             transformOrigin: 'top center'
           }} 
      />

      <div className="relative z-10 container mx-auto px-4 h-screen flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24">
        
        {/* Left Side: Title & Menu */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-6xl md:text-8xl font-black font-display italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-primary to-purple-600 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
              CANYON
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-yellow-300">RACER</span>
            </h1>
            <p className="mt-4 text-xl md:text-2xl text-blue-200 font-light tracking-wide border-l-4 border-accent pl-4">
              High-Speed Retro Arcade Action
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col gap-4 w-full max-w-sm"
          >
            <button 
              onClick={handleStart}
              className="group relative w-full px-8 py-5 bg-primary text-white text-xl font-bold uppercase tracking-widest clip-diagonal hover:bg-pink-600 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(236,72,153,0.4)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-in-out skew-x-12" />
              <span className="flex items-center justify-center gap-3">
                <Play className="fill-current w-6 h-6" /> Start Race
              </span>
            </button>
            
            <button 
              disabled
              className="w-full px-8 py-4 bg-transparent border border-white/20 text-white/50 text-lg font-bold uppercase tracking-widest clip-diagonal hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-3 cursor-not-allowed"
            >
              <Settings className="w-5 h-5" /> Settings (Soon)
            </button>
          </motion.div>

          {/* Quick Stats or Footer */}
          <div className="grid grid-cols-2 gap-8 text-sm text-white/40 font-mono mt-8">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" />
              <span>Version 1.0.0</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent" />
              <span>Weekly Contest</span>
            </div>
          </div>
        </div>

        {/* Right Side: Leaderboard */}
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex-1 w-full max-w-md"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <Leaderboard />
          </div>
        </motion.div>

      </div>
    </div>
  );
}
