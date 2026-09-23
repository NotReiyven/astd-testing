// ================================================
// FILE: src/app/components/MainCanvas/CanvasControls.tsx
// ================================================

import { useState } from "react";
import { X, LayoutGrid, List, ArrowUpDown, Filter, AlignJustify, CheckSquare, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { FilterKey } from "../../../types";
import { FILTERS } from "../../../data";
import { CustomDropdown } from "./CustomDropdown";
import { triggerHaptic } from "../../../data/helpers";
import { useLayoutStore } from "../../../store/useLayoutStore";

const SORT_OPTIONS = {
  "value-desc": "Value: High to Low", "value-asc": "Value: Low to High",
  "liq-desc": "Liquidity: High to Low", "liq-asc": "Liquidity: Low to High",
  "rarity-desc": "Rarity: Rarest First", "alpha-asc": "Alphabetical: A-Z"
};

const FILTER_OPTIONS = {
  "all": "All Statuses", "stable": "Stable", "unstable": "Unstable",
  "rising": "Rising", "dropping": "Dropping", "inflated": "Inflated",
  "deflated": "Deflated", "varies": "Varies", "lowballed": "Lowballed",
  "highballed": "Highballed", "gatekept": "Gatekept", "hyped": "Hyped", "black-marketed": "Black Market"
};

interface CanvasControlsProps {
  activeTierFilter: FilterKey;
  setActiveTierFilter: (f: FilterKey) => void;
  deferredSearchQuery: string;
  hasFiltersApplied: boolean;
  handleResetFilters: () => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  sortMode: string;
  setSortMode: (s: string) => void;
  viewMode: "grid" | "list" | "compact";
  setViewMode: (v: "grid" | "list" | "compact") => void;
  isSelectMode: boolean;
  setIsSelectMode: (v: boolean) => void;
}

export function CanvasControls({
  activeTierFilter, setActiveTierFilter, deferredSearchQuery, hasFiltersApplied,
  handleResetFilters, statusFilter, setStatusFilter, sortMode, setSortMode,
  viewMode, setViewMode, isSelectMode, setIsSelectMode
}: CanvasControlsProps) {
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const { globalCompactMode } = useLayoutStore();
  
  const renderBulkAndResetButtons = () => (
    <>
      <button
        onClick={() => {
          triggerHaptic('medium');
          setIsSelectMode(!isSelectMode);
        }}
        className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-[6px] text-[11px] font-bold uppercase tracking-wider transition-all border focus-visible:outline-none shrink-0 min-h-[40px] active:scale-95 cursor-pointer shadow-sm ${
          isSelectMode ? "bg-primary text-primary-foreground border-primary" : "bg-popover text-foreground/90 border-border hover:bg-muted"
        }`}
      >
        <CheckSquare className="w-4 h-4" />
        <span>{isSelectMode ? "Cancel Select" : "Bulk Select"}</span>
      </button>

      {hasFiltersApplied && (
        <button 
          onClick={() => {
            triggerHaptic('medium');
            handleResetFilters();
          }} 
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-[11px] font-bold uppercase tracking-wider text-rose-400 bg-rose-400/10 hover:bg-rose-400 hover:text-white transition-all duration-200 animate-fade-in border border-rose-400/20 min-h-[40px] active:scale-95 cursor-pointer shadow-sm"
          title="Reset Filters"
        >
          <X className="w-4 h-4" />
          <span>Reset</span>
        </button>
      )}
    </>
  );

  const renderViewModeToggles = () => (
    <div className="flex bg-popover rounded-[6px] p-[3px] border border-border flex-shrink-0 shadow-sm">
      <button 
        onClick={() => { triggerHaptic('light'); setViewMode("grid"); }} 
        className={`p-2 rounded-[4px] transition-all duration-200 ease-out active:scale-95 cursor-pointer focus-visible:outline-none min-h-[40px] min-w-[40px] flex items-center justify-center ${viewMode === "grid" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} 
        title="Grid View"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button 
        onClick={() => { triggerHaptic('light'); setViewMode("list"); }} 
        className={`p-2 rounded-[4px] transition-all duration-200 ease-out active:scale-95 cursor-pointer focus-visible:outline-none min-h-[40px] min-w-[40px] flex items-center justify-center ${viewMode === "list" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} 
        title="List View"
      >
        <List className="w-4 h-4" />
      </button>
      <button 
        onClick={() => { triggerHaptic('light'); setViewMode("compact"); }} 
        className={`hidden md:flex p-2 rounded-[4px] transition-all duration-200 ease-out active:scale-95 cursor-pointer focus-visible:outline-none min-h-[40px] min-w-[40px] items-center justify-center ${viewMode === "compact" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} 
        title="Compact View"
      >
        <AlignJustify className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className={`flex-shrink-0 flex flex-col z-40 relative bg-card border-b border-border shadow-sm ${globalCompactMode ? 'px-2 md:px-4 py-2 gap-2' : 'px-4 md:px-10 py-4 gap-3.5'}`}>
      
      {/* MOBILE COLLAPSE HEADER */}
      <div className="flex md:hidden items-center justify-between pb-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Value List Controls</span>
        <button
          onClick={() => { triggerHaptic('light'); setIsControlsCollapsed(!isControlsCollapsed); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-muted border border-border text-foreground text-[11px] font-bold uppercase tracking-wider cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{isControlsCollapsed ? "Filters" : "Collapse"}</span>
          {isControlsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ROW 1: Tier Filter Pills */}
      <div className="flex bg-popover rounded-[8px] p-1.5 border border-border w-full md:w-fit overflow-x-auto hide-scrollbar shadow-inner">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              triggerHaptic('light');
              setActiveTierFilter(f);
              if (f !== "All") window.dispatchEvent(new Event("academy-used-filter"));
            }}
            className={`flex-1 md:flex-none px-4 md:px-5 py-2 rounded-[6px] text-[12px] font-extrabold tracking-wide uppercase transition-all whitespace-nowrap focus-visible:outline-none shrink-0 active:scale-95 cursor-pointer min-h-[40px] flex items-center justify-center ${
              activeTierFilter === f && !deferredSearchQuery
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* COLLAPSIBLE CONTAINER FOR DROPDOWNS & ACTIONS */}
      <div className={`flex flex-col transition-all duration-300 overflow-hidden ${isControlsCollapsed ? 'max-h-0 opacity-0 md:max-h-none md:opacity-100 py-0 gap-0 md:gap-3' : 'max-h-[400px] opacity-100 gap-3'}`}>
        
        {/* DESKTOP LAYOUT */}
        <div className={`hidden md:flex flex-row items-center justify-between gap-3 w-full border-t border-border/60 ${globalCompactMode ? 'pt-2' : 'pt-3'}`}>
          <div className="flex items-center gap-3">
            {renderBulkAndResetButtons()}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-row gap-3">
              <CustomDropdown icon={Filter} value={statusFilter} options={FILTER_OPTIONS} onChange={(s: string) => { triggerHaptic('light'); setStatusFilter(s); if (s !== "all") window.dispatchEvent(new Event("academy-used-filter")); }} defaultLabel="All Statuses" />
              <CustomDropdown icon={ArrowUpDown} value={sortMode} options={SORT_OPTIONS} onChange={(s: string) => { triggerHaptic('light'); setSortMode(s); }} />
            </div>
            
            <div className="w-px h-5 flex-shrink-0 bg-border" />

            {renderViewModeToggles()}
          </div>
        </div>

        {/* MOBILE LAYOUT */}
        <div className={`flex md:hidden flex-col gap-3 w-full border-t border-border/60 ${globalCompactMode ? 'pt-2' : 'pt-3'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
            <CustomDropdown icon={Filter} value={statusFilter} options={FILTER_OPTIONS} onChange={(s: string) => { triggerHaptic('light'); setStatusFilter(s); if (s !== "all") window.dispatchEvent(new Event("academy-used-filter")); }} defaultLabel="All Statuses" />
            <CustomDropdown icon={ArrowUpDown} value={sortMode} options={SORT_OPTIONS} onChange={(s: string) => { triggerHaptic('light'); setSortMode(s); }} />
          </div>

          <div className="flex items-center justify-between gap-3 w-full pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              {renderBulkAndResetButtons()}
            </div>
            {renderViewModeToggles()}
          </div>
        </div>

      </div>

    </div>
  );
}