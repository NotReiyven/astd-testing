import { memo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ArrowUpCircle, ArrowDownCircle, History } from "lucide-react";
import { PopupUnit, MasterUnit } from "../../../types";
import { GRID_STATUS_CFG, getTier, TIER_CONFIG, getProxyImage } from "../../../data";
import { getAvatarStyle, getInitials, handleImageError } from "../TradeAnalyzer/summaryUtils"; 
import { useTradeStore } from "../../../store/useTradeStore";
import { useHistoryModalStore } from "../../../store/useHistoryModalStore";
import { triggerHaptic } from "../../../data/helpers";

export const getStatColor = (label: string, value: number | string) => {
  if (label === "R") {
    const numVal = Number(value) || 0;
    if (numVal >= 19) return "#4DB6AC";
    if (numVal >= 9) return "#81C784";
    if (numVal >= 6) return "#FFB74D";
    return "#E57373";
  }
  if (label === "L") {
    const stringVal = String(value).toLowerCase();
    if (stringVal === "high") return "#4DB6AC";
    if (stringVal === "average") return "#B5BAC1";
    return "#E57373";
  }
  return "#DBDEE1";
};

const GRID_COLS = "md:grid-cols-[60px_minmax(200px,1.2fr)_140px_60px_70px_minmax(200px,2fr)]";

export const ListHeaderRow = memo(function ListHeaderRow() {
  return (
    <div className={`hidden md:grid ${GRID_COLS} items-stretch bg-[#18191C] text-[#80848E] text-[10px] font-black uppercase tracking-widest select-none w-full border-y border-[rgba(255,255,255,0.06)] shadow-sm sticky top-0 z-20`}>
      <div className="px-3 py-3 flex items-center justify-center">Icon</div>
      <div className="px-3 py-3 flex items-center justify-start border-l border-[rgba(255,255,255,0.02)]">Units</div>
      <div className="px-3 py-3 flex items-center justify-end border-l border-[rgba(255,255,255,0.02)]">Value</div>
      <div className="px-2 py-3 flex items-center justify-center border-l border-[rgba(255,255,255,0.02)]" title="Rarity (0-20)">R</div>
      <div className="px-2 py-3 flex items-center justify-center border-l border-[rgba(255,255,255,0.02)]" title="Liquidity (Low/Avg/High)">Liq</div>
      <div className="px-3 py-3 flex items-center justify-start border-l border-[rgba(255,255,255,0.02)]">Notices</div>
    </div>
  );
});

export const UnitListRow = memo(function UnitListRow({ unit, isLast }: { unit: MasterUnit; isLast: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const addCard = useTradeStore(state => state.addCard);
  const openModal = useHistoryModalStore(state => state.openModal);

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
  const tierKey = getTier(unit);
  const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "#5865F2";
  const proxyUrl = getProxyImage(unit.id, unit.imageUrl);

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

  const triggerAddedGlow = () => {
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 200);
  };

  const handleAdd = (type: "give" | "get") => {
    addCard(type, { ...popupUnit, qty: 1 });
    window.dispatchEvent(new CustomEvent("trade-added", { detail: { name: popupUnit.name, type } }));
    triggerAddedGlow();
    setMenuOpen(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("unit", JSON.stringify(popupUnit));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleRowClick = () => {
    triggerHaptic('light');
    setMenuOpen(true);
  };

  const valDisplay = tierKey === "Untiered"
    ? <span className="text-[13px] md:text-[14px] font-bold tracking-tight text-[#80848E] font-mono">N/A</span>
    : unit.value === "owner" || unit.valueDisplay === "Owner's Choice" || unit.valueDisplay === "O/C"
      ? <span className="text-[12.5px] md:text-[13.5px] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 font-mono">Owner's Choice</span>
      : unit.valueDisplay 
        ? <span className="text-[12.5px] md:text-[13.5px] font-bold tracking-tight text-[#DBDEE1] font-mono">{unit.valueDisplay}</span>
        : <span className="text-[13px] md:text-[14px] font-bold tracking-tight text-[#F2F3F5] font-mono">{(unit.value as number).toLocaleString()}</span>;
  const liqString = unit.liquidity || "Average";
  const liqDisplay = liqString.toLowerCase() === "black marketed" ? "BM" : liqString.substring(0, 3).toUpperCase();

  return (
    <>
      <div className={`relative group w-full overflow-hidden bg-[#2B2D31] ${isLast ? '' : 'border-b border-[rgba(255,255,255,0.03)]'}`} style={{ contentVisibility: "auto", containIntrinsicSize: "56px" }}>
        <div
          draggable
          onDragStart={handleDragStart}
          onClick={handleRowClick}
          onContextMenu={(e) => e.preventDefault()}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`relative flex flex-col md:grid ${GRID_COLS} items-stretch cursor-pointer select-none even:bg-[rgba(255,255,255,0.015)] bg-[#2B2D31] hover:bg-[rgba(255,255,255,0.04)] z-10 will-change-transform`}
          style={{ 
            background: isAdded ? `${tierColor}40` : "",
            transform: isAdded ? "scale(0.98)" : "scale(1)",
            transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease",
          }}
        >
          <div className="hidden md:flex px-3 py-2 items-center justify-center">
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#111214] border border-[rgba(255,255,255,0.08)] shadow-sm flex-shrink-0 flex items-center justify-center" style={{ borderColor: hovered ? `${tierColor}60` : "rgba(255,255,255,0.08)", transition: "border-color 0.3s ease" }}>
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[10px] z-0" style={getAvatarStyle(unit.name)}>
                {getInitials(unit.name)}
              </div>
              <img 
                src={proxyUrl} 
                alt={unit.name} 
                loading="lazy" 
                decoding="async" 
                onError={(e) => handleImageError(e, unit.id, unit.imageUrl)}
                className="absolute inset-0 w-full h-full object-cover animate-fade-in z-10 bg-[#111214]" 
              />
            </div>
          </div>

          <div className="flex md:hidden items-center justify-between w-full px-4 py-3">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#111214] border shadow-sm flex-shrink-0 flex items-center justify-center" style={{ borderColor: hovered ? `${tierColor}60` : "rgba(255,255,255,0.08)" }}>
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[12px] z-0" style={getAvatarStyle(unit.name)}>
                  {getInitials(unit.name)}
                </div>
                <img 
                  src={proxyUrl} 
                  alt={unit.name} 
                  loading="lazy" 
                  decoding="async" 
                  onError={(e) => handleImageError(e, unit.id, unit.imageUrl)}
                  className="absolute inset-0 w-full h-full object-cover animate-fade-in z-10 bg-[#111214]" 
                />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[14px] font-extrabold tracking-tight text-[#F2F3F5] truncate">{unit.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider leading-none text-[#949BA4] truncate mt-1">{unit.subtitle}</span>
              </div>
            </div>
            <div className="flex-shrink-0 text-right">{valDisplay}</div>
          </div>

          <div className="hidden md:flex flex-col justify-center min-w-0 px-3 py-2 border-l border-r border-[rgba(255,255,255,0.03)]">
            <span className="text-[13.5px] font-extrabold tracking-tight text-[#F2F3F5] truncate transition-colors duration-300" style={{ color: hovered ? "#FFF" : "#F2F3F5" }}>{unit.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider leading-none text-[#949BA4] truncate mt-1 mb-1.5">{unit.subtitle}</span>
            <div className="flex items-center gap-1.5">
              {obtainability === "UNOB" ? (
                <span className="text-[8px] font-bold uppercase text-[#949BA4] bg-[#1E1F22] px-1.5 py-[2px] rounded-[3px] border border-[rgba(255,255,255,0.05)] tracking-widest leading-none">UNOB</span>
              ) : (
                <span className="text-[8px] font-bold uppercase text-[#DBDEE1] bg-[rgba(255,255,255,0.05)] px-1.5 py-[2px] rounded-[3px] border border-[rgba(255,255,255,0.1)] tracking-widest leading-none">OBN</span>
              )}
            </div>
          </div>

          <div 
            className="hidden md:flex px-3 py-2 border-r border-[rgba(255,255,255,0.03)] items-center justify-end relative transition-colors"
            style={{
              background: sCfg ? sCfg.bg : 'transparent',
              borderColor: sCfg ? sCfg.border : undefined
            }}
          >
            <div className="group-hover:opacity-0 transition-opacity duration-300">
              {valDisplay}
            </div>
            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-center justify-end pr-3 inset-0">
              <span className="text-[10px] font-black text-[#DBDEE1] drop-shadow-md">Click for Options</span>
            </div>
          </div>

          <div className="hidden md:flex px-2 py-2 border-r border-[rgba(255,255,255,0.03)] items-center justify-center font-mono font-bold text-[12px]" style={{ color: getStatColor("R", unit.rarity) }}>
            {unit.rarity}
          </div>
          <div className="hidden md:flex px-2 py-2 border-r border-[rgba(255,255,255,0.03)] items-center justify-center font-mono font-bold text-[12px]" style={{ color: getStatColor("L", liqString) }}>
            {liqDisplay}
          </div>

          <div className="hidden md:flex px-3 py-2 items-center min-w-0">
            {unit.notice ? <span className="text-[11.5px] font-medium text-[#B5BAC1] line-clamp-2 leading-snug">{unit.notice}</span> : <span className="text-[11.5px] font-medium text-[#4e5058] italic">No notes</span>}
          </div>

          <div className="flex md:hidden items-center justify-between w-full px-4 pb-3 relative min-h-[28px]">
            <div className="flex items-center gap-2 text-[12px] font-mono">
              <span className="text-[#80848E]">R <span style={{ color: getStatColor("R", unit.rarity) }}>{unit.rarity}</span></span>
              <span className="text-[#3F4147]">|</span>
              <span className="text-[#80848E]">L <span style={{ color: getStatColor("L", liqString) }}>{liqDisplay}</span></span>
            </div>
            {unit.notice && <div className="flex-1 px-3 text-[11px] text-[#949BA4] italic leading-snug truncate">{unit.notice}</div>}
          </div>
        </div>
      </div>

      {menuOpen && createPortal(
        <div className="fixed inset-0 z-[1000000] flex flex-col justify-end md:justify-center md:items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="relative w-full md:max-w-sm bg-[#1E1F22] rounded-t-[20px] md:rounded-[20px] p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] md:shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-slide-up md:animate-fade-in border-t md:border border-[rgba(255,255,255,0.08)]">
            
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className="w-12 h-12 rounded-[10px] overflow-hidden bg-[#111214] border border-[rgba(255,255,255,0.1)] shadow-sm shrink-0 relative">
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[14px] z-0" style={getAvatarStyle(unit.name)}>
                    {getInitials(unit.name)}
                  </div>
                  <img src={proxyUrl} alt={unit.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-[#111214]" onError={(e) => handleImageError(e, unit.id, unit.imageUrl)} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[16px] font-black text-[#F2F3F5] tracking-tight truncate">{unit.name}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#949BA4] truncate">{unit.subtitle}</span>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#949BA4] shrink-0 active:scale-90 hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={() => handleAdd("give")} className="w-full flex items-center justify-center gap-2 bg-[#FAA61A] hover:bg-[#d98b14] transition-colors text-white text-[15px] font-bold h-[48px] rounded-[10px] active:scale-[0.98] shadow-md">
                <ArrowUpCircle className="w-5 h-5" /> Add to 'You Give'
              </button>
              <button onClick={() => handleAdd("get")} className="w-full flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] transition-colors text-white text-[15px] font-bold h-[48px] rounded-[10px] active:scale-[0.98] shadow-md">
                <ArrowDownCircle className="w-5 h-5" /> Add to 'You Get'
              </button>
              <button onClick={() => { setMenuOpen(false); openModal(unit.id); }} className="w-full flex items-center justify-center gap-2 bg-[#2B2D31] hover:bg-[#3F4147] transition-colors text-[#DBDEE1] border border-[rgba(255,255,255,0.08)] text-[14px] font-bold h-[48px] rounded-[10px] active:scale-[0.98] mt-1">
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