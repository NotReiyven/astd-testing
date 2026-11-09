import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { GiCheckMark } from "react-icons/gi";
import { useHistoryModalStore } from "../../../../store/useHistoryModalStore";
import { useUnitHistory, HistorySnapshot } from "../../../../hooks/useUnitHistory";
import { useUnits } from "../../../../context/UnitContext";
import { useAuthStore } from "../../../../store/useAuthStore";
import { useInventoryStore } from "../../../../store/useInventoryStore";
import { useToastStore } from "../../../../store/useToastStore";
import { useShowDelay } from "../../../../hooks/useShowDelay";
import { logger } from "../../../../lib/logger";
import {
  TIER_CONFIG,
  GRID_STATUS_CFG,
  getProxyImage,
  getTier,
  handleImageError,
} from "../../../../data";
import { getAvatarStyle, getInitials } from "../../TradeAnalyzer/summaryUtils";
import { StatusIcon } from "../UnitGrid";
import { triggerHaptic, copyTextWithFallback } from "../../../../data/helpers";
import { AsyncButton } from "../../ui/AsyncButton";

import {
  RangeKey,
  Metric,
  ChangedField,
  TimelineEvent,
  ChartPoint,
  RANGE_DAYS,
  isOwnerChoiceSnap,
  getChangedFields,
  formatRelativeTime,
  formatFullTimestamp,
  formatShortDate,
  formatSnapValue,
  formatLiquidityLabel,
  getSnapNumericValue,
  liquidityToPlotValue,
} from "./formatters";
import { MarketStatsPanel } from "./MarketStatsPanel";
import { HistoricalChart } from "./HistoricalChart";
import { AuditTimeline } from "./AuditTimeline";

type TimelineFilter = "All" | ChangedField;

const METRIC_CONFIGS: Record<
  Metric,
  { label: string; color: string; gradientId: string; unitLabel: string }
> = {
  value: { label: "Value History", color: "var(--primary)", gradientId: "valueGrad", unitLabel: "Value" },
  rarity: { label: "Rarity History", color: "#4DB6AC", gradientId: "rarityGrad", unitLabel: "Rarity" },
  liquidity: { label: "Liquidity History", color: "#81C784", gradientId: "liqGrad", unitLabel: "Liquidity" },
};

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
  const [expandedEventIds, setExpandedEventIds] = useState<Record<string, boolean>>({});
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareMode, setCompareMode] = useState<"previous" | "baseline">("previous");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [isVaultPending, setIsVaultPending] = useState(false);
  const [isWishlistPending, setIsWishlistPending] = useState(false);
  const [diffSinceLastVisit, setDiffSinceLastVisit] = useState<any>(null);
  const [alertValue, setAlertValue] = useState("");
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const currentUnit = useMemo(
    () => (unitId ? units.find((u) => u.id === unitId) ?? null : null),
    [unitId, units]
  );

  // Lifecycle: reset state on open
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
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

  // Lazy-load Recharts
  useEffect(() => {
    if (isOpen && !RechartsLib) {
      import("recharts")
        .then((mod) => setRechartsLib(mod))
        .catch((err) =>
          logger.error("ASTD-UI-012", "Failed to load recharts", { err })
        );
    }
  }, [isOpen, RechartsLib]);

  // Item 12: diff since last visit
  useEffect(() => {
    if (!isOpen || !currentUnit) return;

    const storageKey = `astd_last_viewed_${currentUnit.id}`;
    try {
      const rawLast = localStorage.getItem(storageKey);
      if (rawLast) {
        const last = JSON.parse(rawLast);
        setDiffSinceLastVisit({
          value:
            currentUnit.value !== last.value
              ? { old: last.value, new: currentUnit.value }
              : null,
          status:
            currentUnit.status !== last.status
              ? { old: last.status, new: currentUnit.status }
              : null,
          rarity:
            currentUnit.rarity !== last.rarity
              ? { old: last.rarity, new: currentUnit.rarity }
              : null,
        });
      }
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          value: currentUnit.value,
          status: currentUnit.status,
          rarity: currentUnit.rarity,
          timestamp: Date.now(),
        })
      );
    } catch (err) {
      console.warn("Failed to read/write last viewed state", err);
    }
  }, [isOpen, currentUnit]);

  // Modal close handler
  const handleModalClose = useCallback(() => {
    triggerHaptic("light");
    closeModal();
    if (window.location.pathname.startsWith("/unit/")) {
      window.history.pushState(null, "", "/value-list");
    }
  }, [closeModal]);

  // ESC + Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedSnapId) {
          e.stopPropagation();
          setSelectedSnapId(null);
          return;
        }
        handleModalClose();
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
  }, [isOpen, handleModalClose, selectedSnapId]);

  // URL sync
  useEffect(() => {
    if (!isOpen || !currentUnit) return;
    const targetPath = `/unit/${currentUnit.id}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
  }, [isOpen, currentUnit?.id]);

  useEffect(() => {
    const handlePopState = () => {
      if (
        !window.location.pathname.startsWith("/unit/") &&
        useHistoryModalStore.getState().isOpen
      ) {
        useHistoryModalStore.getState().closeModal();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Derived data: display history
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
          typeof currentUnit.value === "number" ? "number" : String(currentUnit.value),
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
        if (getChangedFields(liveSnap, latestDbSnap).length > 0) {
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
    } as Record<RangeKey, number>;
  }, [displayHistory]);

  const filteredHistory = useMemo<HistorySnapshot[]>(() => {
    if (rangeFilter === "ALL" || displayHistory.length <= 1) return displayHistory;
    const cutoff = Date.now() - RANGE_DAYS[rangeFilter] * 86_400_000;
    const firstIdx = displayHistory.findIndex(
      (s) => new Date(s.recorded_at).getTime() >= cutoff
    );
    if (firstIdx === -1) return displayHistory.slice(-1);
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

  const groupedTimeline = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    filteredTimeline.forEach((t) => {
      const dateKey = formatShortDate(t.snap.recorded_at);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return Object.entries(groups);
  }, [filteredTimeline]);

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
      let displayLabel = "N/A";
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
          pctFromPrev = prevRarity > 0 ? ((plotVal - prevRarity) / prevRarity) * 100 : null;
        }
      } else {
        plotVal = liquidityToPlotValue(snap.liquidity);
        displayLabel = formatLiquidityLabel(snap.liquidity);
        if (prev) {
          prevDisplayLabel = formatLiquidityLabel(prev.liquidity);
          deltaFromPrev = plotVal - liquidityToPlotValue(prev.liquidity);
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

  const rangeSummary = useMemo(() => {
    const latestSnap = filteredHistory[filteredHistory.length - 1];
    const firstSnap = filteredHistory[0];
    const firstNumericSnap = filteredHistory.find(
      (s) => getSnapNumericValue(s) !== null
    );
    const latestNumVal = getSnapNumericValue(latestSnap);
    const baseNumVal = getSnapNumericValue(firstNumericSnap);

    const canCalc = latestNumVal !== null && baseNumVal !== null && baseNumVal > 0 &&
      firstNumericSnap?.id !== latestSnap?.id;
    const valueDelta = canCalc ? (latestNumVal as number) - (baseNumVal as number) : null;
    const valuePct = canCalc ? ((valueDelta as number) / (baseNumVal as number)) * 100 : null;

    const rarityStart = firstSnap?.rarity ?? currentUnit?.rarity ?? 0;
    const rarityEnd = latestSnap?.rarity ?? currentUnit?.rarity ?? 0;

    const numericVals = plottableChartData.map((d) => d.value as number);
    return {
      latestSnap,
      firstSnap,
      firstNumericSnap,
      valueDelta,
      valuePct,
      baselineDate: firstNumericSnap ? formatShortDate(firstNumericSnap.recorded_at) : null,
      rarityDelta: filteredHistory.length > 1 ? rarityEnd - rarityStart : null,
      maxVal: numericVals.length > 0 ? Math.max(...numericVals) : 0,
      minVal: numericVals.length > 0 ? Math.min(...numericVals) : 0,
    };
  }, [filteredHistory, plottableChartData, currentUnit]);

  const selectedPoint = useMemo(
    () => (selectedSnapId ? chartData.find((d) => d.snapId === selectedSnapId) ?? null : null),
    [chartData, selectedSnapId]
  );

  const handleSelectSnapshot = useCallback((snapId: string, scrollIntoTimeline = false) => {
    triggerHaptic("light");
    setSelectedSnapId((prev) => (prev === snapId ? null : snapId));
    if (scrollIntoTimeline) {
      setTimeout(() => {
        const el = timelineRefs.current[snapId];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 40);
    }
  }, []);

  const handleStepSnapshot = useCallback((dir: -1 | 1) => {
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
    const nextIdx = Math.max(0, Math.min(chartData.length - 1, currIdx + dir));
    setSelectedSnapId(chartData[nextIdx].snapId);
  }, [chartData, selectedSnapId]);

  const handleChartKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (chartData.length === 0) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); handleStepSnapshot(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); handleStepSnapshot(1); }
    else if (e.key === "Home") { e.preventDefault(); setSelectedSnapId(chartData[0].snapId); }
    else if (e.key === "End") { e.preventDefault(); setSelectedSnapId(chartData[chartData.length - 1].snapId); }
  };

  if (!isOpen || !unitId || !currentUnit) return null;

  const tierKey = getTier(currentUnit);
  const tierCfg = TIER_CONFIG[tierKey] || { badgeColor: "#5865F2", label: tierKey };
  const proxyUrl = getProxyImage(currentUnit.id, currentUnit.imageUrl);
  const latestSnap = rangeSummary.latestSnap;
  const statusCfg = GRID_STATUS_CFG[latestSnap?.status as keyof typeof GRID_STATUS_CFG] ||
    GRID_STATUS_CFG[currentUnit.status as keyof typeof GRID_STATUS_CFG] ||
    GRID_STATUS_CFG.stable;

  const currentConfig = METRIC_CONFIGS[activeMetric];
  const currentValFormatted =
    currentUnit.value === "owner" ||
    currentUnit.valueDisplay === "Owner's Choice" ||
    currentUnit.valueDisplay === "O/C"
      ? "Owner's Choice"
      : currentUnit.valueDisplay ||
        (typeof currentUnit.value === "number" ? currentUnit.value.toLocaleString() : "N/A");
  const currentRarityVal = latestSnap?.rarity ?? currentUnit.rarity ?? 0;
  const currentLiqVal = formatLiquidityLabel(latestSnap?.liquidity ?? currentUnit.liquidity);
  const ocSnapshotCount = filteredHistory.filter((s) => isOwnerChoiceSnap(s)).length;

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

  const compareTargetCurr = selectedPoint?.fullSnap ?? latestSnap ?? displayHistory[displayHistory.length - 1];
  const compareTargetPrev = compareMode === "baseline"
    ? rangeSummary.firstSnap ?? null
    : (compareTargetCurr ? predecessorMap.get(compareTargetCurr.id) : null) ?? timeline[0]?.prev ?? null;

  const hasUnitContext = Boolean(
    currentUnit.notice || (currentUnit.secondaryTags && currentUnit.secondaryTags.length > 0)
  );

  const handleAddToVault = async () => {
    triggerHaptic("medium");
    if (!profile) {
      addToast("Sign in with Discord to save units to your Vault.", "warning", {
        action: { label: "Login", onClick: () => void loginWithDiscord() },
      });
      return;
    }
    if (isVaultPending) return;
    setIsVaultPending(true);
    try {
      await addOrUpdateUnit(profile.id, currentUnit.id, 1);
      addToast(`Added 1x ${currentUnit.name} to your Vault.`, "success", {
        dedupeKey: `history-vault-${currentUnit.id}`,
      });
    } catch (err) {
      logger.error("ASTD-INV-012", `Failed to add ${currentUnit.name} to vault`, {
        scope: "HistoryModal", action: "handleAddToVault", error: err,
      });
      addToast(`Could not save ${currentUnit.name} to your Vault.`, "error", {
        action: { label: "Retry", onClick: () => void handleAddToVault() },
      });
    } finally {
      setIsVaultPending(false);
    }
  };

  const handleToggleWishlist = async () => {
    triggerHaptic("medium");
    if (!profile) {
      addToast("Sign in with Discord to manage your Wishlist.", "warning", {
        action: { label: "Login", onClick: () => void loginWithDiscord() },
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
        { dedupeKey: `history-wishlist-${currentUnit.id}` }
      );
    } catch (err) {
      logger.error("ASTD-INV-013", `Failed to toggle wishlist`, {
        scope: "HistoryModal", action: "handleToggleWishlist", error: err,
      });
      addToast(`Could not update Wishlist.`, "error", {
        action: { label: "Retry", onClick: () => void handleToggleWishlist() },
      });
    } finally {
      setIsWishlistPending(false);
    }
  };

  const handleShareUnitLink = async () => {
    triggerHaptic("light");
    const link = `${window.location.origin}/unit/${currentUnit.id}`;
    const ok = await copyTextWithFallback(link);
    if (ok) {
      setShareLinkCopied(true);
      addToast(`Copied ${currentUnit.name} link to clipboard.`, "success", {
        dedupeKey: `copy-unit-link-${currentUnit.id}`,
      });
      setTimeout(() => setShareLinkCopied(false), 2000);
    } else {
      addToast("Could not copy link to clipboard.", "error");
    }
  };

  const handleCopySummary = async () => {
    const lines: string[] = [
      `${currentUnit.name} (${currentUnit.subtitle || "Official Unit"}) - Tier ${tierKey}`,
      `Value: ${currentValFormatted}${
        rangeSummary.valuePct !== null
          ? ` (${rangeSummary.valuePct >= 0 ? "+" : ""}${rangeSummary.valuePct.toFixed(1)}% vs ${rangeSummary.baselineDate})`
          : ""
      }`,
      `Status: ${statusCfg.label} | Rarity: ${currentRarityVal}/20 | Liquidity: ${currentLiqVal}`,
    ];
    if (timeline.length > 0) {
      const recent = timeline.slice(0, 3).map((ev) => {
        const parts: string[] = [];
        if (ev.changed.includes("Value")) parts.push(`Value ${formatSnapValue(ev.prev)} -> ${formatSnapValue(ev.snap)}`);
        if (ev.changed.includes("Status")) parts.push(`Status ${ev.prev.status} -> ${ev.snap.status}`);
        if (ev.changed.includes("Rarity")) parts.push(`Rarity ${ev.prev.rarity} -> ${ev.snap.rarity}`);
        if (ev.changed.includes("Liquidity")) parts.push(`Liq ${formatLiquidityLabel(ev.prev.liquidity)} -> ${formatLiquidityLabel(ev.snap.liquidity)}`);
        return `- ${formatShortDate(ev.snap.recorded_at)}: ${parts.join(", ")}`;
      });
      lines.push("Recent Shifts:", ...recent);
    } else {
      lines.push(`Snapshots Recorded: ${displayHistory.length}`);
    }
    const ok = await copyTextWithFallback(lines.join("\n"));
    if (ok) {
      triggerHaptic("success");
      setCopyState("copied");
      addToast("Copied market summary to clipboard.", "success");
    } else {
      setCopyState("error");
      addToast("Could not copy market summary.", "error");
    }
    setTimeout(() => setCopyState("idle"), 2200);
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[1000000] flex items-center justify-center p-0 sm:p-4 md:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${currentUnit.name} market history`}
      aria-labelledby="history-modal-title"
    >
      <div className="absolute inset-0 bg-black/85 transition-opacity" onClick={handleModalClose} />

      <div className="bg-card border border-border rounded-none sm:rounded-[12px] w-full h-full sm:h-auto sm:max-w-6xl sm:max-h-[92vh] flex flex-col relative shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up">
        <div className="absolute top-0 left-0 right-0 h-[3px] z-[200]" style={{ background: tierCfg.badgeColor }} />

        {/* SECTION A: Unit Header */}
        <header
          className={`px-4 sm:px-6 py-4 shrink-0 z-[100] bg-popover transition-shadow ${
            isScrolled ? "border-b border-border shadow-md" : "border-b border-border"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center justify-between sm:justify-start gap-4 min-w-0">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative overflow-hidden bg-[#0b0c0e] flex items-center justify-center border border-border w-14 h-14 rounded-[8px] shrink-0 shadow-sm">
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg z-0" style={getAvatarStyle(currentUnit.name)}>
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

                <div className="flex flex-col min-w-0 gap-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 id="history-modal-title" className="text-foreground text-[20px] sm:text-[24px] font-black tracking-tight truncate leading-none">
                      {currentUnit.name}
                    </h2>
                    {statusCfg && (
                      <span
                        className="text-[10.5px] font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded-[4px] border inline-flex items-center gap-1 leading-none shadow-xs select-none"
                        style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border }}
                      >
                        <StatusIcon status={currentUnit.status} />
                        <span className="leading-none">{statusCfg.label}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground truncate font-medium">
                    <span className="truncate">{currentUnit.subtitle || "Official Unit"}</span>
                    <span className="text-border">•</span>
                    <span className="font-bold" style={{ color: tierCfg.badgeColor }}>Tier {tierKey}</span>
                    {currentUnit.obtainability && (
                      <>
                        <span className="text-border">•</span>
                        <span className="text-muted-foreground truncate">{currentUnit.obtainability}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleModalClose}
                aria-label="Close"
                className="sm:hidden text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-[6px] transition-colors shrink-0 cursor-pointer"
              >
                <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 4L12 12M12 4L4 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0" aria-live="polite">
              <AsyncButton
                type="button"
                size="sm"
                onClick={handleAddToVault}
                isLoading={isVaultPending}
                className="px-3 py-2 rounded-[6px] border border-[#23a559]/40 bg-[#23a559] hover:bg-[#1f934f] text-white text-[12px] font-bold font-mono uppercase tracking-wider tabular-nums transition-colors shadow-sm active:scale-95"
                title={profile ? "Add 1 copy to your Vault" : "Sign in with Discord to save to your Vault"}
              >
                +Vault{vaultQty > 0 ? ` (${vaultQty})` : ""}
              </AsyncButton>

              <AsyncButton
                type="button"
                size="sm"
                variant={isWishlisted ? "default" : "outline"}
                onClick={handleToggleWishlist}
                isLoading={isWishlistPending}
                aria-pressed={isWishlisted}
                className={`px-3 py-2 rounded-[6px] text-[12px] font-bold font-mono uppercase tracking-wider transition-colors shadow-sm active:scale-95 ${
                  isWishlisted
                    ? "border-[#8b5cf6]/40 bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                    : "border-border bg-card hover:bg-muted text-foreground"
                }`}
                title={profile ? (isWishlisted ? "Remove from Target Wishlist" : "Add to Target Wishlist") : "Sign in with Discord to manage your Wishlist"}
              >
                <svg className={`w-3.5 h-3.5 ${isWishlisted ? "text-amber-300" : "text-muted-foreground"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>{isWishlisted ? "Wishlisted" : "Wishlist"}</span>
              </AsyncButton>

              <button
                type="button"
                onClick={handleShareUnitLink}
                className={`px-3 py-2 rounded-[6px] border text-[12px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  shareLinkCopied
                    ? "border-[#23a559]/40 bg-[#23a559]/10 text-[#23a559]"
                    : "border-border bg-card hover:bg-muted text-foreground"
                }`}
                title="Copy shareable link"
              >
                {shareLinkCopied ? (
                  <>
                    <GiCheckMark className="w-3.5 h-3.5 text-[#23a559]" />
                    <span className="font-semibold text-[#23a559]">Copied</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6.5 9.5a3.5 3.5 0 0 0 4.95 0l2-2a3.5 3.5 0 0 0-4.95-4.95l-1 1" />
                      <path d="M9.5 6.5a3.5 3.5 0 0 0-4.95 0l-2 2a3.5 3.5 0 0 0 4.95 4.95l1-1" />
                    </svg>
                    <span className="hidden md:inline">Share</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3 py-2 rounded-[6px] border border-border bg-card hover:bg-muted text-foreground text-[12px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                title="Copy market summary"
              >
                {copyState === "copied" ? (
                  <span className="text-[#23a559] font-semibold">Copied</span>
                ) : copyState === "error" ? (
                  <span className="text-destructive font-semibold">Failed</span>
                ) : (
                  <>
                    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
                onClick={handleModalClose}
                aria-label="Close"
                className="hidden sm:inline-flex text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-[6px] transition-colors shrink-0 cursor-pointer ml-1"
              >
                <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 4L12 12M12 4L4 12" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Body */}
        <div
          ref={scrollRef}
          onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 10)}
          className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 sm:p-6 flex flex-col gap-8 bg-background w-full max-w-full"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full max-w-full min-w-0">
            <MarketStatsPanel
              activeMetric={activeMetric}
              setActiveMetric={setActiveMetric}
              currentUnit={currentUnit}
              latestSnap={latestSnap}
              currentValFormatted={currentValFormatted}
              currentRarityVal={currentRarityVal}
              currentLiqVal={currentLiqVal}
              rangeSummary={rangeSummary}
              rangeFilter={rangeFilter}
              diffSinceLastVisit={diffSinceLastVisit}
              profile={profile}
              currentUnitId={currentUnit.id}
              alertValue={alertValue}
              setAlertValue={setAlertValue}
              activeShiftEvent={activeShiftEvent}
              selectedPoint={selectedPoint}
              displayHistoryLength={displayHistory.length}
              isCompareOpen={isCompareOpen}
              setIsCompareOpen={setIsCompareOpen}
              compareMode={compareMode}
              setCompareMode={setCompareMode}
              compareTargetCurr={compareTargetCurr}
              compareTargetPrev={compareTargetPrev}
              onResetSelection={() => setSelectedSnapId(null)}
              hasUnitContext={hasUnitContext}
            />

            <HistoricalChart
              activeMetric={activeMetric}
              setActiveMetric={setActiveMetric}
              currentConfig={currentConfig}
              filteredHistory={filteredHistory}
              chartData={chartData}
              plottableChartData={plottableChartData}
              rangeSummary={rangeSummary}
              ocSnapshotCount={ocSnapshotCount}
              rangeFilter={rangeFilter}
              setRangeFilter={setRangeFilter}
              displayHistoryLength={displayHistory.length}
              rangeCounts={rangeCounts}
              selectedSnapId={selectedSnapId}
              setSelectedSnapId={setSelectedSnapId}
              selectedPoint={selectedPoint}
              handleSelectSnapshot={handleSelectSnapshot}
              RechartsLib={RechartsLib}
              showChartSkeleton={showChartSkeleton}
              error={error}
              handleChartKeyDown={handleChartKeyDown}
              handleStepSnapshot={handleStepSnapshot}
            />
          </div>

          <AuditTimeline
            filteredTimeline={filteredTimeline}
            groupedTimeline={groupedTimeline}
            timelineFilter={timelineFilter}
            setTimelineFilter={setTimelineFilter}
            fieldFilterCounts={fieldFilterCounts}
            totalTimelineCount={timeline.length}
            rangeFilter={rangeFilter}
            selectedSnapId={selectedSnapId}
            handleSelectSnapshot={handleSelectSnapshot}
            expandedEventIds={expandedEventIds}
            setExpandedEventIds={setExpandedEventIds}
            timelineRefs={timelineRefs}
            unitName={currentUnit.name}
          />
        </div>
      </div>
    </div>
  );
}