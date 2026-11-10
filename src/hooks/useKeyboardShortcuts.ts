// ================================================
// FILE: src/hooks/useKeyboardShortcuts.ts
// ================================================

import { useEffect } from "react";
import { useLayoutStore } from "../store/useLayoutStore";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable === true;
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target);
      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+Z: analyzer undo
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (typing) return;
        e.preventDefault();
        window.dispatchEvent(new Event("trigger-global-undo"));
        return;
      }

      // Cmd/Ctrl+Shift+Z: analyzer redo (currently reuses undo path since
      // the trade store has one undo snapshot; the listener can decide).
      if (mod && e.shiftKey && e.key.toLowerCase() === "z") {
        if (typing) return;
        e.preventDefault();
        window.dispatchEvent(new Event("trigger-global-undo"));
        return;
      }

      // Cmd/Ctrl+S: save preset
      if (mod && e.key.toLowerCase() === "s") {
        if (typing) return;
        e.preventDefault();
        window.dispatchEvent(new Event("save-preset"));
        return;
      }

      // Escape: close palette + shortcuts modal. Modals with their own
      // focus traps already intercept Escape via their local keydown
      // handlers, so a global close-everything would double-fire and is
      // intentionally avoided here.
      if (e.key === "Escape") {
        const layout = useLayoutStore.getState();
        if (layout.commandPaletteOpen) {
          layout.setCommandPaletteOpen(false);
        }
        if (layout.shortcutsModalOpen) {
          layout.setShortcutsModalOpen(false);
        }
        return;
      }

      // ? opens the shortcuts modal. Skip when typing so that pressing
      // Shift+/ inside an input does not hijack text entry.
      if (e.key === "?" && !mod && !e.altKey) {
        if (typing) return;
        e.preventDefault();
        useLayoutStore.getState().setShortcutsModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}