// ================================================
// FILE: src/app/components/MainCanvas/CustomDropdown.tsx
// ================================================

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { triggerHaptic } from "../../../data/helpers";

export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  portalRef: React.RefObject<HTMLElement | null>,
  handler: () => void
) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      // If the click is inside the trigger button OR inside the absolute portal, do nothing.
      if (ref.current && ref.current.contains(target)) return;
      if (portalRef.current && portalRef.current.contains(target)) return;
      
      handlerRef.current();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, portalRef]);
}

export function CustomDropdown({ icon: Icon, value, options, onChange, defaultLabel }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(ref, portalRef, () => setIsOpen(false));

  const handleToggle = () => {
    triggerHaptic('light');
    if (!isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div ref={ref} className="relative w-full sm:min-w-[190px]">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between bg-popover hover:bg-muted rounded-[4px] border border-border px-3 h-[36px] md:h-[32px] transition-all shadow-inner whitespace-nowrap active:scale-[0.98] cursor-pointer focus-visible:outline-none"
      >
        <div className="flex items-center min-w-0">
          <Icon className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" />
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wider truncate">
            {value === "all" ? defaultLabel : options[value]}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground ml-2 shrink-0 opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div 
          ref={portalRef}
          className="absolute bg-popover border border-border rounded-[6px] shadow-[0_10px_30px_rgba(0,0,0,0.6)] z-[99999] py-1.5 flex flex-col animate-slide-up"
          style={{ top: coords.top, left: coords.left, width: coords.width }}
        >
          {Object.entries(options).map(([k, v]) => (
            <button
              key={k}
              onClick={() => { 
                triggerHaptic('medium');
                onChange(k); 
                setIsOpen(false); 
              }}
              className={`flex items-center justify-between text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none cursor-pointer ${
                value === k ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="truncate pr-4">{v as string}</span>
              {value === k && <Check className="w-4 h-4 shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}