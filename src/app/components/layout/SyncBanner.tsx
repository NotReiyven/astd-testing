// ================================================
// FILE: src/app/components/layout/SyncBanner.tsx
// ================================================

import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { useUnits } from "../../../context/UnitContext";

export function SyncBanner() {
  const { isError, isSyncing } = useUnits();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-center gap-2 text-[12px] font-medium text-destructive z-50 shrink-0 shadow-sm animate-fade-in">
        <WifiOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Offline Mode: Operating from local cache. Actions will sync automatically.</span>
        <span className="sm:hidden">Offline: Actions queued locally.</span>
      </div>
    );
  }

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