import { useEffect } from "react";
import { createPortal } from "react-dom";
import { GiKeyboard } from "react-icons/gi";
import { useLayoutStore } from "../../../store/useLayoutStore";

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Open Command Palette / Quick Search" },
  { keys: ["Ctrl", "K"], label: "Open Command Palette (Windows)" },
  { keys: ["/"], label: "Focus 'You Give' search in Calculator" },
  { keys: ["\\"], label: "Focus 'You Get' search in Calculator" },
  { keys: ["Ctrl", "V"], label: "Paste Smart Trade (when not typing)" },
  { keys: ["Enter"], label: "Submit modal form / confirm" },
  { keys: ["Esc"], label: "Close modal / clear search" },
  { keys: ["Shift", "/"], label: "Show this shortcuts menu" },
];

export function KeyboardShortcutsModal() {
  const isOpen = useLayoutStore((s) => s.shortcutsModalOpen);
  const setOpen = useLayoutStore((s) => s.setShortcutsModalOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 animate-fade-in">
      <div className="absolute inset-0" onClick={() => setOpen(false)} />
      <div className="bg-popover border border-border rounded-[10px] shadow-2xl w-full max-w-md relative z-10 flex flex-col overflow-hidden animate-slide-up">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-primary/15 flex items-center justify-center text-primary border border-primary/30">
            <GiKeyboard className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Keyboard Shortcuts</h2>
            <p className="text-[12px] text-muted-foreground">Boost your trading speed</p>
          </div>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[13px] text-foreground/90 font-medium">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="px-1.5 py-0.5 rounded-[4px] bg-muted border border-border text-[11px] font-mono font-bold text-foreground shadow-sm min-w-[24px] text-center"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}