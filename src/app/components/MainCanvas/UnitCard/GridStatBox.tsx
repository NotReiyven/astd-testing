import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { getRarityLabel, LIQUIDITY_SCALE } from "../../../../data";
import { JargonWrap } from "../../shared/Formatters";

export function GridStatBox({ label, value, type }: { label: string; value: number | string; type: "rarity" | "liquidity" }) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => setTipPos(null);
  }, []);

  let tipTitle = ""; let tipBody = ""; 
  let textColor = "var(--foreground)";
  let displayValue = String(value);

  if (type === "rarity") {
    const numVal = Number(value) || 0;
    displayValue = numVal % 1 === 0 ? String(numVal) : numVal.toFixed(1);
    tipTitle = `Rarity ${displayValue} / 20`; 
    tipBody = getRarityLabel(numVal);
    if (numVal >= 19) textColor = "#4DB6AC"; else if (numVal >= 9) textColor = "#81C784"; else if (numVal >= 6) textColor = "#FFB74D"; else textColor = "#E57373";
  } else {
    const stringVal = String(value);
    const liqKey = stringVal.charAt(0).toUpperCase() + stringVal.slice(1).toLowerCase();
    displayValue = stringVal.toLowerCase() === "black marketed" ? "BM" : stringVal.toUpperCase();
    tipTitle = `Liquidity: ${liqKey}`; 
    tipBody = LIQUIDITY_SCALE[liqKey] ?? "Unknown trading difficulty.";

    if (liqKey === "High") textColor = "#4DB6AC"; 
    else if (liqKey === "Average") textColor = "var(--muted-foreground)"; 
    else textColor = "#E57373";
  }

  const toggleTip = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (tipPos) {
       setTipPos(null);
    } else {
       const r = btnRef.current?.getBoundingClientRect();
       if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
    }
  };

  return (
    <div
      ref={btnRef}
      className="flex flex-col justify-center bg-popover border border-border rounded-[6px] p-2 hover:bg-muted transition-colors cursor-help shadow-inner relative z-20"
      onMouseEnter={() => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        const r = btnRef.current?.getBoundingClientRect();
        if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
      }}
      onMouseLeave={() => setTipPos(null)}
      onClick={toggleTip}
    >
      <span className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{label}</span>
      <span className="text-[10px] md:text-[14px] font-black tracking-wide truncate" style={{ color: textColor }}>
        {displayValue === "BM" ? (
          <JargonWrap title="Black Marketed (BM)" tip="This unit's value is heavily manipulated by outside-game currency trades. Highly risky.">
            BM
          </JargonWrap>
        ) : displayValue}
      </span>

      {tipPos && createPortal(
        <>
          <div className="md:hidden fixed inset-0 z-[99998]" onClick={(e) => { e.stopPropagation(); setTipPos(null); }} onTouchStart={(e) => { e.stopPropagation(); setTipPos(null); }} />
          <div className="rounded-[8px] px-3 py-2.5 pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.6)]" style={{ top: tipPos.y, left: tipPos.x, minWidth: 200, maxWidth: 240, background: "var(--popover)", border: "1px solid var(--border)" }}>
            <p className="text-[12px] font-bold mb-0.5" style={{ color: textColor }}>{tipTitle}</p>
            <p className="text-[11px] font-medium leading-snug text-foreground whitespace-normal">{tipBody}</p>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}