import React, { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { triggerHaptic } from "../../../data/helpers";

interface ResponsiveToolbarProps {
  title?: string;
  searchNode?: React.ReactNode;
  filterNodes?: React.ReactNode;
  actionNodes?: React.ReactNode;
  className?: string;
}

/**
 * A standardized responsive layout primitive for toolbars (search + filters + actions).
 * Handles mobile collapsing automatically without repeating logic in multiple files.
 */
export function ResponsiveToolbar({
  title = "Controls",
  searchNode,
  filterNodes,
  actionNodes,
  className = "",
}: ResponsiveToolbarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className={`flex flex-col z-40 relative bg-card border-b border-border shadow-sm px-[var(--panel-p)] py-[calc(var(--panel-p)*0.75)] gap-[var(--gap-sm)] ${className}`}>
      {/* Mobile Header (Only shows on small viewports) */}
      <div className="flex md:hidden items-center justify-between pb-1">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        <button
          onClick={() => {
            triggerHaptic("light");
            setIsCollapsed(!isCollapsed);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-muted border border-border text-foreground text-xs font-bold uppercase tracking-wider cursor-pointer focus-visible:outline-none"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{isCollapsed ? "Filters" : "Collapse"}</span>
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Collapsible Content */}
      <div
        className={`flex flex-col transition-all duration-300 overflow-hidden ${
          isCollapsed
            ? "max-h-0 opacity-0 md:max-h-none md:opacity-100 py-0 gap-0 md:gap-[var(--gap-md)]"
            : "max-h-[800px] opacity-100 gap-[var(--gap-md)]"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-[var(--gap-md)] w-full pt-2 md:pt-0 border-t border-border/60 md:border-none">
          
          {searchNode && (
            <div className="flex-1 w-full min-w-0">
              {searchNode}
            </div>
          )}

          {filterNodes && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[var(--gap-sm)] w-full md:w-auto shrink-0">
              {filterNodes}
            </div>
          )}

          {actionNodes && (
            <div className="flex items-center gap-[var(--gap-sm)] shrink-0 w-full md:w-auto mt-1 md:mt-0 pt-2 md:pt-0 border-t border-border/60 md:border-none justify-between md:justify-start">
              {actionNodes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
