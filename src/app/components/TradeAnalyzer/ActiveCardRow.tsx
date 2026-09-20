import { useCallback, useMemo, memo } from "react";
import { X, Pin } from "lucide-react";
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
      className={`flex flex-col md:flex-row md:items-center gap-2.5 bg-card hover:bg-white/5 p-3 md:p-2 rounded-[8px] border transition-colors group ${isPinned ? "border-primary shadow-[0_0_8px_var(--primary)]" : "border-border"}`}
    >
      <div className="flex items-center gap-2.5 w-full min-w-0">
        <div className={`relative w-11 h-11 md:w-10 md:h-10 flex-shrink-0 rounded-[6px] bg-popover overflow-hidden flex items-center justify-center border ${isPinned ? "border-primary/50" : "border-border"}`}>
           <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[13px] z-0" style={getAvatarStyle(card.name)}>
             {getInitials(card.name)}
           </div>
           <img 
             src={proxyUrl || undefined} 
             alt={card.name} 
             onError={(e) => handleImageError(e, card.id)}
             className="absolute inset-0 w-full h-full object-cover object-[center_15%] z-10 bg-popover transition-opacity duration-300" 
           />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
           <div className="flex items-center gap-1.5 min-w-0">
             <span className="text-[14px] font-extrabold text-foreground truncate">
               {card.name}
             </span>
             {dropCfg && (
                <div
                  className="flex-shrink-0 flex items-center gap-1 px-1.5 py-[1px] rounded-[3px]"
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
                   O/C
                </JargonWrap>
             ) : (card.value * card.qty).toLocaleString()}
           </span>

           <div className="hidden md:flex items-center gap-2">
             <QuantitySelector qty={card.qty} onChange={handleQtyInput} minQty={1} />
             <div className="flex items-center ml-0.5 flex-shrink-0 gap-0.5">
               <button 
                 onClick={handlePin} 
                 title={isPinned ? "Unpin unit" : "Pin unit (prevents clearing)"}
                 className={`w-7 h-7 flex items-center justify-center transition-colors flex-shrink-0 active:scale-90 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isPinned ? "text-foreground bg-white/5" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
               >
                 <Pin className="w-[14px] h-[14px]" style={{ fill: isPinned ? "currentColor" : "none" }} />
               </button>
               <button 
                 onClick={handleRemove} 
                 className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0 active:scale-90 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
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
               className={`w-9 h-9 flex items-center justify-center rounded-[6px] border ${isPinned ? "bg-primary text-primary-foreground border-primary" : "bg-popover text-muted-foreground border-border"}`}
             >
               <Pin className="w-4 h-4" style={{ fill: isPinned ? "currentColor" : "none" }} />
             </button>
             <button 
               onClick={handleRemove} 
               className="w-9 h-9 flex items-center justify-center bg-popover border border-border hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded-[6px]"
             >
               <X className="w-4 h-4" />
             </button>
           </div>
         </div>
      </div>
    </div>
  );
});