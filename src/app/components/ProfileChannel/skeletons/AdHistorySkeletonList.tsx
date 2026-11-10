// ================================================
// FILE: src/app/components/ProfileChannel/skeletons/AdHistorySkeletonList.tsx
// ================================================

export function AdHistorySkeletonList({ count = 2 }: { count?: number }) {
  return (
    <div
      className="flex flex-col gap-4"
      role="status"
      aria-label="Loading ad history"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4 animate-pulse"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 rounded-[4px] bg-muted" />
              <div className="h-5 w-24 rounded-[4px] bg-popover border border-border" />
              <div className="h-4 w-36 rounded-[4px] bg-muted" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-24 rounded-[5px] bg-popover border border-border" />
              <div className="h-7 w-20 rounded-[5px] bg-popover border border-border" />
              <div className="h-7 w-7 rounded-[5px] bg-popover border border-border" />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr] gap-4 items-start">
            <div className="flex flex-col gap-2">
              <div className="h-3.5 w-24 rounded bg-muted" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[0, 1].map((tileIdx) => (
                  <div
                    key={tileIdx}
                    className="flex items-center gap-2.5 p-2 rounded-[6px] bg-popover border border-border"
                  >
                    <div className="w-11 h-11 rounded-[5px] bg-muted shrink-0" />
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="h-3.5 w-24 rounded bg-muted" />
                      <div className="h-3 w-16 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden xl:flex items-center justify-center self-center w-8 h-8 rounded-[6px] bg-popover border border-border" />

            <div className="flex flex-col gap-2">
              <div className="h-3.5 w-24 rounded bg-muted" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[0, 1].map((tileIdx) => (
                  <div
                    key={tileIdx}
                    className="flex items-center gap-2.5 p-2 rounded-[6px] bg-popover border border-border"
                  >
                    <div className="w-11 h-11 rounded-[5px] bg-muted shrink-0" />
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="h-3.5 w-24 rounded bg-muted" />
                      <div className="h-3 w-16 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}