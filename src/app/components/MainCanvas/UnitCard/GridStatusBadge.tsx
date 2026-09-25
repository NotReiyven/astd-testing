import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { UnitStatus } from "../../../../types";
import { GRID_STATUS_CFG } from "../../../../data";
import { StatusIcon } from "../../shared/Formatters";

export function GridStatusBadge({ status }: { status: UnitStatus }) {
  const c = GRID_STATUS_CFG[status];
  if (!c) return null;
  const badgeRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => setTipPos(null);
  }, []);

  const toggleTip = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (tipPos) {
      setTipPos(null);
    } else {
      const r = badgeRef.current?.getBoundingClientRect();
      if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
    }
  };

  return (
    <div
      ref={badgeRef}
      className="relative inline-flex cursor-help"
      onMouseEnter={() => {
        if (!window.matchMedia("(hover: hover)").matches) return;
        const r = badgeRef.current?.getBoundingClientRect();
        if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
      }}
      onMouseLeave={() => setTipPos(null)}
      onClick={toggleTip}
    >
      <div
        className="inline-flex items-center px-2 py-1 rounded-[6px] gap-1.5 backdrop-blur-md shadow-sm"
        style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
          color: c.color,
        }}
      >
        <StatusIcon status={status} />
        <span className="text-[10px] font-bold tracking-wide uppercase transition-colors leading-none">
          {c.label}
        </span>
      </div>
      {tipPos &&
        createPortal(
          <>
            <div
              className="md:hidden fixed inset-0 z-[99998]"
              onClick={(e) => {
                e.stopPropagation();
                setTipPos(null);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setTipPos(null);
              }}
            />
            <div
              className="rounded-xl px-3 py-2 pointer-events-none fixed z-[99999] animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
              style={{
                top: tipPos.y,
                left: tipPos.x,
                minWidth: 210,
                maxWidth: 240,
                background: "var(--popover)",
                border: `1px solid ${c.border}`,
              }}
            >
              <p className="text-[11px] font-bold leading-snug text-foreground">
                {c.tip}
              </p>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
