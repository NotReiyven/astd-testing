import React from 'react';
import { Megaphone, X } from 'lucide-react';

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
            className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-[4px] hover:bg-muted focus-visible:outline-none cursor-pointer"
          >
            <X className="w-4 h-4" />
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
                <Megaphone className="w-3.5 h-3.5" /> Post as Ad
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
            className="hidden md:flex p-2 text-muted-foreground hover:text-foreground rounded-[4px] hover:bg-muted ml-1 focus-visible:outline-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
