import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import { getSocket, useSocketEvent } from "@/hooks/use-socket";
import { useLobbyStore } from "@/hooks/use-lobby-store";
import { useGameStore } from "@/hooks/use-game-store";
import { useAuthStore } from "@/store/auth-store";
import type { LobbyRoom } from "@shared/types/multiplayer";

// Western player colours — earthy and distinct
const PLAYER_COLORS = ["#d4a853", "#c0392b", "#2980b9", "#5a8a4a"];

// Western palette — same tokens as Home, LoadingScreen, GameHUD
const W = {
  bg:          "#0a0603",
  panelDark:   "#130a04",
  panelMid:    "#1e0f06",
  borderDim:   "#3d1e0a",
  borderWarm:  "#6b3820",
  borderGold:  "#a07030",
  gold:        "#c8922a",
  goldBright:  "#d4a853",
  goldPale:    "#e8c87a",
  cream:       "#e8d5b0",
  creamMuted:  "#b89a72",
  rust:        "#8b3d1f",
  denim:       "#1e3a5f",
  denimBorder: "#2a5480",
} as const;

export default function Lobby() {
  const [_loc, setLocation] = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authUser = useAuthStore((s) => s.user);
  const { startGame } = useGameStore();

  useEffect(() => {
    // TEMP: auth bypass for local testing (remote backend has no account yet)
    // if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated]);
  const {
    players,
    status,
    countdownValue,
    error,
    setLobbyState,
    setCountdown,
    setError,
    setSocketId,
    setRaceId,
    resetLobby,
  } = useLobbyStore();

  const [username, setUsername] = useState(authUser?.username ?? "");
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
  const onStart = useCallback(
    ({ raceId }: { raceId: string }) => {
      if (hasStarted.current) return;
      hasStarted.current = true;
      setRaceId(raceId);
      startGame();
      setLocation("/game");
    },
    [startGame, setLocation, setRaceId],
  );

  useSocketEvent("lobby:state", onLobbyState);
  useSocketEvent("lobby:countdown", onCountdown);
  useSocketEvent("lobby:error", onError);
  useSocketEvent("lobby:start", onStart);

  // Reset stale lobby state from any previous race on every mount
  useEffect(() => {
    resetLobby();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    if (socket.connected) {
      // Socket is already alive (returning from a race) — sync state immediately
      setIsConnected(true);
      if (socket.id) setSocketId(socket.id);
    } else {
      socket.connect();
    }

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

  const handleReady = () => getSocket().emit("lobby:ready");
  const handleUnready = () => getSocket().emit("lobby:unready");

  const handleBack = () => {
    getSocket().emit("lobby:leave");
    resetLobby();
    setLocation("/");
  };

  const myPlayer = players.find((p) => p.socketId === mySocketId);
  const isReady = myPlayer?.isReady ?? false;

  // TEMP: auto-join + auto-ready for faster dev iteration while tuning visuals — remove before real testing
  useEffect(() => {
    if (!isConnected || hasJoined) return;
    getSocket().emit("lobby:join", { username: authUser?.username?.trim() || "Tester" });
    setHasJoined(true);
  }, [isConnected, hasJoined, authUser]);

  useEffect(() => {
    if (hasJoined && status === "waiting" && !isReady) {
      handleReady();
    }
  }, [hasJoined, status, isReady]);

  const panelStyle: React.CSSProperties = {
    background: `${W.panelDark}e8`,
    border: `1px solid ${W.borderWarm}70`,
    boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
  };

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden select-none"
      style={{ background: W.bg, color: W.cream }}
    >
      {/* ── Background layers ────────────────────────────────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 120% 80% at 50% 0%,
            #2d140a 0%, #1a0a04 35%, ${W.bg} 70%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            `linear-gradient(to right, rgba(139,90,43,0.10) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(139,90,43,0.10) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 70% at 50% 50%,
            transparent 30%, rgba(10,6,3,0.75) 100%)`,
        }}
      />

      {/* ── Scrollable content ───────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-8 overflow-y-auto">
        <div className="w-full max-w-md flex flex-col gap-5">

          {/* Back button */}
          <button
            onClick={handleBack}
            className="self-start flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] transition-colors"
            style={{ color: W.creamMuted }}
            onMouseEnter={e => (e.currentTarget.style.color = W.cream)}
            onMouseLeave={e => (e.currentTarget.style.color = W.creamMuted)}
          >
            ← Return to Camp
          </button>

          {/* Title block */}
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${W.borderGold})` }} />
              <span className="text-xs font-mono tracking-[0.35em]" style={{ color: W.gold }}>✦</span>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${W.borderGold})` }} />
            </div>
            <h1
              className="font-western text-center leading-tight tracking-wider text-shadow-western"
              style={{ fontSize: "clamp(2rem, 6vw, 3rem)", color: W.cream }}
            >
              Race Lobby
            </h1>
            <p
              className="text-xs tracking-[0.25em] uppercase font-mono text-center"
              style={{ color: W.creamMuted }}
            >
              Find your posse, partner
            </p>
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${W.borderWarm})` }} />
              <span className="text-[10px] tracking-[0.3em] font-mono" style={{ color: W.borderWarm }}>
                ✦ &nbsp; CANYON RACER &nbsp; ✦
              </span>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${W.borderWarm})` }} />
            </div>
          </div>

          {/* ── Connecting ───────────────────────────────────────────────── */}
          {!isConnected && (
            <div className="flex flex-col items-center gap-4 py-10">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="font-western text-5xl"
                style={{ color: W.goldBright }}
              >
                ✦
              </motion.span>
              <p
                className="text-xs tracking-[0.25em] uppercase font-mono"
                style={{ color: W.creamMuted }}
              >
                Connecting to the frontier...
              </p>
            </div>
          )}

          {/* ── Username entry ───────────────────────────────────────────── */}
          {isConnected && !hasJoined && (
            <motion.form
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleJoin}
              className="rounded flex flex-col gap-4 p-5"
              style={panelStyle}
            >
              <label
                className="text-[10px] tracking-[0.25em] uppercase font-mono"
                style={{ color: W.creamMuted }}
              >
                ✦ Your outlaw name
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={16}
                placeholder="Cowboy name..."
                className="w-full px-4 py-3 font-western text-lg rounded-sm focus:outline-none transition-colors placeholder:opacity-30"
                style={{
                  background: W.bg,
                  border: `1px solid ${W.borderWarm}`,
                  color: W.cream,
                }}
                onFocus={e => (e.target.style.borderColor = W.borderGold)}
                onBlur={e => (e.target.style.borderColor = W.borderWarm)}
              />

              {error && (
                <p className="font-mono text-xs" style={{ color: "#c0392b" }}>
                  ✦ {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!username.trim()}
                className="rounded py-4 font-western text-lg tracking-wider transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(175deg, ${W.goldBright} 0%, ${W.gold} 45%, #8b5e18 100%)`,
                  border: `2px solid ${W.goldBright}90`,
                  color: W.bg,
                  boxShadow: `0 0 40px ${W.gold}50, 0 4px 16px rgba(0,0,0,0.5)`,
                  letterSpacing: "0.15em",
                }}
              >
                Join the Posse
              </button>
            </motion.form>
          )}

          {/* ── Lobby roster ─────────────────────────────────────────────── */}
          {isConnected && hasJoined && status !== null && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              {/* Player slots */}
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => {
                  const player = players[i];
                  const isMe = player?.socketId === mySocketId;
                  const playerColor = player ? (PLAYER_COLORS[player.colorIndex] ?? W.goldBright) : null;

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 rounded"
                      style={{
                        background: player
                          ? `${W.panelDark}e8`
                          : `${W.panelDark}80`,
                        border: `1px solid ${player ? (playerColor + "50") : (W.borderDim)}`,
                        boxShadow: player ? "0 2px 12px rgba(0,0,0,0.4)" : "none",
                      }}
                    >
                      {player ? (
                        <>
                          {/* Colour swatch */}
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: playerColor!,
                              boxShadow: `0 0 6px ${playerColor}80`,
                            }}
                          />

                          {/* Name */}
                          <span
                            className="flex-1 font-western text-sm tracking-wide truncate"
                            style={{ color: W.cream }}
                          >
                            {player.username}
                            {isMe && (
                              <span
                                className="ml-2 font-mono text-[10px] normal-case tracking-normal"
                                style={{ color: W.creamMuted }}
                              >
                                (you)
                              </span>
                            )}
                          </span>

                          {/* Ready status */}
                          {player.isReady ? (
                            <span
                              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest"
                              style={{ color: "#5a8a4a" }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Ready
                            </span>
                          ) : (
                            <span
                              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest"
                              style={{ color: W.borderWarm }}
                            >
                              <Circle className="w-3.5 h-3.5" />
                              Waiting
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: W.borderDim }}
                          />
                          <motion.span
                            animate={{ opacity: [0.3, 0.7, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="flex-1 font-mono text-xs uppercase tracking-[0.2em]"
                            style={{ color: W.borderWarm }}
                          >
                            Waiting for rider...
                          </motion.span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Player count */}
              <p
                className="font-mono text-xs tracking-[0.15em]"
                style={{ color: W.creamMuted }}
              >
                ✦ {players.length} / 4 riders · {players.filter((p) => p.isReady).length} ready
              </p>

              {/* Ready button */}
              {status === "waiting" && (
                <button
                  onClick={handleReady}
                  disabled={isReady}
                  className="w-full rounded py-4 font-western text-xl tracking-wider transition-all"
                  style={
                    isReady
                      ? {
                          background: `${W.panelMid}`,
                          border: `2px solid #5a8a4a80`,
                          color: "#5a8a4a",
                          boxShadow: "0 0 20px rgba(90,138,74,0.2)",
                          letterSpacing: "0.15em",
                          cursor: "default",
                        }
                      : {
                          background: `linear-gradient(175deg, ${W.goldBright} 0%, ${W.gold} 45%, #8b5e18 100%)`,
                          border: `2px solid ${W.goldBright}90`,
                          color: W.bg,
                          boxShadow: `0 0 50px ${W.gold}50, 0 4px 16px rgba(0,0,0,0.5)`,
                          letterSpacing: "0.15em",
                        }
                  }
                >
                  {isReady ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Saddled Up!
                    </span>
                  ) : (
                    "Ready Up"
                  )}
                </button>
              )}

              {/* Unready button — only visible when already ready */}
              {status === "waiting" && isReady && (
                <button
                  onClick={handleUnready}
                  className="w-full rounded py-2 font-western text-sm tracking-wider transition-all"
                  style={{
                    background: "transparent",
                    border: `1px solid ${W.borderWarm}50`,
                    color: W.creamMuted,
                    letterSpacing: "0.12em",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = W.rust;
                    e.currentTarget.style.color = W.cream;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = `${W.borderWarm}50`;
                    e.currentTarget.style.color = W.creamMuted;
                  }}
                >
                  Cancel Ready
                </button>
              )}
            </motion.div>
          )}

        </div>
      </div>

      {/* ── Countdown overlay ────────────────────────────────────────────── */}
      <AnimatePresence>
        {status === "countdown" && countdownValue !== null && (
          <motion.div
            key="countdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
            style={{ background: W.bg }}
          >
            {/* Atmosphere */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 130% 80% at 50% 0%,
                  #2d140a 0%, #1a0a04 40%, ${W.bg} 72%)`,
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  `linear-gradient(to right, rgba(139,90,43,0.10) 1px, transparent 1px),
                   linear-gradient(to bottom, rgba(139,90,43,0.10) 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 65% 65% at 50% 50%,
                  transparent 20%, rgba(10,6,3,0.85) 100%)`,
              }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-px" style={{ background: `linear-gradient(to right, transparent, ${W.borderGold})` }} />
                <span className="font-mono text-xs tracking-[0.35em]" style={{ color: W.gold }}>✦</span>
                <div className="w-12 h-px" style={{ background: `linear-gradient(to left, transparent, ${W.borderGold})` }} />
              </div>

              <p
                className="font-mono text-sm tracking-[0.35em] uppercase"
                style={{ color: W.creamMuted }}
              >
                Get Ready, Partner
              </p>

              <AnimatePresence mode="wait">
                <motion.span
                  key={countdownValue}
                  initial={{ scale: 1.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="font-western text-center leading-none"
                  style={{
                    fontSize: "clamp(6rem, 20vw, 12rem)",
                    color: W.goldBright,
                    textShadow: `2px 2px 0 #0a0603, 0 0 80px rgba(200,146,42,0.7)`,
                  }}
                >
                  {countdownValue}
                </motion.span>
              </AnimatePresence>

              <div className="flex items-center gap-3">
                <div className="w-12 h-px" style={{ background: `linear-gradient(to right, transparent, ${W.borderWarm})` }} />
                <span className="font-mono text-[10px] tracking-[0.3em]" style={{ color: W.borderWarm }}>
                  ✦ &nbsp; CANYON RACER &nbsp; ✦
                </span>
                <div className="w-12 h-px" style={{ background: `linear-gradient(to left, transparent, ${W.borderWarm})` }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
