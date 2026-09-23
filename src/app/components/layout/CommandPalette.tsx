// ================================================
// FILE: src/app/components/layout/CommandPalette.tsx
// ================================================
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, Hash, Calculator, GraduationCap, Map, BookOpen, Settings2, Package, Megaphone } from "lucide-react";
import { useLayoutStore } from "../../../store/useLayoutStore";
import { triggerHaptic } from "../../../data/helpers";

const COMMANDS = [
  { id: "nav-vl", label: "Value List", icon: Hash, action: "value-list", type: "navigate", desc: "View the live market data" },
  { id: "nav-ads", label: "Trading Ads", icon: Megaphone, action: "trading-ads", type: "navigate", desc: "View live community listings" },
  { id: "nav-inv", label: "My Inventory", icon: Package, action: "inventory", type: "navigate", desc: "Manage your vault and wishlist" },
  { id: "nav-home", label: "Home & Patch Notes", icon: Hash, action: "home", type: "navigate", desc: "View recent updates" },
  { id: "tool-calc", label: "Open Trade Analyzer", icon: Calculator, action: "toggle-calc", type: "action", desc: "Calculate trade values" },
  { id: "acad-sandbox", label: "Academy: Checklist", icon: GraduationCap, action: "sandbox", type: "academy", desc: "View your certification progress" },
  { id: "acad-mock", label: "Academy: Mock Trades", icon: Map, action: "simulator", type: "academy", desc: "Test your trading knowledge" },
  { id: "acad-theory", label: "Academy: Market Theory", icon: BookOpen, action: "theory", type: "academy", desc: "Read the official documentation" },
  { id: "acad-dict", label: "Academy: Dictionary", icon: Settings2, action: "dictionary", type: "academy", desc: "Manage the smart parser" },
];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useLayoutStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.desc.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!commandPaletteOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(p => (p + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(p => (p - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) executeCommand(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setCommandPaletteOpen(false);
      }
    };
    
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [filtered, selectedIndex, commandPaletteOpen]);

  const executeCommand = (cmd: typeof COMMANDS[0]) => {
    setCommandPaletteOpen(false);
    triggerHaptic('light');
    if (cmd.type === "navigate") {
      window.document.dispatchEvent(new CustomEvent('navigate', { detail: cmd.action }));
    } else if (cmd.type === "action") {
      window.dispatchEvent(new Event("open-analyzer"));
    } else if (cmd.type === "academy") {
      window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'tutorial' }));
      setTimeout(() => window.dispatchEvent(new CustomEvent("set-tutorial-tab", { detail: cmd.action })), 50);
    }
  };

  if (!commandPaletteOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[200] flex justify-center items-start pt-[10vh] px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCommandPaletteOpen(false)} aria-hidden="true" />
      
      <div className="bg-card w-full max-w-[600px] rounded-[12px] border border-border shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col relative z-10 overflow-hidden animate-slide-up">
        <div className="flex items-center px-4 py-4 border-b border-border gap-3">
          <Search className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search commands or pages..."
            className="flex-1 bg-transparent border-none outline-none text-[16px] text-foreground placeholder-muted-foreground"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-options"
            aria-activedescendant={filtered[selectedIndex] ? `cmd-${filtered[selectedIndex].id}` : undefined}
          />
          <span className="text-[10px] font-mono text-muted-foreground bg-popover px-1.5 py-0.5 rounded border border-border pointer-events-none">ESC</span>
        </div>

        <div id="command-options" role="listbox" className="max-h-[350px] overflow-y-auto custom-scrollbar p-2">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-[13px]" role="option" aria-selected="false">
              No matching commands found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  id={`cmd-${cmd.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-[8px] transition-colors text-left focus-visible:outline-none ${isSelected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-popover hover:text-foreground'}`}
                >
                  <cmd.icon className={`w-5 h-5 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} aria-hidden="true" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={`text-[14px] font-bold ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>{cmd.label}</span>
                    <span className={`text-[11px] truncate ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{cmd.desc}</span>
                  </div>
                  {isSelected && <span className="text-[10px] font-mono opacity-70">↵ to select</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}