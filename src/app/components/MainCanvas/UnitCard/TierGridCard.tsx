import React, { useState, memo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";
import { GiPayMoney, GiReceiveMoney, GiHourglass, GiChest } from "react-icons/gi";
import { PopupUnit, GridUnit, MasterUnit } from "../../../../types";
import {
  getTier,
  TIER_CONFIG,
  getObtainability,
  getProxyImage,
  GRID_STATUS_CFG,
  THEORY_RARITY_SCALE,
  THEORY_LIQUIDITY_SCALE,
  UNIT_IMAGES,
} from "../../../../data";
import { getAvatarStyle, getInitials } from "../../TradeAnalyzer/summaryUtils";
import { useTradeStore } from "../../../../store/useTradeStore";
import { useHistoryModalStore } from "../../../../store/useHistoryModalStore";
import { triggerHaptic } from "../../../../data/helpers";
import { useAuthStore } from "../../../../store/useAuthStore";
import { useInventoryStore } from "../../../../store/useInventoryStore";
import {
  HighlightText,
  NoticeTooltip,
  StatusIcon,
} from "../../shared/Formatters";
import { GridValueDisplay } from "./GridValueDisplay";
import { useToastStore } from "../../../../store/useToastStore";

/* -------------------------------------------------------------------------- */
/* Image fallback (module-level, zero React state)                            */
/* -------------------------------------------------------------------------- */

const BLANK_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * URLs that have already 404'd this session. Lives outside React so virtualized
 * cards that unmount/remount never re-request (or re-flash) a known-bad image.
 */
const FAILED_IMAGE_URLS = new Set<string>();

/** Uncompressed Fandom source, or a blank pixel if no source exists. */
const getFallbackUrl = (unitId: string): string => {
  const raw = UNIT_IMAGES[unitId];
  if (!raw || raw === "PLACEHOLDER_URL") return BLANK_PIXEL;
  const base = raw.replace(/&amp;/g, "&").split("/revision/")[0];
  return `${base}/revision/latest/scale-to-width-down/150`;
};

/**
 * Mutates the <img> directly. No setState, so no re-render mid-scroll.
 * data-fb: undefined = primary, "1" = on fallback, "2" = gave up.
 */
function handleCardImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  primaryUrl: string,
  fallbackUrl: string
) {
  const img = e.currentTarget;
  const stage = img.dataset.fb;

  if (stage === "2") return;

  if (stage === "1") {
    // Fallback failed too.
    FAILED_IMAGE_URLS.add(fallbackUrl);
    img.dataset.fb = "2";
    img.style.opacity = "0";
    img.src = BLANK_PIXEL;
    return;
  }

  FAILED_IMAGE_URLS.add(primaryUrl);
  img.dataset.fb = "1";
  if (fallbackUrl === BLANK_PIXEL) img.style.opacity = "0";
  img.src = fallbackUrl;
}

const CardImage = memo(function CardImage({
  unitId,
  unitName,
  initialsClassName = "text-4xl md:text-6xl",
}: {
  unitId: string;
  unitName: string;
  initialsClassName?: string;
}) {
  const primary = getProxyImage(unitId) as string;
  const fallback = getFallbackUrl(unitId);
  const primaryFailed = FAILED_IMAGE_URLS.has(primary);

  // Known-bad URL: skip straight to the fallback on first paint.
  const src = !primaryFailed
    ? primary
    : FAILED_IMAGE_URLS.has(fallback)
    ? BLANK_PIXEL
    : fallback;

  return (
    <>
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-center text-white font-black tracking-tight z-0 opacity-20 select-none pointer-events-none ${initialsClassName}`}
        style={getAvatarStyle(unitName)}
      >
        {getInitials(unitName)}
      </div>
      <img
        src={src}
        alt={unitName}
        width={150}
        height={150}
        decoding="async"
        data-fb={primaryFailed ? "1" : undefined}
        onError={(e) => handleCardImageError(e, primary, fallback)}
        className="absolute inset-0 w-full h-full object-cover z-10 bg-[#0b0c0e]"
        style={{
          objectPosition: "center 15%",
          opacity: src === BLANK_PIXEL ? 0 : undefined,
        }}
      />
    </>
  );
});

/* -------------------------------------------------------------------------- */
/* Status Badge                                                               */
/* -------------------------------------------------------------------------- */

export function GridStatusBadge({ status }: { status: string }) {
  const c = GRID_STATUS_CFG[status as keyof typeof GRID_STATUS_CFG];

  const badgeRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  // Hooks above, early return below (Rules of Hooks).
  if (!c) return null;

  const openTip = () => {
    const r = badgeRef.current?.getBoundingClientRect();
    if (!r) return;

    const tipWidth = 240;
    const padding = 16;
    let startX = r.left + r.width / 2;

    const leftEdge = startX - tipWidth / 2;
    const rightEdge = startX + tipWidth / 2;

    if (leftEdge < padding) {
      startX += padding - leftEdge;
    } else if (rightEdge > window.innerWidth - padding) {
      startX -= rightEdge - (window.innerWidth - padding);
    }

    setTipPos({ x: startX, y: r.top - 8 });
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
        <span className="text-xs font-semibold transition-colors leading-none">
          {c.label}
        </span>
      </div>

      {tipPos &&
        createPortal(
          <>
            <div
              className="md:hidden fixed inset-0 z-[99998] pointer-events-none"
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
  onRarityClick,
  onLiquidityClick,
}: {
  rarity: number | string;
  liquidity: number | string;
  onRarityClick?: (e: React.MouseEvent) => void;
  onLiquidityClick?: (e: React.MouseEvent) => void;
}) {
  const numVal = Number(rarity) || 0;
  const rarityDisplay = numVal % 1 === 0 ? String(numVal) : numVal.toFixed(1);

  const liqStr = String(liquidity || "Average");
  const liqDisplay = liqStr.toLowerCase() === "black marketed" ? "BM" : liqStr;

  const rarityColor =
    THEORY_RARITY_SCALE.find((r) => r.val === Math.round(numVal))?.color ||
    "var(--foreground)";
  const liqColorObj = THEORY_LIQUIDITY_SCALE.find(
    (l) => l.val.toLowerCase() === liqStr.toLowerCase()
  );
  const liqColor = liqColorObj ? liqColorObj.color : "var(--foreground)";

  return (
    <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-border/80 w-full font-mono">
      <div
        onClick={onRarityClick}
        className="flex flex-col bg-muted border border-transparent rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground cursor-pointer"
      >
        <span className="text-[11px] font-medium text-muted-foreground mb-0.5">
          Rarity
        </span>
        <span className="text-[13px] font-black" style={{ color: rarityColor }}>
          {rarityDisplay}
        </span>
      </div>

      <div
        onClick={onLiquidityClick}
        className="flex flex-col bg-muted border border-transparent rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground cursor-pointer"
      >
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

interface TierGridCardProps {
  unit: GridUnit;
  searchQuery?: string;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  index?: number;
}

function TierGridCardImpl({
  unit,
  searchQuery,
  isSelectMode,
  isSelected,
  onToggleSelect,
}: TierGridCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addCard = useTradeStore((state) => state.addCard);
  const openModal = useHistoryModalStore((state) => state.openModal);
  const profile = useAuthStore((state) => state.profile);
  const addOrUpdateUnit = useInventoryStore((state) => state.addOrUpdateUnit);

  // Boolean selector: only re-renders when THIS card's membership flips,
  // not on every trade-array change.
  const isInTrade = useTradeStore(
    (s) =>
      s.giveItems.some((c) => c.id === unit.id) ||
      s.getItems.some((c) => c.id === unit.id)
  );

  const prefersReducedMotion = useReducedMotion();

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
      useToastStore.getState().addToast(`Added ${unit.name} to Vault`, "success");
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
      new CustomEvent("trade-added", {
        detail: { name: popupUnit.name, type },
      })
    );
    setMenuOpen(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("unit", JSON.stringify(popupUnit));
    e.dataTransfer.effectAllowed = "copy";

    // Skip the heavy browser-generated ghost image.
    let ghost = document.getElementById("drag-ghost");
    if (!ghost) {
      ghost = document.createElement("div");
      ghost.id = "drag-ghost";
      ghost.style.position = "absolute";
      ghost.style.top = "-1000px";
      ghost.style.width = "1px";
      ghost.style.height = "1px";
      document.body.appendChild(ghost);
    }
    e.dataTransfer.setDragImage(ghost, 0, 0);
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
        <motion.div
          // @ts-expect-error Framer motion types omit draggable in favor of its own drag prop, but we use native HTML5 drag
          draggable={!isSelectMode}
          onDragStart={handleDragStart as any}
          onClick={handleCardClick}
          onContextMenu={(e) => e.preventDefault()}
          whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`flex flex-col h-full rounded-[8px] overflow-hidden cursor-pointer relative z-10 bg-card border [contain:layout_style] transition-[transform,box-shadow,border-color] duration-300 ${
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
          {/* Image: square box is reserved before the bitmap arrives */}
          <div
            className="relative w-full overflow-hidden flex-shrink-0 border-b border-border bg-[#0b0c0e]"
            style={{
              aspectRatio: "1/1",
              transform: "translateZ(0)",
              borderColor: `${tierColor}30`,
            }}
          >
            <CardImage unitId={unit.id} unitName={unit.name} />

            <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_24px_rgba(0,0,0,0.4)]" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card via-card/50 to-transparent pointer-events-none z-20" />

            {unit.status && (
              <div className="absolute top-2 left-2 z-50">
                <GridStatusBadge status={unit.status} />
              </div>
            )}

            {isSelected && (
              <div className="absolute top-2 right-2 z-50 bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </div>

          {/* Content: every row has a fixed height so cards never resize */}
          <div className="flex flex-col flex-1 p-3 relative z-10 bg-card">
            <div className="flex flex-col">
              <div className="flex items-start gap-2">
                {/* 2 lines x leading-snug (1.375em) = 2.75em, locked */}
                <h3 className="text-[var(--ui-text-base)] font-extrabold tracking-tight leading-snug flex-1 min-w-0 line-clamp-2 text-foreground h-[2.75em]">
                  <HighlightText query={searchQuery} text={unit.name} />
                </h3>

                {unit.notice && (
                  <div className="mt-1">
                    <NoticeTooltip notice={unit.notice} />
                  </div>
                )}
              </div>

              <p className="text-sm font-medium mt-1 h-5 truncate text-muted-foreground">
                <HighlightText text={unit.subtitle || ""} query={searchQuery} />
              </p>

              <div className="flex items-center mt-1.5 h-[18px]">
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

            <div className="flex flex-col mt-auto pt-3 w-full">
              <div
                className="pl-2 border-l-[3px] w-full min-w-0 mb-1 h-9 flex items-center hover:bg-white/5 cursor-pointer rounded-r transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(unit.id, "value");
                }}
                style={{ borderColor: tierColor }}
              >
                <GridValueDisplay unit={unit as GridUnit} />
              </div>

              <GridStatFooter
                rarity={unit.rarity}
                liquidity={unit.liquidity || "Average"}
                onRarityClick={(e) => {
                  e.stopPropagation();
                  openModal(unit.id, "rarity");
                }}
                onLiquidityClick={(e) => {
                  e.stopPropagation();
                  openModal(unit.id, "liquidity");
                }}
              />
            </div>
          </div>

          {isInTrade && !isSelectMode && (
            <div className="absolute inset-0 bg-background/80 z-[60] flex flex-col items-center justify-center pointer-events-none rounded-[8px]">
              <div className="bg-[#23a559] text-white rounded-full p-2 shadow-lg mb-1 border border-white/10">
                <Check className="w-5 h-5 stroke-[4]" />
              </div>
              <span className="text-xs font-semibold text-white">In Trade</span>
            </div>
          )}
        </motion.div>
      </div>

      {menuOpen &&
        !isSelectMode &&
        createPortal(
          <div className="fixed inset-0 z-[1000000] flex flex-col justify-end md:justify-center md:items-center">
            <div
              className="absolute inset-0 bg-black/90"
              onClick={() => setMenuOpen(false)}
            />

            <div className="relative w-full md:max-w-sm bg-popover rounded-t-[12px] md:rounded-[6px] p-5 shadow-2xl border-t md:border border-border animate-slide-up md:animate-fade-in">
              <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border rounded-full" />

              <div className="flex items-center justify-between mb-5 mt-2 md:mt-0">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="w-12 h-12 rounded-[4px] overflow-hidden bg-muted border border-border shrink-0 relative">
                    <CardImage
                      unitId={unit.id}
                      unitName={unit.name}
                      initialsClassName="text-sm"
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
                  aria-label="Close menu"
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
                  <GiPayMoney className="w-4 h-4" />
                  Add to 'You Give'
                </button>

                <button
                  onClick={() => handleAdd("get")}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 transition-colors text-primary-foreground text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none"
                >
                  <GiReceiveMoney className="w-4 h-4" />
                  Add to 'You Get'
                </button>

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
                  {isSaving ? "Saving…" : "Save to My Inventory"}
                </button>

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

              <div className="w-full h-[env(safe-area-inset-bottom)] md:hidden mt-2" />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Re-render only when something this card actually displays changes.
 * onToggleSelect is included because a changed identity would leave a stale
 * closure; it is stable (useCallback) in MainCanvas, so this costs nothing.
 */
function areCardPropsEqual(prev: TierGridCardProps, next: TierGridCardProps) {
  const a = prev.unit;
  const b = next.unit;
  return (
    a.id === b.id &&
    a.value === b.value &&
    a.valueMin === b.valueMin &&
    a.valueDisplay === b.valueDisplay &&
    a.status === b.status &&
    a.rarity === b.rarity &&
    a.liquidity === b.liquidity &&
    a.notice === b.notice &&
    a.name === b.name &&
    a.subtitle === b.subtitle &&
    prev.isSelected === next.isSelected &&
    prev.isSelectMode === next.isSelectMode &&
    prev.searchQuery === next.searchQuery &&
    prev.onToggleSelect === next.onToggleSelect
  );
}

export const TierGridCard = memo(TierGridCardImpl, areCardPropsEqual);