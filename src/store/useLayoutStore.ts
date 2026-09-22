import { create } from 'zustand';

interface LayoutState {
  globalSearchQuery: string;
  commandPaletteOpen: boolean;
  setGlobalSearchQuery: (query: string) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  globalSearchQuery: "",
  commandPaletteOpen: false,
  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
  setCommandPaletteOpen: (isOpen) => set({ commandPaletteOpen: isOpen }),
}));