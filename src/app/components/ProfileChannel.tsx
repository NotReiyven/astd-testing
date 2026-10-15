import React, { useState, useEffect, useMemo, memo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  GiCharacter,
  GiSpikedHalo,
  GiChatBubble,
  GiChest,
  GiMegaphone,
  GiTornado,
  GiGamepad,
  GiHourglass,
} from "react-icons/gi";
import {
  useProfileStore,
  UserProfileData,
  BannerStyleType,
  TradingStanceType,
  getBannerCssStyle,
  getJoinNumber,
  getEarlyUserRole,
} from "../../store/useProfileStore";
import { ProfileCustomizerModal } from "./Profile/ProfileCustomizerModal";
import { CustomColorPicker } from "./ui/CustomColorPicker";
import { useAuthStore, UserProfile } from "../../store/useAuthStore";
import { useTradingAdsStore, TradingAd } from "../../store/useTradingAdsStore";
import { useInventoryStore } from "../../store/useInventoryStore";
import {
  useTradeStore,
  DEFAULT_ANALYZER_SETTINGS,
} from "../../store/useTradeStore";
import { useHistoryModalStore } from "../../store/useHistoryModalStore";
import { useToastStore } from "../../store/useToastStore";
import { getUnitAssetUrl, triggerHaptic } from "../../data/helpers";
import {
  useLayoutStore,
  ThemeMode,
  BootChannel,
} from "../../store/useLayoutStore";
import { useUnits } from "../../context/UnitContext";
import { getUnitConservativeValue } from "./InventoryChannel/inventoryUtils";
import { GRID_STATUS_CFG, TIER_CONFIG, getTier, getObtainability } from "../../data";
import { StatusIcon } from "./shared/Formatters";
import { TradeCard, MasterUnit } from "../../types";
import { safeOpenExternal } from "../../store/useExternalLinkStore";
import { UnitAvatar } from "./shared/UnitAvatar";
import { UserAvatar } from "./shared/UserAvatar";
import {
  STATUS_COLORS,
  useEffectiveStatus,
  useStatusPreference,
} from "../../hooks/usePresence";

/* -------------------------------------------------------------------------- */
/* Custom Inline SVG Icons (Zero Lucide Dependencies)                         */
/* -------------------------------------------------------------------------- */

const IconCheck = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
  </svg>
);

const IconClose = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M4 4L12 12M12 4L4 12" />
  </svg>
);

const IconEdit = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11.5 2.5L13.5 4.5L5.5 12.5H3.5V10.5L11.5 2.5Z" />
  </svg>
);

const IconCopy = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M3 10.5V3.5C3 2.95 3.45 2.5 4 2.5H10.5" />
  </svg>
);

const IconShare = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="3.5" r="2" />
    <circle cx="4" cy="8" r="2" />
    <circle cx="12" cy="12.5" r="2" />
    <path d="M5.8 7L10.2 4.5M5.8 9L10.2 11.5" />
  </svg>
);

const IconTrash = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.5 4.5H13.5M6 4.5V3C6 2.45 6.45 2 7 2H9C9.55 2 10 2.45 10 3V4.5M4 4.5L4.7 13C4.75 13.55 5.2 14 5.75 14H10.25C10.8 14 11.25 13.55 11.3 13L12 4.5" />
  </svg>
);

const IconLock = ({
  locked,
  className = "w-3.5 h-3.5",
}: {
  locked: boolean;
  className?: string;
}) =>
  locked ? (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="7.5" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7.5V5C5.5 3.62 6.62 2.5 8 2.5C9.38 2.5 10.5 3.62 10.5 5V7.5" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8H14M8 2C9.7 3.8 10.5 5.8 10.5 8C10.5 10.2 9.7 12.2 8 14C6.3 12.2 5.5 10.2 5.5 8C5.5 5.8 6.3 3.8 8 2Z" />
    </svg>
  );

const IconSwap = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 5.5H13L10 2.5M13 10.5H3L6 13.5" />
  </svg>
);

const IconSliders = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
  >
    <path d="M2.5 4.5H13.5M2.5 8H13.5M2.5 11.5H13.5" />
    <circle cx="5.5" cy="4.5" r="1.5" fill="var(--card)" />
    <circle cx="10.5" cy="8" r="1.5" fill="var(--card)" />
    <circle cx="6.5" cy="11.5" r="1.5" fill="var(--card)" />
  </svg>
);

const IconArrowLeft = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.5 8H3.5M7 4.5L3.5 8L7 11.5" />
  </svg>
);

const IconArrowRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 8H12.5M9 4.5L12.5 8L9 11.5" />
  </svg>
);

const IconRefresh = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13.5 3.5V7H10" />
    <path d="M13.1 10C12.3 12.1 10.3 13.5 8 13.5C5 13.5 2.5 11 2.5 8C2.5 5 5 2.5 8 2.5C10.1 2.5 11.9 3.6 12.8 5.3L13.5 7" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/* Configuration Constants                                                    */
/* -------------------------------------------------------------------------- */

const BANNER_SWATCHES = [
  { label: "Midnight", hex: "#121214" },
  { label: "Discord Blurple", hex: "#5865F2" },
  { label: "Royal Violet", hex: "#6D28D9" },
  { label: "Crimson", hex: "#B91C1C" },
  { label: "Emerald", hex: "#15803D" },
  { label: "Oceanic", hex: "#0369A1" },
  { label: "Solar Gold", hex: "#B45309" },
  { label: "Cyber Rose", hex: "#BE185D" },
];

const ACCENT_SWATCHES = [
  { label: "Blurple", hex: "#7289da" },
  { label: "Amethyst", hex: "#a855f7" },
  { label: "Emerald", hex: "#23a559" },
  { label: "Gold", hex: "#FAA61A" },
  { label: "Crimson", hex: "#ef4444" },
  { label: "Cyan", hex: "#38bdf8" },
];

const BANNER_STYLES: { id: BannerStyleType; label: string }[] = [
  { id: "gradient", label: "Smooth Gradient" },
  { id: "grid", label: "Tactical Grid" },
  { id: "stripes", label: "Diagonal Stripes" },
  { id: "dots", label: "Starfield Dots" },
  { id: "carbon", label: "Carbon Fiber" },
  { id: "mesh", label: "Geometric Mesh" },
  { id: "waves", label: "Digital Waves" },
  { id: "circuit", label: "Circuit Board" },
  { id: "aurora", label: "Aurora Glow" },
  { id: "solid", label: "Flat Solid" },
];

const TRADING_STANCES: {
  id: TradingStanceType;
  label: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    id: "open",
    label: "Open to Offers",
    desc: "Actively accepting all fair trade offers",
    color: "#4ade80",
    bg: "#122317",
    border: "#23a559",
  },
  {
    id: "upgrading",
    label: "Upgrading Only",
    desc: "Trading multiple units up into higher tiers",
    color: "#fbbf24",
    bg: "#281b0a",
    border: "#f59e0b",
  },
  {
    id: "downgrading",
    label: "Downgrading",
    desc: "Breaking down high-tier units for adds",
    color: "#7dd3fc",
    bg: "#0c1d2e",
    border: "#38bdf8",
  },
  {
    id: "wishlist",
    label: "Hunting Wishlist",
    desc: "Primarily looking for Target Wishlist units",
    color: "#d8b4fe",
    bg: "#211133",
    border: "#c084fc",
  },
  {
    id: "afk",
    label: "AFK / Break",
    desc: "Slow responses or temporarily away",
    color: "#cbd5e1",
    bg: "#1c1f24",
    border: "#64748b",
  },
];

const PRESENCE_OPTIONS: {
  id: UserProfile["status"];
  label: string;
  desc: string;
  color: string;
}[] = [
  {
    id: "online",
    label: "Online",
    desc: "Visible as active on the trading board",
    color: "#23a559",
  },
  {
    id: "dnd",
    label: "Do Not Disturb",
    desc: "Signals that you prefer fewer pings",
    color: "#ef4444",
  },
  {
    id: "invisible",
    label: "Invisible",
    desc: "Appear offline to other traders",
    color: "#888888",
  },
];

const getRoleConfig = (role: string) => {
  switch (role) {
    case "master":
    case "admin":
      return {
        color: "#fbbf24",
        bg: "#2b1f0b",
        border: "#f59e0b",
        label: role === "master" ? "Master" : "Admin",
      };
    case "mod":
      return {
        color: "#8ea1e1",
        bg: "#161a33",
        border: "#5865F2",
        label: "Moderator",
      };
    default:
      return {
        color: "#cbd5e1",
        bg: "#1e1f22",
        border: "#35373c",
        label: "Trader",
      };
  }
};

const getReputationRank = (rep: number) => {
  if (rep < 0)
    return {
      label: "Exiled",
      color: "#f87171",
      border: "#ef4444",
      bg: "#241215",
      next: 0,
      min: -100,
    };
  if (rep < 10)
    return {
      label: "Unranked",
      color: "#94a3b8",
      border: "#3f4147",
      bg: "#1e1f22",
      next: 10,
      min: 0,
    };
  if (rep < 50)
    return {
      label: "Apprentice",
      color: "#fbbf24",
      border: "#b45309",
      bg: "#281b0a",
      next: 50,
      min: 10,
    };
  if (rep < 150)
    return {
      label: "Recognized",
      color: "#cbd5e1",
      border: "#475569",
      bg: "#1e293b",
      next: 150,
      min: 50,
    };
  if (rep < 300)
    return {
      label: "Trusted Merchant",
      color: "#facc15",
      border: "#ca8a04",
      bg: "#2a220a",
      next: 300,
      min: 150,
    };
  if (rep < 500)
    return {
      label: "Elite Broker",
      color: "#38bdf8",
      border: "#0284c7",
      bg: "#0c2238",
      next: 500,
      min: 300,
    };
  if (rep < 1000)
    return {
      label: "Vanguard",
      color: "#60a5fa",
      border: "#2563eb",
      bg: "#111d38",
      next: 1000,
      min: 500,
    };
  return {
    label: "Legend",
    color: "#c084fc",
    border: "#9333ea",
    bg: "#261338",
    next: 1000,
    min: 1000,
  };
};

function formatTimeAgo(dateStr: string): string {
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatRemainingTime(expiresStr: string): string | null {
  const exp = new Date(expiresStr).getTime();
  const diffMs = exp - Date.now();
  if (Number.isNaN(exp) || diffMs <= 0) return null;
  const hrs = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hrs > 0) return `${hrs}h ${mins}m left`;
  return `${Math.max(1, mins)}m left`;
}

/* -------------------------------------------------------------------------- */
/* Ad History Unit Tile (Clickable to open Market History Modal)              */
/* -------------------------------------------------------------------------- */

const AdItemTile = memo(
  ({
    item,
    ALL_UNITS,
    onInspectUnit,
  }: {
    item: TradeCard;
    ALL_UNITS: MasterUnit[];
    onInspectUnit: (unitId: string) => void;
  }) => {
    const master = ALL_UNITS.find((u) => u.id === item.id);
    const conservativeVal = master
      ? getUnitConservativeValue(master) * item.qty
      : item.value * item.qty;
    const tierKey = master ? getTier(master) : "Untiered";
    const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "var(--border)";

    return (
      <button
        type="button"
        onClick={() => onInspectUnit(item.id)}
        title={`Inspect ${master?.name || item.name} market history`}
        className="w-full flex items-center gap-2.5 p-2 rounded-[6px] bg-popover hover:bg-muted/80 border border-border hover:border-foreground/40 transition-colors text-left cursor-pointer group min-w-0 overflow-hidden"
      >
        <div
          className="relative w-11 h-11 rounded-[5px] bg-muted border flex items-center justify-center overflow-hidden shrink-0"
          style={{ borderColor: tierColor }}
        >
          <UnitAvatar
            unitId={item.id}
            unitName={item.name}
            imageUrl={master?.imageUrl}
            fallbackClassName="absolute inset-0 flex items-center justify-center text-white text-[11px] z-0"
            imageClassName="absolute inset-0 w-full h-full object-cover z-10 bg-muted group-hover:scale-105 transition-transform"
          />
          {item.qty > 1 && (
            <div className="absolute bottom-0 right-0 bg-black/85 text-white text-[10px] px-1 py-0.5 rounded-tl-[4px] z-20 leading-none font-mono">
              x{item.qty}
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
          <span className="text-[12.5px] text-foreground truncate leading-snug">
            {master?.name || item.name}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground mt-0.5 whitespace-nowrap">
            <span style={{ color: tierColor }}>T-{tierKey}</span>
            <span>·</span>
            <span className="text-foreground truncate">
              {master?.value === "owner"
                ? "O/C"
                : conservativeVal.toLocaleString()}
            </span>
          </div>
        </div>
      </button>
    );
  }
);

function AdItemGrid({
  items,
  ALL_UNITS,
  label,
  labelColor,
  onInspectUnit,
}: {
  items: TradeCard[];
  ALL_UNITS: MasterUnit[];
  label: string;
  labelColor: string;
  onInspectUnit: (unitId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      <span className="text-[11.5px] tracking-wide" style={{ color: labelColor }}>
        {label} ({items.reduce((acc, i) => acc + i.qty, 0)})
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item, idx) => (
          <AdItemTile
            key={`${item.id}-${idx}`}
            item={item}
            ALL_UNITS={ALL_UNITS}
            onInspectUnit={onInspectUnit}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton Loading Components (Zero Layout Shift)                            */
/* -------------------------------------------------------------------------- */

function AdHistorySkeletonList({ count = 2 }: { count?: number }) {
  return (
    <div
      className="flex flex-col gap-4"
      role="status"
      aria-label="Loading ad history"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4 animate-pulse"
        >
          {/* Top Metadata & Action Bar Skeleton */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 rounded-[4px] bg-muted" />
              <div className="h-5 w-24 rounded-[4px] bg-popover border border-border" />
              <div className="h-4 w-36 rounded-[4px] bg-muted/70" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-24 rounded-[5px] bg-popover border border-border" />
              <div className="h-7 w-20 rounded-[5px] bg-popover border border-border" />
              <div className="h-7 w-7 rounded-[5px] bg-popover border border-border" />
            </div>
          </div>

          {/* Offering & Requesting Unit Tiles Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr] gap-4 items-start">
            <div className="flex flex-col gap-2">
              <div className="h-3.5 w-24 rounded bg-muted/70" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[0, 1].map((tileIdx) => (
                  <div
                    key={tileIdx}
                    className="flex items-center gap-2.5 p-2 rounded-[6px] bg-popover border border-border"
                  >
                    <div className="w-11 h-11 rounded-[5px] bg-muted shrink-0" />
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="h-3.5 w-24 rounded bg-muted" />
                      <div className="h-3 w-16 rounded bg-muted/70" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden xl:flex items-center justify-center self-center w-8 h-8 rounded-[6px] bg-popover border border-border" />

            <div className="flex flex-col gap-2">
              <div className="h-3.5 w-24 rounded bg-muted/70" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[0, 1].map((tileIdx) => (
                  <div
                    key={tileIdx}
                    className="flex items-center gap-2.5 p-2 rounded-[6px] bg-popover border border-border"
                  >
                    <div className="w-11 h-11 rounded-[5px] bg-muted shrink-0" />
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="h-3.5 w-24 rounded bg-muted" />
                      <div className="h-3 w-16 rounded bg-muted/70" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WishlistGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5"
      role="status"
      aria-label="Loading target wishlist"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card border border-border rounded-[8px] p-3.5 flex flex-col justify-between gap-3 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-[6px] bg-muted border border-border shrink-0" />
            <div className="flex flex-col flex-1 gap-1.5 min-w-0">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted/70" />
              <div className="flex items-center gap-2 mt-1">
                <div className="h-4 w-16 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted/70" />
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-border/70 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="h-6 rounded-[5px] bg-popover border border-border/70" />
              <div className="h-6 rounded-[5px] bg-popover border border-border/70" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-7 rounded-[5px] bg-popover border border-border" />
              <div className="h-7 rounded-[5px] bg-primary/10 border border-primary/25" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileChannelSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div
      className="flex-1 w-full h-full font-sans relative overflow-y-auto custom-scrollbar pb-16 z-10 bg-background"
      role="status"
      aria-label="Loading trader profile"
    >
      {/* Banner & Identity Header Skeleton */}
      <div className="w-full relative shrink-0 border-b border-border bg-card">
        <div
          className={`w-full relative overflow-hidden border-b border-border bg-muted/50 animate-pulse ${
            compact ? "h-[96px] md:h-[116px]" : "h-[136px] md:h-[168px]"
          }`}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-5 relative z-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-10 md:-mt-12">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
              <div className="w-[84px] h-[84px] md:w-[96px] md:h-[96px] rounded-[10px] border-4 border-card bg-muted animate-pulse shrink-0 shadow-xl" />

              <div className="flex flex-col gap-2 pb-0.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="h-7 w-40 rounded-[6px] bg-muted animate-pulse" />
                  <div className="h-5 w-20 rounded-[5px] bg-muted/80 animate-pulse" />
                  <div className="h-5 w-28 rounded-[5px] bg-muted/80 animate-pulse" />
                  <div className="h-5 w-28 rounded-[5px] bg-muted/80 animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-56 rounded-[4px] bg-muted/60 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-9 w-32 rounded-[6px] bg-popover border border-border animate-pulse" />
              <div className="h-9 w-36 rounded-[6px] bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          {/* Left Sidebar Skeleton */}
          <aside className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4 shadow-sm animate-pulse">
              <div className="grid grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-popover border border-border rounded-[6px] p-3 flex flex-col gap-1.5"
                  >
                    <div className="h-3 w-20 rounded bg-muted/70" />
                    <div className="h-5 w-16 rounded bg-muted" />
                    <div className="h-2.5 w-14 rounded bg-muted/60" />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <div className="flex justify-between">
                  <div className="h-3 w-24 rounded bg-muted/70" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
                <div className="w-full h-2 rounded-full bg-popover border border-border/60" />
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <div className="h-3 w-16 rounded bg-muted/70" />
                <div className="h-3.5 w-full rounded bg-muted" />
                <div className="h-3.5 w-3/4 rounded bg-muted/80" />
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <div className="h-3 w-28 rounded bg-muted/70" />
                <div className="h-9 w-full rounded-[6px] bg-popover border border-border" />
                <div className="h-9 w-full rounded-[6px] bg-popover border border-border" />
              </div>

              <div className="h-10 w-full rounded-[6px] bg-popover border border-border" />
            </div>
          </aside>

          {/* Right Workspace Skeleton */}
          <div className="flex-1 flex flex-col min-w-0 gap-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="h-9 w-36 rounded-[6px] bg-card border border-border animate-pulse" />
              <div className="h-9 w-40 rounded-[6px] bg-card/50 border border-border/50 animate-pulse" />
              <div className="h-9 w-44 rounded-[6px] bg-card/50 border border-border/50 animate-pulse" />
            </div>

            <div className="bg-card border border-border rounded-[8px] p-4 flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="h-7 w-24 rounded-[5px] bg-muted" />
                <div className="h-7 w-20 rounded-[5px] bg-popover border border-border" />
                <div className="h-7 w-24 rounded-[5px] bg-popover border border-border" />
              </div>
              <div className="h-7 w-36 rounded-[6px] bg-popover border border-border" />
            </div>

            <AdHistorySkeletonList count={2} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main ProfileChannel Component                                              */
/* -------------------------------------------------------------------------- */

export function ProfileChannel() {
  const {
    viewingProfileId,
    fetchProfile,
    saveProfileUpdates,
    returnChannel,
    setViewingProfile,
  } = useProfileStore();
  const {
    session,
    profile: currentUser,
    isLoading: isAuthLoading,
    loginWithDiscord,
    updateStatus,
  } = useAuthStore();
  const setViewingUser = useInventoryStore((s) => s.setViewingUser);
  const {
    theme,
    setTheme,
    globalCompactMode,
    setGlobalCompactMode,
    bootChannel,
    setBootChannel,
  } = useLayoutStore();

  const {
    analyzerSettings,
    updateAnalyzerSettings,
    addCard,
    overwrite,
  } = useTradeStore();

  const openHistoryModal = useHistoryModalStore((s) => s.openModal);

  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const [searchParams] = useSearchParams();
  const queryUserId =
    searchParams.get("u") ||
    searchParams.get("id") ||
    searchParams.get("userId");

  const targetId =
    routeUserId ||
    queryUserId ||
    viewingProfileId ||
    currentUser?.id ||
    session?.user?.id;
  const isOwner = Boolean(
    (currentUser?.id && currentUser.id === targetId) ||
      (session?.user?.id && session.user.id === targetId)
  );

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const effectiveStatus = useEffectiveStatus(targetId, profileData?.status, {
    includeInvisibleForSelf: isOwner,
  });
  const ownerStatusPreference = useStatusPreference();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"board" | "wishlist" | "settings">(
    "board"
  );
  const [joinNumber, setJoinNumber] = useState<number | null>(null);
  const [adFilter, setAdFilter] = useState<
    "all" | "live" | "expired" | "private"
  >("all");
  const [confirmDeleteAdId, setConfirmDeleteAdId] = useState<string | null>(
    null
  );
  const [repostingAdId, setRepostingAdId] = useState<string | null>(null);

  // Wishlist quick-add search state (for owner)
  const [wishlistSearch, setWishlistSearch] = useState("");

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [copiedDiscordId, setCopiedDiscordId] = useState(false);
  const [copiedRoblox, setCopiedRoblox] = useState(false);

  const {
    userAdHistory,
    isLoadingHistory,
    fetchUserAdHistory,
    deleteAd,
    repostAd,
  } = useTradingAdsStore();
  const {
    fetchWishlist,
    viewedWishlist,
    wishlistItems,
    viewedItems,
    items: ownInventoryItems,
    isLoading: isInventoryLoading,
    fetchInventory,
    toggleWishlist,
  } = useInventoryStore();
  const { units: ALL_UNITS } = useUnits();

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (!targetId) return;
      setIsLoading(true);

      const data = await fetchProfile(targetId, true);
      if (mounted && data) {
        setProfileData(data);

        const ownerMatch = Boolean(
          currentUser?.id && currentUser.id === targetId
        );

        const [joinNum] = await Promise.all([
          data.created_at
            ? getJoinNumber(data.created_at)
            : Promise.resolve(null),
          fetchUserAdHistory(targetId, {
            isOwner: ownerMatch,
            adHistoryPublic: data.ad_history_public ?? true,
            privateAdIds: data.private_ad_ids ?? [],
          }),
          fetchInventory(targetId, !ownerMatch),
          fetchWishlist(targetId, !ownerMatch),
        ]);

        if (mounted) {
          setJoinNumber(joinNum ?? data.join_number ?? null);
        }
      }
      if (mounted) setIsLoading(false);
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [
    targetId,
    currentUser?.id,
    fetchProfile,
    fetchUserAdHistory,
    fetchInventory,
    fetchWishlist,
  ]);

  const activeVaultItems = isOwner ? ownInventoryItems : viewedItems;
  const activeWishlistItems = isOwner ? wishlistItems : viewedWishlist;

  const handleCloseProfile = () => {
    triggerHaptic("light");
    const target = returnChannel || "trading-ads";
    window.document.dispatchEvent(
      new CustomEvent("navigate", { detail: target })
    );
    setTimeout(() => setViewingProfile(null), 150);
  };

  const formatChannelName = (id: string) =>
    id
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const openEditModal = () => {
    if (!profileData || !isOwner) return;
    triggerHaptic("light");
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (updates: Partial<UserProfileData>) => {
    if (!isOwner || !targetId) return;
    setIsSaving(true);
    triggerHaptic("medium");

    const { error } = await saveProfileUpdates(targetId, updates);
    if (!error) {
      setProfileData((prev) => (prev ? { ...prev, ...updates } : null));
      setIsEditModalOpen(false);
      triggerHaptic("success");
      useToastStore
        .getState()
        .addToast("Profile customization saved!", "success");
    } else {
      useToastStore
        .getState()
        .addToast(
          "Could not save profile—check your connection and try again.",
          "error"
        );
    }
    setIsSaving(false);
  };

  const handleToggleProfilePrivacy = async (
    field: "ad_history_public" | "wishlist_public" | "hide_discord_id"
  ) => {
    if (!isOwner || !targetId || !profileData) return;
    triggerHaptic("light");

    const currentVal =
      field === "hide_discord_id"
        ? Boolean(profileData.hide_discord_id)
        : profileData[field] ?? true;
    const nextVal = !currentVal;

    const optimistic = { ...profileData, [field]: nextVal };
    setProfileData(optimistic);

    const { error } = await saveProfileUpdates(targetId, { [field]: nextVal });
    if (error) {
      setProfileData(profileData);
      useToastStore
        .getState()
        .addToast("Failed to update privacy setting.", "error");
    } else {
      useToastStore
        .getState()
        .addToast("Privacy preference updated.", "success");
    }
  };

  const handleToggleSingleAdPrivacy = async (adId: string) => {
    if (!isOwner || !targetId || !profileData) return;
    triggerHaptic("light");

    const currentHidden = profileData.private_ad_ids || [];
    const isCurrentlyPrivate = currentHidden.includes(adId);
    const nextHidden = isCurrentlyPrivate
      ? currentHidden.filter((id) => id !== adId)
      : [...currentHidden, adId];

    setProfileData({ ...profileData, private_ad_ids: nextHidden });
    const { error } = await saveProfileUpdates(targetId, {
      private_ad_ids: nextHidden,
    });
    if (error) {
      setProfileData(profileData);
      useToastStore
        .getState()
        .addToast("Failed to update ad visibility.", "error");
    } else {
      useToastStore
        .getState()
        .addToast(
          isCurrentlyPrivate
            ? "Ad is now visible on your public profile."
            : "Ad hidden from visitors (Private).",
          "info"
        );
    }
  };

  const handleDeleteAdFromHistory = async (adId: string) => {
    if (!isOwner) return;
    triggerHaptic("heavy");
    const ok = await deleteAd(adId);
    setConfirmDeleteAdId(null);
    if (ok) {
      useToastStore
        .getState()
        .addToast("Trade ad permanently deleted.", "success");
    }
  };

  const handleRepostAd = async (ad: TradingAd) => {
    if (!isOwner) return;
    setRepostingAdId(ad.id);
    triggerHaptic("medium");
    await repostAd(ad);
    setRepostingAdId(null);
  };

  const handleLoadAdIntoCalculator = (ad: TradingAd) => {
    triggerHaptic("medium");
    overwrite(ad.give_items, ad.get_items);
    useToastStore
      .getState()
      .addToast("Loaded trade items into the Trade Analyzer!", "success");
  };

  const handleContact = () => {
    if (!profileData?.discord_id) return;
    triggerHaptic("medium");
    navigator.clipboard.writeText(
      `Hey! Saw your profile on ASTD Value List. Are you around to trade?`
    );
    safeOpenExternal(`https://discord.com/users/${profileData.discord_id}`);
  };

  const handleInspectVault = () => {
    if (!targetId || !profileData) return;
    triggerHaptic("medium");
    if (isOwner) {
      setViewingUser(null);
    } else {
      setViewingUser(targetId, profileData.username, "profile");
    }
    window.document.dispatchEvent(
      new CustomEvent("navigate", { detail: "inventory" })
    );
  };

  const handleCopyProfileLink = () => {
    triggerHaptic("light");
    const identifier = profileData?.discord_id || targetId || profileData?.username;
    const uniqueUrl = identifier
      ? `${window.location.origin}/profile/${identifier}`
      : window.location.href;
    navigator.clipboard.writeText(uniqueUrl);
    setCopiedProfileLink(true);
    useToastStore.getState().addToast("Profile link copied!", "success");
    setTimeout(() => setCopiedProfileLink(false), 2000);
  };

  const handleCopyDiscordId = () => {
    if (!profileData?.discord_id) return;
    triggerHaptic("light");
    navigator.clipboard.writeText(profileData.discord_id);
    setCopiedDiscordId(true);
    setTimeout(() => setCopiedDiscordId(false), 2000);
  };

  const handleCopyRoblox = () => {
    if (!profileData?.roblox_username) return;
    triggerHaptic("light");
    navigator.clipboard.writeText(profileData.roblox_username);
    setCopiedRoblox(true);
    setTimeout(() => setCopiedRoblox(false), 2000);
  };

  // Filtered units for quick wishlist addition
  const wishlistSearchResults = useMemo(() => {
    const q = wishlistSearch.trim().toLowerCase();
    if (!q) return [];
    const existingSet = new Set(activeWishlistItems.map((w) => w.unit_id));
    return ALL_UNITS.filter(
      (u) =>
        !existingSet.has(u.id) &&
        (u.name.toLowerCase().includes(q) ||
          (u.subtitle && u.subtitle.toLowerCase().includes(q)))
    ).slice(0, 6);
  }, [wishlistSearch, ALL_UNITS, activeWishlistItems]);


  if (isAuthLoading && !targetId) {
    return <ProfileChannelSkeleton compact={globalCompactMode} />;
  }

  // UNAUTHENTICATED LOCAL PREFERENCES FALLBACK
  if (!targetId) {
    return (
      <div className="flex-1 w-full h-full font-sans overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-10 bg-background flex flex-col items-center">
        <div className="max-w-3xl w-full flex flex-col gap-5 pb-12">
          {/* Sign-In Header Banner */}
          <div className="bg-card border border-border rounded-[8px] p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col text-center sm:text-left gap-1">
              <h2 className="text-[18px] text-foreground">
                Trader Profile & Preferences
              </h2>
              <p className="text-[12.5px] text-muted-foreground">
                Local settings apply immediately to this browser. Sign in with
                Discord to unlock your custom profile banner, Ad History, and
                cloud Target Wishlist.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                loginWithDiscord();
              }}
              className="px-4 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12.5px] rounded-[6px] flex items-center gap-2 transition-colors shrink-0 shadow-sm cursor-pointer focus-visible:outline-none"
            >
              <GiCharacter className="w-4 h-4" /> Sign In with Discord
            </button>
          </div>

          {/* 1. Appearance & Layout Density */}
          <div className="bg-card border border-border rounded-[8px] p-5 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col gap-0.5 border-b border-border pb-3">
              <h3 className="text-[14px] text-foreground">
                Appearance & Layout Density
              </h3>
              <p className="text-[12px] text-muted-foreground">
                Choose the global color palette and card density across the
                value list and calculator.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "dark",
                  label: "Deep Dark",
                  desc: "High-contrast dark mode",
                  swatch: "#0a0a0a",
                },
                {
                  id: "discord",
                  label: "Discord Blurple",
                  desc: "Matches Discord slate UI",
                  swatch: "#313338",
                },
                {
                  id: "light",
                  label: "Crisp Light",
                  desc: "High-visibility light mode",
                  swatch: "#fafafa",
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setTheme(t.id as ThemeMode);
                  }}
                  className={`p-3.5 rounded-[6px] border text-left flex flex-col gap-1.5 focus-visible:outline-none cursor-pointer transition-colors ${
                    theme === t.id
                      ? "bg-popover border-primary ring-1 ring-primary/40"
                      : "bg-popover/40 border-border hover:bg-popover"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-foreground">
                      {t.label}
                    </span>
                    <span
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: t.swatch }}
                    />
                  </div>
                  <span className="text-[11.5px] text-muted-foreground">
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Global Compact Mode */}
            <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] text-foreground">
                  Global Compact Mode
                </span>
                <span className="text-[12px] text-muted-foreground">
                  Tightens padding and card spacing across the entire app to fit
                  more units on screen.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={globalCompactMode}
                aria-label="Toggle Global Compact Mode"
                onClick={() => {
                  triggerHaptic("medium");
                  setGlobalCompactMode(!globalCompactMode);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                  globalCompactMode
                    ? "bg-primary"
                    : "bg-muted border border-border"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                    globalCompactMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 2. Navigation & Trade Analyzer Defaults */}
          <div className="bg-card border border-border rounded-[8px] p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[14px] text-foreground">
                  Navigation & Trade Analyzer Defaults
                </h3>
                <p className="text-[12px] text-muted-foreground">
                  Configure your default startup channel and which panels appear
                  in the Trade Analyzer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  updateAnalyzerSettings(DEFAULT_ANALYZER_SETTINGS);
                  useToastStore
                    .getState()
                    .addToast("Trade Analyzer settings reset to defaults.", "info");
                }}
                className="px-2.5 py-1.5 rounded-[5px] bg-popover hover:bg-muted border border-border text-muted-foreground hover:text-foreground text-[11px] font-mono flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
              >
                <IconRefresh className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[12px] text-muted-foreground">
                Default Startup Channel
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  {
                    id: "last-used",
                    label: "Last Used",
                    desc: "Resume session",
                  },
                  {
                    id: "value-list",
                    label: "Value List",
                    desc: "Live tier grid",
                  },
                  {
                    id: "trading-ads",
                    label: "Trading Ads",
                    desc: "Community board",
                  },
                  {
                    id: "home",
                    label: "Home",
                    desc: "Update logs",
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setBootChannel(opt.id as BootChannel);
                    }}
                    className={`p-3 rounded-[6px] border text-left flex flex-col gap-0.5 cursor-pointer transition-colors ${
                      bootChannel === opt.id
                        ? "bg-popover border-primary"
                        : "bg-popover/40 border-border hover:bg-popover"
                    }`}
                  >
                    <span className="text-[12.5px] text-foreground">
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Trade Analyzer Panel & Metric Toggles */}
            <div className="pt-3 border-t border-border/70 flex flex-col gap-2">
              <span className="text-[12px] text-muted-foreground">
                Trade Analyzer Visible Sections & Metrics
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  [
                    {
                      key: "showSummaryMetrics",
                      label: "Forecast & Metrics Bar",
                      active: analyzerSettings?.showSummaryMetrics ?? true,
                    },
                    {
                      key: "showStFlip",
                      label: "ST Flip Indicator",
                      active: analyzerSettings?.showStFlip ?? true,
                    },
                    {
                      key: "showLtHold",
                      label: "LT Hold Indicator",
                      active: analyzerSettings?.showLtHold ?? true,
                    },
                    {
                      key: "showRarity",
                      label: "Rarity Comparison Metric",
                      active: analyzerSettings?.showRarity ?? true,
                    },
                    {
                      key: "showLiquidity",
                      label: "Liquidity Comparison Metric",
                      active: analyzerSettings?.showLiquidity ?? true,
                    },
                    {
                      key: "showMomentumSummary",
                      label: "Status Momentum Summary",
                      active: analyzerSettings?.showMomentumSummary ?? true,
                    },
                    {
                      key: "showTermsInTrade",
                      label: "Terms in This Trade",
                      active: analyzerSettings?.showTermsInTrade ?? true,
                    },
                    {
                      key: "showGiveNotices",
                      label: "You Give Unit Notices",
                      active: analyzerSettings?.showGiveNotices ?? true,
                    },
                    {
                      key: "showGetNotices",
                      label: "You Get Unit Notices",
                      active: analyzerSettings?.showGetNotices ?? true,
                    },
                    {
                      key: "collapseUnitsByDefault",
                      label: "Collapse Analyzer Units by Default",
                      active: analyzerSettings?.collapseUnitsByDefault ?? false,
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      updateAnalyzerSettings({
                        [item.key]: !item.active,
                      });
                    }}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-[6px] bg-popover border border-border hover:border-foreground/30 transition-colors cursor-pointer text-left"
                  >
                    <span className="text-[12.5px] text-foreground">
                      {item.label}
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[4px] border ${
                        item.active
                          ? "bg-[#122317] border-[#1f6f3e] text-[#34d399]"
                          : "bg-[#1e1f22] border-[#3f4147] text-[#94a3b8]"
                      }`}
                    >
                      {item.active ? "Shown" : "Hidden"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !profileData) {
    return <ProfileChannelSkeleton compact={globalCompactMode} />;
  }

  const safeRep = profileData.global_rep ?? 0;
  const repRank = getReputationRank(safeRep);
  const roleCfg = getRoleConfig(profileData.role);
  const accentColor = profileData.accent_color || "#7289da";
  const stanceCfg =
    TRADING_STANCES.find(
      (s) => s.id === (profileData.trading_stance || "open")
    ) || TRADING_STANCES[0];

  const privateAdSet = new Set(profileData.private_ad_ids || []);
  const nowMs = Date.now();

  const liveAdsCount = userAdHistory.filter(
    (a) => new Date(a.expires_at).getTime() > nowMs
  ).length;
  const expiredAdsCount = userAdHistory.filter(
    (a) => new Date(a.expires_at).getTime() <= nowMs
  ).length;
  const privateAdsCount = userAdHistory.filter((a) =>
    privateAdSet.has(a.id)
  ).length;

  const filteredAdHistory = userAdHistory.filter((ad) => {
    const isLive = new Date(ad.expires_at).getTime() > nowMs;
    const isPriv = privateAdSet.has(ad.id);
    if (adFilter === "live") return isLive;
    if (adFilter === "expired") return !isLive;
    if (adFilter === "private") return isPriv;
    return true;
  });

  const totalVaultValue = activeVaultItems.reduce((acc, i) => {
    const m = ALL_UNITS.find((u) => u.id === i.unit_id);
    return acc + (m ? getUnitConservativeValue(m) * i.quantity : 0);
  }, 0);

  const totalWishlistValue = activeWishlistItems.reduce((acc, i) => {
    const m = ALL_UNITS.find((u) => u.id === i.unit_id);
    return acc + (m ? getUnitConservativeValue(m) : 0);
  }, 0);

  const repProgressPct =
    safeRep >= 1000
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            ((safeRep - repRank.min) /
              Math.max(1, repRank.next - repRank.min)) *
              100
          )
        );

  const liveStatus = effectiveStatus;
  const statusDotColor = STATUS_COLORS[liveStatus];

  const isAdHistoryVisibleToVisitor =
    isOwner || (profileData.ad_history_public ?? true);
  const isWishlistVisibleToVisitor =
    isOwner || (profileData.wishlist_public ?? true);

  return (
    <div className="flex-1 w-full h-full font-sans relative overflow-y-auto custom-scrollbar pb-16 z-10 bg-background">
      {/* Return Bar when inspecting another user's profile */}
      {viewingProfileId && (
        <div className="w-full bg-popover border-b border-border px-4 py-2.5 flex items-center justify-between sticky top-0 z-50">
          <button
            type="button"
            onClick={handleCloseProfile}
            className="flex items-center gap-2 px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border rounded-[6px] text-[12px] transition-colors focus-visible:outline-none cursor-pointer"
          >
            <IconArrowLeft className="w-3.5 h-3.5" />
            <span>
              Back to{" "}
              {returnChannel ? formatChannelName(returnChannel) : "Trading Ads"}
            </span>
          </button>
          <span className="text-[12px] text-muted-foreground">
            Viewing <strong className="text-foreground">{profileData.username}</strong>’s Profile
          </span>
        </div>
      )}

      {/* Discord-Style Profile Banner & Identity Header */}
      <div className="w-full relative shrink-0 border-b border-border bg-card">
        {/* Customizable Banner Surface */}
        <div
          className={`w-full relative overflow-hidden border-b border-border transition-all ${
            globalCompactMode
              ? "h-[96px] md:h-[116px]"
              : "h-[136px] md:h-[168px]"
          }`}
          style={getBannerCssStyle(
            profileData.banner_color,
            accentColor,
            profileData.banner_style || "gradient",
            profileData.banner_image_url
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
          {/* Subtle top accent trim */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ backgroundColor: accentColor }}
          />
        </div>

        {/* Identity Row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-5 relative z-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-10 md:-mt-12">
            {/* Avatar + Name + Badges */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
              <div className="relative shrink-0 self-start">
                <UserAvatar
                  avatarUrl={profileData.avatar_url}
                  username={profileData.username}
                  discordId={profileData.discord_id}
                  className="w-[84px] h-[84px] md:w-[96px] md:h-[96px] rounded-[10px] border-4 border-card bg-muted shadow-xl"
                  alt={profileData.username}
                />
                {/* Presence Indicator Dot */}
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-card z-10"
                  style={{ backgroundColor: statusDotColor }}
                  title={`Status: ${liveStatus.toUpperCase()}`}
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-0 pb-0.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-[22px] sm:text-[26px] text-foreground leading-tight truncate">
                    {profileData.username}
                  </h1>

                  {/* Sequence Rank Badge */}
                  {typeof joinNumber === "number" && (
                    <span
                      className="inline-flex items-center text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[4px] bg-[#1e1f22] text-[#94a3b8] border border-[#3f4147] shrink-0 select-none shadow-xs"
                      title={`User #${joinNumber}`}
                    >
                      User #{joinNumber}
                    </span>
                  )}

                  {/* Early Community Role Badge (Founder, OG, Veteran) */}
                  {(() => {
                    const earlyRole = getEarlyUserRole(
                      joinNumber ?? profileData.join_number
                    );
                    if (!earlyRole) return null;
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] text-[11px] font-bold border shrink-0 select-none shadow-xs"
                        style={{
                          backgroundColor: earlyRole.bg,
                          color: earlyRole.color,
                          borderColor: earlyRole.border,
                        }}
                        title={earlyRole.tooltip}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: earlyRole.dotColor }}
                        />
                        {earlyRole.label}
                      </span>
                    );
                  })()}

                  {/* Unique Roblox-Style Trader ID Pill with 1-Click Copy */}
                  {targetId && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        navigator.clipboard.writeText(targetId);
                        useToastStore
                          .getState()
                          .addToast(`User ID copied: ${targetId}`, "info");
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[#1e1f22] text-[#94a3b8] hover:text-foreground border border-[#3f4147] hover:border-foreground/40 shrink-0 cursor-pointer transition-colors shadow-xs"
                      title={`Click to copy User ID: ${targetId}`}
                    >
                      <span>ID: {targetId.slice(0, 8)}…</span>
                      <IconCopy className="w-3 h-3 opacity-70" />
                    </button>
                  )}

                  {/* Role Pill */}
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] border text-[11.5px] font-semibold shadow-xs"
                    style={{
                      backgroundColor: roleCfg.bg,
                      color: roleCfg.color,
                      borderColor: roleCfg.border,
                    }}
                  >
                    <GiCharacter className="w-3.5 h-3.5" />
                    {roleCfg.label}
                  </span>

                  {/* Reputation Pill */}
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] border text-[11.5px] font-semibold shadow-xs"
                    style={{
                      backgroundColor: repRank.bg,
                      color: repRank.color,
                      borderColor: repRank.border,
                    }}
                  >
                    <GiSpikedHalo className="w-3.5 h-3.5" />
                    {repRank.label} ({safeRep > 0 ? `+${safeRep}` : safeRep})
                  </span>

                  {/* Trading Stance Pill */}
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] border text-[11.5px] font-semibold shadow-xs"
                    style={{
                      backgroundColor: stanceCfg.bg,
                      color: stanceCfg.color,
                      borderColor: stanceCfg.border,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: stanceCfg.color }}
                    />
                    {stanceCfg.label}
                  </span>
                </div>

                {/* Quick Presence Switcher for Owner */}
                {isOwner && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[11.5px] text-muted-foreground mr-1">
                      Presence:
                    </span>
                    {PRESENCE_OPTIONS.map((p) => {
                      const active = ownerStatusPreference === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            updateStatus(p.id);
                            setProfileData((prev) =>
                              prev ? { ...prev, status: p.id } : null
                            );
                          }}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] border transition-colors cursor-pointer ${
                            active
                              ? "bg-popover border-foreground/40 text-foreground"
                              : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-popover/50"
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyProfileLink}
                className="px-3.5 py-2 rounded-[6px] bg-popover hover:bg-muted border border-border text-foreground text-[12px] flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none"
              >
                {copiedProfileLink ? (
                  <>
                    <IconCheck className="w-3.5 h-3.5 text-[#23a559]" />
                    <span className="text-[#23a559]">Link Copied</span>
                  </>
                ) : (
                  <>
                    <IconShare className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Share Profile</span>
                  </>
                )}
              </button>

              {isOwner ? (
                <button
                  type="button"
                  onClick={openEditModal}
                  className="px-4 py-2 rounded-[6px] text-white text-[12px] flex items-center gap-2 transition-opacity hover:opacity-95 shadow-sm cursor-pointer focus-visible:outline-none"
                  style={{ backgroundColor: accentColor }}
                >
                  <IconEdit className="w-3.5 h-3.5" />
                  <span>Customize Profile</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleContact}
                  className="px-4 py-2 rounded-[6px] bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] flex items-center gap-2 transition-colors shadow-sm cursor-pointer focus-visible:outline-none"
                >
                  <GiChatBubble className="w-4 h-4" />
                  <span>Message on Discord</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          {/* LEFT SIDEBAR: Unified Trader Overview Card */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
            <div
              className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4 shadow-sm"
              style={{ borderTop: `2px solid ${accentColor}` }}
            >
              {/* Compact 2x2 Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-popover border border-border rounded-[6px] p-3 flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    Vault Net Worth
                  </span>
                  <span className="text-[16px] font-mono text-foreground truncate">
                    {totalVaultValue.toLocaleString()}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground font-mono">
                    {activeVaultItems.reduce((a, b) => a + b.quantity, 0)} units
                  </span>
                </div>

                <div className="bg-popover border border-border rounded-[6px] p-3 flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    Ad History
                  </span>
                  <span className="text-[16px] font-mono text-foreground">
                    {isAdHistoryVisibleToVisitor
                      ? userAdHistory.length
                      : "Private"}
                  </span>
                  <span className="text-[10.5px] text-[#23a559] font-mono">
                    {isAdHistoryVisibleToVisitor
                      ? `${liveAdsCount} live now`
                      : "Hidden"}
                  </span>
                </div>

                <div className="bg-popover border border-border rounded-[6px] p-3 flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    Target Wishlist
                  </span>
                  <span className="text-[16px] font-mono text-foreground truncate">
                    {isWishlistVisibleToVisitor
                      ? activeWishlistItems.length
                      : "Private"}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground font-mono truncate">
                    {isWishlistVisibleToVisitor
                      ? `${totalWishlistValue.toLocaleString()} val`
                      : "Hidden"}
                  </span>
                </div>

                <div className="bg-popover border border-border rounded-[6px] p-3 flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    Member Since
                  </span>
                  <span className="text-[15px] font-mono text-foreground">
                    {new Date(profileData.created_at).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                      }
                    )}
                  </span>
                  {typeof joinNumber === "number" ? (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      User #{joinNumber}
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-muted-foreground">
                      Verified Trader
                    </span>
                  )}
                </div>
              </div>

              {/* Reputation Progress Bar */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-muted-foreground">Reputation Rank</span>
                  <span className="font-mono" style={{ color: repRank.color }}>
                    {repRank.label} ({safeRep} / {repRank.next})
                  </span>
                </div>
                <div className="w-full h-2 bg-popover rounded-full overflow-hidden border border-border/60">
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${repProgressPct}%`,
                      backgroundColor: repRank.color,
                    }}
                  />
                </div>
              </div>

              {/* About Me */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
                <span className="text-[12px] text-muted-foreground">
                  About Me
                </span>
                {profileData.bio ? (
                  <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap break-words">
                    {profileData.bio}
                  </p>
                ) : (
                  <p className="text-[12.5px] text-muted-foreground italic">
                    No bio added yet.
                  </p>
                )}
              </div>

              {/* Connected Accounts (Discord & Roblox) */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <span className="text-[12px] text-muted-foreground">
                  Trader Identifiers
                </span>

                {/* Discord ID (Respects Privacy Flag) */}
                {!profileData.hide_discord_id || isOwner ? (
                  <div className="flex items-center justify-between gap-2 bg-popover px-3 py-2 rounded-[6px] border border-border min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                      <span className="text-[11.5px] text-muted-foreground">
                        Discord ID
                      </span>
                      {profileData.hide_discord_id && isOwner && (
                        <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-[4px] bg-[#281b0a] border border-[#b45309] text-[#fbbf24] leading-none">
                          Hidden
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyDiscordId}
                      className="flex items-center gap-1.5 text-[11.5px] font-mono text-foreground hover:text-primary transition-colors cursor-pointer min-w-0 overflow-hidden"
                      title={`Copy Discord ID (${profileData.discord_id})`}
                    >
                      <span className="truncate">{profileData.discord_id}</span>
                      {copiedDiscordId ? (
                        <IconCheck className="w-3.5 h-3.5 text-[#23a559] shrink-0" />
                      ) : (
                        <IconCopy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 bg-popover px-3 py-2 rounded-[6px] border border-border text-[11.5px] text-muted-foreground whitespace-nowrap">
                    <span>Discord ID</span>
                    <span className="flex items-center gap-1">
                      <IconLock locked className="w-3 h-3" /> Private
                    </span>
                  </div>
                )}

                {/* Roblox Username */}
                {profileData.roblox_username && (
                  <div className="flex items-center justify-between gap-2 bg-popover px-3 py-2 rounded-[6px] border border-border min-w-0 overflow-hidden">
                    <span className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                      <GiGamepad className="w-3.5 h-3.5 text-primary shrink-0" />
                      Roblox
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyRoblox}
                      className="flex items-center gap-1.5 text-[12px] font-mono text-foreground hover:text-primary transition-colors cursor-pointer min-w-0 overflow-hidden"
                      title={`Copy Roblox Username (${profileData.roblox_username})`}
                    >
                      <span className="truncate">
                        {profileData.roblox_username}
                      </span>
                      {copiedRoblox ? (
                        <IconCheck className="w-3.5 h-3.5 text-[#23a559] shrink-0" />
                      ) : (
                        <IconCopy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Vault Action Button */}
              <button
                type="button"
                onClick={handleInspectVault}
                className="w-full py-2.5 px-4 bg-popover hover:bg-muted text-foreground rounded-[6px] text-[12.5px] flex items-center justify-between border border-border transition-colors cursor-pointer group focus-visible:outline-none"
              >
                <span className="flex items-center gap-2">
                  <GiChest
                    className="w-4 h-4"
                    style={{ color: accentColor }}
                  />
                  <span>
                    {isOwner ? "Open My Inventory Vault" : "Inspect Public Vault"}
                  </span>
                </span>
                <IconArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </aside>

          {/* RIGHT MAIN WORKSPACE: Ad History, Target Wishlist, Preferences */}
          <div className="flex-1 flex flex-col min-w-0 gap-5">
            {/* Clean Tab Navigation (No Overflow Scrollbar Artifacts) */}
            <div
              className="flex bg-input rounded-[4px] p-1 border border-border shadow-inner w-full sm:w-auto overflow-x-auto hide-scrollbar shrink-0 mb-2"
              role="tablist"
              aria-label="Profile sections"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "board"}
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTab("board");
                }}
                className={`px-4 py-2 rounded-[3px] text-[13px] font-medium transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 flex items-center gap-2 cursor-pointer focus-visible:outline-none ${
                  activeTab === "board"
                    ? "bg-foreground text-background shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
                }`}
              >
                <GiMegaphone
                  className="w-4 h-4"
                  style={{
                    color: activeTab === "board" ? "inherit" : accentColor,
                  }}
                />
                <span>Ad History</span>
                {isAdHistoryVisibleToVisitor && (
                  <span
                    className={`px-2 py-0.5 rounded-[3px] text-[11px] font-mono ${
                      activeTab === "board"
                        ? "bg-background/20 text-background"
                        : "bg-popover border border-border"
                    }`}
                  >
                    {userAdHistory.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "wishlist"}
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTab("wishlist");
                }}
                className={`px-4 py-2 rounded-[3px] text-[13px] font-medium transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 flex items-center gap-2 cursor-pointer focus-visible:outline-none ${
                  activeTab === "wishlist"
                    ? "bg-foreground text-background shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
                }`}
              >
                <GiSpikedHalo
                  className="w-4 h-4"
                  style={{
                    color: activeTab === "wishlist" ? "inherit" : accentColor,
                  }}
                />
                <span>Target Wishlist</span>
                {isWishlistVisibleToVisitor && (
                  <span
                    className={`px-2 py-0.5 rounded-[3px] text-[11px] font-mono ${
                      activeTab === "wishlist"
                        ? "bg-background/20 text-background"
                        : "bg-popover border border-border"
                    }`}
                  >
                    {activeWishlistItems.length}
                  </span>
                )}
              </button>

              {isOwner && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "settings"}
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveTab("settings");
                  }}
                  className={`px-4 py-2 rounded-[3px] text-[13px] font-medium transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 flex items-center gap-2 cursor-pointer focus-visible:outline-none ${
                    activeTab === "settings"
                      ? "bg-foreground text-background shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
                  }`}
                >
                  <IconSliders className="w-4 h-4" />
                  <span>Preferences & Privacy</span>
                </button>
              )}
            </div>

            {/* ============================================================== */}
            {/* TAB 1: AD HISTORY (Public/Private + Delete + Repost + Load)    */}
            {/* ============================================================== */}
            {activeTab === "board" && (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Ad History Toolbar */}
                <div className="bg-card border border-border rounded-[8px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(
                      [
                        { id: "all", label: "All Posts", count: userAdHistory.length },
                        { id: "live", label: "Live", count: liveAdsCount },
                        { id: "expired", label: "Expired", count: expiredAdsCount },
                        ...(isOwner
                          ? [
                              {
                                id: "private",
                                label: "Private",
                                count: privateAdsCount,
                              },
                            ]
                          : []),
                      ] as const
                    ).map((f) => {
                      const active = adFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setAdFilter(f.id as any);
                          }}
                          className={`px-3 py-1.5 rounded-[5px] text-[12px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-popover text-muted-foreground hover:text-foreground border border-border"
                          }`}
                        >
                          <span>{f.label}</span>
                          <span className="font-mono text-[11px] opacity-80">
                            {f.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Owner Master Privacy Toggle for Ad History */}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleProfilePrivacy("ad_history_public")
                      }
                      className={`px-3 py-1.5 rounded-[6px] border text-[12px] font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                        profileData.ad_history_public ?? true
                          ? "bg-[#122317] border-[#1f6f3e] text-[#34d399]"
                          : "bg-[#281b0a] border-[#b45309] text-[#fbbf24]"
                      }`}
                      title="Control whether visitors can view your Ad History"
                    >
                      <IconLock
                        locked={!(profileData.ad_history_public ?? true)}
                      />
                      <span>
                        {profileData.ad_history_public ?? true
                          ? "History: Public"
                          : "History: Private (Only You)"}
                      </span>
                    </button>
                  )}
                </div>

                {/* Ad History Content */}
                {!isAdHistoryVisibleToVisitor ? (
                  <div className="bg-card border border-border rounded-[8px] p-12 text-center flex flex-col items-center justify-center gap-2 min-h-[280px]">
                    <div className="w-10 h-10 rounded-full bg-popover border border-border flex items-center justify-center text-muted-foreground mb-1">
                      <IconLock locked className="w-5 h-5" />
                    </div>
                    <h3 className="text-[16px] text-foreground">
                      Ad History is Private
                    </h3>
                    <p className="text-[13px] text-muted-foreground max-w-sm">
                      {profileData.username} has chosen to keep their trading ad
                      history private.
                    </p>
                  </div>
                ) : isLoadingHistory ? (
                  <AdHistorySkeletonList count={2} />
                ) : filteredAdHistory.length === 0 ? (
                  <div className="bg-card border border-border rounded-[8px] p-12 text-center flex flex-col items-center justify-center gap-2 min-h-[280px]">
                    <GiMegaphone className="w-10 h-10 text-muted-foreground opacity-40" />
                    <h3 className="text-[16px] text-foreground">
                      No Trade Ads Found
                    </h3>
                    <p className="text-[13px] text-muted-foreground max-w-sm">
                      {adFilter === "all"
                        ? "No trade listings have been posted yet."
                        : `No ${adFilter} trade ads in history.`}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {filteredAdHistory.map((ad) => {
                      const remaining = formatRemainingTime(ad.expires_at);
                      const isLive = remaining !== null;
                      const isPrivateAd = privateAdSet.has(ad.id);

                      const isTakingOffers =
                        ad.ad_type === "lf_offers" ||
                        (ad.ad_type === "standard" && ad.get_items.length === 0);
                      const isInventory = ad.ad_type === "inventory";

                      let typeLabel = "Specific Trade";
                      let typeStyle = "bg-[#1e1f22] border-[#3f4147] text-[#cbd5e1]";
                      if (isInventory) {
                        typeLabel = "Vault Showcase";
                        typeStyle = "bg-[#161a33] border-[#3c45a5] text-[#818cf8]";
                      } else if (isTakingOffers) {
                        typeLabel = "Taking Offers";
                        typeStyle = "bg-[#281b0a] border-[#b45309] text-[#fbbf24]";
                      }

                      const totalGiveVal = ad.give_items.reduce((acc, i) => {
                        const m = ALL_UNITS.find((u) => u.id === i.id);
                        const liveVal = m
                          ? getUnitConservativeValue(m)
                          : i.value;
                        return acc + liveVal * i.qty;
                      }, 0);

                      const totalGetVal = ad.get_items.reduce((acc, i) => {
                        const m = ALL_UNITS.find((u) => u.id === i.id);
                        const liveVal = m
                          ? getUnitConservativeValue(m)
                          : i.value;
                        return acc + liveVal * i.qty;
                      }, 0);

                      return (
                        <div
                          key={ad.id}
                          className={`bg-card border rounded-[8px] p-5 flex flex-col gap-4 transition-colors ${
                            isLive ? "border-border" : "border-border/70 opacity-95"
                          }`}
                        >
                          {/* Top Metadata & Action Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Live vs Expired Badge */}
                              {isLive ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-[#122317] border border-[#1f6f3e] text-[#34d399] text-[11px] font-mono font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                                  LIVE · {remaining}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-[#1e1f22] border border-[#3f4147] text-[#94a3b8] text-[11px] font-mono font-semibold">
                                  EXPIRED · {formatTimeAgo(ad.created_at)}
                                </span>
                              )}

                              <span
                                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-[4px] border ${typeStyle}`}
                              >
                                {typeLabel}
                              </span>

                              <span className="text-[12px] font-mono text-muted-foreground">
                                Offer Value:{" "}
                                <strong className="text-foreground">
                                  {totalGiveVal.toLocaleString()}
                                </strong>
                                {totalGetVal > 0 && (
                                  <>
                                    {" "}
                                    · Request:{" "}
                                    <strong className="text-primary">
                                      {totalGetVal.toLocaleString()}
                                    </strong>
                                  </>
                                )}
                              </span>
                            </div>

                            {/* Per-Ad Controls */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Load into Trade Analyzer */}
                              <button
                                type="button"
                                onClick={() => handleLoadAdIntoCalculator(ad)}
                                className="px-2.5 py-1 rounded-[5px] bg-popover hover:bg-muted border border-border text-muted-foreground hover:text-foreground text-[11.5px] flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Load these units into the Trade Analyzer"
                              >
                                <IconSwap className="w-3.5 h-3.5" />
                                <span>Calculator</span>
                              </button>

                              {/* Owner-only Per-Ad Visibility, Repost & Delete */}
                              {isOwner && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleSingleAdPrivacy(ad.id)
                                    }
                                    className={`px-2.5 py-1 rounded-[5px] border text-[11.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                      isPrivateAd
                                        ? "bg-[#281b0a] border-[#b45309] text-[#fbbf24]"
                                        : "bg-[#1e1f22] hover:bg-muted border-[#3f4147] text-[#cbd5e1]"
                                    }`}
                                    title={
                                      isPrivateAd
                                        ? "Hidden from visitors. Click to make Public."
                                        : "Visible to visitors. Click to make Private."
                                    }
                                  >
                                    <IconLock locked={isPrivateAd} />
                                    <span>
                                      {isPrivateAd ? "Private" : "Public"}
                                    </span>
                                  </button>

                                  {!isLive && (
                                    <button
                                      type="button"
                                      disabled={repostingAdId === ad.id}
                                      onClick={() => handleRepostAd(ad)}
                                      className="px-2.5 py-1 rounded-[5px] bg-[#1a2333] hover:bg-[#202d42] border border-[#2563eb] text-[#60a5fa] font-semibold text-[11.5px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                                      title="Repost this trade to the live Trading Board for 24 hours"
                                    >
                                      <IconRefresh className="w-3.5 h-3.5" />
                                      <span>
                                        {repostingAdId === ad.id
                                          ? "Reposting…"
                                          : "Repost"}
                                      </span>
                                    </button>
                                  )}

                                  {confirmDeleteAdId === ad.id ? (
                                    <div className="inline-flex items-center gap-1 bg-[#241215] border border-[#ef4444] rounded-[5px] px-2 py-0.5 shadow-xs">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteAdFromHistory(ad.id)
                                        }
                                        className="text-[11px] font-semibold text-[#f87171] hover:underline px-1 cursor-pointer"
                                      >
                                        Confirm Delete
                                      </button>
                                      <span className="text-[#7f1d1d]">·</span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmDeleteAdId(null)
                                        }
                                        className="text-[11px] text-[#94a3b8] hover:text-foreground px-1 cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmDeleteAdId(ad.id)
                                      }
                                      className="p-1.5 rounded-[5px] bg-[#1e1f22] hover:bg-[#241215] border border-[#3f4147] hover:border-[#ef4444] text-[#94a3b8] hover:text-[#f87171] transition-colors cursor-pointer shadow-xs"
                                      title="Delete ad permanently"
                                      aria-label="Delete ad"
                                    >
                                      <IconTrash className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Ad Note */}
                          {ad.note && (
                            <div className="border-l-2 border-primary pl-3 py-1 text-[12.5px] text-foreground/90 bg-popover/60 rounded-r-[4px]">
                              “{ad.note}”
                            </div>
                          )}

                          {/* Ad Units Grid */}
                          {isInventory ? (
                            <AdItemGrid
                              items={ad.give_items}
                              ALL_UNITS={ALL_UNITS}
                              label="Showcase Units"
                              labelColor="var(--muted-foreground)"
                              onInspectUnit={(uid) =>
                                openHistoryModal(uid, "value")
                              }
                            />
                          ) : isTakingOffers ? (
                            <AdItemGrid
                              items={ad.give_items}
                              ALL_UNITS={ALL_UNITS}
                              label="Offering"
                              labelColor="var(--warning)"
                              onInspectUnit={(uid) =>
                                openHistoryModal(uid, "value")
                              }
                            />
                          ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr] gap-4 items-start">
                              <AdItemGrid
                                items={ad.give_items}
                                ALL_UNITS={ALL_UNITS}
                                label="Offering"
                                labelColor="var(--warning)"
                                onInspectUnit={(uid) =>
                                  openHistoryModal(uid, "value")
                                }
                              />
                              <div className="hidden xl:flex items-center justify-center self-center text-muted-foreground bg-popover p-2 rounded-[6px] border border-border">
                                <IconSwap className="w-4 h-4" />
                              </div>
                              <AdItemGrid
                                items={ad.get_items}
                                ALL_UNITS={ALL_UNITS}
                                label="Requesting"
                                labelColor="var(--primary)"
                                onInspectUnit={(uid) =>
                                  openHistoryModal(uid, "value")
                                }
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: TARGET WISHLIST (Improved Layout + Inline Search Adder) */}
            {/* ============================================================== */}
            {activeTab === "wishlist" && (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Wishlist Header & Owner Quick-Add Toolbar */}
                <div className="bg-card border border-border rounded-[8px] p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-[14px] text-foreground">
                        Target Wishlist
                      </h3>
                      <span className="text-[12px] font-mono text-muted-foreground">
                        {isWishlistVisibleToVisitor
                          ? `${activeWishlistItems.length} hunted units · Total Value: ${totalWishlistValue.toLocaleString()}`
                          : "Wishlist hidden from visitors"}
                      </span>
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleProfilePrivacy("wishlist_public")
                        }
                        className={`px-3 py-1.5 rounded-[6px] border text-[12px] flex items-center gap-2 transition-colors cursor-pointer ${
                          profileData.wishlist_public ?? true
                            ? "bg-[#23a559]/10 border-[#23a559]/35 text-[#23a559]"
                            : "bg-warning/10 border-warning/35 text-warning"
                        }`}
                      >
                        <IconLock
                          locked={!(profileData.wishlist_public ?? true)}
                        />
                        <span>
                          {profileData.wishlist_public ?? true
                            ? "Wishlist: Public"
                            : "Wishlist: Private"}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Owner Inline Unit Search to Add to Wishlist */}
                  {isOwner && currentUser && (
                    <div className="pt-2 border-t border-border flex flex-col gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={wishlistSearch}
                          onChange={(e) => setWishlistSearch(e.target.value)}
                          placeholder="Search any unit to add to your Target Wishlist…"
                          className="w-full bg-popover border border-border rounded-[6px] px-3.5 py-2 text-[12.5px] text-foreground outline-none focus:border-primary transition-colors"
                        />
                        {wishlistSearch && (
                          <button
                            type="button"
                            onClick={() => setWishlistSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                            aria-label="Clear wishlist search"
                          >
                            <IconClose className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {wishlistSearchResults.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                          {wishlistSearchResults.map((unit) => (
                            <button
                              key={unit.id}
                              type="button"
                              onClick={() => {
                                triggerHaptic("medium");
                                toggleWishlist(currentUser.id, unit.id);
                                setWishlistSearch("");
                                useToastStore
                                  .getState()
                                  .addToast(
                                    `Added ${unit.name} to your Target Wishlist!`,
                                    "success"
                                  );
                              }}
                              className="flex items-center justify-between gap-2 p-2 rounded-[6px] bg-popover hover:bg-muted border border-border text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-[4px] bg-muted overflow-hidden shrink-0 relative border border-border">
                                  <UnitAvatar
                                    unitId={unit.id}
                                    unitName={unit.name}
                                    imageUrl={unit.imageUrl}
                                    fallbackClassName="absolute inset-0 flex items-center justify-center text-white text-[10px]"
                                    imageClassName="absolute inset-0 w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[12px] text-foreground truncate">
                                    {unit.name}
                                  </span>
                                  <span className="text-[10.5px] font-mono text-muted-foreground">
                                    {unit.value === "owner"
                                      ? "O/C"
                                      : getUnitConservativeValue(
                                          unit
                                        ).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold text-[#60a5fa] px-2 py-0.5 rounded-[4px] bg-[#1a2333] border border-[#2563eb] shrink-0">
                                + Add
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Wishlist Content */}
                {!isWishlistVisibleToVisitor ? (
                  <div className="bg-card border border-border rounded-[8px] p-12 text-center flex flex-col items-center justify-center gap-2 min-h-[280px]">
                    <div className="w-10 h-10 rounded-full bg-popover border border-border flex items-center justify-center text-muted-foreground mb-1">
                      <IconLock locked className="w-5 h-5" />
                    </div>
                    <h3 className="text-[16px] text-foreground">
                      Target Wishlist is Private
                    </h3>
                    <p className="text-[13px] text-muted-foreground max-w-sm">
                      {profileData.username} has set their Target Wishlist to
                      private.
                    </p>
                  </div>
                ) : isInventoryLoading && activeWishlistItems.length === 0 ? (
                  <WishlistGridSkeleton count={6} />
                ) : activeWishlistItems.length === 0 ? (
                  <div className="bg-card border border-border rounded-[8px] p-12 text-center flex flex-col items-center justify-center gap-2 min-h-[280px]">
                    <GiSpikedHalo className="w-10 h-10 text-muted-foreground opacity-40" />
                    <h3 className="text-[16px] text-foreground">
                      Empty Target Wishlist
                    </h3>
                    <p className="text-[13px] text-muted-foreground max-w-sm">
                      {isOwner
                        ? "Use the search bar above to add units you are actively hunting for."
                        : "This trader hasn't listed any target units yet."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {activeWishlistItems.map((item) => {
                      const master = ALL_UNITS.find(
                        (u) => u.id === item.unit_id
                      );
                      if (!master) return null;

                      const tierKey = getTier(master);
                      const tierColor =
                        TIER_CONFIG[tierKey]?.badgeColor || "var(--primary)";
                      const obtainability = getObtainability(master);
                      const cfg = master.status
                        ? GRID_STATUS_CFG[
                            master.status as keyof typeof GRID_STATUS_CFG
                          ]
                        : null;
                      const unitVal =
                        master.value === "owner"
                          ? "Owner's Choice"
                          : getUnitConservativeValue(master).toLocaleString();

                      return (
                        <div
                          key={item.id}
                          className="bg-card border border-border hover:border-foreground/35 rounded-[8px] p-3.5 flex flex-col justify-between gap-3 transition-colors group min-w-0 overflow-hidden"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Unit Portrait */}
                            <div
                              onClick={() => openHistoryModal(master.id, "value")}
                              className="w-14 h-14 rounded-[6px] bg-popover border overflow-hidden relative shrink-0 cursor-pointer"
                              style={{ borderColor: `${tierColor}66` }}
                              title="Inspect Market History"
                            >
                              <UnitAvatar
                                unitId={master.id}
                                unitName={master.name}
                                imageUrl={master.imageUrl}
                                fallbackClassName="absolute inset-0 flex items-center justify-center text-white text-lg z-0"
                                imageClassName="absolute inset-0 w-full h-full object-cover z-10 group-hover:scale-105 transition-transform"
                              />
                              <span
                                className="absolute bottom-0 left-0 px-1.5 py-0.5 text-[9.5px] font-mono text-white z-20 rounded-tr-[4px]"
                                style={{ backgroundColor: tierColor }}
                              >
                                {tierKey}
                              </span>
                            </div>

                            {/* Unit Info */}
                            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                              <div className="flex items-start justify-between gap-1.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openHistoryModal(master.id, "value")
                                  }
                                  className="text-[14px] text-foreground hover:text-primary truncate text-left cursor-pointer min-w-0"
                                  title={master.name}
                                >
                                  {master.name}
                                </button>

                                {isOwner && currentUser && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerHaptic("light");
                                      toggleWishlist(
                                        currentUser.id,
                                        master.id
                                      );
                                    }}
                                    className="text-muted-foreground hover:text-[#f87171] p-1 rounded-[4px] hover:bg-[#241215] transition-colors cursor-pointer shrink-0"
                                    title="Remove from Wishlist"
                                    aria-label={`Remove ${master.name} from wishlist`}
                                  >
                                    <IconClose className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <span className="text-[11.5px] text-muted-foreground truncate">
                                {master.subtitle || "Official Unit"} ·{" "}
                                {obtainability}
                              </span>

                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[14px] font-mono text-foreground whitespace-nowrap">
                                  {unitVal}
                                </span>
                                {cfg && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-[4px] border inline-flex items-center gap-1 leading-none whitespace-nowrap shrink-0"
                                    style={{
                                      backgroundColor: cfg.bg,
                                      color: cfg.color,
                                      borderColor: cfg.border,
                                    }}
                                  >
                                    <StatusIcon status={master.status} />
                                    {cfg.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Footer: Stacked Metrics Strip + 2-Column Action Buttons */}
                          <div className="pt-2.5 border-t border-border/70 flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                              <button
                                type="button"
                                onClick={() =>
                                  openHistoryModal(master.id, "rarity")
                                }
                                className="flex items-center justify-between px-2.5 py-1 rounded-[5px] bg-popover/70 hover:bg-popover border border-border/70 transition-colors cursor-pointer whitespace-nowrap min-w-0"
                                title="Inspect Rarity History"
                              >
                                <span className="text-muted-foreground">
                                  Rarity
                                </span>
                                <span className="text-[#4DB6AC] ml-1.5">
                                  {master.rarity ?? 0}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  openHistoryModal(master.id, "liquidity")
                                }
                                className="flex items-center justify-between px-2.5 py-1 rounded-[5px] bg-popover/70 hover:bg-popover border border-border/70 transition-colors cursor-pointer whitespace-nowrap min-w-0 overflow-hidden"
                                title="Inspect Liquidity History"
                              >
                                <span className="text-muted-foreground shrink-0">
                                  Liq
                                </span>
                                <span className="text-[#81C784] truncate ml-1.5">
                                  {master.liquidity || "Avg"}
                                </span>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openHistoryModal(master.id, "value")
                                }
                                className="w-full px-2.5 py-1.5 rounded-[5px] bg-popover hover:bg-muted border border-border text-muted-foreground hover:text-foreground text-[11.5px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                                title="View Market History"
                              >
                                <GiHourglass className="w-3.5 h-3.5 shrink-0" />
                                <span>History</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic("light");
                                  addCard("get", {
                                    id: master.id,
                                    name: master.name,
                                    subtitle: master.subtitle,
                                    value: getUnitConservativeValue(master),
                                    qty: 1,
                                  });
                                  useToastStore
                                    .getState()
                                    .addToast(
                                      `Added ${master.name} to 'You Get'`,
                                      "success"
                                    );
                                }}
                                className="w-full px-2.5 py-1.5 rounded-[5px] bg-[#1a2333] hover:bg-[#202d42] border border-[#2563eb] text-[#60a5fa] font-semibold text-[11.5px] flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                                title="Add unit to Trade Calculator"
                              >
                                <span>+ Calculator</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {/* ============================================================== */}
            {/* TAB 3: PREFERENCES & PRIVACY (Discord-Style Settings)          */}
            {/* ============================================================== */}
            {activeTab === "settings" && isOwner && (
              <div className="flex flex-col gap-5 animate-fade-in">
                {/* 1. Profile Privacy & Data Security */}
                <div className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4">
                  <div className="flex flex-col gap-0.5 border-b border-border pb-3">
                    <h3 className="text-[14px] text-foreground">
                      Privacy & Data Security
                    </h3>
                    <p className="text-[12px] text-muted-foreground">
                      Control what other traders can see when visiting your
                      profile or mini-popout.
                    </p>
                  </div>

                  <div className="flex flex-col divide-y divide-border/70">
                    {/* Public Ad History Toggle */}
                    <div className="py-3 first:pt-0 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] text-foreground">
                          Public Ad History
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          Allow visitors to view your posted trade history on
                          your profile. Individual ads marked Private remain
                          hidden.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleProfilePrivacy("ad_history_public")
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                          profileData.ad_history_public ?? true
                            ? "bg-[#23a559]"
                            : "bg-muted border border-border"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                            profileData.ad_history_public ?? true
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Public Target Wishlist Toggle */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] text-foreground">
                          Public Target Wishlist
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          Show the units you are actively hunting for on your
                          public profile.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleProfilePrivacy("wishlist_public")
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                          profileData.wishlist_public ?? true
                            ? "bg-[#23a559]"
                            : "bg-muted border border-border"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                            profileData.wishlist_public ?? true
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Hide Raw Discord ID Toggle */}
                    <div className="py-3 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] text-foreground">
                          Mask Raw Discord ID on Profile
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          Hide your numeric Discord ID badge from your profile
                          card and mini-popout.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleProfilePrivacy("hide_discord_id")
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                          profileData.hide_discord_id
                            ? "bg-primary"
                            : "bg-muted border border-border"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                            profileData.hide_discord_id
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Appearance & Density */}
                <div className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-[14px] text-foreground">
                        Appearance & Layout Density
                      </h3>
                      <p className="text-[12px] text-muted-foreground">
                        Customize the global color theme and information
                        density.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="px-3 py-1.5 rounded-[5px] bg-popover hover:bg-muted border border-border text-foreground text-[12px] flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <IconEdit className="w-3.5 h-3.5" />
                      <span>Edit Banner & Bio</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: "dark",
                        label: "Deep Dark",
                        desc: "High-contrast dark mode",
                        swatch: "#0a0a0a",
                      },
                      {
                        id: "discord",
                        label: "Discord Blurple",
                        desc: "Matches Discord slate UI",
                        swatch: "#313338",
                      },
                      {
                        id: "light",
                        label: "Crisp Light",
                        desc: "High-visibility light mode",
                        swatch: "#fafafa",
                      },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setTheme(t.id as ThemeMode);
                        }}
                        className={`p-3.5 rounded-[6px] border text-left flex flex-col gap-1.5 cursor-pointer transition-colors ${
                          theme === t.id
                            ? "bg-popover border-primary ring-1 ring-primary/40"
                            : "bg-popover/40 border-border hover:bg-popover"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-foreground">
                            {t.label}
                          </span>
                          <span
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: t.swatch }}
                          />
                        </div>
                        <span className="text-[11.5px] text-muted-foreground">
                          {t.desc}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Global Compact Mode */}
                  <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] text-foreground">
                        Global Compact Mode
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        Tightens padding and card spacing across the entire app
                        to fit more units on screen.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("medium");
                        setGlobalCompactMode(!globalCompactMode);
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                        globalCompactMode
                          ? "bg-primary"
                          : "bg-muted border border-border"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                          globalCompactMode ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 3. Startup Channel & Trade Calculator Preferences */}
                <div className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-[14px] text-foreground">
                        Navigation & Trade Analyzer Defaults
                      </h3>
                      <p className="text-[12px] text-muted-foreground">
                        Configure your default startup channel and which panels
                        appear in the Trade Analyzer.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        updateAnalyzerSettings(DEFAULT_ANALYZER_SETTINGS);
                        useToastStore
                          .getState()
                          .addToast(
                            "Trade Analyzer settings reset to defaults.",
                            "info"
                          );
                      }}
                      className="px-2.5 py-1.5 rounded-[5px] bg-popover hover:bg-muted border border-border text-muted-foreground hover:text-foreground text-[11px] font-mono flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                    >
                      <IconRefresh className="w-3 h-3" />
                      <span>Reset Defaults</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[12px] text-muted-foreground">
                      Default Startup Channel
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        {
                          id: "last-used",
                          label: "Last Used",
                          desc: "Resume session",
                        },
                        {
                          id: "value-list",
                          label: "Value List",
                          desc: "Live tier grid",
                        },
                        {
                          id: "trading-ads",
                          label: "Trading Ads",
                          desc: "Community board",
                        },
                        {
                          id: "home",
                          label: "Home",
                          desc: "Update logs",
                        },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setBootChannel(opt.id as BootChannel);
                          }}
                          className={`p-3 rounded-[6px] border text-left flex flex-col gap-0.5 cursor-pointer transition-colors ${
                            bootChannel === opt.id
                              ? "bg-popover border-primary"
                              : "bg-popover/40 border-border hover:bg-popover"
                          }`}
                        >
                          <span className="text-[12.5px] text-foreground">
                            {opt.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {opt.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trade Analyzer Panel Toggles */}
                  <div className="pt-3 border-t border-border/70 flex flex-col gap-2">
                    <span className="text-[12px] text-muted-foreground">
                      Trade Analyzer Visible Sections & Metrics
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(
                        [
                          {
                            key: "showSummaryMetrics",
                            label: "Forecast & Metrics Bar",
                            active: analyzerSettings?.showSummaryMetrics ?? true,
                          },
                          {
                            key: "showStFlip",
                            label: "ST Flip Indicator",
                            active: analyzerSettings?.showStFlip ?? true,
                          },
                          {
                            key: "showLtHold",
                            label: "LT Hold Indicator",
                            active: analyzerSettings?.showLtHold ?? true,
                          },
                          {
                            key: "showRarity",
                            label: "Rarity Comparison Metric",
                            active: analyzerSettings?.showRarity ?? true,
                          },
                          {
                            key: "showLiquidity",
                            label: "Liquidity Comparison Metric",
                            active: analyzerSettings?.showLiquidity ?? true,
                          },
                          {
                            key: "showMomentumSummary",
                            label: "Status Momentum Summary",
                            active:
                              analyzerSettings?.showMomentumSummary ?? true,
                          },
                          {
                            key: "showTermsInTrade",
                            label: "Terms in This Trade",
                            active: analyzerSettings?.showTermsInTrade ?? true,
                          },
                          {
                            key: "showGiveNotices",
                            label: "You Give Unit Notices",
                            active: analyzerSettings?.showGiveNotices ?? true,
                          },
                          {
                            key: "showGetNotices",
                            label: "You Get Unit Notices",
                            active: analyzerSettings?.showGetNotices ?? true,
                          },
                          {
                            key: "collapseUnitsByDefault",
                            label: "Collapse Analyzer Units by Default",
                            active:
                              analyzerSettings?.collapseUnitsByDefault ?? false,
                          },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            updateAnalyzerSettings({
                              [item.key]: !item.active,
                            });
                          }}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-[6px] bg-popover border border-border hover:border-foreground/30 transition-colors cursor-pointer text-left"
                        >
                          <span className="text-[12.5px] text-foreground">
                            {item.label}
                          </span>
                          <span
                            className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[4px] border ${
                              item.active
                                ? "bg-[#122317] border-[#1f6f3e] text-[#34d399]"
                                : "bg-[#1e1f22] border-[#3f4147] text-[#94a3b8]"
                            }`}
                          >
                            {item.active ? "Shown" : "Hidden"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Isolated Memoized Profile Customizer Modal */}
      {profileData && isOwner && (
        <ProfileCustomizerModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profileData={profileData}
          onSave={handleSaveProfile}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
