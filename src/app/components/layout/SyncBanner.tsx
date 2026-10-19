import { useState, useEffect } from "react";
import { useUnitSync } from "../../../context/UnitContext";
import { useToastStore } from "../../../store/useToastStore";
import { AsyncButton } from "../ui/AsyncButton";
import { usePrefersReducedMotion } from "../../../lib/motionTokens";

function formatCachedAge(timestamp: number | null): string | null {
  if (!timestamp || timestamp <= 0) return null;
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}\u00A0s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}\u00A0min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}\u00A0hr ago`;
}

export function SyncBanner() {
  const { isError, isSyncing, isFetching, lastUpdatedAt, refetch } = useUnitSync();
  const addToast = useToastStore((s) => s.addToast);
  const reducedMotion = usePrefersReducedMotion();
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-center gap-2 text-[12px] font-medium text-destructive z-50 shrink-0 shadow-sm"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          className="w-3.5 h-3.5 shrink-0"
        >
          <path
            d="M2 2L14 14M10.7 10.7A5.5 5.5 0 0 0 5.3 5.3M13.5 7.5A9 9 0 0 0 5.2 4.2M2.5 7.5A9 9 0 0 1 4 6.2M8 13h.01"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="hidden sm:inline">
          Offline Mode: Operating from local cache. Queued actions will sync
          automatically when reconnected.
        </span>
        <span className="sm:hidden">Offline: Actions queued locally.</span>
      </div>
    );
  }

  if (!isError && !isSyncing) return null;

  const cachedAge = formatCachedAge(lastUpdatedAt);

  const handleManualRetry = async () => {
    const result: any = await refetch();
    if (result?.isError) {
      addToast(
        "Live market sync is still unreachable. Continuing with cached values.",
        "warning"
      );
    } else {
      addToast("Live market data synchronized.", "success");
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-popover border-b border-border px-4 py-1.5 flex flex-wrap items-center justify-center gap-2 text-[12px] font-medium text-foreground z-50 shrink-0 tabular-nums"
    >
      {isSyncing ? (
        <>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            className="w-3.5 h-3.5 text-primary shrink-0"
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
          <span>Syncing live spreadsheet data…</span>
          <span className="text-muted-foreground hidden sm:inline">
            · Auto-syncs every 5&nbsp;min
          </span>
        </>
      ) : (
        <>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            className="w-3.5 h-3.5 text-warning shrink-0"
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
          <span className="text-muted-foreground">
            Live sync paused · Showing backup cache
            {cachedAge ? ` (updated ${cachedAge})` : ""}.
          </span>
          <AsyncButton
            size="sm"
            variant="outline"
            isLoading={isFetching}
            onClick={handleManualRetry}
            className="min-h-[24px] h-6 px-2.5 py-0.5 text-[11px]"
          >
            Retry Sync
          </AsyncButton>
        </>
      )}
    </div>
  );
}

