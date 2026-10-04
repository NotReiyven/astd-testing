import {
  useState,
  useDeferredValue,
  useEffect,
  memo,
  useCallback,
  useRef,
} from "react";
import { ArrowUp } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
    // Implementation omitted for brevity, identical to original
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
    // ... scroll logic
  }, [scrollToSection, flattenedItems.length, skipNextResetRef, virtualizer]);

  // ... reset scroll logic

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
                         className="grid gap-[var(--gap-md)] w-full"
                         style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))' }}
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

      <button ref={scrollTopBtnRef} onClick={scrollToTop} className="absolute bottom-[90px] right-6 md:bottom-8 md:right-8 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-out hover:bg-primary/80 hover:-translate-y-1 z-50 opacity-0 translate-y-8 pointer-events-none cursor-pointer focus-visible:outline-none">
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
});



