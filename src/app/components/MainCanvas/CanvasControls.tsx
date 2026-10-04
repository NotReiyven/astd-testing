import {
  LayoutGrid,
  List,
  ArrowUpDown,
  Filter,
  AlignJustify,
  CheckSquare,
  X
} from "lucide-react";
import { FilterKey } from "../../../types";
import { FILTERS } from "../../../data";
import { CustomDropdown } from "./CustomDropdown";
import { triggerHaptic } from "../../../data/helpers";
import { ResponsiveToolbar } from "../shared/ResponsiveToolbar";

const SORT_OPTIONS = {
  "value-desc": "Value: High to Low",
  "value-asc": "Value: Low to High",
  "liq-desc": "Liquidity: High to Low",
  "liq-asc": "Liquidity: Low to High",
  "rarity-desc": "Rarity: Rarest First",
  "alpha-asc": "Alphabetical: A-Z",
};

const FILTER_OPTIONS = {
  all: "All Statuses",
  stable: "Stable",
  unstable: "Unstable",
  rising: "Rising",
  dropping: "Dropping",
  inflated: "Inflated",
  deflated: "Deflated",
  varies: "Varies",
  lowballed: "Lowballed",
  highballed: "Highballed",
  gatekept: "Gatekept",
  hyped: "Hyped",
  "black-marketed": "Black Market",
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
  activeTierFilter,
  setActiveTierFilter,
  deferredSearchQuery,
  hasFiltersApplied,
  handleResetFilters,
  statusFilter,
  setStatusFilter,
  sortMode,
  setSortMode,
  viewMode,
  setViewMode,
  isSelectMode,
  setIsSelectMode,
}: CanvasControlsProps) {
  
  const FilterNodes = (
    <>
      <CustomDropdown
        icon={Filter}
        value={statusFilter}
        options={FILTER_OPTIONS}
        onChange={(s) => {
          triggerHaptic("light");
          setStatusFilter(s);
          if (s !== "all") window.dispatchEvent(new Event("academy-used-filter"));
        }}
        defaultLabel="All Statuses"
      />
      <CustomDropdown
        icon={ArrowUpDown}
        value={sortMode}
        options={SORT_OPTIONS}
        onChange={(s) => {
          triggerHaptic("light");
          setSortMode(s);
        }}
      />
    </>
  );

  const ActionNodes = (
    <>
      <div className="flex gap-2 w-full md:w-auto">
        <button
          onClick={() => {
            triggerHaptic("medium");
            setIsSelectMode(!isSelectMode);
          }}
          className={`flex items-center justify-center gap-1.5 px-4 h-[var(--ui-height-btn)] rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all border focus-visible:outline-none shrink-0 active:scale-95 cursor-pointer shadow-sm flex-1 md:flex-none ${
            isSelectMode
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-popover text-foreground/90 border-border hover:bg-muted"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>{isSelectMode ? "Cancel" : "Bulk Select"}</span>
        </button>

        {hasFiltersApplied && (
          <button
            onClick={() => {
              triggerHaptic("medium");
              handleResetFilters();
            }}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 h-[var(--ui-height-btn)] rounded-[4px] text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-400/10 hover:bg-rose-400 hover:text-white transition-all duration-200 animate-fade-in border border-rose-400/20 active:scale-95 cursor-pointer shadow-sm flex-1 md:flex-none"
            title="Reset Filters"
          >
            <X className="w-4 h-4" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="flex bg-popover rounded-[4px] p-1 border border-border shadow-sm ml-auto md:ml-0 h-[var(--ui-height-btn)]">
        <button
          onClick={() => { triggerHaptic("light"); setViewMode("grid"); }}
          className={`p-1.5 rounded-[3px] transition-all duration-200 focus-visible:outline-none flex items-center justify-center h-full w-9 ${
            viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => { triggerHaptic("light"); setViewMode("list"); }}
          className={`p-1.5 rounded-[3px] transition-all duration-200 focus-visible:outline-none flex items-center justify-center h-full w-9 ${
            viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => { triggerHaptic("light"); setViewMode("compact"); }}
          className={`hidden md:flex p-2 rounded-[3px] transition-all duration-200 focus-visible:outline-none items-center justify-center h-full w-10 ${
            viewMode === "compact" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col w-full bg-card">
      <div className="flex bg-popover border-b border-border w-full overflow-x-auto hide-scrollbar px-[var(--panel-p)]">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              triggerHaptic("light");
              setActiveTierFilter(f);
              if (f !== "All") window.dispatchEvent(new Event("academy-used-filter"));
            }}
            className={`px-4 py-2.5 text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap focus-visible:outline-none shrink-0 cursor-pointer border-b-2 ${
              activeTierFilter === f && !deferredSearchQuery
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      
      <ResponsiveToolbar 
        title="List Controls"
        filterNodes={FilterNodes}
        actionNodes={ActionNodes}
        className="!border-none !shadow-none"
      />
    </div>
  );
}