import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  user_id: string;
  unit_id: string;
  quantity: number;
  is_pinned: boolean;
}

interface InventoryState {
  items: InventoryItem[];
  isLoading: boolean;
  fetchInventory: (userId: string) => Promise<void>;
  addOrUpdateUnit: (userId: string, unitId: string, quantityDelta: number) => Promise<void>;
  removeUnit: (userId: string, unitId: string) => Promise<void>;
  togglePin: (userId: string, unitId: string, currentPinStatus: boolean) => Promise<void>;
  clearInventory: () => void;
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
    }
  },

  addOrUpdateUnit: async (userId: string, unitId: string, quantityDelta: number) => {
    const { items } = get();
    const existingItem = items.find(i => i.unit_id === unitId);

    if (existingItem) {
      const newQuantity = Math.max(1, existingItem.quantity + quantityDelta);
      // Optimistic UI update
      set({ items: items.map(i => i.unit_id === unitId ? { ...i, quantity: newQuantity } : i) });
      
      await supabase
        .from('user_inventory')
        .update({ quantity: newQuantity })
        .eq('user_id', userId)
        .eq('unit_id', unitId);
    } else {
      const newItem = { user_id: userId, unit_id: unitId, quantity: Math.max(1, quantityDelta), is_pinned: false };
      // Optimistic UI update (using a temporary ID until next fetch)
      set({ items: [{ id: 'temp', ...newItem }, ...items] });

      await supabase
        .from('user_inventory')
        .insert(newItem);
    }
  },

  removeUnit: async (userId: string, unitId: string) => {
    // Optimistic UI update
    set({ items: get().items.filter(i => i.unit_id !== unitId) });

    await supabase
      .from('user_inventory')
      .delete()
      .eq('user_id', userId)
      .eq('unit_id', unitId);
  },

  togglePin: async (userId: string, unitId: string, currentPinStatus: boolean) => {
    // Optimistic UI update
    set({ items: get().items.map(i => i.unit_id === unitId ? { ...i, is_pinned: !currentPinStatus } : i) });

    await supabase
      .from('user_inventory')
      .update({ is_pinned: !currentPinStatus })
      .eq('user_id', userId)
      .eq('unit_id', unitId);
  },

  clearInventory: () => set({ items: [] })
}));