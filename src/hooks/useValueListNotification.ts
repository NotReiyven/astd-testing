import { useEffect, useRef } from "react";
import { useUnits } from "../context/UnitContext";
import { useNotificationStore } from "../store/useNotificationStore";
import { useToastStore } from "../store/useToastStore";
import { triggerHaptic } from "../data/helpers";
import { logger } from "../lib/logger";

const NOTIFIED_SIG_KEY = "astd_valuelist_notified_sig";
const PENDING_UPDATE_KEY = "astd_valuelist_pending_update";

// Settle configuration:
// 8 minutes of quiet time after the last sheet edit before announcing to the community.
// 15 minutes maximum time cap from initial detection.
const QUIET_WINDOW_MS = 8 * 60 * 1000;
const MAX_SETTLE_WINDOW_MS = 15 * 60 * 1000;

interface PendingUpdate {
  sig: string;
  firstDetectedAt: number;
  lastDetectedAt: number;
  snippet: string;
}

function computeValueListHash(
  units: Array<{ id: string; value?: unknown; demand?: string; tier?: string; status?: string }>,
  latestLog: string
): string {
  let hash = 2166136261;
  const prime = 16777619;

  const feed = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, prime);
    }
  };

  feed(latestLog.trim());
  feed(String(units.length));

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    feed(u.id);
    feed(String(u.value ?? ""));
    feed(String(u.demand ?? ""));
    feed(String(u.tier ?? ""));
    feed(String(u.status ?? ""));
  }

  return (hash >>> 0).toString(16);
}

export function useValueListNotification() {
  const { changelog, units, isLoading } = useUnits();
  const checkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLoading || units.length === 0) return;

    // Build a deterministic content hash of actual unit values, tiers, demands, and changelog
    const latestLog = changelog[0] || "";
    const signature = computeValueListHash(units, latestLog);

    let notifiedSig: string | null = null;
    let rawPending: string | null = null;

    try {
      notifiedSig = localStorage.getItem(NOTIFIED_SIG_KEY);
      rawPending = localStorage.getItem(PENDING_UPDATE_KEY);
    } catch (err) {
      logger.warn("ASTD-NOTIF-008", "localStorage unavailable for value list notification state", {
        scope: "useValueListNotification",
        action: "readState",
        error: err,
      });
      return;
    }

    // First visit initialization: record signature so we never ambush first-time visitors with old updates
    if (!notifiedSig) {
      try {
        localStorage.setItem(NOTIFIED_SIG_KEY, signature);
      } catch (err) {
        logger.warn("ASTD-NOTIF-009", "Failed to store initial notified signature", {
          scope: "useValueListNotification",
          action: "setInitialSignature",
          error: err,
        });
      }
      return;
    }

    // Already notified for this exact update
    if (notifiedSig === signature) {
      if (rawPending) {
        try {
          localStorage.removeItem(PENDING_UPDATE_KEY);
        } catch (err) {
          logger.warn("ASTD-NOTIF-010", "Failed to clear pending update from storage", {
            scope: "useValueListNotification",
            action: "clearPending",
            error: err,
          });
        }
      }
      return;
    }

    // New update detected: check or update pending state
    const now = Date.now();
    let pending: PendingUpdate | null = null;

    if (rawPending) {
      try {
        pending = JSON.parse(rawPending);
      } catch (err) {
        logger.warn("ASTD-NOTIF-011", "Failed to parse pending update JSON", {
          scope: "useValueListNotification",
          action: "parsePending",
          error: err,
        });
        pending = null;
      }
    }

    if (!pending || pending.sig !== signature) {
      // Either fresh detection or admin just edited more units
      const firstDetected = pending ? pending.firstDetectedAt : now;
      pending = {
        sig: signature,
        firstDetectedAt: firstDetected,
        lastDetectedAt: now,
        snippet: latestLog,
      };

      try {
        localStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify(pending));
      } catch (err) {
        logger.warn("ASTD-NOTIF-012", "Failed to save pending update to storage", {
          scope: "useValueListNotification",
          action: "savePending",
          error: err,
        });
      }
    }

    // Check if the update is ready to settle
    const checkSettlement = () => {
      if (!pending) return;

      const currentTime = Date.now();
      const quietElapsed = currentTime - pending.lastDetectedAt;
      const totalElapsed = currentTime - pending.firstDetectedAt;

      // Update has settled when either:
      // 1. Quiet window has passed with no further sheet edits
      // 2. Maximum timeout has passed since the edits started
      const isSettled =
        quietElapsed >= QUIET_WINDOW_MS || totalElapsed >= MAX_SETTLE_WINDOW_MS;

      if (isSettled) {
        const notifTitle = "Market values updated";
        const notifMessage =
          "Unit values, tiers, and demands were adjusted in the spreadsheet. Review the latest patch notes.";

        // 1. Dispatch in-app notification to the store and offline cache
        useNotificationStore.getState().addLocalNotification({
          id: `local-valuelist-${pending.sig.slice(0, 32)}`,
          type: "value_update",
          title: notifTitle,
          message: notifMessage,
          action_url: "/home",
          action_label: "View Update Log",
          created_at: new Date().toISOString(),
        });

        // 2. Dispatch non-intrusive toast with haptic feedback
        triggerHaptic("medium");
        useToastStore.getState().addToast(
          "Market values and tiers were adjusted in the latest update.",
          "info",
          {
            duration: 6000,
            action: {
              label: "View Update Log",
              onClick: () => {
                window.document.dispatchEvent(
                  new CustomEvent("navigate", { detail: "home" })
                );
              },
            },
          }
        );

        // 3. Mark as notified and clear pending queue
        try {
          localStorage.setItem(NOTIFIED_SIG_KEY, pending.sig);
          localStorage.removeItem(PENDING_UPDATE_KEY);
        } catch (err) {
          logger.warn("ASTD-NOTIF-013", "Failed to update notified signature or clear pending in storage", {
            scope: "useValueListNotification",
            action: "settleNotification",
            error: err,
          });
        }

        if (checkTimerRef.current) {
          clearInterval(checkTimerRef.current);
          checkTimerRef.current = null;
        }
      }
    };

    // Run check immediately
    checkSettlement();

    // Set recurring check every 30 seconds while pending
    if (checkTimerRef.current) {
      clearInterval(checkTimerRef.current);
    }
    checkTimerRef.current = setInterval(checkSettlement, 30000);

    return () => {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
        checkTimerRef.current = null;
      }
    };
  }, [changelog, units, isLoading]);
}
