import React, { useState, memo } from "react";
import { createPortal } from "react-dom";
import { ArrowUpCircle, ArrowDownCircle, History, Package, X } from "lucide-react";
import { PopupUnit, GridUnit, MasterUnit } from "../../../../types";
import { getTier, TIER_CONFIG, getProxyImage, getObtainability, handleImageError } from "../../../../data";
import { getAvatarStyle, getInitials } from "../../TradeAnalyzer/summaryUtils"; 
import { useTradeStore } from "../../../../store/useTradeStore";
import { useHistoryModalStore } from "../../../../store/useHistoryModalStore";
import { triggerHaptic } from "../../../../data/helpers";
import { useAuthStore } from "../../../../store/useAuthStore";
import { useInventoryStore } from "../../../../store/useInventoryStore";
import { HighlightText, NoticeTooltip, JargonWrap } from "../../shared/Formatters";
import { GridStatusBadge } from "./GridStatusBadge";
import { GridStatBox } from "./GridStatBox";
import { GridValueDisplay } from "./GridValueDisplay";
import { StatusIcon } from "../../shared/Formatters";

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

  const obtainability = getObtainability(unit as MasterUnit);
  const dropCfg = unit.status ? import("../../../../data").then(m => m.GRID_STATUS_CFG[unit.status as keyof typeof m.GRID_STATUS_CFG]) : null;

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
  const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "var(--primary)";
  const proxyUrl = getProxyImage(unit.id, unit.imageUrl);

  return (
    <>
      <div className="relative w-full overflow-hidden rounded-[8px] active:scale-[0.98] transition-transform duration-150 touch-manipulation">
        <div
          draggable
          onDragStart={handleDragStart}
          onClick={handleCardClick}
          onContextMenu={(e) => e.preventDefault()}
          className="flex flex-col h-full rounded-[8px] overflow-hidden cursor-pointer relative z-10 will-change-transform bg-card border border-border"
          style={{
            transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
            borderColor: isAdded ? tierColor : hovered ? tierColor : "var(--border)",
            transform: isAdded ? "scale(0.95)" : hovered ? "translateY(-4px)" : "translateY(0)"
          }}
          onMouseEnter={() => {
            if (window.matchMedia('(hover: hover)').matches) setHovered(true);
          }}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="relative w-full overflow-hidden flex-shrink-0 border-b border-border" style={{ aspectRatio: "1/1", transform: "translateZ(0)" }}>
            <div className="absolute inset-0 z-0 bg-popover" />

            <div className="absolute inset-0 flex items-center justify-center text-white font-black text-5xl md:text-7xl tracking-tight z-0" style={{ ...getAvatarStyle(unit.name), transform: hovered ? "scale(1.05)" : "scale(1)", transition: "transform 0.7s ease-out" }}>
              {getInitials(unit.name)}
            </div>

            <img 
              src={proxyUrl || undefined} 
              alt={unit.name} 
              loading="lazy" 
              decoding="async"
              onError={(e) => handleImageError(e, unit.id)}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out z-10 bg-popover" 
              style={{ objectPosition: "center 15%", transform: hovered ? "scale(1.05)" : "scale(1)", willChange: "transform" }} 
            />

            <div className="absolute -bottom-[2px] left-0 right-0 h-[calc(40%+2px)] md:h-[calc(45%+2px)] z-20" style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(30,33,36,0.8) 60%, rgba(30,33,36,1) 100%)" }} />
            
            {unit.status && (
              <div className="absolute top-2 left-2 md:top-3 md:left-3 z-50">
                <GridStatusBadge status={unit.status} />
              </div>
            )}

            {/* TRANSLUCENT GHOST BUTTON GRID OVERLAY */}
            <div className={`hidden md:flex absolute inset-0 bg-black/60 backdrop-blur-[4px] transition-opacity duration-200 z-40 flex-col justify-center gap-2 p-4 pt-8 ${hovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <div className="grid grid-cols-2 gap-2 w-full">
                <button onClick={(e) => { e.stopPropagation(); handleAdd("give"); }} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-[6px] bg-[#FAA61A]/10 text-[#FAA61A] border border-[#FAA61A]/40 hover:bg-[#FAA61A] hover:text-white transition-all active:scale-95 shadow-sm focus-visible:outline-none">
                  <ArrowUpCircle className="w-5 h-5" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Give</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleAdd("get"); }} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-[6px] bg-primary/10 text-primary border border-primary/40 hover:bg-primary hover:text-white transition-all active:scale-95 shadow-sm focus-visible:outline-none">
                  <ArrowDownCircle className="w-5 h-5" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Get</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full mt-1">
                <button onClick={(e) => { e.stopPropagation(); handleSaveToInventory(); }} className="flex items-center justify-center gap-1.5 py-2 rounded-[6px] bg-[#23a559]/10 text-[#23a559] border border-[#23a559]/40 hover:bg-[#23a559] hover:text-white transition-all active:scale-95 shadow-sm focus-visible:outline-none">
                  <Package className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Save</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); openModal(unit.id); }} className="flex items-center justify-center gap-1.5 py-2 rounded-[6px] bg-card/60 text-foreground border border-border hover:bg-muted hover:text-foreground transition-all active:scale-95 shadow-sm focus-visible:outline-none">
                  <History className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">History</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col flex-1 px-3 md:px-4 pt-3 md:pt-4 pb-3 md:pb-4 relative z-10 bg-card -mt-[1px]" onClick={() => { if (window.innerWidth >= 768) setMenuOpen(true); }}>
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
              <div className="pl-2 md:pl-3 border-l-[3px] transition-colors duration-300 w-full min-w-0 mb-3 md:mb-4" style={{ borderColor: hovered ? tierColor : "var(--primary)" }}>
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

      {menuOpen && createPortal(
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
                  <img src={proxyUrl || undefined} alt={unit.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-card" onError={(e) => handleImageError(e, unit.id)} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[16px] font-black text-foreground tracking-tight truncate">{unit.name}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{unit.subtitle}</span>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground shrink-0 active:scale-90 hover:bg-white/10 transition-colors focus-visible:outline-none">
                <X className="w-5 h-5 md:w-4 md:h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <button onClick={() => handleAdd("give")} className="w-full flex items-center justify-center gap-2 bg-[#FAA61A] hover:bg-[#d98b14] transition-colors text-white text-[14px] font-bold h-[48px] md:h-[44px] rounded-[10px] active:scale-[0.98] shadow-md focus-visible:outline-none">
                <ArrowUpCircle className="w-4 h-4" /> Add to 'You Give'
              </button>
              <button onClick={() => handleAdd("get")} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 transition-colors text-white text-[14px] font-bold h-[48px] md:h-[44px] rounded-[10px] active:scale-[0.98] shadow-md focus-visible:outline-none">
                <ArrowDownCircle className="w-4 h-4" /> Add to 'You Get'
              </button>
              <button onClick={handleSaveToInventory} className="w-full flex items-center justify-center gap-2 bg-[#23a559] hover:bg-[#1f914e] transition-colors text-white text-[14px] font-bold h-[48px] md:h-[44px] rounded-[10px] active:scale-[0.98] shadow-md focus-visible:outline-none">
                <Package className="w-4 h-4" /> Save to My Inventory
              </button>
              <button onClick={() => { setMenuOpen(false); openModal(unit.id); }} className="w-full flex items-center justify-center gap-2 bg-card hover:bg-muted transition-colors text-foreground border border-border text-[13px] font-bold h-[48px] md:h-[44px] rounded-[10px] active:scale-[0.98] mt-0.5 focus-visible:outline-none">
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