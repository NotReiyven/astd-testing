import { useEffect } from "react";
import { get, set, del } from "idb-keyval";
import { supabase } from "../lib/supabase";
import { useToastStore } from "../store/useToastStore";
import { copyTextWithFallback } from "../data/helpers";

import { useAuthStore } from "../store/useAuthStore";

const SYNC_DELAY_MS = 200;
const MAX_BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const SYNC_TOAST_ID = "network-sync-status";

export const PERMANENT_HTTP_STATUSES = new Set([400, 404, 409, 422]);
export const PERMANENT_DB_CODES = new Set([
  "23502", // not_null_violation
  "23503", // foreign_key_violation
  "23505", // unique_violation
  "23514", // check_violation
  "22P02", // invalid_text_representation
  "PGRST116", // invalid single row result
  "PGRST204", // column not found in schema cache
]);
const AUTH_EXPIRED_HTTP_STATUSES = new Set([401, 403]);
const AUTH_EXPIRED_DB_CODES = new Set(["42501", "PGRST301"]);

const QUEUE_KEYS = [
  "astd_offline_profile",
  "astd_offline_wishlist",
  "astd_offline_inventory",
  "astd_offline_comments",
  "astd_offline_ads",
] as const;

type QueueKey = (typeof QUEUE_KEYS)[number];

let isSyncInFlight = false;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const generateSyncId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const pluralizeChanges = (count: number) =>
  `${count}\u00A0offline ${count === 1 ? "change" : "changes"}`;

function belongsToUser(item: any, currentUserId: string): boolean {
  if (!item || typeof item !== "object") return false;
  if (item.userId && item.userId !== currentUserId) return false;
  if (item.user_id && item.user_id !== currentUserId) return false;
  if (item.userProfile?.id && item.userProfile.id !== currentUserId) return false;
  if (item.item?.user_id && item.item.user_id !== currentUserId) return false;
  return true;
}

function stripSyncMeta<T>(raw: T): T {
  if (!raw || typeof raw !== "object") return raw;
  const { _syncId: _id, _attempts: _att, ...rest } = raw as Record<string, any>;
  if (rest.item && typeof rest.item === "object") {
    const { _syncId: _iId, _attempts: _iAtt, ...cleanNestedItem } = rest.item;
    rest.item = cleanNestedItem;
  }
  if (rest.updates && typeof rest.updates === "object") {
    const { _syncId: _uId, _attempts: _uAtt, ...cleanUpdates } = rest.updates;
    rest.updates = cleanUpdates;
  }
  return rest as T;
}

function describeQueueItem(storageKey: QueueKey, item: any): string {
  switch (storageKey) {
    case "astd_offline_profile":
      return "Profile settings update";
    case "astd_offline_wishlist":
      return `Wishlist ${item?.action === "REMOVE" ? "removal" : "addition"} (${item?.unitId || "unit"})`;
    case "astd_offline_inventory":
      return `Vault ${item?.action || "update"}${item?.unitId ? ` (${item.unitId})` : ""}`;
    case "astd_offline_comments":
      return "Ad comment";
    case "astd_offline_ads":
      return "Trade listing";
  }
}

type SyncErrorCategory = "auth_expired" | "permanent" | "retryable";

function classifySyncError(err: any): {
  category: SyncErrorCategory;
  reason: string;
} {
  const status = typeof err?.status === "number" ? err.status : 0;
  const code = typeof err?.code === "string" ? err.code : "";
  const message =
    typeof err?.message === "string" && err.message.trim().length > 0
      ? err.message.trim()
      : "Request rejected by server";

  // 1. Explicit retryable statuses: 408 Request Timeout, 429 Rate Limit, and all 5xx
  if (status === 408 || status === 429 || (status >= 500 && status < 600)) {
    return {
      category: "retryable",
      reason: `${message} (HTTP ${status})`,
    };
  }

  // 2. Auth expired / permission denied (401, 403, PGRST301, 42501): keep in queue without counting attempt
  if (
    AUTH_EXPIRED_HTTP_STATUSES.has(status) ||
    AUTH_EXPIRED_DB_CODES.has(code) ||
    message.toLowerCase().includes("jwt expired")
  ) {
    return {
      category: "auth_expired",
      reason: status ? `${message} (HTTP ${status})` : message,
    };
  }

  // 3. Clear permanent errors (400, 404, 409, 422, or explicit Postgres constraint/schema codes)
  if (PERMANENT_HTTP_STATUSES.has(status)) {
    return {
      category: "permanent",
      reason: `${message} (HTTP ${status})`,
    };
  }

  if (PERMANENT_DB_CODES.has(code)) {
    return {
      category: "permanent",
      reason: `${message} (${code})`,
    };
  }

  // 4. Default to retryable for transient network/unknown errors
  return {
    category: "retryable",
    reason: message,
  };
}

function throwIfError(result: { error: any; status?: number }) {
  if (result.error) {
    const err = new Error(
      result.error.message || "Database operation failed"
    ) as Error & { status?: number; code?: string };
    err.status = result.status;
    err.code = result.error.code;
    throw err;
  }
}

export async function syncAllQueues(): Promise<void> {
  if (isSyncInFlight) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  isSyncInFlight = true;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    if (!currentUserId) return;

    // 1. Inspect queues first & normalize legacy items missing _syncId/_attempts
    let totalActionable = 0;
    for (const key of QUEUE_KEYS) {
      const rawQueue: any[] = (await get(key)) || [];
      if (!Array.isArray(rawQueue) || rawQueue.length === 0) continue;

      let mutatedIds = false;
      const tagged = rawQueue.map((item) => {
        if (
          item &&
          typeof item === "object" &&
          (!item._syncId || typeof item._attempts !== "number")
        ) {
          mutatedIds = true;
          return {
            ...item,
            _syncId: item._syncId || generateSyncId(),
            _attempts: typeof item._attempts === "number" ? item._attempts : 0,
          };
        }
        return item;
      });

      if (mutatedIds) {
        await set(key, tagged);
      }

      const userItems = tagged.filter((item) =>
        belongsToUser(item, currentUserId)
      );
      totalActionable += Math.min(userItems.length, MAX_BATCH_SIZE);
    }

    if (totalActionable === 0) return;

    const { addToast, updateToast, removeToast } = useToastStore.getState();

    addToast(
      `Syncing ${pluralizeChanges(totalActionable)}\u2026`,
      "loading",
      {
        id: SYNC_TOAST_ID,
        dedupeKey: SYNC_TOAST_ID,
      }
    );

    let totalSynced = 0;
    let totalFailedRetryable = 0;
    let authExpired = false;
    const droppedNotices: string[] = [];
    const droppedPayloads: Array<{
      queue: QueueKey;
      change: string;
      reason: string;
      attempts: number;
      payload: any;
    }> = [];

    const processQueue = async (
      storageKey: QueueKey,
      processor: (cleanItem: any) => Promise<void>
    ) => {
      if (authExpired) return;

      const rawInitial: any[] = (await get(storageKey)) || [];
      if (!Array.isArray(rawInitial) || rawInitial.length === 0) return;

      // Ensure every item in storageKey has _syncId and _attempts defaulted to 0 on read
      let normalizedChanged = false;
      const initialQueue = rawInitial.map((entry) => {
        if (
          entry &&
          typeof entry === "object" &&
          (!entry._syncId || typeof entry._attempts !== "number")
        ) {
          normalizedChanged = true;
          return {
            ...entry,
            _syncId: entry._syncId || generateSyncId(),
            _attempts:
              typeof entry._attempts === "number" ? entry._attempts : 0,
          };
        }
        return entry;
      });

      if (normalizedChanged) {
        await set(storageKey, initialQueue);
      }

      const actionableBatch = initialQueue
        .filter((item) => belongsToUser(item, currentUserId))
        .slice(0, MAX_BATCH_SIZE);

      if (actionableBatch.length === 0) return;

      const syncedIds = new Set<string>();
      const droppedIds = new Set<string>();
      const failedAttemptsMap = new Map<string, number>();

      for (const item of actionableBatch) {
        const syncId: string = item._syncId;
        const cleanItem = stripSyncMeta(item);

        try {
          await processor(cleanItem);
          syncedIds.add(syncId);
          totalSynced++;
          await sleep(SYNC_DELAY_MS);
        } catch (err) {
          const { category, reason } = classifySyncError(err);

          if (category === "auth_expired") {
            // Keep item in queue, do NOT increment _attempts, and ask user to sign in again
            authExpired = true;
            break;
          }

          const nextAttempts =
            (typeof item._attempts === "number" ? item._attempts : 0) + 1;

          if (category === "permanent" || nextAttempts >= MAX_ATTEMPTS) {
            droppedIds.add(syncId);
            const label = describeQueueItem(storageKey, cleanItem);
            const why =
              category === "permanent"
                ? `permanent error: ${reason}`
                : `max ${MAX_ATTEMPTS}\u00A0attempts reached (${reason})`;
            droppedNotices.push(`${label} — ${why}`);
            const dropRecord = {
              queue: storageKey,
              change: label,
              reason: why,
              attempts: nextAttempts,
              payload: cleanItem,
            };
            droppedPayloads.push(dropRecord);
            console.warn(
              "[useNetworkSync] Dropped offline queue item:",
              dropRecord
            );
          } else {
            failedAttemptsMap.set(syncId, nextAttempts);
            totalFailedRetryable++;
          }
        }
      }

      // Re-read current queue from IndexedDB so any items queued DURING sync are preserved
      const latestQueue: any[] = (await get(storageKey)) || [];
      const reconciledQueue = latestQueue
        .filter((entry) => {
          if (!belongsToUser(entry, currentUserId)) return false;
          const id = entry?._syncId;
          if (!id) return true;
          if (syncedIds.has(id) || droppedIds.has(id)) return false;
          return true;
        })
        .map((entry) => {
          const id = entry?._syncId;
          if (id && failedAttemptsMap.has(id)) {
            return { ...entry, _attempts: failedAttemptsMap.get(id) };
          }
          return entry;
        });

      if (reconciledQueue.length === 0) {
        await del(storageKey);
      } else {
        await set(storageKey, reconciledQueue);
      }
    };

    // 1. Profile Sync
    await processQueue("astd_offline_profile", async (op) => {
      const res = await supabase
        .from("profiles")
        .update(op.updates)
        .eq("id", op.userId);
      throwIfError(res);
    });

    // 2. Wishlist Sync
    await processQueue("astd_offline_wishlist", async (op) => {
      if (op.action === "ADD") {
        const res = await supabase
          .from("user_wishlist")
          .upsert(
            { user_id: op.userId, unit_id: op.unitId },
            { onConflict: "user_id, unit_id" }
          );
        throwIfError(res);
      } else if (op.action === "REMOVE") {
        const res = await supabase
          .from("user_wishlist")
          .delete()
          .eq("user_id", op.userId)
          .eq("unit_id", op.unitId);
        throwIfError(res);
      }
    });

    // 3. Inventory Sync
    await processQueue("astd_offline_inventory", async (op) => {
      if (op.action === "UPSERT") {
        const res = await supabase
          .from("user_inventory")
          .upsert(
            {
              user_id: op.userId,
              unit_id: op.unitId,
              quantity: op.quantity,
              is_pinned: false,
            },
            { onConflict: "user_id, unit_id" }
          );
        throwIfError(res);
      } else if (op.action === "REMOVE") {
        const res = await supabase
          .from("user_inventory")
          .delete()
          .eq("user_id", op.userId)
          .eq("unit_id", op.unitId);
        throwIfError(res);
      } else if (op.action === "RESTORE") {
        if (op.item?.user_id === currentUserId) {
          const res = await supabase
            .from("user_inventory")
            .upsert(op.item, { onConflict: "user_id, unit_id" });
          throwIfError(res);
        }
      } else if (op.action === "TOGGLE_PIN") {
        const res = await supabase
          .from("user_inventory")
          .update({ is_pinned: op.status })
          .eq("user_id", op.userId)
          .eq("unit_id", op.unitId);
        throwIfError(res);
      } else if (op.action === "CLEAR_ALL") {
        const res = await supabase
          .from("user_inventory")
          .delete()
          .eq("user_id", op.userId);
        throwIfError(res);
      } else if (op.action === "CLEAR_UNPINNED") {
        const res = await supabase
          .from("user_inventory")
          .delete()
          .eq("user_id", op.userId)
          .eq("is_pinned", false);
        throwIfError(res);
      }
    });

    // 4. Comments Sync
    await processQueue("astd_offline_comments", async (c) => {
      const res = await supabase.from("ad_comments").insert({
        ad_id: c.adId,
        user_id: c.userProfile.id,
        content: c.content,
        parent_id: c.parentId,
      });
      throwIfError(res);
    });

    // 5. Ads Sync
    await processQueue("astd_offline_ads", async (cleanPayload) => {
      const res = await supabase.from("trading_ads").insert(cleanPayload);
      throwIfError(res);
    });

    if (authExpired) {
      updateToast(SYNC_TOAST_ID, {
        message:
          "Your session expired while syncing offline changes. Sign in again to finish syncing.",
        type: "error",
        action: {
          label: "Sign In",
          onClick: () => {
            void useAuthStore.getState().loginWithDiscord();
          },
        },
      });
      return;
    }

    // Notify user about any permanently dropped changes
    if (droppedNotices.length > 0) {
      const summary =
        droppedNotices.length === 1
          ? `Dropped offline change: ${droppedNotices[0]}`
          : `Dropped ${droppedNotices.length}\u00A0offline changes: ${droppedNotices.join("; ")}`;

      const copyDetailsAction = {
        label: "Copy Details",
        onClick: () => {
          const json = JSON.stringify(
            droppedPayloads.length === 1 ? droppedPayloads[0] : droppedPayloads,
            null,
            2
          );
          void copyTextWithFallback(json).then((ok) => {
            if (ok) {
              addToast(
                "Copied dropped change details to clipboard.",
                "info"
              );
            } else {
              addToast(
                "Could not copy details automatically. Check the browser console for the payload.",
                "warning"
              );
            }
          });
        },
      };

      if (totalFailedRetryable === 0 && totalSynced === 0) {
        updateToast(SYNC_TOAST_ID, {
          message: summary,
          type: "error",
          action: copyDetailsAction,
        });
        return;
      }

      addToast(summary, "warning", {
        dedupeKey: "network-sync-dropped",
        action: copyDetailsAction,
      });
    }

    if (totalFailedRetryable > 0) {
      const msg =
        totalSynced > 0
          ? `Synced ${pluralizeChanges(totalSynced)}, but ${pluralizeChanges(totalFailedRetryable)} could not be saved.`
          : `Could not sync ${pluralizeChanges(totalFailedRetryable)}. Check your connection and retry.`;

      updateToast(SYNC_TOAST_ID, {
        message: msg,
        type: "error",
        action: {
          label: "Retry",
          onClick: () => {
            void syncAllQueues();
          },
        },
      });
    } else if (totalSynced > 0) {
      updateToast(SYNC_TOAST_ID, {
        message: `Synced ${pluralizeChanges(totalSynced)}.`,
        type: "success",
        action: undefined,
      });
    } else {
      removeToast(SYNC_TOAST_ID);
    }
  } finally {
    isSyncInFlight = false;
  }
}

export function useNetworkSync() {
  useEffect(() => {
    const handleOffline = () => {
      useToastStore
        .getState()
        .addToast(
          "Offline mode active. Changes will queue locally and sync when reconnected.",
          "warning",
          { dedupeKey: "network-offline-banner" }
        );
    };

    const handleOnline = () => {
      void syncAllQueues();
    };

    // Attempt to flush any pending offline queues on initial mount if online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void syncAllQueues();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
}

