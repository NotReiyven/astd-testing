// ================================================
// FILE: src/app/components/layout/SyncBanner.tsx
// ================================================

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useUnits } from "../../../context/UnitContext";

export function SyncBanner() {
  const { isError, isSyncing } = useUnits();

  if (!isError && !isSyncing) return null;

  return (
    <div className="bg-popover border-b border-border px-4 py-1.5 flex items-center justify-center gap-2 text-[12px] font-medium text-foreground z-50 shrink-0">
      {isSyncing ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
          <span>Syncing live spreadsheet data...</span>
        </>
      ) : (
        <>
          <AlertTriangle className="w-3.5 h-3.5 text-[#FAA61A]" />
          <span className="text-muted-foreground">Live sync offline. Showing local backup cache.</span>
        </>
      )}
    </div>
  );
}