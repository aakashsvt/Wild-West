



























































































































import { motion } from "framer-motion";
import { Play, Store, Gem, Shirt, UserRound } from "lucide-react";
import { useGameStore } from "@/hooks/use-game-store";
import { useLocation } from "wouter";
import { HOME_CONFIG } from "@/config/home-config";

// ── Western colour tokens (all raw hex so they're tree-shakeable) ──────────
const W = {
  bg:          "#0a0603",   // near-black with brown cast
  panelDark:   "#130a04",   // panel background
  panelMid:    "#1e0f06",   // slightly lighter panel
  borderDim:   "#3d1e0a",   // subtle border
  borderWarm:  "#6b3820",   // warm visible border
  borderGold:  "#a07030",   // gold border
  gold:        "#c8922a",   // primary gold accent
  goldBright:  "#d4a853",   // highlight gold
  goldPale:    "#e8c87a",   // pale gold
  cream:       "#e8d5b0",   // parchment text
  creamMuted:  "#b89a72",   // muted parchment
  rust:        "#8b3d1f",   // rust/copper accent
  rustDim:     "#5c2810",   // dimmed rust
  denim:       "#1e3a5f",   // cowboy denim blue (for name badge)
  denimBorder: "#2a5480",
} as const;

export default function Home() {
  const { startGame } = useGameStore();
  const [_loc, setLocation] = useLocation();
  const { branding, player, currency, topRight, background, buttons } = HOME_CONFIG;

  const handleStart = () => {
    setLocation("/lobby");
  };

  const xpPct = player.xpMax > 0 ? Math.min(100, (player.xp / player.xpMax) * 100) : 0;

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden select-none"
      style={{ background: W.bg, color: W.cream }}
    >
      {/* ── Background ──────────────────────────────────────────────────── */}

      {/* Base atmosphere: dark desert gradient */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 120% 80% at 50% 0%,
            #2d140a 0%, #1a0a04 35%, ${W.bg} 70%)`,
        }}
      />

      {background.gifUrl ? (
        /* GIF background */
        <img
          src={background.gifUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{ objectFit: background.gifFit }}
        />
      ) : (
        /* Default: subtle old-map grid in earthy tones */
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

      {/* Vignette — darkens corners so center content pops */}
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

        {/* Level badge */}
        <motion.div
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 rounded px-3 py-2"
          style={{
            background: `${W.panelDark}dd`,
            border: `1px solid ${W.borderWarm}80`,
            boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
          }}
        >
          {/* Level coin */}
          <div
            className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(160deg, ${W.goldBright}, ${W.gold} 50%, #7a4e10)`,
              border: `2px solid ${W.goldPale}60`,
              boxShadow: `0 0 10px ${W.gold}40`,
            }}
          >
            <span className="font-western text-sm leading-none" style={{ color: W.bg }}>
              {player.level}
            </span>
          </div>

          {/* XP bar */}
          <div className="flex flex-col gap-[4px] w-24">
            <span className="text-[10px] font-mono leading-none" style={{ color: W.creamMuted }}>
              {player.xp} / {player.xpMax}
            </span>
            <div
              className="h-1.5 rounded-sm overflow-hidden"
              style={{ background: W.bg, border: `1px solid ${W.borderDim}` }}
            >
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width: `${xpPct}%`,
                  background: `linear-gradient(90deg, ${W.gold}, ${W.goldBright})`,
                }}
              />
            </div>
          </div>

          {/* Multiplier chip */}
          <div
            className="flex items-center gap-1 rounded-sm px-2 py-1"
            style={{
              background: W.panelMid,
              border: `1px solid ${W.borderWarm}60`,
            }}
          >
            <span className="text-xs leading-none" style={{ color: W.goldBright }}>✦</span>
            <span className="font-mono text-xs leading-none" style={{ color: W.cream }}>
              {player.xpMultiplier}
            </span>
          </div>
        </motion.div>

        {/* General Store */}
        <motion.button
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          disabled
          className="flex items-center gap-2 rounded px-4 py-2 cursor-not-allowed opacity-50"
          style={{
            background: `${W.panelDark}dd`,
            border: `1px solid ${W.borderWarm}70`,
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
              border: `1px solid ${W.borderWarm}60`,
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            {/* Gold */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(160deg, ${W.goldBright}, ${W.gold} 60%, #7a4e10)`,
                  border: `2px solid ${W.goldPale}50`,
                  boxShadow: `0 0 8px ${W.gold}30`,
                }}
              >
                <span className="font-black text-sm leading-none" style={{ color: W.bg }}>$</span>
              </div>
              <div
                className="flex-1 rounded-sm px-3 py-2"
                style={{ background: `${W.bg}cc`, border: `1px solid ${W.borderDim}` }}
              >
                <span className="font-western text-base leading-none" style={{ color: W.cream }}>
                  {currency.gold.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Gems */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 flex-shrink-0 rounded flex items-center justify-center"
                style={{
                  background: `linear-gradient(160deg, ${W.rust}, ${W.rustDim})`,
                  border: `2px solid ${W.rust}60`,
                  boxShadow: `0 0 8px ${W.rust}20`,
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
              border: `1px solid ${W.borderWarm}60`,
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            {/* Name — denim sheriff-sign look */}
            <div
              className="flex items-center gap-2 rounded-sm px-3 py-2.5"
              style={{
                background: `${W.denim}99`,
                border: `1px solid ${W.denimBorder}60`,
              }}
            >
              <span className="text-sm leading-none" style={{ color: W.goldBright }}>✦</span>
              <span className="font-western text-sm tracking-wide truncate" style={{ color: W.cream }}>
                {player.name}
              </span>
            </div>

            {/* Outfit (Customize) */}
            <button
              disabled
              className="flex items-center gap-2 rounded-sm px-3 py-3 cursor-not-allowed w-full"
              style={{
                background: `${W.panelMid}80`,
                border: `1px solid ${W.borderDim}`,
                color: `${W.creamMuted}55`,
              }}
            >
              <Shirt className="w-4 h-4 flex-shrink-0" style={{ color: `${W.borderWarm}` }} />
              <span className="font-western text-sm tracking-wide">{buttons.customize.label}</span>
            </button>

            {/* Sign In */}
            <button
              disabled
              className="flex flex-col items-center gap-1 rounded-sm px-3 py-3 cursor-not-allowed w-full"
              style={{
                background: `${W.panelMid}80`,
                border: `1px solid ${W.borderDim}`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <UserRound className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `${W.borderWarm}` }} />
                <span className="font-western text-sm tracking-wide" style={{ color: `${W.creamMuted}55` }}>
                  {buttons.signIn.label}
                </span>
              </div>
              <span className="text-[11px] tracking-wide" style={{ color: `${W.borderWarm}99` }}>
                {buttons.signIn.subLabel}
              </span>
            </button>
          </div>
        </motion.div>

        {/* ── Center: title + PLAY ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 gap-5 px-4">

          {/* Eyebrow ornament */}
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

          {/* Game title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1
              className="font-western leading-tight tracking-wider text-shadow-western"
              style={{
                fontSize: "clamp(2.4rem, 5vw, 4.5rem)",
                color: W.cream,
              }}
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

          {/* Decorative rule */}
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
              background: `linear-gradient(175deg, ${W.goldBright} 0%, ${W.gold} 45%, #8b5e18 100%)`,
              border: `2px solid ${W.goldBright}90`,
              color: W.bg,
              fontFamily: "var(--font-western)",
              fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)",
              letterSpacing: "0.18em",
              boxShadow: `
                0 0 60px ${W.gold}55,
                0 4px 20px rgba(0,0,0,0.6),
                inset 0 1px 0 ${W.goldPale}50,
                inset 0 -2px 0 rgba(0,0,0,0.3)
              `,
            }}
          >
            <Play className="fill-current flex-shrink-0" style={{ width: "2rem", height: "2rem" }} />
            {buttons.play.label}
          </motion.button>
        </div>

        {/* Mirror gutter — keeps center truly centered */}
        <div className="flex-shrink-0 w-52 lg:w-56 xl:w-60" aria-hidden />
      </div>
    </div>
  );
}
