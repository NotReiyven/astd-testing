// ================================================
// FILE: src/app/components/ProfileChannel/GuestPreferencesView.tsx
// ================================================

import { GiCharacter } from "react-icons/gi";
import {
  useLayoutStore,
  ThemeMode,
  BootChannel,
} from "../../../store/useLayoutStore";
import {
  useTradeStore,
  DEFAULT_ANALYZER_SETTINGS,
} from "../../../store/useTradeStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { useToastStore } from "../../../store/useToastStore";
import { triggerHaptic } from "../../../data/helpers";
import { IconRefresh } from "./icons";
import { ToggleSwitch } from "./ToggleSwitch";
import { THEME_OPTIONS, BOOT_CHANNEL_OPTIONS } from "./constants";

export function GuestPreferencesView() {
  const {
    theme,
    setTheme,
    globalCompactMode,
    setGlobalCompactMode,
    bootChannel,
    setBootChannel,
  } = useLayoutStore();
  const updateAnalyzerSettings = useTradeStore((s) => s.updateAnalyzerSettings);
  const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);

  return (
    <div className="flex-1 w-full h-full font-sans overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-10 bg-background flex flex-col items-center">
      <div className="max-w-3xl w-full flex flex-col gap-5 pb-12">
        <div className="bg-card border border-border rounded-[8px] p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col text-center sm:text-left gap-1">
            <h2 className="text-[18px] text-foreground">
              Trader Profile & Preferences
            </h2>
            <p className="text-[12.5px] text-muted-foreground">
              Local settings apply immediately to this browser. Sign in with
              Discord to unlock your custom profile banner, Ad History, and
              cloud Target Wishlist.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("medium");
              loginWithDiscord();
            }}
            className="px-4 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12.5px] rounded-[6px] flex items-center gap-2 transition-colors shrink-0 shadow-sm cursor-pointer focus-visible:outline-none"
          >
            <GiCharacter className="w-4 h-4" /> Sign In with Discord
          </button>
        </div>

        <div className="bg-card border border-border rounded-[8px] p-5 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col gap-0.5 border-b border-border pb-3">
            <h3 className="text-[14px] text-foreground">
              Appearance & Layout Density
            </h3>
            <p className="text-[12px] text-muted-foreground">
              Choose the global color palette and card density across the
              value list and calculator.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setTheme(t.id as ThemeMode);
                }}
                className={`p-3.5 rounded-[6px] border text-left flex flex-col gap-1.5 focus-visible:outline-none cursor-pointer transition-colors ${
                  theme === t.id
                    ? "bg-popover border-primary ring-1 ring-primary"
                    : "bg-popover border-border hover:bg-popover"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-foreground">{t.label}</span>
                  <span
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: t.swatch }}
                  />
                </div>
                <span className="text-[11.5px] text-muted-foreground">
                  {t.desc}
                </span>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] text-foreground">
                Global Compact Mode
              </span>
              <span className="text-[12px] text-muted-foreground">
                Tightens padding and card spacing across the entire app.
              </span>
            </div>
            <ToggleSwitch
              checked={globalCompactMode}
              onChange={() => {
                triggerHaptic("medium");
                setGlobalCompactMode(!globalCompactMode);
              }}
              ariaLabel="Toggle Global Compact Mode"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-[8px] p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-[14px] text-foreground">
                Navigation & Trade Analyzer Defaults
              </h3>
              <p className="text-[12px] text-muted-foreground">
                Configure your default startup channel and which panels
                appear in the Trade Analyzer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                updateAnalyzerSettings(DEFAULT_ANALYZER_SETTINGS);
                useToastStore
                  .getState()
                  .addToast(
                    "Trade Analyzer settings reset to defaults.",
                    "info"
                  );
              }}
              className="px-2.5 py-1.5 rounded-[5px] bg-popover hover:bg-muted border border-border text-muted-foreground hover:text-foreground text-[11px] font-mono flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              <IconRefresh className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[12px] text-muted-foreground">
              Default Startup Channel
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {BOOT_CHANNEL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setBootChannel(opt.id as BootChannel);
                  }}
                  className={`p-3 rounded-[6px] border text-left flex flex-col gap-0.5 cursor-pointer transition-colors ${
                    bootChannel === opt.id
                      ? "bg-popover border-primary"
                      : "bg-popover border-border hover:bg-popover"
                  }`}
                >
                  <span className="text-[12.5px] text-foreground">
                    {opt.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}