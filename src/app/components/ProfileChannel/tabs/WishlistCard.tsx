// ================================================
// FILE: src/app/components/ProfileChannel/tabs/WishlistCard.tsx
// ================================================

import { GiAbacus, GiHourglass } from "react-icons/gi";
import { MasterUnit } from "../../../../types";
import {
  TIER_CONFIG,
  GRID_STATUS_CFG,
  getTier,
  getObtainability,
} from "../../../../data";
import { getUnitConservativeValue } from "../../InventoryChannel/inventoryUtils";
import { UnitAvatar } from "../../shared/UnitAvatar";
import { StatusIcon } from "../../shared/Formatters";
import { useHistoryModalStore } from "../../../../store/useHistoryModalStore";
import { useTradeStore } from "../../../../store/useTradeStore";
import { useInventoryStore } from "../../../../store/useInventoryStore";
import { useToastStore } from "../../../../store/useToastStore";
import { triggerHaptic } from "../../../../data/helpers";
import { IconClose } from "../icons";

export function WishlistCard({
  master,
  isOwner,
  currentUserId,
}: {
  master: MasterUnit;
  isOwner: boolean;
  currentUserId: string | undefined;
}) {
  const openHistoryModal = useHistoryModalStore((s) => s.openModal);
  const addCard = useTradeStore((s) => s.addCard);
  const toggleWishlist = useInventoryStore((s) => s.toggleWishlist);

  const tierKey = getTier(master);
  const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "var(--primary)";
  const obtainability = getObtainability(master);
  const cfg = master.status
    ? GRID_STATUS_CFG[master.status as keyof typeof GRID_STATUS_CFG]
    : null;
  const unitVal =
    master.value === "owner"
      ? "Owner's Choice"
      : getUnitConservativeValue(master).toLocaleString();

  return (
    <div className="bg-card border border-border hover:border-foreground rounded-[8px] p-3.5 flex flex-col justify-between gap-3 transition-colors group min-w-0 overflow-hidden">
      <div className="flex items-start gap-3 min-w-0">
        <div
          onClick={() => openHistoryModal(master.id, "value")}
          className="w-14 h-14 rounded-[6px] bg-popover border overflow-hidden relative shrink-0 cursor-pointer"
          style={{ borderColor: tierColor }}
          title="Inspect Market History"
        >
          <UnitAvatar
            unitId={master.id}
            unitName={master.name}
            imageUrl={master.imageUrl}
            fallbackClassName="absolute inset-0 flex items-center justify-center text-white text-lg z-0"
            imageClassName="absolute inset-0 w-full h-full object-cover z-10 group-hover:scale-105 transition-transform"
          />
          <span
            className="absolute bottom-0 left-0 px-1.5 py-0.5 text-[9.5px] font-mono text-white z-20 rounded-tr-[4px]"
            style={{ backgroundColor: tierColor }}
          >
            {tierKey}
          </span>
        </div>

        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
          <div className="flex items-start justify-between gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => openHistoryModal(master.id, "value")}
              className="text-[14px] text-foreground hover:text-primary truncate text-left cursor-pointer min-w-0"
              title={master.name}
            >
              {master.name}
            </button>

            {isOwner && currentUserId && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  toggleWishlist(currentUserId, master.id);
                }}
                className="text-muted-foreground hover:text-white p-1 rounded-[4px] hover:bg-[#ef4444] transition-colors cursor-pointer shrink-0 shadow-xs"
                title="Remove from Wishlist"
                aria-label={`Remove ${master.name} from wishlist`}
              >
                <IconClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-[11.5px] text-muted-foreground truncate">
            {master.subtitle || "Official Unit"} · {obtainability}
          </span>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[14px] font-mono text-foreground whitespace-nowrap">
              {unitVal}
            </span>
            {cfg && (
              <span
                className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border inline-flex items-center gap-1 leading-none whitespace-nowrap shrink-0 shadow-xs select-none"
                style={{
                  backgroundColor: cfg.bg,
                  color: cfg.color,
                  borderColor: cfg.border,
                }}
              >
                <StatusIcon status={master.status} />
                <span className="leading-none">{cfg.label}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2.5 border-t border-border flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => openHistoryModal(master.id, "rarity")}
            className="flex items-center justify-between px-2.5 py-1 rounded-[5px] bg-popover hover:bg-muted border border-border transition-colors cursor-pointer whitespace-nowrap min-w-0"
            title="Inspect Rarity History"
          >
            <span className="text-muted-foreground">Rarity</span>
            <span className="text-[#4DB6AC] ml-1.5">{master.rarity ?? 0}</span>
          </button>
          <button
            type="button"
            onClick={() => openHistoryModal(master.id, "liquidity")}
            className="flex items-center justify-between px-2.5 py-1 rounded-[5px] bg-popover hover:bg-muted border border-border transition-colors cursor-pointer whitespace-nowrap min-w-0 overflow-hidden"
            title="Inspect Liquidity History"
          >
            <span className="text-muted-foreground shrink-0">Liq</span>
            <span className="text-[#81C784] truncate ml-1.5">
              {master.liquidity || "Avg"}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => openHistoryModal(master.id, "value")}
            className="w-full px-2.5 py-1.5 rounded-[5px] bg-popover hover:bg-muted border border-border text-muted-foreground hover:text-foreground text-[11.5px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="View Market History"
          >
            <GiHourglass className="w-3.5 h-3.5 shrink-0" />
            <span>History</span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              addCard("get", {
                id: master.id,
                name: master.name,
                subtitle: master.subtitle,
                value: getUnitConservativeValue(master),
                qty: 1,
              });
              useToastStore
                .getState()
                .addToast(`Added ${master.name} to 'You Get'`, "success");
            }}
            className="w-full px-2.5 py-1.5 rounded-[5px] bg-[#5865F2] hover:bg-[#4752c4] border border-[#4752c4] text-white font-bold font-mono uppercase tracking-wider text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            title="Add unit to Trade Calculator"
          >
            <GiAbacus className="w-3.5 h-3.5" />
            <span>+ Calculator</span>
          </button>
        </div>
      </div>
    </div>
  );
}