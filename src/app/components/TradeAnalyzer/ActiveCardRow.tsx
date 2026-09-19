import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { X, Plus, Minus, Pin } from "lucide-react";
import { TradeCard } from "../../../types";
import { GRID_STATUS_CFG, getProxyImage, handleImageError } from "../../../data";
import { useUnits } from "../../../context/UnitContext";
import { getAvatarStyle, getInitials } from "./summaryUtils";
import { StatusIcon, JargonWrap } from "../MainCanvas/UnitGrid";
import { QuantitySelector } from "../ui/QuantitySelector";

export const ActiveCardRow = memo(function ActiveCardRow({
  card,
  onQtyChange,
  onRemove,
  isPinned,
  onTogglePin
}: {
  card: TradeCard;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
}) {
  const { units } = useUnits();

  const masterData = useMemo(() => units.find(u => u.id === card.id), [units, card.id]);

  const dropCfg = masterData?.status ? GRID_STATUS_CFG[masterData.status as keyof typeof GRID_STATUS_CFG] : null;
  const proxyUrl = getProxyImage(card.id, masterData?.imageUrl);

  const handleQtyInput = useCallback((newQty: number) => {
    onQtyChange(card.id, newQty);
  }, [card.id, onQtyChange]);

  const handleRemove = useCallback(() => onRemove(card.id), [card.id, onRemove]);
  const handlePin = useCallback(() => onTogglePin(card.id), [card.id, onTogglePin]);

  const isOwnerChoice = masterData?.value === "owner" || masterData?.valueDisplay === "Owner's Choice" || masterData?.valueDisplay === "O/C";

  return (
    <div 
      className={`flex flex-col md:flex-row md:items-center gap-2.5 bg-[#2B2D31] hover:bg-[rgba(255,255,255,0.04)] p-3 md:p-2 rounded-[8px] border transition-colors group ${isPinned ? "border-[#5865F2] shadow-[0_0_8px_rgba(88,101,242,0.15)]" : "border-[rgba(255,255,255,0.04)]"}`}
    >
      {/* Top Row on Mobile / Single Row on Desktop */}
      <div className="flex items-center gap-2.5 w-full min-w-0">
        <div className={`relative w-11 h-11 md:w-10 md:h-10 flex-shrink-0 rounded-[6px] bg-[#111214] overflow-hidden flex items-center justify-center border ${isPinned ? "border-[rgba(88,101,242,0.5)]" : "border-[rgba(255,255,255,0.04)]"}`}>
           <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[13px] z-0" style={getAvatarStyle(card.name)}>
             {getInitials(card.name)}
           </div>
           <img 
             src={proxyUrl} 
             alt={card.name} 
             onError={(e) => handleImageError(e, card.id)}
             className="absolute inset-0 w-full h-full object-cover object-[center_15%] z-10 bg-[#111214] transition-opacity duration-300" 
           />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
           <div className="flex items-center gap-1.5 min-w-0">
             <span className="text-[14px] font-extrabold text-[#F2F3F5] truncate" style={{ fontFamily: "'Inter', sans-serif" }}>
               {card.name}
             </span>
             {dropCfg && (
                <div
                  className="flex-shrink-0 flex items-center gap-1 px-1.5 py-[1px] rounded-[3px]"
                  style={{ background: dropCfg.bg, border: `1px solid ${dropCfg.border}` }}
                >
                  <StatusIcon status={masterData?.status} />
                  <span className="text-[8px] font-bold leading-none uppercase tracking-wide" style={{ color: dropCfg.color, fontFamily: "'Inter', sans-serif" }}>
                    <JargonWrap title={dropCfg.label} tip={dropCfg.tip}>
                      {dropCfg.label}
                    </JargonWrap>
                  </span>
                </div>
             )}
           </div>
           {card.subtitle && (
             <span className="text-[10px] font-bold text-[#80848E] uppercase tracking-wide truncate mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
               {card.subtitle}
             </span>
           )}
        </div>

        {/* Total Value & Desktop Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
           <span 
             className="text-[14px] font-bold text-[#F2F3F5] font-mono tracking-tight text-right truncate max-w-[90px]" 
             title={isOwnerChoice ? "" : (card.value * card.qty).toLocaleString()}
           >
             {isOwnerChoice ? (
                <JargonWrap title="Owner's Choice (O/C)" tip="This unit is so rare the owner dictates the price. Value depends entirely on what they want.">
                   O/C
                </JargonWrap>
             ) : (card.value * card.qty).toLocaleString()}
           </span>

           {/* Desktop Quantity Selector & Actions */}
           <div className="hidden md:flex items-center gap-2">
             <QuantitySelector qty={card.qty} onChange={handleQtyInput} minQty={1} />
             <div className="flex items-center ml-0.5 flex-shrink-0 gap-0.5">
               <button 
                 onClick={handlePin} 
                 title={isPinned ? "Unpin unit" : "Pin unit (prevents clearing)"}
                 className={`w-7 h-7 flex items-center justify-center transition-colors flex-shrink-0 active:scale-90 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] ${isPinned ? "text-[#DBDEE1]" : "text-[#80848E] hover:text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.04)]"}`}
               >
                 <Pin className="w-[14px] h-[14px]" style={{ fill: isPinned ? "currentColor" : "none" }} />
               </button>
               <button 
                 onClick={handleRemove} 
                 className="w-7 h-7 flex items-center justify-center text-[#80848E] hover:text-[#ed4245] hover:bg-[rgba(237,66,69,0.1)] transition-colors flex-shrink-0 active:scale-90 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ed4245]"
               >
                 <X className="w-[15px] h-[15px]" />
               </button>
             </div>
           </div>
        </div>
      </div>

      {/* Bottom Row on Mobile (Quantity Selector & Pin/Remove) */}
      <div className="flex md:hidden items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.04)] w-full">
         <span className="text-[11px] font-bold text-[#80848E] uppercase tracking-wider">Quantity</span>
         <div className="flex items-center gap-3">
           <QuantitySelector qty={card.qty} onChange={handleQtyInput} minQty={1} />
           <div className="flex items-center gap-1">
             <button 
               onClick={handlePin} 
               title={isPinned ? "Unpin unit" : "Pin unit"}
               className={`w-9 h-9 flex items-center justify-center rounded-[6px] ${isPinned ? "bg-[#5865F2] text-white" : "bg-[#1E1F22] text-[#80848E]"}`}
             >
               <Pin className="w-4 h-4" style={{ fill: isPinned ? "currentColor" : "none" }} />
             </button>
             <button 
               onClick={handleRemove} 
               className="w-9 h-9 flex items-center justify-center bg-[#1E1F22] hover:bg-[#ed4245]/20 text-[#80848E] hover:text-[#ed4245] rounded-[6px]"
             >
               <X className="w-4 h-4" />
             </button>
           </div>
         </div>
      </div>
    </div>
  );
});