import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light" | "discord";
export type BootChannel = "last-used" | "home" | "value-list" | "trading-ads";
export type FontFamily =
  | "luckiest-guy"
  | "oxanium"
  | "space-grotesk"
  | "jetbrains-mono";

interface LayoutState {
  globalSearchQuery: string;
  commandPaletteOpen: boolean;
  theme: ThemeMode;
  globalCompactMode: boolean;
  bootChannel: BootChannel;
  fontFamily: FontFamily;
  setGlobalSearchQuery: (query: string) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setGlobalCompactMode: (isCompact: boolean) => void;
  setBootChannel: (channel: BootChannel) => void;
  setFontFamily: (font: FontFamily) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      globalSearchQuery: "",
      commandPaletteOpen: false,
      theme: "dark",
      globalCompactMode: false,
      bootChannel: "last-used",
      fontFamily: "luckiest-guy",

      setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),

      setCommandPaletteOpen: (isOpen) => set({ commandPaletteOpen: isOpen }),

      setTheme: (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        set({ theme });
      },

      setGlobalCompactMode: (isCompact) =>
        set({ globalCompactMode: isCompact }),

      setBootChannel: (channel) => set({ bootChannel: channel }),

      setFontFamily: (fontFamily) => {
        const legacyMap: Record<string, FontFamily> = {
          geist: "oxanium",
          inter: "space-grotesk",
          mono: "jetbrains-mono",
        };
        const resolved = (legacyMap as any)[fontFamily] || fontFamily;
        document.documentElement.setAttribute("data-font", resolved);
        set({ fontFamily: resolved });
      },
    }),
    {
      name: "astd_layout_storage",
      onRehydrateStorage: () => (state) => {
        if (state?.fontFamily) {
          const legacyMap: Record<string, FontFamily> = {
            geist: "oxanium",
            inter: "space-grotesk",
            mono: "jetbrains-mono",
          };
          if ((legacyMap as any)[state.fontFamily]) {
            state.setFontFamily((legacyMap as any)[state.fontFamily]);
          }
        }
      },
      // We only persist personalization settings, not active search queries or modals
      partialize: (state) => ({
        theme: state.theme,
        globalCompactMode: state.globalCompactMode,
        bootChannel: state.bootChannel,
        fontFamily: state.fontFamily,
      }),
    }
  )
);
