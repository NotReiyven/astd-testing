import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useInventoryStore } from '../store/useInventoryStore';

export type BootStage = 'loading' | 'tension' | 'strike' | 'fracture' | 'complete';

export function useAppBoot() {
  const [bootStage, setBootStage] = useState<BootStage>('loading');
  const [isMobile, setIsMobile] = useState(false);
  
  const initializeAuth = useAuthStore((s) => s.initialize);
  const fetchInventory = useInventoryStore((s) => s.fetchInventory);
  const profile = useAuthStore((s) => s.profile);

  // Layout & Auth Initialization
  useEffect(() => {
    initializeAuth();
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [initializeAuth]);

  // Inventory Sync
  useEffect(() => {
    if (profile) {
      fetchInventory(profile.id);
    }
  }, [profile, fetchInventory]);

  // Boot Sequence & Preloading
  useEffect(() => {
    Promise.all([
      import("../app/components/TradeAnalyzer"),
      import("../app/components/Sidebar"),
      import("../app/components/MainCanvas"),
      import("../app/components/HomeChannel"),
      import("../app/components/TutorialChannel"),
      import("../app/components/InventoryChannel"),
      import("../app/components/TradingAdsChannel"),
      import("../app/components/ExtraNoticesChannel"),
      import("../app/components/LegalChannel"),
      import("../app/components/AdminChannel")
    ]).then(() => {
      setTimeout(() => {
        setBootStage('tension');
        setTimeout(() => {
          setBootStage('strike');
          setTimeout(() => {
            setBootStage('fracture');
            setTimeout(() => setBootStage('complete'), 900);
          }, 200);
        }, 900);
      }, 700);
    }).catch(() => setBootStage('complete'));
  }, []);

  return { bootStage, isMobile };
}