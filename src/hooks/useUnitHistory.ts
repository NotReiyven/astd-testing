import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface HistorySnapshot {
  id: string;
  unit_id: string;
  recorded_at: string;
  value: number | null;
  value_type: string;
  value_display: string | null;
  value_min: number | null;
  status: string;
  rarity: number;
  liquidity: string | null;
  notice: string | null;
}

export function useUnitHistory(unitId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["unitHistory", unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const { data, error } = await supabase
        .from("unit_value_snapshots")
        .select("*")
        .eq("unit_id", unitId)
        .order("recorded_at", { ascending: true });

      if (error) throw error;
      return data as HistorySnapshot[];
    },
    // Only execute the query if we have a valid unitId
    enabled: !!unitId,
    // Keep data fresh for 5 minutes before refetching in background
    staleTime: 1000 * 60 * 5,
  });

  return {
    history: data || [],
    loading: isLoading,
    error: error ? error.message : null,
  };
}
