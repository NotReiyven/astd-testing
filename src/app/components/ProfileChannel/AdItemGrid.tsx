// ================================================
// FILE: src/app/components/ProfileChannel/AdItemGrid.tsx
// ================================================

import { memo } from "react";
import { TradeCard, MasterUnit } from "../../../types";
import { TIER_CONFIG, getTier } from "../../../data";
import { getUnitConservativeValue } from "../InventoryChannel/inventoryUtils";
import { UnitAvatar } from "../shared/UnitAvatar";

export const AdItemTile = memo(
  ({
    item,
    ALL_UNITS,
    onInspectUnit,
  }: {
    item: TradeCard;
    ALL_UNITS: MasterUnit[];
    onInspectUnit: (unitId: string) => void;
  }) => {
    const master = ALL_UNITS.find((u) => u.id === item.id);
    const conservativeVal = master
      ? getUnitConservativeValue(master) * item.qty
      : item.value * item.qty;
    const tierKey = master ? getTier(master) : "Untiered";
    const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "var(--border)";

    return (
      <button
        type="button"
        onClick={() => onInspectUnit(item.id)}
        title={`Inspect ${master?.name || item.name} market history`}
        className="w-full flex items-center gap-2.5 p-2 rounded-[6px] bg-popover hover:bg-muted border border-border hover:border-foreground transition-colors text-left cursor-pointer group min-w-0 overflow-hidden"
      >
        <div
          className="relative w-11 h-11 rounded-[5px] bg-muted border flex items-center justify-center overflow-hidden shrink-0"
          style={{ borderColor: tierColor }}
        >
          <UnitAvatar
            unitId={item.id}
            unitName={item.name}
            imageUrl={master?.imageUrl}
            fallbackClassName="absolute inset-0 flex items-center justify-center text-white text-[11px] z-0"
            imageClassName="absolute inset-0 w-full h-full object-cover z-10 bg-muted group-hover:scale-105 transition-transform"
          />
          {item.qty > 1 && (
            <div className="absolute bottom-0 right-0 bg-black text-white text-[10px] px-1 py-0.5 rounded-tl-[4px] z-20 leading-none font-mono">
              x{item.qty}
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
          <span className="text-[12.5px] text-foreground truncate leading-snug">
            {master?.name || item.name}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground mt-0.5 whitespace-nowrap">
            <span style={{ color: tierColor }}>T-{tierKey}</span>
            <span>·</span>
            <span className="text-foreground truncate">
              {master?.value === "owner"
                ? "O/C"
                : conservativeVal.toLocaleString()}
            </span>
          </div>
        </div>
      </button>
    );
  }
);

export function AdItemGrid({
  items,
  ALL_UNITS,
  label,
  labelColor,
  onInspectUnit,
}: {
  items: TradeCard[];
  ALL_UNITS: MasterUnit[];
  label: string;
  labelColor: string;
  onInspectUnit: (unitId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      <span
        className="text-[11.5px] tracking-wide"
        style={{ color: labelColor }}
      >
        {label} ({items.reduce((acc, i) => acc + i.qty, 0)})
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item, idx) => (
          <AdItemTile
            key={`${item.id}-${idx}`}
            item={item}
            ALL_UNITS={ALL_UNITS}
            onInspectUnit={onInspectUnit}
          />
        ))}
      </div>
    </div>
  );
}