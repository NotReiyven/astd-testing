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

export function GridStatFooter({ rarity, liquidity }: { rarity: number | string; liquidity: number | string }) {
  const numVal = Number(rarity) || 0;
  const rarityDisplay = numVal % 1 === 0 ? String(numVal) : numVal.toFixed(1);
  const liqStr = String(liquidity || "Average");
  const liqDisplay = liqStr.toLowerCase() === "black marketed" ? "BM" : liqStr.toUpperCase();

  return (
    <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-border/80 w-full font-mono">
      <div className="flex flex-col bg-background/60 border border-border/70 rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Rarity</span>
        <span className="text-[13px] font-black text-foreground">{rarityDisplay}</span>
      </div>
      <div className="flex flex-col bg-background/60 border border-border/70 rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Liquidity</span>
        <span className="text-[12px] font-black text-foreground truncate">{liqDisplay}</span>
      </div>
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
            className={`flex flex-col h-full rounded-[8px] overflow-hidden cursor-pointer relative z-10 will-change-transform specular-card ${
              isSelected 
                ? "border-primary ring-2 ring-primary scale-[0.98]" 
                : "border-border hover:border-muted-foreground"
            }`}
            style={{
              transform: isAdded ? "scale(0.95)" : "scale(1)"
            }}
          >
            {/* Image Container with robust initials fallback layer and refined studio vignette */}
            <div className="relative w-full overflow-hidden flex-shrink-0 border-b border-border bg-[#111214]" style={{ aspectRatio: "1/1", transform: "translateZ(0)" }}>
              
              {/* Fallback Initials Layer (Sits behind transparent WebPs or failed loads) */}
              <div className="absolute inset-0 flex items-center justify-center text-white font-black text-4xl md:text-6xl tracking-tight z-0 opacity-20 select-none pointer-events-none" style={{ ...getAvatarStyle(unit.name) }}>
                {getInitials(unit.name)}
              </div>

              {/* Main Asset Image */}
              <img 
                src={proxyUrl || undefined} 
                alt={unit.name} 
                loading="lazy" 
                decoding="async"
                onError={(e) => handleImageError(e, unit.id)}
                className="absolute inset-0 w-full h-full object-cover z-10 bg-transparent" 
                style={{ objectPosition: "center 15%" }} 
              />

              {/* Refined Studio Vignette & Bottom Gradient Fade */}
              <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_30px_rgba(0,0,0,0.55)]" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#141517] via-[#141517]/60 to-transparent pointer-events-none z-20" />

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
                  <h3 className="text-[13px] md:text-[16px] font-extrabold tracking-tight leading-snug flex-1 min-w-0 line-clamp-2 text-foreground">
                    <HighlightText text={unit.name} query={searchQuery} />
                  </h3>
                  {unit.notice && <div className="mt-0.5 md:mt-1"><NoticeTooltip notice={unit.notice} /></div>}
                </div>
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider leading-none mt-1 md:mt-1.5 truncate text-muted-foreground">
                  <HighlightText text={unit.subtitle || ""} query={searchQuery} />
                </p>
                <div className="flex mt-1.5 md:mt-2">
                  {obtainability === "UNOB" ? (
                    <span className="text-[9px] md:text-[10px] font-bold uppercase text-muted-foreground bg-popover px-1.5 md:px-2 py-0.5 rounded-[3px] border border-border tracking-widest leading-none">
                      UNOB
                    </span>
                  ) : (
                    <span className="text-[9px] md:text-[10px] font-bold uppercase text-foreground bg-white/5 px-1.5 md:px-2 py-0.5 rounded-[3px] border border-border tracking-widest leading-none">
                      OBN
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col mt-auto pt-3 md:pt-4 w-full">
                <div className="pl-2 border-l-[3px] w-full min-w-0 mb-1" style={{ borderColor: tierColor }}>
                  <GridValueDisplay unit={unit} />
                </div>

                <GridStatFooter rarity={unit.rarity} liquidity={unit.liquidity || "Average"} />
              </div>
            </div>

          </div>
        </div>
      </div>

      {menuOpen && !isSelectMode && createPortal(
        <div className="fixed inset-0 z-[1000000] flex flex-col justify-end md:justify-center md:items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="relative w-full md:max-w-sm bg-popover rounded-t-[24px] md:rounded-[8px] p-5 shadow-2xl animate-slide-up md:animate-fade-in border-t md:border border-border">

            <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full" />

            <div className="flex items-center justify-between mb-5 mt-2 md:mt-0">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className="w-12 h-12 rounded-[6px] overflow-hidden bg-card border border-border shadow-sm shrink-0 relative">
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
              <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-[6px] border border-transparent hover:border-border hover:bg-white/5 flex items-center justify-center text-muted-foreground shrink-0 active:scale-90 transition-colors focus-visible:outline-none">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={() => handleAdd("give")} className="w-full flex items-center justify-center gap-2 bg-[#FAA61A] hover:bg-[#d98b14] transition-colors text-white text-[13px] font-bold h-[44px] rounded-[6px] active:scale-[0.98] shadow-sm focus-visible:outline-none">
                <ArrowUpCircle className="w-4 h-4" /> Add to 'You Give'
              </button>
              <button onClick={() => handleAdd("get")} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 transition-colors text-white text-[13px] font-bold h-[44px] rounded-[6px] active:scale-[0.98] shadow-sm focus-visible:outline-none">
                <ArrowDownCircle className="w-4 h-4" /> Add to 'You Get'
              </button>
              <button onClick={handleSaveToInventory} disabled={isSaving} className="w-full flex items-center justify-center gap-2 bg-[#23a559] hover:bg-[#1f914e] disabled:opacity-50 transition-colors text-white text-[13px] font-bold h-[44px] rounded-[6px] active:scale-[0.98] shadow-sm focus-visible:outline-none">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} 
                {isSaving ? "Saving..." : "Save to My Inventory"}
              </button>
              <button onClick={() => { setMenuOpen(false); openModal(unit.id); }} className="w-full flex items-center justify-center gap-2 bg-card hover:bg-muted transition-colors text-foreground border border-border text-[13px] font-bold h-[44px] rounded-[6px] active:scale-[0.98] mt-0.5 focus-visible:outline-none">
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