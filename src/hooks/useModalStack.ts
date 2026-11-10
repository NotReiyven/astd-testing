// ================================================
// FILE: src/hooks/useModalStack.ts
// ================================================
//
// Central stack for modals that want to participate in "Escape closes
// only the topmost open modal" behavior. Modals that already implement
// their own focus trap and Escape handler (HistoryModal, AdComposerModal,
// ExternalLinkModal, CommandPalette) do not need to register here.
//
// New modals should:
//   1. Call `useModalEntry(isOpen, onEscape)`.
//   2. Skip their own `keydown` Escape handler.
//   3. Keep their own focus trap for Tab.
//
// The global listener is installed once by `useKeyboardShortcuts` or by
// the first modal that mounts. Each registered modal receives Escape only
// if it is the newest open entry.

import { useEffect } from "react";

interface Entry {
  id: symbol;
  onEscape: () => void;
}

const stack: Entry[] = [];
let listenerInstalled = false;

function handleGlobalEscape(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  if (stack.length === 0) return;
  const top = stack[stack.length - 1];
  event.preventDefault();
  event.stopPropagation();
  top.onEscape();
}

function installListener() {
  if (listenerInstalled) return;
  if (typeof window === "undefined") return;
  window.addEventListener("keydown", handleGlobalEscape, true);
  listenerInstalled = true;
}

function uninstallListenerIfEmpty() {
  if (stack.length > 0) return;
  if (!listenerInstalled) return;
  if (typeof window === "undefined") return;
  window.removeEventListener("keydown", handleGlobalEscape, true);
  listenerInstalled = false;
}

export function useModalEntry(isOpen: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const entry: Entry = { id: Symbol("modal"), onEscape };
    stack.push(entry);
    installListener();

    return () => {
      const idx = stack.findIndex((e) => e.id === entry.id);
      if (idx !== -1) stack.splice(idx, 1);
      uninstallListenerIfEmpty();
    };
  }, [isOpen, onEscape]);
}

export function getOpenModalCount(): number {
  return stack.length;
}