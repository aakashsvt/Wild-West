import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Package,
  Lock,
  Shirt,
  Zap,
  Star,
  Shield,
  Gem,
  ChevronDown,
} from "lucide-react";
import { useMarketplaceItems } from "@/hooks/use-marketplace";
import { useMe } from "@/hooks/use-auth";
import type { ItemRead, ItemTypeRead } from "@/lib/api";

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

function typeIcon(typeName: string, size = 32) {
  const n = typeName.toLowerCase();
  if (n.includes("head") || n.includes("hat") || n.includes("helm"))   return <Shirt size={size} />;
  if (n.includes("horse") || n.includes("mount") || n.includes("speed")) return <Zap size={size} />;
  if (n.includes("weapon") || n.includes("gun") || n.includes("boost"))  return <Star size={size} />;
  if (n.includes("armor") || n.includes("shield") || n.includes("body")) return <Shield size={size} />;
  if (n.includes("gem") || n.includes("jewel"))                          return <Gem size={size} />;
  return <Package size={size} />;
}

type View = "categories" | "items";
type Filter = "all" | "owned";
type SortMode = "owned" | "name";

interface CustomizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomizeModal({ open, onOpenChange }: CustomizeModalProps) {
  const [view, setView] = useState<View>("categories");
  const [selectedType, setSelectedType] = useState<ItemTypeRead | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortMode>("owned");

  const { data: allItems = [] } = useMarketplaceItems();
  const { data: me } = useMe();

  const userItems = me?.items ?? [];
  const activeItems = me?.active_items ?? [];

  const types = [
    ...new Map(allItems.map((i) => [i.item_type.id, i.item_type])).values(),
  ];

  const ownedMap = new Map(userItems.map((ui) => [ui.item.id, ui]));
  const activeItemIds = new Set(
    activeItems.map((ai) => ai.user_item.item.id),
  );

  function ownedCountForType(typeId: number) {
    return userItems.filter((ui) => ui.item.item_type.id === typeId).length;
  }

  const typeItems = selectedType
    ? allItems.filter((i) => i.item_type.id === selectedType.id)
    : [];

  let displayItems = [...typeItems];
  if (filter === "owned") displayItems = displayItems.filter((i) => ownedMap.has(i.id));
  if (sort === "owned") {
    displayItems.sort((a, b) => {
      const aO = ownedMap.has(a.id) ? 1 : 0;
      const bO = ownedMap.has(b.id) ? 1 : 0;
      return bO - aO;
    });
  } else {
    displayItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  function openCategory(type: ItemTypeRead) {
    setSelectedType(type);
    setFilter("all");
    setSort("owned");
    setView("items");
  }

  function goBack() {
    setView("categories");
    setSelectedType(null);
  }

  function handleClose(open: boolean) {
    if (!open) {
      setView("categories");
      setSelectedType(null);
    }
    onOpenChange(open);
  }

  const ownedTotal = userItems.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="border-0 p-0 overflow-hidden"
        style={{
          background: W.panelDark,
          border:     `1px solid ${W.borderGold}80`,
          boxShadow:  `0 0 80px rgba(0,0,0,0.85), 0 0 40px ${W.gold}15`,
          maxWidth:   500,
          width:      "95vw",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: `1px solid ${W.borderDim}` }}
        >
          <AnimatePresence>
            {view === "items" && (
              <motion.button
                key="back"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                onClick={goBack}
                className="flex items-center justify-center rounded w-8 h-8 flex-shrink-0"
                style={{
                  background: W.panelMid,
                  border:     `1px solid ${W.borderWarm}60`,
                }}
              >
                <ArrowLeft size={16} style={{ color: W.gold }} />
              </motion.button>
            )}
          </AnimatePresence>

          <DialogTitle
            className="font-western tracking-wider flex-1"
            style={{ fontSize: "1.3rem", color: W.goldBright }}
          >
            {view === "categories" ? "Customize" : (selectedType?.name ?? "Items")}
          </DialogTitle>

          {view === "items" && selectedType && (
            <span className="font-mono text-sm" style={{ color: W.creamMuted }}>
              <span style={{ color: W.goldBright }}>{ownedCountForType(selectedType.id)}</span>
              <span style={{ color: W.borderWarm }}> / {typeItems.length}</span>
            </span>
          )}

          {view === "categories" && ownedTotal > 0 && (
            <span className="font-mono text-xs" style={{ color: W.creamMuted }}>
              {ownedTotal} item{ownedTotal !== 1 ? "s" : ""} owned
            </span>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {view === "categories" ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-4"
            >
              {types.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Package size={40} style={{ color: W.borderWarm }} />
                  <p className="font-western text-base" style={{ color: W.creamMuted }}>
                    No items in your collection
                  </p>
                  <p className="text-xs font-mono" style={{ color: `${W.borderWarm}99` }}>
                    Visit the General Store to pick some up
                  </p>
                </div>
              ) : (
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
                >
                  {types.map((type) => {
                    const count = ownedCountForType(type.id);
                    const total = allItems.filter((i) => i.item_type.id === type.id).length;
                    return (
                      <CategoryCard
                        key={type.id}
                        type={type}
                        owned={count}
                        total={total}
                        onClick={() => openCategory(type)}
                      />
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="items"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              {/* Filter / Sort toolbar */}
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{ borderBottom: `1px solid ${W.borderDim}` }}
              >
                <SelectPill
                  label="Filter"
                  value={filter === "all" ? "All" : "Owned"}
                  options={[
                    { label: "All",   value: "all"   },
                    { label: "Owned", value: "owned" },
                  ]}
                  onChange={(v) => setFilter(v as Filter)}
                />
                <SelectPill
                  label="Sort"
                  value={sort === "owned" ? "Owned first" : "Name"}
                  options={[
                    { label: "Owned first", value: "owned" },
                    { label: "Name",        value: "name"  },
                  ]}
                  onChange={(v) => setSort(v as SortMode)}
                />
              </div>

              {/* Item grid */}
              <div
                className="overflow-y-auto p-4"
                style={{ maxHeight: 340 }}
              >
                {displayItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Lock size={32} style={{ color: W.borderWarm }} />
                    <p className="font-western text-sm" style={{ color: W.creamMuted }}>
                      No items here
                    </p>
                  </div>
                ) : (
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
                  >
                    {displayItems.map((item) => (
                      <ItemTile
                        key={item.id}
                        item={item}
                        owned={ownedMap.has(item.id)}
                        active={activeItemIds.has(item.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function CategoryCard({
  type,
  owned,
  total,
  onClick,
}: {
  type: ItemTypeRead;
  owned: number;
  total: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="relative flex flex-col items-center justify-end rounded-xl overflow-hidden text-left"
      style={{
        height:     160,
        background: `linear-gradient(160deg, #2a1208 0%, #1a0b04 60%, ${W.panelDark} 100%)`,
        border:     `1px solid ${W.borderGold}50`,
        boxShadow:  `0 4px 16px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Icon area */}
      <div className="flex-1 flex items-center justify-center w-full pt-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(160deg, ${W.rust}, ${W.rustDim})`,
            border:     `2px solid ${W.borderWarm}50`,
            boxShadow:  `0 0 20px ${W.gold}20`,
          }}
        >
          <span style={{ color: W.goldPale }}>
            {typeIcon(type.name, 26)}
          </span>
        </div>
      </div>

      {/* Name bar */}
      <div
        className="w-full px-3 py-2.5 flex items-center justify-between"
        style={{
          background: `linear-gradient(to top, ${W.rust}60, transparent)`,
          borderTop:  `1px solid ${W.borderWarm}30`,
        }}
      >
        <span className="font-western text-sm tracking-wide" style={{ color: W.cream }}>
          {type.name}
        </span>
        <span className="font-mono text-xs" style={{ color: W.goldBright }}>
          {owned}/{total}
        </span>
      </div>

      {/* Owned badge */}
      {owned > 0 && (
        <div
          className="absolute top-2 right-2 rounded-full px-1.5 py-0.5"
          style={{
            background: `${W.gold}dd`,
            fontSize:   "9px",
            fontFamily: "monospace",
            color:      W.bg,
            fontWeight: "bold",
          }}
        >
          {owned}
        </div>
      )}
    </motion.button>
  );
}

function ItemTile({
  item,
  owned,
  active,
}: {
  item: ItemRead;
  owned: boolean;
  active: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex flex-col items-center rounded-lg overflow-hidden"
      style={{
        background: active
          ? `linear-gradient(160deg, ${W.rust}60, #2a1008)`
          : owned
          ? `linear-gradient(160deg, #1e1008, #110804)`
          : `${W.panelMid}80`,
        border: active
          ? `2px solid ${W.goldBright}90`
          : `1px solid ${owned ? W.borderGold + "50" : W.borderDim + "50"}`,
        boxShadow: active ? `0 0 12px ${W.gold}40` : "none",
        opacity:   owned ? 1 : 0.45,
        aspectRatio: "1",
      }}
    >
      {/* Active ring */}
      {active && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 2px ${W.goldBright}60` }}
        />
      )}

      {/* Image / icon */}
      <div className="flex-1 flex items-center justify-center p-2 w-full">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="max-w-full max-h-full object-contain"
            style={{
              filter: owned
                ? `drop-shadow(0 2px 6px ${W.gold}40)`
                : "grayscale(0.6)",
            }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: owned
                ? `linear-gradient(160deg, ${W.rust}, ${W.rustDim})`
                : W.panelDark,
              border: `1px solid ${W.borderWarm}40`,
            }}
          >
            <span style={{ color: owned ? W.goldPale : W.borderWarm }}>
              {typeIcon(item.item_type.name, 18)}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <div
        className="w-full px-1.5 pb-1.5 text-center"
        style={{
          background: owned
            ? `linear-gradient(to top, ${W.bg}cc, transparent)`
            : "transparent",
        }}
      >
        <span
          className="text-[9px] font-mono leading-tight block truncate"
          style={{ color: owned ? W.cream : W.borderWarm }}
        >
          {item.name}
        </span>
      </div>

      {/* Lock overlay for unowned */}
      {!owned && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center">
          <div
            className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
            style={{
              background: `${W.bg}cc`,
              border:     `1px solid ${W.borderDim}`,
            }}
          >
            <Lock size={8} style={{ color: W.creamMuted }} />
            <span className="text-[8px] font-mono" style={{ color: W.creamMuted }}>
              locked
            </span>
          </div>
        </div>
      )}

      {/* Active indicator */}
      {active && (
        <div className="absolute top-1 left-1">
          <div
            className="rounded-full px-1.5 py-0.5"
            style={{
              background: `${W.gold}dd`,
              fontSize:   "8px",
              color:      W.bg,
              fontWeight: "bold",
              fontFamily: "monospace",
            }}
          >
            ON
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SelectPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative flex items-center">
      <select
        value={options.find((o) => o.label === value)?.value ?? options[0].value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full pl-3 pr-7 py-1.5 text-xs font-mono cursor-pointer"
        style={{
          background: W.panelMid,
          border:     `1px solid ${W.borderGold}60`,
          color:      W.goldBright,
          outline:    "none",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: W.panelDark, color: W.cream }}>
            {label}: {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="absolute right-2 pointer-events-none"
        style={{ color: W.goldBright }}
      />
    </div>
  );
}
