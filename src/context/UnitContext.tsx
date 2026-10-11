import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { MasterUnit } from "../types";
import {
  ALL_UNITS as LOCAL_FALLBACK_UNITS,
  UNIT_METADATA,
} from "../data/units";
import { getObtainability, getUnitAssetUrl } from "../data/helpers";

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

export type UnitSyncContextType = {
  isSyncing: boolean;
  isFetching: boolean;
  isLoading: boolean;
  isError: boolean;
  lastUpdatedAt: number | null;
  refetch: () => Promise<unknown>;
};

const DEFAULT_LAST_UPDATED = new Date().toISOString();

const UnitContext = createContext<UnitContextType>({
  units: LOCAL_FALLBACK_UNITS,
  changelog: [],
  notices: [],
  sheetTitle: "ASTD Official Value List",
  lastUpdated: DEFAULT_LAST_UPDATED,
  isLoading: true,
  isSyncing: false,
  isError: false,
});

const UnitSyncContext = createContext<UnitSyncContextType>({
  isSyncing: false,
  isFetching: false,
  isLoading: true,
  isError: false,
  lastUpdatedAt: null,
  refetch: async () => undefined,
});

export const UnitProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    data,
    isLoading,
    isError,
    isFetching,
    dataUpdatedAt,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ["sheetData"],
    queryFn: async () => {
      const res = await fetch("/api/syncSheet");
      if (!res.ok) throw new Error("API Response not OK");
      const json = await res.json();

      const mergedUnits = (json.units || []).map((apiUnit: MasterUnit) => {
        const meta = UNIT_METADATA[apiUnit.id] || {};
        return {
          ...apiUnit,
          subtitle: apiUnit.subtitle || meta.subtitle || "",
          notice: apiUnit.notice || meta.notice || "",
          aliases: meta.aliases || apiUnit.aliases || [],
          obtainability: meta.obtainability || getObtainability(apiUnit),
          imageUrl: getUnitAssetUrl(apiUnit.id) || undefined,
        };
      });

      const uniqueUnitsMap = new Map<string, MasterUnit>();
      mergedUnits.forEach((u: MasterUnit) => uniqueUnitsMap.set(u.id, u));

      return {
        units: Array.from(uniqueUnitsMap.values()),
        changelog: json.changelog || [],
        notices: json.notices || [],
        sheetTitle: json.sheetTitle || "ASTD Official Value List",
        lastUpdated: json.lastUpdated || new Date().toISOString(),
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes before background refetch
    refetchOnWindowFocus: true,
  });

  const handleRefetch = useCallback(async () => {
    const result = await queryRefetch();
    return result;
  }, [queryRefetch]);

  // Memoize units value strictly on data, isLoading, and isError so background refetches
  // never re-render heavy consumers like MainCanvas.
  const unitsValue = useMemo<UnitContextType>(
    () => ({
      units: data?.units?.length ? data.units : LOCAL_FALLBACK_UNITS,
      changelog: data?.changelog || [],
      notices: data?.notices || [],
      sheetTitle: data?.sheetTitle || "ASTD Official Value List",
      lastUpdated: data?.lastUpdated || DEFAULT_LAST_UPDATED,
      isLoading,
      isSyncing: false,
      isError,
    }),
    [data, isLoading, isError]
  );

  // Separate memoized sync context for lightweight status indicators (SyncBanner, StatusPill, HomeChannel)
  const syncValue = useMemo<UnitSyncContextType>(
    () => ({
      isSyncing: isFetching && !isLoading,
      isFetching,
      isLoading,
      isError,
      lastUpdatedAt: dataUpdatedAt > 0 ? dataUpdatedAt : null,
      refetch: handleRefetch,
    }),
    [isFetching, isLoading, isError, dataUpdatedAt, handleRefetch]
  );

  return (
    <UnitContext.Provider value={unitsValue}>
      <UnitSyncContext.Provider value={syncValue}>
        {children}
      </UnitSyncContext.Provider>
    </UnitContext.Provider>
  );
};

export const useUnits = () => useContext(UnitContext);
export const useUnitSync = () => useContext(UnitSyncContext);



