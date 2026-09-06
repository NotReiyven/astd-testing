import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  supply: number;
  demand: number;
}

const memoryCache = new Map<string, HistorySnapshot[]>();

export function useUnitHistory(unitId: string | null) {
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) {
      setHistory([]);
      return;
    }

    if (memoryCache.has(unitId)) {
      setHistory(memoryCache.get(unitId)!);
      return;
    }

    let isMounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: sbError } = await supabase
          .from('unit_value_snapshots')
          .select('*')
          .eq('unit_id', unitId)
          .order('recorded_at', { ascending: true });

        if (sbError) throw sbError;
        if (isMounted && data) {
          memoryCache.set(unitId, data as HistorySnapshot[]);
          setHistory(data as HistorySnapshot[]);
        }
      } catch (e: any) {
        if (isMounted) setError(e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHistory();
    return () => { isMounted = false; };
  }, [unitId]);

  return { history, loading, error };
}