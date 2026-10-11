import { useCallback, useMemo, memo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TradeCard } from "../../../types";
import { GRID_STATUS_CFG } from "../../../data";
import { useUnits } from "../../../context/UnitContext";
import { useTradeStore } from "../../../store/useTradeStore";
import { StatusIcon, JargonWrap } from "../MainCanvas/UnitGrid";
import { QuantitySelector } from "../ui/QuantitySelector";
import { triggerHaptic } from "../../../data/helpers";
import { UnitAvatar } from "../shared/UnitAvatar";

export const ActiveCardRow = memo(function ActiveCardRow({
  card,
  onQtyChange,
  onRemove,
  isPinned,
  onTogglePin,
}: {
  card: TradeCard;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
}) {
  const { units } = useUnits();
  const collapseUnitsByDefault = useTradeStore(
    (s) => s.analyzerSettings?.collapseUnitsByDefault ?? false
  );
  const [qtyOpen, setQtyOpen] = useState(!collapseUnitsByDefault);

  useEffect(() => {
    setQtyOpen(!collapseUnitsByDefault);
  }, [collapseUnitsByDefault]);

  const masterData = useMemo(
    () => units.find((u) => u.id === card.id),
    [units, card.id]
  );

  const dropCfg = masterData?.status
    ? GRID_STATUS_CFG[masterData.status as keyof typeof GRID_STATUS_CFG]
    : null;

  const handleQtyInput = useCallback(
    (newQty: number) => {
      onQtyChange(card.id, newQty);
    },
    [card.id, onQtyChange]
  );

  const handleRemove = useCallback(() => {
    triggerHaptic("light");
    onRemove(card.id);
  }, [card.id, onRemove]);

  const handlePin = useCallback(() => {
    triggerHaptic("light");
    onTogglePin(card.id);
  }, [card.id, onTogglePin]);

  const toggleQty = useCallback(() => {
    triggerHaptic("light");
    setQtyOpen((o) => !o);
  }, []);

  const isOwnerChoice =
    masterData?.value === "owner" ||
    masterData?.valueDisplay === "Owner's Choice" ||
    masterData?.valueDisplay === "O/C";

  const pinButtonClass = (compact: boolean) =>
    `flex items-center justify-center transition-all duration-150 flex-shrink-0 active:scale-90 rounded-[4px] focus-visible:outline-none cursor-pointer ${
      compact
        ? "w-7 h-7"
        : "w-8 h-8"
    }`;

  const qtyControls = (compact: boolean) => (
    <>
      <QuantitySelector qty={card.qty} onChange={handleQtyInput} minQty={1} />
      <div className="flex items-center flex-shrink-0 gap-1">
        <button
          onClick={handlePin}
          title={isPinned ? "Unpin unit" : "Pin unit (prevents clearing)"}
          className={`${pinButtonClass(compact)} ${
            isPinned
              ? compact
                ? "text-foreground bg-muted border border-border"
                : "bg-primary text-primary-foreground border border-primary"
              : compact
              ? "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
              : "bg-popover text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
          }`}
        >
          <svg
            viewBox="0 0 16 16"
            className={compact ? "w-3.5 h-3.5" : "w-3.5 h-3.5"}
            fill={isPinned ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9.5 2.5L13.5 6.5L12 8L9.5 6.5L6.5 9.5L8 12L6.5 13.5L3.5 10.5L1.5 14.5L5.5 12.5L2.5 9.5L4 8L6.5 9.5L9.5 6.5L8 4L9.5 2.5Z" />
          </svg>
        </button>
        <button
          onClick={handleRemove}
          title="Remove unit"
          className={`${pinButtonClass(compact)} ${
            compact
              ? "text-muted-foreground hover:text-destructive-foreground hover:bg-destructive"
              : "bg-popover border border-border hover:bg-destructive hover:text-destructive-foreground text-muted-foreground"
          }`}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className={compact ? "w-3.5 h-3.5" : "w-3.5 h-3.5"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M4 4L12 12M12 4L4 12" />
          </svg>
        </button>
      </div>
    </>
  );

  return (
    <div
      className={`flex flex-col bg-card hover:bg-muted/70 rounded-[8px] border transition-colors duration-150 group ${
        qtyOpen ? "p-2.5" : "px-2.5 py-1.5"
      } ${isPinned ? "border-primary" : "border-border"}`}
    >
      {/* ── Single Primary Row: Avatar / Name / Inline Qty Pill (when collapsed) / Value / Toggle ── */}
      <div className="flex items-center gap-2 w-full min-w-0">
        <div
          className={`relative ${
            qtyOpen ? "w-9 h-9" : "w-7 h-7"
          } flex-shrink-0 rounded-[4px] bg-muted overflow-hidden flex items-center justify-center border transition-all duration-150 ${
            isPinned ? "border-primary/50" : "border-border"
          }`}
        >
          <UnitAvatar
            unitId={card.id}
            unitName={card.name}
            imageUrl={masterData?.imageUrl}
            isOpaqueFallback
            fallbackClassName="absolute inset-0 flex items-center justify-center text-white font-black text-[11px] z-0"
            imageClassName="absolute inset-0 w-full h-full object-cover object-[center_15%] z-10 bg-muted"
          />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-[13px] font-extrabold text-foreground truncate leading-tight"
              title={card.name}
            >
              {card.name}
            </span>
            {dropCfg && (
              <div
                className="flex-shrink-0 flex items-center gap-1 px-1.5 py-[1px] rounded-[3px]"
                style={{
                  background: dropCfg.bg,
                  border: `1px solid ${dropCfg.border}`,
                }}
              >
                <StatusIcon status={masterData?.status} />
                <span
                  className="text-[8px] font-bold leading-none uppercase tracking-wide"
                  style={{ color: dropCfg.color }}
                >
                  <JargonWrap title={dropCfg.label} tip={dropCfg.tip}>
                    {dropCfg.label}
                  </JargonWrap>
                </span>
              </div>
            )}
          </div>
          {card.subtitle && qtyOpen && (
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide truncate mt-0.5 leading-none">
              {card.subtitle}
            </span>
          )}
        </div>

        {/* Inline Qty Badge when collapsed (both narrow and wide modes) */}
        {!qtyOpen && (
          <button
            type="button"
            onClick={toggleQty}
            title="Expand unit controls"
            className="text-[10.5px] font-bold font-mono text-foreground tabular-nums bg-muted hover:bg-popover border border-border rounded-[4px] px-1.5 py-0.5 shrink-0 cursor-pointer transition-colors"
          >
            ×{card.qty}
          </button>
        )}

        <span
          className="text-[13px] font-bold text-foreground font-mono tracking-tight text-right tabular-nums shrink-0"
          title={isOwnerChoice ? "" : (card.value * card.qty).toLocaleString()}
        >
          {isOwnerChoice ? (
            <JargonWrap
              title="Owner's Choice (O/C)"
              tip="This unit is so rare the owner dictates the price. Value depends entirely on what they want."
            >
              <span className="bg-foreground text-background px-1.5 py-0.5 rounded-[2px] text-[10px] uppercase">
                O/C
              </span>
            </JargonWrap>
          ) : (
            (card.value * card.qty).toLocaleString()
          )}
        </span>

        {/* Wide container inline controls */}
        <div className="hidden @[36rem]/analyzer:flex items-center gap-1.5 shrink-0">
          <AnimatePresence initial={false}>
            {qtyOpen && (
              <motion.div
                key="compact-qty"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.16, ease: "easeInOut" }}
                className="flex items-center gap-1.5 overflow-hidden"
              >
                {qtyControls(true)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Always-present compact collapse/expand button on the right edge */}
        <button
          type="button"
          onClick={toggleQty}
          title={qtyOpen ? "Collapse unit row" : "Expand unit controls"}
          aria-expanded={qtyOpen}
          className="flex items-center justify-center w-6 h-6 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-colors cursor-pointer shrink-0 active:scale-90"
        >
          <motion.span
            animate={{ rotate: qtyOpen ? 180 : 0 }}
            transition={{ duration: 0.16 }}
            className="flex"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="w-3.5 h-3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6L8 10L12 6" />
            </svg>
          </motion.span>
        </button>
      </div>

      {/* ── Narrow / Standard Sidebar Mode: Collapsible Controls Row (completely hidden when !qtyOpen) ── */}
      <AnimatePresence initial={false}>
        {qtyOpen && (
          <motion.div
            key="mobile-qty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeInOut" }}
            className="overflow-hidden @[36rem]/analyzer:hidden"
          >
            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/70 min-w-0">
              <button
                type="button"
                onClick={toggleQty}
                title="Collapse unit controls"
                className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0 hover:text-foreground transition-colors cursor-pointer"
              >
                <span>Qty</span>
              </button>
              <div className="flex items-center gap-1.5 min-w-0">
                {qtyControls(false)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
