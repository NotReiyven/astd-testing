import { useState, useRef, memo, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, ArrowUpCircle, ArrowDownCircle, History,
  ChevronsUp, ChevronsDown, Activity, TrendingUp, TrendingDown, Flame, Lock, EyeOff, Package
} from "lucide-react";
import { PopupUnit, GridUnit, MasterUnit, UnitStatus } from "../../../types";
import { GRID_STATUS_CFG, getRarityLabel, LIQUIDITY_SCALE, getTier, TIER_CONFIG, getProxyImage, getObtainability, handleImageError } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils"; 
import { useTradeStore } from "../../../store/useTradeStore";
import { useHistoryModalStore } from "../../../store/useHistoryModalStore";
import { triggerHaptic } from "../../../data/helpers";
import { useAuthStore } from "../../../store/useAuthStore";
import { useInventoryStore } from "../../../store/useInventoryStore";

export function JargonWrap({ title, tip, children }: { title: string; tip: string; children: React.ReactNode }) {
  const btnRef = useRef<HTMLSpanElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => setTipPos(null);
  }, []);

  const toggleTip = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (tipPos) {
       setTipPos(null);
    } else {
       const r = btnRef.current?.getBoundingClientRect();
       if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
    }
  };

  return (
    <span
      ref={btnRef}
      className="cursor-help border-b border-dashed border-[rgba(255,255,255,0.4)] hover:border-[rgba(255,255,255,0.8)] transition-colors relative z-50"
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) toggleTip();
      }}
      onMouseLeave={() => setTipPos(null)}
      onClick={toggleTip}
    >
      {children}
      {tipPos && createPortal(
        <>
          <div className="md:hidden fixed inset-0 z-[99998]" onClick={(e) => { e.stopPropagation(); setTipPos(null); }} onTouchStart={(e) => { e.stopPropagation(); setTipPos(null); }} />
          <div className="rounded-[8px] px-3 py-2.5 pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.6)]" style={{ top: tipPos.y, left: tipPos.x, minWidth: 200, maxWidth: 240, background: "#111214", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[12px] font-bold text-[#F2F3F5] mb-0.5">{title}</p>
            <p className="text-[11px] font-medium leading-snug text-[#DBDEE1] whitespace-normal" style={{ fontFamily: "'Inter', sans-serif" }}>{tip}</p>
          </div>
        </>,
        document.body
      )}
    </span>
  );
}

export const HighlightText = memo(({ text, query }: { text: string; query?: string }) => {
  if (!query || !text) return <>{text}</>;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <span key={i} className="bg-[rgba(250,166,26,0.35)] text-[#FAA61A] rounded-[2px]">{part}</span> 
          : <span key={i}>{part}</span>
      )}
    </>
  );
});

export function StatusIcon({ status }: { status?: string | null }) {
  if (!status) return null;
  const lower = status.toLowerCase();
  const sz = "w-3 h-3 shrink-0";
  
  if (lower === "rising") return <ChevronsUp className={sz} />;
  if (lower === "dropping") return <ChevronsDown className={sz} />;
  if (lower === "unstable") return <Activity className={sz} />;
  if (lower === "inflated") return <TrendingUp className={sz} />;
  if (lower === "deflated") return <TrendingDown className={sz} />;
  if (lower === "highballed") return <ArrowUpCircle className={sz} />;
  if (lower === "hyped") return <Flame className={sz} />;
  if (lower === "gatekept") return <Lock className={sz} />;
  if (lower === "black-marketed") return <EyeOff className={sz} />;
  
  if (lower === "stable") return <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">≈</span>;
  if (lower === "varies") return <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">↕</span>;
  if (lower === "lowballed") return <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">↓</span>;
  
  return null;
}

export const UnitGrid = memo(function UnitGrid({ units }: { units: MasterUnit[] }) {
  return (
    <div className="grid gap-3 sm:gap-5 w-full pb-3 sm:pb-5" style={{ gridTemplateColumns: window.innerWidth >= 768 ? "repeat(auto-fill, minmax(200px, 1fr))" : "repeat(auto-fill, minmax(min(100%, 155px), 1fr))" }}>
      {units.map((unit) => (
        <TierGridCard key={unit.id} unit={unit} />
      ))}
    </div>
  );
});

export const TierGridCard = memo(function TierGridCard({ unit, searchQuery }: { unit: GridUnit, searchQuery?: string }) {
  const [hovered, setHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false); 
  const [menuOpen, setMenuOpen] = useState(false);

  const addCard = useTradeStore(state => state.addCard);
  const openModal = useHistoryModalStore(state => state.openModal);

  const profile = useAuthStore(state => state.profile);
  const addOrUpdateUnit = useInventoryStore(state => state.addOrUpdateUnit);

  const handleSaveToInventory = () => {
    if (!profile) {
      alert("Please log in with Discord first to save items to your inventory.");
      return;
    }
    addOrUpdateUnit(profile.id, unit.id, 1);
    setMenuOpen(false);
  };

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

  const handleCardClick = () => {
    triggerHaptic('light');
    if (window.innerWidth < 768) {
      setMenuOpen(true);
    }
  };

  const tierKey = getTier(unit as MasterUnit);
  const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "#5865F2";
  const proxyUrl = getProxyImage(unit.id, unit.imageUrl);

  return (
    <>
      <div className="relative w-full overflow-hidden rounded-[8px] active:scale-[0.98] transition-transform duration-150 touch-manipulation">
        <div
          draggable
          onDragStart={handleDragStart}
          onClick={handleCardClick}
          onContextMenu={(e) => e.preventDefault()}
          className="flex flex-col h-full rounded-[8px] overflow-hidden cursor-pointer relative z-10 will-change-transform"
          style={{
            background: "#2B2D31",
            transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
            border: `1px solid ${isAdded ? tierColor : hovered ? `${tierColor}50` : "rgba(255,255,255,0.04)"}`,
            boxShadow: isAdded
              ? `0 0 20px ${tierColor}80, inset 0 0 15px ${tierColor}40`
              : hovered 
                ? `0 12px 24px -6px rgba(0,0,0,0.4), 0 0 20px -4px ${tierColor}30` 
                : "0 4px 12px rgba(0,0,0,0.1)",
            transform: isAdded ? "scale(0.95)" : hovered ? "translateY(-4px)" : "translateY(0)"
          }}
          onMouseEnter={() => {
            if (window.matchMedia('(hover: hover)').matches) setHovered(true);
          }}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="relative w-full overflow-hidden flex-shrink-0" style={{ aspectRatio: "1/1", transform: "translateZ(0)" }}>
            <div className="absolute inset-0 z-0" style={{ background: "linear-gradient(160deg, #383a3f 0%, #1E1F22 100%)" }} />

            <div className="absolute inset-0 flex items-center justify-center text-white font-black text-5xl md:text-7xl tracking-tight shadow-inner z-0" style={{ ...getAvatarStyle(unit.name), transform: hovered ? "scale(1.05)" : "scale(1)", transition: "transform 0.7s ease-out" }}>
              {getInitials(unit.name)}
            </div>

            <img 
              src={proxyUrl} 
              alt={unit.name} 
              loading="lazy" 
              decoding="async"
              onError={(e) => handleImageError(e, unit.id)}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out z-10 bg-[#1E1F22]" 
              style={{ objectPosition: "center 15%", transform: hovered ? "scale(1.05)" : "scale(1)", willChange: "transform" }} 
            />

            <div className="absolute inset-0 pointer-events-none z-20" style={{ background: "linear-gradient(to right, rgba(43,45,49,0.3) 0%, transparent 20%, transparent 80%, rgba(43,45,49,0.3) 100%)" }} />
            <div className="absolute -bottom-[2px] left-0 right-0 h-[calc(40%+2px)] md:h-[calc(45%+2px)] z-20" style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(43,45,49,0.8) 60%, rgba(43,45,49,1) 100%)" }} />
            
            {unit.status && (
              <div className="absolute top-2 left-2 md:top-3 md:left-3 z-50">
                <GridStatusBadge status={unit.status} />
              </div>
            )}

            <div className={`hidden md:flex absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-200 z-40 flex-col items-center justify-center gap-2 p-5 pt-10 md:pt-12 ${hovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <button onClick={(e) => { e.stopPropagation(); handleAdd("give"); }} className="w-full bg-[#FAA61A] hover:bg-[#d98b14] text-white text-[13px] font-bold py-2 rounded-[6px] transition-transform active:scale-95 shadow-md flex items-center justify-center gap-1.5">
                <ArrowUpCircle className="w-3.5 h-3.5" /> Give
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleAdd("get"); }} className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white text-[13px] font-bold py-2 rounded-[6px] transition-transform active:scale-95 shadow-md flex items-center justify-center gap-1.5">
                <ArrowDownCircle className="w-3.5 h-3.5" /> Get
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleSaveToInventory(); }} className="w-full bg-[#23a559] hover:bg-[#1f914e] text-white text-[12px] font-bold py-1.5 rounded-[6px] transition-transform active:scale-95 shadow-sm flex items-center justify-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={(e) => { e.stopPropagation(); openModal(unit.id); }} className="w-full bg-[#1E1F22] hover:bg-[#3F4147] text-[#DBDEE1] border border-[rgba(255,255,255,0.08)] text-[11px] font-bold py-1.5 rounded-[6px] transition-transform active:scale-95 shadow-sm flex items-center justify-center gap-1.5">
                <History className="w-3 h-3" /> History
              </button>
            </div>
          </div>

          <div className="flex flex-col flex-1 px-3 md:px-4 pt-3 md:pt-4 pb-3 md:pb-4 relative z-10 bg-[#2B2D31] -mt-[1px]" onClick={() => { if (window.innerWidth >= 768) setMenuOpen(true); }}>
            <div className="flex flex-col">
              <div className="flex items-start gap-2">
                <h3 className="text-[13px] md:text-[17px] font-extrabold tracking-tight leading-snug flex-1 min-w-0 line-clamp-2 text-[#F2F3F5]">
                  <HighlightText text={unit.name} query={searchQuery} />
                </h3>
                {unit.notice && <div className="mt-0.5 md:mt-1"><NoticeTooltip notice={unit.notice} /></div>}
              </div>
              <p className="text-[10px] md:text-[12px] font-bold uppercase tracking-wider leading-none mt-1 md:mt-1.5 truncate text-[#949BA4]">
                <HighlightText text={unit.subtitle || ""} query={searchQuery} />
              </p>
              <div className="flex mt-1.5 md:mt-2.5">
                {obtainability === "UNOB" ? (
                  <span className="text-[10px] md:text-[11px] font-bold uppercase text-[#949BA4] bg-[#1E1F22] px-1.5 md:px-2 py-0.5 md:py-1 rounded-[3px] border border-[rgba(255,255,255,0.05)] tracking-widest leading-none">
                    <JargonWrap title="Unobtainable (UNOB)" tip="This unit can no longer be acquired through normal gameplay. Trading is the only way to get it.">
                      UNOB
                    </JargonWrap>
                  </span>
                ) : (
                  <span className="text-[10px] md:text-[11px] font-bold uppercase text-[#DBDEE1] bg-[rgba(255,255,255,0.05)] px-1.5 md:px-2 py-0.5 md:py-1 rounded-[3px] border border-[rgba(255,255,255,0.1)] tracking-widest leading-none">
                    <JargonWrap title="Obtainable (OBN)" tip="This unit can still be acquired in-game through summons, capsules, or evolution.">
                      OBN
                    </JargonWrap>
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col mt-auto pt-3 md:pt-5 w-full">
              <div className="pl-2 md:pl-3 border-l-[3px] transition-colors duration-300 w-full min-w-0 mb-3 md:mb-4" style={{ borderColor: hovered ? tierColor : "#5865F2" }}>
                <GridValueDisplay unit={unit} />
              </div>

              <div className="hidden md:grid grid-cols-2 gap-2 md:gap-3 w-full">
                <GridStatBox label="RARITY" value={unit.rarity} type="rarity" />
                <GridStatBox label="LIQUIDITY" value={unit.liquidity || "Average"} type="liquidity" />
              </div>
            </div>
          </div>

          <div className="grid md:hidden grid-cols-2 gap-2 w-full px-3 pb-3 relative min-h-[28px] bg-[#2B2D31]">
             <GridStatBox label="RARITY" value={unit.rarity} type="rarity" />
             <GridStatBox label="LIQUIDITY" value={unit.liquidity || "Average"} type="liquidity" />
          </div>

        </div>
      </div>

      {menuOpen && createPortal(
        <div className="fixed inset-0 z-[1000000] flex flex-col justify-end md:justify-center md:items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="relative w-full md:max-w-sm bg-[#1E1F22] rounded-t-[24px] md:rounded-[20px] p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] md:shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-slide-up md:animate-fade-in border-t md:border border-[rgba(255,255,255,0.08)]">

            <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-[rgba(255,255,255,0.2)] rounded-full" />

            <div className="flex items-center justify-between mb-5 mt-2 md:mt-0">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className="w-12 h-12 rounded-[10px] overflow-hidden bg-[#111214] border border-[rgba(255,255,255,0.1)] shadow-sm shrink-0 relative">
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[14px] z-0" style={getAvatarStyle(unit.name)}>
                    {getInitials(unit.name)}
                  </div>
                  <img src={proxyUrl} alt={unit.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-[#111214]" onError={(e) => handleImageError(e, unit.id)} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[16px] font-black text-[#F2F3F5] tracking-tight truncate">{unit.name}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#949BA4] truncate">{unit.subtitle}</span>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#949BA4] shrink-0 active:scale-90 hover:bg-[rgba(255,255,255,0.1)] transition-colors focus-visible:outline-none">
                <X className="w-5 h-5 md:w-4 md:h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <button onClick={() => handleAdd("give")} className="w-full flex items-center justify-center gap-2 bg-[#FAA61A] hover:bg-[#d98b14] transition-colors text-white text-[14px] font-bold h-[48px] md:h-[44px] rounded-[10px] active:scale-[0.98] shadow-md focus-visible:outline-none">
                <ArrowUpCircle className="w-4 h-4" /> Add to 'You Give'
              </button>
              <button onClick={() => handleAdd("get")} className="w-full flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] transition-colors text-white text-[14px] font-bold h-[48px] md:h-[44px] rounded-[10px] active:scale-[0.98] shadow-md focus-visible:outline-none">
                <ArrowDownCircle className="w-4 h-4" /> Add to 'You Get'
              </button>
              <button onClick={handleSaveToInventory} className="w-full flex items-center justify-center gap-2 bg-[#23a559] hover:bg-[#1f914e] transition-colors text-white text-[14px] font-bold h-[48px] md:h-[44px] rounded-[10px] active:scale-[0.98] shadow-md focus-visible:outline-none">
                <Package className="w-4 h-4" /> Save to My Inventory
              </button>
              <button onClick={() => { setMenuOpen(false); openModal(unit.id); }} className="w-full flex items-center justify-center gap-2 bg-[#2B2D31] hover:bg-[#3F4147] transition-colors text-[#DBDEE1] border border-[rgba(255,255,255,0.08)] text-[13px] font-bold h-[48px] md:h-[44px] rounded-[10px] active:scale-[0.98] mt-0.5 focus-visible:outline-none">
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

function GridStatusBadge({ status }: { status: UnitStatus }) {
  const c = GRID_STATUS_CFG[status];
  if (!c) return null;
  const badgeRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => setTipPos(null);
  }, []);

  const toggleTip = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (tipPos) {
       setTipPos(null);
    } else {
       const r = badgeRef.current?.getBoundingClientRect();
       if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
    }
  };

  return (
    <div
      ref={badgeRef}
      className="relative inline-flex cursor-help"
      onMouseEnter={() => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        const r = badgeRef.current?.getBoundingClientRect();
        if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
      }}
      onMouseLeave={() => setTipPos(null)}
      onClick={toggleTip}
    >
      <div className="inline-flex items-center px-2 py-1 md:px-2.5 md:py-[5px] rounded-full shadow-sm gap-1" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
        <StatusIcon status={status} />
        <span className="text-[9px] md:text-[10px] font-bold tracking-wide border-b border-dashed border-[rgba(255,255,255,0.4)] hover:border-[rgba(255,255,255,0.8)] transition-colors">{c.label}</span>
      </div>
      {tipPos && createPortal(
        <>
          <div className="md:hidden fixed inset-0 z-[99998]" onClick={(e) => { e.stopPropagation(); setTipPos(null); }} onTouchStart={(e) => { e.stopPropagation(); setTipPos(null); }} />
          <div className="rounded-xl px-3 py-2 pointer-events-none fixed z-[99999] animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.6)]" style={{ top: tipPos.y, left: tipPos.x, minWidth: 210, maxWidth: 240, background: "#111214", border: `1px solid ${c.border}` }}>
            <p className="text-[11px] font-bold leading-snug text-[#F2F3F5]">{c.tip}</p>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function GridStatBox({ label, value, type }: { label: string; value: number | string; type: "rarity" | "liquidity" }) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => setTipPos(null);
  }, []);

  let tipTitle = ""; let tipBody = ""; 
  let textColor = "#DBDEE1";
  let displayValue = String(value);

  if (type === "rarity") {
    const numVal = Number(value) || 0;
    displayValue = numVal % 1 === 0 ? String(numVal) : numVal.toFixed(1);
    tipTitle = `Rarity ${displayValue} / 20`; 
    tipBody = getRarityLabel(numVal);
    if (numVal >= 19) textColor = "#4DB6AC"; else if (numVal >= 9) textColor = "#81C784"; else if (numVal >= 6) textColor = "#FFB74D"; else textColor = "#E57373";
  } else {
    const stringVal = String(value);
    const liqKey = stringVal.charAt(0).toUpperCase() + stringVal.slice(1).toLowerCase();
    displayValue = stringVal.toLowerCase() === "black marketed" ? "BM" : stringVal.toUpperCase();
    tipTitle = `Liquidity: ${liqKey}`; 
    tipBody = LIQUIDITY_SCALE[liqKey] ?? "Unknown trading difficulty.";

    if (liqKey === "High") textColor = "#4DB6AC"; 
    else if (liqKey === "Average") textColor = "#B5BAC1"; 
    else textColor = "#E57373";
  }

  const toggleTip = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (tipPos) {
       setTipPos(null);
    } else {
       const r = btnRef.current?.getBoundingClientRect();
       if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
    }
  };

  return (
    <div
      ref={btnRef}
      className="flex flex-col justify-center bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[6px] p-2 hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-help shadow-inner relative z-20"
      onMouseEnter={() => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        const r = btnRef.current?.getBoundingClientRect();
        if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
      }}
      onMouseLeave={() => setTipPos(null)}
      onClick={toggleTip}
    >
      <span className="text-[8px] md:text-[9px] font-bold text-[#80848E] uppercase tracking-widest mb-0.5">{label}</span>
      <span className="text-[10px] md:text-[14px] font-black tracking-wide truncate" style={{ color: textColor }}>
        {displayValue === "BM" ? (
          <JargonWrap title="Black Marketed (BM)" tip="This unit's value is heavily manipulated by outside-game currency trades. Highly risky.">
            BM
          </JargonWrap>
        ) : displayValue}
      </span>

      {tipPos && createPortal(
        <>
          <div className="md:hidden fixed inset-0 z-[99998]" onClick={(e) => { e.stopPropagation(); setTipPos(null); }} onTouchStart={(e) => { e.stopPropagation(); setTipPos(null); }} />
          <div className="rounded-[8px] px-3 py-2.5 pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.6)]" style={{ top: tipPos.y, left: tipPos.x, minWidth: 200, maxWidth: 240, background: "#111214", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[12px] font-bold mb-0.5" style={{ color: textColor }}>{tipTitle}</p>
            <p className="text-[11px] font-medium leading-snug text-[#DBDEE1] whitespace-normal">{tipBody}</p>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function GridValueDisplay({ unit }: { unit: GridUnit }) {
  if (getTier(unit as MasterUnit) === "Untiered") {
    return (
      <span className="text-[14px] md:text-[20px] font-black tracking-tighter truncate text-[#80848E] font-mono block w-full">
        N/A
      </span>
    );
  }
  if (unit.value === "owner" || unit.valueDisplay === "Owner's Choice" || unit.valueDisplay === "O/C") {
    return (
      <span className="text-[13px] md:text-[18px] font-black tracking-tight truncate block w-full" style={{ background: "linear-gradient(90deg, #a78bfa, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
        <JargonWrap title="Owner's Choice (O/C)" tip="This unit is so rare the owner dictates the price. Value depends entirely on what they want.">
          Owner's Choice
        </JargonWrap>
      </span>
    );
  }

  if (unit.valueDisplay && unit.valueDisplay !== "N/A" && !unit.valueDisplay.toLowerCase().startsWith("obtained")) {
    return <span className="text-[14px] md:text-[22px] font-black tracking-tighter truncate text-[#DBDEE1] font-mono block w-full">{unit.valueDisplay}</span>;
  }

  const displayNum = typeof unit.value === "number" && unit.value > 0 
    ? unit.value 
    : typeof unit.valueMin === "number" && unit.valueMin > 0 
      ? unit.valueMin 
      : null;

  if (displayNum !== null) {
    return <span className="text-[16px] md:text-[22px] font-black tracking-tighter tabular-nums text-[#F2F3F5] font-mono block w-full truncate">{displayNum.toLocaleString()}</span>;
  }

  return <span className="text-[14px] font-bold text-[#80848E] font-mono block w-full">N/A</span>;
}

function NoticeTooltip({ notice }: { notice?: string }) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => setTipPos(null);
  }, []);

  const toggleTip = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (tipPos) {
       setTipPos(null);
    } else {
       const r = btnRef.current?.getBoundingClientRect();
       if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 6 });
    }
  };

  if (!notice) return null;

  return (
    <div
      ref={btnRef}
      className="relative flex items-center justify-center cursor-help p-2 -m-2 z-20"
      onMouseEnter={() => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        const r = btnRef.current?.getBoundingClientRect();
        if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 6 });
      }}
      onMouseLeave={() => setTipPos(null)}
      onClick={toggleTip}
    >
      <div className="flex items-center justify-center rounded-full transition-colors w-4 h-4 md:w-5 md:h-5" style={{ background: tipPos ? "rgba(255,255,255,0.1)" : "transparent" }}>
        <span className="text-[9px] md:text-[12px] font-bold" style={{ color: tipPos ? "#DBDEE1" : "#80848E" }}>?</span>
      </div>
      {tipPos && createPortal(
        <>
          <div className="md:hidden fixed inset-0 z-[99998]" onClick={(e) => { e.stopPropagation(); setTipPos(null); }} onTouchStart={(e) => { e.stopPropagation(); setTipPos(null); }} />
          <div className="px-3 py-2.5 rounded-[8px] pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full w-[220px] animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.5)]" style={{ top: tipPos.y, left: tipPos.x, background: "#111214", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[11px] font-medium leading-relaxed text-[#DBDEE1]">{notice}</p>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}