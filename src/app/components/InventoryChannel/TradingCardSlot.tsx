import React, { memo } from "react";
import { Plus, Minus, Check, Lock as LockIcon, Search, Package } from "lucide-react";
import { InventoryItem } from "../../../store/useInventoryStore";
import { MasterUnit } from "../../../types";
import { TIER_CONFIG, getTier, GRID_STATUS_CFG, getProxyImage, handleImageError } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";
import { getUnitConservativeValue } from "./inventoryUtils";
import { StatusIcon } from "../shared/Formatters";

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

export const TradingCardSlot = memo(({ 
  item, master, onInspect, isSelectMode, isSelected, toggleSelect,
  stagedGiveQty, stagedGetQty, onQtyChange, isSandbox, isReadOnly, isWishlist, onQuickTransfer
}: TradingCardSlotProps) => {
  const tierKey = getTier(master);
  const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "#5865F2";
  const proxyUrl = getProxyImage(master.id, master.imageUrl);
  const dropCfg = master.status ? GRID_STATUS_CFG[master.status as keyof typeof GRID_STATUS_CFG] : null;

  const totalStaged = stagedGiveQty + stagedGetQty;
  const isFullyStaged = totalStaged >= item.quantity;

  const displayVal = master.value === "owner" 
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

  const tagBgTint = dropCfg?.bg ? dropCfg.bg : "transparent";

  return (
    <div
      onClick={handleClick}
      draggable={!item.is_pinned && !isSelectMode && !isSandbox && !isReadOnly && !isWishlist}
      onDragStart={handleDragStart}
      className={`group relative flex flex-col bg-[#2B2D31] rounded-[8px] transition-all cursor-pointer overflow-hidden border will-change-transform ${
        isSelected 
          ? "border-[#5865F2] ring-2 ring-[#5865F2] scale-[0.98]" 
          : isFullyStaged && !isWishlist
            ? "border-[rgba(255,255,255,0.02)] opacity-50"
            : "border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.18)] hover:-translate-y-0.5"
      }`}
      style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}
    >
      {!isSelectMode && !isSandbox && !isReadOnly && !isWishlist && (
        <div className="absolute top-0 bottom-[35%] left-0 w-8 bg-[#111214] border-r border-[rgba(255,255,255,0.05)] flex flex-col justify-center items-center py-2 gap-2 -translate-x-full group-hover:translate-x-0 transition-transform duration-200 z-50 rounded-br-[8px]" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onQtyChange(item.unit_id, 1)} className="w-6 h-6 flex items-center justify-center bg-[rgba(255,255,255,0.05)] hover:bg-[#23a559]/20 rounded-[4px] transition-colors focus-visible:outline-none"><Plus className="w-4 h-4 text-[#23a559]" /></button>
          <span className="font-mono font-bold text-[11px] text-[#DBDEE1] py-1">{item.quantity}</span>
          <button onClick={() => onQtyChange(item.unit_id, -1)} className="w-6 h-6 flex items-center justify-center bg-[rgba(255,255,255,0.05)] hover:bg-[#ed4245]/20 rounded-[4px] transition-colors focus-visible:outline-none"><Minus className="w-4 h-4 text-[#ed4245]" /></button>
        </div>
      )}

      {isSelected && (
        <div className="absolute top-2 right-2 z-50 bg-[#5865F2] text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md">
          <Check className="w-4 h-4 stroke-[3]" />
        </div>
      )}

      <div 
        className="relative w-full overflow-hidden flex items-center justify-center border-b border-[rgba(255,255,255,0.03)] bg-[#111214]"
        style={{ aspectRatio: "1/1", background: `radial-gradient(circle at 50% 30%, ${tagBgTint} 0%, #18191C 85%)` }}
      >
        {dropCfg && !isSelected && (
          <div 
            className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2 py-1 rounded-full shadow-sm max-w-[70%]"
            style={{ background: dropCfg.bg, border: `1px solid ${dropCfg.border}`, color: dropCfg.color }}
          >
            <StatusIcon status={master.status} />
            <span className="text-[9.5px] font-bold tracking-wide border-b border-dashed border-[rgba(255,255,255,0.4)] truncate">
              {dropCfg.label}
            </span>
          </div>
        )}

        <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
          {item.is_pinned && !isReadOnly && !isWishlist && (
            <div className="bg-[#ed4245] text-white p-1 rounded-[4px] shadow-sm flex items-center justify-center" title="Locked">
              <LockIcon className="w-3 h-3 fill-current" />
            </div>
          )}
          {!isWishlist && (
            <div className="bg-[#111214]/90 backdrop-blur-sm text-[#DBDEE1] font-mono font-bold text-[11px] px-2 py-0.5 rounded-[4px] border border-[rgba(255,255,255,0.08)] shadow-sm">
              x{item.quantity}
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center text-white font-black text-4xl z-0 opacity-40 select-none" style={getAvatarStyle(master.name)}>
          {getInitials(master.name)}
        </div>
        {proxyUrl && (
          <img 
            src={proxyUrl} 
            alt={master.name} 
            className="absolute inset-0 w-full h-full object-cover z-10 transition-transform duration-500 group-hover:scale-105" 
            style={{ objectPosition: "center 15%" }}
            onError={(e) => handleImageError(e, master.id)} 
          />
        )}
        
        {isWishlist && !isSelectMode && !isReadOnly && (
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.7)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-40 flex items-center justify-center p-4">
             <button onClick={(e) => { e.stopPropagation(); onQuickTransfer?.(item.unit_id); }} className="w-full bg-[#23a559] hover:bg-[#1f914e] text-white text-[11px] font-bold py-2 rounded-[6px] shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95">
               <Package className="w-3.5 h-3.5"/> To Vault
             </button>
          </div>
        )}
        
        {!isWishlist && !isSelectMode && (
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 flex items-center justify-center pointer-events-none">
            <Search className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1 bg-[#2B2D31]">
        <div className="flex flex-col mb-2">
          <span className="text-[14px] font-black text-[#F2F3F5] tracking-tight truncate leading-snug">
            {master.name}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#949BA4] truncate mt-0.5">
            {master.subtitle || "Official Unit"}
          </span>

          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded-[3px] border tracking-wider leading-none ${
              obtainability === "UNOB" 
                ? "bg-[#1E1F22] text-[#949BA4] border-[rgba(255,255,255,0.06)]" 
                : "bg-[rgba(255,255,255,0.05)] text-[#DBDEE1] border-[rgba(255,255,255,0.1)]"
            }`}>
              {obtainability}
            </span>
          </div>
        </div>

        <div className="mt-auto pt-2 border-t border-[rgba(255,255,255,0.03)]">
          <div className="pl-2.5 border-l-[3px] mb-2.5" style={{ borderColor: tierColor }}>
            <span className={`text-[15px] font-black font-mono tracking-tight block truncate ${
              displayVal === "Owner's Choice" 
                ? "bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400" 
                : "text-[#F2F3F5]"
            }`}>
              {displayVal}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[4px] p-1.5 flex flex-col justify-center">
              <span className="text-[8px] font-bold uppercase tracking-wider text-[#80848E]">Rarity</span>
              <span className="text-[12px] font-mono font-bold text-[#4DB6AC]">
                {master.rarity ?? "N/A"}
              </span>
            </div>
            <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[4px] p-1.5 flex flex-col justify-center">
              <span className="text-[8px] font-bold uppercase tracking-wider text-[#80848E]">Liquidity</span>
              <span className={`text-[11px] font-mono font-bold uppercase truncate ${
                (master.liquidity || "").toLowerCase() === "high" ? "text-[#4DB6AC]" :
                (master.liquidity || "").toLowerCase() === "low" ? "text-[#E57373]" : "text-[#B5BAC1]"
              }`}>
                {master.liquidity || "AVG"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});