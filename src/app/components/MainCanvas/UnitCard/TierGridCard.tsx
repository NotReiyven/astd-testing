// ================================================
// FILE: src/app/components/MainCanvas/UnitCard/TierGridCard.tsx
// ================================================

import React, { useState, memo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowUpCircle, ArrowDownCircle, History, Package, X, Loader2, Check } from "lucide-react";
import { PopupUnit, GridUnit, MasterUnit } from "../../../../types";
import { getTier, TIER_CONFIG, getProxyImage, getObtainability, handleImageError, GRID_STATUS_CFG } from "../../../../data";
import { getAvatarStyle, getInitials } from "../../TradeAnalyzer/summaryUtils"; 
import { useTradeStore } from "../../../../store/useTradeStore";
import { useHistoryModalStore } from "../../../../store/useHistoryModalStore";
import { triggerHaptic } from "../../../../data/helpers";
import { useAuthStore } from "../../../../store/useAuthStore";
import { useInventoryStore } from "../../../../store/useInventoryStore";
import { HighlightText, NoticeTooltip, JargonWrap, StatusIcon } from "../../shared/Formatters";
import { GridValueDisplay } from "./GridValueDisplay";

export function GridStatusBadge({ status }: { status: string }) {
  const c = GRID_STATUS_CFG[status as keyof typeof GRID_STATUS_CFG];
  if (!c) return null;
  const badgeRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      setTipPos(null);
    };
  }, []);

  const openTip = () => {
    const r = badgeRef.current?.getBoundingClientRect();
    if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
  };

  const toggleTip = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (tipPos) setTipPos(null);
    else openTip();
  };

  return (
    <div
      ref={badgeRef}
      className="relative inline-flex cursor-help"
      onMouseEnter={() => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        hoverTimer.current = setTimeout(openTip, 200);
      }}
      onMouseLeave={() => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setTipPos(null);
      }}
      onClick={toggleTip}
    >
      <div 
        className="inline-flex items-center px-2.5 py-1 rounded-[6px] gap-1.5 shadow-sm" 
        style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
      >
        <StatusIcon status={status} />
        <span className="text-[10px] font-bold tracking-wide uppercase transition-colors leading-none">{c.label}</span>
      </div>
      {tipPos && createPortal(
        <>
          <div className="md:hidden fixed inset-0 z-[99998]" onClick={(e) => { e.stopPropagation(); setTipPos(null); }} onTouchStart={(e) => { e.stopPropagation(); setTipPos(null); }} />
          <div className="rounded-xl px-3 py-2 pointer-events-none fixed z-[99999] animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.6)]" style={{ top: tipPos.y, left: tipPos.x, minWidth: 210, maxWidth: 240, background: "var(--popover)", border: `1px solid ${c.border}` }}>
            <p className="text-[11px] font-bold leading-snug text-foreground">{c.tip}</p>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export function GridStatBox({ label, value, type }: { label: string; value: number | string; type: "rarity" | "liquidity" }) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      setTipPos(null);
    };
  }, []);

  let tipTitle = ""; let tipBody = ""; 
  let textColor = "#DBDEE1";
  let displayValue = String(value);

  if (type === "rarity") {
    const numVal = Number(value) || 0;
    displayValue = numVal % 1 === 0 ? String(numVal) : numVal.toFixed(1);
    tipTitle = `Rarity ${displayValue} / 20`; 
    tipBody = "Higher is better. Determines absolute scarcity.";
    if (numVal >= 19) textColor = "#4DB6AC"; else if (numVal >= 9) textColor = "#81C784"; else if (numVal >= 6) textColor = "#FFB74D"; else textColor = "var(--destructive)";
  } else {
    const stringVal = String(value);
    const liqKey = stringVal.charAt(0).toUpperCase() + stringVal.slice(1).toLowerCase();
    displayValue = stringVal.toLowerCase() === "black marketed" ? "BM" : stringVal.toUpperCase();
    tipTitle = `Liquidity: ${liqKey}`; 
    tipBody = "How fast you can find a buyer. Dictates short-term viability.";

    if (liqKey === "High") textColor = "#4DB6AC"; 
    else if (liqKey === "Average") textColor = "var(--muted-foreground)"; 
    else textColor = "var(--destructive)";
  }

  const openTip = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setTipPos({ x: r.left + r.width / 2, y: r.top - 8 });
  };

  const toggleTip = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (tipPos) setTipPos(null);
    else openTip();
  };

  return (
    <div
      ref={btnRef}
      className="flex flex-col justify-center bg-black/20 border border-border/50 rounded-[6px] p-2 hover:bg-black/30 transition-colors cursor-help relative z-20 min-h-[40px]"
      onMouseEnter={() => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        hoverTimer.current = setTimeout(openTip, 200);
      }}
      onMouseLeave={() => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setTipPos(null);
      }}
      onClick={toggleTip}
    >
      <span className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{label}</span>
      <span className="text-[10px] md:text-[13px] font-black tracking-wide truncate" style={{ color: textColor }}>
        {displayValue === "BM" ? (
          <JargonWrap title="Black Marketed (BM)" tip="This unit's value is heavily manipulated by outside-game currency trades. Highly risky.">
            BM
          </JargonWrap>
        ) : displayValue}
      </span>

      {tipPos && createPortal(
        <>
          <div className="md:hidden fixed inset-0 z-[99998]" onClick={(e) => { e.stopPropagation(); setTipPos(null); }} onTouchStart={(e) => { e.stopPropagation(); setTipPos(null); }} />
          <div className="rounded-[8px] px-3 py-2.5 pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.6)]" style={{ top: tipPos.y, left: tipPos.x, minWidth: 200, maxWidth: 240, background: "var(--popover)", border: "1px solid var(--border)" }}>
            <p className="text-[12px] font-bold mb-0.5" style={{ color: textColor }}>{tipTitle}</p>
            <p className="text-[11px] font-medium leading-snug text-foreground whitespace-normal">{tipBody}</p>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export const TierGridCard = memo(function TierGridCard({ 
  unit, searchQuery, isSelectMode, isSelected, onToggleSelect, index
}: { 
  unit: GridUnit, 
  searchQuery?: string,
  isSelectMode?: boolean,
  isSelected?: boolean,
  onToggleSelect?: (id: string) => void,
  index?: number
}) {
  const [isAdded, setIsAdded] = useState(false); 
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addCard = useTradeStore(state => state.addCard);
  const openModal = useHistoryModalStore(state => state.openModal);

  const profile = useAuthStore(state => state.profile);
  const addOrUpdateUnit = useInventoryStore(state => state.addOrUpdateUnit);

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

  const obtainability = getObtainability(unit as MasterUnit);

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
    if (isSelectMode && onToggleSelect) {
      onToggleSelect(unit.id);
      return;
    }
    setMenuOpen(true);
  };

  const tierKey = getTier(unit as MasterUnit);
  const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "var(--primary)";
  const proxyUrl = getProxyImage(unit.id, unit.imageUrl);

  const staggerDelay = `${(index || 0) * 40}ms`;

  return (
    <>
      <div 
        className="opacity-0 animate-[staggerFadeIn_0.4s_ease-out_forwards] h-full"
        style={{ animationDelay: staggerDelay }}
      >
        <div className="relative w-full overflow-hidden rounded-[8px] active:scale-[0.98] transition-transform duration-150 touch-manipulation h-full">
          <div
            draggable={!isSelectMode}
            onDragStart={handleDragStart}
            onClick={handleCardClick}
            onContextMenu={(e) => e.preventDefault()}
            className={`flex flex-col h-full rounded-[8px] overflow-hidden cursor-pointer relative z-10 will-change-transform bg-card border ${
              isSelected 
                ? "border-primary ring-2 ring-primary scale-[0.98]" 
                : "border-border hover:border-muted-foreground"
            }`}
            style={{
              transition: "border-color 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
              transform: isAdded ? "scale(0.95)" : "scale(1)"
            }}
          >
            <div className="relative w-full overflow-hidden flex-shrink-0 border-b border-border bg-popover" style={{ aspectRatio: "1/1", transform: "translateZ(0)" }}>
              
              <div className="absolute inset-0 flex items-center justify-center text-white font-black text-5xl md:text-7xl tracking-tight z-0 opacity-40 select-none" style={{ ...getAvatarStyle(unit.name) }}>
                {getInitials(unit.name)}
              </div>

              <img 
                src={proxyUrl || undefined} 
                alt={unit.name} 
                loading="lazy" 
                decoding="async"
                onError={(e) => handleImageError(e, unit.id)}
                className="absolute inset-0 w-full h-full object-cover z-10 bg-transparent" 
                style={{ objectPosition: "center 15%" }} 
              />

              {unit.status && (
                <div className="absolute top-2 left-2 md:top-3 md:left-3 z-50">
                  <GridStatusBadge status={unit.status} />
                </div>
              )}

              {isSelected && (
                <div className="absolute top-2 right-2 z-50 bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </div>

            <div className="flex flex-col flex-1 px-3 md:px-4 pt-3 md:pt-4 pb-3 md:pb-4 relative z-10 bg-card">
              <div className="flex flex-col">
                <div className="flex items-start gap-2">
                  <h3 className="text-[13px] md:text-[17px] font-extrabold tracking-tight leading-snug flex-1 min-w-0 line-clamp-2 text-foreground">
                    <HighlightText text={unit.name} query={searchQuery} />
                  </h3>
                  {unit.notice && <div className="mt-0.5 md:mt-1"><NoticeTooltip notice={unit.notice} /></div>}
                </div>
                <p className="text-[10px] md:text-[12px] font-bold uppercase tracking-wider leading-none mt-1 md:mt-1.5 truncate text-muted-foreground">
                  <HighlightText text={unit.subtitle || ""} query={searchQuery} />
                </p>
                <div className="flex mt-1.5 md:mt-2.5">
                  {obtainability === "UNOB" ? (
                    <span className="text-[10px] md:text-[11px] font-bold uppercase text-muted-foreground bg-popover px-1.5 md:px-2 py-0.5 md:py-1 rounded-[3px] border border-border tracking-widest leading-none">
                      <JargonWrap title="Unobtainable (UNOB)" tip="This unit can no longer be acquired through normal gameplay. Trading is the only way to get it.">
                        UNOB
                      </JargonWrap>
                    </span>
                  ) : (
                    <span className="text-[10px] md:text-[11px] font-bold uppercase text-foreground bg-white/5 px-1.5 md:px-2 py-0.5 md:py-1 rounded-[3px] border border-border tracking-widest leading-none">
                      <JargonWrap title="Obtainable (OBN)" tip="This unit can still be acquired in-game through summons, capsules, or evolution.">
                        OBN
                      </JargonWrap>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col mt-auto pt-3 md:pt-5 w-full">
                <div className="pl-2 md:pl-3 border-l-[3px] w-full min-w-0 mb-3 md:mb-4" style={{ borderColor: tierColor }}>
                  <GridValueDisplay unit={unit} />
                </div>

                <div className="hidden md:grid grid-cols-2 gap-2 md:gap-3 w-full">
                  <GridStatBox label="RARITY" value={unit.rarity} type="rarity" />
                  <GridStatBox label="LIQUIDITY" value={unit.liquidity || "Average"} type="liquidity" />
                </div>
              </div>
            </div>

            <div className="grid md:hidden grid-cols-2 gap-2 w-full px-3 pb-3 relative min-h-[28px] bg-card">
               <GridStatBox label="RARITY" value={unit.rarity} type="rarity" />
               <GridStatBox label="LIQUIDITY" value={unit.liquidity || "Average"} type="liquidity" />
            </div>

          </div>
        </div>
      </div>

      {menuOpen && !isSelectMode && createPortal(
        <div className="fixed inset-0 z-[1000000] flex flex-col justify-end md:justify-center md:items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="relative w-full md:max-w-sm bg-popover rounded-t-[24px] md:rounded-[20px] p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] md:shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-slide-up md:animate-fade-in border-t md:border border-border">

            <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full" />

            <div className="flex items-center justify-between mb-5 mt-2 md:mt-0">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className="w-12 h-12 rounded-[10px] overflow-hidden bg-card border border-border shadow-sm shrink-0 relative">
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
              <button onClick={() => setMenuOpen(false)} className="w-11 h-11 md:w-8 md:h-8 rounded-[6px] border border-transparent hover:border-border hover:bg-white/5 flex items-center justify-center text-muted-foreground shrink-0 active:scale-90 transition-colors focus-visible:outline-none">
                <X className="w-6 h-6 md:w-4 md:h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <button onClick={() => handleAdd("give")} className="w-full flex items-center justify-center gap-2 bg-[#FAA61A] hover:bg-[#d98b14] transition-colors text-white text-[14px] font-bold min-h-[50px] md:h-[44px] rounded-[6px] active:scale-[0.98] shadow-sm focus-visible:outline-none">
                <ArrowUpCircle className="w-5 h-5 md:w-4 md:h-4" /> Add to 'You Give'
              </button>
              <button onClick={() => handleAdd("get")} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 transition-colors text-white text-[14px] font-bold min-h-[50px] md:h-[44px] rounded-[6px] active:scale-[0.98] shadow-sm focus-visible:outline-none">
                <ArrowDownCircle className="w-5 h-5 md:w-4 md:h-4" /> Add to 'You Get'
              </button>
              <button onClick={handleSaveToInventory} disabled={isSaving} className="w-full flex items-center justify-center gap-2 bg-[#23a559] hover:bg-[#1f914e] disabled:opacity-50 transition-colors text-white text-[14px] font-bold min-h-[50px] md:h-[44px] rounded-[6px] active:scale-[0.98] shadow-sm focus-visible:outline-none">
                {isSaving ? <Loader2 className="w-5 h-5 md:w-4 md:h-4 animate-spin" /> : <Package className="w-5 h-5 md:w-4 md:h-4" />} 
                {isSaving ? "Saving..." : "Save to My Inventory"}
              </button>
              <button onClick={() => { setMenuOpen(false); openModal(unit.id); }} className="w-full flex items-center justify-center gap-2 bg-card hover:bg-muted transition-colors text-foreground border border-border text-[13px] font-bold min-h-[50px] md:h-[44px] rounded-[6px] active:scale-[0.98] mt-0.5 focus-visible:outline-none">
                <History className="w-5 h-5 md:w-4 md:h-4" /> View Market History
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