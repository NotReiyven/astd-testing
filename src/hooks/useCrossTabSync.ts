// ================================================
// FILE: src/hooks/useCrossTabSync.ts
// ================================================

import { useEffect } from "react";
import { useTradeStore } from "../store/useTradeStore";
import { useLayoutStore } from "../store/useLayoutStore";
import { useNetworkSyncStore } from "./useNetworkSync";
import { get as getIdb } from "idb-keyval";
import { logger } from "../lib/logger";

const OFFLINE_QUEUE_KEYS = [
  "astd_offline_profile",
  "astd_offline_wishlist",
  "astd_offline_inventory",
  "astd_offline_comments",
  "astd_offline_ads",
] as const;

const REHYDRATE_DEBOUNCE_MS = 150;

async function refreshPendingCount() {
  let total = 0;
  try {
    for (const key of OFFLINE_QUEUE_KEYS) {
      const q = (await getIdb(key)) || [];
      if (Array.isArray(q)) total += q.length;
    }
  } catch {}
  useNetworkSyncStore.getState().setPendingChangesCount(total);
}

export function useCrossTabSync() {
  useEffect(() => {
    const pending = new Map<string, ReturnType<typeof setTimeout>>();

    const schedule = (key: string, fn: () => void) => {
      const existing = pending.get(key);
      if (existing) clearTimeout(existing);
      pending.set(
        key,
        setTimeout(() => {
          pending.delete(key);
          try {
            fn();
          } catch (err) {
            logger.warn(
              "ASTD-QOL-002",
              "Cross-tab sync callback failed",
              {
                scope: "useCrossTabSync",
                action: "schedule",
                metadata: { key },
                error: err,
              }
            );
          }
        }, REHYDRATE_DEBOUNCE_MS)
      );
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;

      if (event.key === "astd_trade_storage") {
        schedule("trade", () => {
          useTradeStore.persist.rehydrate();
        });
        return;
      }

      if (event.key === "astd_layout_storage") {
        schedule("layout", () => {
          useLayoutStore.persist.rehydrate();
        });
        return;
      }

      if (event.key.startsWith("astd_offline_")) {
        schedule("offline-count", () => {
          void refreshPendingCount();
        });
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);
}