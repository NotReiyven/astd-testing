import { useEffect } from "react";
import { get, set } from "idb-keyval";
import { supabase } from "../lib/supabase";
import { useToastStore } from "../store/useToastStore";

const SYNC_DELAY_MS = 200;
const MAX_BATCH_SIZE = 50;
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function useNetworkSync() {
  useEffect(() => {
    const handleOffline = () => {
      useToastStore
        .getState()
        .addToast(
          "Network connection lost. Operating in offline mode.",
          "warning"
        );
    };

    const handleOnline = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      if (!currentUserId) return; // Prevent unauthorized blind syncs

      let totalSynced = 0;

      const processQueue = async (
        storageKey: string,
        processor: (item: any) => Promise<void>
      ) => {
        const queue: any[] = (await get(storageKey)) || [];
        if (queue.length === 0) return;

        // Cap batch size to prevent DDoS'ing our own API endpoint
        const batch = queue.slice(0, MAX_BATCH_SIZE);
        const remaining = queue.slice(MAX_BATCH_SIZE);

        for (const item of batch) {
          // Strict IDOR Protection: Ignore stored payloads if they belong to a different user
          if (item.userId && item.userId !== currentUserId) continue;
          if (item.user_id && item.user_id !== currentUserId) continue;
          if (item.userProfile?.id && item.userProfile.id !== currentUserId)
            continue;

          try {
            await processor(item);
            totalSynced++;
            await sleep(SYNC_DELAY_MS); // Synthetic rate limiting
          } catch (e) {
            console.error(`Sync failure for ${storageKey}:`, e);
          }
        }

        await set(storageKey, remaining);
      };

      useToastStore
        .getState()
        .addToast("Connection restored. Syncing offline data...", "info");

      // 1. Profile Sync
      await processQueue("astd_offline_profile", async (op) => {
        await supabase.from("profiles").update(op.updates).eq("id", op.userId);
      });

      // 2. Wishlist Sync
      await processQueue("astd_offline_wishlist", async (op) => {
        if (op.action === "ADD") {
          await supabase
            .from("user_wishlist")
            .upsert(
              { user_id: op.userId, unit_id: op.unitId },
              { onConflict: "user_id, unit_id" }
            );
        } else if (op.action === "REMOVE") {
          await supabase
            .from("user_wishlist")
            .delete()
            .eq("user_id", op.userId)
            .eq("unit_id", op.unitId);
        }
      });

      // 3. Inventory Sync
      await processQueue("astd_offline_inventory", async (op) => {
        if (op.action === "UPSERT") {
          await supabase
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
        } else if (op.action === "REMOVE") {
          await supabase
            .from("user_inventory")
            .delete()
            .eq("user_id", op.userId)
            .eq("unit_id", op.unitId);
        } else if (op.action === "RESTORE") {
          if (op.item.user_id === currentUserId)
            await supabase.from("user_inventory").insert(op.item);
        } else if (op.action === "TOGGLE_PIN") {
          await supabase
            .from("user_inventory")
            .update({ is_pinned: op.status })
            .eq("user_id", op.userId)
            .eq("unit_id", op.unitId);
        } else if (op.action === "CLEAR_ALL") {
          await supabase
            .from("user_inventory")
            .delete()
            .eq("user_id", op.userId);
        } else if (op.action === "CLEAR_UNPINNED") {
          await supabase
            .from("user_inventory")
            .delete()
            .eq("user_id", op.userId)
            .eq("is_pinned", false);
        }
      });

      // 4. Comments Sync
      await processQueue("astd_offline_comments", async (c) => {
        await supabase.from("ad_comments").insert({
          ad_id: c.adId,
          user_id: c.userProfile.id,
          content: c.content,
          parent_id: c.parentId,
        });
      });

      // 5. Ads Sync
      await processQueue("astd_offline_ads", async (payload) => {
        await supabase.from("trading_ads").insert(payload);
      });

      if (totalSynced > 0) {
        useToastStore
          .getState()
          .addToast(`All offline actions synced to the database.`, "success");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
}
