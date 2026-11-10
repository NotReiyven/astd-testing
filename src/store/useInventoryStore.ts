// ================================================
// FILE: src/store/useInventoryStore.ts
// ================================================

import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { useToastStore } from "./useToastStore";
import { logger } from "../lib/logger";
import { enqueueSigned } from "../lib/offlineQueue";

export interface InventoryItem {
  id: string;
  user_id: string;
  unit_id: string;
  quantity: number;
  is_pinned: boolean;
  created_at?: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  unit_id: string;
  created_at?: string;
}

interface InventoryState {
  items: InventoryItem[];
  wishlistItems: WishlistItem[];
  viewedItems: InventoryItem[];
  viewedWishlist: WishlistItem[];
  isLoading: boolean;
  viewingUserId: string | null;
  viewingUsername: string | null;
  returnChannel: string | null;
  setViewingUser: (
    userId: string | null,
    username?: string | null,
    returnChannel?: string | null
  ) => void;
  fetchInventory: (userId: string, isViewing?: boolean) => Promise<void>;
  fetchWishlist: (userId: string, isViewing?: boolean) => Promise<void>;
  addOrUpdateUnit: (
    userId: string,
    unitId: string,
    quantityDelta: number
  ) => Promise<void>;
  removeUnit: (userId: string, unitId: string) => Promise<void>;
  restoreItem: (item: InventoryItem) => Promise<void>;
  togglePin: (
    userId: string,
    unitId: string,
    currentPinStatus: boolean
  ) => Promise<void>;
  clearInventory: (userId: string) => Promise<void>;
  clearUnpinned: (userId: string) => Promise<void>;
  toggleWishlist: (userId: string, unitId: string) => Promise<void>;
}

const safeGenerateId = () => {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substring(2);
};

let activeInvFetchId = 0;
let activeViewInvFetchId = 0;
let activeWishlistFetchId = 0;
let activeViewWishlistFetchId = 0;

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  wishlistItems: [],
  viewedItems: [],
  viewedWishlist: [],
  isLoading: false,
  viewingUserId: null,
  viewingUsername: null,
  returnChannel: null,

  setViewingUser: (userId, username = null, returnChannel = null) => {
    const prevUserId = get().viewingUserId;
    if (userId && prevUserId === userId) {
      set((state) => ({
        viewingUsername: username ?? state.viewingUsername,
        returnChannel: returnChannel ?? state.returnChannel,
      }));
      if (get().viewedItems.length === 0) {
        get().fetchInventory(userId, true);
      }
      if (get().viewedWishlist.length === 0) {
        get().fetchWishlist(userId, true);
      }
      return;
    }

    set({
      viewingUserId: userId,
      viewingUsername: username,
      returnChannel,
      viewedItems: [],
      viewedWishlist: [],
    });
    if (userId) {
      get().fetchInventory(userId, true);
      get().fetchWishlist(userId, true);
    }
  },

  fetchInventory: async (userId: string, isViewing = false) => {
    if (!userId) return;

    const currentRequestId = isViewing
      ? ++activeViewInvFetchId
      : ++activeInvFetchId;

    set({ isLoading: true });
    const { data, error } = await supabase
      .from("user_inventory")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (isViewing && currentRequestId !== activeViewInvFetchId) return;
    if (!isViewing && currentRequestId !== activeInvFetchId) return;

    if (!error && data) {
      if (isViewing) {
        set({ viewedItems: data, isLoading: false });
      } else {
        set({ items: data, isLoading: false });
        if (data.length > 0 && typeof window !== "undefined") {
          window.dispatchEvent(new Event("academy-vault"));
        }
      }
    } else {
      set({ isLoading: false });
      if (error) {
        logger.error("ASTD-INV-001", "Failed to fetch user inventory", {
          scope: "useInventoryStore",
          action: "fetchInventory",
          metadata: { userId, isViewing },
          error,
        });
      }
    }
  },

  fetchWishlist: async (userId: string, isViewing = false) => {
    if (!userId) return;

    const currentRequestId = isViewing
      ? ++activeViewWishlistFetchId
      : ++activeWishlistFetchId;

    const { data, error } = await supabase
      .from("user_wishlist")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (isViewing && currentRequestId !== activeViewWishlistFetchId) return;
    if (!isViewing && currentRequestId !== activeWishlistFetchId) return;

    if (!error && data) {
      if (isViewing) set({ viewedWishlist: data });
      else {
        set({ wishlistItems: data });
        if (data.length > 0 && typeof window !== "undefined") {
          window.dispatchEvent(new Event("academy-wishlist"));
        }
      }
    } else if (error) {
      logger.error("ASTD-INV-002", "Failed to fetch user wishlist", {
        scope: "useInventoryStore",
        action: "fetchWishlist",
        metadata: { userId, isViewing },
        error,
      });
    }
  },

  addOrUpdateUnit: async (
    userId: string,
    unitId: string,
    quantityDelta: number
  ) => {
    if (get().viewingUserId) return;
    const previousItems = get().items;
    const existingItem = previousItems.find((i) => i.unit_id === unitId);

    const currentQty = existingItem ? existingItem.quantity : 0;
    const newQuantity = currentQty + quantityDelta;

    if (newQuantity <= 0) {
      if (existingItem) await get().removeUnit(userId, unitId);
      return;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("academy-vault"));
    }

    try {
      if (existingItem) {
        set({
          items: previousItems.map((i) =>
            i.unit_id === unitId ? { ...i, quantity: newQuantity } : i
          ),
        });

        if (!navigator.onLine) {
          const ok = await enqueueSigned(
            "astd_offline_inventory",
            { action: "UPSERT", userId, unitId, quantity: newQuantity },
            userId
          );
          if (ok) {
            useToastStore
              .getState()
              .addToast("Offline. Vault updated locally.", "info");
          } else {
            useToastStore
              .getState()
              .addToast(
                "Offline. Could not save Vault change to device storage.",
                "error"
              );
          }
          return;
        }

        const { error } = await supabase
          .from("user_inventory")
          .update({ quantity: newQuantity })
          .eq("user_id", userId)
          .eq("unit_id", unitId);
        if (error) throw error;
      } else {
        const newItemForDb = {
          user_id: userId,
          unit_id: unitId,
          quantity: newQuantity,
          is_pinned: false,
        };
        const optimisticItem: InventoryItem = {
          id: safeGenerateId(),
          created_at: new Date().toISOString(),
          ...newItemForDb,
        };
        set({ items: [optimisticItem, ...previousItems] });

        if (!navigator.onLine) {
          const ok = await enqueueSigned(
            "astd_offline_inventory",
            { action: "UPSERT", userId, unitId, quantity: newQuantity },
            userId
          );
          if (ok) {
            useToastStore
              .getState()
              .addToast("Offline. Vault updated locally.", "info");
          } else {
            useToastStore
              .getState()
              .addToast(
                "Offline. Could not save Vault change to device storage.",
                "error"
              );
          }
          return;
        }

        const { error } = await supabase
          .from("user_inventory")
          .insert(newItemForDb);
        if (error) throw error;
      }
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  removeUnit: async (userId: string, unitId: string) => {
    if (get().viewingUserId) return;
    const previousItems = get().items;
    set({ items: previousItems.filter((i) => i.unit_id !== unitId) });

    try {
      if (!navigator.onLine) {
        const ok = await enqueueSigned(
          "astd_offline_inventory",
          { action: "REMOVE", userId, unitId },
          userId
        );
        if (ok) {
          useToastStore
            .getState()
            .addToast("Offline. Vault updated locally.", "info");
        } else {
          useToastStore
            .getState()
            .addToast(
              "Offline. Could not save Vault change to device storage.",
              "error"
            );
        }
        return;
      }

      const { error } = await supabase
        .from("user_inventory")
        .delete()
        .eq("user_id", userId)
        .eq("unit_id", unitId);
      if (error) throw error;
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  restoreItem: async (item: InventoryItem) => {
    if (get().viewingUserId) return;
    const previousItems = get().items;
    set({ items: [item, ...previousItems] });

    try {
      const { id, ...itemForDb } = item;

      if (!navigator.onLine) {
        const ok = await enqueueSigned(
          "astd_offline_inventory",
          { action: "RESTORE", item: itemForDb },
          itemForDb.user_id
        );
        if (ok) {
          useToastStore
            .getState()
            .addToast("Offline. Item restored locally.", "info");
        } else {
          useToastStore
            .getState()
            .addToast(
              "Offline. Could not save Vault change to device storage.",
              "error"
            );
        }
        return;
      }

      const { error } = await supabase.from("user_inventory").insert(itemForDb);
      if (error) throw error;
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  togglePin: async (
    userId: string,
    unitId: string,
    currentPinStatus: boolean
  ) => {
    if (get().viewingUserId) return;
    const previousItems = get().items;
    const nextStatus = !currentPinStatus;
    set({
      items: previousItems.map((i) =>
        i.unit_id === unitId ? { ...i, is_pinned: nextStatus } : i
      ),
    });

    try {
      if (!navigator.onLine) {
        const ok = await enqueueSigned(
          "astd_offline_inventory",
          { action: "TOGGLE_PIN", userId, unitId, status: nextStatus },
          userId
        );
        if (ok) {
          useToastStore
            .getState()
            .addToast("Offline. Pin status updated locally.", "info");
        } else {
          useToastStore
            .getState()
            .addToast(
              "Offline. Could not save Vault change to device storage.",
              "error"
            );
        }
        return;
      }

      const { error } = await supabase
        .from("user_inventory")
        .update({ is_pinned: nextStatus })
        .eq("user_id", userId)
        .eq("unit_id", unitId);
      if (error) throw error;
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  clearInventory: async (userId: string) => {
    if (get().viewingUserId) return;
    const previousItems = get().items;
    set({ items: [] });

    try {
      if (!navigator.onLine) {
        const ok = await enqueueSigned(
          "astd_offline_inventory",
          { action: "CLEAR_ALL", userId },
          userId
        );
        if (ok) {
          useToastStore
            .getState()
            .addToast("Offline. Vault cleared locally.", "info");
        } else {
          useToastStore
            .getState()
            .addToast(
              "Offline. Could not save Vault change to device storage.",
              "error"
            );
        }
        return;
      }

      const { error } = await supabase
        .from("user_inventory")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  clearUnpinned: async (userId: string) => {
    if (get().viewingUserId) return;
    const previousItems = get().items;
    set({ items: previousItems.filter((i) => i.is_pinned) });

    try {
      if (!navigator.onLine) {
        const ok = await enqueueSigned(
          "astd_offline_inventory",
          { action: "CLEAR_UNPINNED", userId },
          userId
        );
        if (ok) {
          useToastStore
            .getState()
            .addToast("Offline. Unpinned units cleared locally.", "info");
        } else {
          useToastStore
            .getState()
            .addToast(
              "Offline. Could not save Vault change to device storage.",
              "error"
            );
        }
        return;
      }

      const { error } = await supabase
        .from("user_inventory")
        .delete()
        .eq("user_id", userId)
        .eq("is_pinned", false);
      if (error) throw error;
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  toggleWishlist: async (userId: string, unitId: string) => {
    if (get().viewingUserId) return;

    const previousItems = get().wishlistItems;
    const existing = previousItems.find((i) => i.unit_id === unitId);
    if (!existing && typeof window !== "undefined") {
      window.dispatchEvent(new Event("academy-wishlist"));
    }

    try {
      if (!navigator.onLine) {
        const ok = await enqueueSigned(
          "astd_offline_wishlist",
          { action: existing ? "REMOVE" : "ADD", userId, unitId },
          userId
        );

        if (existing) {
          set({
            wishlistItems: previousItems.filter((i) => i.unit_id !== unitId),
          });
        } else {
          const newItem = { user_id: userId, unit_id: unitId };
          const optimisticItem: WishlistItem = {
            id: safeGenerateId(),
            created_at: new Date().toISOString(),
            ...newItem,
          };
          set({ wishlistItems: [optimisticItem, ...previousItems] });
        }

        if (ok) {
          useToastStore
            .getState()
            .addToast("Offline. Wishlist updated locally.", "info");
        } else {
          useToastStore
            .getState()
            .addToast(
              "Offline. Could not save Wishlist change to device storage.",
              "error"
            );
        }
        return;
      }

      if (existing) {
        set({
          wishlistItems: previousItems.filter((i) => i.unit_id !== unitId),
        });
        const { error } = await supabase
          .from("user_wishlist")
          .delete()
          .eq("user_id", userId)
          .eq("unit_id", unitId);
        if (error) throw error;
      } else {
        const newItem = { user_id: userId, unit_id: unitId };
        const optimisticItem: WishlistItem = {
          id: safeGenerateId(),
          created_at: new Date().toISOString(),
          ...newItem,
        };
        set({ wishlistItems: [optimisticItem, ...previousItems] });

        const { error } = await supabase
          .from("user_wishlist")
          .upsert(newItem, { onConflict: "user_id,unit_id" });
        if (error) throw error;
      }
    } catch (error) {
      set({ wishlistItems: previousItems });
      throw error;
    }
  },
}));