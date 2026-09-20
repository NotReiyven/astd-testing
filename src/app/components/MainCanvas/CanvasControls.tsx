import { X, LayoutGrid, List, ArrowUpDown, Filter, AlignJustify } from "lucide-react";
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
}

export function CanvasControls({
  activeTierFilter, setActiveTierFilter, deferredSearchQuery, hasFiltersApplied,
  handleResetFilters, statusFilter, setStatusFilter, sortMode, setSortMode,
  viewMode, setViewMode
}: CanvasControlsProps) {
  return (
    <div className="flex-shrink-0 flex flex-col xl:flex-row xl:items-center justify-between px-4 md:px-6 py-3 md:py-4 z-40 relative gap-4 bg-card border-b border-border shadow-sm">
      <div 
        className="flex flex-nowrap gap-2 overflow-x-auto hide-scrollbar pb-1 -mb-1 mask-fade-edges w-full xl:w-auto snap-x snap-mandatory pr-6"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchStart={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        <style>{`.mask-fade-edges { mask-image: linear-gradient(to right, black 95%, transparent 100%); -webkit-mask-image: linear-gradient(to right, black 95%, transparent 100%); }`}</style>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setActiveTierFilter(f);
              if (f !== "All") window.dispatchEvent(new Event("academy-used-filter"));
            }}
            className="snap-start flex-shrink-0 px-4 py-2 md:py-1.5 rounded-full text-[12px] font-bold tracking-wide transition-all duration-200 ease-out active:scale-95 border"
            style={
              activeTierFilter === f && !deferredSearchQuery
                ? { background: "var(--primary)", color: "var(--primary-foreground)", borderColor: "var(--primary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }
                : { background: "transparent", color: "var(--muted-foreground)", borderColor: "var(--border)" }
            }
          >
            {f}
          </button>
        ))}
      </div>

      <div 
        className="flex items-center gap-2.5 w-full xl:w-auto flex-wrap"
        onTouchStart={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        {hasFiltersApplied && (
          <button 
            onClick={handleResetFilters} 
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 md:px-3 md:py-1.5 rounded-[6px] text-[11px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors animate-fade-in border border-destructive/20"
            title="Reset Filters"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}

        <CustomDropdown icon={Filter} value={statusFilter} options={FILTER_OPTIONS} onChange={(s: string) => { setStatusFilter(s); if (s !== "all") window.dispatchEvent(new Event("academy-used-filter")); }} defaultLabel="All Statuses" />
        <CustomDropdown icon={ArrowUpDown} value={sortMode} options={SORT_OPTIONS} onChange={setSortMode} />
        <div className="hidden md:block w-px h-5 mx-1 flex-shrink-0 bg-border" />

        <div className="flex bg-popover rounded-[6px] p-[3px] border border-border flex-shrink-0 ml-auto md:ml-0 shadow-sm">
          <button onClick={() => setViewMode("grid")} className={`p-2 md:p-1.5 rounded-[4px] transition-all duration-200 ease-out ${viewMode === "grid" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`} title="Grid View">
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={`p-2 md:p-1.5 rounded-[4px] transition-all duration-200 ease-out ${viewMode === "list" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`} title="List View">
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("compact")} className={`hidden md:block p-2 md:p-1.5 rounded-[4px] transition-all duration-200 ease-out ${viewMode === "compact" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`} title="Compact View">
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}