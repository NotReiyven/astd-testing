import { memo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  ArrowDown,
  ArrowUp,
  Loader2,
  Package,
} from "lucide-react";
import { PopupUnit, MasterUnit } from "../../../types";
import { GRID_STATUS_CFG } from "../../../data";
import { useTradeStore } from "../../../store/useTradeStore";
import { useHistoryModalStore } from "../../../store/useHistoryModalStore";
import { triggerHaptic } from "../../../data/helpers";
import { HighlightText, StatusIcon, JargonWrap } from "./UnitGrid";
import { useAuthStore } from "../../../store/useAuthStore";
import { useInventoryStore } from "../../../store/useInventoryStore";
import { getUnitConservativeValue } from "../InventoryChannel/inventoryUtils";
import { UnitAvatar } from "../shared/UnitAvatar";

export const getStatColor = (label: string, value: number | string) => {
  if (label === "R") {
    const numVal = Number(value) || 0;
    if (numVal >= 19) return "#4DB6AC";
    if (numVal >= 9) return "#81C784";
    if (numVal >= 6) return "#FFB74D";
    return "var(--destructive)";
  }
  if (label === "L") {
    const stringVal = String(value).toLowerCase();
    if (stringVal === "high") return "#4DB6AC";
    if (stringVal === "average") return "var(--muted-foreground)";
    return "var(--destructive)";
  }
  return "var(--foreground)";
};

export const ListHeaderRow = memo(function ListHeaderRow({
  sortMode,
  setSortMode,
  viewMode,
}: {
  sortMode: string;
  setSortMode: (s: string) => void;
  viewMode: string;
}) {
  const isCompact = viewMode === "compact";

  const handleSort = (key: string) => {
    if (key === "value")
      setSortMode(sortMode === "value-desc" ? "value-asc" : "value-desc");
    if (key === "rarity") setSortMode("rarity-desc");
    if (key === "liquidity")
      setSortMode(sortMode === "liq-desc" ? "liq-asc" : "liq-desc");
  };

  const getSortIcon = (key: string) => {
    if (sortMode === `${key}-desc`)
      return <ArrowDown className="w-3 h-3 text-foreground ml-1" />;
    if (sortMode === `${key}-asc`)
      return <ArrowUp className="w-3 h-3 text-foreground ml-1" />;
    return null;
  };

  return (
    <div className="hidden md:flex items-center text-muted-foreground text-sm font-semibold select-none w-full gap-4">
      {!isCompact && <div className="w-10" />}
      <div className="flex-1">Unit</div>
      
      <div className="flex items-center justify-end gap-2 w-[300px] shrink-0">
        <button
          onClick={() => handleSort("value")}
          className="flex-1 flex items-center justify-end transition-colors hover:text-foreground cursor-pointer focus-visible:outline-none"
        >
          Value {getSortIcon("value")}
        </button>
        <button
          onClick={() => handleSort("rarity")}
          className="w-16 flex items-center justify-center transition-colors hover:text-foreground cursor-pointer focus-visible:outline-none"
        >
          R {getSortIcon("rarity")}
        </button>
        <button
          onClick={() => handleSort("liq")}
          className="w-16 flex items-center justify-center transition-colors hover:text-foreground cursor-pointer focus-visible:outline-none"
        >
          Liq {getSortIcon("liq")}
        </button>
      </div>

      <div className="w-48 shrink-0 pl-4 border-l border-border">Notices</div>
    </div>
  );
});

export const UnitListRow = memo(function UnitListRow({
  unit,
  isLast,
  searchQuery,
  viewMode,
}: {
  unit: MasterUnit;
  isLast: boolean;
  searchQuery?: string;
  viewMode: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Implementation omitted for brevity

  const isCompact = viewMode === "compact";

  return (
    <>
      <div className={`relative w-full overflow-hidden bg-card transition-colors hover:bg-muted cursor-pointer ${isLast ? "" : "border-b border-border"}`} onClick={() => setMenuOpen(true)}>
        
        {/* Desktop View */}
        <div className={`hidden md:flex items-center w-full gap-4 px-[var(--panel-p)] ${isCompact ? "py-2" : "py-3"}`}>
          
          {!isCompact && (
            <div className="w-10 h-10 rounded-[4px] bg-muted overflow-hidden shrink-0 border border-border relative">
              <UnitAvatar unitId={unit.id} unitName={unit.name} imageUrl={unit.imageUrl} />
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0 justify-center">
            <span className="text-[var(--ui-text-base)] font-bold text-foreground truncate">
               <HighlightText text={unit.name} query={searchQuery} />
            </span>
            {!isCompact && unit.subtitle && (
              <span className="text-sm font-medium text-muted-foreground truncate">
                <HighlightText text={unit.subtitle} query={searchQuery} />
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 w-[300px] shrink-0 font-mono">
            <div className="flex-1 flex justify-end">
               {/* Display Val logic */}
               <span className="text-[var(--ui-text-base)] font-black text-foreground">
                  {unit.valueDisplay || unit.value.toLocaleString()}
               </span>
            </div>
            <div className="w-16 flex justify-center text-[12px] font-bold" style={{ color: getStatColor("R", unit.rarity) }}>
               {unit.rarity}
            </div>
            <div className="w-16 flex justify-center text-[12px] font-bold" style={{ color: getStatColor("L", unit.liquidity || 'average') }}>
               {(unit.liquidity || 'Average').substring(0,3)}
            </div>
          </div>

          <div className="w-48 shrink-0 pl-4 border-l border-border flex items-center">
            {unit.notice ? (
              <span className="text-[var(--ui-text-sm)] text-muted-foreground line-clamp-2 leading-snug">
                {unit.notice}
              </span>
            ) : (
              <span className="text-[var(--ui-text-sm)] text-muted-foreground italic">No notes</span>
            )}
          </div>
        </div>

        {/* Mobile View */}
        <div className="flex md:hidden flex-col w-full p-[var(--panel-p)] gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-[4px] bg-muted overflow-hidden shrink-0 relative">
                <UnitAvatar unitId={unit.id} unitName={unit.name} imageUrl={unit.imageUrl} />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[var(--ui-text-base)] font-extrabold text-foreground truncate">
                   <HighlightText text={unit.name} query={searchQuery} />
                </span>
                <span className="text-sm font-medium text-muted-foreground truncate">
                   <HighlightText text={unit.subtitle || "Official Unit"} query={searchQuery} />
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right font-mono font-black text-[var(--ui-text-lg)]">
               {unit.valueDisplay || unit.value.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[var(--ui-text-sm)] font-mono border-t border-border/50 pt-2">
            <span className="text-muted-foreground">R <span style={{ color: getStatColor("R", unit.rarity) }}>{unit.rarity}</span></span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">L <span style={{ color: getStatColor("L", unit.liquidity || 'average') }}>{(unit.liquidity || 'Avg').substring(0,3)}</span></span>
            {unit.notice && <span className="flex-1 text-right text-muted-foreground italic truncate ml-auto">{unit.notice}</span>}
          </div>
        </div>

      </div>
      
      {/* Modal portal logic omitted for brevity */}
    </>
  );
});