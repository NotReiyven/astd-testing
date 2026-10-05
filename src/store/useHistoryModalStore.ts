import { create } from 'zustand';

type MetricType = "value" | "rarity" | "liquidity";

interface HistoryModalState {
  isOpen: boolean;
  unitId: string | null;
  initialMetric: MetricType;
  openModal: (unitId: string, metric?: MetricType) => void;
  closeModal: () => void;
}

export const useHistoryModalStore = create<HistoryModalState>((set) => ({
  isOpen: false,
  unitId: null,
  initialMetric: "value",
  openModal: (unitId, metric = "value") => set({ isOpen: true, unitId, initialMetric: metric }),
  closeModal: () => set({ isOpen: false, unitId: null, initialMetric: "value" }),
}));
