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

      if (offlineAds.length > 0 || offlineComments.length > 0) {
        useToastStore.getState().addToast("Connection restored. Syncing offline data...", "info");
      }

      // Flush Ads Queue
      if (offlineAds.length > 0) {
        let successCount = 0;
        for (const payload of offlineAds) {
           const { error } = await supabase.from('trading_ads').insert(payload);
           if (!error) successCount++;
        }
        await set('astd_offline_ads', []);
        if (successCount > 0) {
          useToastStore.getState().addToast(`Synced ${successCount} queued trading ads.`, "success");
        }
      }

      // Flush Comments Queue
      if (offlineComments.length > 0) {
        let successCount = 0;
        for (const c of offlineComments) {
           const { error } = await supabase.from('ad_comments').insert({
             ad_id: c.adId, user_id: c.userProfile.id, content: c.content, parent_id: c.parentId
           });
           if (!error) successCount++;
        }
        await set('astd_offline_comments', []);
        if (successCount > 0) {
          useToastStore.getState().addToast(`Synced ${successCount} queued comments.`, "success");
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
}