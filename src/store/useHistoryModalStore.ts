import { create } from 'zustand';

type MetricType = "value" | "rarity" | "liquidity";

interface HistoryModalState {
  isOpen: boolean;
  unitId: string | null;
  activeMetric: MetricType;
  openModal: (unitId: string, metric?: MetricType) => void;
  closeModal: () => void;
  setActiveMetric: (metric: MetricType) => void;
}

export const useHistoryModalStore = create<HistoryModalState>((set) => ({
  isOpen: false,
  unitId: null,
  activeMetric: "value",
  openModal: (unitId, metric = "value") => set({ isOpen: true, unitId, activeMetric: metric }),
  closeModal: () => set({ isOpen: false, unitId: null, activeMetric: "value" }),
  setActiveMetric: (metric: MetricType) => set({ activeMetric: metric }),
}));
