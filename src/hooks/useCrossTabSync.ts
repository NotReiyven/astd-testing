import { useEffect } from "react";
import { useTradeStore } from "../store/useTradeStore";
import { useLayoutStore } from "../store/useLayoutStore";
import { logger } from "../lib/logger";

export function useCrossTabSync() {
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || !event.newValue) return;
      try {
        if (event.key === "astd_trade_storage") {
          useTradeStore.persist.rehydrate();
        } else if (event.key === "astd_layout_storage") {
          useLayoutStore.persist.rehydrate();
        }
      } catch (err) {
        logger.warn("ASTD-QOL-001", "Failed to sync state across tabs", {
          scope: "useCrossTabSync",
          action: "handleStorage",
          error: err,
        });
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);
}