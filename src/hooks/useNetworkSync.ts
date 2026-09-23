// ================================================
// FILE: src/hooks/useNetworkSync.ts
// ================================================
import { useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../store/useToastStore';

export function useNetworkSync() {
  useEffect(() => {
    const handleOnline = async () => {
      const offlineAds = await get('astd_offline_ads') || [];
      const offlineComments = await get('astd_offline_comments') || [];
      const offlineInventory = await get('astd_offline_inventory') || [];
      const offlineWishlist = await get('astd_offline_wishlist') || [];
      const offlineProfile = await get('astd_offline_profile') || [];

      const totalItems = offlineAds.length + offlineComments.length + offlineInventory.length + offlineWishlist.length + offlineProfile.length;

      if (totalItems > 0) {
        useToastStore.getState().addToast("Connection restored. Syncing offline data...", "info");
      }

      // Flush Ads Queue
      if (offlineAds.length > 0) {
        for (const payload of offlineAds) {
           await supabase.from('trading_ads').insert(payload);
        }
        await set('astd_offline_ads', []);
      }

      // Flush Comments Queue
      if (offlineComments.length > 0) {
        for (const c of offlineComments) {
           await supabase.from('ad_comments').insert({
             ad_id: c.adId, user_id: c.userProfile.id, content: c.content, parent_id: c.parentId
           });
        }
        await set('astd_offline_comments', []);
      }

      // Flush Inventory Queue
      if (offlineInventory.length > 0) {
        for (const op of offlineInventory) {
          if (op.action === 'UPSERT') {
            await supabase.from('user_inventory').upsert(
              { user_id: op.userId, unit_id: op.unitId, quantity: op.quantity, is_pinned: false },
              { onConflict: 'user_id, unit_id' }
            );
          } else if (op.action === 'REMOVE') {
            await supabase.from('user_inventory').delete().eq('user_id', op.userId).eq('unit_id', op.unitId);
          } else if (op.action === 'RESTORE') {
            await supabase.from('user_inventory').insert(op.item);
          } else if (op.action === 'TOGGLE_PIN') {
            await supabase.from('user_inventory').update({ is_pinned: op.status }).eq('user_id', op.userId).eq('unit_id', op.unitId);
          } else if (op.action === 'CLEAR_ALL') {
            await supabase.from('user_inventory').delete().eq('user_id', op.userId);
          } else if (op.action === 'CLEAR_UNPINNED') {
            await supabase.from('user_inventory').delete().eq('user_id', op.userId).eq('is_pinned', false);
          }
        }
        await set('astd_offline_inventory', []);
      }

      // Flush Wishlist Queue
      if (offlineWishlist.length > 0) {
        for (const op of offlineWishlist) {
          if (op.action === 'ADD') {
            await supabase.from('user_wishlist').upsert({ user_id: op.userId, unit_id: op.unitId }, { onConflict: 'user_id, unit_id' });
          } else if (op.action === 'REMOVE') {
            await supabase.from('user_wishlist').delete().eq('user_id', op.userId).eq('unit_id', op.unitId);
          }
        }
        await set('astd_offline_wishlist', []);
      }

      // Flush Profile Edit Queue
      if (offlineProfile.length > 0) {
        for (const op of offlineProfile) {
          await supabase.from('profiles').update(op.updates).eq('id', op.userId);
        }
        await set('astd_offline_profile', []);
      }

      if (totalItems > 0) {
        useToastStore.getState().addToast(`All offline actions synced to the database.`, "success");
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
}