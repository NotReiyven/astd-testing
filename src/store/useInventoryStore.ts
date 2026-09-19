import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  user_id: string;
  unit_id: string;
  quantity: number;
  is_pinned: boolean;
  created_at?: string; // Added to support "Recently Added" sorting in UI
}

interface InventoryState {
  items: InventoryItem[];
  isLoading: boolean;
  fetchInventory: (userId: string) => Promise<void>;
  addOrUpdateUnit: (userId: string, unitId: string, quantityDelta: number) => Promise<void>;
  removeUnit: (userId: string, unitId: string) => Promise<void>;
  restoreItem: (item: InventoryItem) => Promise<void>;
  togglePin: (userId: string, unitId: string, currentPinStatus: boolean) => Promise<void>;
  clearInventory: (userId: string) => Promise<void>;
  clearUnpinned: (userId: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchInventory: async (userId: string) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('user_inventory')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ items: data, isLoading: false });
    } else {
      set({ isLoading: false });
      if (error) console.error("Failed to fetch inventory:", error.message);
    }
  },

  addOrUpdateUnit: async (userId: string, unitId: string, quantityDelta: number) => {
    const previousItems = get().items;
    const existingItem = previousItems.find(i => i.unit_id === unitId);
    
    // Determine the target quantity. If it hits 0 or below, route to removeUnit instead.
    const currentQty = existingItem ? existingItem.quantity : 0;
    const newQuantity = currentQty + quantityDelta;

    if (newQuantity <= 0) {
      if (existingItem) await get().removeUnit(userId, unitId);
      return;
    }

    try {
      if (existingItem) {
        // Optimistic update for existing item
        set({ items: previousItems.map(i => i.unit_id === unitId ? { ...i, quantity: newQuantity } : i) });
        
        const { error } = await supabase
          .from('user_inventory')
          .update({ quantity: newQuantity })
          .eq('user_id', userId)
          .eq('unit_id', unitId);
          
        if (error) throw error;
      } else {
        // Optimistic update for new item using a stable client-side ID
        const newItemForDb = { 
          user_id: userId, 
          unit_id: unitId, 
          quantity: newQuantity, 
          is_pinned: false 
        };
        
        const optimisticItem: InventoryItem = { 
          id: crypto.randomUUID(), 
          created_at: new Date().toISOString(),
          ...newItemForDb 
        };
        
        set({ items: [optimisticItem, ...previousItems] });

        const { error } = await supabase
          .from('user_inventory')
          .insert(newItemForDb);
          
        if (error) throw error;
      }
    } catch (error) {
      // Rollback on failure
      set({ items: previousItems });
      throw error;
    }
  },

  removeUnit: async (userId: string, unitId: string) => {
    const previousItems = get().items;
    
    // Optimistic UI update
    set({ items: previousItems.filter(i => i.unit_id !== unitId) });

    try {
      const { error } = await supabase
        .from('user_inventory')
        .delete()
        .eq('user_id', userId)
        .eq('unit_id', unitId);
        
      if (error) throw error;
    } catch (error) {
      // Rollback on failure
      set({ items: previousItems });
      throw error;
    }
  },

  // Dedicated method to flawlessly restore an item from a UI "Undo" action
  restoreItem: async (item: InventoryItem) => {
    const previousItems = get().items;
    
    // Optimistic UI update
    set({ items: [item, ...previousItems] });

    try {
      // Strip the local ID if it was a temp uuid so Supabase handles the PK naturally
      const { id, ...itemForDb } = item; 
      
      const { error } = await supabase
        .from('user_inventory')
        .insert(itemForDb);
        
      if (error) throw error;
    } catch (error) {
      // Rollback on failure
      set({ items: previousItems });
      throw error;
    }
  },

  togglePin: async (userId: string, unitId: string, currentPinStatus: boolean) => {
    const previousItems = get().items;
    const nextStatus = !currentPinStatus;

    // Optimistic UI update
    set({ items: previousItems.map(i => i.unit_id === unitId ? { ...i, is_pinned: nextStatus } : i) });

    try {
      const { error } = await supabase
        .from('user_inventory')
        .update({ is_pinned: nextStatus })
        .eq('user_id', userId)
        .eq('unit_id', unitId);
        
      if (error) throw error;
    } catch (error) {
      // Rollback on failure
      set({ items: previousItems });
      throw error;
    }
  },

  clearInventory: async (userId: string) => {
    const previousItems = get().items;
    
    // Optimistic UI update
    set({ items: [] });

    try {
      const { error } = await supabase
        .from('user_inventory')
        .delete()
        .eq('user_id', userId);
        
      if (error) throw error;
    } catch (error) {
      // Rollback on failure
      set({ items: previousItems });
      throw error;
    }
  },

  clearUnpinned: async (userId: string) => {
    const previousItems = get().items;
    
    // Optimistic UI update (keep only pinned items)
    set({ items: previousItems.filter(i => i.is_pinned) });

    try {
      const { error } = await supabase
        .from('user_inventory')
        .delete()
        .eq('user_id', userId)
        .eq('is_pinned', false);
        
      if (error) throw error;
    } catch (error) {
      // Rollback on failure
      set({ items: previousItems });
      throw error;
    }
  }
}));