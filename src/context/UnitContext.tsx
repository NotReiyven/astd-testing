import React, { createContext, useContext, useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { MasterUnit } from '../types';
import { ALL_UNITS as LOCAL_FALLBACK_UNITS, UNIT_METADATA } from '../data/units';
import { getObtainability } from '../data/helpers';

type UnitContextType = {
  units: MasterUnit[];
  changelog: string[];
  notices: { title: string; date: string | null; content: string }[];
  sheetTitle: string;
  lastUpdated: string;
  isLoading: boolean;
  isSyncing: boolean; 
  isError: boolean;
};

const CACHE_VERSION = "astd_cache_v10"; // BUMPED CACHE VERSION TO FORCE REFRESH

const UnitContext = createContext<UnitContextType>({
  units: LOCAL_FALLBACK_UNITS,
  changelog: [],
  notices: [],
  sheetTitle: "ASTD Official Value List",
  lastUpdated: new Date().toISOString(),
  isLoading: true,
  isSyncing: false,
  isError: false,
});

export const UnitProvider = ({ children }: { children: React.ReactNode }) => {
  const [units, setUnits] = useState<MasterUnit[]>(LOCAL_FALLBACK_UNITS);
  const [changelog, setChangelog] = useState<string[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  
  const [sheetTitle, setSheetTitle] = useState(() => localStorage.getItem('astd_title_cache') || "ASTD Official Value List");
  const [lastUpdated, setLastUpdated] = useState(() => localStorage.getItem('astd_date_cache') || new Date().toISOString());
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initCacheAndFetch = async () => {
      let hasValidCache = false;
      
      try {
        const cacheVersion = localStorage.getItem('astd_cache_version');
        if (cacheVersion === CACHE_VERSION) {
          const [cachedUnits, cachedChangelog, cachedNotices] = await Promise.all([
            get('astd_units_cache'),
            get('astd_changelog_cache'),
            get('astd_notices_cache')
          ]);

          if (cachedUnits && mounted) {
            setUnits(cachedUnits);
            hasValidCache = true;
          }
          if (cachedChangelog && mounted) setChangelog(cachedChangelog);
          if (cachedNotices && mounted) setNotices(cachedNotices);
        }
      } catch (e) {
        console.warn("Failed to read from IndexedDB", e);
      }

      if (!mounted) return;

      if (hasValidCache) {
        setIsLoading(false);
        setIsSyncing(true);
      }

      try {
        const res = await fetch('/.netlify/functions/syncSheet');
        if (!res.ok) throw new Error('API Response not OK');
        
        const data = await res.json();
        if (!mounted) return;
        
        if (data.sheetTitle) { 
          setSheetTitle(data.sheetTitle); 
          localStorage.setItem('astd_title_cache', data.sheetTitle); 
        }
        if (data.lastUpdated) { 
          setLastUpdated(data.lastUpdated); 
          localStorage.setItem('astd_date_cache', data.lastUpdated); 
        }
        
        if (data.changelog) { 
          setChangelog(data.changelog); 
          await set('astd_changelog_cache', data.changelog); 
        }
        if (data.notices) { 
          setNotices(data.notices); 
          await set('astd_notices_cache', data.notices); 
        }

        if (data?.units?.length > 0) {
          const mergedUnits = data.units.map((apiUnit: MasterUnit) => {
            const meta = UNIT_METADATA[apiUnit.id] || {};

            return {
              ...apiUnit,
              subtitle: apiUnit.subtitle || meta.subtitle || "",
              notice: apiUnit.notice || meta.notice || "",
              aliases: meta.aliases || apiUnit.aliases || [],
              obtainability: meta.obtainability || getObtainability(apiUnit),
              imageUrl: `/units/${apiUnit.id}.webp`
            };
          });
          
          const uniqueUnitsMap = new Map<string, MasterUnit>();
          mergedUnits.forEach((u: MasterUnit) => uniqueUnitsMap.set(u.id, u));
          const finalUniqueUnits = Array.from(uniqueUnitsMap.values());

          setUnits(finalUniqueUnits);
          
          await set('astd_units_cache', finalUniqueUnits);
          localStorage.setItem('astd_cache_version', CACHE_VERSION);
        }
      } catch (error) {
        console.error("Live sync failed, falling back to local cache:", error);
        if (!hasValidCache && mounted) {
          setIsError(true);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsSyncing(false);
        }
      }
    };

    initCacheAndFetch();

    return () => { mounted = false; };
  }, []);

  return (
    <UnitContext.Provider value={{ units, changelog, notices, sheetTitle, lastUpdated, isLoading, isSyncing, isError }}>
      {children}
    </UnitContext.Provider>
  );
};

export const useUnits = () => useContext(UnitContext);