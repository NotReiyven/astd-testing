import { X, LayoutGrid, List, ArrowUpDown, Filter, AlignJustify, CheckSquare } from "lucide-react";
import { FilterKey } from "../../../types";
import { FILTERS } from "../../../data";
import { CustomDropdown } from "./CustomDropdown";

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
  return (
    <div className="flex-shrink-0 flex flex-col px-4 md:px-6 py-3 md:py-4 z-40 relative gap-3 bg-card border-b border-border shadow-sm">
      
      {/* ROW 1: Dedicated Tier Filter Pills (Scrollable Container) */}
      <div className="flex bg-popover rounded-[4px] p-1 border border-border w-full md:w-fit overflow-x-auto hide-scrollbar shadow-inner">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setActiveTierFilter(f);
              if (f !== "All") window.dispatchEvent(new Event("academy-used-filter"));
            }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-[4px] text-[12px] font-bold tracking-wide uppercase transition-all whitespace-nowrap focus-visible:outline-none shrink-0 ${
              activeTierFilter === f && !deferredSearchQuery
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ROW 2: Utility Controls, Bulk Select, Filters, Sort, and View Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full pt-3 border-t border-border/60">
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSelectMode(!isSelectMode)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors border focus-visible:outline-none shrink-0 min-h-[36px] ${
              isSelectMode ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-popover text-muted-foreground border-border hover:text-foreground hover:bg-muted"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isSelectMode ? "Cancel Select" : "Bulk Select"}</span>
          </button>

          {hasFiltersApplied && (
            <button 
              onClick={handleResetFilters} 
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors animate-fade-in border border-destructive/20 min-h-[36px]"
              title="Reset Filters"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="grid grid-cols-2 md:flex md:flex-row gap-2.5">
            <CustomDropdown icon={Filter} value={statusFilter} options={FILTER_OPTIONS} onChange={(s: string) => { setStatusFilter(s); if (s !== "all") window.dispatchEvent(new Event("academy-used-filter")); }} defaultLabel="All Statuses" />
            <CustomDropdown icon={ArrowUpDown} value={sortMode} options={SORT_OPTIONS} onChange={setSortMode} />
          </div>
          
          <div className="hidden md:block w-px h-5 flex-shrink-0 bg-border" />

          <div className="flex justify-end">
            <div className="flex bg-popover rounded-[6px] p-[3px] border border-border flex-shrink-0 shadow-sm w-fit">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-[4px] transition-all duration-200 ease-out ${viewMode === "grid" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`} title="Grid View">
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-[4px] transition-all duration-200 ease-out ${viewMode === "list" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`} title="List View">
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("compact")} className={`hidden md:block p-1.5 rounded-[4px] transition-all duration-200 ease-out ${viewMode === "compact" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`} title="Compact View">
                <AlignJustify className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}