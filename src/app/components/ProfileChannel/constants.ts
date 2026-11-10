// ================================================
// FILE: src/app/components/ProfileChannel/constants.ts
// ================================================

import { UserProfile } from "../../../store/useAuthStore";
import { TradingStanceType } from "../../../store/useProfileStore";
import {
  ThemeMode,
  BootChannel,
  FontFamily,
} from "../../../store/useLayoutStore";

export type ActiveTab = "board" | "wishlist" | "journal" | "settings";
export type AdFilter = "all" | "live" | "expired" | "private";

export const TRADING_STANCES: {
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
    color: "#ffffff",
    bg: "#23a559",
    border: "rgba(255, 255, 255, 0.2)",
  },
  {
    id: "upgrading",
    label: "Upgrading Only",
    desc: "Trading multiple units up into higher tiers",
    color: "#ffffff",
    bg: "#d97706",
    border: "rgba(255, 255, 255, 0.2)",
  },
  {
    id: "downgrading",
    label: "Downgrading",
    desc: "Breaking down high-tier units for adds",
    color: "#ffffff",
    bg: "#0284c7",
    border: "rgba(255, 255, 255, 0.2)",
  },
  {
    id: "wishlist",
    label: "Hunting Wishlist",
    desc: "Primarily looking for Target Wishlist units",
    color: "#ffffff",
    bg: "#8b5cf6",
    border: "rgba(255, 255, 255, 0.2)",
  },
  {
    id: "afk",
    label: "AFK / Break",
    desc: "Slow responses or temporarily away",
    color: "#ffffff",
    bg: "#475569",
    border: "rgba(255, 255, 255, 0.2)",
  },
];

export const PRESENCE_OPTIONS: {
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

export const THEME_OPTIONS: {
  id: ThemeMode;
  label: string;
  desc: string;
  swatch: string;
}[] = [
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
];

export const BOOT_CHANNEL_OPTIONS: {
  id: BootChannel;
  label: string;
  desc: string;
}[] = [
  { id: "last-used", label: "Last Used", desc: "Resume session" },
  { id: "value-list", label: "Value List", desc: "Live tier grid" },
  { id: "trading-ads", label: "Trading Ads", desc: "Community board" },
  { id: "home", label: "Home", desc: "Update logs" },
];

export const FONT_OPTIONS: {
  id: FontFamily;
  label: string;
  desc: string;
  previewFont: string;
}[] = [
  {
    id: "luckiest-guy",
    label: "Luckiest Guy",
    desc: "Classic ASTD display",
    previewFont: "'Luckiest Guy', cursive, sans-serif",
  },
  {
    id: "lilita-one",
    label: "Lilita One",
    desc: "Bold rounded display sans",
    previewFont: "'Lilita One', cursive, sans-serif",
  },
  {
    id: "russo-one",
    label: "Russo One",
    desc: "Bold geometric display",
    previewFont: "'Russo One', sans-serif",
  },
  {
    id: "rubik-dirt",
    label: "Rubik Dirt",
    desc: "Grungy distressed display",
    previewFont: "'Rubik Dirt', cursive, sans-serif",
  },
];

export const ANALYZER_TOGGLE_DEFS = [
  {
    key: "showSummaryMetrics" as const,
    label: "Forecast & Metrics Bar",
    default: true,
  },
  {
    key: "showStFlip" as const,
    label: "ST Flip Indicator",
    default: true,
  },
  {
    key: "showLtHold" as const,
    label: "LT Hold Indicator",
    default: true,
  },
  {
    key: "showRarity" as const,
    label: "Rarity Comparison Metric",
    default: true,
  },
  {
    key: "showLiquidity" as const,
    label: "Liquidity Comparison Metric",
    default: true,
  },
  {
    key: "showMomentumSummary" as const,
    label: "Status Momentum Summary",
    default: true,
  },
  {
    key: "showTermsInTrade" as const,
    label: "Terms in This Trade",
    default: true,
  },
  {
    key: "showGiveNotices" as const,
    label: "You Give Unit Notices",
    default: true,
  },
  {
    key: "showGetNotices" as const,
    label: "You Get Unit Notices",
    default: true,
  },
  {
    key: "collapseUnitsByDefault" as const,
    label: "Collapse Analyzer Units by Default",
    default: false,
  },
];

export type AnalyzerToggleKey =
  (typeof ANALYZER_TOGGLE_DEFS)[number]["key"];