import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Store, Gem, Shirt, UserRound, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { HOME_CONFIG } from "@/config/home-config";
import { useAuthStore } from "@/store/auth-store";
import { useMe, useLogout } from "@/hooks/use-auth";
import { useMyStats } from "@/hooks/use-user-stats";
import { AuthModal } from "@/components/AuthModal";
import { StatsModal } from "@/components/StatsModal";
import { CustomizeModal } from "@/components/CustomizeModal";

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
  rustDim:     "#5c2810",
  denim:       "#1e3a5f",
  denimBorder: "#2a5480",
} as const;

function deriveLevel(raceCount: number) {
  const level = Math.floor(raceCount / 5) + 1;
  const xp    = (raceCount % 5) * 20;
  return { level, xp, xpMax: 100 };
}

export default function Home() {
  const [_loc, setLocation] = useLocation();
  const [authOpen,      setAuthOpen]      = useState(false);
  const [authTab,       setAuthTab]       = useState<"signin" | "signup">("signin");
  const [statsOpen,     setStatsOpen]     = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const storeUser       = useAuthStore((s) => s.user);
  const logout          = useLogout();

  const { data: meData } = useMe();
  const { data: stats }  = useMyStats();

  const { branding, currency, topRight, background } = HOME_CONFIG;

  const playerName = storeUser?.username ?? "Rider";
  const coins      = storeUser?.coins    ?? currency.gold;
  const raceCount  = stats?.race_count   ?? 0;
  const winCount   = stats?.win_count    ?? 0;
  const { level, xp, xpMax } = deriveLevel(raceCount);
  const xpPct = Math.min(100, (xp / xpMax) * 100);

  const openSignIn = () => { setAuthTab("signin"); setAuthOpen(true); };
  const openSignUp = () => { setAuthTab("signup"); setAuthOpen(true); };

  const handleStart = () => {
    if (!isAuthenticated) { openSignIn(); return; }
    setLocation("/lobby");
  };

  const handleLevelBadgeClick = () => {
    if (isAuthenticated) setStatsOpen(true);
  };

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden select-none"
      style={{ background: W.bg, color: W.cream }}
    >
      {/* ── Background ──────────────────────────────────────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 120% 80% at 50% 0%,
            #2d140a 0%, #1a0a04 35%, ${W.bg} 70%)`,
        }}
      />

      {background.gifUrl ? (
        <img
          src={background.gifUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{ objectFit: background.gifFit }}
        />
      ) : (
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
      )}

      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 70% at 50% 50%,
            transparent 30%, rgba(10,6,3,0.75) 100%)`,
        }}
      />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="relative z-30 flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-2">

        {/* Level / XP badge — clickable when logged in */}
        <motion.button
          onClick={handleLevelBadgeClick}
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          whileHover={isAuthenticated ? { scale: 1.03 } : undefined}
          whileTap={isAuthenticated ? { scale: 0.97 } : undefined}
          className="flex items-center gap-2 rounded px-3 py-2 transition-colors"
          style={{
            background:  `${W.panelDark}dd`,
            border:      `1px solid ${isAuthenticated ? W.borderGold : W.borderWarm}80`,
            boxShadow:   "0 2px 12px rgba(0,0,0,0.5)",
            cursor:      isAuthenticated ? "pointer" : "default",
          }}
        >
          <div
            className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(160deg, ${W.goldBright}, ${W.gold} 50%, #7a4e10)`,
              border:     `2px solid ${W.goldPale}60`,
              boxShadow:  `0 0 10px ${W.gold}40`,
            }}
          >
            <span className="font-western text-sm leading-none" style={{ color: W.bg }}>
              {level}
            </span>
          </div>

          <div className="flex flex-col gap-[4px] w-24">
            <span className="text-[10px] font-mono leading-none" style={{ color: W.creamMuted }}>
              {isAuthenticated ? `${xp} / ${xpMax} XP` : "Sign in"}
            </span>
            <div
              className="h-1.5 rounded-sm overflow-hidden"
              style={{ background: W.bg, border: `1px solid ${W.borderDim}` }}
            >
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width:      `${xpPct}%`,
                  background: `linear-gradient(90deg, ${W.gold}, ${W.goldBright})`,
                }}
              />
            </div>
          </div>

          <div
            className="flex items-center gap-1 rounded-sm px-2 py-1"
            style={{ background: W.panelMid, border: `1px solid ${W.borderWarm}60` }}
          >
            <span className="text-xs leading-none" style={{ color: W.goldBright }}>✦</span>
            <span className="font-mono text-xs leading-none" style={{ color: W.cream }}>
              {raceCount > 0 ? `${winCount}W` : "—"}
            </span>
          </div>

          {/* Hint pip when logged in */}
          {isAuthenticated && (
            <span className="text-[9px] font-mono tracking-wide" style={{ color: `${W.gold}80` }}>
              ▼
            </span>
          )}
        </motion.button>

        {/* General Store */}
        <motion.button
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setLocation("/salon")}
          className="flex items-center gap-2 rounded px-4 py-2"
          style={{
            background: `${W.panelDark}dd`,
            border:     `1px solid ${W.borderWarm}70`,
          }}
        >
          <Store className="w-4 h-4" style={{ color: W.gold }} />
          <span className="font-western text-sm tracking-wide" style={{ color: W.cream }}>
            {topRight.shop.label}
          </span>
        </motion.button>
      </div>

      {/* ── Content row ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 min-h-0">

        {/* Left sidebar */}
        <motion.div
          initial={{ x: -32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex-shrink-0 flex flex-col gap-3 p-3 w-52 lg:w-56 xl:w-60"
        >
          {/* ── Currency card ──────────────────────────────────────────── */}
          <div
            className="rounded p-3 flex flex-col gap-3"
            style={{
              background: `${W.panelDark}e0`,
              border:     `1px solid ${W.borderWarm}60`,
              boxShadow:  "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            {/* Gold / Coins */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(160deg, ${W.goldBright}, ${W.gold} 60%, #7a4e10)`,
                  border:     `2px solid ${W.goldPale}50`,
                  boxShadow:  `0 0 8px ${W.gold}30`,
                }}
              >
                <span className="font-black text-sm leading-none" style={{ color: W.bg }}>$</span>
              </div>
              <div
                className="flex-1 rounded-sm px-3 py-2"
                style={{ background: `${W.bg}cc`, border: `1px solid ${W.borderDim}` }}
              >
                <span className="font-western text-base leading-none" style={{ color: W.cream }}>
                  {coins.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Gems */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 flex-shrink-0 rounded flex items-center justify-center"
                style={{
                  background: `linear-gradient(160deg, ${W.rust}, ${W.rustDim})`,
                  border:     `2px solid ${W.rust}60`,
                  boxShadow:  `0 0 8px ${W.rust}20`,
                }}
              >
                <Gem className="w-5 h-5" style={{ color: W.cream }} />
              </div>
              <div
                className="flex-1 rounded-sm px-3 py-2"
                style={{ background: `${W.bg}cc`, border: `1px solid ${W.borderDim}` }}
              >
                <span className="font-western text-base leading-none" style={{ color: W.cream }}>
                  {currency.gems.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* ── Player card ────────────────────────────────────────────── */}
          <div
            className="rounded p-3 flex flex-col gap-2"
            style={{
              background: `${W.panelDark}e0`,
              border:     `1px solid ${W.borderWarm}60`,
              boxShadow:  "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            {/* Name */}
            <div
              className="flex items-center gap-2 rounded-sm px-3 py-2.5"
              style={{
                background: `${W.denim}99`,
                border:     `1px solid ${W.denimBorder}60`,
              }}
            >
              <span className="text-sm leading-none" style={{ color: W.goldBright }}>✦</span>
              <span className="font-western text-sm tracking-wide truncate" style={{ color: W.cream }}>
                {playerName}
              </span>
            </div>

            {/* Customize */}
            <button
              onClick={() => isAuthenticated && setCustomizeOpen(true)}
              disabled={!isAuthenticated}
              className="flex items-center gap-2 rounded-sm px-3 py-3 w-full transition-opacity hover:opacity-80"
              style={{
                background: `${W.panelMid}80`,
                border:     `1px solid ${isAuthenticated ? W.borderGold + "60" : W.borderDim}`,
                color:      isAuthenticated ? W.cream : `${W.creamMuted}55`,
                cursor:     isAuthenticated ? "pointer" : "not-allowed",
              }}
            >
              <Shirt className="w-4 h-4 flex-shrink-0" style={{ color: isAuthenticated ? W.goldBright : W.borderWarm }} />
              <span className="font-western text-sm tracking-wide">Customize</span>
            </button>

            {/* Sign In / Out */}
            {isAuthenticated ? (
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-sm px-3 py-3 w-full transition-opacity hover:opacity-80"
                style={{
                  background: `${W.rust}30`,
                  border:     `1px solid ${W.rust}60`,
                }}
              >
                <LogOut className="w-3.5 h-3.5 flex-shrink-0" style={{ color: W.rust }} />
                <span className="font-western text-sm tracking-wide" style={{ color: W.rust }}>
                  Sign Out
                </span>
              </button>
            ) : (
              <button
                onClick={openSignIn}
                className="flex flex-col items-center gap-1 rounded-sm px-3 py-3 w-full transition-opacity hover:opacity-80"
                style={{
                  background: `${W.panelMid}80`,
                  border:     `1px solid ${W.borderGold}60`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <UserRound className="w-3.5 h-3.5 flex-shrink-0" style={{ color: W.gold }} />
                  <span className="font-western text-sm tracking-wide" style={{ color: W.goldBright }}>
                    Sign In / Up
                  </span>
                </div>
                <span className="text-[11px] tracking-wide" style={{ color: `${W.borderWarm}99` }}>
                  Earn 100 gold on sign-up!
                </span>
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Center: title + PLAY ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 gap-5 px-4">

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-3"
          >
            <div className="h-px w-12" style={{ background: `linear-gradient(to right, transparent, ${W.gold})` }} />
            <span className="text-xs tracking-[0.3em] font-mono" style={{ color: W.gold }}>
              {branding.eyebrow}
            </span>
            <div className="h-px w-12" style={{ background: `linear-gradient(to left, transparent, ${W.gold})` }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1
              className="font-western leading-tight tracking-wider text-shadow-western"
              style={{ fontSize: "clamp(2.4rem, 5vw, 4.5rem)", color: W.cream }}
            >
              {branding.title}
            </h1>
            <p
              className="mt-2 text-sm tracking-[0.25em] uppercase font-mono"
              style={{ color: W.creamMuted }}
            >
              {branding.tagline}
            </p>
          </motion.div>

          <div className="flex items-center gap-3 w-full max-w-xs">
            <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${W.borderWarm})` }} />
            <span style={{ color: W.gold }}>✦</span>
            <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${W.borderWarm})` }} />
          </div>

          {/* PLAY button */}
          <motion.button
            onClick={handleStart}
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 180, damping: 16 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-4 rounded px-16 py-5"
            style={{
              background:    `linear-gradient(175deg, ${W.goldBright} 0%, ${W.gold} 45%, #8b5e18 100%)`,
              border:        `2px solid ${W.goldBright}90`,
              color:         W.bg,
              fontFamily:    "var(--font-western)",
              fontSize:      "clamp(1.6rem, 2.5vw, 2.2rem)",
              letterSpacing: "0.18em",
              boxShadow:     `
                0 0 60px ${W.gold}55,
                0 4px 20px rgba(0,0,0,0.6),
                inset 0 1px 0 ${W.goldPale}50,
                inset 0 -2px 0 rgba(0,0,0,0.3)
              `,
            }}
          >
            <Play className="fill-current flex-shrink-0" style={{ width: "2rem", height: "2rem" }} />
            PLAY
          </motion.button>

          {!isAuthenticated && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xs font-mono tracking-wider"
              style={{ color: `${W.borderWarm}99` }}
            >
              Sign in to ride — or{" "}
              <button
                onClick={openSignUp}
                className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                style={{ color: W.gold }}
              >
                create an account
              </button>
            </motion.p>
          )}
        </div>

        <div className="flex-shrink-0 w-52 lg:w-56 xl:w-60" aria-hidden />
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultTab={authTab}
      />

      <StatsModal
        open={statsOpen}
        onOpenChange={setStatsOpen}
        user={meData ?? storeUser}
        stats={stats}
      />

      <CustomizeModal
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
      />
    </div>
  );
}
