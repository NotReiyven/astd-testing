import { HistorySnapshot } from "../../../../hooks/useUnitHistory";
import { GRID_STATUS_CFG } from "../../../../data";

export type Metric = "value" | "rarity" | "liquidity";
export type RangeKey = "7D" | "30D" | "90D" | "ALL";
export type ChangedField = "Value" | "Status" | "Rarity" | "Liquidity" | "Notice";

export const RANGE_DAYS = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
} as const;

export function isOwnerChoiceSnap(snap: HistorySnapshot | undefined | null): boolean {
  if (!snap) return false;
  const vt = (snap.value_type || "").toLowerCase();
  const vd = (snap.value_display || "").toLowerCase();
  return (
    vt === "owner" ||
    vd === "owner's choice" ||
    vd === "o/c" ||
    vd === "owners choice"
  );
}

export function getSnapNumericValue(
  snap: HistorySnapshot | undefined | null
): number | null {
  if (!snap || isOwnerChoiceSnap(snap)) return null;
  if (snap.value_type === "range") {
    if (typeof snap.value_min === "number" && snap.value_min > 0) return snap.value_min;
    if (typeof snap.value === "number" && snap.value > 0) return snap.value;
    return null;
  }
  if (typeof snap.value === "number" && snap.value > 0) return snap.value;
  if (typeof snap.value_min === "number" && snap.value_min > 0) return snap.value_min;
  return null;
}

export function formatSnapValue(snap: HistorySnapshot | undefined | null): string {
  if (!snap) return "N/A";
  if (isOwnerChoiceSnap(snap)) return "O/C";
  if (snap.value_display && snap.value_display.trim().length > 0) {
    return snap.value_display.trim();
  }
  if (typeof snap.value === "number" && snap.value > 0) {
    return snap.value.toLocaleString();
  }
  if (typeof snap.value_min === "number" && snap.value_min > 0) {
    return `${snap.value_min.toLocaleString()}+`;
  }
  return "N/A";
}

export function formatLiquidityLabel(liq: string | null | undefined): string {
  const raw = (liq || "Average").trim();
  if (!raw) return "Average";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function liquidityToPlotValue(liq: string | null | undefined): number {
  const clean = (liq || "average").toLowerCase();
  if (clean.includes("high")) return 3;
  if (clean.includes("low")) return 1;
  return 2;
}

export function formatRelativeTime(dateStr: string): string {
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
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo ago`;
  return `${Math.floor(diffDay / 365)}y ago`;
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatFullTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getChangedFields(
  curr: HistorySnapshot,
  prev: HistorySnapshot
): ChangedField[] {
  const changes: ChangedField[] = [];
  const currValStr = formatSnapValue(curr);
  const prevValStr = formatSnapValue(prev);
  const currNum = getSnapNumericValue(curr);
  const prevNum = getSnapNumericValue(prev);

  if (currValStr !== prevValStr || currNum !== prevNum) changes.push("Value");
  if ((curr.status || "stable") !== (prev.status || "stable")) changes.push("Status");
  if ((curr.rarity ?? 0) !== (prev.rarity ?? 0)) changes.push("Rarity");
  if (
    formatLiquidityLabel(curr.liquidity).toLowerCase() !==
    formatLiquidityLabel(prev.liquidity).toLowerCase()
  ) {
    changes.push("Liquidity");
  }
  if ((curr.notice || "").trim() !== (prev.notice || "").trim()) changes.push("Notice");
  return changes;
}

export interface TimelineEvent {
  id: string;
  snap: HistorySnapshot;
  prev: HistorySnapshot;
  dateFormatted: string;
  relativeTime: string;
  changed: ChangedField[];
}

export interface ChartPoint {
  snapId: string;
  index: number;
  axisLabel: string;
  fullDate: string;
  relativeTime: string;
  value: number | null;
  displayLabel: string;
  isRange: boolean;
  isOC: boolean;
  deltaFromPrev: number | null;
  pctFromPrev: number | null;
  prevDisplayLabel: string | null;
  changedFields: ChangedField[];
  fullSnap: HistorySnapshot;
  prevSnap: HistorySnapshot | null;
}

export function getStatusCfg(status: string) {
  return GRID_STATUS_CFG[status as keyof typeof GRID_STATUS_CFG];
}