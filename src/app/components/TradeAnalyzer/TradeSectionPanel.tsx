import { useState, useRef, useEffect, memo, useMemo } from "react";
import { Search, X } from "lucide-react";
import { TradeCard } from "../../../types";
import { useUnits } from "../../../context/UnitContext";
import { ActiveCardRow } from "./ActiveCardRow";

const HighlightedText = ({ text, query }: { text: string; query: string }) => {
  if (!query || !text) return <>{text}</>;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <span key={i} className="bg-[#FAA61A]/30 text-[#FAA61A] rounded-[2px]">{part}</span> 
          : <span key={i}>{part}</span>
      )}
    </>
  );
};

export const TradeSectionPanel = memo(function TradeSectionPanel({
  label,
  type,
  items,
  isDraggingGlobal,
  onQtyChange,
  onRemove,
  onClear,
  onAdd,
  pinnedIds,
  onTogglePin
}: {
  label: string;
  type: "give" | "get";
  items: TradeCard[];
  isDraggingGlobal: boolean;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onAdd: (card: TradeCard) => void;
  pinnedIds: Set<string>;
  onTogglePin: (id: string) => void;
}) {
  const { units: ALL_UNITS } = useUnits();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [query, open]);

  useEffect(() => {
    const handleFocusSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === type) {
        setOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("focus-trade-search", handleFocusSearch);
    return () => window.removeEventListener("focus-trade-search", handleFocusSearch);
  }, [type]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const raw = e.dataTransfer.getData("unit");
    if (!raw) return;
    try {
      const u = JSON.parse(raw);
      if (!u || typeof u !== "object" || typeof u.id !== "string" || typeof u.value !== "number") {
        return; 
      }

      const existing = items.find((c) => c.id === u.id);
      if (existing) {
        onQtyChange(existing.id, existing.qty + 1);
      } else {
        onAdd({ id: u.id, name: u.name, subtitle: u.subtitle, value: u.value, qty: 1 });
      }
    } catch { /* malformed payload */ }
  };

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return ALL_UNITS.filter(
      (u) => q === "" ||
        (u.name?.toLowerCase() || "").includes(q) ||
        (u.subtitle?.toLowerCase() || "").includes(q) ||
        (u.aliases?.some(a => a.toLowerCase().includes(q)))
    ).slice(0, 6);
  }, [query, ALL_UNITS]);

  const handleAdd = (u: typeof ALL_UNITS[0]) => {
    const existing = items.find((i) => i.id === u.id);
    if (existing) {
      onQtyChange(existing.id, existing.qty + 1);
    } else {
      const numericValue = typeof u.value === "number" ? u.value : 0;
      onAdd({ id: u.id, name: u.name, subtitle: u.subtitle, value: numericValue, qty: 1 });
    }
    setQuery("");
    setOpen(false);
    searchInputRef.current?.focus();
  };

  const isGive = type === "give";
  const accentColorHex = isGive ? "#FAA61A" : "var(--primary)";

  let dropZoneClasses = "flex flex-col justify-center rounded-[6px] transition-colors duration-150 ";
  let dropZoneStyle: React.CSSProperties = { minHeight: items.length === 0 ? "90px" : "auto" };

  if (isDraggingOver) {
    dropZoneClasses += "bg-popover border-2";
    dropZoneStyle.borderColor = accentColorHex;
  } else if (items.length === 0) {
    dropZoneClasses += "bg-muted border border-border";
  } else {
    dropZoneClasses += "bg-transparent border border-transparent";
  }

  return (
    <div className="px-3 md:px-4 py-3">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColorHex }} />
          <p
            className="text-[12px] md:text-[13px] font-extrabold uppercase tracking-widest text-foreground"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {label}
          </p>
          <span className="hidden md:inline-flex px-1.5 py-[2px] bg-muted rounded-[2px] text-[9px] font-semibold text-muted-foreground ml-1 border border-border">
            Press {isGive ? '/' : '\\'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <button
              className="text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none rounded-[4px] px-3 py-2 md:px-2 md:py-1 bg-muted border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive text-muted-foreground active:scale-95 cursor-pointer"
              onClick={onClear}
            >
              Clear {isGive ? "Give" : "Get"}
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-[4px] focus-within:border-primary bg-input transition-colors duration-100"
          style={{ border: open ? `1px solid ${accentColorHex}` : "1px solid var(--border)" }}
        >
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            placeholder={`Search to add units...`}
            className="flex-1 bg-transparent outline-none text-[13px] font-medium text-foreground placeholder-muted-foreground"
            style={{ caretColor: accentColorHex }}
            onChange={(e) => { 
              setQuery(e.target.value); 
              setOpen(true); 
            }}
            onFocus={() => { 
              setOpen(true); 
            }}
            onBlur={() => { 
              setTimeout(() => setOpen(false), 200); 
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => (prev <= 0 ? -1 : prev - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                  handleAdd(results[selectedIndex]);
                } else if (results.length > 0) {
                  handleAdd(results[0]); 
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
                searchInputRef.current?.blur();
              }
            }}
          />
          {query.length > 0 && (
            <button
              className="flex-shrink-0 focus-visible:outline-none rounded-[2px] p-2 -m-2 md:p-0.5 md:-m-0 hover:bg-muted transition-colors text-muted-foreground cursor-pointer"
              onMouseDown={(e) => { e.preventDefault(); setQuery(""); }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {open && results.length > 0 && (
          <div
            className="absolute left-0 right-0 mt-1 rounded-[6px] overflow-hidden bg-card border border-border shadow-lg z-[999999]"
            onMouseDown={(e) => e.preventDefault()}
          >
            <p className="px-3 pt-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted border-b border-border">
              Quick Add
            </p>
            {results.map((u, i) => {
              const isSelected = i === selectedIndex;
              return (
                <button
                  key={u.id}
                  onClick={() => handleAdd(u)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left focus-visible:outline-none cursor-pointer ${isSelected ? 'bg-muted' : 'bg-transparent hover:bg-muted'}`}
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                >
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[13px] font-bold leading-tight truncate text-foreground">
                      <HighlightedText text={u.name} query={query} />
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider leading-tight mt-[1px] truncate text-muted-foreground">
                      <HighlightedText text={u.subtitle || ""} query={query} />
                    </p>
                  </div>
                  <span className="text-[12px] font-bold flex-shrink-0 text-muted-foreground font-mono">
                    {typeof u.value === "number" ? u.value.toLocaleString() : u.value === "owner" ? "O/C" : u.valueDisplay || "???"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={dropZoneStyle} className={dropZoneClasses} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center pointer-events-none gap-0.5 py-4">
            <p className="text-[13px] font-bold" style={{ color: isDraggingOver ? "var(--foreground)" : "var(--muted-foreground)" }}>
              {isDraggingGlobal ? "Drop unit here" : "Empty Section"}
            </p>
            {!isDraggingGlobal && (
              <p className="text-[11px] font-medium text-muted-foreground text-center">
                <span className="hidden md:inline">Search above or drag units here.</span>
                <span className="md:hidden">Search above or tap units in the list.</span>
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((card) => (
              <div key={card.id}>
                <ActiveCardRow 
                  card={card} 
                  onQtyChange={onQtyChange} 
                  onRemove={onRemove} 
                  isPinned={pinnedIds.has(`${type}-${card.id}`)}
                  onTogglePin={onTogglePin}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});