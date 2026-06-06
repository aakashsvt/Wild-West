import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  Shirt,
  Zap,
  Star,
  Shield,
  Gem,
  ShoppingCart,
  Check,
} from "lucide-react";
import { useLocation } from "wouter";
import { useMarketplaceItems, usePurchaseItem } from "@/hooks/use-marketplace";
import { useMe } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { useToast } from "@/hooks/use-toast";
import type { ItemRead } from "@/lib/api";

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

function typeIcon(typeName: string, size = 22) {
  const n = typeName.toLowerCase();
  if (n.includes("horse") || n.includes("mount") || n.includes("speed") || n.includes("vehicle"))
    return <Zap size={size} />;
  if (n.includes("weapon") || n.includes("gun") || n.includes("boost") || n.includes("power"))
    return <Star size={size} />;
  if (n.includes("outfit") || n.includes("skin") || n.includes("apparel") || n.includes("cloth") || n.includes("hat"))
    return <Shirt size={size} />;
  if (n.includes("shield") || n.includes("armor") || n.includes("protect"))
    return <Shield size={size} />;
  if (n.includes("gem") || n.includes("crystal") || n.includes("jewel"))
    return <Gem size={size} />;
  return <Package size={size} />;
}

function ItemCard({
  item,
  ownedQty,
  onBuy,
  isPurchasing,
  canAfford,
}: {
  item: ItemRead;
  ownedQty: number;
  onBuy: () => void;
  isPurchasing: boolean;
  canAfford: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col rounded-lg overflow-hidden"
      style={{
        background: `linear-gradient(160deg, #1e1008 0%, #140a04 60%, #0d0603 100%)`,
        border: `1px solid ${W.borderGold}50`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 ${W.goldPale}08`,
      }}
    >
      {/* Owned badge */}
      {ownedQty > 0 && (
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{ background: `${W.gold}dd`, border: `1px solid ${W.goldPale}80` }}
        >
          <Check size={9} style={{ color: W.bg }} />
          <span className="text-[10px] font-mono font-bold leading-none" style={{ color: W.bg }}>
            ×{ownedQty}
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Name */}
        <h3 className="font-western text-base leading-tight pr-8" style={{ color: W.cream }}>
          {item.name}
        </h3>

        {/* Type label */}
        <span
          className="text-[10px] font-mono tracking-wide uppercase leading-none"
          style={{ color: W.gold }}
        >
          {item.item_type.name}
        </span>

        {/* Image / icon */}
        <div className="flex items-center justify-center py-4">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="max-h-20 max-w-full object-contain"
              style={{ filter: `drop-shadow(0 4px 16px ${W.gold}50)` }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(160deg, ${W.rust}, ${W.rustDim})`,
                border: `2px solid ${W.borderWarm}60`,
                boxShadow: `0 0 24px ${W.gold}25`,
              }}
            >
              <span style={{ color: W.goldPale }}>{typeIcon(item.item_type.name, 28)}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-[11px] leading-snug text-center" style={{ color: W.creamMuted }}>
          {item.description}
        </p>
      </div>

      {/* Price button */}
      <div className="px-4 pb-4 pt-1">
        <button
          onClick={onBuy}
          disabled={isPurchasing || !canAfford}
          className="w-full flex items-center justify-center gap-2 rounded-md py-2.5 transition-all active:scale-95"
          style={{
            background: canAfford
              ? `linear-gradient(175deg, ${W.goldBright} 0%, ${W.gold} 45%, #8b5e18 100%)`
              : `${W.panelMid}`,
            border: `1px solid ${canAfford ? W.goldBright + "60" : W.borderDim}`,
            color: canAfford ? W.bg : W.creamMuted,
            opacity: isPurchasing ? 0.65 : 1,
            cursor: isPurchasing || !canAfford ? "not-allowed" : "pointer",
            boxShadow: canAfford ? `0 2px 12px ${W.gold}30` : "none",
          }}
        >
          <span className="font-black text-xs leading-none" style={{ color: canAfford ? W.bg : W.creamMuted }}>
            $
          </span>
          <span className="font-western text-sm leading-none">
            {item.price.toLocaleString()}
          </span>
        </button>
      </div>
    </motion.div>
  );
}

export default function Salon() {
  const [_loc, setLocation] = useLocation();
  const [activeType, setActiveType] = useState<number | null>(null);
  const { toast } = useToast();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const storeUser = useAuthStore((s) => s.user);
  const coins = storeUser?.coins ?? 0;

  const { data: items = [], isLoading } = useMarketplaceItems();
  const { data: me } = useMe();
  const purchase = usePurchaseItem();

  const types = [
    ...new Map(items.map((i) => [i.item_type.id, i.item_type])).values(),
  ];
  const filtered =
    activeType !== null ? items.filter((i) => i.item_type.id === activeType) : items;

  function ownedQty(itemId: number) {
    return me?.items.find((ui) => ui.item.id === itemId)?.quantity ?? 0;
  }

  function handlePurchase(item: ItemRead) {
    if (!isAuthenticated) {
      toast({ title: "Sign in required", description: "Please sign in to purchase items." });
      return;
    }
    if (coins < item.price) {
      toast({
        title: "Not enough gold",
        description: `You need ${item.price.toLocaleString()} coins but only have ${coins.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }
    purchase.mutate(
      { itemId: item.id },
      {
        onSuccess: (data) => {
          toast({
            title: "Purchase successful!",
            description: `${item.name} acquired. Remaining gold: ${data.remaining_coins.toLocaleString()}`,
          });
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Something went wrong.";
          toast({ title: "Purchase failed", description: msg, variant: "destructive" });
        },
      },
    );
  }

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden select-none"
      style={{ background: W.bg, color: W.cream }}
    >
      {/* Background gradient */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 120% 80% at 50% 0%, #2d140a 0%, #1a0a04 35%, ${W.bg} 70%)`,
        }}
      />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div
        className="relative z-30 flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-3"
        style={{
          borderBottom: `1px solid ${W.borderWarm}40`,
          background: `${W.panelDark}cc`,
        }}
      >
        <motion.button
          onClick={() => setLocation("/")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 rounded px-3 py-2"
          style={{ background: W.panelMid, border: `1px solid ${W.borderWarm}60` }}
        >
          <ArrowLeft size={16} style={{ color: W.gold }} />
          <span className="font-western text-sm" style={{ color: W.cream }}>
            Back
          </span>
        </motion.button>

        <motion.h1
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-western text-2xl tracking-wider"
          style={{ color: W.goldBright }}
        >
          General Store
        </motion.h1>

        {/* Coin balance */}
        <div
          className="flex items-center gap-2 rounded px-3 py-2"
          style={{
            background: `${W.panelDark}dd`,
            border: `1px solid ${W.borderGold}60`,
          }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(160deg, ${W.goldBright}, ${W.gold} 60%, #7a4e10)`,
              border: `2px solid ${W.goldPale}50`,
            }}
          >
            <span className="font-black text-[10px] leading-none" style={{ color: W.bg }}>
              $
            </span>
          </div>
          <span className="font-western text-base leading-none" style={{ color: W.cream }}>
            {coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 min-h-0">

        {/* Left sidebar — type categories */}
        <div
          className="flex-shrink-0 flex flex-col py-3 px-2 gap-1.5 overflow-y-auto"
          style={{
            width: 88,
            borderRight: `1px solid ${W.borderWarm}30`,
            background: `${W.panelDark}80`,
          }}
        >
          {/* All */}
          <SidebarTab
            active={activeType === null}
            onClick={() => setActiveType(null)}
            icon={<ShoppingCart size={22} />}
            label="All"
          />

          {types.length > 0 && (
            <div className="h-px mx-2 my-1" style={{ background: W.borderDim }} />
          )}

          {types.map((type) => (
            <SidebarTab
              key={type.id}
              active={activeType === type.id}
              onClick={() => setActiveType(type.id)}
              icon={typeIcon(type.name)}
              label={type.name.length > 8 ? type.name.slice(0, 7) + "…" : type.name}
            />
          ))}
        </div>

        {/* Main grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <span style={{ fontSize: 52, lineHeight: 1 }}>🏪</span>
              <p className="font-western text-xl" style={{ color: W.goldBright }}>
                Step right up, partner
              </p>
              <p className="text-sm font-mono" style={{ color: W.creamMuted }}>
                Sign in to browse the wares
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                  style={{
                    borderColor: `${W.gold} transparent ${W.gold} ${W.gold}`,
                  }}
                />
                <span className="font-western text-sm" style={{ color: W.creamMuted }}>
                  Loading wares…
                </span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Package size={48} style={{ color: W.borderWarm }} />
              <p className="font-western text-lg" style={{ color: W.creamMuted }}>
                Nothing in stock
              </p>
            </div>
          ) : (
            <motion.div
              layout
              className="grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}
            >
              {filtered.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  ownedQty={ownedQty(item.id)}
                  onBuy={() => handlePurchase(item)}
                  isPurchasing={purchase.isPending}
                  canAfford={coins >= item.price}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  const W_local = {
    rust:      "#8b3d1f",
    rustDim:   "#5c2810",
    borderGold:"#a07030",
    goldBright:"#d4a853",
    creamMuted:"#b89a72",
    panelDark: "#130a04",
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-lg p-2.5 transition-all w-full"
      style={{
        background: active
          ? `linear-gradient(160deg, ${W_local.rust}50, ${W_local.rustDim}30)`
          : "transparent",
        border: `1px solid ${active ? W_local.borderGold + "80" : "transparent"}`,
      }}
    >
      <span style={{ color: active ? W_local.goldBright : W_local.creamMuted }}>{icon}</span>
      <span
        className="text-[10px] font-mono leading-none text-center"
        style={{ color: active ? W_local.goldBright : W_local.creamMuted }}
      >
        {label}
      </span>
    </button>
  );
}
