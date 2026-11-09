import { useEffect } from "react";
import { get, set, del } from "idb-keyval";
import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { useToastStore } from "../store/useToastStore";
import { copyTextWithFallback } from "../data/helpers";
import { useAuthStore } from "../store/useAuthStore";
import { logger } from "../lib/logger";
import { getVerifiedQueue } from "../lib/offlineQueue";

const SYNC_DELAY_MS = 200;
const MAX_BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const SYNC_TOAST_ID = "network-sync-status";

const MAX_ACTIVE_ADS_REGULAR = 3;

export const PERMANENT_HTTP_STATUSES = new Set([400, 404, 409, 422]);
export const PERMANENT_DB_CODES = new Set([
  "23502", "23503", "23505", "23514", "22P02", "PGRST116", "PGRST204",
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

function stripSyncMeta<T>(raw: T): T {
  if (!raw || typeof raw !== "object") return raw;
  const {
    _syncId, _attempts, retryCount, _queuedAt, _owner, _sig,
    ...rest
  } = raw as Record<string, any>;
  
  if (rest.item && typeof rest.item === "object") {
    const { _syncId: _iId, _attempts: _iAtt, retryCount: _iRc, ...cleanNestedItem } = rest.item;
    rest.item = cleanNestedItem;
  }
  if (rest.updates && typeof rest.updates === "object") {
    const { _syncId: _uId, _attempts: _uAtt, retryCount: _uRc, ...cleanUpdates } = rest.updates;
    rest.updates = cleanUpdates;
  }
  return rest as T;
}

function describeQueueItem(storageKey: QueueKey, item: any): string {
  switch (storageKey) {
    case "astd_offline_profile": return "Profile settings update";
    case "astd_offline_wishlist": return `Wishlist ${item?.action === "REMOVE" ? "removal" : "addition"} (${item?.unitId || "unit"})`;
    case "astd_offline_inventory": return `Vault ${item?.action || "update"}${item?.unitId ? ` (${item.unitId})` : ""}`;
    case "astd_offline_comments": return "Ad comment";
    case "astd_offline_ads": return "Trade listing";
  }
}

type SyncErrorCategory = "auth_expired" | "permanent" | "retryable";

function classifySyncError(err: any): { category: SyncErrorCategory; reason: string } {
  const status = typeof err?.status === "number" ? err.status : 0;
  const code = typeof err?.code === "string" ? err.code : "";
  const message = typeof err?.message === "string" && err.message.trim().length > 0 ? err.message.trim() : "Request rejected by server";

  if (status === 408 || status === 429 || (status >= 500 && status < 600)) {
    return { category: "retryable", reason: `${message} (HTTP ${status})` };
  }
  if (AUTH_EXPIRED_HTTP_STATUSES.has(status) || AUTH_EXPIRED_DB_CODES.has(code) || message.toLowerCase().includes("jwt expired")) {
    return { category: "auth_expired", reason: status ? `${message} (HTTP ${status})` : message };
  }
  if (PERMANENT_HTTP_STATUSES.has(status)) {
    return { category: "permanent", reason: `${message} (HTTP ${status})` };
  }
  if (PERMANENT_DB_CODES.has(code)) {
    return { category: "permanent", reason: `${message} (${code})` };
  }
  return { category: "retryable", reason: message };
}

function throwIfError(result: { error: any; status?: number }) {
  if (result.error) {
    const err = new Error(result.error.message || "Database operation failed") as Error & { status?: number; code?: string };
    err.status = result.status;
    err.code = result.error.code;
    throw err;
  }
}

function makePermanentError(message: string): Error {
  const err = new Error(message) as Error & { status?: number; code?: string };
  err.code = "23514"; 
  return err;
}

interface NetworkSyncState {
  pendingChangesCount: number;
  setPendingChangesCount: (count: number) => void;
}

export const useNetworkSyncStore = create<NetworkSyncState>((set) => ({
  pendingChangesCount: 0,
  setPendingChangesCount: (count) => set({ pendingChangesCount: count }),
}));

async function updatePendingCount() {
  let total = 0;
  try {
    for (const key of QUEUE_KEYS) {
      const q = (await get(key)) || [];
      if (Array.isArray(q)) total += q.length;
    }
  } catch {}
  useNetworkSyncStore.getState().setPendingChangesCount(total);
}

export async function syncAllQueues(): Promise<void> {
  if (isSyncInFlight) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    updatePendingCount();
    return;
  }

  isSyncInFlight = true;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      updatePendingCount();
      return;
    }

    // 1. Load and cryptographically verify queues
    const verifiedQueues: Record<string, any[]> = {};
    let totalActionable = 0;

    for (const key of QUEUE_KEYS) {
      const verified = await getVerifiedQueue(key, currentUserId);
      verifiedQueues[key] = verified;
      totalActionable += Math.min(verified.length, MAX_BATCH_SIZE);
    }

    updatePendingCount();

    if (totalActionable === 0) return;

    const { addToast, updateToast, removeToast } = useToastStore.getState();

    addToast(`Syncing ${pluralizeChanges(totalActionable)}\u2026`, "loading", {
      id: SYNC_TOAST_ID,
      dedupeKey: SYNC_TOAST_ID,
    });

    let totalSynced = 0;
    let totalFailedRetryable = 0;
    let authExpired = false;
    const droppedNotices: string[] = [];
    const droppedPayloads: any[] = [];

    const processQueue = async (
      storageKey: QueueKey,
      processor: (cleanItem: any) => Promise<void>
    ) => {
      if (authExpired) return;

      let queue = verifiedQueues[storageKey] || [];
      if (queue.length === 0) return;

      // Ensure items have tracking IDs for this sync attempt
      const actionableBatch = queue.slice(0, MAX_BATCH_SIZE).map(item => ({
        ...item,
        _syncId: item._syncId || generateSyncId(),
        _attempts: typeof item._attempts === "number" ? item._attempts : 0,
      }));

      const syncedIds: string[] = [];
      const permanentlyDroppedIds: string[] = [];
      const failedRetryCounts = new Map<string, number>();

      for (const item of actionableBatch) {
        const syncId: string = item._syncId;
        const cleanItem = stripSyncMeta(item);
        const startTime = performance.now();

        try {
          await processor(cleanItem);
          syncedIds.push(syncId);
          totalSynced++;
          await sleep(SYNC_DELAY_MS);
        } catch (err) {
          const durationMs = performance.now() - startTime;
          const { category, reason } = classifySyncError(err);

          if (category === "auth_expired") {
            authExpired = true;
            logger.warn("ASTD-SYNC-002", "Session expired while syncing offline queue item", {
              scope: "useNetworkSync", action: storageKey, durationMs, metadata: { syncId, queue: storageKey }, error: err,
            });
            break;
          }

          const currentRetries = item._attempts || 0;
          const nextRetries = currentRetries + 1;

          if (category === "permanent" || nextRetries > MAX_RETRIES) {
            permanentlyDroppedIds.push(syncId);
            const label = describeQueueItem(storageKey, cleanItem);
            const why = category === "permanent" ? `permanent rejection: ${reason}` : `exceeded max retries (${MAX_RETRIES}): ${reason}`;
            droppedNotices.push(`${label} \u2014 ${why}`);
            droppedPayloads.push({ queue: storageKey, change: label, reason: why, payload: cleanItem });
            logger.error("ASTD-SYNC-003", `Offline item permanently dropped from ${storageKey}`, {
              scope: "useNetworkSync", action: "drop_item", durationMs, metadata: { syncId, queue: storageKey, reason }, error: err,
            });
          } else {
            failedRetryCounts.set(syncId, nextRetries);
            totalFailedRetryable++;
            logger.error("ASTD-SYNC-001", `Offline item sync failed in ${storageKey}; will retry`, {
              scope: "useNetworkSync", action: "retry_item", durationMs, metadata: { syncId, queue: storageKey, retryCount: nextRetries, reason }, error: err,
            });
          }
        }
      }

      // 2. Reconcile the queue by removing synced/dropped items and updating retries
      const latestQueue = (await get(storageKey)) || [];
      const reconciledQueue = latestQueue
        .filter((entry) => {
          const id = entry?._syncId;
          if (!id) return true; // Keep untracked items (shouldn't happen)
          if (syncedIds.includes(id) || permanentlyDroppedIds.includes(id)) return false;
          return true;
        })
        .map((entry) => {
          const id = entry?._syncId;
          if (id && failedRetryCounts.has(id)) {
            const count = failedRetryCounts.get(id)!;
            return { ...entry, _attempts: count };
          }
          return entry;
        });

      if (reconciledQueue.length === 0) {
        await del(storageKey);
      } else {
        await set(storageKey, reconciledQueue);
      }
      
      updatePendingCount();
    };

    await processQueue("astd_offline_profile", async (op) => {
      const res = await supabase.from("profiles").update(op.updates).eq("id", op.userId);
      throwIfError(res);
    });

    await processQueue("astd_offline_wishlist", async (op) => {
      if (op.action === "ADD") {
        const res = await supabase.from("user_wishlist").upsert({ user_id: op.userId, unit_id: op.unitId }, { onConflict: "user_id,unit_id" });
        throwIfError(res);
      } else if (op.action === "REMOVE") {
        const res = await supabase.from("user_wishlist").delete().eq("user_id", op.userId).eq("unit_id", op.unitId);
        throwIfError(res);
      }
    });

    await processQueue("astd_offline_inventory", async (op) => {
      if (op.action === "UPSERT") {
        const res = await supabase.from("user_inventory").upsert({ user_id: op.userId, unit_id: op.unitId, quantity: op.quantity, is_pinned: false }, { onConflict: "user_id,unit_id" });
        throwIfError(res);
      } else if (op.action === "REMOVE") {
        const res = await supabase.from("user_inventory").delete().eq("user_id", op.userId).eq("unit_id", op.unitId);
        throwIfError(res);
      } else if (op.action === "RESTORE") {
        if (op.item?.user_id === currentUserId) {
          const res = await supabase.from("user_inventory").insert(op.item);
          if (String(res.error?.code || "") === "23505" || res.status === 409) return;
          throwIfError(res);
        }
      } else if (op.action === "TOGGLE_PIN") {
        const res = await supabase.from("user_inventory").update({ is_pinned: op.status }).eq("user_id", op.userId).eq("unit_id", op.unitId);
        throwIfError(res);
      } else if (op.action === "CLEAR_ALL") {
        const res = await supabase.from("user_inventory").delete().eq("user_id", op.userId);
        throwIfError(res);
      } else if (op.action === "CLEAR_UNPINNED") {
        const res = await supabase.from("user_inventory").delete().eq("user_id", op.userId).eq("is_pinned", false);
        throwIfError(res);
      }
    });

    await processQueue("astd_offline_comments", async (c) => {
      const res = await supabase.from("ad_comments").insert({ ad_id: c.adId, user_id: c.userProfile.id, content: c.content, parent_id: c.parentId });
      throwIfError(res);
    });

    await processQueue("astd_offline_ads", async (cleanPayload) => {
      const expMs = new Date(cleanPayload.expires_at).getTime();
      if (!Number.isFinite(expMs) || expMs <= Date.now()) {
        throw makePermanentError("Trade ad expired before sync; dropping (re-create when online).");
      }

      const liveProfile = useAuthStore.getState().profile;
      const callerRole = (liveProfile?.role || "user").toLowerCase();
      const isStaffNow = ["mod", "admin", "master"].includes(callerRole);

      if (!isStaffNow) {
        const { count, error: countError } = await supabase.from("trading_ads").select("id", { count: "exact", head: true }).eq("user_id", cleanPayload.user_id).gt("expires_at", new Date().toISOString());
        if (countError) {
          const err = new Error(`Could not verify active listing count: ${countError.message}`) as Error & { status?: number };
          err.status = 503;
          throw err;
        }
        if ((count || 0) >= MAX_ACTIVE_ADS_REGULAR) {
          throw makePermanentError(`Active listing limit reached (${MAX_ACTIVE_ADS_REGULAR}). Queued ad dropped.`);
        }
      }

      const res = await supabase.from("trading_ads").insert(cleanPayload);
      throwIfError(res);
    });

    updatePendingCount();

    if (authExpired) {
      updateToast(SYNC_TOAST_ID, {
        message: "Your session expired while syncing offline changes. Sign in again to finish syncing.",
        type: "error",
        action: { label: "Sign In", onClick: () => { void useAuthStore.getState().loginWithDiscord(); } },
      });
      return;
    }

    if (droppedNotices.length > 0) {
      const summary = droppedNotices.length === 1 ? `Dropped offline change: ${droppedNotices[0]}` : `Dropped ${droppedNotices.length}\u00A0offline changes: ${droppedNotices.join("; ")}`;
      const copyDetailsAction = {
        label: "Copy Details",
        onClick: () => {
          const json = JSON.stringify(droppedPayloads.length === 1 ? droppedPayloads[0] : droppedPayloads, null, 2);
          void copyTextWithFallback(json).then((ok) => {
            addToast(ok ? "Copied dropped change details to clipboard." : "Could not copy details automatically.", ok ? "info" : "warning");
          });
        },
      };

      if (totalFailedRetryable === 0 && totalSynced === 0) {
        updateToast(SYNC_TOAST_ID, { message: summary, type: "error", action: copyDetailsAction });
        return;
      }

      addToast(summary, "warning", { dedupeKey: "network-sync-dropped", action: copyDetailsAction });
    }

    if (totalFailedRetryable > 0) {
      const msg = totalSynced > 0 
        ? `Synced ${pluralizeChanges(totalSynced)}, but ${pluralizeChanges(totalFailedRetryable)} could not be saved.`
        : `Could not sync ${pluralizeChanges(totalFailedRetryable)}. Check your connection and retry.`;
      updateToast(SYNC_TOAST_ID, { message: msg, type: "error", action: { label: "Retry", onClick: () => { void syncAllQueues(); } } });
    } else if (totalSynced > 0) {
      updateToast(SYNC_TOAST_ID, { message: `Synced ${pluralizeChanges(totalSynced)}.`, type: "success", action: undefined });
    } else {
      removeToast(SYNC_TOAST_ID);
    }
  } finally {
    isSyncInFlight = false;
    updatePendingCount();
  }
}

export function useNetworkSync() {
  useEffect(() => {
    void updatePendingCount();

    const handleOffline = () => {
      useToastStore.getState().addToast("Offline mode active. Changes will queue locally and sync when reconnected.", "warning", { dedupeKey: "network-offline-banner" });
      void updatePendingCount();
    };

    const handleOnline = () => {
      void syncAllQueues();
    };

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