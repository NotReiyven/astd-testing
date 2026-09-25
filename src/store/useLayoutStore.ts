import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light" | "discord";
export type BootChannel = "last-used" | "home" | "value-list" | "trading-ads";

interface LayoutState {
  globalSearchQuery: string;
  commandPaletteOpen: boolean;
  theme: ThemeMode;
  globalCompactMode: boolean;
  bootChannel: BootChannel;
  setGlobalSearchQuery: (query: string) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setGlobalCompactMode: (isCompact: boolean) => void;
  setBootChannel: (channel: BootChannel) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      globalSearchQuery: "",
      commandPaletteOpen: false,
      theme: "dark",
      globalCompactMode: false,
      bootChannel: "last-used",

      setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),

      setCommandPaletteOpen: (isOpen) => set({ commandPaletteOpen: isOpen }),

      setTheme: (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        set({ theme });
      },

      setGlobalCompactMode: (isCompact) =>
        set({ globalCompactMode: isCompact }),

      setBootChannel: (channel) => set({ bootChannel: channel }),
    }),
    {
      name: "astd_layout_storage",
      // We only persist personalization settings, not active search queries or modals
      partialize: (state) => ({
        theme: state.theme,
        globalCompactMode: state.globalCompactMode,
        bootChannel: state.bootChannel,
      }),
    }
  )
);
