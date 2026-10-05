import { BulkSelectionDock } from "../shared/BulkSelectionDock";
import {
  useState,
  useDeferredValue,
  useEffect,
  memo,
  useCallback,
  useRef,
} from "react";
import { ArrowUp } from "lucide-react";
import { useVirtualizer, defaultRangeExtractor } from "@tanstack/react-virtual";
import { FilterKey } from "../../../types";
import { TIER_CONFIG } from "../../../data";
import { useUnits } from "../../../context/UnitContext";
import { useTradeStore } from "../../../store/useTradeStore";
import { useLayoutStore } from "../../../store/useLayoutStore";

import { TierGridCard } from "./UnitGrid";
import { UnitListRow, ListHeaderRow } from "./UnitListTable";
import { TierBanner, TierSubHeader } from "./TierSections";
import { CanvasSkeleton } from "./CanvasSkeleton";
import { CanvasControls } from "./CanvasControls";
import { GuideType } from "../guides/AquaGuideOverlay";
import { useCanvasVirtualization } from "./useCanvasVirtualization";
import { useCanvasScroll } from "../../../hooks/useCanvasScroll";

const FIRE_ZIO_AVATAR = "/units/firezio.webp";

export const MainCanvas = memo(function MainCanvas({
  activeTierFilter,
  setActiveTierFilter,
  searchQuery,
  setSearchQuery,
  scrollToSection,
  startGuide,
  guideState,
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
  const addCard = useTradeStore((s) => s.addCard);

  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return localStorage.getItem("astd_welcome_dismissed") !== "true";
    } catch (e) {
      return true;
    }
  });

  const [viewMode, setViewMode] = useState<"grid" | "list" | "compact">("grid");
  const [sortMode, setSortMode] = useState("value-desc");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(
    new Set()
  );

  const {
    scrollRef,
    headerRef,
    scrollTopBtnRef,
    scrollToTop,
    headerVisibleRef,
    skipNextResetRef,
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
    const updateCols = () => {
      const container = document.getElementById("main-scroll-container");
      const w = container ? container.clientWidth : window.innerWidth;
      // Account for 16px gap and 160px min width
      const c = Math.max(1, Math.floor((w + 16) / 176));
      setCols(c);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setHeaderHeight(entries[0].contentRect.height);
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [headerRef]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortMode("value-desc");
    setActiveTierFilter("All");
  };

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
    ALL_UNITS.filter((u) => selectedUnitIds.has(u.id)).forEach((u) => {
      addCard(type, {
        id: u.id,
        name: u.name,
        subtitle: u.subtitle,
        value: typeof u.value === "number" ? u.value : 0,
        qty: 1,
      });
      window.dispatchEvent(
        new CustomEvent("trade-added", {
          detail: {
            name: u.name,
            type,
          },
        })
      );
    });
    window.dispatchEvent(new Event("open-analyzer"));
    setIsSelectMode(false);
    setSelectedUnitIds(new Set());
  };

  const hasFiltersApplied =
    deferredSearchQuery !== "" ||
    statusFilter !== "all" ||
    sortMode !== "value-desc" ||
    activeTierFilter !== "All";

  // Note: cols is removed. Virtualizer now calculates size based on CSS layout.
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
      // Note: We use approximate heights. The measureElement ref handles exact sizing later.
      switch (item.type) {
        case "space-top": return 20;
        case "welcome": return 150;
        case "search-stats": return 48;
        case "no-results": return 250;
        case "tier-banner": return 90;
        case "sub-header": return 60;
        case "grid-row": return 300; 
        case "list-row": return viewMode === "compact" ? 40 : 70;
        case "space-bottom": return 120;
        default: return 50;
      }
    },
    overscan: 2,
  });

  useEffect(() => {
    if (!scrollToSection || flattenedItems.length === 0) return;
    
    // Defer slightly to ensure virtualizer layout is updated after filter change
    setTimeout(() => {
      let targetId = scrollToSection.sectionId
        ? `sub-${scrollToSection.tier}-${scrollToSection.sectionId}`
        : `banner-${scrollToSection.tier}`;
        
      let index = flattenedItems.findIndex((item) => item.id === targetId);
      
      if (index === -1) {
        index = flattenedItems.findIndex((item) => item.id === `banner-${scrollToSection.tier}`);
      }
      
      if (index !== -1) {
        virtualizer.scrollToIndex(index, { align: "start", behavior: "smooth" });
      }
    }, 50);
  }, [scrollToSection, flattenedItems, virtualizer]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem("astd_welcome_dismissed", "true");
    } catch (e) {}
  };

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

        {(viewMode === "list" || viewMode === "compact") && !isLoading && (
          <div className="w-full border-b border-border bg-popover px-[var(--panel-p)] py-2">
             <ListHeaderRow sortMode={sortMode} setSortMode={setSortMode} viewMode={viewMode} />
          </div>
        )}
      </div>

      {/* Select Mode Toolbar... omitted for brevity */}

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
        {isLoading ? (
          <div className="pt-[var(--gap-lg)]">
            <div className="relative z-20 mb-6 shadow-sm">
              <TierBanner tier={TIER_CONFIG[activeTierFilter] ?? TIER_CONFIG["S"]} />
            </div>
            <CanvasSkeleton viewMode={viewMode} />
          </div>
        ) : (
          <div className="relative" style={{ height: virtualizer.getTotalSize(), width: "100%" }}>
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
                  {item.type === "space-bottom" && <div className="h-[120px]" />}
                  {item.type === "welcome" && null /* Render welcome if needed */}
                  {item.type === "search-stats" && null}
                  {item.type === "no-results" && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      No units found matching your search.
                    </div>
                  )}

                  {item.type === "tier-banner" && (
                    <div className="pt-4 pb-2">
                      <TierBanner tier={item.tier} />
                    </div>
                  )}

                  {item.type === "sub-header" && (
                    <div className="pt-2 pb-2 sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border/50 -mx-[var(--page-p)] px-[var(--page-p)]">
                      <TierSubHeader
                        label={item.label}
                        valueRange={item.range}
                        count={item.count}
                      />
                    </div>
                  )}

                  {item.type === "grid-row" && (
                    <div className={`w-full ${item.isLast ? "pb-[var(--gap-lg)]" : "pb-[var(--gap-md)]"}`}>
                       <div 
                         className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[var(--gap-md)] w-full"
                         
                       >
                         {item.units.map((u, i) => (
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

      <button ref={scrollTopBtnRef} onClick={scrollToTop} className="absolute bottom-[90px] right-6 md:bottom-8 md:right-8 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-out hover:bg-primary/80 hover:-translate-y-1 z-50 opacity-0 translate-y-8 pointer-events-none cursor-pointer focus-visible:outline-none">
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
});




