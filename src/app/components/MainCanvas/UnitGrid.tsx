import { useState, useRef, memo, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ArrowUpCircle, ArrowDownCircle, History } from "lucide-react";
import { PopupUnit, GridUnit, MasterUnit, UnitStatus } from "../../../types";
import { GRID_STATUS_CFG, getRarityLabel, SUPPLY_SCALE, DEMAND_SCALE, getTier, TIER_CONFIG, getProxyImage } from "../../../data";
import { getAvatarStyle, getInitials, handleImageError } from "../TradeAnalyzer/summaryUtils"; 
import { useTradeStore } from "../../../store/useTradeStore";
import { useHistoryModalStore } from "../../../store/useHistoryModalStore";
import { triggerHaptic } from "../../../data/helpers";

export const UnitGrid = memo(function UnitGrid({ units }: { units: MasterUnit[] }) {
  return (
    <div className="grid gap-3 sm:gap-5 w-full pb-3 sm:pb-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 155px), 1fr))" }}>
      {units.map((unit) => (
        <TierGridCard key={unit.id} unit={unit} />
      ))}
    </div>
  );
});

export const TierGridCard = memo(function TierGridCard({ unit }: { unit: GridUnit }) {
  const [hovered, setHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false); 
  const [menuOpen, setMenuOpen] = useState(false);

  const addCard = useTradeStore(state => state.addCard);
  const openModal = useHistoryModalStore(state => state.openModal);

  const popupUnit: PopupUnit = {
    id: unit.id, name: unit.name, subtitle: unit.subtitle,
    value: typeof unit.value === "number" ? unit.value : 0, demand: unit.demand,
  };

  const obtainability = unit.obtainability || "UNOB";

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
    setMenuOpen(true);
  };

  const tierKey = getTier(unit as MasterUnit);
  const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "#5865F2";
  const proxyUrl = getProxyImage(unit.id, unit.imageUrl);

  return (
    <>
      <div className="relative w-full overflow-hidden rounded-[8px] group" style={{ contentVisibility: "auto", containIntrinsicSize: "260px" }}>
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
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="relative w-full overflow-hidden flex-shrink-0" style={{ aspectRatio: "1/1", transform: "translateZ(0)" }}>
            <div className="absolute inset-0 z-0" style={{ background: "linear-gradient(160deg, #383a3f 0%, #1E1F22 100%)" }} />
            
            <div className="absolute inset-0 flex items-center justify-center text-white font-black text-6xl tracking-tight shadow-inner z-0" style={{ ...getAvatarStyle(unit.name), transform: hovered ? "scale(1.05)" : "scale(1)", transition: "transform 0.7s ease-out" }}>
              {getInitials(unit.name)}
            </div>
            
            <img 
              src={proxyUrl} 
              alt={unit.name} 
              loading="lazy" 
              decoding="async"
              onError={(e) => handleImageError(e, unit.id, unit.imageUrl)}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out z-10 bg-[#1E1F22]" 
              style={{ objectPosition: "center 15%", transform: hovered ? "scale(1.05)" : "scale(1)", willChange: "transform" }} 
            />
            
            <div className="absolute inset-0 pointer-events-none z-20" style={{ background: "linear-gradient(to right, rgba(43,45,49,0.3) 0%, transparent 20%, transparent 80%, rgba(43,45,49,0.3) 100%)" }} />
            <div className="absolute -bottom-[2px] left-0 right-0 h-[calc(40%+2px)] z-20" style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(43,45,49,0.8) 60%, rgba(43,45,49,1) 100%)" }} />
            {unit.status && <div className="absolute top-2 left-2 md:top-3 md:left-3 z-30"><GridStatusBadge status={unit.status} /></div>}
          </div>

          <div className="flex flex-col flex-1 px-3 md:px-4 pt-3 md:pt-4 pb-3 md:pb-4 relative z-10 bg-[#2B2D31] -mt-[1px]">
            <div className="flex flex-col">
              <div className="flex items-start gap-2">
                <h3 className="text-[13px] md:text-[15px] font-extrabold tracking-tight leading-snug flex-1 min-w-0 line-clamp-2 text-[#F2F3F5]">{unit.name}</h3>
                {unit.notice && <div className="mt-0.5"><NoticeTooltip notice={unit.notice} /></div>}
              </div>
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider leading-none mt-1 truncate text-[#949BA4]">{unit.subtitle}</p>
              <div className="flex mt-1.5">
                {obtainability === "UNOB" ? (
                  <span className="text-[8px] font-bold uppercase text-[#949BA4] bg-[#1E1F22] px-1.5 py-0.5 rounded-[3px] border border-[rgba(255,255,255,0.05)] tracking-widest leading-none">UNOBTAINABLE</span>
                ) : (
                  <span className="text-[8px] font-bold uppercase text-[#DBDEE1] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded-[3px] border border-[rgba(255,255,255,0.1)] tracking-widest leading-none">OBTAINABLE</span>
                )}
              </div>
            </div>

            <div className="flex flex-col mt-auto pt-3 md:pt-5 w-full">
              <div className="pl-2 md:pl-3 border-l-[3px] transition-colors duration-300 w-full min-w-0" style={{ borderColor: hovered ? tierColor : "#5865F2" }}>
                <GridValueDisplay unit={unit} />
              </div>

              <div className="relative w-full mt-3 md:mt-4 pt-3 md:pt-4 border-t border-[rgba(255,255,255,0.06)] min-h-[34px] md:min-h-[38px] flex items-center justify-between">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1 flex-nowrap flex-1 min-w-0 overflow-hidden">
                    <GridStatItem label="R" value={unit.rarity} />
                    <GridStatItem label="S" value={unit.supply} />
                    <GridStatItem label="D" value={unit.demand} />
                  </div>
                </div>
              </div>
            </div>
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

function GridStatusBadge({ status }: { status: UnitStatus }) {
  const c = GRID_STATUS_CFG[status];
  if (!c) return null;
  const badgeRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => setTipPos(null);
  }, []);

  return (
    <div
      ref={badgeRef}
      className="relative inline-flex"
      onMouseEnter={() => {
        if (!badgeRef.current) return;
        const r = badgeRef.current.getBoundingClientRect();
        setTipPos({ x: r.left, y: r.bottom + 6 });
      }}
      onMouseLeave={() => setTipPos(null)}
    >
      <div className="inline-flex items-center px-2 py-1 md:px-2.5 md:py-[5px] rounded-full cursor-default shadow-sm" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
        <span className="text-[9px] md:text-[10px] font-bold tracking-wide">{c.label}</span>
      </div>
      {tipPos && createPortal(
        <div className="rounded-xl px-3 py-2 pointer-events-none fixed z-[99999] animate-fade-in" style={{ top: tipPos.y, left: tipPos.x, minWidth: 210, maxWidth: 240, background: "#111214", border: `1px solid ${c.border}`, boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4)` }}>
          <p className="text-[11px] font-bold leading-snug text-[#F2F3F5]">{c.tip}</p>
        </div>,
        document.body
      )}
    </div>
  );
}

function GridStatItem({ label, value }: { label: string; value: number }) {
  const btnRef = useRef<HTMLSpanElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const fmt = (v: number) => (v % 1 === 0 ? String(v) : v.toFixed(1));

  useEffect(() => {
    return () => setTipPos(null);
  }, []);

  let tipTitle = ""; let tipBody = ""; let tipNote = "";
  let textColor = "#DBDEE1";

  if (label === "R") {
    tipTitle = `Rarity ${fmt(value)} / 20`; tipBody = getRarityLabel(value);
    if (value >= 19) textColor = "#4DB6AC"; else if (value >= 9) textColor = "#81C784"; else if (value >= 6) textColor = "#FFB74D"; else textColor = "#E57373";
  } else if (label === "S") {
    tipTitle = `Supply ${fmt(value)} / 5`; tipBody = SUPPLY_SCALE[Math.round(value)] ?? "Unknown";
    if (value <= 1.5) textColor = "#4DB6AC"; else if (value <= 2.5) textColor = "#81C784"; else if (value <= 3.5) textColor = "#B5BAC1"; else textColor = "#E57373";
  } else if (label === "D") {
    tipTitle = `Demand ${fmt(value)} / 5`; tipBody = DEMAND_SCALE[Math.round(value)] ?? "Unknown"; tipNote = "Note: Demand does not directly drive value.";
    if (value >= 4) textColor = "#4DB6AC"; else if (value >= 3) textColor = "#81C784"; else if (value >= 2) textColor = "#B5BAC1"; else textColor = "#E57373";
  }

  return (
    <span
      ref={btnRef}
      className="relative flex items-center gap-0.5 md:gap-1 cursor-default group flex-shrink-0"
      onMouseEnter={() => {
        if (!btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
      }}
      onMouseLeave={() => setTipPos(null)}
    >
      <span className="text-[8.5px] md:text-[10px] font-bold text-[#80848E] font-mono">{label}</span>
      <span className="text-[9.5px] md:text-[11px] font-bold px-[3px] py-[1px] rounded-[3px] leading-none font-mono bg-[#2B2D31] border border-[rgba(255,255,255,0.04)]" style={{ color: textColor }}>{fmt(value)}</span>
      {tipPos && createPortal(
        <div className="rounded-[8px] px-3 py-2.5 pointer-events-none fixed z-[99999] -translate-x-1/2 animate-fade-in" style={{ top: tipPos.y, left: tipPos.x, minWidth: 200, maxWidth: 240, background: "#111214", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          <p className="text-[12px] font-bold mb-0.5" style={{ color: textColor }}>{tipTitle}</p>
          <p className="text-[11px] font-medium leading-snug text-[#DBDEE1]">{tipBody}</p>
          {tipNote && <p className="text-[10px] font-medium mt-1.5 leading-snug text-[#80848E]">{tipNote}</p>}
        </div>,
        document.body
      )}
    </span>
  );
}

function GridValueDisplay({ unit }: { unit: GridUnit }) {
  if (unit.value === "owner" || unit.valueDisplay === "Owner's Choice" || unit.valueDisplay === "O/C") {
    return (
      <span className="text-[13px] md:text-[16px] font-black tracking-tight truncate block w-full" style={{ background: "linear-gradient(90deg, #a78bfa, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
        Owner's Choice
      </span>
    );
  }
  if (unit.valueDisplay) {
    return <span className="text-[14px] md:text-[17px] font-black tracking-tighter truncate text-[#DBDEE1] font-mono block w-full">{unit.valueDisplay}</span>;
  }
  return <span className="text-[16px] md:text-[20px] font-black tracking-tighter tabular-nums text-[#F2F3F5] font-mono block w-full truncate">{(unit.value as number).toLocaleString()}</span>;
}

function NoticeTooltip({ notice }: { notice?: string }) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => setTipPos(null);
  }, []);

  if (!notice) return null;

  return (
    <div
      ref={btnRef}
      className="relative flex items-center justify-center cursor-help"
      onMouseEnter={() => {
        if (!btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        setTipPos({ x: r.left + r.width / 2, y: r.top - 6 });
      }}
      onMouseLeave={() => setTipPos(null)}
    >
      <div className="flex items-center justify-center rounded-full transition-colors w-3.5 h-3.5 md:w-4 md:h-4" style={{ background: tipPos ? "rgba(255,255,255,0.1)" : "transparent" }}>
        <span className="text-[9px] md:text-[11px] font-bold" style={{ color: tipPos ? "#DBDEE1" : "#80848E" }}>?</span>
      </div>
      {tipPos && createPortal(
        <div className="px-3 py-2.5 rounded-[8px] pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full w-[220px] animate-fade-in" style={{ top: tipPos.y, left: tipPos.x, background: "#111214", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          <p className="text-[11px] font-medium leading-relaxed text-[#DBDEE1]">{notice}</p>
        </div>,
        document.body
      )}
    </div>
  );
}