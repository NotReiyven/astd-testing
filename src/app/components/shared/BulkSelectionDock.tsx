import React from "react";

const IconMegaphone = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const IconClose = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface BulkSelectionDockProps {
  selectedCount: number;
  onClearSelection: () => void;
  onPostAsAd?: () => void;
  onSendToGive: () => void;
  onSendToGet: () => void;
}

export function BulkSelectionDock({
  selectedCount,
  onClearSelection,
  onPostAsAd,
  onSendToGive,
  onSendToGet,
}: BulkSelectionDockProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-[70px] md:bottom-4 left-0 right-0 z-[80] p-4 pointer-events-none">
      <div className="max-w-2xl mx-auto bg-card border border-border p-3 rounded-[6px] shadow-2xl pointer-events-auto flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-up">
        <div className="flex items-center justify-between w-full md:w-auto">
          <span className="text-[13px] font-bold text-foreground">
            {selectedCount} Selected
          </span>
          <button
            onClick={onClearSelection}
            aria-label="Clear selection"
            className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-[4px] hover:bg-muted focus-visible:outline-none cursor-pointer"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
          {onPostAsAd && (
            <>
              <button
                disabled={selectedCount === 0}
                onClick={onPostAsAd}
                className="px-4 py-2 bg-muted hover:bg-border disabled:opacity-50 text-foreground text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-border flex-1 md:flex-none justify-center"
                title="Create a new trade ad using these units"
              >
                <IconMegaphone className="w-3.5 h-3.5" /> Post as Ad
              </button>
              <div className="hidden md:block w-px h-6 bg-border mx-1" />
            </>
          )}
          <button
            disabled={selectedCount === 0}
            onClick={onSendToGive}
            className="px-4 py-2 bg-[#FAA61A] hover:bg-[#d98b14] disabled:opacity-50 text-black text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer border border-transparent flex-1 md:flex-none justify-center"
          >
            To Give
          </button>
          <button
            disabled={selectedCount === 0}
            onClick={onSendToGet}
            className="px-4 py-2 bg-foreground hover:bg-foreground/80 disabled:opacity-50 text-background text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer border border-transparent flex-1 md:flex-none justify-center"
          >
            To Get
          </button>
          <button
            onClick={onClearSelection}
            aria-label="Clear selection"
            className="hidden md:flex p-2 text-muted-foreground hover:text-foreground rounded-[4px] hover:bg-muted ml-1 focus-visible:outline-none cursor-pointer"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
