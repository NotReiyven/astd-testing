import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type MetricType = "value" | "rarity" | "liquidity";

interface HistoryModalState {
  isOpen: boolean;
  unitId: string | null;
  activeMetric: MetricType;
  recentUnitIds: string[];
  openModal: (unitId: string, metric?: MetricType) => void;
  closeModal: () => void;
  setActiveMetric: (metric: MetricType) => void;
}

export const useHistoryModalStore = create<HistoryModalState>()(
  persist(
    (set) => ({
      isOpen: false,
      unitId: null,
      activeMetric: "value",
      recentUnitIds: [],
      openModal: (unitId, metric = "value") => set((state) => {
        const newRecents = [unitId, ...state.recentUnitIds.filter(id => id !== unitId)].slice(0, 5);
        return { 
          isOpen: true, 
          unitId, 
          activeMetric: metric,
          recentUnitIds: newRecents
        };
      }),
      closeModal: () => set({ isOpen: false, unitId: null, activeMetric: "value" }),
      setActiveMetric: (metric: MetricType) => set({ activeMetric: metric }),
    }),
    {
      name: "astd_recent_units",
      partialize: (state) => ({ recentUnitIds: state.recentUnitIds }),
    }
  )
);