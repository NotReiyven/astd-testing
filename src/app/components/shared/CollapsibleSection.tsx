import React, { useState, ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { triggerHaptic } from "../../../data/helpers";

/**
 * A standardized hideable section wrapper. 
 * Allows the UI to degrade gracefully on mobile by tucking secondary information out of sight.
 */
export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  headerRight
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  headerRight?: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col border border-border rounded-[8px] bg-card overflow-hidden shadow-sm">
      <div 
        className="flex items-center justify-between px-[var(--card-p)] py-3 bg-popover cursor-pointer hover:bg-muted transition-colors select-none"
        onClick={() => {
          triggerHaptic("light");
          setIsOpen(!isOpen);
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[var(--ui-text-sm)] font-bold uppercase tracking-widest text-muted-foreground">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {headerRight}
          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="p-[var(--card-p)] border-t border-border">
          {children}
        </div>
      </div>
    </div>
  );
}
