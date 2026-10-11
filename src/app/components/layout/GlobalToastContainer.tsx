import { useState, useRef, useEffect } from "react";
import { useToastStore, ToastType, Toast } from "../../../store/useToastStore";
import { triggerHaptic } from "../../../data/helpers";
import {
  MOTION_TRANSITION,
  usePrefersReducedMotion,
} from "../../../lib/motionTokens";

const getIcon = (type: ToastType, reducedMotion: boolean) => {
  switch (type) {
    case "success":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          className="w-4 h-4 text-success shrink-0"
        >
          <path
            d="M3 8.5L6.5 12L13 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "error":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          className="w-4 h-4 text-destructive shrink-0"
        >
          <circle
            cx="8"
            cy="8"
            r="6.25"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M5.75 5.75L10.25 10.25M10.25 5.75L5.75 10.25"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "warning":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          className="w-4 h-4 text-warning shrink-0"
        >
          <path
            d="M8 2.25L14.25 13.25H1.75L8 2.25Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M8 6.5V9.25M8 11.25H8.007"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "loading":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          className="w-4 h-4 text-primary shrink-0"
        >
          <g
            className={reducedMotion ? "" : "animate-spin"}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              strokeWidth="2"
              strokeOpacity="0.25"
            />
            <path
              d="M14 8a6 6 0 0 0-6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        </svg>
      );
    default:
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          className="w-4 h-4 text-info shrink-0"
        >
          <circle
            cx="8"
            cy="8"
            r="6.25"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M8 7.25V11M8 5H8.007"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};

const ToastItem = ({
  t,
  index,
  reducedMotion,
  onRemove,
  onPause,
  onResume,
}: {
  t: Toast;
  index: number;
  reducedMotion: boolean;
  onRemove: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [entered, setEntered] = useState(reducedMotion);
  const touchStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      setEntered(true);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  // Stack logic: reverse index so index 0 is the newest (bottom-most)
  const isFront = index === 0;
  const translateY = reducedMotion
    ? index * -8
    : entered
      ? index * -14
      : 12;
  const scale = reducedMotion ? 1 : entered ? 1 - index * 0.04 : 0.96;
  const opacity = index > 3 ? 0 : entered ? 1 : 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isFront) return;
    onPause(t.id);
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isFront || touchStartRef.current === null) return;
    const delta = e.touches[0].clientX - touchStartRef.current;
    if (delta > 0) setDragOffset(delta);
  };

  const handleTouchEnd = () => {
    if (!isFront) return;
    if (dragOffset > 80) {
      triggerHaptic("light");
      onRemove(t.id);
    } else {
      setDragOffset(0);
      onResume(t.id);
    }
    touchStartRef.current = null;
  };

  const borderTone =
    t.type === "error"
      ? "border-destructive/50"
      : t.type === "warning"
        ? "border-warning/50"
        : t.type === "success"
          ? "border-success/40"
          : "border-border";

  return (
    <div
      role={t.type === "error" ? "alert" : "status"}
      aria-atomic="true"
      onMouseEnter={() => onPause(t.id)}
      onMouseLeave={() => onResume(t.id)}
      onFocusCapture={() => onPause(t.id)}
      onBlurCapture={() => onResume(t.id)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`absolute bottom-0 right-0 w-full md:w-auto min-w-[280px] max-w-[420px] bg-popover border ${borderTone} px-4 py-3 rounded-[6px] shadow-2xl flex items-center gap-3 pointer-events-auto select-none`}
      style={{
        zIndex: 300 - index,
        transform: reducedMotion
          ? `translate3d(0, ${translateY}px, 0)`
          : `translate3d(${dragOffset}px, ${translateY}px, 0) scale(${scale})`,
        opacity,
        transition: touchStartRef.current
          ? "none"
          : reducedMotion
            ? MOTION_TRANSITION.toastReducedMotion
            : MOTION_TRANSITION.toastTransformOpacity,
      }}
    >
      <div className="shrink-0">{getIcon(t.type, reducedMotion)}</div>
      <span className="text-[13px] font-bold text-foreground flex-1 leading-snug">
        {t.message}
      </span>
      {t.count > 1 && (
        <span
          aria-label={`Repeated ${t.count} times`}
          className="px-1.5 py-0.5 rounded-[4px] bg-secondary border border-border text-[11px] font-mono font-bold text-foreground tabular-nums shrink-0"
        >
          ×{t.count}
        </span>
      )}
      {isFront && t.action && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            t.action?.onClick();
            onRemove(t.id);
          }}
          className="min-h-[26px] px-2.5 py-1 rounded-[4px] bg-secondary hover:bg-accent text-foreground text-[12px] font-bold tracking-tight border border-border shrink-0 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t.action.label}
        </button>
      )}
      {isFront && (
        <button
          type="button"
          onClick={() => onRemove(t.id)}
          aria-label="Dismiss notification"
          className="min-w-[24px] min-h-[24px] inline-flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[4px] p-1 shrink-0 cursor-pointer touch-manipulation"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 14 14"
            fill="none"
            className="w-3.5 h-3.5"
          >
            <path
              d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export function GlobalToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);
  const pauseToast = useToastStore((s) => s.pauseToast);
  const resumeToast = useToastStore((s) => s.resumeToast);
  const reducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || toasts.length === 0) return null;

  // reverse so newest is at the end of the array to map to index 0 visually
  const reversedToasts = [...toasts].reverse();

  return (
    <div
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 right-6 z-[999999] flex flex-col items-end pointer-events-none w-[calc(100vw-48px)] md:w-auto h-[60px]"
    >
      {reversedToasts.map((t, i) => (
        <ToastItem
          key={t.id}
          t={t}
          index={i}
          reducedMotion={reducedMotion}
          onRemove={removeToast}
          onPause={pauseToast}
          onResume={resumeToast}
        />
      ))}
    </div>
  );
}

