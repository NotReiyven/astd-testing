import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";

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
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center bg-[#1E1F22] hover:bg-[rgba(255,255,255,0.04)] rounded-[4px] border border-[rgba(255,255,255,0.04)] px-3 h-[30px] transition-colors shadow-inner"
      >
        <Icon className="w-3.5 h-3.5 text-[#949BA4] mr-2" />
        <span className="text-[11px] font-bold text-[#DBDEE1] uppercase tracking-wider">
          {value === "all" ? defaultLabel : options[value]}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-max min-w-[200px] bg-[#2B2D31] border border-[rgba(255,255,255,0.08)] rounded-[6px] shadow-xl z-50 py-1.5 flex flex-col">
          {Object.entries(options).map(([k, v]) => (
            <button
              key={k}
              onClick={() => { onChange(k); setIsOpen(false); }}
              className={`flex items-center justify-between text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                value === k ? "bg-[#5865F2] text-white" : "text-[#949BA4] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#DBDEE1]"
              }`}
            >
              <span>{v as string}</span>
              {value === k && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}