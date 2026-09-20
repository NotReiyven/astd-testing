// src/app/components/TutorialChannel/TutorialUI.tsx
import React, { useState } from "react";
import { CheckCircle2, Circle, ChevronRight, History } from "lucide-react";
import { GRID_STATUS_CFG } from "../../../data";
import { StatusIcon } from "../MainCanvas/UnitGrid";

export function MissionCard({
  title,
  instruction,
  hint,
  isDone,
  accent,
  action
}: {
  title: string;
  instruction: string;
  hint: string;
  isDone: boolean;
  accent: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`p-4 rounded-[8px] border transition-all duration-300 relative flex flex-col justify-between ${
        isDone
          ? "bg-card border-border shadow-none"
          : "bg-popover border-border hover:border-primary shadow-sm"
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-300"
            style={{ color: isDone ? "var(--muted-foreground)" : accent }}
          >
            {title}
          </span>
          {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-[#23a559] shrink-0 animate-scale-in" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>
        <p
          className={`text-[13px] font-medium leading-snug transition-colors duration-300 ${
            isDone ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {instruction}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between min-h-[28px]">
        <span className="text-[11px] text-muted-foreground font-medium">{hint}</span>
        {action && !isDone && <div>{action}</div>}
      </div>
    </div>
  );
}

export function StaticStatusBadge({ status }: { status: string }) {
  const cfg = GRID_STATUS_CFG[status as keyof typeof GRID_STATUS_CFG];
  if (!cfg) return null;
  return (
    <span
      className="text-[9px] font-bold uppercase px-2 py-1 rounded-[6px] border shadow-sm shrink-0 flex items-center gap-1"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        borderColor: cfg.border
      }}
    >
      <StatusIcon status={status} />
      {cfg.label}
    </span>
  );
}

export function TheoryEmbed({
  color,
  icon,
  title,
  content,
  historyTitle,
  historyContent
}: {
  color: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
  historyTitle?: string;
  historyContent?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-popover border border-border rounded-[8px] flex flex-col overflow-hidden shadow-md">
      <div className="flex items-stretch">
        <div className="w-[4px] shrink-0" style={{ backgroundColor: color }} />

        <div className="p-5 md:p-6 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-[6px] bg-popover border border-border flex items-center justify-center shadow-inner">
              {icon}
            </div>
            <h3 className="text-[17px] font-black text-foreground uppercase tracking-wide">
              {title}
            </h3>
          </div>

          <p className="text-[14px] text-foreground leading-[1.8] mb-5">
            {content}
          </p>

          {historyTitle && historyContent && (
            <div className="mt-auto border-t border-border pt-4">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full text-left group focus-visible:outline-none"
              >
                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                  <History className="w-4 h-4" />
                  <span className="text-[12px] font-bold uppercase tracking-wider">
                    {historyTitle}
                  </span>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              <div
                className="transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
                style={{
                  maxHeight: isExpanded ? "200px" : "0px",
                  opacity: isExpanded ? 1 : 0
                }}
              >
                <div
                  className="mt-3 bg-popover p-3.5 rounded-[6px] border border-border text-[12.5px] text-muted-foreground leading-relaxed italic border-l-2"
                  style={{ borderLeftColor: color }}
                >
                  "{historyContent}"
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TooltipText({
  text,
  tip,
  color
}: {
  text: string;
  tip: string;
  color: string;
}) {
  return (
    <span
      className="relative inline-block group cursor-help font-bold underline decoration-dashed decoration-1 underline-offset-4 transition-colors"
      style={{ color, textDecorationColor: `${color}80` }}
    >
      {text}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[220px] bg-popover/95 backdrop-blur-md border border-border text-foreground text-[12px] font-medium p-3 rounded-[8px] shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 animate-slide-up text-center leading-relaxed">
        {tip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-[6px] border-transparent border-t-popover/95" />
      </div>
    </span>
  );
}