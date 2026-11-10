// ================================================
// FILE: src/app/components/ProfileChannel/skeletons/WishlistGridSkeleton.tsx
// ================================================

export function WishlistGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5"
      role="status"
      aria-label="Loading target wishlist"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card border border-border rounded-[8px] p-3.5 flex flex-col justify-between gap-3 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-[6px] bg-muted border border-border shrink-0" />
            <div className="flex flex-col flex-1 gap-1.5 min-w-0">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="flex items-center gap-2 mt-1">
                <div className="h-4 w-16 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-border flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="h-6 rounded-[5px] bg-popover border border-border" />
              <div className="h-6 rounded-[5px] bg-popover border border-border" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-7 rounded-[5px] bg-popover border border-border" />
              <div className="h-7 rounded-[5px] bg-[#1e1f3a] border border-primary" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}