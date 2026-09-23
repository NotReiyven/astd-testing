// ================================================
// FILE: src/context/UnitContext.tsx
// ================================================

import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['sheetData'],
    queryFn: async () => {
      const res = await fetch('/api/syncSheet');
      if (!res.ok) throw new Error('API Response not OK');
      const json = await res.json();

      const mergedUnits = (json.units || []).map((apiUnit: MasterUnit) => {
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

      return {
        units: Array.from(uniqueUnitsMap.values()),
        changelog: json.changelog || [],
        notices: json.notices || [],
        sheetTitle: json.sheetTitle || "ASTD Official Value List",
        lastUpdated: json.lastUpdated || new Date().toISOString()
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes before background refetch
    refetchOnWindowFocus: true,
  });

  const value = {
    units: data?.units?.length ? data.units : LOCAL_FALLBACK_UNITS,
    changelog: data?.changelog || [],
    notices: data?.notices || [],
    sheetTitle: data?.sheetTitle || "ASTD Official Value List",
    lastUpdated: data?.lastUpdated || new Date().toISOString(),
    isLoading,
    isSyncing: isFetching && !isLoading,
    isError,
  };

  return (
    <UnitContext.Provider value={value}>
      {children}
    </UnitContext.Provider>
  );
};

export const useUnits = () => useContext(UnitContext);