export function CanvasSkeleton({ viewMode }: { viewMode: "grid" | "list" | "compact" }) {
  if (viewMode === "list" || viewMode === "compact") {
    const isCompact = viewMode === "compact";

    return (
      <div className="w-full rounded-[6px] border border-border bg-card shadow-sm overflow-hidden">
        {[...Array(isCompact ? 15 : 8)].map((_, i) => (
          <div 
            key={i} 
            className={`animate-shimmer flex md:grid ${isCompact ? 'md:grid-cols-[minmax(200px,1fr)_160px_120px]' : 'md:grid-cols-[60px_minmax(200px,1.2fr)_140px_60px_70px_minmax(200px,2fr)]'} items-stretch border-b border-border ${isCompact ? 'min-h-[32px] px-4 py-1.5' : 'min-h-[60px] px-4 py-2'} gap-4`}
          >
            {!isCompact && (
              <div className="hidden md:flex items-center justify-center">
                <div className="w-8 h-8 rounded-[4px] bg-border" />
              </div>
            )}

            <div className="flex flex-col justify-center gap-2">
              <div className="h-3 w-3/4 bg-border rounded-[2px]" />
              {!isCompact && <div className="h-2 w-1/2 bg-border rounded-[2px]" />}
            </div>

            <div className="hidden md:flex items-center">
              <div className="h-2 w-full bg-border rounded-[2px]" />
            </div>

            <div className="hidden md:flex items-center justify-center">
              <div className="h-2 w-12 bg-border rounded-[2px]" />
            </div>

            <div className="hidden md:flex items-center justify-end">
              <div className="h-3 w-16 bg-border rounded-[2px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 w-full" style={{ gridTemplateColumns: window.innerWidth >= 768 ? "repeat(auto-fill, minmax(200px, 1fr))" : "repeat(auto-fill, minmax(min(100%, 155px), 1fr))" }}>
      {[...Array(12)].map((_, i) => (
        <div key={i} className="flex flex-col h-[280px] md:h-[340px] rounded-[6px] bg-card border border-border overflow-hidden animate-shimmer">
          <div className="w-full aspect-square bg-muted border-b border-border" />
          <div className="p-3 md:p-4 flex flex-col gap-2 flex-1">
            <div className="h-4 bg-border rounded-[2px] w-3/4 mb-1" />
            <div className="h-3 bg-border rounded-[2px] w-1/2" />
            <div className="mt-auto pt-3 border-t border-border flex gap-2">
              <div className="h-8 bg-border rounded-[2px] flex-1" />
              <div className="h-8 bg-border rounded-[2px] flex-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}