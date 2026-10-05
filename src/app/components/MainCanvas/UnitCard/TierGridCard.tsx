import React, { useState, memo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Check } from "lucide-react";
import { GiPayMoney, GiReceiveMoney, GiHourglass, GiChest } from "react-icons/gi";
import { PopupUnit, GridUnit, MasterUnit } from "../../../../types";
import {
  getTier,
  TIER_CONFIG,
  getObtainability,
  GRID_STATUS_CFG,
  THEORY_RARITY_SCALE,
  THEORY_LIQUIDITY_SCALE,
} from "../../../../data";
import { UnitAvatar } from "../../shared/UnitAvatar";
import { useTradeStore } from "../../../../store/useTradeStore";

if (typeof window !== "undefined") {
  const img = new Image();
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  (window as any).__blankDragImg = img;
}

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

/* -------------------------------------------------------------------------- */
/* Status Badge                                                               */
/* -------------------------------------------------------------------------- */

export function GridStatusBadge({ status }: { status: string }) {
  const c = GRID_STATUS_CFG[status as keyof typeof GRID_STATUS_CFG];

  if (!c) return null;

  const badgeRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
      }

      setTipPos(null);
    };
  }, []);

  const openTip = () => {
    const r = badgeRef.current?.getBoundingClientRect();

    if (r) {
      const tipWidth = 240;
      const padding = 16;
      let startX = r.left + r.width / 2;
      
      const leftEdge = startX - tipWidth / 2;
      const rightEdge = startX + tipWidth / 2;
      
      if (leftEdge < padding) {
        startX += (padding - leftEdge);
      } else if (rightEdge > window.innerWidth - padding) {
        startX -= (rightEdge - (window.innerWidth - padding));
      }

      setTipPos({
        x: startX,
        y: r.top - 8,
      });
    }
  };

  const toggleTip = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (tipPos) {
      setTipPos(null);
    } else {
      openTip();
    }
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
        if (hoverTimer.current) {
          clearTimeout(hoverTimer.current);
        }

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

        <span className="text-xs font-semibold transition-colors leading-none">
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
              className="rounded-xl px-3 py-2 pointer-events-none fixed z-[99999] animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.6)] -translate-x-1/2 -translate-y-full"
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

/* -------------------------------------------------------------------------- */
/* Stat Footer                                                                */
/* -------------------------------------------------------------------------- */

export function GridStatFooter({
  rarity,
  liquidity,
}: {
  rarity: number | string;
  liquidity: number | string;
}) {
  const numVal = Number(rarity) || 0;

  const rarityDisplay =
    numVal % 1 === 0 ? String(numVal) : numVal.toFixed(1);

  const liqStr = String(liquidity || "Average");

  const liqDisplay =
    liqStr.toLowerCase() === "black marketed"
      ? "BM"
      : liqStr;

  const rarityColor = THEORY_RARITY_SCALE.find(r => r.val === Math.round(numVal))?.color || "var(--foreground)";
  const liqColorObj = THEORY_LIQUIDITY_SCALE.find(l => l.val.toLowerCase() === liqStr.toLowerCase());
  const liqColor = liqColorObj ? liqColorObj.color : "var(--foreground)";

  return (
    <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-border/80 w-full font-mono">
      <div className="flex flex-col bg-muted border border-transparent rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground">
        <span className="text-[11px] font-medium text-muted-foreground mb-0.5">
          Rarity
        </span>

        <span className="text-[13px] font-black" style={{ color: rarityColor }}>
          {rarityDisplay}
        </span>
      </div>

      <div className="flex flex-col bg-muted border border-transparent rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground">
        <span className="text-[11px] font-medium text-muted-foreground mb-0.5">
          Liquidity
        </span>

        <span className="text-[12px] font-black truncate" style={{ color: liqColor }}>
          {liqDisplay}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tier Grid Card                                                             */
/* -------------------------------------------------------------------------- */

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

  /* ------------------------------------------------------------------------ */
  /* Stores                                                                   */
  /* ------------------------------------------------------------------------ */

  const addCard = useTradeStore((state) => state.addCard);

  const openModal = useHistoryModalStore(
    (state) => state.openModal
  );

  const profile = useAuthStore((state) => state.profile);

  const addOrUpdateUnit = useInventoryStore(
    (state) => state.addOrUpdateUnit
  );

  /* ------------------------------------------------------------------------ */
  /* Inventory                                                                 */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Popup / Trade Data                                                       */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Trade Actions                                                            */
  /* ------------------------------------------------------------------------ */

  const handleAdd = (type: "give" | "get") => {
    addCard(type, {
      ...popupUnit,
      qty: 1,
    });

    window.dispatchEvent(
      new CustomEvent("trade-added", {
        detail: {
          name: popupUnit.name,
          type,
        },
      })
    );

    setMenuOpen(false);
  };

  /* ------------------------------------------------------------------------ */
  /* Drag & Drop                                                              */
  /* ------------------------------------------------------------------------ */

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "unit",
      JSON.stringify(popupUnit)
    );

    e.dataTransfer.effectAllowed = "copy";
  };

  /* ------------------------------------------------------------------------ */
  /* Card Interaction                                                         */
  /* ------------------------------------------------------------------------ */

  const handleCardClick = () => {
    triggerHaptic("light");

    if (isSelectMode && onToggleSelect) {
      onToggleSelect(unit.id);
      return;
    }

    setMenuOpen(true);
  };

  /* ------------------------------------------------------------------------ */
  /* Tier                                                                      */
  /* ------------------------------------------------------------------------ */

  const tierKey = getTier(unit as MasterUnit);

  const tierColor =
    TIER_CONFIG[tierKey]?.badgeColor ||
    "var(--primary)";

  const giveItems = useTradeStore((state) => state.giveItems);
  const getItems = useTradeStore((state) => state.getItems);
  const isInTrade = giveItems.some((c) => c.id === unit.id) || getItems.some((c) => c.id === unit.id);

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      <div className="h-full touch-manipulation">
        <div
          draggable={!isSelectMode}
          onDragStart={handleDragStart}
          onClick={handleCardClick}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex flex-col h-full rounded-[8px] overflow-hidden cursor-pointer relative z-10   bg-card border transition-all duration-300 ${
            isSelected
              ? "border-primary ring-2 ring-primary"
              : "hover:-translate-y-2 hover:shadow-2xl hover:scale-[1.02] ease-out"
          }`}
          style={
            {
              
              borderColor: !isSelected ? `${tierColor}50` : undefined,
            } as React.CSSProperties
          }
        >
          {/* ---------------------------------------------------------------- */}
          {/* Image                                                             */}
          {/* ---------------------------------------------------------------- */}

          <div
            className="relative w-full overflow-hidden flex-shrink-0 border-b border-border bg-[#0b0c0e]"
            style={{
              aspectRatio: "1/1",
              transform: "translateZ(0)",
              borderColor: `${tierColor}30`,
            }}
          >
            <UnitAvatar
              unitId={unit.id}
              unitName={unit.name}
              imageUrl={unit.imageUrl}
              fallbackClassName="absolute inset-0 flex items-center justify-center text-white font-black text-4xl md:text-6xl tracking-tight z-0"
              imageClassName="absolute inset-0 w-full h-full object-cover z-10 bg-transparent"
            />

            {/* Subtle vignette */}
            <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_24px_rgba(0,0,0,0.4)]" />

            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card via-card/50 to-transparent pointer-events-none z-20" />

            {/* Already in Trade overlay */}
            {isInTrade && !isSelectMode && (
              <div className="absolute inset-0 bg-background/80 z-[25] flex flex-col items-center justify-center pointer-events-none">
                <div className="bg-[#23a559] text-white rounded-full p-2 shadow-lg mb-1 border border-white/10">
                  <Check className="w-5 h-5 stroke-[4]" />
                </div>
                <span className="text-xs font-semibold text-white">
                  In Trade
                </span>
              </div>
            )}

            {/* Status */}
            {unit.status && (
              <div className="absolute top-2 left-2 z-50">
                <GridStatusBadge status={unit.status} />
              </div>
            )}

            {/* Selection */}
            {isSelected && (
              <div className="absolute top-2 right-2 z-50 bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Card Content                                                      */}
          {/* ---------------------------------------------------------------- */}

          <div className="flex flex-col flex-1 p-5 relative z-10 bg-card">
            {/* -------------------------------------------------------------- */}
            {/* Header                                                           */}
            {/* -------------------------------------------------------------- */}

            <div className="flex flex-col">
              <div className="flex items-start gap-2">
                <h3 className="text-[var(--ui-text-base)] font-extrabold tracking-tight leading-snug flex-1 min-w-0 line-clamp-2 text-foreground min-h-[2.5em]">
                  <HighlightText
                    query={searchQuery}
                    text={unit.name}
                  />
                </h3>

                {unit.notice && (
                  <div className="mt-1">
                    <NoticeTooltip notice={unit.notice} />
                  </div>
                )}
              </div>

              <p className="text-sm font-medium mt-1 truncate text-muted-foreground">
                <HighlightText
                  text={unit.subtitle || ""}
                  query={searchQuery}
                />
              </p>

              {/* Obtainability */}
              <div className="flex mt-1.5">
                {obtainability === "UNOB" ? (
                  <span className="text-xs font-semibold text-muted-foreground bg-popover px-1.5 py-0.5 rounded-[4px] border border-transparent leading-none">
                    UNOB
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-foreground bg-white/5 px-1.5 py-0.5 rounded-[4px] border border-transparent leading-none">
                    OBN
                  </span>
                )}
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* Value + Stats                                                    */}
            {/* -------------------------------------------------------------- */}

            <div className="flex flex-col mt-auto pt-3 w-full">
              <div
                className="pl-2 border-l-[3px] w-full min-w-0 mb-1"
                style={{
                  borderColor: tierColor,
                }}
              >
                <GridValueDisplay
                  unit={unit as GridUnit}
                />
              </div>

              <GridStatFooter
                rarity={unit.rarity}
                liquidity={unit.liquidity || "Average"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Action Modal                                                          */}
      {/* -------------------------------------------------------------------- */}

      {menuOpen &&
        !isSelectMode &&
        createPortal(
          <div className="fixed inset-0 z-[1000000] flex flex-col justify-end md:justify-center md:items-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/90"
              onClick={() => setMenuOpen(false)}
            />

            {/* Modal */}
            <div className="relative w-full md:max-w-sm bg-popover rounded-t-[12px] md:rounded-[6px] p-5 shadow-2xl border-t md:border border-border animate-slide-up md:animate-fade-in">
              {/* Mobile grab handle */}
              <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border rounded-full" />

              {/* Header */}
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

                    <span className="text-xs font-semibold text-muted-foreground truncate">
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

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {/* Give */}
                <button
                  onClick={() => handleAdd("give")}
                  className="w-full flex items-center justify-center gap-2 bg-[#FAA61A] hover:bg-[#d98b14] transition-colors text-white text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none"
                >
                  <GiPayMoney className="w-4 h-4" />
                  Add to 'You Give'
                </button>

                {/* Get */}
                <button
                  onClick={() => handleAdd("get")}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 transition-colors text-primary-foreground text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none"
                >
                  <GiReceiveMoney className="w-4 h-4" />
                  Add to 'You Get'
                </button>

                {/* Inventory */}
                <button
                  onClick={handleSaveToInventory}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 bg-[#23a559] hover:bg-[#1f914e] disabled:opacity-50 transition-colors text-white text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <GiChest className="w-4 h-4" />
                  )}

                  {isSaving
                    ? "Saving..."
                    : "Save to My Inventory"}
                </button>

                {/* History */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    openModal(unit.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-card hover:bg-muted transition-colors text-foreground border border-border text-[13px] font-bold h-[44px] rounded-[4px] mt-0.5 focus-visible:outline-none"
                >
                  <GiHourglass className="w-4 h-4" />
                  View Market History
                </button>
              </div>

              {/* Safe area */}
              <div className="w-full h-[env(safe-area-inset-bottom)] md:hidden mt-2" />
            </div>
          </div>,
          document.body
        )}
    </>
  );
});


