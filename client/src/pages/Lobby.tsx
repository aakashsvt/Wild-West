import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Users, CheckCircle2, Circle, ArrowLeft, Loader2 } from "lucide-react";
import { getSocket, useSocketEvent } from "@/hooks/use-socket";
import { useLobbyStore } from "@/hooks/use-lobby-store";
import { useGameStore } from "@/hooks/use-game-store";
import type { LobbyRoom } from "@shared/types/multiplayer";

const PLAYER_COLORS = ["#ec4899", "#60a5fa", "#4ade80", "#facc15"];
const PLAYER_COLOR_NAMES = ["Pink", "Blue", "Green", "Gold"];

export default function Lobby() {
  const [_, setLocation] = useLocation();
  const { startGame } = useGameStore();
  const {
    players,
    status,
    countdownValue,
    error,
    setLobbyState,
    setCountdown,
    setError,
    setSocketId,
    resetLobby,
  } = useLobbyStore();

  const [username, setUsername] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const hasStarted = useRef(false);

  const mySocketId = getSocket().id ?? null;

  const onLobbyState = useCallback(
    (room: LobbyRoom) => setLobbyState(room),
    [setLobbyState],
  );
  const onCountdown = useCallback(
    (n: number) => setCountdown(n),
    [setCountdown],
  );
  const onError = useCallback((msg: string) => setError(msg), [setError]);
  const onStart = useCallback(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startGame();
    setLocation("/game");
  }, [startGame, setLocation]);

  useSocketEvent("lobby:state", onLobbyState);
  useSocketEvent("lobby:countdown", onCountdown);
  useSocketEvent("lobby:error", onError);
  useSocketEvent("lobby:start", onStart);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id!);
    };
    const onDisconnect = () => {
      setIsConnected(false);
      setHasJoined(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [setSocketId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    getSocket().emit("lobby:join", { username: username.trim() });
    setHasJoined(true);
  };

  const handleReady = () => {
    getSocket().emit("lobby:ready");
  };

  const handleBack = () => {
    getSocket().emit("lobby:leave");
    resetLobby();
    setLocation("/");
  };

  const myPlayer = players.find((p) => p.socketId === mySocketId);
  const isReady = myPlayer?.isReady ?? false;

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-background to-black text-white overflow-hidden relative flex flex-col items-center justify-center">
      {/* Animated Grid Background */}
      <div
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, #4f46e5 1px, transparent 1px), linear-gradient(to bottom, #ec4899 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          transform:
            "perspective(500px) rotateX(60deg) translateY(-100px) scale(2)",
          transformOrigin: "top center",
        }}
      />

      <div className="relative z-10 w-full max-w-lg px-4">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8 text-sm uppercase tracking-wider font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Menu
        </button>

        {/* Title */}
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-black font-display italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-primary to-purple-600 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)] mb-8"
        >
          RACE LOBBY
        </motion.h2>

        {/* Connecting state */}
        {!isConnected && (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-white/60 font-mono tracking-widest uppercase text-sm animate-pulse">
              Connecting to server...
            </p>
          </div>
        )}

        {/* Username entry */}
        {isConnected && !hasJoined && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleJoin}
            className="flex flex-col gap-4"
          >
            <label className="text-white/60 font-mono text-sm uppercase tracking-widest">
              Enter your name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={16}
              placeholder="Cowboy name..."
              className="bg-white/5 border border-white/20 text-white placeholder-white/30 px-4 py-3 text-lg font-bold tracking-wide focus:outline-none focus:border-primary transition-colors"
            />
            {error && <p className="text-red-400 font-mono text-sm">{error}</p>}
            <button
              type="submit"
              disabled={!username.trim()}
              className="group relative w-full px-8 py-4 bg-primary text-white text-lg font-bold uppercase tracking-widest clip-diagonal hover:bg-pink-600 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(236,72,153,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Join Lobby
            </button>
          </motion.form>
        )}

        {/* Lobby roster */}
        {isConnected && hasJoined && status !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            {/* Player slots */}
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => {
                const player = players[i];
                const isMe = player?.socketId === mySocketId;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-4 border border-white/10 bg-white/5 backdrop-blur"
                    style={{
                      borderColor: player
                        ? PLAYER_COLORS[player.colorIndex] + "40"
                        : undefined,
                    }}
                  >
                    {player ? (
                      <>
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: PLAYER_COLORS[player.colorIndex],
                          }}
                        />
                        <span className="flex-1 font-bold tracking-wide text-white">
                          {player.username}
                          {isMe && (
                            <span className="ml-2 text-xs text-white/40 font-mono normal-case tracking-normal">
                              (you)
                            </span>
                          )}
                        </span>
                        {player.isReady ? (
                          <span className="flex items-center gap-1 text-green-400 text-sm font-mono uppercase tracking-widest">
                            <CheckCircle2 className="w-4 h-4" /> Ready
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-white/30 text-sm font-mono uppercase tracking-widest">
                            <Circle className="w-4 h-4" /> Waiting
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 rounded-full bg-white/10 flex-shrink-0" />
                        <span className="flex-1 text-white/20 font-mono text-sm uppercase tracking-widest animate-pulse">
                          Waiting for player...
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Player count */}
            <div className="flex items-center gap-2 text-white/40 font-mono text-sm">
              <Users className="w-4 h-4" />
              <span>
                {players.length} / 4 players ·{" "}
                {players.filter((p) => p.isReady).length} ready
              </span>
            </div>

            {/* Ready button */}
            {status === "waiting" && (
              <button
                onClick={handleReady}
                disabled={isReady}
                className="group relative w-full px-8 py-5 bg-primary text-white text-xl font-bold uppercase tracking-widest clip-diagonal hover:bg-pink-600 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(236,72,153,0.4)] disabled:bg-green-600 disabled:hover:scale-100 disabled:shadow-[0_0_30px_rgba(74,222,128,0.3)]"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-in-out skew-x-12" />
                <span className="flex items-center justify-center gap-3">
                  {isReady ? (
                    <>
                      <CheckCircle2 className="w-6 h-6" /> Ready!
                    </>
                  ) : (
                    "Ready Up"
                  )}
                </span>
              </button>
            )}

            {/* Countdown overlay */}
            <AnimatePresence>
              {status === "countdown" && countdownValue !== null && (
                <motion.div
                  key="countdown-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
                >
                  <p className="text-white/60 font-mono text-xl uppercase tracking-[0.4em] mb-8">
                    Get Ready
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={countdownValue}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.8, opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="text-[12rem] font-black font-display leading-none text-transparent bg-clip-text bg-gradient-to-br from-white via-primary to-purple-600 drop-shadow-[0_0_40px_rgba(236,72,153,0.8)]"
                    >
                      {countdownValue}
                    </motion.span>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
