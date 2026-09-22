import { memo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ArrowUpCircle, ArrowDownCircle, History, ArrowDown, ArrowUp, Loader2, Package, Check } from "lucide-react";
import { PopupUnit, MasterUnit } from "../../../types";
import { GRID_STATUS_CFG, getTier, TIER_CONFIG, getProxyImage, handleImageError } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils"; 
import { useTradeStore } from "../../../store/useTradeStore";
import { useHistoryModalStore } from "../../../store/useHistoryModalStore";
import { triggerHaptic } from "../../../data/helpers";
import { HighlightText, StatusIcon, JargonWrap } from "./UnitGrid";
import { useAuthStore } from "../../../store/useAuthStore";
import { useInventoryStore } from "../../../store/useInventoryStore";
import { getUnitConservativeValue } from "../InventoryChannel/inventoryUtils";

export const getStatColor = (label: string, value: number | string) => {
  if (label === "R") {
    const numVal = Number(value) || 0;
    if (numVal >= 19) return "#4DB6AC";
    if (numVal >= 9) return "#81C784";
    if (numVal >= 6) return "#FFB74D";
    return "var(--destructive)";
  }
  if (label === "L") {
    const stringVal = String(value).toLowerCase();
    if (stringVal === "high") return "#4DB6AC";
    if (stringVal === "average") return "var(--muted-foreground)";
    return "var(--destructive)";
  }
  return "var(--foreground)";
};

export const getGridCols = (isCompact: boolean) => 
  isCompact 
    ? "md:grid-cols-[minmax(200px,1.2fr)_140px_60px_70px_minmax(200px,2fr)]" 
    : "md:grid-cols-[60px_minmax(200px,1.2fr)_140px_60px_70px_minmax(200px,2fr)]";

export const ListHeaderRow = memo(function ListHeaderRow({ sortMode, setSortMode, viewMode }: { sortMode: string, setSortMode: (s: string) => void, viewMode: string }) {
  const isCompact = viewMode === "compact";

  const handleSort = (key: string) => {
    if (key === 'value') setSortMode(sortMode === 'value-desc' ? 'value-asc' : 'value-desc');
    if (key === 'rarity') setSortMode('rarity-desc'); 
    if (key === 'liquidity') setSortMode(sortMode === 'liq-desc' ? 'liq-asc' : 'liq-desc');
  };

  const getSortIcon = (key: string) => {
    if (sortMode === `${key}-desc`) return <ArrowDown className="w-3.5 h-3.5 text-foreground ml-1" />;
    if (sortMode === `${key}-asc`) return <ArrowUp className="w-3.5 h-3.5 text-foreground ml-1" />;
    return null;
  };

  return (
    <div className={`hidden md:grid ${getGridCols(isCompact)} items-stretch bg-card text-muted-foreground text-[10px] font-bold uppercase tracking-widest select-none w-full border-y border-border sticky top-0 z-20`}>
      {!isCompact && <div className="px-3 py-3 flex items-center justify-center">Icon</div>}
      <div className="px-3 py-3 flex items-center justify-start border-l border-border">Units</div>

      <button 
        onClick={() => handleSort('value')}
        className={`px-3 py-3 flex items-center justify-end border-l border-border transition-colors hover:bg-muted cursor-pointer focus-visible:outline-none ${sortMode.includes('value') ? 'text-foreground bg-popover' : 'hover:text-foreground'}`}
      >
        Value {getSortIcon('value')}
      </button>

      <button 
        onClick={() => handleSort('rarity')}
        title="Rarity (0-20)"
        className={`px-2 py-3 flex items-center justify-center border-l border-border transition-colors hover:bg-muted cursor-pointer focus-visible:outline-none ${sortMode.includes('rarity') ? 'text-foreground bg-popover' : 'hover:text-foreground'}`}
      >
        R {getSortIcon('rarity')}
      </button>

      <button 
        onClick={() => handleSort('liq')}
        title="Liquidity (Low/Avg/High)"
        className={`px-2 py-3 flex items-center justify-center border-l border-border transition-colors hover:bg-muted cursor-pointer focus-visible:outline-none ${sortMode.includes('liq') ? 'text-foreground bg-popover' : 'hover:text-foreground'}`}
      >
        Liq {getSortIcon('liq')}
      </button>

      <div className="px-3 py-3 flex items-center justify-start border-l border-border">Notices</div>
    </div>
  );
});

export const UnitListRow = memo(function UnitListRow({ unit, isLast, searchQuery, viewMode }: { unit: MasterUnit; isLast: boolean; searchQuery?: string, viewMode: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addCard = useTradeStore(state => state.addCard);
  const openModal = useHistoryModalStore(state => state.openModal);

  const profile = useAuthStore(state => state.profile);
  const addOrUpdateUnit = useInventoryStore(state => state.addOrUpdateUnit);

  const numericValue = typeof unit.value === "number" 
    ? unit.value 
    : typeof unit.valueMin === "number" && unit.valueMin > 0 
      ? unit.valueMin 
      : 0;

  const popupUnit: PopupUnit = { 
    id: unit.id, 
    name: unit.name, 
    subtitle: unit.subtitle, 
    value: numericValue 
  };

  const sCfg = unit.status ? GRID_STATUS_CFG[unit.status] : null;
  const proxyUrl = getProxyImage(unit.id, unit.imageUrl);
  const isCompact = viewMode === "compact";

  const obtainability = (() => {
    const lowerName = (unit.name || "").toLowerCase();
    const lowerNotice = (unit.notice || "").toLowerCase();
    const subCat = (unit.subCategory || "").toLowerCase();

    if (lowerNotice.includes("(unobtainable)") || lowerNotice.includes("[unobtainable]")) return "UNOB";
    if (lowerNotice.includes("(obtainable)") || lowerNotice.includes("[obtainable]")) return "OBN";

    if (unit.tier === "Oddities" || subCat.includes("gamepass") || lowerName.includes("premium pass") || lowerName.includes("star pass")) return "OBN";
    if (unit.tier === "C" && lowerNotice.includes("banner") && !lowerName.includes("snowman")) return "OBN";
    if (lowerNotice.includes("capsule")) return "OBN";

    if (/\bobtainable\b/.test(lowerNotice.replace(/unobtainable/g, ''))) return "OBN";

    return "UNOB";
  })();

  const handleAdd = (type: "give" | "get") => {
    addCard(type, { ...popupUnit, qty: 1 });
    window.dispatchEvent(new CustomEvent("trade-added", { detail: { name: popupUnit.name, type } }));
    setMenuOpen(false);
  };

  const handleSaveToInventory = async () => {
    if (!profile) {
      alert("Please log in with Discord first to save items to your inventory.");
      return;
    }
    setIsSaving(true);
    try {
      await addOrUpdateUnit(profile.id, unit.id, 1);
    } finally {
      setIsSaving(false);
      setMenuOpen(false);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("unit", JSON.stringify(popupUnit));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleRowClick = () => {
    triggerHaptic('light');
    setMenuOpen(true);
  };

  const valDisplay = unit.tier === "Untiered"
    ? <span className="text-[13px] md:text-[14px] font-bold tracking-tight text-muted-foreground font-mono">N/A</span>
    : unit.value === "owner" || unit.valueDisplay === "Owner's Choice" || unit.valueDisplay === "O/C"
      ? <span className="text-[12px] font-bold tracking-tight bg-foreground text-background px-1.5 py-0.5 rounded-[2px] font-mono"><JargonWrap title="Owner's Choice (O/C)" tip="This unit is so rare the owner dictates the price. Value depends entirely on what they want.">Owner's Choice</JargonWrap></span>
      : unit.valueDisplay 
        ? <span className="text-[12.5px] md:text-[13.5px] font-bold tracking-tight text-foreground font-mono">{unit.valueDisplay}</span>
        : <span className="text-[13px] md:text-[14px] font-bold tracking-tight text-foreground font-mono">{(unit.value as number).toLocaleString()}</span>;

  const liqString = unit.liquidity || "Average";
  const liqDisplay = liqString.toLowerCase() === "black marketed" ? "BM" : liqString.substring(0, 3).toUpperCase();

  return (
    <>
      <div className={`relative w-full overflow-hidden bg-card ${isLast ? '' : 'border-b border-border'}`}>
        <div
          draggable
          onDragStart={handleDragStart}
          onClick={handleRowClick}
          onContextMenu={(e) => e.preventDefault()}
          className={`relative flex flex-col md:grid ${getGridCols(isCompact)} items-stretch cursor-pointer select-none bg-card hover:bg-muted z-10 will-change-transform transition-colors duration-100`}
        >
          {/* ICON COLUMN */}
          {!isCompact && (
            <div className="hidden md:flex px-3 py-2 items-center justify-center border-r border-border bg-card">
              <div className="relative w-8 h-8 rounded-[2px] overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[10px] z-0" style={getAvatarStyle(unit.name)}>
                  {getInitials(unit.name)}
                </div>
                <img 
                  src={proxyUrl || undefined} 
                  alt={unit.name} 
                  loading="lazy" 
                  decoding="async" 
                  onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                  className="absolute inset-0 w-full h-full object-cover z-10 bg-transparent" 
                />
              </div>
            </div>
          )}

          {/* MOBILE VIEW HEADERS */}
          <div className="flex md:hidden items-center justify-between w-full px-4 py-3">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="relative w-10 h-10 rounded-[2px] overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[12px] z-0" style={getAvatarStyle(unit.name)}>
                  {getInitials(unit.name)}
                </div>
                <img 
                  src={proxyUrl || undefined} 
                  alt={unit.name} 
                  loading="lazy" 
                  decoding="async" 
                  onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                  className="absolute inset-0 w-full h-full object-cover z-10 bg-transparent" 
                />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[14px] font-extrabold tracking-tight text-foreground truncate">
                  <HighlightText text={unit.name} query={searchQuery} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider leading-none text-muted-foreground truncate mt-1">
                  <HighlightText text={unit.subtitle || ""} query={searchQuery} />
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 text-right">{valDisplay}</div>
          </div>

          <div className={`hidden md:flex flex-col justify-center min-w-0 px-3 border-r border-border bg-card ${isCompact ? 'py-1' : 'py-2'}`}>
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-extrabold tracking-tight text-foreground truncate">
                <HighlightText text={unit.name} query={searchQuery} />
              </span>
              {!isCompact && unit.subtitle && (
                <span className="text-[10px] font-bold uppercase tracking-wider leading-none text-muted-foreground truncate">
                  <HighlightText text={unit.subtitle} query={searchQuery} />
                </span>
              )}
            </div>
            {!isCompact && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {obtainability === "UNOB" ? (
                  <span className="text-[10px] font-bold uppercase text-muted-foreground bg-popover px-1.5 py-[2px] rounded-[2px] border border-border tracking-widest leading-none">
                    <JargonWrap title="Unobtainable (UNOB)" tip="This unit can no longer be acquired through normal gameplay. Trading is the only way to get it.">
                      UNOB
                    </JargonWrap>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase text-foreground bg-popover px-1.5 py-[2px] rounded-[2px] border border-border tracking-widest leading-none">
                    <JargonWrap title="Obtainable (OBN)" tip="This unit can still be acquired in-game through summons, capsules, or evolution.">
                      OBN
                    </JargonWrap>
                  </span>
                )}
              </div>
            )}
          </div>

          <div 
            className={`hidden md:flex px-3 border-r border-border items-center justify-end relative ${isCompact ? 'py-1' : 'py-2'}`}
            style={{
              background: sCfg ? sCfg.bg : 'var(--card)',
              borderColor: sCfg ? sCfg.border : 'var(--border)'
            }}
          >
            {valDisplay}
          </div>

          <div className={`hidden md:flex px-2 border-r border-border bg-card items-center justify-center font-mono font-bold text-[12px] ${isCompact ? 'py-1' : 'py-2'}`} style={{ color: getStatColor("R", unit.rarity) }}>
            {unit.rarity}
          </div>
          <div className={`hidden md:flex px-2 border-r border-border bg-card items-center justify-center font-mono font-bold text-[12px] ${isCompact ? 'py-1' : 'py-2'}`} style={{ color: getStatColor("L", liqString) }}>
            {liqDisplay === "BM" ? (
              <JargonWrap title="Black Marketed (BM)" tip="This unit's value is heavily manipulated by outside-game currency trades. Highly risky.">
                BM
              </JargonWrap>
            ) : liqDisplay}
          </div>

          <div className={`hidden md:flex px-3 items-center min-w-0 bg-card relative ${isCompact ? 'py-1' : 'py-2'}`}>
            {unit.notice ? <span className="text-[11.5px] font-medium text-muted-foreground line-clamp-2 leading-snug">{unit.notice}</span> : <span className="text-[11.5px] font-medium text-muted-foreground italic">No notes</span>}
          </div>

          <div className="flex md:hidden items-center justify-between w-full px-4 pb-3 relative min-h-[28px]">
            <div className="flex items-center gap-2 text-[12px] font-mono">
              <span className="text-muted-foreground">R <span style={{ color: getStatColor("R", unit.rarity) }}>{unit.rarity}</span></span>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">L <span style={{ color: getStatColor("L", liqString) }}>
                {liqDisplay === "BM" ? <JargonWrap title="Black Marketed (BM)" tip="This unit's value is heavily manipulated by outside-game currency trades. Highly risky.">BM</JargonWrap> : liqDisplay}
              </span></span>
            </div>
            {unit.notice && <div className="flex-1 px-3 text-[11px] text-muted-foreground italic leading-snug truncate z-10">{unit.notice}</div>}
          </div>
        </div>
      </div>

      {menuOpen && createPortal(
        <div className="fixed inset-0 z-[1000000] flex flex-col justify-end md:justify-center md:items-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="relative w-full md:max-w-sm bg-popover rounded-t-[12px] md:rounded-[6px] p-5 shadow-2xl border-t md:border border-border">

            <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border rounded-full" />

            <div className="flex items-center justify-between mb-5 mt-2 md:mt-0">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className="w-12 h-12 rounded-[4px] overflow-hidden bg-muted border border-border shrink-0 relative">
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[14px] z-0" style={getAvatarStyle(unit.name)}>
                    {getInitials(unit.name)}
                  </div>
                  <img src={proxyUrl || undefined} alt={unit.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-transparent" onError={(e) => handleImageError(e, unit.id)} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[16px] font-black text-foreground tracking-tight truncate">{unit.name}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{unit.subtitle}</span>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="w-11 h-11 md:w-8 md:h-8 rounded-[4px] border border-transparent hover:border-border hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0 focus-visible:outline-none">
                <X className="w-6 h-6 md:w-4 md:h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={() => handleAdd("give")} className="w-full flex items-center justify-center gap-2 bg-[#FAA61A] hover:bg-[#d98b14] transition-colors text-white text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none">
                <ArrowUpCircle className="w-4 h-4" /> Add to 'You Give'
              </button>
              <button onClick={() => handleAdd("get")} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 transition-colors text-primary-foreground text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none">
                <ArrowDownCircle className="w-4 h-4" /> Add to 'You Get'
              </button>
              <button onClick={handleSaveToInventory} disabled={isSaving} className="w-full flex items-center justify-center gap-2 bg-[#23a559] hover:bg-[#1f914e] disabled:opacity-50 transition-colors text-white text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} 
                {isSaving ? "Saving..." : "Save to My Inventory"}
              </button>
              <button onClick={() => { setMenuOpen(false); openModal(unit.id); }} className="w-full flex items-center justify-center gap-2 bg-card hover:bg-muted transition-colors text-foreground border border-border text-[13px] font-bold h-[44px] rounded-[4px] mt-0.5 focus-visible:outline-none">
                <History className="w-4 h-4" /> View Market History
              </button>
            </div>

            <div className="w-full h-[env(safe-area-inset-bottom)] md:hidden mt-2" />
          </div>
        </div>,
        document.body
      )}
    </>
  );
});