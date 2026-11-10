// ================================================
// FILE: src/hooks/useSavePresetHotkey.ts
// ================================================
//
// Listens for the `save-preset` window event dispatched by
// useKeyboardShortcuts when the user presses Cmd/Ctrl+S. It mirrors the
// validation used by the inline "Save Loadout" form inside the Trade
// Analyzer so the two entry points behave identically.
//
// The hook is disabled by default when the analyzer is not open, so
// pressing Cmd+S while browsing the Value List does not prompt the user.

import { useEffect } from "react";
import { useTradeStore } from "../store/useTradeStore";
import { useToastStore } from "../store/useToastStore";
import { triggerHaptic } from "../data/helpers";

const MAX_PRESET_NAME_LENGTH = 30;

export function useSavePresetHotkey(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const savePreset = useTradeStore((s) => s.savePreset);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (!enabled) return;

    const handleSavePreset = () => {
      const state = useTradeStore.getState();
      const hasItems =
        state.giveItems.length > 0 || state.getItems.length > 0;

      if (!hasItems) {
        addToast(
          "Add at least one unit to the calculator before saving a preset.",
          "warning"
        );
        return;
      }

      const suggested = `Preset ${state.presets.length + 1}`;
      const name = window.prompt("Name this preset:", suggested);
      if (name === null) return;

      const trimmed = name.trim();
      if (!trimmed) {
        addToast("Preset name cannot be empty.", "warning");
        return;
      }

      if (trimmed.length > MAX_PRESET_NAME_LENGTH) {
        addToast(
          `Preset name must be ${MAX_PRESET_NAME_LENGTH}\u00A0characters or fewer (currently ${trimmed.length}).`,
          "warning"
        );
        return;
      }

      const isDuplicate = state.presets.some(
        (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) {
        addToast(
          `A loadout named "${trimmed}" already exists. Choose a unique name.`,
          "warning"
        );
        return;
      }

      savePreset(trimmed);
      triggerHaptic("success");
      addToast(`Saved preset "${trimmed}".`, "success");
    };

    window.addEventListener("save-preset", handleSavePreset);
    return () => window.removeEventListener("save-preset", handleSavePreset);
  }, [enabled, savePreset, addToast]);
}