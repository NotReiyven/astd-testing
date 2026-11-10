// ================================================
// FILE: src/app/components/ProfileChannel/tabs/settings/AppearanceSection.tsx
// ================================================

import { useLayoutStore, ThemeMode, FontFamily } from "../../../../../store/useLayoutStore";
import { triggerHaptic } from "../../../../../data/helpers";
import { ToggleSwitch } from "../../ToggleSwitch";
import { IconEdit } from "../../icons";
import { THEME_OPTIONS, FONT_OPTIONS } from "../../constants";
import {
  ProfileChannelState,
} from "../../hooks/useProfileChannelState";
import { ProfileChannelActions } from "../../hooks/useProfileChannelActions";

export function AppearanceSection({
  state,
  actions,
}: {
  state: ProfileChannelState;
  actions: ProfileChannelActions;
}) {
  const { theme, globalCompactMode, fontFamily } = state;
  const { openEditModal } = actions;

  const setTheme = useLayoutStore((s) => s.setTheme);
  const setFontFamily = useLayoutStore((s) => s.setFontFamily);
  const setGlobalCompactMode = useLayoutStore((s) => s.setGlobalCompactMode);

  return (
    <div className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[14px] text-foreground">
            Appearance & Layout Density
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Customize the global color theme and information density.
          </p>
        </div>
        <button
          type="button"
          onClick={openEditModal}
          className="px-3 py-1.5 rounded-[5px] bg-popover hover:bg-muted border border-border text-foreground text-[12px] flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <IconEdit className="w-3.5 h-3.5" />
          <span>Edit Banner & Bio</span>
        </button>
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
            className={`p-3.5 rounded-[6px] border text-left flex flex-col gap-1.5 cursor-pointer transition-colors ${
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

      <div className="pt-3 border-t border-border flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-foreground">Typography Font</span>
          <span className="text-[12px] text-muted-foreground">
            Choose the primary font family used across the application.
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setFontFamily(f.id as FontFamily);
              }}
              className={`p-3 rounded-[6px] border text-left flex flex-col gap-1 cursor-pointer transition-colors ${
                fontFamily === f.id
                  ? "bg-popover border-primary ring-1 ring-primary shadow-xs"
                  : "bg-popover border-border hover:bg-popover"
              }`}
            >
              <span
                style={{ fontFamily: f.previewFont }}
                className="text-[13px] font-bold text-foreground leading-tight truncate"
              >
                {f.label}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {f.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-border flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-foreground">
            Global Compact Mode
          </span>
          <span className="text-[12px] text-muted-foreground">
            Tightens padding and card spacing across the entire app to fit
            more units on screen.
          </span>
        </div>
        <ToggleSwitch
          checked={globalCompactMode}
          onChange={() => {
            triggerHaptic("medium");
            setGlobalCompactMode(!globalCompactMode);
          }}
        />
      </div>
    </div>
  );
}