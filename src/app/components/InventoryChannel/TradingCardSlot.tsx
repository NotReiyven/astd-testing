import React, { memo } from "react";
import { Plus, Minus, Check, Lock as LockIcon, Search, Package } from "lucide-react";
import { InventoryItem } from "../../../store/useInventoryStore";
import { MasterUnit } from "../../../types";
import { TIER_CONFIG, getTier, GRID_STATUS_CFG, getProxyImage, handleImageError } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";
import { getUnitConservativeValue } from "./inventoryUtils";
import { StatusIcon, JargonWrap } from "../shared/Formatters";

interface TradingCardSlotProps {
  item: InventoryItem;
  master: MasterUnit;
  onInspect: (item: InventoryItem, master: MasterUnit) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  toggleSelect: (item: InventoryItem) => void;
  stagedGiveQty: number;
  stagedGetQty: number;
  onQtyChange: (unitId: string, delta: number) => void;
  isSandbox?: boolean;
  isReadOnly?: boolean;
  isWishlist?: boolean;
  onQuickTransfer?: (unitId: string) => void;
}

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

export const TradingCardSlot = memo(({ 
  item, master, onInspect, isSelectMode, isSelected, toggleSelect,
  stagedGiveQty, stagedGetQty, onQtyChange, isSandbox, isReadOnly, isWishlist, onQuickTransfer
}: TradingCardSlotProps) => {
  const tierKey = getTier(master);
  const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "var(--primary)";
  const proxyUrl = getProxyImage(master.id, master.imageUrl);
  const dropCfg = master.status ? GRID_STATUS_CFG[master.status as keyof typeof GRID_STATUS_CFG] : null;

  const totalStaged = stagedGiveQty + stagedGetQty;
  const isFullyStaged = totalStaged >= item.quantity;

  const displayVal = master.value === "owner" || master.valueDisplay === "Owner's Choice" || master.valueDisplay === "O/C"
    ? "Owner's Choice" 
    : (master.valueDisplay && master.valueDisplay !== "N/A" 
        ? master.valueDisplay 
        : (getUnitConservativeValue(master) || "N/A").toLocaleString());

  const obtainability = (() => {
    const note = (master.notice || "").toLowerCase();
    if (note.includes("(unobtainable)") || note.includes("[unobtainable]") || note.includes("unobtainable")) return "UNOB";
    if (note.includes("(obtainable)") || note.includes("[obtainable]")) return "OBN";
    return master.obtainability || "UNOB";
  })();

  const handleDragStart = (e: React.DragEvent) => {
    if (item.is_pinned || isSelectMode || isSandbox || isReadOnly || isWishlist) {
      e.preventDefault();
      return;
    }
    const numericValue = typeof master.value === "number" ? master.value : master.valueMin || 0;
    const popupUnit = { id: master.id, name: master.name, subtitle: master.subtitle, value: numericValue };
    e.dataTransfer.setData("unit", JSON.stringify(popupUnit));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleClick = () => {
    if (isSelectMode) toggleSelect(item);
    else onInspect(item, master);
  };

  const liqString = String(master.liquidity || "Average");
  const liqDisplay = liqString.toLowerCase() === "black marketed" ? "BM" : liqString.toUpperCase();
  const rarityDisplay = (Number(master.rarity) || 0) % 1 === 0 ? String(master.rarity || 0) : Number(master.rarity).toFixed(1);

  return (
    <div
      onClick={handleClick}
      draggable={!item.is_pinned && !isSelectMode && !isSandbox && !isReadOnly && !isWishlist}
      onDragStart={handleDragStart}
      className={`group relative flex flex-col h-full bg-card rounded-[6px] transition-all cursor-pointer overflow-hidden will-change-transform specular-card ${
        isSelected 
          ? "border-primary ring-2 ring-primary scale-[0.98]" 
          : isFullyStaged && !isWishlist
            ? "border-border opacity-50 hover:border-muted-foreground"
            : "border-border hover:border-muted-foreground"
      }`}
      style={{ '--hover-glow': tierColor } as React.CSSProperties}
    >
      {!isSelectMode && !isSandbox && !isReadOnly && !isWishlist && (
        <div className="absolute top-0 bottom-[35%] left-0 w-8 bg-card border-r border-border flex flex-col justify-center items-center py-2 gap-2 -translate-x-full group-hover:translate-x-0 transition-transform duration-200 z-50 rounded-br-[6px]" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onQtyChange(item.unit_id, 1)} className="w-6 h-6 flex items-center justify-center bg-muted hover:bg-primary/20 hover:text-primary rounded-[4px] transition-colors focus-visible:outline-none"><Plus className="w-4 h-4" /></button>
          <span className="font-mono font-bold text-[11px] text-foreground py-1">{item.quantity}</span>
          <button onClick={() => onQtyChange(item.unit_id, -1)} className="w-6 h-6 flex items-center justify-center bg-muted hover:bg-destructive/20 hover:text-destructive rounded-[4px] transition-colors focus-visible:outline-none"><Minus className="w-4 h-4" /></button>
        </div>
      )}

      {isSelected && (
        <div className="absolute top-2 right-2 z-50 bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center shadow-md">
          <Check className="w-4 h-4 stroke-[3]" />
        </div>
      )}

      <div 
        className="relative w-full overflow-hidden flex-shrink-0 border-b border-border bg-muted"
        style={{ aspectRatio: "1/1", transform: "translateZ(0)" }}
      >
        {dropCfg && !isSelected && (
          <div className="absolute top-2 left-2 z-50">
            <div 
              className="inline-flex items-center px-2 py-0.5 rounded-[4px] gap-1.5 shadow-sm" 
              style={{ background: dropCfg.bg, border: `1px solid ${dropCfg.border}`, color: dropCfg.color }}
            >
              <StatusIcon status={master.status} />
              <span className="text-[10px] font-bold tracking-wide uppercase transition-colors leading-none">{dropCfg.label}</span>
            </div>
          </div>
        )}

        <div className="absolute top-2 right-2 z-50 flex items-center gap-1">
          {item.is_pinned && !isReadOnly && !isWishlist && (
            <div className="bg-popover text-foreground p-1 rounded-[4px] border border-border shadow-sm flex items-center justify-center" title="Locked">
              <LockIcon className="w-3 h-3 fill-current" />
            </div>
          )}
          {!isWishlist && (
            <div className="bg-popover text-foreground font-mono font-bold text-[11px] px-2 py-0.5 rounded-[4px] border border-border shadow-sm">
              x{item.quantity}
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center text-white font-black text-4xl opacity-20 select-none pointer-events-none" style={getAvatarStyle(master.name)}>
          {getInitials(master.name)}
        </div>
        
        <img 
          src={proxyUrl || undefined} 
          alt={master.name} 
          className="absolute inset-0 w-full h-full object-cover z-10 bg-transparent" 
          style={{ objectPosition: "center 15%" }}
          onError={(e) => handleImageError(e, master.id)} 
        />

        <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_24px_rgba(0,0,0,0.4)]" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card via-card/50 to-transparent pointer-events-none z-20" />

        {isWishlist && !isSelectMode && !isReadOnly && (
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-40 flex items-center justify-center p-4">
             <button onClick={(e) => { e.stopPropagation(); onQuickTransfer?.(item.unit_id); }} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold py-2 rounded-[4px] shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95">
               <Package className="w-3.5 h-3.5"/> To Vault
             </button>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 px-3 md:px-4 pt-3 md:pt-4 pb-3 md:pb-4 relative z-10 bg-card">
        <div className="flex flex-col">
          <div className="flex items-start gap-2">
            <h3 className="text-[13px] md:text-[15px] font-extrabold tracking-tight leading-snug flex-1 min-w-0 line-clamp-2 text-foreground">
              {master.name}
            </h3>
          </div>
          <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider leading-none mt-1 md:mt-1.5 truncate text-muted-foreground">
            {master.subtitle || "Official Unit"}
          </p>
          <div className="flex mt-1.5 md:mt-2">
            <span className={`text-[9px] md:text-[10px] font-bold uppercase px-1.5 md:px-2 py-0.5 rounded-[2px] border tracking-widest leading-none ${
              obtainability === "UNOB" 
                ? "bg-popover text-muted-foreground border-border" 
                : "bg-white/5 text-foreground border-border"
            }`}>
              {obtainability}
            </span>
          </div>
        </div>

        <div className="flex flex-col mt-auto pt-3 md:pt-4 w-full">
          <div className="pl-2 border-l-[3px] w-full min-w-0 mb-1" style={{ borderColor: tierColor }}>
            {displayVal === "Owner's Choice" ? (
              <span className="text-[13px] md:text-[16px] font-black tracking-tight truncate block w-fit bg-foreground text-background px-1.5 py-0.5 rounded-[2px] uppercase">
                <JargonWrap title="Owner's Choice (O/C)" tip="This unit is so rare the owner dictates the price. Value depends entirely on what they want.">
                  Owner's Choice
                </JargonWrap>
              </span>
            ) : (
              <span className="text-[16px] md:text-[22px] font-black tracking-tighter tabular-nums text-foreground font-mono block w-full truncate">
                {displayVal}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-border w-full font-mono">
            <div className="flex flex-col bg-muted border border-border rounded-[4px] px-2.5 py-1.5 transition-colors">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Rarity</span>
              <span className="text-[13px] font-black text-foreground">{rarityDisplay}</span>
            </div>
            <div className="flex flex-col bg-muted border border-border rounded-[4px] px-2.5 py-1.5 transition-colors">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Liquidity</span>
              <span className="text-[12px] font-black text-foreground truncate">{liqDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});