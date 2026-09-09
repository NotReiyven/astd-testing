import { useState, useRef, useDeferredValue, useMemo, memo, useEffect } from "react";
import { Search, X, ArrowUp } from "lucide-react";
import { useVirtualizer } from '@tanstack/react-virtual';
import { FilterKey, MasterUnit } from "../../../types";
import { TIER_CONFIG, getTier } from "../../../data"; 
import { useUnits } from "../../../context/UnitContext"; 

import { TierGridCard, UnitGrid } from "./UnitGrid";
import { UnitListRow, ListHeaderRow } from "./UnitListTable";
import { TierBanner, TierSubHeader, processUnits, buildSections } from "./TierSections";
import { CanvasSkeleton } from "./CanvasSkeleton";
import { CanvasControls } from "./CanvasControls";
import { GuideType } from "../guides/AquaGuideOverlay";

const STICKY_HEADER_CLASS = "bg-[#313338] pt-2 md:pt-3 pb-3 -mx-2 px-2 md:-mx-8 md:px-8";
const FIRE_ZIO_AVATAR = "https://media.discordapp.net/attachments/1538970612947615744/1543320682430074971/image.png?ex=6a9470e4&is=6a931f64&hm=d97c87c7af214b524fdd41b313db6a4d45d5cf435046fc9a8a14fb307d258165&=&format=webp&quality=lossless";

type VirtualItem = 
  | { type: 'space-top'; id: string }
  | { type: 'welcome'; id: string }
  | { type: 'search-stats'; id: string; count: number }
  | { type: 'no-results'; id: string }
  | { type: 'tier-banner'; id: string; tier: any }
  | { type: 'sub-header'; id: string; label: string; range: string; count: number }
  | { type: 'grid-row'; id: string; units: MasterUnit[]; cols: number }
  | { type: 'list-row'; id: string; unit: MasterUnit; isLast: boolean }
  | { type: 'space-bottom'; id: string };

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

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortMode, setSortMode] = useState("value-desc");
  const [statusFilter, setStatusFilter] = useState("all");

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const skipNextResetRef = useRef(false);

  // Dynamic Header State
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const colsRef = useRef(4);
  const [cols, setCols] = useState(4);
  useEffect(() => {
     if (!scrollRef.current) return;
     const observer = new ResizeObserver(entries => {
        const width = entries[0].contentRect.width;
        const gap = window.innerWidth < 640 ? 12 : 20;
        const padding = window.innerWidth < 768 ? 16 : 64; 
        const available = width - padding;
        const c = Math.max(1, Math.floor((available + gap) / (155 + gap)));
        if (c !== colsRef.current) {
           colsRef.current = c;
           setCols(c);
        }
     });
     observer.observe(scrollRef.current);
     return () => observer.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScroll = e.currentTarget.scrollTop;
    
    // Top button logic
    if (currentScroll > 400 && !showScrollTop) setShowScrollTop(true);
    else if (currentScroll <= 400 && showScrollTop) setShowScrollTop(false);

    // Mobile Dynamic Header Logic (only trigger when actually scrolling beyond the top area to prevent jitter)
    if (isMobile) {
      if (currentScroll > 150) {
        if (currentScroll > lastScrollY.current + 10 && isHeaderVisible) {
          // Scrolling down
          setIsHeaderVisible(false);
        } else if (currentScroll < lastScrollY.current - 10 && !isHeaderVisible) {
          // Scrolling up
          setIsHeaderVisible(true);
        }
      } else if (!isHeaderVisible) {
        // Force show if near top
        setIsHeaderVisible(true);
      }
    }
    
    lastScrollY.current = currentScroll;
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setIsHeaderVisible(true);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortMode("value-desc");
    setActiveTierFilter("All");
  };

  const hasFiltersApplied = deferredSearchQuery !== "" || statusFilter !== "all" || sortMode !== "value-desc" || activeTierFilter !== "All";
  const isDefaultView = sortMode === "value-desc" && statusFilter === "all" && deferredSearchQuery === "";

  const UNITS_BY_TIER = useMemo(() => {
    const map: Record<string, MasterUnit[]> = { S: [], A: [], B: [], C: [], Pure: [], Oddities: [], Untiered: [] };
    ALL_UNITS.forEach(u => {
      const t = getTier(u);
      if (map[t]) map[t].push(u);
    });
    return map;
  }, [ALL_UNITS]); 

  const filteredAllUnits = useMemo(() => {
    const rawFiltered = ALL_UNITS.filter(u => {
      const q = deferredSearchQuery.toLowerCase();
      const matchesSearch = deferredSearchQuery === "" || (u.name?.toLowerCase() || "").includes(q) || (u.subtitle?.toLowerCase() || "").includes(q) || (u.aliases && u.aliases.some(a => a.toLowerCase().includes(q)));
      const matchesTier = deferredSearchQuery !== "" || activeTierFilter === "All" || getTier(u) === activeTierFilter;
      return matchesSearch && matchesTier;
    });
    return processUnits(rawFiltered, sortMode, statusFilter);
  }, [ALL_UNITS, deferredSearchQuery, activeTierFilter, sortMode, statusFilter]); 

  const flattenedItems = useMemo(() => {
    const items: VirtualItem[] = [];
    items.push({ type: 'space-top', id: 'space-top' });

    if (showWelcome && !deferredSearchQuery && statusFilter === "all" && sortMode === "value-desc") {
       items.push({ type: 'welcome', id: 'welcome' });
    }

    if (deferredSearchQuery) {
       items.push({ type: 'search-stats', id: 'search-stats', count: filteredAllUnits.length });
       if (filteredAllUnits.length === 0) {
          items.push({ type: 'no-results', id: 'no-results' });
          return items;
       }

       ["S", "A", "B", "C", "Pure", "Oddities", "Untiered"].forEach(tKey => {
          const unitsInTier = filteredAllUnits.filter(u => getTier(u) === tKey);
          if (unitsInTier.length === 0) return;

          items.push({ type: 'tier-banner', id: `banner-${tKey}`, tier: TIER_CONFIG[tKey] });

          if (viewMode === 'grid') {
             for (let i = 0; i < unitsInTier.length; i += cols) {
                items.push({ type: 'grid-row', id: `grid-${tKey}-${i}`, units: unitsInTier.slice(i, i + cols), cols });
             }
          } else {
             unitsInTier.forEach((u, i) => {
                items.push({ type: 'list-row', id: `list-${u.id}`, unit: u, isLast: i === unitsInTier.length - 1 });
             });
          }
       });
    } else {
       const tiersToRender = activeTierFilter === "All" ? ["S", "A", "B", "C", "Pure", "Oddities", "Untiered"] : [activeTierFilter];

       tiersToRender.forEach(tKey => {
          const rawUnits = UNITS_BY_TIER[tKey] || [];
          const processed = processUnits(rawUnits, sortMode, statusFilter);

          if (processed.length === 0 && activeTierFilter !== "All") {
             items.push({ type: 'tier-banner', id: `banner-${tKey}`, tier: TIER_CONFIG[tKey] });
             items.push({ type: 'no-results', id: `no-results-${tKey}` });
             return;
          }
          if (processed.length === 0) return;

          items.push({ type: 'tier-banner', id: `banner-${tKey}`, tier: TIER_CONFIG[tKey] });

          if (isDefaultView) {
              const sections = buildSections(rawUnits, sortMode, statusFilter, tKey);
              sections.forEach(sec => {
                 items.push({ type: 'sub-header', id: `sub-${tKey}-${sec.label}`, label: sec.label, range: sec.range, count: sec.processedUnits.length });

                 if (viewMode === 'grid') {
                    for (let i = 0; i < sec.processedUnits.length; i += cols) {
                       items.push({ type: 'grid-row', id: `grid-${sec.label}-${i}`, units: sec.processedUnits.slice(i, i + cols), cols });
                    }
                 } else {
                    sec.processedUnits.forEach((u, i) => {
                       items.push({ type: 'list-row', id: `list-${u.id}`, unit: u, isLast: i === sec.processedUnits.length - 1 });
                    });
                 }
              });
          } else {
              if (viewMode === 'grid') {
                 for (let i = 0; i < processed.length; i += cols) {
                    items.push({ type: 'grid-row', id: `grid-${tKey}-${i}`, units: processed.slice(i, i + cols), cols });
                 }
              } else {
                 processed.forEach((u, i) => {
                    items.push({ type: 'list-row', id: `list-${u.id}`, unit: u, isLast: i === processed.length - 1 });
                 });
              }
          }
       });
    }

    items.push({ type: 'space-bottom', id: 'space-bottom' });
    return items;
  }, [showWelcome, deferredSearchQuery, statusFilter, sortMode, activeTierFilter, viewMode, cols, filteredAllUnits, UNITS_BY_TIER, isDefaultView]);

  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
       const item = flattenedItems[index];
       switch(item.type) {
         case 'space-top': return 16;
         case 'welcome': return window.innerWidth < 768 ? 160 : 120;
         case 'search-stats': return 40;
         case 'no-results': return 200;
         case 'tier-banner': return 120; 
         case 'sub-header': return 60;
         case 'grid-row': return 272;
         case 'list-row': return 57;
         case 'space-bottom': return 100;
         default: return 50;
       }
    },
    overscan: 12,
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
  }, [scrollToSection, flattenedItems.length]); 

  useEffect(() => {
    if (scrollToSection) return;
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
      return;
    }
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    setIsHeaderVisible(true);
  }, [deferredSearchQuery, statusFilter, sortMode, activeTierFilter]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    try { localStorage.setItem("astd_welcome_dismissed", "true"); } 
    catch (e) { console.error("Failed to save banner preference", e); }
  };

  const isStatsTarget = guideState?.type === "stats";

  // Height of the mobile controls bar to offset correctly
  const headerHeight = 60;

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

      {/* Filter Highlight Wrap (Dynamic Header on Mobile) */}
      <div 
        className={`flex flex-col absolute top-0 left-0 right-0 w-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${guideState?.type === "filters" ? "ring-2 ring-[#5865F2] rounded-[8px] bg-[rgba(88,101,242,0.15)] shadow-[0_0_20px_rgba(88,101,242,0.4)] z-[100005] animate-pulse" : "z-30 shadow-md"} ${!isHeaderVisible ? '-translate-y-full' : 'translate-y-0'}`}
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
        
        {/* Global Sticky List Header */}
        {viewMode === "list" && !isLoading && (
          <div className="hidden md:block w-full border-b border-[rgba(0,0,0,0.5)] bg-[#1E1F22]">
            <ListHeaderRow />
          </div>
        )}
      </div>

      <div 
        id="main-scroll-container"
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 md:px-8 custom-scrollbar relative z-0 h-full" 
        style={{ 
          WebkitOverflowScrolling: "touch",
          paddingTop: isMobile ? headerHeight : headerHeight + (viewMode === 'list' ? 36 : 0) // Give space for the absolute header
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
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                      <div className="w-14 h-14 rounded-[8px] flex items-center justify-center bg-[rgba(255,255,255,0.04)]"><Search className="w-6 h-6 text-[#4e5058]" /></div>
                      <p className="text-sm font-bold text-[#4e5058]">No units match your current filters.</p>
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
                      {item.units.map(u => <TierGridCard key={u.id} unit={u} />)}
                    </div>
                  )}

                  {item.type === 'list-row' && (
                    <div className={`${isStatsTarget && virtualRow.index === 1 ? 'animate-pulse ring-2 ring-[#5865F2]' : ''}`}>
                       <UnitListRow unit={item.unit} isLast={item.isLast} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={scrollToTop}
        className={`absolute bottom-[90px] right-6 md:bottom-8 md:right-8 w-[46px] h-[46px] md:w-[52px] md:h-[52px] bg-[#5865F2] text-white rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out hover:bg-[#4752C4] hover:-translate-y-1 z-50 ${
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
        }`}
        title="Scroll to Top"
      >
        <ArrowUp className="w-5 h-5 md:w-6 md:h-6" />
      </button>

    </div>
  );
});