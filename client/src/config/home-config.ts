// ─────────────────────────────────────────────────────────────────────────────
// Home Page Configuration — edit this file to change anything on the landing
// screen without touching component logic.
// ─────────────────────────────────────────────────────────────────────────────

export const HOME_CONFIG = {
  // ── Branding ─────────────────────────────────────────────────────────────
  branding: {
    title: "Wild West Rider",
    tagline: "Ride Hard. Race Harder.",
    eyebrow: "✦  Saddle Up, Partner  ✦",
  },

  // ── Player info ─────────────────────────────────────────────────────────
  player: {
    name: "CowboyRider",
    level: 1,
    xp: 0,
    xpMax: 100,
    xpMultiplier: "1x",
  },

  // ── Currency ─────────────────────────────────────────────────────────────
  currency: {
    gold: 0,
    gems: 0,
  },

  // ── Top-right shop button ────────────────────────────────────────────────
  topRight: {
    shop: {
      label: "General Store",
      enabled: false,
    },
  },

  // ── Background ───────────────────────────────────────────────────────────
  background: {
    // Set to a path like "/bg.gif" to replace the animated grid with a GIF.
    // Leave empty ("") to use the default animated grid.
    gifUrl: "",
    // GIF display mode: "cover" fills the screen, "contain" letterboxes it
    gifFit: "cover" as "cover" | "contain",
  },

  // ── Buttons ──────────────────────────────────────────────────────────────
  buttons: {
    play: {
      label: "PLAY",
      enabled: true,
    },
    customize: {
      label: "Outfit",
      enabled: false,
    },
    signIn: {
      label: "Sign In / Up",
      subLabel: "Earn 100 gold on sign-up!",
      enabled: false,
    },
  },
};
