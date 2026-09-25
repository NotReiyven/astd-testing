import React, { useState, useRef, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import {
  ChevronsUp,
  ChevronsDown,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  Flame,
  Lock,
  EyeOff,
} from "lucide-react";
import { triggerHaptic } from "../../../data/helpers";

export function JargonWrap({
  title,
  tip,
  children,
}: {
  title: string;
  tip: string;
  children: React.ReactNode;
}) {
  const btnRef = useRef<HTMLSpanElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      setTipPos(null);
    };
  }, []);

  const openTip = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
  };

  const toggleTip = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (tipPos) {
      setTipPos(null);
    } else {
      openTip();
    }
  };

  return (
    <span
      ref={btnRef}
      className="cursor-help border-b border-dashed border-[rgba(255,255,255,0.4)] hover:border-[rgba(255,255,255,0.8)] transition-colors relative z-50"
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover)").matches) {
          hoverTimer.current = setTimeout(openTip, 200);
        }
      }}
      onMouseLeave={() => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setTipPos(null);
      }}
      onClick={toggleTip}
    >
      {children}
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
              className="rounded-[6px] px-3 py-2.5 pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
              style={{
                top: tipPos.y,
                left: tipPos.x,
                minWidth: 200,
                maxWidth: 240,
                background: "var(--popover)",
                border: "1px solid var(--border)",
              }}
            >
              <p className="text-[12px] font-bold text-foreground mb-0.5">
                {title}
              </p>
              <p
                className="text-[11.5px] font-medium leading-snug text-[#ededed] opacity-90 whitespace-normal"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {tip}
              </p>
            </div>
          </>,
          document.body
        )}
    </span>
  );
}

export const HighlightText = memo(
  ({ text, query }: { text: string; query?: string }) => {
    if (!query || !text) return <>{text}</>;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-warning/30 text-warning rounded-[2px]">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  }
);

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

  if (lower === "stable")
    return (
      <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">
        ≈
      </span>
    );
  if (lower === "varies")
    return (
      <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">
        ↕
      </span>
    );
  if (lower === "lowballed")
    return (
      <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">
        ↓
      </span>
    );

  return null;
}

export function NoticeTooltip({ notice }: { notice?: string }) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      setTipPos(null);
    };
  }, []);

  const openTip = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 6 });
  };

  const toggleTip = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (tipPos) {
      setTipPos(null);
    } else {
      openTip();
    }
  };

  if (!notice) return null;

  return (
    <div
      ref={btnRef}
      className="relative flex items-center justify-center cursor-help p-2 md:p-1.5 -m-2 md:-m-1.5 z-20 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
      onMouseEnter={() => {
        if (!window.matchMedia("(hover: hover)").matches) return;
        hoverTimer.current = setTimeout(openTip, 200);
      }}
      onMouseLeave={() => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setTipPos(null);
      }}
      onClick={toggleTip}
    >
      <div className="flex items-center justify-center rounded-[4px] transition-colors w-5 h-5 md:w-4 md:h-4 hover:bg-white/10">
        <span className="text-[11px] md:text-[10px] font-bold text-muted-foreground">
          ?
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
              className="px-3 py-2.5 rounded-[6px] pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full w-[220px] animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
              style={{
                top: tipPos.y,
                left: tipPos.x,
                background: "var(--popover)",
                border: "1px solid var(--border)",
              }}
            >
              <p className="text-[11.5px] font-medium leading-relaxed text-[#ededed] opacity-90">
                {notice}
              </p>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

export function HoldToConfirmButton({
  onConfirm,
  children,
  className,
  holdTime = 800,
  title,
}: {
  onConfirm: () => void;
  children: React.ReactNode;
  className: string;
  holdTime?: number;
  title?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const start = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    setIsHolding(true);
    setProgress(0);
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now() - startTime) / holdTime) * 100, 100));
    }, 16);

    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current);
      onConfirm();
      setIsHolding(false);
      setProgress(0);
      triggerHaptic("heavy");
    }, holdTime);
  };

  const stop = () => {
    setIsHolding(false);
    setProgress(0);
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
  };

  return (
    <button
      title={title}
      className={`relative overflow-hidden cursor-pointer ${className}`}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="absolute left-0 top-0 bottom-0 bg-white/10 pointer-events-none"
        style={{
          width: `${progress}%`,
          transition: isHolding ? "none" : "width 0.2s",
        }}
      />
      <div className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </div>
    </button>
  );
}

export function RollingNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    let end = value;
    if (start === end) return;

    let startTime = performance.now();
    const duration = 300;

    const animate = (currTime: number) => {
      const elapsed = currTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * (2 - progress);

      setDisplayValue(Math.floor(start + (end - start) * ease));

      if (progress < 1) requestAnimationFrame(animate);
      else setDisplayValue(end);
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span className={className}>{displayValue.toLocaleString()}</span>;
}
