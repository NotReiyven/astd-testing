import { useEffect, useRef } from "react";
import { useUnits } from "../context/UnitContext";
import { useNotificationStore } from "../store/useNotificationStore";
import { useToastStore } from "../store/useToastStore";
import { triggerHaptic } from "../data/helpers";

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

export function useValueListNotification() {
  const { changelog, units, lastUpdated, isLoading } = useUnits();
  const checkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLoading || units.length === 0) return;

    // Build a unique signature representing the current state of the value list
    const latestLog = changelog[0] || "";
    const signature = `${latestLog.trim()}|${units.length}|${lastUpdated}`;

    let notifiedSig: string | null = null;
    let rawPending: string | null = null;

    try {
      notifiedSig = localStorage.getItem(NOTIFIED_SIG_KEY);
      rawPending = localStorage.getItem(PENDING_UPDATE_KEY);
    } catch {
      // Storage unavailable
      return;
    }

    // First visit initialization: record signature so we never ambush first-time visitors with old updates
    if (!notifiedSig) {
      try {
        localStorage.setItem(NOTIFIED_SIG_KEY, signature);
      } catch {
        // ignore
      }
      return;
    }

    // Already notified for this exact update
    if (notifiedSig === signature) {
      if (rawPending) {
        try {
          localStorage.removeItem(PENDING_UPDATE_KEY);
        } catch {
          // ignore
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
      } catch {
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
      } catch {
        // ignore
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
        const notifTitle = "Value list updated";
        const notifMessage =
          pending.snippet ||
          "Market values and tiers have been updated across the value list. Review the latest shifts.";

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
          "Value list updated: Market values and tiers were adjusted.",
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
        } catch {
          // ignore
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
  }, [changelog, units.length, lastUpdated, isLoading]);
}
