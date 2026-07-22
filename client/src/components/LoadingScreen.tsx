
import { useEffect, useRef } from "react";
import { useProgress } from "@react-three/drei";
import { motion } from "framer-motion";

// ─── Configure the loading screen here ───────────────────────────────────────
const LOADING_CONFIG = {
  title: "Wild West Rider",
  subtitle: "Saddling up the horses...",
  gifUrl: "",           // set to "/path/to/animation.gif" to show a GIF above the bar
  showAssetName: true,  // show "Loading <filename>" line
  showPercentage: true, // show the numeric % counter
  minDisplayMs: 1200,   // minimum ms shown (avoids flash on warm cache)
};
// ─────────────────────────────────────────────────────────────────────────────

// Western colour tokens — same palette as Home page
const W = {
  bg:         "#0a0603",
  panelDark:  "#130a04",
  borderDim:  "#3d1e0a",
  borderWarm: "#6b3820",
  borderGold: "#a07030",
  gold:       "#c8922a",
  goldBright: "#d4a853",
  goldPale:   "#e8c87a",
  cream:      "#e8d5b0",
  creamMuted: "#b89a72",
} as const;

interface LoadingScreenProps {
  onFinished: () => void;
}

export function LoadingScreen({ onFinished }: LoadingScreenProps) {
  const { progress, item } = useProgress();
  const mountTimeRef = useRef(Date.now());
  const finishedRef = useRef(false);

  const assetLabel = item
    ? item.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "assets"
    : "assets";

  useEffect(() => {
    if (progress < 100 || finishedRef.current) return;
    finishedRef.current = true;

    const elapsed = Date.now() - mountTimeRef.current;
    const remaining = Math.max(0, LOADING_CONFIG.minDisplayMs - elapsed);

    // No cleanup return here on purpose: useProgress can fire several updates
    // that are all "100" (multiple loaders finishing near-simultaneously), each
    // re-running this effect. If this timer were cancelled by the next re-run's
    // cleanup, the finishedRef guard above would then block it from ever being
    // rescheduled — leaving the screen stuck at 100% forever.
    setTimeout(onFinished, remaining);
  }, [progress, onFinished]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center select-none overflow-hidden"
      style={{ background: W.bg }}
    >
      {/* ── Atmosphere ──────────────────────────────────────────────────── */}

      {/* Warm radial gradient from top — desert sky at dusk */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 130% 80% at 50% 0%,
            #2d140a 0%, #1a0a04 40%, ${W.bg} 72%)`,
        }}
      />

      {/* Subtle earthy grid — old map paper feel */}
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

      {/* Corner vignette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 65% 65% at 50% 50%,
            transparent 20%, rgba(10,6,3,0.82) 100%)`,
        }}
      />

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 w-full max-w-lg">

        {/* Optional GIF */}
        {LOADING_CONFIG.gifUrl && (
          <img
            src={LOADING_CONFIG.gifUrl}
            alt="loading"
            className="w-40 h-40 object-contain"
          />
        )}

        {/* Top ornament */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 w-full"
        >
          <div
            className="flex-1 h-px"
            style={{ background: `linear-gradient(to right, transparent, ${W.borderGold})` }}
          />
          <span className="text-xs tracking-[0.35em] font-mono" style={{ color: W.gold }}>
            ✦
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: `linear-gradient(to left, transparent, ${W.borderGold})` }}
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="font-western text-center leading-tight tracking-wider text-shadow-western"
          style={{
            fontSize: "clamp(2.2rem, 6vw, 3.8rem)",
            color: W.cream,
          }}
        >
          {LOADING_CONFIG.title}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-sm tracking-[0.25em] uppercase font-mono text-center"
          style={{ color: W.creamMuted }}
        >
          {LOADING_CONFIG.subtitle}
        </motion.p>

        {/* Progress bar track */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="w-full relative"
        >
          {/* Track */}
          <div
            className="w-full h-3 rounded-sm overflow-hidden"
            style={{
              background: `${W.bg}`,
              border: `1px solid ${W.borderWarm}80`,
              boxShadow: `inset 0 2px 6px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Fill */}
            <motion.div
              className="h-full rounded-sm"
              style={{
                background: `linear-gradient(90deg, ${W.gold}, ${W.goldBright} 70%, ${W.goldPale})`,
                boxShadow: `0 0 10px ${W.gold}80`,
              }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.35 }}
            />
          </div>

          {/* Ornamental end-caps */}
          <span
            className="absolute -left-2 top-1/2 -translate-y-1/2 text-xs leading-none"
            style={{ color: W.borderWarm }}
          >
            ✦
          </span>
          <span
            className="absolute -right-2 top-1/2 -translate-y-1/2 text-xs leading-none"
            style={{ color: W.borderWarm }}
          >
            ✦
          </span>
        </motion.div>

        {/* Percentage + asset name row */}
        <div className="flex items-baseline justify-between w-full px-2">
          {LOADING_CONFIG.showAssetName ? (
            <p
              className="text-xs font-mono tracking-wide truncate max-w-[60%]"
              style={{ color: `${W.creamMuted}80` }}
            >
              Loading {assetLabel}…
            </p>
          ) : (
            <span />
          )}

          {LOADING_CONFIG.showPercentage && (
            <motion.span
              className="font-western text-xl tabular-nums"
              style={{ color: W.goldBright }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              {Math.round(progress)}%
            </motion.span>
          )}
        </div>

        {/* Bottom ornament */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-3 w-full"
        >
          <div
            className="flex-1 h-px"
            style={{ background: `linear-gradient(to right, transparent, ${W.borderDim})` }}
          />
          <span className="text-[10px] tracking-[0.3em] font-mono" style={{ color: `${W.borderWarm}` }}>
            ✦ &nbsp; CANYON RACER &nbsp; ✦
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: `linear-gradient(to left, transparent, ${W.borderDim})` }}
          />
        </motion.div>

      </div>
    </div>
  );
}
