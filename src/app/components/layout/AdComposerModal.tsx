import { useState, useEffect, useRef } from "react";
import {
  GiTrade,
  GiMegaphone,
  GiChest,
  GiHourglass,
  GiShieldEchoes,
} from "react-icons/gi";
import { motion, AnimatePresence } from "framer-motion";
import { useTradeStore } from "../../../store/useTradeStore";
import { useTradingAdsStore } from "../../../store/useTradingAdsStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { useInventoryStore } from "../../../store/useInventoryStore";
import { useUnits } from "../../../context/UnitContext";
import { TradeCard } from "../../../types";
import { useNotificationStore } from "../../../store/useNotificationStore";
import { useToastStore } from "../../../store/useToastStore";
import { triggerHaptic } from "../../../data/helpers";
import { logger } from "../../../lib/logger";
import { getProxyImage, handleImageError } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";
import { AsyncButton } from "../ui/AsyncButton";
import { useAdCooldown } from "../../../hooks/useAdCooldown";

const MAX_NOTE_LENGTH = 500;

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
  const profile = useAuthStore((s) => s.profile);
  const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);

  const giveItems = useTradeStore((s) => s.giveItems);
  const getItems = useTradeStore((s) => s.getItems);
  const composerMode = useTradeStore((s) => s.composerMode);
  const isComposerOpen = useTradeStore((s) => s.isComposerOpen);
  const setComposerOpen = useTradeStore((s) => s.setComposerOpen);

  const createAd = useTradingAdsStore((s) => s.createAd);
  const inventoryItems = useInventoryStore((s) => s.items);
  const addToast = useToastStore((s) => s.addToast);
  const { units: ALL_UNITS } = useUnits();
  const {
    isStaff,
    activeAdsCount,
    isAtMaxActiveAds,
    isOnCooldown,
    canPostAd,
    formattedCooldown,
  } = useAdCooldown();

  const [adType, setAdType] = useState<"standard" | "lf_offers" | "inventory">(
    "standard"
  );

  const [note, setNote] = useState("");
  const [ttl, setTtl] = useState(4);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");
  const [itemsError, setItemsError] = useState("");
  const [noteError, setNoteError] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const publishingLockRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFormatBtnRef = useRef<HTMLButtonElement>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isComposerOpen) {
      setAdType(composerMode);
      setError("");
      setItemsError("");
      setNoteError("");
      setShowDiscardConfirm(false);
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      const focusTimer = setTimeout(() => {
        firstFormatBtnRef.current?.focus();
      }, 20);
      return () => clearTimeout(focusTimer);
    } else if (
      previousFocusRef.current &&
      typeof previousFocusRef.current.focus === "function"
    ) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isComposerOpen, composerMode]);

  const hasGiveItems = giveItems.length > 0;
  const hasGetItems = getItems.length > 0;
  const unpinnedInventory = inventoryItems.filter((i) => !i.is_pinned);
  const hasUnpinnedInventory = unpinnedInventory.length > 0;

  // Clear inline item validation when items or adType satisfy requirements
  useEffect(() => {
    if (!itemsError) return;
    if (adType === "standard" && hasGiveItems && hasGetItems) {
      setItemsError("");
    } else if (adType === "lf_offers" && hasGiveItems) {
      setItemsError("");
    } else if (adType === "inventory" && hasUnpinnedInventory) {
      setItemsError("");
    }
  }, [adType, hasGiveItems, hasGetItems, hasUnpinnedInventory, itemsError]);

  useEffect(() => {
    if (noteError && note.trim().length <= MAX_NOTE_LENGTH) {
      setNoteError("");
    }
  }, [note, noteError]);

  const forceClose = () => {
    triggerHaptic("light");
    setShowDiscardConfirm(false);
    setError("");
    setItemsError("");
    setNoteError("");
    setNote("");
    setComposerOpen(false);
  };

  const handleClose = () => {
    if (isPublishing) return;
    if (note.trim().length > 0 && !showDiscardConfirm) {
      triggerHaptic("light");
      setShowDiscardConfirm(true);
      return;
    }
    forceClose();
  };

  useEffect(() => {
    if (!isComposerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else {
          handleClose();
        }
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handlePublish = async () => {
    if (publishingLockRef.current || isPublishing) return;

    setError("");
    setItemsError("");
    setNoteError("");

    if (!profile) {
      setError("Sign in with Discord to publish a trade listing.");
      addToast("Sign in with Discord to publish a trade listing.", "warning", {
        action: {
          label: "Login",
          onClick: loginWithDiscord,
        },
      });
      return;
    }

    if (!isStaff) {
      if (isOnCooldown) {
        setError(`Posting cooldown active. You can publish another listing in ${formattedCooldown}.`);
        return;
      }
      if (isAtMaxActiveAds) {
        setError("Maximum active listings reached: Regular users can have at most 3 active listings at a time.");
        return;
      }
    }

    let nextItemsError = "";
    if (adType === "standard") {
      if (!hasGiveItems && !hasGetItems) {
        nextItemsError =
          "Add at least 1 unit to both You Give and You Get in the Trade Analyzer before publishing a Specific Trade.";
      } else if (!hasGiveItems) {
        nextItemsError =
          "Add at least 1 unit to You Give in the Trade Analyzer before publishing.";
      } else if (!hasGetItems) {
        nextItemsError =
          "Add at least 1 unit to You Get in the Trade Analyzer, or switch Listing Type to Taking Offers.";
      }
    } else if (adType === "lf_offers") {
      if (!hasGiveItems) {
        nextItemsError =
          "Add at least 1 unit to You Give in the Trade Analyzer before publishing an open-offer listing.";
      }
    } else if (adType === "inventory") {
      if (!hasUnpinnedInventory) {
        nextItemsError =
          "Your Vault has no unlocked units to showcase. Add or unlock units in My Vault first.";
      }
    }

    const trimmedNote = note.trim();
    let nextNoteError = "";
    if (note.length > MAX_NOTE_LENGTH) {
      nextNoteError = `Trade note exceeds the ${MAX_NOTE_LENGTH}-character limit by ${
        note.length - MAX_NOTE_LENGTH
      } characters. Shorten your note to publish.`;
    }

    if (nextItemsError || nextNoteError) {
      setItemsError(nextItemsError);
      setNoteError(nextNoteError);
      if (nextItemsError) {
        firstFormatBtnRef.current?.focus();
      } else if (nextNoteError) {
        noteTextareaRef.current?.focus();
      }
      return;
    }

    publishingLockRef.current = true;
    setIsPublishing(true);

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
        note: trimmedNote,
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

      addToast(
        "Published your listing to the Live Trading Board.",
        "success"
      );

      triggerHaptic("medium");
      setNote("");
      setShowDiscardConfirm(false);
      setComposerOpen(false);

      window.document.dispatchEvent(
        new CustomEvent("navigate", {
          detail: "trading-ads",
        })
      );
    } catch (err: any) {
      logger.error('ASTD-UI-032', 'Ad publish failed', { err });

      const errMessage =
        typeof err?.message === "string" && err.message.trim().length > 0
          ? err.message
          : "Could not publish trade ad—you may be rate limited. Try again in a moment.";

      setError(errMessage);

      addToast(errMessage, "error", {
        action: {
          label: "Retry",
          onClick: () => {
            void handlePublish();
          },
        },
      });

      void useNotificationStore.getState().createNotification({
        user_id: profile.id,
        type: "warning",
        message: "Failed to publish trade ad. You may be rate limited.",
      });
    } finally {
      publishingLockRef.current = false;
      setIsPublishing(false);
    }
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
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                  x{item.qty}
                </span>
              )}
            </div>
          );
        })}
        {items.length > 6 && (
          <span className="text-[11px] font-mono font-bold text-muted-foreground px-1.5 py-0.5 bg-card border border-border rounded-[4px] tabular-nums">
            +{items.length - 6} more
          </span>
        )}
      </div>
    );
  };

  const isNoteOverLimit = note.length > MAX_NOTE_LENGTH;

  return (
    <AnimatePresence>
      {isComposerOpen && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-black/80 select-none font-sans"
          role="dialog"
          aria-modal="true"
          aria-label="Publish Trade Ad"
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
                type="button"
                onClick={handleClose}
                aria-label="Close Publish Trade Ad modal"
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
              {showDiscardConfirm && (
                <div
                  role="alert"
                  className="bg-popover border border-[#FAA61A]/50 rounded-[8px] p-3.5 flex flex-col gap-2.5 shadow-sm"
                >
                  <span className="text-[12.5px] font-bold text-foreground leading-snug">
                    Unsaved trade note draft. Discard your note and close?
                  </span>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDiscardConfirm(false)}
                      className="px-3 py-1.5 rounded-[5px] text-[11.5px] font-bold bg-muted hover:bg-card text-foreground border border-border transition-colors cursor-pointer"
                    >
                      Keep Editing
                    </button>
                    <button
                      type="button"
                      onClick={forceClose}
                      className="px-3 py-1.5 rounded-[5px] text-[11.5px] font-bold bg-destructive text-white hover:bg-destructive/90 transition-colors cursor-pointer"
                    >
                      Discard Draft
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="bg-destructive/15 border border-destructive/40 px-3.5 py-2.5 rounded-[6px] text-destructive text-[12px] font-bold flex items-center gap-2.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              {/* Cooldown or Active Listing Status Banners */}
              {isOnCooldown && (
                <div
                  role="alert"
                  className="bg-[#d97706] text-white border border-[#f59e0b]/40 px-3.5 py-2.5 rounded-[6px] text-[12px] font-bold flex items-center justify-between gap-2.5 shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <GiHourglass
                      className="w-4 h-4 text-white animate-spin"
                      style={{ animationDuration: "8s" }}
                    />
                    <span>Posting cooldown active:</span>
                  </div>
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-black/30 text-white tabular-nums">
                    {formattedCooldown}
                  </span>
                </div>
              )}

              {isAtMaxActiveAds && !isOnCooldown && (
                <div
                  role="alert"
                  className="bg-[#ef4444] text-white border border-[#ef4444]/40 px-3.5 py-2.5 rounded-[6px] text-[12px] font-bold flex items-center justify-between gap-2.5 shadow-xs"
                >
                  <span>
                    Listing limit reached (3/3 active). Delete an existing ad to post.
                  </span>
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-black/30 text-white">
                    3/3
                  </span>
                </div>
              )}

              {isStaff ? (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-[4px] bg-[#5865F2] text-white border border-[#5865F2]/40 text-[11px] font-bold shadow-xs">
                  <span className="flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <GiShieldEchoes className="w-3.5 h-3.5 shrink-0" />
                    <span>Staff Bypass Enabled</span>
                  </span>
                  <span className="opacity-95 font-medium normal-case font-sans">Unlimited listings · Zero cooldown</span>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-[4px] bg-muted/60 border border-border text-foreground text-[11px]">
                  <span>
                    Active Listings:{" "}
                    <strong className="text-white font-mono">
                      {activeAdsCount}/3
                    </strong>
                  </span>
                  <span>
                    Cooldown:{" "}
                    <strong className="text-white">15 min</strong>
                  </span>
                </div>
              )}

              {/* 3-Column Format Selector */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Listing Type
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {FORMAT_OPTIONS.map((fmt, idx) => {
                    const Icon = fmt.icon;
                    const isSelected = adType === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        ref={idx === 0 ? firstFormatBtnRef : undefined}
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
              <div className="flex flex-col gap-1.5">
                <div
                  className={`bg-popover/70 border rounded-[8px] p-3 flex flex-col gap-2.5 ${
                    itemsError ? "border-destructive" : "border-border"
                  }`}
                >
                  {adType === "inventory" ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Vault Units
                      </span>
                      <span className="text-[12px] font-mono font-bold text-foreground tabular-nums">
                        {hasUnpinnedInventory
                          ? `Top ${Math.min(10, unpinnedInventory.length)} unlocked units ready`
                          : "No unlocked units in Vault"}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#FAA61A] tabular-nums">
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
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary tabular-nums">
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

                {itemsError && (
                  <p
                    role="alert"
                    aria-live="polite"
                    className="text-[11.5px] font-semibold text-destructive leading-snug"
                  >
                    {itemsError}
                  </p>
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
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      isNoteOverLimit
                        ? "text-destructive font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {note.length}/{MAX_NOTE_LENGTH}
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
                  ref={noteTextareaRef}
                  id="ad-composer-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      void handlePublish();
                    }
                  }}
                  placeholder="Add context or specific conditions…"
                  aria-invalid={Boolean(noteError || isNoteOverLimit)}
                  aria-describedby={noteError ? "ad-composer-note-error" : undefined}
                  rows={2}
                  className={`w-full min-h-[68px] max-h-[140px] resize-y rounded-[6px] border bg-input px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors ${
                    noteError || isNoteOverLimit
                      ? "border-destructive focus-visible:border-destructive"
                      : "border-border focus-visible:border-primary"
                  }`}
                />

                {noteError && (
                  <p
                    id="ad-composer-note-error"
                    role="alert"
                    aria-live="polite"
                    className="text-[11.5px] font-semibold text-destructive leading-snug"
                  >
                    {noteError}
                  </p>
                )}
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
                      className={`py-1 rounded-[4px] text-[11px] font-bold font-mono transition-colors cursor-pointer tabular-nums ${
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
                disabled={isPublishing}
                className="px-4 h-9 text-[12px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-[6px] focus-visible:outline-none transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <AsyncButton
                type="button"
                onClick={handlePublish}
                isLoading={isPublishing}
                loadingAnnouncement="Publishing…"
                disabled={
                  isPublishing || (!isStaff && (isOnCooldown || isAtMaxActiveAds))
                }
                className="px-4 h-9 bg-primary text-primary-foreground text-[12px] font-bold rounded-[6px] hover:bg-primary/90 transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOnCooldown
                  ? `Cooldown (${formattedCooldown})`
                  : isAtMaxActiveAds && !isStaff
                  ? "Limit Reached (3/3)"
                  : "Publish Listing"}
              </AsyncButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}