import { BulkSelectionDock } from "../shared/BulkSelectionDock";
import {
  useState,
  useDeferredValue,
  useEffect,
  useRef,
  memo,
  useCallback,
} from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { useVirtualizer, defaultRangeExtractor } from "@tanstack/react-virtual";
import { FilterKey } from "../../../types";
import { TIER_CONFIG, FILTERS, getTier } from "../../../data";
import { useUnits } from "../../../context/UnitContext";
import { useTradeStore } from "../../../store/useTradeStore";
import { useToastStore } from "../../../store/useToastStore";
import { useShowDelay } from "../../../hooks/useShowDelay";
import { logger } from "../../../lib/logger";

import { TierGridCard } from "./UnitGrid";
import { UnitListRow, ListHeaderRow } from "./UnitListTable";
import { TierBanner, TierSubHeader } from "./TierSections";
import { CanvasSkeleton } from "./CanvasSkeleton";
import { CanvasControls } from "./CanvasControls";
import { GuideType } from "../guides/AquaGuideOverlay";
import { useCanvasVirtualization } from "./useCanvasVirtualization";
import { useCanvasScroll } from "../../../hooks/useCanvasScroll";
import { triggerHaptic } from "../../../data/helpers";
import { EmptyState } from "../ui/EmptyState";

export const MainCanvas = memo(function MainCanvas({
  activeTierFilter,
  setActiveTierFilter,
  searchQuery,
  setSearchQuery,
  scrollToSection,
  isMobile,
}: {
  activeTierFilter: FilterKey;
  setActiveTierFilter: (f: FilterKey) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  scrollToSection?: { tier: string; sectionId: string } | null;
  startGuide: (type: GuideType) => void;
  guideState?: { type: GuideType | null; step: number };
  isMobile: boolean;
}) {
  const { units: ALL_UNITS, isLoading } = useUnits();
  const showSkeleton = useShowDelay(isLoading);
  const addCard = useTradeStore((s) => s.addCard);

  const [showWelcome] = useState(() => {
    try {
      return localStorage.getItem("astd_welcome_dismissed") !== "true";
    } catch (err) {
      logger.warn("ASTD-UI-040", "Failed to read welcome dismissed status from localStorage", {
        scope: "MainCanvas",
        action: "readWelcomeDismissed",
        error: err,
      });
      return true;
    }
  });

  const [viewMode, setViewMode] = useState<"grid" | "list" | "compact">("grid");
  const [sortMode, setSortMode] = useState("value-desc");
  const [statusFilter, setStatusFilter] = useState("all");

  const [searchParams, setSearchParams] = useSearchParams();
  const lastSerializedParamsRef = useRef<string | null>(null);

  // 1. Synchronize state from URL search params on mount and browser navigation (Back/Forward)
  useEffect(() => {
    const serialized = searchParams.toString();
    if (serialized === lastSerializedParamsRef.current) {
      return;
    }
    lastSerializedParamsRef.current = serialized;

    const urlTier = searchParams.get("tier");
    const validTiers = FILTERS;
    const targetTier: FilterKey =
      urlTier && validTiers.includes(urlTier as FilterKey)
        ? (urlTier as FilterKey)
        : "S";
    const targetSort = searchParams.get("sort") || "value-desc";
    const targetStatus = searchParams.get("status") || "all";
    const targetQ = searchParams.get("q") || "";

    setActiveTierFilter(targetTier);
    setSortMode(targetSort);
    setStatusFilter(targetStatus);
    setSearchQuery(targetQ);
  }, [searchParams, setActiveTierFilter, setSearchQuery]);

  // Gracefully fallback to "All" if user was on "New" tier but no units exist in New
  useEffect(() => {
    if (
      activeTierFilter === "New" &&
      ALL_UNITS.length > 0 &&
      !ALL_UNITS.some((u) => getTier(u) === "New")
    ) {
      setActiveTierFilter("All");
    }
  }, [ALL_UNITS, activeTierFilter, setActiveTierFilter]);

  // 2. Synchronize filter & search state changes to URL search params
  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (activeTierFilter && activeTierFilter !== "S") {
      nextParams.set("tier", activeTierFilter);
    }
    if (sortMode && sortMode !== "value-desc") {
      nextParams.set("sort", sortMode);
    }
    if (statusFilter && statusFilter !== "all") {
      nextParams.set("status", statusFilter);
    }
    if (searchQuery.trim()) {
      nextParams.set("q", searchQuery.trim());
    }

    const nextSerialized = nextParams.toString();
    if (nextSerialized !== searchParams.toString()) {
      lastSerializedParamsRef.current = nextSerialized;
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeTierFilter, sortMode, statusFilter, searchQuery, searchParams, setSearchParams]);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(
    new Set()
  );

  const {
    scrollRef,
    headerRef,
    scrollTopBtnRef,
    scrollToTop,
  } = useCanvasScroll(isMobile);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      const row = target.closest("[data-index]");
      if (row) {
        const idx = row.getAttribute("data-index");
        if (idx !== null) setDraggedRowIndex(Number(idx));
      }
    };
    const handleDragEnd = () => setDraggedRowIndex(null);

    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("drop", handleDragEnd);

    return () => {
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("drop", handleDragEnd);
    };
  }, []);

  const [headerHeight, setHeaderHeight] = useState(80);
  const [cols, setCols] = useState(1);

  useEffect(() => {
    const container = document.getElementById("main-scroll-container");
    if (!container) return;

    const updateCols = (entry?: ResizeObserverEntry) => {
      let w = entry ? entry.contentRect.width : container.clientWidth;

      let padding = 0;
      const styles = window.getComputedStyle(container);
      padding =
        parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      w = w - padding;

      const isMobileViewport = window.innerWidth < 768;
      const minCardWidth = isMobileViewport ? 150 : 200;
      const gap = 16;

      const c = Math.max(1, Math.floor((w + gap) / (minCardWidth + gap)));
      setCols(c);
    };

    updateCols();
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) updateCols(entries[0]);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setHeaderHeight(entries[0].contentRect.height);
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [headerRef]);

  const handleResetFilters = useCallback(() => {
    triggerHaptic("light");
    setSearchQuery("");
    setStatusFilter("all");
    setSortMode("value-desc");
    setActiveTierFilter("All");

    const emptyParams = new URLSearchParams({ tier: "All" });
    lastSerializedParamsRef.current = emptyParams.toString();
    setSearchParams(emptyParams, { replace: true });

    window.setTimeout(() => {
      const searchInput = document.querySelector<HTMLInputElement>(
        '#topbar-desktop-search-input, #topbar-mobile-search-input, input[aria-label="Filter units"], input[aria-label="Search units"]'
      );
      if (searchInput && searchInput.offsetParent !== null) {
        searchInput.focus();
        return;
      }
      const firstControl = headerRef.current?.querySelector<HTMLElement>(
        "button:not([disabled])"
      );
      firstControl?.focus();
    }, 20);
  }, [setSearchQuery, setActiveTierFilter, setSearchParams, headerRef]);

  const toggleSelectUnit = useCallback((unitId: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  }, []);

  const handleBulkAddToTrade = (type: "give" | "get") => {
    if (selectedUnitIds.size === 0) return;

    const selectedUnits = ALL_UNITS.filter((u) => selectedUnitIds.has(u.id));
    if (selectedUnits.length === 0) return;

    triggerHaptic("medium");
    const addedUnitIds = selectedUnits.map((u) => u.id);

    selectedUnits.forEach((u) => {
      const numericVal =
        typeof u.value === "number"
          ? u.value
          : typeof u.valueMin === "number" && u.valueMin > 0
          ? u.valueMin
          : 0;
      addCard(type, {
        id: u.id,
        name: u.name,
        subtitle: u.subtitle,
        value: numericVal,
        qty: 1,
      });
    });

    window.dispatchEvent(new Event("open-analyzer"));
    setIsSelectMode(false);
    setSelectedUnitIds(new Set());

    const count = selectedUnits.length;
    const sideLabel =
      type === "give" ? "Your Offer (Give)" : "Their Offer (Get)";
    const { addToast } = useToastStore.getState();

    addToast(
      `Added ${count}\u00A0${count === 1 ? "unit" : "units"} to ${sideLabel}.`,
      "success",
      {
        dedupeKey: `bulk-trade-add-${type}`,
        action: {
          label: "Undo",
          onClick: () => {
            const store = useTradeStore.getState();
            let removedCount = 0;
            for (const unitId of addedUnitIds) {
              const currentList =
                type === "give"
                  ? useTradeStore.getState().giveItems
                  : useTradeStore.getState().getItems;
              const existing = currentList.find((c) => c.id === unitId);
              if (!existing) continue;
              removedCount++;
              if (existing.qty > 1) {
                store.changeQty(type, unitId, existing.qty - 1);
              } else {
                store.removeCard(type, unitId);
              }
            }
            if (removedCount > 0) {
              addToast(
                `Removed ${removedCount}\u00A0${
                  removedCount === 1 ? "unit" : "units"
                } from ${sideLabel}.`,
                "info"
              );
            }
          },
        },
      }
    );
  };

  const hasFiltersApplied =
    deferredSearchQuery !== "" ||
    statusFilter !== "all" ||
    activeTierFilter !== "All" ||
    sortMode !== "value-desc";

  const activeFilterParts: string[] = [];
  if (deferredSearchQuery) {
    activeFilterParts.push(`search “${deferredSearchQuery}”`);
  }
  if (activeTierFilter !== "All") {
    activeFilterParts.push(`Tier\u00A0${activeTierFilter}`);
  }
  if (statusFilter !== "all") {
    activeFilterParts.push(`status “${statusFilter}”`);
  }
  if (sortMode !== "value-desc") {
    activeFilterParts.push(`sorted`);
  }

  const { flattenedItems } = useCanvasVirtualization({
    ALL_UNITS,
    showWelcome,
    deferredSearchQuery,
    statusFilter,
    sortMode,
    activeTierFilter,
    viewMode,
    cols,
  });

  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => scrollRef.current,
    getItemKey: (index) => flattenedItems[index]?.id ?? index,
    rangeExtractor: (range) => {
      const r = defaultRangeExtractor(range);
      if (draggedRowIndex !== null && !r.includes(draggedRowIndex)) {
        r.push(draggedRowIndex);
      }
      return r;
    },
    estimateSize: (index) => {
      const item = flattenedItems[index];
      switch (item.type) {
        case "space-top":
          return 20;
        case "welcome":
          return 150;
        case "search-stats":
          return 48;
        case "no-results":
          return 250;
        case "tier-banner":
          return 90;
        case "sub-header":
          return 60;
        case "grid-row":
          return 300;
        case "list-row":
          return viewMode === "compact" ? 40 : 70;
        case "space-bottom":
          return 120;
        default:
          return 50;
      }
    },
    overscan: 2,
  });

  useEffect(() => {
    if (!scrollToSection || flattenedItems.length === 0) return;

    setTimeout(() => {
      const targetId = scrollToSection.sectionId
        ? `sub-${scrollToSection.tier}-${scrollToSection.sectionId}`
        : `banner-${scrollToSection.tier}`;

      let index = flattenedItems.findIndex((item) => item.id === targetId);

      if (index === -1) {
        index = flattenedItems.findIndex(
          (item) => item.id === `banner-${scrollToSection.tier}`
        );
      }

      if (index !== -1) {
        virtualizer.scrollToIndex(index, {
          align: "start",
          behavior: "smooth",
        });
      }
    }, 50);
  }, [scrollToSection, flattenedItems, virtualizer]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-transparent relative z-10">
      <div
        ref={headerRef}
        className="flex flex-col absolute top-0 left-0 right-0 w-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-30 shadow-sm translate-y-0 bg-card"
      >
        <CanvasControls
          activeTierFilter={activeTierFilter}
          setActiveTierFilter={setActiveTierFilter}
          deferredSearchQuery={deferredSearchQuery}
          hasFiltersApplied={hasFiltersApplied}
          handleResetFilters={handleResetFilters}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sortMode={sortMode}
          setSortMode={setSortMode}
          viewMode={viewMode}
          setViewMode={setViewMode}
          isSelectMode={isSelectMode}
          setIsSelectMode={(v) => {
            setIsSelectMode(v);
            if (!v) setSelectedUnitIds(new Set());
          }}
        />

        {(viewMode === "list" || viewMode === "compact") && !showSkeleton && (
          <div className="w-full border-b border-border bg-popover px-[var(--panel-p)] py-2">
            <ListHeaderRow
              sortMode={sortMode}
              setSortMode={setSortMode}
              viewMode={viewMode}
            />
          </div>
        )}
      </div>

      <div
        id="main-scroll-container"
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar relative z-0 h-full px-[var(--page-p)]"
        style={{
          paddingTop: headerHeight + 16,
          overflowAnchor: "none",
          touchAction: "pan-y",
        }}
      >
        {showSkeleton ? (
          <div className="pt-[var(--gap-lg)]">
            <div className="relative z-20 mb-6 shadow-sm">
              <TierBanner
                tier={TIER_CONFIG[activeTierFilter] ?? TIER_CONFIG["S"]}
              />
            </div>
            <CanvasSkeleton viewMode={viewMode} />
          </div>
        ) : (
          <div
            className="relative"
            style={{ height: virtualizer.getTotalSize(), width: "100%" }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const item = flattenedItems[virtualRow.index];

              return (
                <div
                  key={virtualRow.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {item.type === "space-top" && <div className="h-[20px]" />}
                  {item.type === "space-bottom" && (
                    <div className="h-[120px]" />
                  )}
                  {item.type === "welcome" && null}
                  {item.type === "search-stats" && null}
                  {item.type === "no-results" && (
                    <div className="py-10">
                      <EmptyState
                        title="No Matching Units"
                        description={
                          activeFilterParts.length > 0
                            ? `No units match your active filters (${activeFilterParts.join(
                                ", "
                              )}).`
                            : "No units match your current filter selection."
                        }
                        action={{
                          label: "Clear Filters",
                          onClick: handleResetFilters,
                        }}
                      />
                    </div>
                  )}

                  {item.type === "tier-banner" && (
                    <div className="pt-4 pb-2">
                      <TierBanner tier={item.tier} />
                    </div>
                  )}

                  {item.type === "sub-header" && (
                    <div className="pt-2 pb-2 sticky top-0 bg-background z-10 border-b border-border/50 -mx-[var(--page-p)] px-[var(--page-p)]">
                      <TierSubHeader
                        label={item.label}
                        valueRange={item.range}
                        count={item.count}
                      />
                    </div>
                  )}

                  {item.type === "grid-row" && (
                    <div
                      className={`w-full ${
                        item.isLast
                          ? "pb-[var(--gap-lg)]"
                          : "pb-[var(--gap-md)]"
                      }`}
                    >
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[var(--gap-md)] w-full">
                        {item.units.map((u) => (
                          <TierGridCard
                            key={u.id}
                            unit={u}
                            searchQuery={item.searchQuery}
                            isSelectMode={isSelectMode}
                            isSelected={selectedUnitIds.has(u.id)}
                            onToggleSelect={toggleSelectUnit}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {item.type === "list-row" && (
                    <div className="py-[1px]">
                      <UnitListRow
                        unit={item.unit}
                        isLast={item.isLast}
                        searchQuery={item.searchQuery}
                        viewMode={viewMode}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isSelectMode && selectedUnitIds.size > 0 && (
        <BulkSelectionDock
          selectedCount={selectedUnitIds.size}
          onClearSelection={() => {
            setIsSelectMode(false);
            setSelectedUnitIds(new Set());
          }}
          onSendToGive={() => handleBulkAddToTrade("give")}
          onSendToGet={() => handleBulkAddToTrade("get")}
        />
      )}

      <button
        ref={scrollTopBtnRef}
        type="button"
        aria-label="Scroll to top"
        onClick={scrollToTop}
        className="absolute bottom-[90px] right-6 md:bottom-8 md:right-8 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg transition-[transform,opacity] duration-300 ease-out hover:bg-primary/80 hover:-translate-y-1 z-50 opacity-0 translate-y-8 pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
});







