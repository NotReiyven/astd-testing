import { useState, useEffect } from "react";
import {
  GiTrade,
  GiMegaphone,
  GiChest,
  GiHourglass,
} from "react-icons/gi";
import { motion, AnimatePresence } from "framer-motion";
import { useTradeStore } from "../../../store/useTradeStore";
import { useTradingAdsStore } from "../../../store/useTradingAdsStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { useInventoryStore } from "../../../store/useInventoryStore";
import { useUnits } from "../../../context/UnitContext";
import { TradeCard } from "../../../types";
import { useNotificationStore } from "../../../store/useNotificationStore";
import { triggerHaptic } from "../../../data/helpers";
import { getProxyImage, handleImageError } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";

const TTL_OPTIONS = [
  { hours: 1, label: "1h" },
  { hours: 4, label: "4h" },
  { hours: 12, label: "12h" },
  { hours: 24, label: "24h" },
];

const PRESET_NOTES = [
  "Upgrading only",
  "Downgrading only",
  "Accepting lower value",
  "Strictly fair trades",
  "DM on Discord to offer",
  "NLF: Low demand units",
];

const FORMAT_OPTIONS = [
  {
    id: "standard" as const,
    label: "Specific Trade",
    sub: "Give & Get",
    icon: GiTrade,
    activeBorder: "border-primary bg-primary/10 text-foreground",
    iconColor: "text-primary",
    dotColor: "bg-primary",
  },
  {
    id: "lf_offers" as const,
    label: "Taking Offers",
    sub: "Open Request",
    icon: GiMegaphone,
    activeBorder: "border-[#FAA61A] bg-[#FAA61A]/10 text-foreground",
    iconColor: "text-[#FAA61A]",
    dotColor: "bg-[#FAA61A]",
  },
  {
    id: "inventory" as const,
    label: "Vault Showcase",
    sub: "Top 10 Units",
    icon: GiChest,
    activeBorder: "border-[#23a559] bg-[#23a559]/10 text-foreground",
    iconColor: "text-[#23a559]",
    dotColor: "bg-[#23a559]",
  },
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

  const { createAd } = useTradingAdsStore();
  const { items: inventoryItems } = useInventoryStore();
  const { units: ALL_UNITS } = useUnits();

  const [adType, setAdType] = useState<"standard" | "lf_offers" | "inventory">(
    "standard"
  );

  useEffect(() => {
    if (isComposerOpen) {
      setAdType(composerMode);
    }
  }, [isComposerOpen, composerMode]);

  const [note, setNote] = useState("");
  const [ttl, setTtl] = useState(4);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");

  const hasGiveItems = giveItems.length > 0;
  const hasGetItems = getItems.length > 0;
  const unpinnedInventory = inventoryItems.filter((i) => !i.is_pinned);
  const hasUnpinnedInventory = unpinnedInventory.length > 0;

  let isReadyToPublish = true;
  let validationHint = "Publish Listing";

  if (adType === "standard") {
    if (!hasGiveItems && !hasGetItems) {
      isReadyToPublish = false;
      validationHint = "Add Give & Get Items";
    } else if (!hasGiveItems) {
      isReadyToPublish = false;
      validationHint = "Add Give Items";
    } else if (!hasGetItems) {
      isReadyToPublish = false;
      validationHint = "Add Get Items";
    }
  } else if (adType === "lf_offers") {
    if (!hasGiveItems) {
      isReadyToPublish = false;
      validationHint = "Add Give Items";
    }
  } else if (adType === "inventory") {
    if (!hasUnpinnedInventory) {
      isReadyToPublish = false;
      validationHint = "Vault is Empty";
    }
  }

  const handlePublish = async () => {
    if (!profile) {
      setError("You must be logged in to post an ad.");
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

        const sortedInv = [...inventoryItems].sort((a, b) => {
          const m1 = ALL_UNITS.find((u) => u.id === a.unit_id);
          const m2 = ALL_UNITS.find((u) => u.id === b.unit_id);

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
        });

        for (const itm of sortedInv) {
          if (itm.is_pinned) continue;
          if (ObjectCards.length >= 10) break;

          const master = ALL_UNITS.find((u) => u.id === itm.unit_id);
          if (!master) continue;

          ObjectCards.push({
            id: itm.unit_id,
            name: master.name,
            qty: 1,
            value:
              master.value === "owner" || master.valueDisplay === "O/C"
                ? 0
                : Number(master.value),
            subtitle: master.subtitle,
          });
        }

        submitGive = ObjectCards;
      }

      const result = await createAd({
        userId: profile.id,
        giveItems: submitGive,
        getItems:
          adType === "lf_offers" || adType === "inventory" ? [] : getItems,
        note,
        ttlHours: ttl,
        adType,
      });

      if (result?.error) {
        throw result.error;
      }

      window.dispatchEvent(new Event("academy-posted-ad"));

      void useNotificationStore.getState().createNotification({
        user_id: profile.id,
        type: "system",
        message: "Your trade ad was published successfully.",
      });

      triggerHaptic("medium");
      setComposerOpen(false);

      window.document.dispatchEvent(
        new CustomEvent("navigate", {
          detail: "trading-ads",
        })
      );
    } catch (err) {
      console.error("Failed to publish trade ad:", err);

      const failureMessage =
        "Failed to publish trade ad. You may be rate limited.";

      setError("Something went wrong. Please try again.");

      void useNotificationStore.getState().createNotification({
        user_id: profile.id,
        type: "warning",
        message: failureMessage,
      });

      setTimeout(() => setError(""), 6000);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    triggerHaptic("light");
    setComposerOpen(false);
  };

  const renderItemPills = (items: TradeCard[], emptyText: string) => {
    if (items.length === 0) {
      return (
        <span className="text-[11px] text-muted-foreground italic">
          {emptyText}
        </span>
      );
    }
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {items.slice(0, 6).map((item) => {
          const master = ALL_UNITS.find((u) => u.id === item.id);
          const proxyUrl = master
            ? getProxyImage(item.id, master.imageUrl)
            : null;
          return (
            <div
              key={item.id}
              className="flex items-center gap-1.5 bg-card border border-border rounded-[4px] pl-1 pr-2 py-0.5 text-[11px] font-bold text-foreground"
              title={item.name}
            >
              <div className="w-4 h-4 rounded-[2px] overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                {proxyUrl ? (
                  <img
                    src={proxyUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => handleImageError(e, item.id)}
                  />
                ) : (
                  <span
                    className="text-[7px] text-white font-black"
                    style={getAvatarStyle(item.name)}
                  >
                    {getInitials(item.name)}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[90px]">{item.name}</span>
              {item.qty > 1 && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  x{item.qty}
                </span>
              )}
            </div>
          );
        })}
        {items.length > 6 && (
          <span className="text-[11px] font-mono font-bold text-muted-foreground px-1.5 py-0.5 bg-card border border-border rounded-[4px]">
            +{items.length - 6} more
          </span>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isComposerOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm select-none font-sans"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", bounce: 0, duration: 0.25 }}
            className="bg-card border border-border rounded-[10px] shadow-2xl flex flex-col relative w-full max-w-[500px] max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-popover/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-bold text-foreground tracking-tight">
                  Publish Trade Ad
                </h2>
              </div>

              <button
                onClick={handleClose}
                aria-label="Close modal"
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-[5px] hover:bg-muted focus-visible:outline-none cursor-pointer"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="w-3.5 h-3.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-5">
              {error && (
                <div className="bg-destructive/15 border border-destructive/40 px-3.5 py-2.5 rounded-[6px] text-destructive text-[12px] font-bold flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              {/* 3-Column Format Selector */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Listing Type
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {FORMAT_OPTIONS.map((fmt) => {
                    const Icon = fmt.icon;
                    const isSelected = adType === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setAdType(fmt.id);
                        }}
                        className={`flex flex-col items-start p-3 rounded-[8px] border text-left transition-all cursor-pointer focus-visible:outline-none ${
                          isSelected
                            ? fmt.activeBorder
                            : "bg-popover/40 hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2.5">
                          <Icon
                            className={`w-5 h-5 ${
                              isSelected
                                ? fmt.iconColor
                                : "text-muted-foreground"
                            }`}
                          />
                          <span
                            className={`w-2 h-2 rounded-full transition-all ${
                              isSelected
                                ? fmt.dotColor
                                : "border border-border bg-transparent"
                            }`}
                          />
                        </div>
                        <span className="text-[12.5px] font-bold text-foreground leading-tight">
                          {fmt.label}
                        </span>
                        <span className="text-[10.5px] text-muted-foreground font-medium mt-0.5">
                          {fmt.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Payload Summary Strip */}
              <div className="bg-popover/70 border border-border rounded-[8px] p-3 flex flex-col gap-2.5">
                {adType === "inventory" ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Vault Units
                    </span>
                    <span className="text-[12px] font-mono font-bold text-foreground">
                      {hasUnpinnedInventory
                        ? `Top ${Math.min(10, unpinnedInventory.length)} unpinned units ready`
                        : "No unpinned units in Vault"}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#FAA61A]">
                          Offering ({giveItems.reduce((s, i) => s + i.qty, 0)})
                        </span>
                      </div>
                      {renderItemPills(
                        giveItems,
                        "No units in Give column — add units in calculator"
                      )}
                    </div>

                    {adType === "standard" && (
                      <div className="flex flex-col gap-1.5 pt-2 border-t border-border/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                            Requesting ({getItems.reduce((s, i) => s + i.qty, 0)})
                          </span>
                        </div>
                        {renderItemPills(
                          getItems,
                          "No units in Get column — add units in calculator"
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Note & Quick Tags */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="ad-composer-note"
                    className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Trade Note{" "}
                    <span className="text-muted-foreground/60 font-normal normal-case">
                      (optional)
                    </span>
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {note.length}/500
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PRESET_NOTES.map((preset) => {
                    const isActive = note === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setNote(isActive ? "" : preset);
                        }}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-[5px] border transition-colors cursor-pointer ${
                          isActive
                            ? "bg-primary/15 border-primary text-primary"
                            : "border-border bg-popover/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  id="ad-composer-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add context or specific conditions…"
                  maxLength={500}
                  rows={2}
                  className="w-full min-h-[68px] max-h-[140px] resize-y rounded-[6px] border border-border bg-input px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-primary transition-colors"
                />
              </div>

              {/* Compact Duration Bar */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <GiHourglass className="w-3.5 h-3.5 text-muted-foreground" />{" "}
                  Expires In
                </span>

                <div className="grid grid-cols-4 gap-1.5 bg-popover p-1 rounded-[6px] border border-border w-[220px]">
                  {TTL_OPTIONS.map((option) => (
                    <button
                      key={option.hours}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setTtl(option.hours);
                      }}
                      className={`py-1 rounded-[4px] text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                        ttl === option.hours
                          ? "bg-card text-foreground shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-popover/60 border-t border-border flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 h-9 text-[12px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-[6px] focus-visible:outline-none transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing || !isReadyToPublish}
                className="px-4 h-9 bg-primary text-primary-foreground text-[12px] font-bold rounded-[6px] hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                {isPublishing ? "Publishing…" : validationHint}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}