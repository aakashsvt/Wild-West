import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { UserDetail, UserStatsRead } from "@/lib/api";

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
  denim:       "#1e3a5f",
  denimBorder: "#2a5480",
} as const;

function deriveLevel(raceCount: number) {
  return {
    level:  Math.floor(raceCount / 5) + 1,
    xp:     (raceCount % 5) * 20,
    xpMax:  100,
    xpNext: 5 - (raceCount % 5),
  };
}

interface StatRowProps {
  label: string;
  value: string | number;
  accent?: boolean;
}

function StatRow({ label, value, accent }: StatRowProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded"
      style={{
        background:  accent ? `${W.borderWarm}25` : `${W.panelMid}cc`,
        border:      `1px solid ${accent ? W.borderGold : W.borderDim}60`,
      }}
    >
      <span
        className="text-sm font-semibold tracking-wide"
        style={{ color: accent ? W.goldBright : W.creamMuted }}
      >
        {label}
      </span>
      <span
        className="text-sm font-mono font-bold"
        style={{ color: accent ? W.goldBright : W.cream }}
      >
        {value}
      </span>
    </div>
  );
}

interface StatsModalProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  user:         UserDetail | null;
  stats:        UserStatsRead | undefined;
}

export function StatsModal({ open, onOpenChange, user, stats }: StatsModalProps) {
  const raceCount = stats?.race_count ?? 0;
  const winCount  = stats?.win_count  ?? 0;
  const lossCount = stats?.loss_count ?? 0;
  const winRate   = raceCount > 0 ? ((winCount / raceCount) * 100).toFixed(1) : "—";
  const { level, xp, xpMax, xpNext } = deriveLevel(raceCount);
  const xpPct = Math.min(100, (xp / xpMax) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm border-0 p-0 overflow-hidden"
        style={{
          background:  W.panelDark,
          border:      `1px solid ${W.borderGold}80`,
          boxShadow:   `0 0 60px rgba(0,0,0,0.8), 0 0 30px ${W.gold}20`,
        }}
      >
        {/* ── Header ── */}
        <div
          className="px-5 pt-5 pb-4"
          style={{ borderBottom: `1px solid ${W.borderDim}` }}
        >
          {/* Level badge + name */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(160deg, ${W.goldBright}, ${W.gold} 50%, #7a4e10)`,
                border:     `3px solid ${W.goldPale}60`,
                boxShadow:  `0 0 16px ${W.gold}50`,
              }}
            >
              <span className="font-western text-lg leading-none" style={{ color: W.bg }}>
                {level}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <DialogTitle
                className="font-western tracking-wider leading-tight"
                style={{ color: W.cream, fontSize: "1.15rem" }}
              >
                {user?.username ?? "Rider"}
              </DialogTitle>
              <span className="text-xs font-mono tracking-widest" style={{ color: W.gold }}>
                LEVEL {level} OUTLAW
              </span>
            </div>
          </div>

          {/* XP bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: W.creamMuted }}>
                XP
              </span>
              <span className="text-[10px] font-mono" style={{ color: W.creamMuted }}>
                {xp} / {xpMax}
                {xpNext > 0 && (
                  <span style={{ color: W.borderWarm }}>
                    {" "}· {xpNext} race{xpNext !== 1 ? "s" : ""} to level {level + 1}
                  </span>
                )}
              </span>
            </div>
            <div
              className="h-2.5 rounded overflow-hidden"
              style={{ background: W.bg, border: `1px solid ${W.borderWarm}40` }}
            >
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width:      `${xpPct}%`,
                  background: `linear-gradient(90deg, ${W.gold}, ${W.goldBright})`,
                  boxShadow:  `0 0 8px ${W.gold}60`,
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Stats rows ── */}
        <div className="px-5 py-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${W.borderWarm})` }} />
            <span className="text-[10px] tracking-[0.3em] font-mono" style={{ color: W.gold }}>✦ RECORD ✦</span>
            <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${W.borderWarm})` }} />
          </div>

          <StatRow label="Games"   value={raceCount} />
          <StatRow label="Wins"    value={winCount}  accent />
          <StatRow label="Losses"  value={lossCount} />
          <StatRow label="Win Rate" value={winRate !== "—" ? `${winRate}%` : "—"} accent />

          <div className="flex items-center gap-2 mt-1 mb-1">
            <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${W.borderWarm})` }} />
            <span className="text-[10px] tracking-[0.3em] font-mono" style={{ color: W.gold }}>✦ WALLET ✦</span>
            <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${W.borderWarm})` }} />
          </div>

          <StatRow label="Gold Coins" value={(user?.coins ?? 0).toLocaleString()} accent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
