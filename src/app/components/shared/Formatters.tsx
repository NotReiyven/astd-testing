import React, { useState, useRef, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { ChevronsUp, ChevronsDown, Activity, TrendingUp, TrendingDown, ArrowUpCircle, Flame, Lock, EyeOff } from "lucide-react";

export function JargonWrap({ title, tip, children }: { title: string; tip: string; children: React.ReactNode }) {
  const btnRef = useRef<HTMLSpanElement>(null);
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
       const r = btnRef.current?.getBoundingClientRect();
       if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
    }
  };

  return (
    <span
      ref={btnRef}
      className="cursor-help border-b border-dashed border-[rgba(255,255,255,0.4)] hover:border-[rgba(255,255,255,0.8)] transition-colors relative z-50"
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) toggleTip();
      }}
      onMouseLeave={() => setTipPos(null)}
      onClick={toggleTip}
    >
      {children}
      {tipPos && createPortal(
        <>
          <div className="md:hidden fixed inset-0 z-[99998]" onClick={(e) => { e.stopPropagation(); setTipPos(null); }} onTouchStart={(e) => { e.stopPropagation(); setTipPos(null); }} />
          <div className="rounded-[8px] px-3 py-2.5 pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.6)]" style={{ top: tipPos.y, left: tipPos.x, minWidth: 200, maxWidth: 240, background: "#111214", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[12px] font-bold text-[#F2F3F5] mb-0.5">{title}</p>
            <p className="text-[11px] font-medium leading-snug text-[#DBDEE1] whitespace-normal" style={{ fontFamily: "'Inter', sans-serif" }}>{tip}</p>
          </div>
        </>,
        document.body
      )}
    </span>
  );
}

export const HighlightText = memo(({ text, query }: { text: string; query?: string }) => {
  if (!query || !text) return <>{text}</>;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <span key={i} className="bg-[rgba(250,166,26,0.35)] text-[#FAA61A] rounded-[2px]">{part}</span> 
          : <span key={i}>{part}</span>
      )}
    </>
  );
});

export function StatusIcon({ status }: { status?: string | null }) {
  if (!status) return null;
  const lower = status.toLowerCase();
  const sz = "w-3 h-3 shrink-0";
  
  if (lower === "rising") return <ChevronsUp className={sz} />;
  if (lower === "dropping") return <ChevronsDown className={sz} />;
  if (lower === "unstable") return <Activity className={sz} />;
  if (lower === "inflated") return <TrendingUp className={sz} />;
  if (lower === "deflated") return <TrendingDown className={sz} />;
  if (lower === "highballed") return <ArrowUpCircle className={sz} />;
  if (lower === "hyped") return <Flame className={sz} />;
  if (lower === "gatekept") return <Lock className={sz} />;
  if (lower === "black-marketed") return <EyeOff className={sz} />;
  
  if (lower === "stable") return <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">≈</span>;
  if (lower === "varies") return <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">↕</span>;
  if (lower === "lowballed") return <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">↓</span>;
  
  return null;
}

export function NoticeTooltip({ notice }: { notice?: string }) {
  const btnRef = useRef<HTMLDivElement>(null);
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
       const r = btnRef.current?.getBoundingClientRect();
       if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 6 });
    }
  };

  if (!notice) return null;

  return (
    <div
      ref={btnRef}
      className="relative flex items-center justify-center cursor-help p-2 -m-2 z-20"
      onMouseEnter={() => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        const r = btnRef.current?.getBoundingClientRect();
        if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 6 });
      }}
      onMouseLeave={() => setTipPos(null)}
      onClick={toggleTip}
    >
      <div className="flex items-center justify-center rounded-full transition-colors w-4 h-4 md:w-5 md:h-5" style={{ background: tipPos ? "rgba(255,255,255,0.1)" : "transparent" }}>
        <span className="text-[9px] md:text-[12px] font-bold" style={{ color: tipPos ? "#DBDEE1" : "#80848E" }}>?</span>
      </div>
      {tipPos && createPortal(
        <>
          <div className="md:hidden fixed inset-0 z-[99998]" onClick={(e) => { e.stopPropagation(); setTipPos(null); }} onTouchStart={(e) => { e.stopPropagation(); setTipPos(null); }} />
          <div className="px-3 py-2.5 rounded-[8px] pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full w-[220px] animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.5)]" style={{ top: tipPos.y, left: tipPos.x, background: "#111214", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[11px] font-medium leading-relaxed text-[#DBDEE1]">{notice}</p>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}