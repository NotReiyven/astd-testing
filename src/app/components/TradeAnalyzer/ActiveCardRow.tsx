import { useCallback, useMemo, memo } from "react";
import { X, Pin } from "lucide-react";
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

  const pinButtonClass = (compact: boolean) =>
    `flex items-center justify-center transition-all duration-150 flex-shrink-0 active:scale-90 rounded-[4px] focus-visible:outline-none cursor-pointer ${
      compact
        ? "w-8 h-8"
        : "w-[var(--ui-height-btn)] h-[var(--ui-height-btn)] max-h-9 max-w-9"
    }`;

  const controls = (compact: boolean) => (
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

        <div className="hidden @[36rem]/analyzer:flex items-center gap-1.5 shrink-0">
          {controls(true)}
        </div>
      </div>

      <div className="flex @[36rem]/analyzer:hidden items-center justify-between gap-2 mt-[var(--gap-sm)] pt-[var(--gap-sm)] border-t border-border min-w-0">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
          Qty
        </span>
        <div className="flex items-center gap-1.5 min-w-0">{controls(false)}</div>
      </div>
    </div>
  );
});