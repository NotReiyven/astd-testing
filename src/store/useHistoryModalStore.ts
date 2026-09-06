import { create } from 'zustand';

interface HistoryModalState {
  isOpen: boolean;
  unitId: string | null;
  openModal: (unitId: string) => void;
  closeModal: () => void;
}

export const useHistoryModalStore = create<HistoryModalState>((set) => ({
  isOpen: false,
  unitId: null,
  openModal: (unitId) => set({ isOpen: true, unitId }),
  closeModal: () => set({ isOpen: false, unitId: null }),
}));