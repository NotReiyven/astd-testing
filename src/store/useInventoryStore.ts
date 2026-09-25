import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { get as getIdb, set as setIdb } from "idb-keyval";
import { useToastStore } from "./useToastStore";

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

let activeFetchId = 0;
let activeViewFetchId = 0;

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

    const currentRequestId = isViewing ? ++activeViewFetchId : ++activeFetchId;

    set({ isLoading: true });
    const { data, error } = await supabase
      .from("user_inventory")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (isViewing && currentRequestId !== activeViewFetchId) return;
    if (!isViewing && currentRequestId !== activeFetchId) return;

    if (!error && data) {
      if (isViewing) {
        set({ viewedItems: data, isLoading: false });
      } else {
        set({ items: data, isLoading: false });
      }
    } else {
      set({ isLoading: false });
      if (error) console.error("Failed to fetch inventory:", error.message);
    }
  },

  fetchWishlist: async (userId: string, isViewing = false) => {
    if (!userId) return;

    const currentRequestId = isViewing ? activeViewFetchId : activeFetchId;

    const { data, error } = await supabase
      .from("user_wishlist")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (isViewing && currentRequestId !== activeViewFetchId) return;
    if (!isViewing && currentRequestId !== activeFetchId) return;

    if (!error && data) {
      if (isViewing) set({ viewedWishlist: data });
      else set({ wishlistItems: data });
    } else if (error) {
      console.error("Failed to fetch wishlist:", error.message);
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

    try {
      if (existingItem) {
        set({
          items: previousItems.map((i) =>
            i.unit_id === unitId ? { ...i, quantity: newQuantity } : i
          ),
        });

        if (!navigator.onLine) {
          const queue = (await getIdb("astd_offline_inventory")) || [];
          queue.push({
            action: "UPSERT",
            userId,
            unitId,
            quantity: newQuantity,
          });
          await setIdb("astd_offline_inventory", queue);
          useToastStore
            .getState()
            .addToast("Offline. Vault updated locally.", "info");
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
          const queue = (await getIdb("astd_offline_inventory")) || [];
          queue.push({
            action: "UPSERT",
            userId,
            unitId,
            quantity: newQuantity,
          });
          await setIdb("astd_offline_inventory", queue);
          useToastStore
            .getState()
            .addToast("Offline. Vault updated locally.", "info");
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
        const queue = (await getIdb("astd_offline_inventory")) || [];
        queue.push({ action: "REMOVE", userId, unitId });
        await setIdb("astd_offline_inventory", queue);
        useToastStore
          .getState()
          .addToast("Offline. Vault updated locally.", "info");
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
        const queue = (await getIdb("astd_offline_inventory")) || [];
        queue.push({ action: "RESTORE", item: itemForDb });
        await setIdb("astd_offline_inventory", queue);
        useToastStore
          .getState()
          .addToast("Offline. Item restored locally.", "info");
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
        const queue = (await getIdb("astd_offline_inventory")) || [];
        queue.push({
          action: "TOGGLE_PIN",
          userId,
          unitId,
          status: nextStatus,
        });
        await setIdb("astd_offline_inventory", queue);
        useToastStore
          .getState()
          .addToast("Offline. Pin status updated locally.", "info");
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
        const queue = (await getIdb("astd_offline_inventory")) || [];
        queue.push({ action: "CLEAR_ALL", userId });
        await setIdb("astd_offline_inventory", queue);
        useToastStore
          .getState()
          .addToast("Offline. Vault cleared locally.", "info");
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
        const queue = (await getIdb("astd_offline_inventory")) || [];
        queue.push({ action: "CLEAR_UNPINNED", userId });
        await setIdb("astd_offline_inventory", queue);
        useToastStore
          .getState()
          .addToast("Offline. Unpinned units cleared locally.", "info");
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

    try {
      if (!navigator.onLine) {
        const queue = (await getIdb("astd_offline_wishlist")) || [];
        queue.push({ action: existing ? "REMOVE" : "ADD", userId, unitId });
        await setIdb("astd_offline_wishlist", queue);

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

        useToastStore
          .getState()
          .addToast("Offline. Wishlist updated locally.", "info");
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
          .upsert(newItem, { onConflict: "user_id, unit_id" });
        if (error) throw error;
      }
    } catch (error) {
      set({ wishlistItems: previousItems });
      throw error;
    }
  },
}));
