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
  // Derive a stable, session-specific key from the user ID.
  // In a perfect world, we'd use the JWT `session_id` claim, but the user ID
  // is sufficient to isolate queues per user on a shared device.
  try {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(`astd-offline-queue-${userId}`),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    return keyMaterial;
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

async function signPayload(payload: any, userId: string): Promise<string> {
  const key = await getHmacKey(userId);
  if (!key) return "";
  const enc = new TextEncoder();
  const data = enc.encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPayload(payload: any, signature: string, userId: string): Promise<boolean> {
  const key = await getHmacKey(userId);
  if (!key) return false;
  const enc = new TextEncoder();
  const data = enc.encode(JSON.stringify(payload));
  
  // Convert hex string back to Uint8Array
  const sigBytes = new Uint8Array(signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  
  try {
    return await crypto.subtle.verify("HMAC", key, sigBytes, data);
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// Queue Enqueueing (Write path)
// ----------------------------------------------------------------------------

export async function enqueueSigned(
  key: QueueKey,
  itemPayload: Record<string, any>,
  userId: string
): Promise<boolean> {
  try {
    const signature = await signPayload(itemPayload, userId);
    if (!signature) return false;

    const queue: any[] = (await getIdb(key)) || [];
    
    // Ensure the item is tagged with the owning user
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
// Queue Processing (Read path)
// ----------------------------------------------------------------------------

export async function getVerifiedQueue(
  key: QueueKey,
  currentUserId: string
): Promise<any[]> {
  try {
    const rawQueue: any[] = (await getIdb(key)) || [];
    if (!Array.isArray(rawQueue)) return [];

    const verified: any[] = [];
    const rejected: any[] = [];
    let queueMutated = false;

    for (const item of rawQueue) {
      if (!item || typeof item !== "object") continue;

      // 1. Immediately reject items belonging to a different user
      if (item._owner !== currentUserId) {
        queueMutated = true;
        continue;
      }

      // 2. Verify HMAC signature
      const { _sig, _owner, _queuedAt, ...payload } = item;
      const isValid = await verifyPayload(payload, _sig, currentUserId);

      if (isValid) {
        // Preserve sync metadata for the network layer
        verified.push({
          ...item,
          _sig: undefined,
          _owner: undefined,
        });
      } else {
        rejected.push(item);
        queueMutated = true;
        logger.warn("ASTD-OFF-003", "Rejected tampered offline queue item", {
          scope: "offlineQueue",
          action: "getVerifiedQueue",
          metadata: { key, owner: _owner },
        });
      }
    }

    // If we dropped items, rewrite the queue in IndexedDB immediately
    if (queueMutated && rejected.length > 0) {
      await setIdb(key, rawQueue.filter((i) => !rejected.includes(i)));
    }

    return verified;
  } catch (err) {
    logger.error("ASTD-OFF-004", "Failed to read and verify offline queue", {
      scope: "offlineQueue",
      action: "getVerifiedQueue",
      metadata: { key },
      error: err,
    });
    return [];
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
    
    if (filtered.length === 0) {
      await setIdb(key, []);
    } else {
      await setIdb(key, filtered);
    }
  } catch (err) {
    logger.error("ASTD-OFF-005", "Failed to remove processed items from queue", {
      scope: "offlineQueue",
      action: "removeVerifiedItems",
      metadata: { key, count: processedIds.length },
      error: err,
    });
  }
}