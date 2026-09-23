// ================================================
// FILE: src/app/components/TradeAnalyzer/ActiveCardRow.tsx
// ================================================

import { useCallback, useMemo, memo } from "react";
import { X, Pin } from "lucide-react";
import { TradeCard } from "../../../types";
import { GRID_STATUS_CFG } from "../../../data";
import { useUnits } from "../../../context/UnitContext";
import { StatusIcon, JargonWrap } from "../MainCanvas/UnitGrid";
import { QuantitySelector } from "../ui/QuantitySelector";
import { triggerHaptic } from "../../../data/helpers";
import { UnitAvatar } from "../shared/UnitAvatar";

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

  const handleQtyInput = useCallback((newQty: number) => {
    onQtyChange(card.id, newQty);
  }, [card.id, onQtyChange]);

  const handleRemove = useCallback(() => {
    triggerHaptic('light');
    onRemove(card.id);
  }, [card.id, onRemove]);

  const handlePin = useCallback(() => {
    triggerHaptic('light');
    onTogglePin(card.id);
  }, [card.id, onTogglePin]);

  const isOwnerChoice = masterData?.value === "owner" || masterData?.valueDisplay === "Owner's Choice" || masterData?.valueDisplay === "O/C";

  return (
    <div 
      className={`flex flex-col md:flex-row md:items-center gap-2.5 bg-card hover:bg-muted p-3 md:p-2 rounded-[6px] border transition-colors duration-150 group ${isPinned ? "border-primary" : "border-border"}`}
    >
      <div className="flex items-center gap-2.5 w-full min-w-0">
        <div className={`relative w-11 h-11 md:w-10 md:h-10 flex-shrink-0 rounded-[4px] bg-muted overflow-hidden flex items-center justify-center border ${isPinned ? "border-primary/50" : "border-border"}`}>
           <UnitAvatar
             unitId={card.id}
             unitName={card.name}
             imageUrl={masterData?.imageUrl}
             isOpaqueFallback
             fallbackClassName="absolute inset-0 flex items-center justify-center text-white font-black text-[13px] z-0"
             imageClassName="absolute inset-0 w-full h-full object-cover object-[center_15%] z-10 bg-muted"
           />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
           <div className="flex items-center gap-1.5 min-w-0">
             <span className="text-[14px] font-extrabold text-foreground truncate">
               {card.name}
             </span>
             {dropCfg && (
                <div
                  className="flex-shrink-0 flex items-center gap-1 px-1.5 py-[1px] rounded-[2px]"
                  style={{ background: dropCfg.bg, border: `1px solid ${dropCfg.border}` }}
                >
                  <StatusIcon status={masterData?.status} />
                  <span className="text-[8px] font-bold leading-none uppercase tracking-wide" style={{ color: dropCfg.color }}>
                    <JargonWrap title={dropCfg.label} tip={dropCfg.tip}>
                      {dropCfg.label}
                    </JargonWrap>
                  </span>
                </div>
             )}
           </div>
           {card.subtitle && (
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate mt-0.5">
               {card.subtitle}
             </span>
           )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
           <span 
             className="text-[14px] font-bold text-foreground font-mono tracking-tight text-right truncate max-w-[90px]" 
             title={isOwnerChoice ? "" : (card.value * card.qty).toLocaleString()}
           >
             {isOwnerChoice ? (
                <JargonWrap title="Owner's Choice (O/C)" tip="This unit is so rare the owner dictates the price. Value depends entirely on what they want.">
                  <span className="bg-foreground text-background px-1.5 py-0.5 rounded-[2px] text-[11px] uppercase">O/C</span>
                </JargonWrap>
             ) : (card.value * card.qty).toLocaleString()}
           </span>

           <div className="hidden md:flex items-center gap-2">
             <QuantitySelector qty={card.qty} onChange={handleQtyInput} minQty={1} />
             <div className="flex items-center ml-0.5 flex-shrink-0 gap-0.5">
               <button 
                 onClick={handlePin} 
                 title={isPinned ? "Unpin unit" : "Pin unit (prevents clearing)"}
                 className={`w-7 h-7 flex items-center justify-center transition-all duration-150 flex-shrink-0 active:scale-90 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${isPinned ? "text-foreground bg-muted border border-border" : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"}`}
               >
                 <Pin className="w-[14px] h-[14px]" style={{ fill: isPinned ? "currentColor" : "none" }} />
               </button>
               <button 
                 onClick={handleRemove} 
                 className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive-foreground hover:bg-destructive transition-all duration-150 flex-shrink-0 active:scale-90 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive cursor-pointer"
               >
                 <X className="w-[15px] h-[15px]" />
               </button>
             </div>
           </div>
        </div>
      </div>

      <div className="flex md:hidden items-center justify-between pt-2 border-t border-border w-full">
         <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Quantity</span>
         <div className="flex items-center gap-3">
           <QuantitySelector qty={card.qty} onChange={handleQtyInput} minQty={1} />
           <div className="flex items-center gap-1">
             <button 
               onClick={handlePin} 
               title={isPinned ? "Unpin unit" : "Pin unit"}
               className={`w-9 h-9 flex items-center justify-center rounded-[4px] border transition-all active:scale-95 cursor-pointer ${isPinned ? "bg-primary text-primary-foreground border-primary" : "bg-popover text-muted-foreground border-border hover:bg-muted"}`}
             >
               <Pin className="w-4 h-4" style={{ fill: isPinned ? "currentColor" : "none" }} />
             </button>
             <button 
               onClick={handleRemove} 
               className="w-9 h-9 flex items-center justify-center bg-popover border border-border hover:bg-destructive hover:text-destructive-foreground text-muted-foreground rounded-[4px] transition-all active:scale-95 cursor-pointer"
             >
               <X className="w-4 h-4" />
             </button>
           </div>
         </div>
      </div>
    </div>
  );
});