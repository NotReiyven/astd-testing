import { useState, useRef, useEffect, memo, useMemo } from "react";
import { Search, X, Plus } from "lucide-react";
import { TradeCard } from "../../../types";
import { GRID_STATUS_CFG, getProxyImage } from "../../../data";
import { useUnits } from "../../../context/UnitContext";
import { ActiveCardRow } from "./ActiveCardRow";
import { getAvatarStyle, getInitials } from "./summaryUtils";

const HighlightedText = ({ text, query }: { text: string; query: string }) => {
  if (!query || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <span key={i} className="text-[#5865F2] font-black">{part}</span> 
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
    if (type !== "give") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault(); 
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
  const themeColorRGB = isGive ? "250, 166, 26" : "88, 101, 242"; 
  const accentColorHex = isGive ? "#FAA61A" : "#5865F2";
  
  let dropZoneStyle = {
    padding: items.length === 0 ? "24px 16px" : "0px",
    background: items.length === 0 ? "rgba(30, 31, 34, 0.5)" : "transparent",
    border: items.length === 0 ? "1px dashed rgba(255, 255, 255, 0.08)" : "1px solid transparent",
    borderRadius: "8px",
    minHeight: items.length === 0 ? "90px" : "auto",
    transition: "all 0.3s ease"
  };

  if (isDraggingOver) {
    dropZoneStyle.background = `rgba(${themeColorRGB}, 0.1)`;
    dropZoneStyle.border = `1px dashed rgb(${themeColorRGB})`;
  } else if (isDraggingGlobal) {
    dropZoneStyle.border = `1px dashed rgba(${themeColorRGB}, 0.4)`;
    dropZoneStyle.background = `rgba(${themeColorRGB}, 0.02)`;
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* IMPROVED: Color-coded subtle label accent */}
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColorHex }} />
          <p
            className="text-[12px] font-extrabold uppercase tracking-wider"
            style={{ color: "#F2F3F5", fontFamily: "'Inter', sans-serif" }}
          >
            {label}
          </p>
          {type === "give" && (
            <span className="px-1.5 py-[2px] bg-white/5 rounded-[4px] text-[9px] font-semibold text-[#80848E]">
              Press /
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <button
              className="text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] rounded-[3px] px-1"
              style={{ color: "#80848E" }}
              onClick={onClear}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ed4245")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#80848E")}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-[6px] focus-within:ring-2 focus-within:ring-[#5865F2]"
          style={{
            background: "#1E1F22",
            border: open ? `1px solid ${accentColorHex}66` : "1px solid transparent",
            transition: "all 0.15s",
          }}
        >
          <Search style={{ width: 14, height: 14, color: "#80848E", flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            placeholder={`Search units for ${label.toLowerCase()}...`}
            className="flex-1 bg-transparent outline-none text-[13px] font-medium"
            style={{ color: "#DBDEE1", fontFamily: "'Inter', sans-serif", caretColor: accentColorHex }}
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
              className="flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] rounded-[3px]"
              style={{ color: "#80848E" }}
              onMouseDown={(e) => { e.preventDefault(); setQuery(""); }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        {open && results.length > 0 && (
          <div
            className="absolute left-0 right-0 mt-1 rounded-[8px] overflow-hidden"
            style={{
              background: "#2B2D31",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 16px rgba(0,0,0,0.24)",
              zIndex: 999999,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <p
              className="px-3 pt-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "#949BA4", fontFamily: "'Inter', sans-serif" }}
            >
              Quick Add
            </p>
            {results.map((u, i) => {
              const dropCfg = u?.status ? GRID_STATUS_CFG[u.status as keyof typeof GRID_STATUS_CFG] : null;
              const isSelected = i === selectedIndex;
              const proxyUrl = getProxyImage(u.id, u.imageUrl);

              return (
                <button
                  key={u.id}
                  onClick={() => handleAdd(u)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left focus-visible:outline-none ${isSelected ? 'bg-[rgba(255,255,255,0.06)]' : 'bg-transparent hover:bg-[rgba(255,255,255,0.04)]'}`}
                  style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div
                    className="flex-shrink-0 rounded-[4px] flex items-center justify-center relative overflow-hidden"
                    style={{ width: 32, height: 32, background: "#111214", border: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    {proxyUrl ? (
                      <img 
                        src={proxyUrl} 
                        alt={u.name} 
                        className="absolute inset-0 w-full h-full"
                        style={{ objectFit: "cover", objectPosition: "center 15%" }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-[11px]" style={getAvatarStyle(u.name)}>
                        {getInitials(u.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-[1px]">
                      <p className="text-[13px] font-medium leading-tight truncate" style={{ color: "#DBDEE1", fontFamily: "'Inter', sans-serif" }}>
                        <HighlightedText text={u.name} query={query} />
                      </p>
                      {dropCfg && (
                        <div
                          className="flex-shrink-0 flex items-center px-1.5 py-[1.5px] rounded-[4px]"
                          style={{ background: dropCfg.bg, border: `1px solid ${dropCfg.border}` }}
                        >
                          <span className="text-[8px] font-bold leading-none uppercase tracking-wide" style={{ color: dropCfg.color, fontFamily: "'Inter', sans-serif" }}>
                            {dropCfg.label}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-medium leading-tight mt-[1px] truncate" style={{ color: "#949BA4", fontFamily: "'Inter', sans-serif" }}>
                      <HighlightedText text={u.subtitle} query={query} />
                    </p>
                  </div>
                  <span className="text-[12px] font-bold flex-shrink-0" style={{ color: "#B5BAC1", fontFamily: "'JetBrains Mono', monospace" }}>
                    {typeof u.value === "number" ? u.value.toLocaleString() : u.value === "owner" ? "O/C" : u.valueDisplay || "???"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={dropZoneStyle} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className="flex flex-col justify-center">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center pointer-events-none gap-2 opacity-80">
            <Plus style={{ width: 24, height: 24, color: isDraggingOver ? `rgb(${themeColorRGB})` : "#80848E" }} />
            <p className="text-[12px] font-medium" style={{ color: isDraggingOver ? `rgb(${themeColorRGB})` : "#80848E", fontFamily: "'Inter', sans-serif" }}>
              {isDraggingOver ? "Drop to add" : `Search or drop units for ${label.toLowerCase()}`}
            </p>
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