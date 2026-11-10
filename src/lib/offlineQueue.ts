// ================================================
// FILE: src/lib/offlineQueue.ts
// ================================================

import { get as getIdb, set as setIdb } from "idb-keyval";
import { logger } from "./logger";

const QUEUE_KEYS = [
  "astd_offline_profile",
  "astd_offline_wishlist",
  "astd_offline_inventory",
  "astd_offline_comments",
  "astd_offline_ads",
] as const;

export type QueueKey = (typeof QUEUE_KEYS)[number];

// ----------------------------------------------------------------------------
// HMAC Signing Helpers
// ----------------------------------------------------------------------------

async function getHmacKey(userId: string): Promise<CryptoKey | null> {
  try {
    const enc = new TextEncoder();
    return await crypto.subtle.importKey(
      "raw",
      enc.encode(`astd-offline-queue-${userId}`),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  } catch (err) {
    logger.warn("ASTD-OFF-001", "Failed to derive HMAC key for offline queue", {
      scope: "offlineQueue",
      action: "getHmacKey",
      metadata: { userId },
      error: err,
    });
    return null;
  }
}

async function signPayload(payload: unknown, userId: string): Promise<string> {
  const key = await getHmacKey(userId);
  if (!key) return "";
  const enc = new TextEncoder();
  const data = enc.encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPayload(
  payload: unknown,
  signature: string,
  userId: string
): Promise<boolean> {
  const key = await getHmacKey(userId);
  if (!key || !signature) return false;

  const enc = new TextEncoder();
  const data = enc.encode(JSON.stringify(payload));

  try {
    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    return await crypto.subtle.verify("HMAC", key, sigBytes, data);
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// Enqueueing (Write path)
// ----------------------------------------------------------------------------

export async function enqueueSigned(
  key: QueueKey,
  itemPayload: Record<string, unknown>,
  userId: string
): Promise<boolean> {
  try {
    const signature = await signPayload(itemPayload, userId);
    if (!signature) return false;

    const queue: any[] = (await getIdb(key)) || [];
    const signedItem = {
      ...itemPayload,
      _owner: userId,
      _sig: signature,
      _queuedAt: Date.now(),
    };

    queue.push(signedItem);
    await setIdb(key, queue);
    return true;
  } catch (err) {
    logger.error("ASTD-OFF-002", "Failed to enqueue offline item", {
      scope: "offlineQueue",
      action: "enqueueSigned",
      metadata: { key, userId },
      error: err,
    });
    return false;
  }
}

// ----------------------------------------------------------------------------
// Legacy migration
// ----------------------------------------------------------------------------
//
// Older builds wrote queue items without `_owner` or `_sig`. When we shipped
// HMAC verification, those items became indistinguishable from "another
// account's item" and were silently deleted. This migration signs any legacy
// unsigned items that are owned by the current user before the sync loop
// runs, so those items are not lost.

export interface LegacyMigrationResult {
  migrated: number;
  skipped: number;
}

export async function migrateLegacyQueue(
  key: QueueKey,
  currentUserId: string
): Promise<LegacyMigrationResult> {
  try {
    const rawQueue: any[] = (await getIdb(key)) || [];
    if (!Array.isArray(rawQueue) || rawQueue.length === 0) {
      return { migrated: 0, skipped: 0 };
    }

    let migrated = 0;
    let skipped = 0;
    const updated: any[] = [];

    for (const item of rawQueue) {
      if (!item || typeof item !== "object") {
        continue;
      }

      if (item._sig && item._owner) {
        // Already signed. Keep as-is.
        updated.push(item);
        continue;
      }

      // Legacy item: try to determine its owner from payload.userId or
      // payload.user_id. If it belongs to the current user, sign it now.
      // Otherwise drop it (it can no longer be safely attributed).
      const candidateOwner =
        typeof item.userId === "string"
          ? item.userId
          : typeof item.user_id === "string"
          ? item.user_id
          : null;

      if (!candidateOwner || candidateOwner !== currentUserId) {
        skipped++;
        continue;
      }

      const payloadForSig = { ...item };
      delete payloadForSig._owner;
      delete payloadForSig._sig;
      delete payloadForSig._queuedAt;
      delete payloadForSig._syncId;
      delete payloadForSig._attempts;

      const signature = await signPayload(payloadForSig, currentUserId);
      if (!signature) {
        skipped++;
        continue;
      }

      updated.push({
        ...payloadForSig,
        _owner: currentUserId,
        _sig: signature,
        _queuedAt: item._queuedAt || Date.now(),
      });
      migrated++;
    }

    if (migrated > 0 || skipped > 0) {
      await setIdb(key, updated);
      logger.info("ASTD-OFF-006", "Legacy offline queue migration completed", {
        scope: "offlineQueue",
        action: "migrateLegacyQueue",
        metadata: { key, currentUserId, migrated, skipped },
      });
    }

    return { migrated, skipped };
  } catch (err) {
    logger.error("ASTD-OFF-007", "Legacy offline queue migration failed", {
      scope: "offlineQueue",
      action: "migrateLegacyQueue",
      metadata: { key, currentUserId },
      error: err,
    });
    return { migrated: 0, skipped: 0 };
  }
}

// ----------------------------------------------------------------------------
// Verification (Read path)
// ----------------------------------------------------------------------------

export interface VerifiedQueueResult {
  items: any[];
  droppedForOwnerMismatch: number;
  droppedForSignatureMismatch: number;
}

export async function getVerifiedQueue(
  key: QueueKey,
  currentUserId: string
): Promise<VerifiedQueueResult> {
  try {
    const rawQueue: any[] = (await getIdb(key)) || [];
    if (!Array.isArray(rawQueue)) {
      return { items: [], droppedForOwnerMismatch: 0, droppedForSignatureMismatch: 0 };
    }

    const verified: any[] = [];
    const rejected: any[] = [];
    let droppedForOwnerMismatch = 0;
    let droppedForSignatureMismatch = 0;

    for (const item of rawQueue) {
      if (!item || typeof item !== "object") continue;

      if (item._owner !== currentUserId) {
        rejected.push(item);
        droppedForOwnerMismatch++;
        continue;
      }

      const { _sig, _owner, _queuedAt, ...payload } = item;
      const isValid = await verifyPayload(payload, _sig, currentUserId);

      if (isValid) {
        verified.push(item);
      } else {
        rejected.push(item);
        droppedForSignatureMismatch++;
        logger.warn("ASTD-OFF-003", "Rejected tampered offline queue item", {
          scope: "offlineQueue",
          action: "getVerifiedQueue",
          metadata: { key, owner: _owner },
        });
      }
    }

    if (rejected.length > 0) {
      await setIdb(
        key,
        rawQueue.filter((i) => !rejected.includes(i))
      );
    }

    return { items: verified, droppedForOwnerMismatch, droppedForSignatureMismatch };
  } catch (err) {
    logger.error("ASTD-OFF-004", "Failed to read and verify offline queue", {
      scope: "offlineQueue",
      action: "getVerifiedQueue",
      metadata: { key },
      error: err,
    });
    return { items: [], droppedForOwnerMismatch: 0, droppedForSignatureMismatch: 0 };
  }
}

export async function removeVerifiedItems(
  key: QueueKey,
  processedIds: string[]
): Promise<void> {
  try {
    const queue: any[] = (await getIdb(key)) || [];
    const idSet = new Set(processedIds);
    const filtered = queue.filter((item) => !idSet.has(item._syncId));
    await setIdb(key, filtered);
  } catch (err) {
    logger.error("ASTD-OFF-005", "Failed to remove processed items from queue", {
      scope: "offlineQueue",
      action: "removeVerifiedItems",
      metadata: { key, count: processedIds.length },
      error: err,
    });
  }
}

export function getQueueKeys(): readonly QueueKey[] {
  return QUEUE_KEYS;
}