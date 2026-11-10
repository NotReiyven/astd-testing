// ================================================
// FILE: src/app/components/ProfileChannel/tabs/AdHistoryCard.tsx
// ================================================

import {
  GiAbacus,
  GiChatBubble,
  GiCycle,
  GiPadlock,
  GiTrashCan,
  GiWorld,
} from "react-icons/gi";
import { useAdInteractionStore } from "../../../../store/useAdInteractionStore";
import { useHistoryModalStore } from "../../../../store/useHistoryModalStore";
import { triggerHaptic } from "../../../../data/helpers";
import { getUnitConservativeValue } from "../../InventoryChannel/inventoryUtils";
import { AsyncButton } from "../../ui/AsyncButton";
import { AdItemGrid } from "../AdItemGrid";
import { IconSwap } from "../icons";
import { formatRemainingTime, formatTimeAgo } from "../formatters";
import { MasterUnit, TradeCard } from "../../../../types";
import { TradingAd } from "../../../../store/useTradingAdsStore";

export function AdHistoryCard({
  ad,
  ALL_UNITS,
  isOwner,
  isPrivateAd,
  confirmDeleteAdId,
  deletingAdId,
  repostingAdId,
  setConfirmDeleteAdId,
  currentUserId,
  onTogglePrivacy,
  onDelete,
  onRepost,
  onLoadIntoCalculator,
}: {
  ad: TradingAd;
  ALL_UNITS: MasterUnit[];
  isOwner: boolean;
  isPrivateAd: boolean;
  confirmDeleteAdId: string | null;
  deletingAdId: string | null;
  repostingAdId: string | null;
  setConfirmDeleteAdId: (id: string | null) => void;
  currentUserId: string | undefined;
  onTogglePrivacy: (adId: string) => void;
  onDelete: (adId: string) => void;
  onRepost: (ad: TradingAd) => void;
  onLoadIntoCalculator: (ad: TradingAd) => void;
}) {
  const remaining = formatRemainingTime(ad.expires_at);
  const isLive = remaining !== null;

  const isTakingOffers =
    ad.ad_type === "lf_offers" ||
    (ad.ad_type === "standard" && ad.get_items.length === 0);
  const isInventory = ad.ad_type === "inventory";

  let typeLabel = "Specific Trade";
  let typeStyle = "bg-[#5865F2] text-white border-[#4752c4] shadow-xs";
  if (isInventory) {
    typeLabel = "Vault Showcase";
    typeStyle = "bg-[#8b5cf6] text-white border-[#7c3aed] shadow-xs";
  } else if (isTakingOffers) {
    typeLabel = "Taking Offers";
    typeStyle = "bg-[#d97706] text-white border-[#b45309] shadow-xs";
  }

  const totalGiveVal = ad.give_items.reduce(
    (acc: number, i: TradeCard) => {
      const m = ALL_UNITS.find((u) => u.id === i.id);
      const liveVal = m ? getUnitConservativeValue(m) : i.value;
      return acc + liveVal * i.qty;
    },
    0
  );

  const totalGetVal = ad.get_items.reduce(
    (acc: number, i: TradeCard) => {
      const m = ALL_UNITS.find((u) => u.id === i.id);
      const liveVal = m ? getUnitConservativeValue(m) : i.value;
      return acc + liveVal * i.qty;
    },
    0
  );

  return (
    <div
      className={`bg-card border rounded-[8px] p-5 flex flex-col gap-4 transition-colors ${
        isLive ? "border-border" : "border-border opacity-95"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-[#23a559] text-white border border-[#1a7a40] text-[11px] font-mono font-bold uppercase tracking-wider shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE · {remaining}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-[#475569] text-white border border-[#334155] text-[11px] font-mono font-bold uppercase tracking-wider shadow-xs">
              EXPIRED · {formatTimeAgo(ad.created_at)}
            </span>
          )}

          <span
            className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[4px] border ${typeStyle}`}
          >
            {typeLabel}
          </span>

          <span className="text-[12px] font-mono text-muted-foreground">
            Offer Value:{" "}
            <strong className="text-foreground">
              {totalGiveVal.toLocaleString()}
            </strong>
            {totalGetVal > 0 && (
              <>
                {" "}
                · Request:{" "}
                <strong className="text-primary">
                  {totalGetVal.toLocaleString()}
                </strong>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onLoadIntoCalculator(ad)}
            className="h-7 px-2.5 rounded-[4px] bg-[#475569] hover:bg-[#334155] border border-[#334155] text-white text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Load these units into the Trade Analyzer"
          >
            <GiAbacus className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-none">Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              void useAdInteractionStore
                .getState()
                .openAdContext(ad.id, currentUserId);
            }}
            className="h-7 px-2.5 rounded-[4px] bg-[#5865F2] hover:bg-[#4752c4] border border-[#4752c4] text-white text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="View discussion, comments, and trade analytics for this listing"
          >
            <GiChatBubble className="w-3.5 h-3.5 shrink-0 text-white" />
            <span className="leading-none">Discussion</span>
          </button>

          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => onTogglePrivacy(ad.id)}
                className={`h-7 px-2.5 rounded-[4px] border text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95 shrink-0 ${
                  isPrivateAd
                    ? "bg-[#d97706] hover:bg-[#b45309] text-white border-[#b45309]"
                    : "bg-[#23a559] hover:bg-[#1f934f] text-white border-[#1a7a40]"
                }`}
                title={
                  isPrivateAd
                    ? "Hidden from visitors. Click to make Public."
                    : "Visible to visitors. Click to make Private."
                }
              >
                {isPrivateAd ? (
                  <GiPadlock className="w-3.5 h-3.5 text-white shrink-0" />
                ) : (
                  <GiWorld className="w-3.5 h-3.5 text-white shrink-0" />
                )}
                <span className="leading-none">
                  {isPrivateAd ? "Private" : "Public"}
                </span>
              </button>

              {!isLive && (
                <AsyncButton
                  type="button"
                  size="sm"
                  variant="default"
                  isLoading={repostingAdId === ad.id}
                  onClick={() => onRepost(ad)}
                  className="h-7 px-2.5 rounded-[4px] bg-[#5865F2] hover:bg-[#4752c4] border border-[#4752c4] text-white font-bold text-[11px] inline-flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                  title="Repost this trade to the live Trading Board for 24 hours"
                >
                  <GiCycle className="w-3.5 h-3.5 shrink-0" />
                  <span className="leading-none">Repost</span>
                </AsyncButton>
              )}

              {confirmDeleteAdId === ad.id ? (
                <div className="h-7 inline-flex items-center gap-1 bg-[#ef4444] border border-[#b91c1c] rounded-[4px] px-1 shadow-xs text-white shrink-0">
                  <AsyncButton
                    type="button"
                    size="sm"
                    variant="destructive"
                    isLoading={deletingAdId === ad.id}
                    onClick={() => onDelete(ad.id)}
                    className="h-6 px-1.5 text-[11px] font-bold text-white leading-none border-transparent bg-transparent hover:bg-[#b91c1c]"
                  >
                    Confirm Delete
                  </AsyncButton>
                  <span className="text-white">·</span>
                  <button
                    type="button"
                    disabled={deletingAdId === ad.id}
                    onClick={() => setConfirmDeleteAdId(null)}
                    className="text-[11px] font-bold text-white hover:underline px-1 cursor-pointer leading-none disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAdId(ad.id)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-[4px] bg-[#ef4444] hover:bg-[#dc2626] border border-[#b91c1c] text-white transition-colors cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title="Delete ad permanently"
                  aria-label="Delete ad"
                >
                  <GiTrashCan className="w-3.5 h-3.5 shrink-0" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {ad.note && (
        <div className="border-l-2 border-primary pl-3 py-1 text-[12.5px] text-foreground bg-popover rounded-r-[4px]">
          "{ad.note}"
        </div>
      )}

      {isInventory ? (
        <AdItemGrid
          items={ad.give_items}
          ALL_UNITS={ALL_UNITS}
          label="Showcase Units"
          labelColor="var(--muted-foreground)"
          onInspectUnit={(uid) =>
            useHistoryModalStore.getState().openModal(uid, "value")
          }
        />
      ) : isTakingOffers ? (
        <AdItemGrid
          items={ad.give_items}
          ALL_UNITS={ALL_UNITS}
          label="Offering"
          labelColor="var(--warning)"
          onInspectUnit={(uid) =>
            useHistoryModalStore.getState().openModal(uid, "value")
          }
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <AdItemGrid
            items={ad.give_items}
            ALL_UNITS={ALL_UNITS}
            label="Offering"
            labelColor="var(--warning)"
            onInspectUnit={(uid) =>
              useHistoryModalStore.getState().openModal(uid, "value")
            }
          />
          <div className="hidden xl:flex items-center justify-center self-center text-muted-foreground bg-popover p-2 rounded-[6px] border border-border">
            <IconSwap className="w-4 h-4" />
          </div>
          <AdItemGrid
            items={ad.get_items}
            ALL_UNITS={ALL_UNITS}
            label="Requesting"
            labelColor="var(--primary)"
            onInspectUnit={(uid) =>
              useHistoryModalStore.getState().openModal(uid, "value")
            }
          />
        </div>
      )}
    </div>
  );
}