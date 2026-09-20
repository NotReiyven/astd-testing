import { create } from 'zustand';

interface LayoutState {
  globalSearchQuery: string;
  helpMenuOpen: boolean;
  setGlobalSearchQuery: (query: string) => void;
  setHelpMenuOpen: (isOpen: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  globalSearchQuery: "",
  helpMenuOpen: false,
  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
  setHelpMenuOpen: (isOpen) => set({ helpMenuOpen: isOpen }),
}));