import * as React from "react";
import { cn } from "./utils";
import {
  MOTION_TRANSITION,
  usePrefersReducedMotion,
} from "../../../lib/motionTokens";

export type StatusPillState =
  | "syncing"
  | "synced"
  | "offline"
  | "warning"
  | "error"
  | "idle";

export interface StatusPillProps extends React.HTMLAttributes<HTMLDivElement> {
  state: StatusPillState;
  label?: string;
  /** Epoch ms or Date when data was last updated. */
  lastUpdatedAt?: number | Date | null;
  /** Optional expectation hint, e.g. "Auto-syncs every 5\u00A0min". */
  nextStepHint?: string;
  /** Optional Retry callback when in offline/error/warning state. */
  onRetry?: () => void;
  retryLabel?: string;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 15) return "Updated just now";
  if (diffSec < 60) return `Updated ${diffSec}\u00A0s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Updated ${diffMin}\u00A0min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `Updated ${diffHr}\u00A0hr ago`;
}

const DEFAULT_LABELS: Record<StatusPillState, string> = {
  syncing: "Syncing\u2026",
  synced: "Live",
  offline: "Offline \u00B7 Local cache",
  warning: "Degraded",
  error: "Sync paused",
  idle: "Ready",
};

const TONE_CLASSES: Record<StatusPillState, string> = {
  syncing: "border-[#5865F2]/40 bg-[#5865F2] text-white shadow-xs",
  synced: "border-[#23a559]/40 bg-[#23a559] text-white shadow-xs",
  offline: "border-[#d97706]/40 bg-[#d97706] text-white shadow-xs",
  warning: "border-[#d97706]/40 bg-[#d97706] text-white shadow-xs",
  error: "border-[#ef4444]/40 bg-[#ef4444] text-white shadow-xs",
  idle: "border-border bg-muted text-foreground",
};

export function StatusPill({
  state,
  label,
  lastUpdatedAt,
  nextStepHint,
  onRetry,
  retryLabel = "Retry",
  className,
  style,
  ...props
}: StatusPillProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [, setTick] = React.useState(0);

  // Refresh relative timestamp display every 30s if lastUpdatedAt is provided
  React.useEffect(() => {
    if (!lastUpdatedAt) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [lastUpdatedAt]);

  const resolvedTimestamp =
    lastUpdatedAt instanceof Date
      ? lastUpdatedAt.getTime()
      : typeof lastUpdatedAt === "number" && lastUpdatedAt > 0
        ? lastUpdatedAt
        : null;

  const displayLabel = label ?? DEFAULT_LABELS[state];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-[11px] font-bold tracking-tight tabular-nums select-none",
        TONE_CLASSES[state],
        className
      )}
      style={{
        transition: MOTION_TRANSITION.fadeOnly,
        ...style,
      }}
      {...props}
    >
      {state === "syncing" ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 14 14"
          fill="none"
          className="w-3 h-3 shrink-0"
        >
          <g
            className={reducedMotion ? "" : "animate-spin"}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          >
            <circle
              cx="7"
              cy="7"
              r="5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeOpacity="0.25"
            />
            <path
              d="M12 7a5 5 0 0 0-5-5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </g>
        </svg>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0 bg-current",
            state === "synced" && !reducedMotion ? "animate-pulse" : ""
          )}
        />
      )}

      <span>{displayLabel}</span>

      {resolvedTimestamp !== null && state !== "syncing" && (
        <span className={state === "idle" ? "text-muted-foreground font-medium" : "text-white/90 font-medium"}>
          · {formatRelativeTime(resolvedTimestamp)}
        </span>
      )}

      {nextStepHint && (
        <span className={state === "idle" ? "text-muted-foreground font-medium hidden sm:inline" : "text-white/90 font-medium hidden sm:inline"}>
          · {nextStepHint}
        </span>
      )}

      {onRetry && state !== "syncing" && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 min-h-[24px] px-2 py-0.5 rounded-[4px] bg-background/80 hover:bg-background text-foreground border border-border text-[11px] font-bold cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
