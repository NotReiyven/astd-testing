import { useCallback, useMemo, useState, memo } from "react";
import { X, Pin, ChevronDown } from "lucide-react";
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
  const [isExpanded, setIsExpanded] = useState(false);

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

  const isOwnerChoice =
    masterData?.value === "owner" ||
    masterData?.valueDisplay === "Owner's Choice" ||
    masterData?.valueDisplay === "O/C";

  return (
    <div
      className={`flex flex-col bg-card hover:bg-muted p-[var(--card-p)] rounded-[8px] border transition-colors duration-150 group ${
        isPinned ? "border-primary" : "border-border"
      }`}
    >
      <div className="flex items-center gap-[var(--gap-md)] w-full min-w-0">
        {/* Avatar */}
        <div
          className={`relative w-10 h-10 md:w-11 md:h-11 flex-shrink-0 rounded-[4px] bg-muted overflow-hidden flex items-center justify-center border ${
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

        {/* Info */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[var(--ui-text-base)] font-extrabold text-foreground truncate">
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
            <span className="text-[var(--ui-text-xs)] font-bold text-muted-foreground uppercase tracking-wide truncate mt-0.5">
              {card.subtitle}
            </span>
          )}
        </div>

        {/* Value */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[var(--ui-text-lg)] font-bold text-foreground font-mono tracking-tight text-right truncate max-w-[90px]"
            title={
              isOwnerChoice ? "" : (card.value * card.qty).toLocaleString()
            }
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

          {/* Desktop Controls (Always visible on md+) */}
          <div className="hidden md:flex items-center gap-2 ml-2">
            <QuantitySelector
              qty={card.qty}
              onChange={handleQtyInput}
              minQty={1}
            />
            <div className="flex items-center ml-0.5 flex-shrink-0 gap-0.5">
              <button
                onClick={handlePin}
                title={isPinned ? "Unpin unit" : "Pin unit (prevents clearing)"}
                className={`w-[var(--ui-height-btn)] h-[var(--ui-height-btn)] max-h-8 max-w-8 flex items-center justify-center transition-all duration-150 flex-shrink-0 active:scale-90 rounded-[4px] focus-visible:outline-none cursor-pointer ${
                  isPinned
                    ? "text-foreground bg-muted border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
                }`}
              >
                <Pin
                  className="w-[14px] h-[14px]"
                  style={{ fill: isPinned ? "currentColor" : "none" }}
                />
              </button>
              <button
                onClick={handleRemove}
                title="Remove unit"
                className="w-[var(--ui-height-btn)] h-[var(--ui-height-btn)] max-h-8 max-w-8 flex items-center justify-center text-muted-foreground hover:text-destructive-foreground hover:bg-destructive transition-all duration-150 flex-shrink-0 active:scale-90 rounded-[4px] focus-visible:outline-none cursor-pointer"
              >
                <X className="w-[15px] h-[15px]" />
              </button>
            </div>
          </div>

          {/* Mobile Expand Toggle */}
          <button
            onClick={() => {
              triggerHaptic("light");
              setIsExpanded(!isExpanded);
            }}
            className="md:hidden p-1.5 -mr-1.5 text-muted-foreground focus-visible:outline-none cursor-pointer"
            aria-label="Toggle unit controls"
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Controls */}
      <div
        className={`md:hidden flex items-center justify-between overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded
            ? "max-h-[100px] opacity-100 mt-[var(--gap-sm)] pt-[var(--gap-sm)] border-t border-border"
            : "max-h-0 opacity-0 m-0 p-0 border-transparent"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-[var(--ui-text-xs)] font-bold text-muted-foreground uppercase tracking-widest">
            Quantity
          </span>
          <QuantitySelector qty={card.qty} onChange={handleQtyInput} minQty={1} />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePin}
            className={`w-[var(--ui-height-btn)] h-[var(--ui-height-btn)] max-h-9 max-w-9 flex items-center justify-center rounded-[4px] border transition-all active:scale-95 cursor-pointer ${
              isPinned
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-popover text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            <Pin
              className="w-4 h-4"
              style={{ fill: isPinned ? "currentColor" : "none" }}
            />
          </button>
          <button
            onClick={handleRemove}
            className="w-[var(--ui-height-btn)] h-[var(--ui-height-btn)] max-h-9 max-w-9 flex items-center justify-center bg-popover border border-border hover:bg-destructive hover:text-destructive-foreground text-muted-foreground rounded-[4px] transition-all active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});