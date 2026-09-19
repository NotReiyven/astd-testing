// FILE: src/store/useInventoryStore.ts

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
  setViewingUser: (userId: string | null, username?: string | null) => void;
  fetchInventory: (userId: string, isViewing?: boolean) => Promise<void>;
  fetchWishlist: (userId: string, isViewing?: boolean) => Promise<void>;
  addOrUpdateUnit: (userId: string, unitId: string, quantityDelta: number) => Promise<void>;
  removeUnit: (userId: string, unitId: string) => Promise<void>;
  restoreItem: (item: InventoryItem) => Promise<void>;
  togglePin: (userId: string, unitId: string, currentPinStatus: boolean) => Promise<void>;
  clearInventory: (userId: string) => Promise<void>;
  clearUnpinned: (userId: string) => Promise<void>;
  toggleWishlist: (userId: string, unitId: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  wishlistItems: [],
  viewedItems: [],
  viewedWishlist: [],
  isLoading: false,
  viewingUserId: null,
  viewingUsername: null,

  setViewingUser: (userId, username = null) => {
    set({ viewingUserId: userId, viewingUsername: username });
    if (userId) {
      get().fetchInventory(userId, true);
      get().fetchWishlist(userId, true);
    } else {
      set({ viewedItems: [], viewedWishlist: [] });
    }
  },

  fetchInventory: async (userId: string, isViewing = false) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('user_inventory')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      if (isViewing) set({ viewedItems: data, isLoading: false });
      else set({ items: data, isLoading: false });
    } else {
      set({ isLoading: false });
      if (error) console.error("Failed to fetch inventory:", error.message);
    }
  },

  fetchWishlist: async (userId: string, isViewing = false) => {
    const { data, error } = await supabase
      .from('user_wishlist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      if (isViewing) set({ viewedWishlist: data });
      else set({ wishlistItems: data });
    } else if (error) {
      console.error("Failed to fetch wishlist:", error.message);
    }
  },

  addOrUpdateUnit: async (userId: string, unitId: string, quantityDelta: number) => {
    const previousItems = get().items;
    const existingItem = previousItems.find(i => i.unit_id === unitId);
    
    const currentQty = existingItem ? existingItem.quantity : 0;
    const newQuantity = currentQty + quantityDelta;

    if (newQuantity <= 0) {
      if (existingItem) await get().removeUnit(userId, unitId);
      return;
    }

    try {
      if (existingItem) {
        set({ items: previousItems.map(i => i.unit_id === unitId ? { ...i, quantity: newQuantity } : i) });
        const { error } = await supabase
          .from('user_inventory')
          .update({ quantity: newQuantity })
          .eq('user_id', userId)
          .eq('unit_id', unitId);
        if (error) throw error;
      } else {
        const newItemForDb = { user_id: userId, unit_id: unitId, quantity: newQuantity, is_pinned: false };
        const optimisticItem: InventoryItem = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...newItemForDb };
        set({ items: [optimisticItem, ...previousItems] });
        const { error } = await supabase.from('user_inventory').insert(newItemForDb);
        if (error) throw error;
      }
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  removeUnit: async (userId: string, unitId: string) => {
    const previousItems = get().items;
    set({ items: previousItems.filter(i => i.unit_id !== unitId) });
    try {
      const { error } = await supabase.from('user_inventory').delete().eq('user_id', userId).eq('unit_id', unitId);
      if (error) throw error;
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  restoreItem: async (item: InventoryItem) => {
    const previousItems = get().items;
    set({ items: [item, ...previousItems] });
    try {
      const { id, ...itemForDb } = item;
      const { error } = await supabase.from('user_inventory').insert(itemForDb);
      if (error) throw error;
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  togglePin: async (userId: string, unitId: string, currentPinStatus: boolean) => {
    const previousItems = get().items;
    const nextStatus = !currentPinStatus;
    set({ items: previousItems.map(i => i.unit_id === unitId ? { ...i, is_pinned: nextStatus } : i) });
    try {
      const { error } = await supabase.from('user_inventory').update({ is_pinned: nextStatus }).eq('user_id', userId).eq('unit_id', unitId);
      if (error) throw error;
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  clearInventory: async (userId: string) => {
    const previousItems = get().items;
    set({ items: [] });
    try {
      const { error } = await supabase.from('user_inventory').delete().eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  clearUnpinned: async (userId: string) => {
    const previousItems = get().items;
    set({ items: previousItems.filter(i => i.is_pinned) });
    try {
      const { error } = await supabase.from('user_inventory').delete().eq('user_id', userId).eq('is_pinned', false);
      if (error) throw error;
    } catch (error) {
      set({ items: previousItems });
      throw error;
    }
  },

  toggleWishlist: async (userId: string, unitId: string) => {
    const previousItems = get().wishlistItems;
    const existing = previousItems.find(i => i.unit_id === unitId);

    try {
      if (existing) {
        set({ wishlistItems: previousItems.filter(i => i.unit_id !== unitId) });
        const { error } = await supabase.from('user_wishlist').delete().eq('user_id', userId).eq('unit_id', unitId);
        if (error) throw error;
      } else {
        const newItem = { user_id: userId, unit_id: unitId };
        const optimisticItem: WishlistItem = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...newItem };
        set({ wishlistItems: [optimisticItem, ...previousItems] });
        const { error } = await supabase.from('user_wishlist').insert(newItem);
        if (error) throw error;
      }
    } catch (error) {
      set({ wishlistItems: previousItems });
      throw error;
    }
  }
}));