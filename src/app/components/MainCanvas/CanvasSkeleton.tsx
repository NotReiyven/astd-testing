export function CanvasSkeleton({ viewMode }: { viewMode: "grid" | "list" | "compact" }) {
  if (viewMode === "list" || viewMode === "compact") {
    const isCompact = viewMode === "compact";
    
    return (
      <div className="w-full rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[#2B2D31] shadow-sm overflow-hidden animate-pulse">
        {[...Array(isCompact ? 15 : 8)].map((_, i) => (
          <div 
            key={i} 
            className={`flex md:grid ${isCompact ? 'md:grid-cols-[minmax(200px,1fr)_160px_120px]' : 'md:grid-cols-[56px_280px_minmax(200px,1fr)_160px_120px]'} items-stretch border-b border-[rgba(255,255,255,0.04)] ${isCompact ? 'min-h-[30px] px-4 py-1.5' : 'min-h-[56px] px-4 py-2'} gap-4`}
          >
            {!isCompact && (
              <div className="hidden md:flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-[#1E1F22]" />
              </div>
            )}
            
            <div className="flex flex-col justify-center gap-2">
              <div className="h-3 w-3/4 bg-[#1E1F22] rounded" />
              {!isCompact && <div className="h-2 w-1/2 bg-[#1E1F22] rounded" />}
            </div>
            
            <div className="hidden md:flex items-center">
              <div className="h-2 w-full bg-[#1E1F22] rounded" />
            </div>
            
            <div className="hidden md:flex items-center justify-center">
              <div className="h-2 w-24 bg-[#1E1F22] rounded" />
            </div>
            
            <div className="hidden md:flex items-center justify-end">
              <div className="h-3 w-16 bg-[#1E1F22] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-5" style={{ gridTemplateColumns: window.innerWidth >= 768 ? "repeat(auto-fill, minmax(200px, 1fr))" : "repeat(auto-fill, minmax(min(100%, 155px), 1fr))" }}>
      {[...Array(12)].map((_, i) => (
        <div key={i} className="flex flex-col h-[260px] md:h-[340px] rounded-[8px] bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] overflow-hidden animate-pulse">
          <div className="w-full aspect-square bg-[#1E1F22]" />
          <div className="p-3 md:p-4 flex flex-col gap-2 flex-1">
            <div className="h-3.5 bg-[#1E1F22] rounded w-3/4" />
            <div className="h-2.5 bg-[#1E1F22] rounded w-1/2" />
            <div className="mt-auto pt-3 border-t border-[rgba(255,255,255,0.04)]">
               <div className="h-5 bg-[#1E1F22] rounded w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}