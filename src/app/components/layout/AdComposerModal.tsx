import { useState, useEffect } from "react";
import {
  Check,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import { useTradeStore } from "../../../store/useTradeStore";
import { useTradingAdsStore } from "../../../store/useTradingAdsStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { useInventoryStore } from "../../../store/useInventoryStore";
import { useUnits } from "../../../context/UnitContext";
import { TradeCard } from "../../../types";
import { useNotificationStore } from "../../../store/useNotificationStore";
import { triggerHaptic } from "../../../data/helpers";

const TTL_OPTIONS = [
  { hours: 1, label: "1 Hour" },
  { hours: 4, label: "4 Hours" },
  { hours: 12, label: "12 Hours" },
  { hours: 24, label: "24 Hours" },
];

const PRESET_NOTES = [
  "Upgrading only",
  "Downgrading only",
  "Accepting lower value",
  "Strictly fair trades",
  "DM on Discord to offer",
  "NLF: Low demand units",
];

export function AdComposerModal() {
  const { profile } = useAuthStore();

  const {
    giveItems,
    getItems,
    composerMode,
    isComposerOpen,
    setComposerOpen,
  } = useTradeStore();

  const { createAd } =
    useTradingAdsStore();

  const { items: inventoryItems } =
    useInventoryStore();

  const { units: ALL_UNITS } =
    useUnits();

  const [adType, setAdType] =
    useState<
      "standard" | "lf_offers" | "inventory"
    >("standard");

  useEffect(() => {
    if (isComposerOpen) {
      setAdType(composerMode);
    }
  }, [
    isComposerOpen,
    composerMode,
  ]);

  const [note, setNote] =
    useState("");

  const [ttl, setTtl] =
    useState(4);

  const [isPublishing, setIsPublishing] =
    useState(false);

  const [error, setError] =
    useState("");

  const hasGiveItems =
    giveItems.length > 0;

  const hasGetItems =
    getItems.length > 0;

  const hasUnpinnedInventory =
    inventoryItems.some(
      (i) => !i.is_pinned
    );

  let isReadyToPublish = true;
  let validationHint = "Publish Ad";

  if (adType === "standard") {
    if (
      !hasGiveItems &&
      !hasGetItems
    ) {
      isReadyToPublish = false;
      validationHint =
        "Add Give & Get Items";
    } else if (!hasGiveItems) {
      isReadyToPublish = false;
      validationHint =
        "Add Give Items";
    } else if (!hasGetItems) {
      isReadyToPublish = false;
      validationHint =
        "Add Get Items";
    }
  } else if (
    adType === "lf_offers"
  ) {
    if (!hasGiveItems) {
      isReadyToPublish = false;
      validationHint =
        "Add Give Items";
    }
  } else if (
    adType === "inventory"
  ) {
    if (!hasUnpinnedInventory) {
      isReadyToPublish = false;
      validationHint =
        "Vault is Empty";
    }
  }

  const handlePublish = async () => {
    if (!profile) {
      setError(
        "You must be logged in to post an ad."
      );
      return;
    }

    if (!isReadyToPublish) {
      setError(validationHint);
      return;
    }

    setIsPublishing(true);
    setError("");

    try {
      let submitGive = giveItems;

      if (adType === "inventory") {
        const ObjectCards: TradeCard[] = [];

        const sortedInv =
          [...inventoryItems].sort(
            (a, b) => {
              const m1 =
                ALL_UNITS.find(
                  (u) =>
                    u.id === a.unit_id
                );

              const m2 =
                ALL_UNITS.find(
                  (u) =>
                    u.id === b.unit_id
                );

              const v1 = m1
                ? m1.value === "owner"
                  ? 999999999
                  : Number(m1.value)
                : 0;

              const v2 = m2
                ? m2.value === "owner"
                  ? 999999999
                  : Number(m2.value)
                : 0;

              return v2 - v1;
            }
          );

        for (const itm of sortedInv) {
          if (itm.is_pinned) continue;

          if (
            ObjectCards.length >= 10
          ) {
            break;
          }

          const master =
            ALL_UNITS.find(
              (u) =>
                u.id === itm.unit_id
            );

          if (!master) continue;

          ObjectCards.push({
            id: itm.unit_id,
            name: master.name,
            qty: 1,
            value:
              master.value === "owner" ||
              master.valueDisplay ===
                "O/C"
                ? 0
                : Number(master.value),
            subtitle: master.subtitle,
          });
        }

        submitGive = ObjectCards;
      }

      const result =
        await createAd({
          userId: profile.id,
          giveItems: submitGive,
          getItems:
            adType === "lf_offers" ||
            adType === "inventory"
              ? []
              : getItems,
          note,
          ttlHours: ttl,
          adType,
        });

      if (result?.error) {
        throw result.error;
      }

      window.dispatchEvent(
        new Event("academy-posted-ad")
      );

      void useNotificationStore
        .getState()
        .createNotification({
          user_id: profile.id,
          type: "system",
          message:
            "Your trade ad was published successfully.",
        });

      triggerHaptic("medium");

      setComposerOpen(false);

      window.document.dispatchEvent(
        new CustomEvent("navigate", {
          detail: "trading-ads",
        })
      );
    } catch (err) {
      console.error(
        "Failed to publish trade ad:",
        err
      );

      const failureMessage =
        "Failed to publish trade ad. You may be rate limited.";

      setError(
        "Something went wrong. Please try again."
      );

      void useNotificationStore
        .getState()
        .createNotification({
          user_id: profile.id,
          type: "warning",
          message: failureMessage,
        });

      setTimeout(
        () => setError(""),
        6000
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    triggerHaptic("light");
    setComposerOpen(false);
  };

  return (
    <AnimatePresence>
      {isComposerOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm select-none font-sans"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
              y: 15,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: 15,
            }}
            transition={{
              type: "spring",
              bounce: 0,
              duration: 0.3,
            }}
            className="bg-card border border-border rounded-xl shadow-2xl flex flex-col relative w-full max-w-[560px] max-h-[90vh] overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-popover/50 shrink-0">
              <div>
                <h2 className="text-[16px] font-bold text-foreground">
                  Publish Trade Ad
                </h2>

                <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">
                  Configure how this listing appears on the public board.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-[6px] hover:bg-muted focus-visible:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-6">
              {error && (
                <div className="bg-destructive/15 border border-destructive/40 p-3.5 rounded-[8px] text-destructive text-[13px] font-bold flex items-start gap-3 shadow-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />

                  <span className="leading-snug">
                    {error}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <label className="text-sm font-medium text-muted-foreground px-0.5">
                  Listing Format
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setAdType("standard")
                    }
                    className={`flex flex-col text-left p-4 rounded-[8px] transition-all focus-visible:outline-none cursor-pointer border ${
                      adType === "standard"
                        ? "bg-popover border-primary ring-1 ring-primary/30 shadow-md"
                        : "bg-card hover:bg-muted/60 border-border text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="text-[15px] font-bold text-foreground">
                        Specific Trade
                      </span>

                      {adType ===
                        "standard" && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>

                    <span className="text-[12px] text-zinc-400 leading-relaxed font-medium">
                      Offer specific units in exchange for specific requested units.
                      Requires items in both{" "}
                      <strong className="text-foreground">
                        Give
                      </strong>{" "}
                      and{" "}
                      <strong className="text-foreground">
                        Get
                      </strong>
                      .
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAdType("lf_offers")
                    }
                    className={`flex flex-col text-left p-4 rounded-[8px] transition-all focus-visible:outline-none cursor-pointer border ${
                      adType ===
                      "lf_offers"
                        ? "bg-popover border-[#FAA61A] ring-1 ring-[#FAA61A]/30 shadow-md"
                        : "bg-card hover:bg-muted/60 border-border text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="text-[15px] font-bold text-foreground">
                        Taking Offers (LF Offers)
                      </span>

                      {adType ===
                        "lf_offers" && (
                        <Check className="w-4 h-4 text-[#FAA61A]" />
                      )}
                    </div>

                    <span className="text-[12px] text-zinc-400 leading-relaxed font-medium">
                      Offer your units and leave the request open to general community
                      offers. Requires items only in{" "}
                      <strong className="text-foreground">
                        Give
                      </strong>
                      .
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAdType("inventory")
                    }
                    className={`flex flex-col text-left p-4 rounded-[8px] transition-all focus-visible:outline-none cursor-pointer border ${
                      adType ===
                      "inventory"
                        ? "bg-popover border-[#23a559] ring-1 ring-[#23a559]/30 shadow-md"
                        : "bg-card hover:bg-muted/60 border-border text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="text-[15px] font-bold text-foreground">
                        Vault Showcase
                      </span>

                      {adType ===
                        "inventory" && (
                        <Check className="w-4 h-4 text-[#23a559]" />
                      )}
                    </div>

                    <span className="text-[12px] text-zinc-400 leading-relaxed font-medium">
                      Showcase your entire personal vault collection on the trading board.
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <label className="text-sm font-medium text-muted-foreground px-0.5">
                  Note
                </label>

                <div className="flex flex-wrap gap-2">
                  {PRESET_NOTES.map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setNote(preset)
                        }
                        className="px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-border bg-muted/30 hover:bg-muted hover:text-foreground text-muted-foreground transition-colors"
                      >
                        {preset}
                      </button>
                    )
                  )}
                </div>

                <textarea
                  value={note}
                  onChange={(e) =>
                    setNote(e.target.value)
                  }
                  placeholder="Add a note to your trade ad…"
                  maxLength={500}
                  rows={4}
                  className="w-full min-h-[100px] resize-y rounded-[8px] border border-border bg-input px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />

                <span className="text-[10px] text-muted-foreground self-end">
                  {note.length}/500
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                <label className="text-sm font-medium text-muted-foreground px-0.5">
                  Ad Duration
                </label>

                <div className="grid grid-cols-4 gap-2">
                  {TTL_OPTIONS.map(
                    (option) => (
                      <button
                        key={option.hours}
                        type="button"
                        onClick={() =>
                          setTtl(
                            option.hours
                          )
                        }
                        className={`h-10 rounded-[6px] border text-[12px] font-bold transition-colors ${
                          ttl ===
                          option.hours
                            ? "bg-primary/15 border-primary text-primary"
                            : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-popover border-t border-border flex items-center justify-end gap-3 shrink-0 shadow-sm">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 min-h-[40px] text-[13px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border rounded-[6px] focus-visible:outline-none transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={
                  isPublishing ||
                  !isReadyToPublish
                }
                className="px-5 py-2.5 min-h-[40px] bg-primary text-primary-foreground text-[13px] font-bold rounded-[6px] hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing…
                  </>
                ) : (
                  validationHint
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}