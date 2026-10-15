import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { GiRoundStar } from "react-icons/gi";
import { useHistoryModalStore } from "../../../store/useHistoryModalStore";
import { useUnitHistory, HistorySnapshot } from "../../../hooks/useUnitHistory";
import { useUnits } from "../../../context/UnitContext";
import { useAuthStore } from "../../../store/useAuthStore";
import { useInventoryStore } from "../../../store/useInventoryStore";
import { useToastStore } from "../../../store/useToastStore";
import { useShowDelay } from "../../../hooks/useShowDelay";
import { logger } from "../../../lib/logger";
import { GRID_STATUS_CFG, TIER_CONFIG, getProxyImage, getTier, handleImageError } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";
import { StatusIcon } from "./UnitGrid";
import { triggerHaptic, copyTextWithFallback } from "../../../data/helpers";

type Metric = "value" | "rarity" | "liquidity";
type RangeKey = "7D" | "30D" | "90D" | "ALL";
type ChangedField = "Value" | "Status" | "Rarity" | "Liquidity" | "Notice";
type TimelineFilter = "All" | ChangedField;

const RANGE_DAYS: Record<Exclude<RangeKey, "ALL">, number> = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
};

function isOwnerChoiceSnap(snap: HistorySnapshot | undefined | null): boolean {
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

function getSnapNumericValue(
  snap: HistorySnapshot | undefined | null
): number | null {
  if (!snap || isOwnerChoiceSnap(snap)) return null;
  if (snap.value_type === "range") {
    if (typeof snap.value_min === "number" && snap.value_min > 0) {
      return snap.value_min;
    }
    if (typeof snap.value === "number" && snap.value > 0) {
      return snap.value;
    }
    return null;
  }
  if (typeof snap.value === "number" && snap.value > 0) {
    return snap.value;
  }
  if (typeof snap.value_min === "number" && snap.value_min > 0) {
    return snap.value_min;
  }
  return null;
}

function formatSnapValue(snap: HistorySnapshot | undefined | null): string {
  if (!snap) return "—";
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
  return "—";
}

function formatLiquidityLabel(liq: string | null | undefined): string {
  const raw = (liq || "Average").trim();
  if (!raw) return "Average";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function liquidityToPlotValue(liq: string | null | undefined): number {
  const clean = (liq || "average").toLowerCase();
  if (clean.includes("high")) return 3;
  if (clean.includes("low")) return 1;
  return 2;
}

function formatRelativeTime(dateStr: string): string {
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

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatFullTimestamp(dateStr: string): string {
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

function getChangedFields(
  curr: HistorySnapshot,
  prev: HistorySnapshot
): ChangedField[] {
  const changes: ChangedField[] = [];
  const currValStr = formatSnapValue(curr);
  const prevValStr = formatSnapValue(prev);
  const currNum = getSnapNumericValue(curr);
  const prevNum = getSnapNumericValue(prev);

  if (currValStr !== prevValStr || currNum !== prevNum) {
    changes.push("Value");
  }
  if ((curr.status || "stable") !== (prev.status || "stable")) {
    changes.push("Status");
  }
  if ((curr.rarity ?? 0) !== (prev.rarity ?? 0)) {
    changes.push("Rarity");
  }
  if (
    formatLiquidityLabel(curr.liquidity).toLowerCase() !==
    formatLiquidityLabel(prev.liquidity).toLowerCase()
  ) {
    changes.push("Liquidity");
  }
  if ((curr.notice || "").trim() !== (prev.notice || "").trim()) {
    changes.push("Notice");
  }
  return changes;
}

interface TimelineEvent {
  id: string;
  snap: HistorySnapshot;
  prev: HistorySnapshot;
  dateFormatted: string;
  relativeTime: string;
  changed: ChangedField[];
}

interface ChartPoint {
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

/**
 * Renders structured before -> after rows for a snapshot pair.
 * Used in both the Latest Shift region and the Audit Timeline summary rows
 * so field transitions always align predictably.
 */
function SnapshotDiffList({
  curr,
  prev,
  changed,
  compact = false,
}: {
  curr: HistorySnapshot;
  prev: HistorySnapshot;
  changed: ChangedField[];
  compact?: boolean;
}) {
  const currNum = getSnapNumericValue(curr);
  const prevNum = getSnapNumericValue(prev);
  const valDelta =
    currNum !== null && prevNum !== null && prevNum > 0
      ? currNum - prevNum
      : null;
  const valPct =
    valDelta !== null && prevNum !== null && prevNum > 0
      ? (valDelta / prevNum) * 100
      : null;

  const rarityDiff = (curr.rarity ?? 0) - (prev.rarity ?? 0);

  const currCfg =
    GRID_STATUS_CFG[curr.status as keyof typeof GRID_STATUS_CFG];
  const prevCfg =
    GRID_STATUS_CFG[prev.status as keyof typeof GRID_STATUS_CFG];

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-1.5"
          : "grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2"
      }
    >
      {changed.includes("Value") && (
        <div className="flex items-baseline justify-between sm:justify-start gap-3 text-[13px]">
          <span className="w-[64px] shrink-0 text-[12px] text-muted-foreground">
            Value
          </span>
          <div className="flex items-baseline gap-1.5 font-mono flex-wrap">
            <span className="text-muted-foreground">{formatSnapValue(prev)}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-bold text-foreground">
              {formatSnapValue(curr)}
            </span>
            {valPct !== null && (
              <span
                className={`text-[11.5px] font-semibold ${
                  valPct >= 0 ? "text-[#23a559]" : "text-destructive"
                }`}
              >
                ({valPct >= 0 ? "+" : "−"}
                {Math.abs(valPct).toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      )}

      {changed.includes("Status") && (
        <div className="flex items-center justify-between sm:justify-start gap-3 text-[13px]">
          <span className="w-[64px] shrink-0 text-[12px] text-muted-foreground">
            Status
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[11px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] border shadow-xs inline-flex items-center"
              style={{
                backgroundColor: prevCfg?.bg || "#ffe599",
                color: prevCfg?.color || "#18181b",
                borderColor: prevCfg?.border || "rgba(0, 0, 0, 0.15)",
              }}
            >
              <span className="leading-none relative -top-[0.5px]">
                {prevCfg?.label || prev.status || "Stable"}
              </span>
            </span>
            <span className="text-muted-foreground font-mono">→</span>
            <span
              className="text-[11px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] border shadow-xs inline-flex items-center"
              style={{
                backgroundColor: currCfg?.bg || "#ffe599",
                color: currCfg?.color || "#18181b",
                borderColor: currCfg?.border || "rgba(0, 0, 0, 0.15)",
              }}
            >
              <span className="leading-none relative -top-[0.5px]">
                {currCfg?.label || curr.status || "Stable"}
              </span>
            </span>
          </div>
        </div>
      )}

      {changed.includes("Rarity") && (
        <div className="flex items-baseline justify-between sm:justify-start gap-3 text-[13px]">
          <span className="w-[64px] shrink-0 text-[12px] text-muted-foreground">
            Rarity
          </span>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-muted-foreground">{prev.rarity ?? 0}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-bold text-[#4DB6AC]">{curr.rarity ?? 0}</span>
            {rarityDiff !== 0 && (
              <span className="text-[11.5px] text-muted-foreground">
                ({rarityDiff > 0 ? "+" : "−"}
                {Math.abs(rarityDiff)})
              </span>
            )}
          </div>
        </div>
      )}

      {changed.includes("Liquidity") && (
        <div className="flex items-baseline justify-between sm:justify-start gap-3 text-[13px]">
          <span className="w-[64px] shrink-0 text-[12px] text-muted-foreground">
            Liquidity
          </span>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-muted-foreground">
              {formatLiquidityLabel(prev.liquidity)}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="font-bold text-[#81C784]">
              {formatLiquidityLabel(curr.liquidity)}
            </span>
          </div>
        </div>
      )}

      {changed.includes("Notice") && (
        <div
          className={`flex items-baseline justify-between sm:justify-start gap-3 text-[12.5px] ${
            compact ? "" : "sm:col-span-2"
          }`}
        >
          <span className="w-[64px] shrink-0 text-[12px] text-muted-foreground">
            Notice
          </span>
          <span className="text-foreground/90 italic leading-snug">
            {curr.notice ? `“${curr.notice}”` : "Notice cleared"}
          </span>
        </div>
      )}
    </div>
  );
}

export function HistoryModal() {
  const isOpen = useHistoryModalStore((s) => s.isOpen);
  const unitId = useHistoryModalStore((s) => s.unitId);
  const closeModal = useHistoryModalStore((s) => s.closeModal);
  const activeMetric = useHistoryModalStore((s) => s.activeMetric);
  const setActiveMetric = useHistoryModalStore((s) => s.setActiveMetric);

  const profile = useAuthStore((s) => s.profile);
  const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);
  const addOrUpdateUnit = useInventoryStore((s) => s.addOrUpdateUnit);
  const toggleWishlist = useInventoryStore((s) => s.toggleWishlist);
  const vaultQty = useInventoryStore((s) =>
    unitId ? s.items.find((i) => i.unit_id === unitId)?.quantity ?? 0 : 0
  );
  const isWishlisted = useInventoryStore((s) =>
    unitId ? s.wishlistItems.some((i) => i.unit_id === unitId) : false
  );
  const addToast = useToastStore((s) => s.addToast);

  const { history, loading, error } = useUnitHistory(unitId);
  const showChartSkeleton = useShowDelay(loading);
  const { units } = useUnits();

  const [isScrolled, setIsScrolled] = useState(false);
  const [RechartsLib, setRechartsLib] = useState<any>(null);
  const [rangeFilter, setRangeFilter] = useState<RangeKey>("ALL");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("All");
  const [selectedSnapId, setSelectedSnapId] = useState<string | null>(null);
  const [expandedEventIds, setExpandedEventIds] = useState<
    Record<string, boolean>
  >({});
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareMode, setCompareMode] = useState<"previous" | "baseline">(
    "previous"
  );
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [isVaultPending, setIsVaultPending] = useState(false);
  const [isWishlistPending, setIsWishlistPending] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setIsScrolled(false);
    setRangeFilter("ALL");
    setTimelineFilter("All");
    setSelectedSnapId(null);
    setExpandedEventIds({});
    setIsCompareOpen(false);
    setCopyState("idle");
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    const timer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 30);

    return () => {
      window.clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, unitId]);

  useEffect(() => {
    if (isOpen && !RechartsLib) {
      import("recharts")
        .then((mod) => setRechartsLib(mod))
        .catch((err) => logger.error('ASTD-UI-012', 'Failed to load recharts', { err }));
    }
  }, [isOpen, RechartsLib]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedSnapId) {
          e.stopPropagation();
          setSelectedSnapId(null);
          return;
        }
        triggerHaptic("light");
        closeModal();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeModal, selectedSnapId]);

  const currentUnit = useMemo(
    () => (unitId ? units.find((u) => u.id === unitId) ?? null : null),
    [unitId, units]
  );

  // Build chronological snapshot list including live state if different
  const displayHistory = useMemo<HistorySnapshot[]>(() => {
    if (!currentUnit) return [];
    const list = [...history];
    if (!loading && !error) {
      const latestDbSnap = list[list.length - 1];
      const liveSnap: HistorySnapshot = {
        id: "live-now",
        unit_id: currentUnit.id,
        recorded_at: new Date().toISOString(),
        value: typeof currentUnit.value === "number" ? currentUnit.value : null,
        value_type:
          typeof currentUnit.value === "number"
            ? "number"
            : String(currentUnit.value),
        value_display:
          currentUnit.value === "owner"
            ? "Owner's Choice"
            : currentUnit.valueDisplay || null,
        value_min: currentUnit.valueMin ?? null,
        status: currentUnit.status || "stable",
        rarity: currentUnit.rarity ?? 0,
        liquidity: currentUnit.liquidity || "Average",
        notice: currentUnit.notice || null,
      };

      if (!latestDbSnap) {
        list.push(liveSnap);
      } else {
        const diffs = getChangedFields(liveSnap, latestDbSnap);
        if (diffs.length > 0) {
          list.push(liveSnap);
        }
      }
    }
    return list;
  }, [history, loading, error, currentUnit]);

  const predecessorMap = useMemo(() => {
    const map = new Map<string, HistorySnapshot | null>();
    for (let i = 0; i < displayHistory.length; i++) {
      map.set(displayHistory[i].id, i > 0 ? displayHistory[i - 1] : null);
    }
    return map;
  }, [displayHistory]);

  const rangeCounts = useMemo(() => {
    const now = Date.now();
    const getForDays = (days: number) => {
      const cutoff = now - days * 86_400_000;
      return displayHistory.filter(
        (s) => new Date(s.recorded_at).getTime() >= cutoff
      ).length;
    };
    return {
      "7D": getForDays(7),
      "30D": getForDays(30),
      "90D": getForDays(90),
      ALL: displayHistory.length,
    };
  }, [displayHistory]);

  const filteredHistory = useMemo<HistorySnapshot[]>(() => {
    if (rangeFilter === "ALL" || displayHistory.length <= 1) {
      return displayHistory;
    }
    const cutoff = Date.now() - RANGE_DAYS[rangeFilter] * 86_400_000;
    const firstIdx = displayHistory.findIndex(
      (s) => new Date(s.recorded_at).getTime() >= cutoff
    );
    if (firstIdx === -1) {
      return displayHistory.slice(-1);
    }
    if (firstIdx > 0 && displayHistory.length - firstIdx === 1) {
      return displayHistory.slice(firstIdx - 1);
    }
    return displayHistory.slice(firstIdx);
  }, [displayHistory, rangeFilter]);

  const timeline = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];
    for (let i = filteredHistory.length - 1; i >= 0; i--) {
      const curr = filteredHistory[i];
      const prev = predecessorMap.get(curr.id) ?? null;
      if (!prev) continue;
      const changed = getChangedFields(curr, prev);
      if (changed.length > 0) {
        events.push({
          id: curr.id,
          snap: curr,
          prev,
          dateFormatted: formatFullTimestamp(curr.recorded_at),
          relativeTime: formatRelativeTime(curr.recorded_at),
          changed,
        });
      }
    }
    return events;
  }, [filteredHistory, predecessorMap]);

  const fieldFilterCounts = useMemo(() => {
    const counts: Record<TimelineFilter, number> = {
      All: timeline.length,
      Value: 0,
      Status: 0,
      Rarity: 0,
      Liquidity: 0,
      Notice: 0,
    };
    for (const ev of timeline) {
      for (const f of ev.changed) {
        counts[f] = (counts[f] || 0) + 1;
      }
    }
    return counts;
  }, [timeline]);

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === "All") return timeline;
    return timeline.filter((t) => t.changed.includes(timelineFilter));
  }, [timeline, timelineFilter]);

  const chartData = useMemo<ChartPoint[]>(() => {
    return filteredHistory.map((snap, idx) => {
      const prev = predecessorMap.get(snap.id) ?? null;
      const changedFields = prev ? getChangedFields(snap, prev) : [];
      const isOC = isOwnerChoiceSnap(snap);
      const isRange = snap.value_type === "range";

      const dateObj = new Date(snap.recorded_at);
      const isToday = new Date().toDateString() === dateObj.toDateString();
      const axisLabel = isToday
        ? dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : formatShortDate(snap.recorded_at);

      let plotVal: number | null = null;
      let displayLabel = "—";
      let prevDisplayLabel: string | null = null;
      let deltaFromPrev: number | null = null;
      let pctFromPrev: number | null = null;

      if (activeMetric === "value") {
        plotVal = getSnapNumericValue(snap);
        displayLabel = formatSnapValue(snap);
        if (prev) {
          prevDisplayLabel = formatSnapValue(prev);
          const prevNum = getSnapNumericValue(prev);
          if (plotVal !== null && prevNum !== null && prevNum > 0) {
            deltaFromPrev = plotVal - prevNum;
            pctFromPrev = ((plotVal - prevNum) / prevNum) * 100;
          }
        }
      } else if (activeMetric === "rarity") {
        plotVal = snap.rarity ?? 0;
        displayLabel = String(plotVal);
        if (prev) {
          const prevRarity = prev.rarity ?? 0;
          prevDisplayLabel = String(prevRarity);
          deltaFromPrev = plotVal - prevRarity;
          pctFromPrev =
            prevRarity > 0 ? ((plotVal - prevRarity) / prevRarity) * 100 : null;
        }
      } else {
        plotVal = liquidityToPlotValue(snap.liquidity);
        displayLabel = formatLiquidityLabel(snap.liquidity);
        if (prev) {
          prevDisplayLabel = formatLiquidityLabel(prev.liquidity);
          const prevLiqNum = liquidityToPlotValue(prev.liquidity);
          deltaFromPrev = plotVal - prevLiqNum;
        }
      }

      return {
        snapId: snap.id,
        index: idx,
        axisLabel,
        fullDate: formatFullTimestamp(snap.recorded_at),
        relativeTime: formatRelativeTime(snap.recorded_at),
        value: plotVal,
        displayLabel,
        isRange,
        isOC,
        deltaFromPrev,
        pctFromPrev,
        prevDisplayLabel,
        changedFields,
        fullSnap: snap,
        prevSnap: prev,
      };
    });
  }, [filteredHistory, predecessorMap, activeMetric]);

  const plottableChartData = useMemo(
    () => chartData.filter((d) => d.value !== null && d.value > 0),
    [chartData]
  );

  const ocSnapshotCount = useMemo(
    () => filteredHistory.filter((s) => isOwnerChoiceSnap(s)).length,
    [filteredHistory]
  );

  const rangeSummary = useMemo(() => {
    const latestSnap = filteredHistory[filteredHistory.length - 1];
    const firstSnap = filteredHistory[0];

    const firstNumericSnap = filteredHistory.find(
      (s) => getSnapNumericValue(s) !== null
    );
    const latestNumVal = getSnapNumericValue(latestSnap);
    const baseNumVal = getSnapNumericValue(firstNumericSnap);

    const canCalcValuePct =
      latestNumVal !== null &&
      baseNumVal !== null &&
      baseNumVal > 0 &&
      firstNumericSnap?.id !== latestSnap?.id;

    const valueDelta =
      canCalcValuePct && latestNumVal !== null && baseNumVal !== null
        ? latestNumVal - baseNumVal
        : null;
    const valuePct =
      canCalcValuePct && valueDelta !== null && baseNumVal !== null
        ? (valueDelta / baseNumVal) * 100
        : null;

    const rarityStart = firstSnap?.rarity ?? currentUnit?.rarity ?? 0;
    const rarityEnd = latestSnap?.rarity ?? currentUnit?.rarity ?? 0;
    const rarityDelta =
      filteredHistory.length > 1 ? rarityEnd - rarityStart : null;

    const liqStart = formatLiquidityLabel(
      firstSnap?.liquidity ?? currentUnit?.liquidity
    );
    const liqEnd = formatLiquidityLabel(
      latestSnap?.liquidity ?? currentUnit?.liquidity
    );

    const numericVals = plottableChartData.map((d) => d.value as number);
    const maxVal = numericVals.length > 0 ? Math.max(...numericVals) : 0;
    const minVal = numericVals.length > 0 ? Math.min(...numericVals) : 0;

    return {
      latestSnap,
      firstSnap,
      firstNumericSnap,
      valueDelta,
      valuePct,
      baselineDate: firstNumericSnap
        ? formatShortDate(firstNumericSnap.recorded_at)
        : null,
      rarityStart,
      rarityEnd,
      rarityDelta,
      liqStart,
      liqEnd,
      maxVal,
      minVal,
    };
  }, [filteredHistory, plottableChartData, currentUnit]);

  const selectedPoint = useMemo(
    () =>
      selectedSnapId
        ? chartData.find((d) => d.snapId === selectedSnapId) ?? null
        : null,
    [chartData, selectedSnapId]
  );

  const handleSelectSnapshot = useCallback(
    (snapId: string, scrollIntoTimeline = false) => {
      triggerHaptic("light");
      setSelectedSnapId((prev) => (prev === snapId ? null : snapId));
      if (scrollIntoTimeline) {
        setTimeout(() => {
          const el = timelineRefs.current[snapId];
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }, 40);
      }
    },
    []
  );

  const handleStepSnapshot = useCallback(
    (dir: -1 | 1) => {
      if (chartData.length === 0) return;
      triggerHaptic("light");
      if (!selectedSnapId) {
        const startIdx = dir === -1 ? chartData.length - 1 : 0;
        setSelectedSnapId(chartData[startIdx].snapId);
        return;
      }
      const currIdx = chartData.findIndex((d) => d.snapId === selectedSnapId);
      if (currIdx === -1) {
        setSelectedSnapId(chartData[chartData.length - 1].snapId);
        return;
      }
      const nextIdx = Math.max(
        0,
        Math.min(chartData.length - 1, currIdx + dir)
      );
      setSelectedSnapId(chartData[nextIdx].snapId);
    },
    [chartData, selectedSnapId]
  );

  const handleChartKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (chartData.length === 0) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handleStepSnapshot(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleStepSnapshot(1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedSnapId(chartData[0].snapId);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelectedSnapId(chartData[chartData.length - 1].snapId);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 10);
  };

  if (!isOpen || !unitId || !currentUnit) return null;

  const tierKey = getTier(currentUnit);
  const tierCfg = TIER_CONFIG[tierKey] || {
    badgeColor: "#5865F2",
    label: tierKey,
  };
  const proxyUrl = getProxyImage(currentUnit.id, currentUnit.imageUrl);
  const latestSnap = rangeSummary.latestSnap;

  const statusCfg =
    GRID_STATUS_CFG[
      (latestSnap?.status ||
        currentUnit.status ||
        "stable") as keyof typeof GRID_STATUS_CFG
    ];

  const metricConfigs: Record<
    Metric,
    {
      label: string;
      color: string;
      gradientId: string;
      unitLabel: string;
    }
  > = {
    value: {
      label: "Value History",
      color: "var(--primary)",
      gradientId: "valueGrad",
      unitLabel: "Value",
    },
    rarity: {
      label: "Rarity History",
      color: "#4DB6AC",
      gradientId: "rarityGrad",
      unitLabel: "Rarity",
    },
    liquidity: {
      label: "Liquidity History",
      color: "#81C784",
      gradientId: "liqGrad",
      unitLabel: "Liquidity",
    },
  };

  const currentConfig = metricConfigs[activeMetric];

  const currentValFormatted =
    currentUnit.value === "owner" ||
    currentUnit.valueDisplay === "Owner's Choice" ||
    currentUnit.valueDisplay === "O/C"
      ? "Owner's Choice"
      : currentUnit.valueDisplay ||
        (typeof currentUnit.value === "number"
          ? currentUnit.value.toLocaleString()
          : "—");

  const currentRarityVal = latestSnap?.rarity ?? currentUnit.rarity ?? 0;
  const currentLiqVal = formatLiquidityLabel(
    latestSnap?.liquidity ?? currentUnit.liquidity
  );

  // Determine which snapshot shift is displayed in the "Latest Shift" / "Selected Snapshot" panel
  const activeShiftEvent: TimelineEvent | null = selectedPoint
    ? selectedPoint.prevSnap && selectedPoint.changedFields.length > 0
      ? {
          id: selectedPoint.snapId,
          snap: selectedPoint.fullSnap,
          prev: selectedPoint.prevSnap,
          dateFormatted: selectedPoint.fullDate,
          relativeTime: selectedPoint.relativeTime,
          changed: selectedPoint.changedFields,
        }
      : null
    : timeline[0] ?? null;

  const compareTargetCurr =
    selectedPoint?.fullSnap ??
    latestSnap ??
    displayHistory[displayHistory.length - 1];
  const compareTargetPrev =
    compareMode === "baseline"
      ? rangeSummary.firstSnap ?? null
      : (compareTargetCurr
          ? predecessorMap.get(compareTargetCurr.id)
          : null) ??
        timeline[0]?.prev ??
        null;

  const handleAddToVault = async () => {
    triggerHaptic("medium");
    if (!profile) {
      addToast("Sign in with Discord to save units to your Vault.", "warning", {
        action: {
          label: "Login",
          onClick: () => {
            void loginWithDiscord();
          },
        },
      });
      return;
    }

    if (isVaultPending) return;
    setIsVaultPending(true);
    try {
      await addOrUpdateUnit(profile.id, currentUnit.id, 1);
      addToast(`Added 1× ${currentUnit.name} to your Vault.`, "success", {
        dedupeKey: `history-vault-${currentUnit.id}`,
      });
    } catch {
      addToast(
        `Could not save ${currentUnit.name} to your Vault. Change was rolled back.`,
        "error",
        {
          action: {
            label: "Retry",
            onClick: () => {
              void handleAddToVault();
            },
          },
        }
      );
    } finally {
      setIsVaultPending(false);
    }
  };

  const handleToggleWishlist = async () => {
    triggerHaptic("medium");
    if (!profile) {
      addToast("Sign in with Discord to manage your Wishlist.", "warning", {
        action: {
          label: "Login",
          onClick: () => {
            void loginWithDiscord();
          },
        },
      });
      return;
    }

    if (isWishlistPending) return;
    const wasWishlisted = isWishlisted;
    setIsWishlistPending(true);
    try {
      await toggleWishlist(profile.id, currentUnit.id);
      addToast(
        wasWishlisted
          ? `Removed ${currentUnit.name} from Target Wishlist.`
          : `Added ${currentUnit.name} to Target Wishlist.`,
        "success",
        {
          dedupeKey: `history-wishlist-${currentUnit.id}`,
        }
      );
    } catch {
      addToast(
        `Could not update Wishlist for ${currentUnit.name}. Change was rolled back.`,
        "error",
        {
          action: {
            label: "Retry",
            onClick: () => {
              void handleToggleWishlist();
            },
          },
        }
      );
    } finally {
      setIsWishlistPending(false);
    }
  };

  const handleCopySummary = async () => {
    const lines: string[] = [
      `${currentUnit.name} (${currentUnit.subtitle || "Official Unit"}) — Tier ${tierKey}`,
      `Value: ${currentValFormatted}${
        rangeSummary.valuePct !== null
          ? ` (${
              rangeSummary.valuePct >= 0 ? "+" : ""
            }${rangeSummary.valuePct.toFixed(1)}% vs ${
              rangeSummary.baselineDate
            })`
          : ""
      }`,
      `Status: ${statusCfg?.label || currentUnit.status || "Stable"} | Rarity: ${currentRarityVal}/20 | Liquidity: ${currentLiqVal}`,
    ];

    if (timeline.length > 0) {
      const recent = timeline.slice(0, 3).map((ev) => {
        const parts: string[] = [];
        if (ev.changed.includes("Value")) {
          parts.push(
            `Value ${formatSnapValue(ev.prev)} -> ${formatSnapValue(ev.snap)}`
          );
        }
        if (ev.changed.includes("Status")) {
          parts.push(`Status ${ev.prev.status} -> ${ev.snap.status}`);
        }
        if (ev.changed.includes("Rarity")) {
          parts.push(`Rarity ${ev.prev.rarity} -> ${ev.snap.rarity}`);
        }
        if (ev.changed.includes("Liquidity")) {
          parts.push(
            `Liq ${formatLiquidityLabel(
              ev.prev.liquidity
            )} -> ${formatLiquidityLabel(ev.snap.liquidity)}`
          );
        }
        return `• ${formatShortDate(ev.snap.recorded_at)}: ${parts.join(", ")}`;
      });
      lines.push("Recent Shifts:", ...recent);
    } else {
      lines.push(
        `Snapshots Recorded: ${displayHistory.length} (No shifts in selected range)`
      );
    }

    const text = lines.join("\n");
    const ok = await copyTextWithFallback(text);
    if (ok) {
      triggerHaptic("success");
      setCopyState("copied");
      addToast("Copied market summary to clipboard.", "success");
    } else {
      setCopyState("error");
      addToast(
        "Could not copy market summary automatically. Check browser clipboard permissions.",
        "error"
      );
    }
    setTimeout(() => setCopyState("idle"), 2200);
  };

  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    const isSelected = payload.snapId === selectedSnapId;
    const isMax =
      activeMetric !== "liquidity" &&
      payload.value === rangeSummary.maxVal &&
      plottableChartData.length > 1 &&
      rangeSummary.maxVal !== rangeSummary.minVal;
    const isMin =
      activeMetric !== "liquidity" &&
      payload.value === rangeSummary.minVal &&
      plottableChartData.length > 1 &&
      rangeSummary.minVal !== rangeSummary.maxVal;

    const handleDotClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleSelectSnapshot(payload.snapId, true);
    };

    if (isSelected) {
      return (
        <g onClick={handleDotClick} className="cursor-pointer">
          <circle
            cx={cx}
            cy={cy}
            r={8}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.5}
            opacity={0.9}
          />
          <circle
            cx={cx}
            cy={cy}
            r={4.5}
            fill={currentConfig.color}
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        </g>
      );
    }

    if (isMax) {
      return (
        <g onClick={handleDotClick} className="cursor-pointer">
          <circle
            cx={cx}
            cy={cy}
            r={4}
            fill="#23a559"
            stroke="#111214"
            strokeWidth={1.5}
          />
        </g>
      );
    }

    if (isMin) {
      return (
        <g onClick={handleDotClick} className="cursor-pointer">
          <circle
            cx={cx}
            cy={cy}
            r={4}
            fill="var(--destructive)"
            stroke="#111214"
            strokeWidth={1.5}
          />
        </g>
      );
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={2.5}
        onClick={handleDotClick}
        className="cursor-pointer"
        fill="var(--popover)"
        stroke={currentConfig.color}
        strokeWidth={1.5}
      />
    );
  };

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const point: ChartPoint = payload[0].payload;
    if (!point) return null;

    const snapStatusCfg =
      GRID_STATUS_CFG[
        (point.fullSnap.status || "stable") as keyof typeof GRID_STATUS_CFG
      ];

    return (
      <div
        className="bg-popover border border-border rounded-[6px] p-3 shadow-xl min-w-[200px] max-w-[250px] flex flex-col gap-1.5 pointer-events-none"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <div className="flex items-center justify-between gap-2 text-[11.5px] font-mono text-muted-foreground">
          <span>{point.fullDate}</span>
          {snapStatusCfg && (
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[3px] shrink-0 border shadow-xs"
              style={{
                backgroundColor: snapStatusCfg.bg,
                color: snapStatusCfg.color,
                borderColor: snapStatusCfg.border,
              }}
            >
              {snapStatusCfg.label}
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-3 pt-0.5">
          <span className="text-[12px] text-muted-foreground">
            {currentConfig.unitLabel}
            {point.isRange && activeMetric === "value" ? " (Range)" : ""}
          </span>
          <span className="text-[15px] font-bold font-mono text-foreground">
            {point.displayLabel}
          </span>
        </div>

        {point.prevDisplayLabel !== null &&
          point.deltaFromPrev !== null &&
          point.deltaFromPrev !== 0 && (
            <div className="flex items-center justify-between gap-2 text-[11.5px] font-mono pt-1.5 border-t border-border/60">
              <span className="text-muted-foreground font-sans">
                vs Prev Snapshot
              </span>
              <span
                className={`font-semibold ${
                  point.deltaFromPrev > 0
                    ? "text-[#23a559]"
                    : "text-destructive"
                }`}
              >
                {activeMetric === "liquidity"
                  ? `${point.prevDisplayLabel} → ${point.displayLabel}`
                  : `${
                      point.deltaFromPrev > 0 ? "+" : "−"
                    }${Math.abs(point.deltaFromPrev).toLocaleString()}${
                      point.pctFromPrev !== null
                        ? ` (${
                            point.pctFromPrev >= 0 ? "+" : "−"
                          }${Math.abs(point.pctFromPrev).toFixed(1)}%)`
                        : ""
                    }`}
              </span>
            </div>
          )}
      </div>
    );
  };

  const hasUnitContext = Boolean(
    currentUnit.notice ||
      (currentUnit.secondaryTags && currentUnit.secondaryTags.length > 0)
  );

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[1000000] flex items-center justify-center p-0 sm:p-4 md:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${currentUnit.name} market history`}
      aria-labelledby="history-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/85 transition-opacity"
        onClick={() => {
          triggerHaptic("light");
          closeModal();
        }}
      />

      <div className="bg-card border border-border rounded-none sm:rounded-[10px] w-full h-full sm:h-auto sm:max-w-5xl sm:max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden animate-slide-up">
        <div
          className="absolute top-0 left-0 right-0 h-[2px] z-[200]"
          style={{ background: tierCfg.badgeColor }}
        />

        {/* SECTION A: Unit Header */}
        <header
          className={`px-4 sm:px-6 py-4 shrink-0 z-[100] bg-popover transition-colors ${
            isScrolled
              ? "border-b border-border shadow-sm"
              : "border-b border-border/80"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center justify-between sm:justify-start gap-3.5 min-w-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative overflow-hidden bg-black/30 flex items-center justify-center border border-border w-12 h-12 rounded-[6px] shrink-0">
                  <div
                    className="absolute inset-0 flex items-center justify-center text-white font-bold text-base z-0"
                    style={getAvatarStyle(currentUnit.name)}
                  >
                    {getInitials(currentUnit.name)}
                  </div>
                  {proxyUrl && (
                    <img
                      src={proxyUrl}
                      alt={currentUnit.name}
                      className="absolute inset-0 w-full h-full object-cover z-10"
                      style={{ objectPosition: "center 15%" }}
                      onError={(e) => handleImageError(e, currentUnit.id)}
                    />
                  )}
                </div>

                <div className="flex flex-col min-w-0 gap-0.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2
                      id="history-modal-title"
                      className="text-foreground text-[18px] sm:text-[20px] font-bold tracking-tight truncate leading-snug"
                    >
                      {currentUnit.name}
                    </h2>
                    {statusCfg && (
                      <span
                        className="text-[10.5px] font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded-[4px] border inline-flex items-center gap-1 leading-none shadow-xs select-none"
                        style={{
                          backgroundColor: statusCfg.bg,
                          color: statusCfg.color,
                          borderColor: statusCfg.border,
                        }}
                      >
                        <StatusIcon status={currentUnit.status} />
                        <span className="leading-none relative -top-[0.5px]">
                          {statusCfg.label}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground truncate">
                    <span className="truncate">
                      {currentUnit.subtitle || "Official Unit"}
                    </span>
                    <span className="text-border">·</span>
                    <span
                      className="font-semibold"
                      style={{ color: tierCfg.badgeColor }}
                    >
                      Tier {tierKey}
                    </span>
                    {currentUnit.obtainability && (
                      <>
                        <span className="text-border">·</span>
                        <span className="text-muted-foreground truncate">
                          {currentUnit.obtainability}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  closeModal();
                }}
                aria-label="Close"
                className="sm:hidden text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 cursor-pointer"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="w-4 h-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 4L12 12M12 4L4 12" />
                </svg>
              </button>
            </div>

            <div
              className="flex items-center gap-1.5 flex-wrap shrink-0"
              aria-live="polite"
            >
              <button
                type="button"
                onClick={() => void handleAddToVault()}
                disabled={isVaultPending}
                className="px-2.5 py-1.5 rounded-[4px] border border-[#23a559]/40 bg-[#23a559] hover:bg-[#1f934f] disabled:opacity-50 text-white text-[11.5px] font-bold font-mono uppercase tracking-wider tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23a559] cursor-pointer shadow-xs"
                title={
                  profile
                    ? "Add 1 copy to your Vault"
                    : "Sign in with Discord to save to your Vault"
                }
              >
                {isVaultPending
                  ? "Saving…"
                  : `+Vault${vaultQty > 0 ? `\u00A0(${vaultQty})` : ""}`}
              </button>

              <button
                type="button"
                onClick={() => void handleToggleWishlist()}
                disabled={isWishlistPending}
                aria-pressed={isWishlisted}
                className={`px-2.5 py-1.5 rounded-[4px] border text-[11.5px] font-bold font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shadow-xs ${
                  isWishlisted
                    ? "border-[#8b5cf6]/40 bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                    : "border-border bg-card hover:bg-muted text-foreground"
                }`}
                title={
                  profile
                    ? isWishlisted
                      ? "Remove from Target Wishlist"
                      : "Add to Target Wishlist"
                    : "Sign in with Discord to manage your Wishlist"
                }
              >
                <span className="flex items-center gap-1.5">
                  <GiRoundStar className={`w-3.5 h-3.5 ${isWishlisted ? "text-amber-300" : "text-muted-foreground"}`} />
                  <span>
                    {isWishlistPending
                      ? "Saving…"
                      : isWishlisted
                      ? "Wishlisted"
                      : "Wishlist"}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3 py-1.5 rounded-[6px] border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer flex items-center gap-1.5"
                title="Copy plain-text market summary to clipboard"
                aria-label="Copy market summary"
              >
                {copyState === "copied" ? (
                  <span className="text-[#23a559] font-semibold">
                    Copied Summary
                  </span>
                ) : copyState === "error" ? (
                  <span className="text-destructive font-semibold">
                    Copy Failed
                  </span>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="w-3.5 h-3.5 shrink-0"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="5" y="5" width="8" height="8" rx="1.5" />
                      <path d="M3 11V3.5C3 2.95 3.45 2.5 4 2.5H11" />
                    </svg>
                    <span className="hidden md:inline">Copy Summary</span>
                  </>
                )}
              </button>

              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  closeModal();
                }}
                aria-label="Close"
                className="hidden sm:inline-flex text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 cursor-pointer"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="w-4 h-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 4L12 12M12 4L4 12" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Body */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 flex flex-col gap-6"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {/* UPPER WORKSPACE: Left Overview (4 cols) + Right Chart (8 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Current Statistics, Latest Shift, Unit Notes */}
            <div className="lg:col-span-4 flex flex-col gap-4 min-w-0">
              {/* SECTION B: Current Market Statistics (Unified Group) */}
              <section
                aria-label="Current market statistics"
                className="flex flex-col gap-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[13px] font-semibold text-foreground">
                    Market Statistics
                  </h3>
                  <span className="text-[11.5px] text-muted-foreground">
                    Select to switch chart
                  </span>
                </div>

                <div
                  role="tablist"
                  aria-label="Select historical metric to chart"
                  className="rounded-[8px] border border-border bg-popover overflow-hidden divide-y divide-border"
                >
                  {/* Primary Statistic: Current Value */}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeMetric === "value"}
                    onClick={() => {
                      triggerHaptic("light");
                      setActiveMetric("value");
                    }}
                    className={`w-full px-4 py-3.5 text-left transition-colors relative flex flex-col gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                      activeMetric === "value"
                        ? "bg-primary/[0.08]"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    {activeMetric === "value" && (
                      <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-primary" />
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-muted-foreground flex items-center gap-1.5">
                        Current Value
                        {activeMetric === "value" && (
                          <span className="text-[10.5px] font-semibold text-primary">
                            · Charting
                          </span>
                        )}
                      </span>
                      {rangeSummary.valuePct !== null && (
                        <span
                          className={`text-[12px] font-semibold font-mono ${
                            rangeSummary.valuePct >= 0
                              ? "text-[#23a559]"
                              : "text-destructive"
                          }`}
                          title={
                            rangeSummary.baselineDate
                              ? `Change since ${rangeSummary.baselineDate}`
                              : undefined
                          }
                        >
                          {rangeSummary.valuePct >= 0 ? "+" : "−"}
                          {Math.abs(rangeSummary.valuePct).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[22px] sm:text-[24px] font-bold font-mono text-foreground tracking-tight truncate">
                        {currentValFormatted}
                      </span>
                      {rangeSummary.valueDelta !== null &&
                        rangeSummary.valueDelta !== 0 && (
                          <span className="text-[11.5px] font-mono text-muted-foreground">
                            {rangeSummary.valueDelta > 0 ? "+" : "−"}
                            {Math.abs(rangeSummary.valueDelta).toLocaleString()}{" "}
                            ({rangeFilter})
                          </span>
                        )}
                    </div>
                  </button>

                  {/* Secondary Statistics Row: Rarity & Liquidity */}
                  <div className="grid grid-cols-2 divide-x divide-border">
                    {/* Rarity */}
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeMetric === "rarity"}
                      onClick={() => {
                        triggerHaptic("light");
                        setActiveMetric("rarity");
                      }}
                      className={`px-4 py-3 text-left transition-colors relative flex flex-col gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4DB6AC] ${
                        activeMetric === "rarity"
                          ? "bg-[#4DB6AC]/[0.08]"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      {activeMetric === "rarity" && (
                        <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#4DB6AC]" />
                      )}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[12px] font-medium text-muted-foreground">
                          Rarity
                        </span>
                        {activeMetric === "rarity" ? (
                          <span className="text-[10.5px] font-semibold text-[#4DB6AC]">
                            Charting
                          </span>
                        ) : (
                          rangeSummary.rarityDelta !== null &&
                          rangeSummary.rarityDelta !== 0 && (
                            <span className="text-[11px] font-mono font-semibold text-[#4DB6AC]">
                              {rangeSummary.rarityDelta > 0 ? "+" : "−"}
                              {Math.abs(rangeSummary.rarityDelta)}
                            </span>
                          )
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-[17px] font-bold text-[#4DB6AC]">
                          {currentRarityVal}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          / 20
                        </span>
                      </div>
                    </button>

                    {/* Liquidity */}
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeMetric === "liquidity"}
                      onClick={() => {
                        triggerHaptic("light");
                        setActiveMetric("liquidity");
                      }}
                      className={`px-4 py-3 text-left transition-colors relative flex flex-col gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#81C784] ${
                        activeMetric === "liquidity"
                          ? "bg-[#81C784]/[0.08]"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      {activeMetric === "liquidity" && (
                        <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#81C784]" />
                      )}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[12px] font-medium text-muted-foreground">
                          Liquidity
                        </span>
                        {activeMetric === "liquidity" && (
                          <span className="text-[10.5px] font-semibold text-[#81C784]">
                            Charting
                          </span>
                        )}
                      </div>
                      <span className="text-[16px] font-bold font-mono text-[#81C784] truncate">
                        {currentLiqVal}
                      </span>
                    </button>
                  </div>
                </div>
              </section>

              {/* SECTION C: Latest Shift / Selected Snapshot (Distinct Region) */}
              <section
                aria-label="Latest market shift and comparison"
                className="rounded-[8px] border border-border bg-popover/60 p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-semibold text-foreground">
                        {selectedPoint ? "Selected Snapshot" : "Latest Shift"}
                      </h3>
                      {selectedPoint && (
                        <button
                          type="button"
                          onClick={() => setSelectedSnapId(null)}
                          className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                        >
                          Reset to latest
                        </button>
                      )}
                    </div>
                    {activeShiftEvent ? (
                      <span className="text-[11.5px] font-mono text-muted-foreground">
                        {activeShiftEvent.dateFormatted} ·{" "}
                        {activeShiftEvent.relativeTime}
                      </span>
                    ) : selectedPoint ? (
                      <span className="text-[11.5px] font-mono text-muted-foreground">
                        {selectedPoint.fullDate} · {selectedPoint.relativeTime}
                      </span>
                    ) : null}
                  </div>

                  {displayHistory.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setIsCompareOpen((v) => !v);
                      }}
                      aria-expanded={isCompareOpen}
                      className={`px-2.5 py-1 rounded-[5px] text-[11.5px] font-medium border transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isCompareOpen
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isCompareOpen ? "Hide Compare" : "Compare"}
                    </button>
                  )}
                </div>

                {/* Shift Rows */}
                {activeShiftEvent ? (
                  <div className="pt-2 border-t border-border/60">
                    <SnapshotDiffList
                      curr={activeShiftEvent.snap}
                      prev={activeShiftEvent.prev}
                      changed={activeShiftEvent.changed}
                      compact
                    />
                  </div>
                ) : selectedPoint ? (
                  <p className="text-[12.5px] text-muted-foreground pt-2 border-t border-border/60">
                    Initial baseline snapshot in this sequence (
                    <span className="font-mono text-foreground font-semibold">
                      {selectedPoint.displayLabel}
                    </span>
                    ). No prior snapshot to diff against.
                  </p>
                ) : (
                  <p className="text-[12.5px] text-muted-foreground">
                    No recorded field changes in the {rangeFilter} window.
                  </p>
                )}

                {/* Optional Snapshot Comparison Tool */}
                {isCompareOpen && compareTargetCurr && compareTargetPrev && (
                  <div className="pt-3 border-t border-border flex flex-col gap-2.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-semibold text-foreground">
                          Snapshot Comparison
                        </span>
                        <div
                          className="inline-flex items-center bg-card rounded-[5px] border border-border p-0.5"
                          role="group"
                          aria-label="Comparison baseline"
                        >
                          <button
                            type="button"
                            onClick={() => setCompareMode("previous")}
                            className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium transition-colors cursor-pointer ${
                              compareMode === "previous"
                                ? "bg-popover text-foreground font-semibold shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Prev Snapshot
                          </button>
                          <button
                            type="button"
                            onClick={() => setCompareMode("baseline")}
                            className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium transition-colors cursor-pointer ${
                              compareMode === "baseline"
                                ? "bg-popover text-foreground font-semibold shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Range Start
                          </button>
                        </div>
                      </div>
                      <span className="text-[11.5px] font-mono text-muted-foreground">
                        Comparing{" "}
                        {formatShortDate(compareTargetPrev.recorded_at)} →{" "}
                        <strong className="text-foreground font-semibold">
                          {compareTargetCurr.id === "live-now"
                            ? "Current"
                            : formatShortDate(compareTargetCurr.recorded_at)}
                        </strong>
                      </span>
                    </div>

                    <div className="rounded-[6px] bg-black/25 border border-border/60 px-3 py-1.5 divide-y divide-border/50 text-[12.5px]">
                      {(
                        [
                          {
                            label: "Value",
                            before: formatSnapValue(compareTargetPrev),
                            after: formatSnapValue(compareTargetCurr),
                          },
                          {
                            label: "Status",
                            before: compareTargetPrev.status || "stable",
                            after: compareTargetCurr.status || "stable",
                          },
                          {
                            label: "Rarity",
                            before: `${compareTargetPrev.rarity ?? 0} / 20`,
                            after: `${compareTargetCurr.rarity ?? 0} / 20`,
                          },
                          {
                            label: "Liquidity",
                            before: formatLiquidityLabel(
                              compareTargetPrev.liquidity
                            ),
                            after: formatLiquidityLabel(
                              compareTargetCurr.liquidity
                            ),
                          },
                        ] as const
                      ).map((row) => {
                        const isSame =
                          row.before.toLowerCase() === row.after.toLowerCase();
                        return (
                          <div
                            key={row.label}
                            className="py-1.5 flex items-center justify-between gap-2"
                          >
                            <span className="text-[12px] text-muted-foreground">
                              {row.label}
                            </span>
                            {isSame ? (
                              <span className="font-mono text-[12px] text-muted-foreground capitalize">
                                {row.after}{" "}
                                <span className="text-[11px] opacity-60 font-sans">
                                  (unchanged)
                                </span>
                              </span>
                            ) : (
                              <span className="font-mono font-semibold text-foreground capitalize">
                                <span className="text-muted-foreground font-normal">
                                  {row.before}
                                </span>{" "}
                                → {row.after}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* SECTION D: Unit Notice & Market Tags (Separate Background Context) */}
              {hasUnitContext && (
                <section
                  aria-label="Unit notice and market tags"
                  className="rounded-[8px] border border-border/80 bg-popover/30 p-4 flex flex-col gap-3"
                >
                  <h3 className="text-[13px] font-semibold text-foreground">
                    Unit Notes & Context
                  </h3>

                  {currentUnit.notice && (
                    <p className="text-[13px] text-foreground/90 leading-relaxed">
                      {currentUnit.notice}
                    </p>
                  )}

                  {currentUnit.secondaryTags &&
                    currentUnit.secondaryTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {currentUnit.secondaryTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11.5px] font-medium px-2.5 py-0.5 rounded-[4px] bg-muted/70 text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                </section>
              )}
            </div>

            {/* RIGHT COLUMN: Historical Chart Workspace (Section E) */}
            <section
              aria-label="Historical chart"
              className="lg:col-span-8 flex flex-col gap-2 min-w-0"
            >
              {/* Chart Header: 1. Metric, 2. Time Range, 3. Snapshot Count */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: currentConfig.color }}
                      aria-hidden="true"
                    />
                    <h3 className="text-foreground text-[14px] font-semibold">
                      {currentConfig.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground flex-wrap">
                    <span className="font-mono">
                      {filteredHistory.length} snapshot
                      {filteredHistory.length === 1 ? "" : "s"} in range
                    </span>
                    {activeMetric !== "liquidity" &&
                      plottableChartData.length > 1 && (
                        <>
                          <span className="text-border">·</span>
                          <span className="font-mono">
                            High{" "}
                            <strong className="text-foreground font-semibold">
                              {rangeSummary.maxVal.toLocaleString()}
                            </strong>
                          </span>
                          <span className="text-border">·</span>
                          <span className="font-mono">
                            Low{" "}
                            <strong className="text-foreground font-semibold">
                              {rangeSummary.minVal.toLocaleString()}
                            </strong>
                          </span>
                        </>
                      )}
                    {activeMetric === "liquidity" &&
                      filteredHistory.length > 1 && (
                        <>
                          <span className="text-border">·</span>
                          <span className="font-mono">
                            {rangeSummary.liqStart} →{" "}
                            <strong className="text-foreground font-semibold">
                              {rangeSummary.liqEnd}
                            </strong>
                          </span>
                        </>
                      )}
                    {activeMetric === "value" && ocSnapshotCount > 0 && (
                      <span className="text-[#FAA61A] font-mono">
                        · {ocSnapshotCount} O/C
                      </span>
                    )}
                  </div>
                </div>

                {/* Time Range Filter: 7D, 30D, 90D, ALL */}
                <div
                  className="inline-flex items-center bg-popover p-0.5 rounded-[6px] border border-border font-mono"
                  role="group"
                  aria-label="Filter chart by time range"
                >
                  {(["7D", "30D", "90D", "ALL"] as const).map((rk) => {
                    const active = rangeFilter === rk;
                    const disabled =
                      rk !== "ALL" && displayHistory.length <= 1;
                    return (
                      <button
                        key={rk}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          triggerHaptic("light");
                          setRangeFilter(rk);
                        }}
                        className={`px-3 py-1 rounded-[5px] text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          disabled
                            ? "opacity-40 cursor-not-allowed text-muted-foreground"
                            : active
                            ? "bg-primary text-primary-foreground shadow-sm cursor-pointer"
                            : "text-muted-foreground hover:text-foreground cursor-pointer"
                        }`}
                        title={
                          rk === "ALL"
                            ? `Show all ${rangeCounts.ALL} snapshots`
                            : `Filter to last ${rk} (${rangeCounts[rk]} snapshots)`
                        }
                      >
                        {rk}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Unified Chart Frame + Snapshot Inspector Bar */}
              <div className="rounded-[8px] border border-border bg-popover overflow-hidden flex flex-col">
                {/* Plotting Area */}
                {showChartSkeleton ? (
                  <div className="h-[290px] p-6 flex flex-col justify-between animate-pulse">
                    <div className="h-full w-full flex flex-col justify-evenly">
                      <div className="border-t border-border/40" />
                      <div className="border-t border-border/40" />
                      <div className="border-t border-border/40" />
                    </div>
                  </div>
                ) : error ? (
                  <div className="h-[290px] flex flex-col items-center justify-center text-center p-6 gap-1.5">
                    <span className="text-[14px] font-semibold text-destructive">
                      Unable to Load Unit History
                    </span>
                    <p className="text-[12.5px] text-muted-foreground max-w-sm">
                      {error}
                    </p>
                  </div>
                ) : displayHistory.length <= 1 ? (
                  <div className="flex flex-col items-center justify-center h-[290px] text-center p-6 gap-2">
                    <p className="text-foreground font-semibold text-[14px]">
                      Baseline Snapshot Recorded
                    </p>
                    <p className="text-muted-foreground text-[13px] max-w-md leading-relaxed">
                      {currentUnit.name} currently has 1 recorded snapshot (
                      <span className="text-foreground font-mono font-semibold">
                        {currentValFormatted}
                      </span>
                      , Rarity {currentRarityVal}/20, {currentLiqVal}{" "}
                      liquidity). Historical trend lines appear as soon as a
                      second snapshot is recorded.
                    </p>
                  </div>
                ) : activeMetric === "value" &&
                  plottableChartData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[290px] text-center p-6 gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-foreground font-semibold text-[14px]">
                        Owner’s Choice (Non-Numeric Value)
                      </p>
                      <p className="text-muted-foreground text-[13px] max-w-md leading-relaxed">
                        This unit is valued as Owner’s Choice (O/C) in the
                        selected range and cannot be plotted on a numeric scale.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveMetric("rarity")}
                        className="px-3 py-1.5 rounded-[6px] bg-card hover:bg-muted border border-border text-foreground text-[12px] font-medium transition-colors cursor-pointer"
                      >
                        View Rarity Chart
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMetric("liquidity")}
                        className="px-3 py-1.5 rounded-[6px] bg-card hover:bg-muted border border-border text-foreground text-[12px] font-medium transition-colors cursor-pointer"
                      >
                        View Liquidity Chart
                      </button>
                    </div>
                  </div>
                ) : plottableChartData.length === 1 ? (
                  <div className="flex flex-col items-center justify-center h-[290px] text-center p-6 gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-foreground font-semibold text-[14px]">
                        Single Snapshot in {rangeFilter} Range
                      </p>
                      <p className="text-muted-foreground text-[13px] max-w-md leading-relaxed">
                        Only 1 plottable snapshot (
                        <span className="text-foreground font-mono font-semibold">
                          {plottableChartData[0].displayLabel}
                        </span>{" "}
                        on {plottableChartData[0].fullDate}) falls within this
                        time window.
                      </p>
                    </div>
                    {rangeFilter !== "ALL" && (
                      <button
                        type="button"
                        onClick={() => setRangeFilter("ALL")}
                        className="px-3.5 py-1.5 rounded-[6px] bg-primary text-primary-foreground text-[12px] font-semibold transition-colors cursor-pointer"
                      >
                        Switch to ALL ({displayHistory.length} snapshots)
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label={`${currentConfig.label} interactive chart. Use Left and Right arrow keys to step through snapshots.`}
                    onKeyDown={handleChartKeyDown}
                    className="h-[280px] sm:h-[300px] w-full p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary flex items-center justify-center relative"
                  >
                    {RechartsLib ? (
                      (() => {
                        const {
                          AreaChart,
                          Area,
                          XAxis,
                          YAxis,
                          Tooltip,
                          ResponsiveContainer,
                          CartesianGrid,
                          ReferenceLine,
                        } = RechartsLib;
                        const dataForChart =
                          activeMetric === "value"
                            ? plottableChartData
                            : chartData;
                        return (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={dataForChart}
                              onClick={(state: any) => {
                                const payload =
                                  state?.activePayload?.[0]?.payload;
                                if (payload?.snapId) {
                                  handleSelectSnapshot(payload.snapId, false);
                                }
                              }}
                              margin={{
                                top: 12,
                                right: 14,
                                left: 0,
                                bottom: 4,
                              }}
                            >
                              <defs>
                                <linearGradient
                                  id={currentConfig.gradientId}
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor={currentConfig.color}
                                    stopOpacity={0.22}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor={currentConfig.color}
                                    stopOpacity={0.0}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="2 4"
                                stroke="rgba(255,255,255,0.05)"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="snapId"
                                stroke="var(--muted-foreground)"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tickFormatter={(snapId: string) => {
                                  const pt = dataForChart.find(
                                    (d) => d.snapId === snapId
                                  );
                                  return pt ? pt.axisLabel : "";
                                }}
                              />
                              <YAxis
                                stroke="var(--muted-foreground)"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                width={48}
                                ticks={
                                  activeMetric === "liquidity"
                                    ? [1, 2, 3]
                                    : undefined
                                }
                                tickFormatter={(v: any) =>
                                  activeMetric === "liquidity"
                                    ? v === 3
                                      ? "High"
                                      : v === 2
                                      ? "Avg"
                                      : v === 1
                                      ? "Low"
                                      : ""
                                    : activeMetric === "value" && v >= 1000
                                    ? `${(v / 1000).toFixed(
                                        v % 1000 === 0 ? 0 : 1
                                      )}k`
                                    : v
                                }
                                domain={
                                  activeMetric === "liquidity"
                                    ? [0.5, 3.5]
                                    : ["auto", "auto"]
                                }
                              />
                              <Tooltip
                                cursor={{
                                  stroke: "rgba(255,255,255,0.22)",
                                  strokeWidth: 1,
                                  strokeDasharray: "3 3",
                                }}
                                content={<CustomChartTooltip />}
                              />
                              {selectedSnapId && (
                                <ReferenceLine
                                  x={selectedSnapId}
                                  stroke="#ffffff"
                                  strokeOpacity={0.45}
                                  strokeDasharray="2 2"
                                />
                              )}
                              <Area
                                type={
                                  activeMetric === "liquidity"
                                    ? "stepAfter"
                                    : "monotone"
                                }
                                isAnimationActive={false}
                                dataKey="value"
                                stroke={currentConfig.color}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill={`url(#${currentConfig.gradientId})`}
                                dot={<CustomizedDot />}
                                activeDot={{
                                  r: 5.5,
                                  fill: currentConfig.color,
                                  stroke: "#111214",
                                  strokeWidth: 2,
                                }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        );
                      })()
                    ) : (
                      <span className="text-[12.5px] text-muted-foreground">
                        Loading chart…
                      </span>
                    )}
                  </div>
                )}

                {/* 4 & 5: Snapshot Inspector Bar (Stepping + Selected Point Summary) */}
                {chartData.length > 1 && (
                  <div className="px-4 py-2.5 bg-card/60 border-t border-border flex flex-wrap items-center justify-between gap-3 text-[12px]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepSnapshot(-1)}
                        className="px-2.5 py-1 rounded-[5px] border border-border bg-popover hover:bg-muted text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        title="Inspect previous historical snapshot (Left Arrow)"
                      >
                        ‹ Prev Snapshot
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepSnapshot(1)}
                        className="px-2.5 py-1 rounded-[5px] border border-border bg-popover hover:bg-muted text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        title="Inspect next historical snapshot (Right Arrow)"
                      >
                        Next Snapshot ›
                      </button>
                    </div>

                    {selectedPoint ? (
                      <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                        <span className="font-mono text-muted-foreground">
                          Snapshot{" "}
                          <strong className="text-foreground">
                            {selectedPoint.index + 1} of {chartData.length}
                          </strong>{" "}
                          · {selectedPoint.fullDate} ·{" "}
                          <strong className="text-foreground">
                            {selectedPoint.displayLabel}
                          </strong>
                          {selectedPoint.pctFromPrev !== null &&
                            selectedPoint.pctFromPrev !== 0 && (
                              <span
                                className={`ml-1.5 font-semibold ${
                                  selectedPoint.pctFromPrev > 0
                                    ? "text-[#23a559]"
                                    : "text-destructive"
                                }`}
                              >
                                ({selectedPoint.pctFromPrev > 0 ? "+" : "−"}
                                {Math.abs(selectedPoint.pctFromPrev).toFixed(1)}
                                %)
                              </span>
                            )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedSnapId(null)}
                          className="text-primary hover:underline font-medium cursor-pointer shrink-0"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        Select a chart point or timeline event to inspect a
                        snapshot
                      </span>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* SECTION F: Audit Timeline — Full-Width Historical Record */}
          <section
            aria-label="Audit timeline"
            className="flex flex-col gap-4 w-full pt-6 border-t border-border"
          >
            {/* Timeline Heading & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-baseline gap-2.5">
                <h3 className="text-foreground text-[14px] font-semibold">
                  Audit Timeline
                </h3>
                <span className="text-[12px] font-mono text-muted-foreground">
                  {filteredTimeline.length}{" "}
                  {filteredTimeline.length === 1
                    ? "recorded change"
                    : "recorded changes"}
                </span>
              </div>

              {/* Predictable Filter Toolbar */}
              {timeline.length > 0 && (
                <div
                  className="flex items-center gap-1.5 flex-wrap"
                  role="group"
                  aria-label="Filter timeline by changed field"
                >
                  {(
                    [
                      "All",
                      "Value",
                      "Status",
                      "Rarity",
                      "Liquidity",
                      "Notice",
                    ] as const
                  ).map((f) => {
                    const count = fieldFilterCounts[f];
                    if (f !== "All" && count === 0) return null;
                    const active = timelineFilter === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setTimelineFilter(f);
                        }}
                        className={`px-3 py-1 rounded-[5px] text-[12px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1.5 ${
                          active
                            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                            : "bg-popover/80 border border-border/70 text-muted-foreground hover:text-foreground hover:bg-popover"
                        }`}
                      >
                        <span>{f}</span>
                        <span
                          className={`font-mono text-[11px] ${
                            active ? "opacity-90" : "opacity-65"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timeline Event List */}
            {filteredTimeline.length === 0 ? (
              <div className="py-10 px-6 text-center flex flex-col items-center justify-center gap-2 border border-border rounded-[8px] bg-popover/30">
                <span className="text-[14px] font-semibold text-foreground">
                  {timeline.length === 0
                    ? "No Recorded Shifts Yet"
                    : `No ${timelineFilter} Changes in ${rangeFilter} Range`}
                </span>
                <p className="text-[13px] text-muted-foreground max-w-md">
                  {timeline.length === 0
                    ? `All snapshots for ${currentUnit.name} in this time window match its baseline values.`
                    : `No events modified ${timelineFilter.toLowerCase()} during this period.`}
                </p>
                {timelineFilter !== "All" && (
                  <button
                    type="button"
                    onClick={() => setTimelineFilter("All")}
                    className="mt-1 px-3 py-1.5 rounded-[6px] bg-primary text-primary-foreground text-[12px] font-semibold transition-colors cursor-pointer"
                  >
                    Return to All ({timeline.length})
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-[8px] border border-border bg-popover/40 divide-y divide-border overflow-hidden">
                {filteredTimeline.map((t) => {
                  const isSelected = selectedSnapId === t.id;
                  const isExpanded = !!expandedEventIds[t.id];

                  return (
                    <div
                      key={t.id}
                      ref={(el) => {
                        timelineRefs.current[t.id] = el;
                      }}
                      className={`transition-colors relative ${
                        isSelected ? "bg-primary/[0.06]" : ""
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-primary z-10" />
                      )}

                      {/* LEVEL 1: Event Summary */}
                      <div
                        onClick={() => handleSelectSnapshot(t.id, false)}
                        className="px-4 py-3.5 sm:px-5 sm:py-4 grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 md:gap-6 items-start md:items-center cursor-pointer hover:bg-popover/80 transition-colors"
                      >
                        {/* Timestamp Column */}
                        <div className="flex md:flex-col items-baseline md:items-start justify-between gap-2">
                          <span className="text-[12.5px] font-mono font-semibold text-foreground">
                            {t.dateFormatted}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11.5px] font-mono text-muted-foreground">
                              {t.relativeTime}
                            </span>
                            {isSelected && (
                              <span className="text-[10.5px] font-semibold text-primary">
                                · Selected
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Structured Field Changes */}
                        <div className="min-w-0">
                          <SnapshotDiffList
                            curr={t.snap}
                            prev={t.prev}
                            changed={t.changed}
                          />
                        </div>

                        {/* Details Action */}
                        <div className="flex items-center justify-end md:self-center">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic("light");
                              setExpandedEventIds((prev) => ({
                                ...prev,
                                [t.id]: !prev[t.id],
                              }));
                            }}
                            className={`px-2.5 py-1 rounded-[5px] text-[11.5px] font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              isExpanded
                                ? "bg-primary/15 border-primary/40 text-primary"
                                : "bg-card/80 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                          >
                            {isExpanded
                              ? "Hide Details ▴"
                              : "Snapshot Details ▾"}
                          </button>
                        </div>
                      </div>

                      {/* LEVEL 2: Expanded Details (Visibly Distinct Recessed Region) */}
                      {isExpanded && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="bg-black/30 border-t border-border px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col gap-3 cursor-default"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[12px] font-semibold text-foreground">
                              Complete Snapshot Record
                            </span>
                            <span className="text-[11.5px] font-mono text-muted-foreground">
                              ID: {t.snap.id.slice(0, 8)} · Recorded{" "}
                              {t.dateFormatted}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11.5px] text-muted-foreground">
                                Recorded Value
                              </span>
                              <span className="text-[13.5px] font-mono font-bold text-foreground">
                                {formatSnapValue(t.snap)}
                              </span>
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11.5px] text-muted-foreground">
                                Market Status
                              </span>
                              <span className="text-[13.5px] font-semibold text-foreground capitalize">
                                {t.snap.status || "stable"}
                              </span>
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11.5px] text-muted-foreground">
                                Rarity Rating
                              </span>
                              <span className="text-[13.5px] font-mono font-bold text-[#4DB6AC]">
                                {t.snap.rarity ?? 0} / 20
                              </span>
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11.5px] text-muted-foreground">
                                Market Liquidity
                              </span>
                              <span className="text-[13.5px] font-mono font-bold text-[#81C784]">
                                {formatLiquidityLabel(t.snap.liquidity)}
                              </span>
                            </div>
                          </div>

                          {(t.prev.notice || t.snap.notice) && (
                            <div className="pt-2.5 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-muted-foreground">
                                  Previous Notice
                                </span>
                                <span className="text-foreground/80 italic leading-relaxed">
                                  {t.prev.notice
                                    ? `“${t.prev.notice}”`
                                    : "None"}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-muted-foreground">
                                  Recorded Notice
                                </span>
                                <span className="text-foreground italic leading-relaxed">
                                  {t.snap.notice
                                    ? `“${t.snap.notice}”`
                                    : "None"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}