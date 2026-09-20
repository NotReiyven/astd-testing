import { useState, useRef, useDeferredValue, useEffect, memo } from "react";
import { Search, X, ArrowUp } from "lucide-react";
import { useVirtualizer } from '@tanstack/react-virtual';
import { FilterKey } from "../../../types";
import { TIER_CONFIG } from "../../../data"; 
import { useUnits } from "../../../context/UnitContext"; 

import { TierGridCard } from "./UnitGrid";
import { UnitListRow, ListHeaderRow } from "./UnitListTable";
import { TierBanner, TierSubHeader } from "./TierSections";
import { CanvasSkeleton } from "./CanvasSkeleton";
import { CanvasControls } from "./CanvasControls";
import { GuideType } from "../guides/AquaGuideOverlay";
import { useCanvasVirtualization } from "./useCanvasVirtualization";
import { useCanvasScroll } from "../../../hooks/useCanvasScroll";

const STICKY_HEADER_CLASS = "bg-[#313338] pt-2 md:pt-3 pb-3 -mx-2 px-2 md:-mx-8 md:px-8";
const FIRE_ZIO_AVATAR = "/units/firezio.webp";

export const MainCanvas = memo(function MainCanvas({
  activeTierFilter, setActiveTierFilter, searchQuery, setSearchQuery, scrollToSection, startGuide, guideState, isMobile
}: {
  activeTierFilter: FilterKey; setActiveTierFilter: (f: FilterKey) => void;
  searchQuery: string; setSearchQuery: (s: string) => void;
  scrollToSection?: { tier: string; sectionId: string } | null;
  startGuide: (type: GuideType) => void;
  guideState?: { type: GuideType | null; step: number };
  isMobile: boolean;
}) {
  const { units: ALL_UNITS, isLoading } = useUnits(); 

  const [showWelcome, setShowWelcome] = useState(() => {
    try { return localStorage.getItem("astd_welcome_dismissed") !== "true"; } 
    catch (e) { return true; }
  });

  const [viewMode, setViewMode] = useState<"grid" | "list" | "compact">("grid");
  const [sortMode, setSortMode] = useState("value-desc");
  const [statusFilter, setStatusFilter] = useState("all");

  const { scrollRef, headerRef, scrollTopBtnRef, scrollToTop, headerVisibleRef, skipNextResetRef } = useCanvasScroll(isMobile);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const colsRef = useRef(4);
  const [cols, setCols] = useState(4);

  useEffect(() => {
     if (!scrollRef.current) return;
     const observer = new ResizeObserver(entries => {
        const width = entries[0].contentRect.width;
        const isDesktop = window.innerWidth >= 768;
        const baseCardWidth = isDesktop ? 200 : 155;
        const gap = isDesktop ? 20 : 12;
        const padding = isDesktop ? 64 : 16; 
        const available = width - padding;
        const c = Math.max(1, Math.floor((available + gap) / (baseCardWidth + gap)));

        if (c !== colsRef.current) {
           colsRef.current = c;
           // Defer state update to prevent flushSync warning
           requestAnimationFrame(() => {
             setCols(c);
           });
        }
     });
     observer.observe(scrollRef.current);
     return () => observer.disconnect();
  }, [scrollRef]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortMode("value-desc");
    setActiveTierFilter("All");
  };

  const hasFiltersApplied = deferredSearchQuery !== "" || statusFilter !== "all" || sortMode !== "value-desc" || activeTierFilter !== "All";

  const { flattenedItems } = useCanvasVirtualization({
    ALL_UNITS,
    showWelcome,
    deferredSearchQuery,
    statusFilter,
    sortMode,
    activeTierFilter,
    viewMode,
    cols
  });

  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => scrollRef.current,
    getItemKey: (index) => flattenedItems[index]?.id ?? index,
    estimateSize: (index) => {
       const item = flattenedItems[index];
       switch(item.type) {
          case 'space-top': return 16;
          case 'welcome': return window.innerWidth < 768 ? 180 : 120;
          case 'search-stats': return 40;
          case 'no-results': return 250; 
          case 'tier-banner': return 110; 
          case 'sub-header': return 50;
          case 'grid-row': return window.innerWidth < 768 ? 290 : 360;
          case 'list-row': return viewMode === 'compact' ? 30 : 57;
          case 'space-bottom': return 100;
          default: return 50;
       }
    },
    overscan: 14,
  });

  useEffect(() => {
    if (!scrollToSection || flattenedItems.length === 0) return;

    skipNextResetRef.current = true;
    setSearchQuery("");
    setStatusFilter("all");
    setSortMode("value-desc"); 
    setActiveTierFilter(scrollToSection.tier as FilterKey);

    const targetId = `sub-${scrollToSection.tier}-${scrollToSection.sectionId}`;
    const idx = flattenedItems.findIndex(i => i.id === targetId);
    if (idx !== -1) {
      virtualizer.scrollToIndex(idx, { align: 'start' });
    }
  }, [scrollToSection, flattenedItems.length, skipNextResetRef, virtualizer]); 

  useEffect(() => {
    if (scrollToSection) return;
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
      return;
    }
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    headerVisibleRef.current = true;
    if (headerRef.current) {
      headerRef.current.classList.remove("-translate-y-full");
      headerRef.current.classList.add("translate-y-0");
    }
  }, [deferredSearchQuery, statusFilter, sortMode, activeTierFilter, scrollToSection, skipNextResetRef, headerRef, scrollRef, headerVisibleRef]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    try { localStorage.setItem("astd_welcome_dismissed", "true"); } 
    catch (e) { console.error("Failed to save banner preference", e); }
  };

  const isStatsTarget = guideState?.type === "stats";
  const headerHeight = isMobile ? 110 : 60;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#313338] relative z-10">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #2B2D31; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1A1B1E; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #111214; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes slideUpFade { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>

      <div 
        ref={headerRef}
        className={`flex flex-col absolute top-0 left-0 right-0 w-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${guideState?.type === "filters" ? "ring-2 ring-[#5865F2] rounded-[8px] bg-[rgba(88,101,242,0.15)] shadow-[0_0_20px_rgba(88,101,242,0.4)] z-[100005] animate-pulse" : "z-30 shadow-md"} translate-y-0`}
      >
        <CanvasControls 
          activeTierFilter={activeTierFilter}
          setActiveTierFilter={setActiveTierFilter}
          deferredSearchQuery={deferredSearchQuery}
          hasFiltersApplied={hasFiltersApplied}
          handleResetFilters={handleResetFilters}
          statusFilter={statusFilter}
          setStatusFilter={(s) => { setStatusFilter(s); startGuide("filters"); }} 
          sortMode={sortMode}
          setSortMode={setSortMode}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        {(viewMode === "list" || viewMode === "compact") && !isLoading && (
          <div className="hidden md:block w-full border-b border-[rgba(0,0,0,0.5)] bg-[#1E1F22]">
            <ListHeaderRow sortMode={sortMode} setSortMode={setSortMode} viewMode={viewMode} />
          </div>
        )}
      </div>

      <div 
        id="main-scroll-container"
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 md:px-8 custom-scrollbar relative z-0 h-full" 
        style={{ 
          paddingTop: headerHeight + ((viewMode === 'list' || viewMode === 'compact') && !isMobile ? 36 : 0),
          overflowAnchor: "none",
          touchAction: "pan-y"
        }}
      >
        {isLoading ? (
          <div className="pt-4 md:pt-6">
            <div className={`${STICKY_HEADER_CLASS} relative z-20 mb-4 shadow-[0_12px_20px_-15px_rgba(0,0,0,0.8)]`}>
              <TierBanner tier={TIER_CONFIG[activeTierFilter] ?? TIER_CONFIG["S"]} />
            </div>
            <CanvasSkeleton viewMode={viewMode} />
          </div>
        ) : (
          <div className={`relative ${isStatsTarget ? 'ring-2 ring-[#5865F2] rounded-[8px] bg-[rgba(88,101,242,0.05)] shadow-[0_0_20px_rgba(88,101,242,0.2)] z-[100005]' : ''}`} style={{ height: virtualizer.getTotalSize(), width: '100%' }}>
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
                  {item.type === 'space-top' && <div className="h-4 md:h-6" />}
                  {item.type === 'space-bottom' && <div className="h-10 md:h-16" />}

                  {item.type === 'welcome' && (
                    <div className="mb-4 md:mb-8 flex flex-col md:flex-row gap-3 md:gap-4 bg-[#2B2D31] md:bg-transparent p-3 md:p-0 rounded-[8px] md:rounded-none border md:border-none border-[rgba(255,255,255,0.04)] mx-2 md:mx-0 font-sans">
                      <div className="flex items-start justify-between md:hidden w-full">
                        <div className="flex items-center gap-2">
                          <img src={FIRE_ZIO_AVATAR} className="w-8 h-8 rounded-full border border-[#ed4245] object-cover shrink-0 bg-[#1e1f22]" alt="Fire Zio" />
                          <h2 className="text-[16px] font-bold text-[#F2F3F5] tracking-tight">Listen up.</h2>
                        </div>
                        <button onClick={dismissWelcome} className="text-[#80848E] hover:text-[#DBDEE1] p-1"><X className="w-4 h-4" /></button>
                      </div>

                      <img src={FIRE_ZIO_AVATAR} className="hidden md:block w-14 h-14 rounded-full border-2 border-[#ed4245] object-cover shrink-0 bg-[#1e1f22] shadow-md" alt="Fire Zio" />

                      <div className="flex flex-col justify-center max-w-2xl">
                        <h2 className="hidden md:block text-[20px] font-black text-[#F2F3F5] mb-1 tracking-tight">Stop getting scammed.</h2>
                        <p className="text-[12px] md:text-[13px] text-[#B5BAC1] mb-2 md:mb-2.5 leading-relaxed">
                          This is the value list. Tap any unit card to instantly throw it into <i>You Give</i> or <i>You Get</i>. Check your stats before you open your mouth in trade chat.
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-3 text-[9px] md:text-[11px] font-bold text-[#949BA4]">
                          <span className="bg-[#1E1F22] px-2 py-1 rounded border border-[rgba(255,255,255,0.04)]">R = Rarity (/20)</span>
                          <span className="bg-[#1E1F22] px-2 py-1 rounded border border-[rgba(255,255,255,0.04)]">S = Supply (/5)</span>
                          <span className="bg-[#1E1F22] px-2 py-1 rounded border border-[rgba(255,255,255,0.04)]">D = Demand (/5)</span>
                        </div>
                      </div>
                      <button onClick={dismissWelcome} className="hidden md:block ml-auto self-start text-[#80848E] hover:text-[#DBDEE1] p-2"><X className="w-5 h-5" /></button>
                    </div>
                  )}

                  {item.type === 'search-stats' && (
                    <div className="flex items-center gap-2 mb-2 mx-2 md:mx-0">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-[#949BA4]">Search Results</span>
                      <span className="text-[11px] font-bold bg-[rgba(255,255,255,0.06)] text-[#DBDEE1] px-2 py-0.5 rounded transition-all">{item.count} Found</span>
                    </div>
                  )}

                  {item.type === 'no-results' && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-14 h-14 rounded-[8px] flex items-center justify-center bg-[rgba(255,255,255,0.04)]">
                        <Search className="w-6 h-6 text-[#4e5058]" />
                      </div>
                      <p className="text-sm font-bold text-[#4e5058]">No units match your current filters.</p>

                      <button 
                        onClick={handleResetFilters}
                        className="mt-2 px-6 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-[6px] text-[13px] font-bold transition-all active:scale-95 shadow-md flex items-center gap-2"
                      >
                        <X className="w-4 h-4" /> Clear Search & Filters
                      </button>
                    </div>
                  )}

                  {item.type === 'tier-banner' && (
                    <div className={`${STICKY_HEADER_CLASS} relative z-20 mb-4 shadow-[0_12px_20px_-15px_rgba(0,0,0,0.8)]`}>
                      <TierBanner tier={item.tier} />
                    </div>
                  )}

                  {item.type === 'sub-header' && (
                    <TierSubHeader label={item.label} valueRange={item.range} count={item.count} />
                  )}

                  {item.type === 'grid-row' && (
                    <div className={`grid gap-3 sm:gap-5 w-full pb-3 sm:pb-5 ${isStatsTarget && virtualRow.index === 1 ? 'animate-pulse' : ''}`} style={{ gridTemplateColumns: `repeat(${item.cols}, minmax(0, 1fr))` }}>
                      {item.units.map(u => <TierGridCard key={u.id} unit={u} searchQuery={item.searchQuery} />)}
                    </div>
                  )}

                  {item.type === 'list-row' && (
                    <div className={`${isStatsTarget && virtualRow.index === 1 ? 'animate-pulse ring-2 ring-[#5865F2]' : ''}`}>
                       <UnitListRow unit={item.unit} isLast={item.isLast} searchQuery={item.searchQuery} viewMode={viewMode} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        ref={scrollTopBtnRef}
        onClick={scrollToTop}
        className="absolute bottom-[90px] right-6 md:bottom-8 md:right-8 w-[46px] h-[46px] md:w-[52px] md:h-[52px] bg-[#5865F2] text-white rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out hover:bg-[#4752C4] hover:-translate-y-1 z-50 opacity-0 translate-y-8 pointer-events-none"
        title="Scroll to Top"
      >
        <ArrowUp className="w-5 h-5 md:w-6 md:h-6" />
      </button>
    </div>
  );
});