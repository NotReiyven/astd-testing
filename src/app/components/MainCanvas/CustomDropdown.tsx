// ================================================
// FILE: src/app/components/MainCanvas/CustomDropdown.tsx
// ================================================

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { triggerHaptic } from "../../../data/helpers";

export function useClickOutside<T extends HTMLElement>(ref: React.RefObject<T | null>, handler: () => void) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handlerRef.current();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref]);
}

export function CustomDropdown({ icon: Icon, value, options, onChange, defaultLabel }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  return (
    <div ref={ref} className="relative min-w-[170px] sm:min-w-[190px]">
      <button
        onClick={() => {
          triggerHaptic('light');
          setIsOpen(!isOpen);
        }}
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

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[200px] bg-popover border border-border rounded-[6px] shadow-[0_10px_30px_rgba(0,0,0,0.6)] z-[9999] py-1.5 flex flex-col animate-slide-up">
          {Object.entries(options).map(([k, v]) => (
            <button
              key={k}
              onClick={() => { 
                triggerHaptic('medium');
                onChange(k); 
                setIsOpen(false); 
              }}
              className={`flex items-center justify-between text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none cursor-pointer ${
                value === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <span className="truncate pr-4">{v as string}</span>
              {value === k && <Check className="w-4 h-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}