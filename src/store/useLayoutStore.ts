import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light" | "discord";
export type BootChannel = "last-used" | "home" | "value-list" | "trading-ads";
export type FontFamily =
  | "luckiest-guy"
  | "lilita-one"
  | "russo-one"
  | "rubik-dirt";

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
          oxanium: "lilita-one",
          geist: "lilita-one",
          ataria: "lilita-one",
          "space-grotesk": "russo-one",
          inter: "russo-one",
          "gears-of-battle": "russo-one",
          "jetbrains-mono": "rubik-dirt",
          mono: "rubik-dirt",
          gamedone: "rubik-dirt",
        };
        const validFonts: FontFamily[] = [
          "luckiest-guy",
          "lilita-one",
          "russo-one",
          "rubik-dirt",
        ];
        const mapped = (legacyMap as any)[fontFamily] || fontFamily;
        const resolved: FontFamily = validFonts.includes(mapped)
          ? mapped
          : "luckiest-guy";
        document.documentElement.setAttribute("data-font", resolved);
        set({ fontFamily: resolved });
      },
    }),
    {
      name: "astd_layout_storage",
      onRehydrateStorage: () => (state) => {
        if (state?.fontFamily) {
          const legacyMap: Record<string, FontFamily> = {
            oxanium: "lilita-one",
            geist: "lilita-one",
            ataria: "lilita-one",
            "space-grotesk": "russo-one",
            inter: "russo-one",
            "gears-of-battle": "russo-one",
            "jetbrains-mono": "rubik-dirt",
            mono: "rubik-dirt",
            gamedone: "rubik-dirt",
          };
          const validFonts: FontFamily[] = [
            "luckiest-guy",
            "lilita-one",
            "russo-one",
            "rubik-dirt",
          ];
          const mapped = (legacyMap as any)[state.fontFamily] || state.fontFamily;
          const resolved: FontFamily = validFonts.includes(mapped)
            ? mapped
            : "luckiest-guy";
          if (resolved !== state.fontFamily) {
            state.setFontFamily(resolved);
          } else {
            document.documentElement.setAttribute("data-font", resolved);
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
