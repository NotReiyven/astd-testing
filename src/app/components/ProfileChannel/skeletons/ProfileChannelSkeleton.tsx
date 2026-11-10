// ================================================
// FILE: src/app/components/ProfileChannel/skeletons/ProfileChannelSkeleton.tsx
// ================================================

import { AdHistorySkeletonList } from "./AdHistorySkeletonList";

export function ProfileChannelSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div
      className="flex-1 w-full h-full font-sans relative overflow-y-auto custom-scrollbar pb-16 z-10 bg-background"
      role="status"
      aria-label="Loading trader profile"
    >
      <div className="w-full relative shrink-0 border-b border-border bg-card">
        <div
          className={`w-full relative overflow-hidden border-b border-border bg-muted animate-pulse ${
            compact ? "h-[96px] md:h-[116px]" : "h-[136px] md:h-[168px]"
          }`}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-5 relative z-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-10 md:-mt-12">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
              <div className="w-[84px] h-[84px] md:w-[96px] md:h-[96px] rounded-[10px] border-4 border-card bg-muted animate-pulse shrink-0 shadow-xl" />

              <div className="flex flex-col gap-2 pb-0.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="h-7 w-40 rounded-[6px] bg-muted animate-pulse" />
                  <div className="h-5 w-20 rounded-[5px] bg-muted animate-pulse" />
                  <div className="h-5 w-28 rounded-[5px] bg-muted animate-pulse" />
                  <div className="h-5 w-28 rounded-[5px] bg-muted animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-56 rounded-[4px] bg-muted animate-pulse" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-9 w-32 rounded-[6px] bg-popover border border-border animate-pulse" />
              <div className="h-9 w-36 rounded-[6px] bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          <aside className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4 shadow-sm animate-pulse">
              <div className="grid grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-popover border border-border rounded-[6px] p-3 flex flex-col gap-1.5"
                  >
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="h-5 w-16 rounded bg-muted" />
                    <div className="h-2.5 w-14 rounded bg-muted" />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <div className="flex justify-between">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
                <div className="w-full h-2 rounded-full bg-popover border border-border" />
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="h-3.5 w-full rounded bg-muted" />
                <div className="h-3.5 w-3/4 rounded bg-muted" />
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <div className="h-3 w-28 rounded bg-muted" />
                <div className="h-9 w-full rounded-[6px] bg-popover border border-border" />
                <div className="h-9 w-full rounded-[6px] bg-popover border border-border" />
              </div>

              <div className="h-10 w-full rounded-[6px] bg-popover border border-border" />
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0 gap-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="h-9 w-36 rounded-[6px] bg-card border border-border animate-pulse" />
              <div className="h-9 w-40 rounded-[6px] bg-card border border-border animate-pulse" />
              <div className="h-9 w-44 rounded-[6px] bg-card border border-border animate-pulse" />
            </div>

            <div className="bg-card border border-border rounded-[8px] p-4 flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="h-7 w-24 rounded-[5px] bg-muted" />
                <div className="h-7 w-20 rounded-[5px] bg-popover border border-border" />
                <div className="h-7 w-24 rounded-[5px] bg-popover border border-border" />
              </div>
              <div className="h-7 w-36 rounded-[6px] bg-popover border border-border" />
            </div>

            <AdHistorySkeletonList count={2} />
          </div>
        </div>
      </div>
    </div>
  );
}