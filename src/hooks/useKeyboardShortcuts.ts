import { useEffect } from "react";
import { useLayoutStore } from "../store/useLayoutStore";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.hasAttribute("contenteditable"));

      if (isInput) return;

      // Global Undo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        window.dispatchEvent(new Event("trigger-global-undo"));
      }

      // Global Save
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        window.dispatchEvent(new Event("trigger-global-save"));
      }

      // Shortcuts Modal
      if (e.key === "?") {
        e.preventDefault();
        useLayoutStore.getState().setShortcutsModalOpen(true);
      }

      // Global Escape Fallback
      if (e.key === "Escape") {
        useLayoutStore.getState().setCommandPaletteOpen(false);
        useLayoutStore.getState().setShortcutsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}