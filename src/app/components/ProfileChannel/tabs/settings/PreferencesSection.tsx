// ================================================
// FILE: src/app/components/ProfileChannel/tabs/settings/PreferencesSection.tsx
// ================================================

import { GiTrashCan } from "react-icons/gi";
import { triggerHaptic } from "../../../../../data/helpers";
import {
  useTradeStore,
  DEFAULT_ANALYZER_SETTINGS,
} from "../../../../../store/useTradeStore";
import {
  useLayoutStore,
  BootChannel,
} from "../../../../../store/useLayoutStore";
import { useToastStore } from "../../../../../store/useToastStore";
import { IconRefresh } from "../../icons";
import { BOOT_CHANNEL_OPTIONS, ANALYZER_TOGGLE_DEFS } from "../../constants";
import { ProfileChannelState } from "../../hooks/useProfileChannelState";

export function PreferencesSection({
  state,
}: {
  state: ProfileChannelState;
}) {
  const { bootChannel, analyzerSettings, setIsDeleteModalOpen } = state;

  const setBootChannel = useLayoutStore((s) => s.setBootChannel);
  const updateAnalyzerSettings = useTradeStore((s) => s.updateAnalyzerSettings);

  return (
    <>
      <div className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-[14px] text-foreground">
              Navigation & Trade Analyzer Defaults
            </h3>
            <p className="text-[12px] text-muted-foreground">
              Configure your default startup channel and which panels appear
              in the Trade Analyzer.
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

        <div className="pt-3 border-t border-border flex flex-col gap-2">
          <span className="text-[12px] text-muted-foreground">
            Trade Analyzer Visible Sections & Metrics
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ANALYZER_TOGGLE_DEFS.map((item) => {
              const active = analyzerSettings[item.key] ?? item.default;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    updateAnalyzerSettings({ [item.key]: !active });
                  }}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-[6px] bg-popover border border-border hover:border-foreground transition-colors cursor-pointer text-left"
                >
                  <span className="text-[12.5px] text-foreground">
                    {item.label}
                  </span>
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] border shadow-xs ${
                      active
                        ? "bg-[#23a559] border-[#1a7a40] text-white"
                        : "bg-[#475569] border-[#334155] text-white"
                    }`}
                  >
                    {active ? "Shown" : "Hidden"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4">
        <div className="pt-1 border-t border-destructive flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-bold text-destructive">
              Danger Zone
            </span>
            <span className="text-[12px] text-muted-foreground">
              Irreversible actions for your account. Once deleted, your ads,
              inventory vault, and profile data cannot be recovered.
            </span>
          </div>

          <div className="p-3.5 rounded-[6px] border border-destructive bg-[#2a1212] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[12.5px] font-semibold text-foreground">
                Delete this account
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                Permanently delete your profile and all associated data from
                the platform.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("heavy");
                setIsDeleteModalOpen(true);
              }}
              className="px-3.5 py-2 text-[12px] font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 border border-red-700 rounded-[5px] cursor-pointer transition-colors shrink-0 shadow-xs flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <GiTrashCan className="w-4 h-4" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}