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
          className={`flex items-center justify-center gap-1.5 px-4 h-[var(--ui-height-btn)] rounded-[4px] text-xs font-bold uppercase tracking-wider transition-[transform,background-color,border-color,color] duration-150 border focus-visible:outline-none shrink-0 active:scale-95 cursor-pointer shadow-sm flex-1 md:flex-none ${
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
            className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 h-[var(--ui-height-btn)] rounded-[4px] text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-400/10 hover:bg-rose-400 hover:text-white transition-[transform,background-color,border-color,color] duration-150 animate-fade-in border border-rose-400/20 active:scale-95 cursor-pointer shadow-sm flex-1 md:flex-none"
            data-tooltip="Reset all filters"
            data-tooltip-side="bottom"
          >
            <X className="w-4 h-4" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="flex bg-input rounded-[4px] p-1 border border-border shadow-inner ml-auto md:ml-0 h-[var(--ui-height-btn)]">
        <button
          onClick={() => { triggerHaptic("light"); setViewMode("grid"); }}
          aria-label="Grid View"
          data-tooltip="Grid View"
          data-tooltip-side="bottom"
          className={`p-1.5 rounded-[3px] transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 focus-visible:outline-none flex items-center justify-center h-full w-9 cursor-pointer ${
            viewMode === "grid" ? "bg-foreground text-background shadow-sm font-bold" : "text-muted-foreground hover:text-foreground hover:bg-card"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => { triggerHaptic("light"); setViewMode("list"); }}
          aria-label="List View"
          data-tooltip="List View"
          data-tooltip-side="bottom"
          className={`p-1.5 rounded-[3px] transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 focus-visible:outline-none flex items-center justify-center h-full w-9 cursor-pointer ${
            viewMode === "list" ? "bg-foreground text-background shadow-sm font-bold" : "text-muted-foreground hover:text-foreground hover:bg-card"
          }`}
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => { triggerHaptic("light"); setViewMode("compact"); }}
          aria-label="Compact View"
          data-tooltip="Compact View"
          data-tooltip-side="bottom"
          className={`hidden md:flex p-2 rounded-[3px] transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 focus-visible:outline-none items-center justify-center h-full w-10 cursor-pointer ${
            viewMode === "compact" ? "bg-foreground text-background shadow-sm font-bold" : "text-muted-foreground hover:text-foreground hover:bg-card"
          }`}
        >
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col w-full bg-card">
      <div className="flex bg-popover border-b border-border w-full overflow-x-auto hide-scrollbar px-[var(--panel-p)] py-1.5 items-center">
        <div className="flex bg-input rounded-[4px] p-1 border border-border overflow-x-auto hide-scrollbar shrink-0 shadow-inner h-[var(--ui-height-input)] items-center">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTierFilter(f);
                if (f !== "All") window.dispatchEvent(new Event("academy-used-filter"));
              }}
              className={`px-3.5 h-full rounded-[3px] text-xs font-bold tracking-wider uppercase transition-[transform,background-color,color,box-shadow] duration-150 whitespace-nowrap focus-visible:outline-none shrink-0 cursor-pointer active:scale-95 flex items-center justify-center ${
                activeTierFilter === f && !deferredSearchQuery
                  ? "bg-foreground text-background shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
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
