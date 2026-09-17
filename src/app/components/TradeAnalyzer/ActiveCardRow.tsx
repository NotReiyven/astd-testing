import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { X, Plus, Minus, Pin } from "lucide-react";
import { TradeCard } from "../../../types";
import { GRID_STATUS_CFG, getProxyImage } from "../../../data";
import { useUnits } from "../../../context/UnitContext";
import { getAvatarStyle, getInitials, handleImageError } from "./summaryUtils";

const QuantityInput = memo(({ qty, onChange }: { qty: number; onChange: (val: number) => void }) => {
  const [val, setVal] = useState(qty.toString());

  useEffect(() => {
    setVal(qty.toString());
  }, [qty]);

  const handleBlur = () => {
    let parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 1) parsed = 1;
    // Prevent calculator abuse by clamping max quantity
    if (parsed > 9999) parsed = 9999;
    setVal(parsed.toString());
    if (parsed !== qty) onChange(parsed);
  };

  return (
    <input
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className="w-8 h-5 bg-transparent hover:bg-[rgba(255,255,255,0.04)] focus:bg-[#111214] text-center text-[12.5px] font-bold text-[#F2F3F5] outline-none focus:ring-1 focus:ring-[#5865F2] rounded-[3px] transition-all cursor-text select-all"
    />
  );
});

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

  const handleQtyInput = useCallback((newQty: number) => onQtyChange(card.id, Math.min(newQty, 9999)), [card.id, onQtyChange]);
  
  // Shift+Click checks for bulk modification
  const handleMinus = useCallback((e: React.MouseEvent) => {
    const delta = e.shiftKey ? 10 : 1;
    onQtyChange(card.id, Math.max(1, card.qty - delta));
  }, [card.id, card.qty, onQtyChange]);
  
  const handlePlus = useCallback((e: React.MouseEvent) => {
    const delta = e.shiftKey ? 10 : 1;
    onQtyChange(card.id, Math.min(card.qty + delta, 9999));
  }, [card.id, card.qty, onQtyChange]);
  
  const handleRemove = useCallback(() => onRemove(card.id), [card.id, onRemove]);
  const handlePin = useCallback(() => onTogglePin(card.id), [card.id, onTogglePin]);

  const isOwnerChoice = masterData?.value === "owner" || masterData?.valueDisplay === "Owner's Choice" || masterData?.valueDisplay === "O/C";

  return (
    <div 
      className={`flex items-center gap-2 bg-[#2B2D31] hover:bg-[rgba(255,255,255,0.04)] p-2 rounded-[8px] border transition-colors group ${isPinned ? "border-[#5865F2] shadow-[0_0_8px_rgba(88,101,242,0.15)]" : "border-[rgba(255,255,255,0.04)]"}`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '58px' }}
    >
      <div className={`relative w-10 h-10 flex-shrink-0 rounded-[6px] bg-[#111214] overflow-hidden flex items-center justify-center border ${isPinned ? "border-[rgba(88,101,242,0.5)]" : "border-[rgba(255,255,255,0.04)]"}`}>
         <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[13px] z-0" style={getAvatarStyle(card.name)}>
           {getInitials(card.name)}
         </div>
         <img 
           src={proxyUrl} 
           alt={card.name} 
           onError={(e) => handleImageError(e, card.id, masterData?.imageUrl)}
           className="absolute inset-0 w-full h-full object-cover object-[center_15%] z-10 bg-[#111214] transition-opacity duration-300" 
         />
      </div>

      <div className="flex flex-col min-w-0 flex-1 mr-1">
         <div className="flex items-center gap-1.5 min-w-0">
           <span className="text-[13px] md:text-[14px] font-extrabold text-[#F2F3F5] truncate" style={{ fontFamily: "'Inter', sans-serif" }}>
             {card.name}
           </span>
           {dropCfg && (
              <div
                className="flex-shrink-0 flex items-center px-1.5 py-[1px] rounded-[3px]"
                style={{ background: dropCfg.bg, border: `1px solid ${dropCfg.border}` }}
              >
                <span className="text-[8px] font-bold leading-none uppercase tracking-wide" style={{ color: dropCfg.color, fontFamily: "'Inter', sans-serif" }}>
                  {dropCfg.label}
                </span>
              </div>
           )}
         </div>
         {card.subtitle && (
           <span className="text-[9px] font-bold text-[#80848E] uppercase tracking-wide truncate" style={{ fontFamily: "'Inter', sans-serif" }}>
             {card.subtitle}
           </span>
         )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
         <span 
           className="text-[13px] md:text-[14px] font-bold text-[#F2F3F5] font-mono tracking-tight text-right mr-1 flex-shrink-1 min-w-0 truncate max-w-[80px]" 
           title={isOwnerChoice ? "Owner's Choice" : (card.value * card.qty).toLocaleString()}
         >
           {isOwnerChoice ? "O/C" : (card.value * card.qty).toLocaleString()}
         </span>

         <div className="flex items-center bg-[#1E1F22] rounded-[4px] p-0.5 border border-[rgba(255,255,255,0.04)] shadow-inner flex-shrink-0">
           <button 
             onClick={handleMinus} 
             title="Shift+Click to remove 10"
             className="w-5 h-5 flex items-center justify-center text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#2B2D31] rounded-[3px] transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]"
           >
             <Minus className="w-3 h-3" />
           </button>

           <QuantityInput qty={card.qty} onChange={handleQtyInput} />

           <button 
             onClick={handlePlus} 
             title="Shift+Click to add 10"
             className="w-5 h-5 flex items-center justify-center text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#2B2D31] rounded-[3px] transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]"
           >
             <Plus className="w-3 h-3" />
           </button>
         </div>

         <div className="flex items-center ml-0.5 flex-shrink-0">
           <button 
             onClick={handlePin} 
             title={isPinned ? "Unpin unit" : "Pin unit (prevents clearing)"}
             className={`w-6 h-6 flex items-center justify-center transition-colors flex-shrink-0 active:scale-90 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] ${isPinned ? "text-[#DBDEE1]" : "text-[#80848E] hover:text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.04)]"}`}
           >
             <Pin className="w-[14px] h-[14px]" style={{ fill: isPinned ? "currentColor" : "none" }} />
           </button>

           <button 
             onClick={handleRemove} 
             className="w-6 h-6 flex items-center justify-center text-[#80848E] hover:text-[#ed4245] hover:bg-[rgba(237,66,69,0.1)] transition-colors flex-shrink-0 active:scale-90 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ed4245]"
           >
             <X className="w-[15px] h-[15px]" />
           </button>
         </div>
      </div>
    </div>
  );
});