import { useState, useEffect, memo } from "react";
import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  qty: number;
  onChange: (val: number) => void;
  minQty?: number;
  maxQty?: number;
}

export const QuantitySelector = memo(({ 
  qty, 
  onChange, 
  minQty = 1, 
  maxQty = 9999 
}: QuantitySelectorProps) => {
  const [val, setVal] = useState(qty.toString());

  useEffect(() => {
    setVal(qty.toString());
  }, [qty]);

  const handleBlur = () => {
    let parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < minQty) parsed = minQty;
    if (parsed > maxQty) parsed = maxQty;
    
    setVal(parsed.toString());
    if (parsed !== qty) onChange(parsed);
  };

  const handleMinus = (e: React.MouseEvent) => {
    const delta = e.shiftKey ? 10 : 1;
    onChange(Math.max(minQty, qty - delta));
  };

  const handlePlus = (e: React.MouseEvent) => {
    const delta = e.shiftKey ? 10 : 1;
    onChange(Math.min(maxQty, qty + delta));
  };

  return (
    <div className="flex items-center bg-[#1E1F22] rounded-[6px] md:rounded-[4px] p-0.5 md:p-1 border border-[rgba(255,255,255,0.04)] shadow-inner flex-shrink-0">
      <button 
        onClick={handleMinus} 
        title="Shift+Click to remove 10"
        className="w-10 h-10 md:w-6 md:h-6 flex items-center justify-center text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#2B2D31] rounded-[4px] md:rounded-[3px] transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]"
      >
        <Minus className="w-4 h-4 md:w-3 md:h-3" />
      </button>

      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const delta = e.shiftKey ? 10 : 1;
            const newVal = Math.min(qty + delta, maxQty);
            setVal(newVal.toString());
            onChange(newVal);
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const delta = e.shiftKey ? 10 : 1;
            const newVal = Math.max(qty - delta, minQty);
            setVal(newVal.toString());
            onChange(newVal);
          }
        }}
        title="Up/Down arrows to adjust. Shift for ±10"
        className="w-12 h-10 md:w-8 md:h-6 bg-transparent hover:bg-[rgba(255,255,255,0.04)] focus:bg-[#111214] text-center text-[15px] md:text-[12.5px] font-bold text-[#F2F3F5] outline-none focus:ring-1 focus:ring-[#5865F2] rounded-[3px] transition-all cursor-text select-all"
      />

      <button 
        onClick={handlePlus} 
        title="Shift+Click to add 10"
        className="w-10 h-10 md:w-6 md:h-6 flex items-center justify-center text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#2B2D31] rounded-[4px] md:rounded-[3px] transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]"
      >
        <Plus className="w-4 h-4 md:w-3 md:h-3" />
      </button>
    </div>
  );
});