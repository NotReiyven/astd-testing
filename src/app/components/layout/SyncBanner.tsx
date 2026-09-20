// ================================================
// FILE: src/app/components/layout/SyncBanner.tsx
// ================================================

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useUnits } from "../../../context/UnitContext";

export function SyncBanner() {
  const { isError, isSyncing } = useUnits();

  if (!isError && !isSyncing) return null;

  return (
    <div className="bg-[#1E1F22] border-b border-[rgba(255,255,255,0.06)] px-4 py-1.5 flex items-center justify-center gap-2 text-[12px] font-medium text-[#DBDEE1] z-50 shrink-0">
      {isSyncing ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-[#5865F2] animate-spin" />
          <span>Syncing live spreadsheet data...</span>
        </>
      ) : (
        <>
          <AlertTriangle className="w-3.5 h-3.5 text-[#FAA61A]" />
          <span>Live sync offline. Showing local backup cache.</span>
        </>
      )}
    </div>
  );
}