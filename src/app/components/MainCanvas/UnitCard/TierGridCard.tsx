import React, { useState, memo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  Package,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { PopupUnit, GridUnit, MasterUnit } from "../../../../types";
import {
  getTier,
  TIER_CONFIG,
  getObtainability,
  GRID_STATUS_CFG,
} from "../../../../data";
import { UnitAvatar } from "../../shared/UnitAvatar";
import { useTradeStore } from "../../../../store/useTradeStore";
import { useHistoryModalStore } from "../../../../store/useHistoryModalStore";
import { triggerHaptic } from "../../../../data/helpers";
import { useAuthStore } from "../../../../store/useAuthStore";
import { useInventoryStore } from "../../../../store/useInventoryStore";
import {
  HighlightText,
  NoticeTooltip,
  JargonWrap,
  StatusIcon,
} from "../../shared/Formatters";
import { GridValueDisplay } from "./GridValueDisplay";
import { useToastStore } from "../../../../store/useToastStore";

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
        if (!window.matchMedia("(hover: hover)").matches) return;
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
        style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
          color: c.color,
        }}
      >
        <StatusIcon status={status} />
        <span className="text-[10px] font-bold tracking-wide uppercase transition-colors leading-none">
          {c.label}
        </span>
      </div>
      {tipPos &&
        createPortal(
          <>
            <div
              className="md:hidden fixed inset-0 z-[99998]"
              onClick={(e) => {
                e.stopPropagation();
                setTipPos(null);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setTipPos(null);
              }}
            />
            <div
              className="rounded-xl px-3 py-2 pointer-events-none fixed z-[99999] animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
              style={{
                top: tipPos.y,
                left: tipPos.x,
                minWidth: 210,
                maxWidth: 240,
                background: "var(--popover)",
                border: `1px solid ${c.border}`,
              }}
            >
              <p className="text-[11px] font-bold leading-snug text-foreground">
                {c.tip}
              </p>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

export function GridStatFooter({
  rarity,
  liquidity,
}: {
  rarity: number | string;
  liquidity: number | string;
}) {
  const numVal = Number(rarity) || 0;
  const rarityDisplay = numVal % 1 === 0 ? String(numVal) : numVal.toFixed(1);
  const liqStr = String(liquidity || "Average");
  const liqDisplay =
    liqStr.toLowerCase() === "black marketed" ? "BM" : liqStr.toUpperCase();

  return (
    <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-border/80 w-full font-mono">
      <div className="flex flex-col bg-muted border border-border/70 rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
          Rarity
        </span>
        <span className="text-[13px] font-black text-foreground">
          {rarityDisplay}
        </span>
      </div>
      <div className="flex flex-col bg-muted border border-border/70 rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
          Liquidity
        </span>
        <span className="text-[12px] font-black text-foreground truncate">
          {liqDisplay}
        </span>
      </div>
    </div>
  );
}

export const TierGridCard = memo(function TierGridCard({
  unit,
  searchQuery,
  isSelectMode,
  isSelected,
  onToggleSelect,
  index,
}: {
  unit: GridUnit;
  searchQuery?: string;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  index?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addCard = useTradeStore((state) => state.addCard);
  const openModal = useHistoryModalStore((state) => state.openModal);

  const profile = useAuthStore((state) => state.profile);
  const addOrUpdateUnit = useInventoryStore((state) => state.addOrUpdateUnit);

  const handleSaveToInventory = async () => {
    if (!profile) {
      useToastStore
        .getState()
        .addToast(
          "Please log in with Discord first to save items to your inventory.",
          "warning"
        );
      return;
    }
    setIsSaving(true);
    try {
      await addOrUpdateUnit(profile.id, unit.id, 1);
      useToastStore
        .getState()
        .addToast(`Added ${unit.name} to Vault`, "success");
    } finally {
      setIsSaving(false);
      setMenuOpen(false);
    }
  };

  const numericValue =
    typeof unit.value === "number"
      ? unit.value
      : typeof unit.valueMin === "number" && unit.valueMin > 0
      ? unit.valueMin
      : 0;

  const popupUnit: PopupUnit = {
    id: unit.id,
    name: unit.name,
    subtitle: unit.subtitle,
    value: numericValue,
  };

  const obtainability = getObtainability(unit as MasterUnit);

  const handleAdd = (type: "give" | "get") => {
    addCard(type, { ...popupUnit, qty: 1 });
    window.dispatchEvent(
      new CustomEvent("trade-added", { detail: { name: popupUnit.name, type } })
    );
    setMenuOpen(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("unit", JSON.stringify(popupUnit));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCardClick = () => {
    triggerHaptic("light");
    if (isSelectMode && onToggleSelect) {
      onToggleSelect(unit.id);
      return;
    }
    setMenuOpen(true);
  };

  const tierKey = getTier(unit as MasterUnit);
  const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "var(--primary)";

  return (
    <>
      <div className="h-full touch-manipulation">
        <div
          draggable={!isSelectMode}
          onDragStart={handleDragStart}
          onClick={handleCardClick}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex flex-col h-full rounded-[6px] overflow-hidden cursor-pointer relative z-10 will-change-transform specular-card ${
            isSelected ? "border-primary ring-2 ring-primary" : ""
          }`}
          style={
            {
              "--hover-glow": tierColor,
            } as React.CSSProperties
          }
        >
          <div
            className="relative w-full overflow-hidden flex-shrink-0 border-b border-border bg-[#0b0c0e]"
            style={{ aspectRatio: "1/1", transform: "translateZ(0)" }}
          >
            <UnitAvatar
              unitId={unit.id}
              unitName={unit.name}
              imageUrl={unit.imageUrl}
              fallbackClassName="absolute inset-0 flex items-center justify-center text-white font-black text-4xl md:text-6xl tracking-tight z-0"
              imageClassName="absolute inset-0 w-full h-full object-cover z-10 bg-transparent"
            />

            {/* Subtle Studio Vignette & Dynamic Bottom Gradient Fade */}
            <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_24px_rgba(0,0,0,0.4)]" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card via-card/50 to-transparent pointer-events-none z-20" />

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
                <h3 className="text-[13px] md:text-[15px] font-extrabold tracking-tight leading-snug flex-1 min-w-0 line-clamp-2 text-foreground min-h-[38px] md:min-h-[44px]">
                  <HighlightText query={searchQuery} text={unit.name} />
                </h3>
                {unit.notice && (
                  <div className="mt-0.5 md:mt-1">
                    <NoticeTooltip notice={unit.notice} />
                  </div>
                )}
              </div>
              <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider leading-none mt-1 md:mt-1.5 truncate text-muted-foreground min-h-[14px] md:min-h-[16px]">
                <HighlightText text={unit.subtitle || ""} query={searchQuery} />
              </p>
              <div className="flex mt-1.5 md:mt-2">
                {obtainability === "UNOB" ? (
                  <span className="text-[9px] md:text-[10px] font-bold uppercase text-muted-foreground bg-popover px-1.5 md:px-2 py-0.5 rounded-[2px] border border-border tracking-widest leading-none">
                    UNOB
                  </span>
                ) : (
                  <span className="text-[9px] md:text-[10px] font-bold uppercase text-foreground bg-white/5 px-1.5 md:px-2 py-0.5 rounded-[2px] border border-border tracking-widest leading-none">
                    OBN
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col mt-auto pt-3 md:pt-4 w-full">
              <div
                className="pl-2 border-l-[3px] w-full min-w-0 mb-1"
                style={{ borderColor: tierColor }}
              >
                <GridValueDisplay unit={unit as GridUnit} />
              </div>

              <GridStatFooter
                rarity={unit.rarity}
                liquidity={unit.liquidity || "Average"}
              />
            </div>
          </div>
        </div>
      </div>

      {menuOpen &&
        !isSelectMode &&
        createPortal(
          <div className="fixed inset-0 z-[1000000] flex flex-col justify-end md:justify-center md:items-center">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <div className="relative w-full md:max-w-sm bg-popover rounded-t-[12px] md:rounded-[6px] p-5 shadow-2xl border-t md:border border-border animate-slide-up md:animate-fade-in">
              <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border rounded-full" />

              <div className="flex items-center justify-between mb-5 mt-2 md:mt-0">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="w-12 h-12 rounded-[4px] overflow-hidden bg-muted border border-border shrink-0 relative">
                    <UnitAvatar
                      unitId={unit.id}
                      unitName={unit.name}
                      imageUrl={unit.imageUrl}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[16px] font-black text-foreground tracking-tight truncate">
                      {unit.name}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                      {unit.subtitle}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-11 h-11 md:w-8 md:h-8 rounded-[4px] border border-transparent hover:border-border hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0 focus-visible:outline-none"
                >
                  <X className="w-6 h-6 md:w-4 md:h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleAdd("give")}
                  className="w-full flex items-center justify-center gap-2 bg-[#FAA61A] hover:bg-[#d98b14] transition-colors text-white text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none"
                >
                  <ArrowUpCircle className="w-4 h-4" /> Add to 'You Give'
                </button>
                <button
                  onClick={() => handleAdd("get")}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 transition-colors text-primary-foreground text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none"
                >
                  <ArrowDownCircle className="w-4 h-4" /> Add to 'You Get'
                </button>
                <button
                  onClick={handleSaveToInventory}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 bg-[#23a559] hover:bg-[#1f914e] disabled:opacity-50 transition-colors text-white text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  {isSaving ? "Saving..." : "Save to My Inventory"}
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    openModal(unit.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-card hover:bg-muted transition-colors text-foreground border border-border text-[13px] font-bold h-[44px] rounded-[4px] mt-0.5 focus-visible:outline-none"
                >
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
