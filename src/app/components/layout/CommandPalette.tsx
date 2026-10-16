import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Hash,
  Calculator,
  GraduationCap,
  Map,
  BookOpen,
  Settings2,
  Package,
  Megaphone,
  Type,
} from "lucide-react";
import { useLayoutStore, FontFamily } from "../../../store/useLayoutStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { useToastStore } from "../../../store/useToastStore";
import { triggerHaptic } from "../../../data/helpers";

const COMMANDS = [
  {
    id: "nav-vl",
    label: "Value List",
    icon: Hash,
    action: "value-list",
    type: "navigate",
    desc: "View the live market data",
  },
  {
    id: "nav-ads",
    label: "Trading Ads",
    icon: Megaphone,
    action: "trading-ads",
    type: "navigate",
    desc: "View live community listings",
  },
  {
    id: "nav-inv",
    label: "My Inventory",
    icon: Package,
    action: "inventory",
    type: "navigate",
    desc: "Manage your vault and wishlist",
  },
  {
    id: "nav-home",
    label: "Home & Patch Notes",
    icon: Hash,
    action: "home",
    type: "navigate",
    desc: "View recent updates",
  },
  {
    id: "tool-calc",
    label: "Open Trade Analyzer",
    icon: Calculator,
    action: "toggle-calc",
    type: "action",
    desc: "Calculate trade values",
  },
  {
    id: "acad-sandbox",
    label: "Academy: Checklist",
    icon: GraduationCap,
    action: "sandbox",
    type: "academy",
    desc: "View your certification progress",
  },
  {
    id: "acad-mock",
    label: "Academy: Mock Trades",
    icon: Map,
    action: "simulator",
    type: "academy",
    desc: "Test your trading knowledge",
  },
  {
    id: "acad-theory",
    label: "Academy: Market Theory",
    icon: BookOpen,
    action: "theory",
    type: "academy",
    desc: "Read the official documentation",
  },
  {
    id: "acad-dict",
    label: "Academy: Dictionary",
    icon: Settings2,
    action: "dictionary",
    type: "academy",
    desc: "Manage the smart parser",
  },
  {
    id: "font-luckiest",
    label: "Typography: Luckiest Guy",
    icon: Type,
    action: "luckiest-guy",
    type: "font",
    desc: "Switch to classic ASTD display font",
  },
  {
    id: "font-geist",
    label: "Typography: Geist",
    icon: Type,
    action: "geist",
    type: "font",
    desc: "Switch to clean modern sans font",
  },
  {
    id: "font-inter",
    label: "Typography: Inter",
    icon: Type,
    action: "inter",
    type: "font",
    desc: "Switch to neutral interface font",
  },
  {
    id: "font-mono",
    label: "Typography: Geist Mono",
    icon: Type,
    action: "mono",
    type: "font",
    desc: "Switch to technical tabular monospace font",
  },
] as const;

export function CommandPalette() {
  const commandPaletteOpen = useLayoutStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useLayoutStore((s) => s.setCommandPaletteOpen);
  const setFontFamily = useLayoutStore((s) => s.setFontFamily);
  const profile = useAuthStore((s) => s.profile);
  const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);
  const addToast = useToastStore((s) => s.addToast);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const filtered = COMMANDS.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.desc.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!commandPaletteOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    setQuery("");
    setSelectedIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);

    return () => {
      window.clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, [commandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = (cmd: (typeof COMMANDS)[number]) => {
    setCommandPaletteOpen(false);
    triggerHaptic("light");
    if (cmd.type === "navigate") {
      if (cmd.action === "inventory" && !profile) {
        addToast(
          "Browsing Inventory in Guest mode. Login with Discord to sync your Vault.",
          "info",
          {
            action: {
              label: "Login",
              onClick: () => {
                void loginWithDiscord();
              },
            },
          }
        );
      }
      window.document.dispatchEvent(
        new CustomEvent("navigate", { detail: cmd.action })
      );
    } else if (cmd.type === "action") {
      window.dispatchEvent(new Event("open-analyzer"));
    } else if (cmd.type === "academy") {
      window.document.dispatchEvent(
        new CustomEvent("navigate", { detail: "tutorial" })
      );
      setTimeout(
        () =>
          window.dispatchEvent(
            new CustomEvent("set-tutorial-tab", { detail: cmd.action })
          ),
        50
      );
    } else if (cmd.type === "font") {
      setFontFamily(cmd.action as FontFamily);
      addToast(
        `Switched typography to ${cmd.label.replace("Typography: ", "")}.`,
        "info"
      );
    }
  };

  useEffect(() => {
    if (!commandPaletteOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        if (filtered.length === 0) return;
        e.preventDefault();
        setSelectedIndex((p) => (p + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        if (filtered.length === 0) return;
        e.preventDefault();
        setSelectedIndex((p) => (p - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        executeCommand(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setCommandPaletteOpen(false);
      } else if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [filtered, selectedIndex, commandPaletteOpen, profile]);

  if (!commandPaletteOpen) return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[100010] flex justify-center items-start pt-[12vh] px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="absolute inset-0 bg-black/75"
        onClick={() => setCommandPaletteOpen(false)}
        aria-hidden="true"
      />

      <div className="bg-card w-full max-w-[540px] rounded-[12px] border border-border shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col relative z-10 overflow-hidden animate-slide-up">
        <div className="flex items-center px-4 py-4 border-b border-border gap-3">
          <Search
            className="w-5 h-5 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search channels…"
            className="flex-1 bg-transparent border-none outline-none text-[16px] text-foreground placeholder-muted-foreground"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-options"
            aria-activedescendant={
              filtered[selectedIndex]
                ? `cmd-${filtered[selectedIndex].id}`
                : undefined
            }
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-border bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Clear
            </button>
          )}
          <span
            translate="no"
            className="text-[10px] font-mono text-muted-foreground bg-popover px-1.5 py-0.5 rounded border border-border pointer-events-none"
          >
            ESC
          </span>
        </div>

        <div
          id="command-options"
          role="listbox"
          className="max-h-[340px] overflow-y-auto custom-scrollbar p-2"
        >
          {filtered.length === 0 ? (
            <div
              className="p-6 text-center flex flex-col items-center gap-3 text-muted-foreground text-[13px]"
              role="option"
              aria-selected="false"
            >
              <span>No matching commands found for “{query}”.</span>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="px-3 py-1.5 rounded-[6px] bg-secondary hover:bg-accent text-foreground border border-border text-[12px] font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Clear Search Query
              </button>
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const showGuestHint = cmd.id === "nav-inv" && !profile;
              return (
                <button
                  type="button"
                  key={cmd.id}
                  id={`cmd-${cmd.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-[8px] transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-popover hover:text-foreground"
                  }`}
                >
                  <cmd.icon
                    className={`w-5 h-5 shrink-0 ${
                      isSelected
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[14px] font-bold ${
                          isSelected
                            ? "text-primary-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {cmd.label}
                      </span>
                      {showGuestHint && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            isSelected
                              ? "border-primary-foreground/40 text-primary-foreground"
                              : "border-border bg-secondary text-muted-foreground"
                          }`}
                        >
                          Guest Preview
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] truncate ${
                        isSelected
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {cmd.desc}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono opacity-80 shrink-0">
                      ↵ Open
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-border bg-popover flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span>↑↓ Navigate · ↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}


