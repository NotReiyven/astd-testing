import React from "react";

export function InventoryVaultSkeleton() {
  return (
    <div
      className="flex flex-col animate-pulse"
      role="status"
      aria-label="Loading inventory vault"
    >
      {/* Portfolio Dashboard Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 mb-8">
        {/* Left: Vault Net Worth & Demand Distribution Skeleton */}
        <div className="bg-card border border-border rounded-[8px] p-6 flex flex-col justify-between gap-5 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-32 rounded bg-muted/70" />
              <div className="h-5 w-28 rounded-[3px] bg-muted border border-border" />
            </div>

            <div className="h-10 w-48 rounded-[4px] bg-muted" />

            <div className="grid grid-cols-2 gap-3 mt-2 pt-4 border-t border-border">
              <div className="bg-muted/60 p-3 rounded-[4px] border border-border flex flex-col gap-1.5">
                <div className="h-2.5 w-20 rounded bg-muted/70" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
              <div className="bg-muted/60 p-3 rounded-[4px] border border-border flex flex-col gap-1.5">
                <div className="h-2.5 w-24 rounded bg-muted/70" />
                <div className="h-4 w-28 rounded bg-muted" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="h-2.5 w-32 rounded bg-muted/70" />
              <div className="h-2.5 w-16 rounded bg-muted/70" />
            </div>
            <div className="w-full h-2 rounded-[2px] bg-muted border border-border" />
            <div className="flex justify-between items-center">
              <div className="h-2 w-14 rounded bg-muted/60" />
              <div className="h-2 w-14 rounded bg-muted/60" />
              <div className="h-2 w-14 rounded bg-muted/60" />
            </div>
          </div>
        </div>

        {/* Right: Crown Assets / Top 3 Targets Skeleton */}
        <div className="bg-card border border-border rounded-[8px] p-6 flex flex-col gap-3 shadow-sm">
          <div className="h-3 w-28 rounded bg-muted/70 mb-1" />
          <div className="flex flex-col gap-2.5 flex-1 justify-center">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-[4px] bg-muted/60 border border-border"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-4 rounded bg-muted" />
                  <div className="w-8 h-8 rounded-[3px] bg-popover border border-border shrink-0" />
                  <div className="flex flex-col gap-1.5">
                    <div className="h-3.5 w-28 rounded bg-muted" />
                    <div className="h-2.5 w-20 rounded bg-muted/70" />
                  </div>
                </div>
                <div className="h-4 w-16 rounded bg-muted shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tier Section & Unit Cards Grid Skeleton */}
      <div className="flex flex-col gap-6">
        {[6, 6].map((cardCount, sectionIdx) => (
          <div key={sectionIdx} className="flex flex-col gap-3">
            {/* Tier Header Bar */}
            <div className="flex items-center gap-3">
              <div className="w-[3px] h-[16px] rounded-full bg-primary/50" />
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-5 w-16 rounded-[2px] bg-muted border border-border" />
              <div className="hidden md:flex items-center gap-2 ml-4">
                <div className="h-3 w-24 rounded bg-muted/70" />
                <div className="w-20 h-1.5 bg-muted rounded-[2px] border border-border" />
              </div>
              <div className="flex-1 h-px bg-border ml-2" />
            </div>

            {/* 6-Column Unit Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {Array.from({ length: cardCount }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-card border border-border rounded-[8px] overflow-hidden flex flex-col h-full"
                >
                  {/* Card Portrait Area (1:1 aspect-square) */}
                  <div className="w-full aspect-square bg-muted/70 border-b border-border relative p-2 flex items-start justify-between">
                    <div className="h-5 w-14 rounded-[4px] bg-popover/80" />
                    <div className="h-5 w-8 rounded-[4px] bg-popover/80" />
                  </div>

                  {/* Card Body & 2-Column Stat Footer matching TradingCardSlot */}
                  <div className="flex flex-col flex-1 p-[var(--card-p)] bg-card">
                    <div className="flex flex-col">
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-2.5 w-1/2 rounded bg-muted/70 mt-1.5" />
                      <div className="h-4 w-12 rounded-[2px] bg-popover border border-border mt-2" />
                    </div>

                    <div className="flex flex-col mt-auto pt-3 w-full">
                      <div className="pl-2 border-l-[3px] border-primary/50 w-full mb-1">
                        <div className="h-5 w-20 rounded bg-muted" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-border w-full">
                        <div className="flex flex-col gap-1 bg-muted rounded-[4px] px-2.5 py-1.5">
                          <div className="h-2.5 w-10 rounded bg-popover/70" />
                          <div className="h-3 w-8 rounded bg-popover" />
                        </div>
                        <div className="flex flex-col gap-1 bg-muted rounded-[4px] px-2.5 py-1.5">
                          <div className="h-2.5 w-12 rounded bg-popover/70" />
                          <div className="h-3 w-10 rounded bg-popover" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
