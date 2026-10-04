import { useCallback, useMemo, memo, useState } from "react";
import { X, Pin, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TradeCard } from "../../../types";
import { GRID_STATUS_CFG } from "../../../data";
import { useUnits } from "../../../context/UnitContext";
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
  const [qtyOpen, setQtyOpen] = useState(true);

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
        ? "w-8 h-8"
        : "w-[var(--ui-height-btn)] h-[var(--ui-height-btn)] max-h-9 max-w-9"
    }`;

  const qtyControls = (compact: boolean) => (
    <>
      <QuantitySelector qty={card.qty} onChange={handleQtyInput} minQty={1} />
      <div className="flex items-center flex-shrink-0 gap-0.5">
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
                : "bg-popover text-muted-foreground border border-border hover:bg-muted"
          }`}
        >
          <Pin
            className={compact ? "w-[14px] h-[14px]" : "w-4 h-4"}
            style={{ fill: isPinned ? "currentColor" : "none" }}
          />
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
          <X className={compact ? "w-[15px] h-[15px]" : "w-4 h-4"} />
        </button>
      </div>
    </>
  );

  return (
    <div
      className={`flex flex-col bg-card hover:bg-muted p-[var(--card-p)] rounded-[8px] border transition-colors duration-150 group ${
        isPinned ? "border-primary" : "border-border"
      }`}
    >
      {/* ── Top row: avatar / name / value / compact controls ── */}
      <div className="flex items-center gap-[var(--gap-sm)] w-full min-w-0">
        <div
          className={`relative w-10 h-10 flex-shrink-0 rounded-[4px] bg-muted overflow-hidden flex items-center justify-center border ${
            isPinned ? "border-primary/50" : "border-border"
          }`}
        >
          <UnitAvatar
            unitId={card.id}
            unitName={card.name}
            imageUrl={masterData?.imageUrl}
            isOpaqueFallback
            fallbackClassName="absolute inset-0 flex items-center justify-center text-white font-black text-[13px] z-0"
            imageClassName="absolute inset-0 w-full h-full object-cover object-[center_15%] z-10 bg-muted"
          />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-sm font-extrabold text-foreground truncate"
              title={card.name}
            >
              {card.name}
            </span>
            {dropCfg && (
              <div
                className="flex-shrink-0 flex items-center gap-1 px-1.5 py-[1px] rounded-[2px]"
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
          {card.subtitle && (
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide truncate mt-0.5">
              {card.subtitle}
            </span>
          )}
        </div>

        <span
          className="text-sm font-bold text-foreground font-mono tracking-tight text-right tabular-nums shrink-0"
          title={isOwnerChoice ? "" : (card.value * card.qty).toLocaleString()}
        >
          {isOwnerChoice ? (
            <JargonWrap
              title="Owner's Choice (O/C)"
              tip="This unit is so rare the owner dictates the price. Value depends entirely on what they want."
            >
              <span className="bg-foreground text-background px-1.5 py-0.5 rounded-[2px] text-[11px] uppercase">
                O/C
              </span>
            </JargonWrap>
          ) : (
            (card.value * card.qty).toLocaleString()
          )}
        </span>

        {/* Compact mode: qty badge + chevron + pin/remove controls */}
        <div className="hidden @[36rem]/analyzer:flex items-center gap-1.5 shrink-0">
          {/* Qty badge that opens/closes the controls */}
          {!qtyOpen && (
            <span className="text-[10px] font-bold text-muted-foreground tabular-nums bg-muted border border-border rounded-[4px] px-1.5 py-0.5">
              ×{card.qty}
            </span>
          )}
          <button
            onClick={toggleQty}
            title={qtyOpen ? "Collapse quantity" : "Expand quantity"}
            className="flex items-center justify-center w-7 h-7 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all cursor-pointer active:scale-90"
          >
            <motion.span
              animate={{ rotate: qtyOpen ? 180 : 0 }}
              transition={{ duration: 0.18 }}
              className="flex"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {qtyOpen && (
              <motion.div
                key="compact-qty"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="flex items-center gap-1.5 overflow-hidden"
              >
                {qtyControls(true)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Mobile / narrow mode: collapsible QTY row ── */}
      <AnimatePresence initial={false}>
        {qtyOpen && (
          <motion.div
            key="mobile-qty"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden @[36rem]/analyzer:hidden"
          >
            <div className="flex items-center justify-between gap-2 mt-[var(--gap-sm)] pt-[var(--gap-sm)] border-t border-border min-w-0">
              <button
                onClick={toggleQty}
                title="Collapse quantity"
                className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0 hover:text-foreground transition-colors cursor-pointer group/qtylabel"
              >
                <span>Qty</span>
                <motion.span
                  animate={{ rotate: 180 }}
                  className="flex opacity-0 group-hover/qtylabel:opacity-100 transition-opacity"
                >
                  <ChevronDown className="w-3 h-3" />
                </motion.span>
              </button>
              <div className="flex items-center gap-1.5 min-w-0">{qtyControls(false)}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Collapsed pill (narrow mode only) ── */}
      <AnimatePresence initial={false}>
        {!qtyOpen && (
          <motion.div
            key="mobile-collapsed"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden @[36rem]/analyzer:hidden"
          >
            <button
              onClick={toggleQty}
              className="flex items-center gap-1.5 mt-[var(--gap-sm)] pt-[var(--gap-sm)] border-t border-border w-full text-left cursor-pointer hover:text-foreground text-muted-foreground transition-colors"
            >
              <span className="text-[9px] font-bold uppercase tracking-widest">
                Qty
              </span>
              <span className="text-[10px] font-bold tabular-nums bg-muted border border-border rounded-[4px] px-1.5 py-0.5 text-foreground">
                ×{card.qty}
              </span>
              <ChevronDown className="w-3 h-3 ml-auto" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});