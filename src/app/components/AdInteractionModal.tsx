import { useState, useEffect, useRef, memo, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  MessageSquare,
  ArrowBigUp,
  ArrowBigDown,
  Send,
  Trash2,
  ShieldAlert,
  Clock,
  Reply,
  Calculator,
  Share2,
  Copy,
  Check,
  ArrowRightLeft,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  useAdInteractionStore,
  AdComment,
} from "../../store/useAdInteractionStore";
import { useTradingAdsStore } from "../../store/useTradingAdsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useHistoryModalStore } from "../../store/useHistoryModalStore";
import { useToastStore } from "../../store/useToastStore";
import { useUnits } from "../../context/UnitContext";
import { useShowDelay } from "../../hooks/useShowDelay";
import {
  getProxyImage,
  getUnitAssetUrl,
  handleImageError,
  GRID_STATUS_CFG,
} from "../../data";
import { triggerHaptic, copyTextWithFallback } from "../../data/helpers";
import { getUnitConservativeValue } from "./InventoryChannel/inventoryUtils";
import {
  getAvatarStyle,
  getInitials,
  getTradeForecast,
  avgStat,
} from "./TradeAnalyzer/summaryUtils";
import { StatusIcon } from "./shared/Formatters";
import { TradeCard, MasterUnit } from "../../types";
import { safeOpenExternal } from "../../store/useExternalLinkStore";
import { AsyncButton } from "./ui/AsyncButton";
import { EmptyState } from "./ui/EmptyState";
import { UserAvatar } from "./shared/UserAvatar";

const MAX_COMMENT_LENGTH = 500;

function getTimeAgoShort(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TOOLTIP_WIDTH = 232;

const ItemTile = memo(
  ({
    item,
    ALL_UNITS,
    onInspectUnit,
  }: {
    item: TradeCard;
    ALL_UNITS: MasterUnit[];
    onInspectUnit: (unitId: string) => void;
  }) => {
    const tileRef = useRef<HTMLButtonElement>(null);
    const [tipPos, setTipPos] = useState<{
      left: number;
      top: number;
      placeBelow: boolean;
      arrowLeft: number;
    } | null>(null);

    const master = ALL_UNITS.find((u) => u.id === item.id);
    const proxyUrl = master ? getProxyImage(master.id, master.imageUrl) : null;
    const singleVal = master ? getUnitConservativeValue(master) : item.value;
    const conservativeVal = singleVal * item.qty;
    const rarity = master?.rarity ?? "N/A";
    const liquidity = master?.liquidity || "Average";
    const liqLower = String(liquidity).toLowerCase();
    const liqColor = liqLower.includes("high")
      ? "#23a559"
      : liqLower.includes("low")
      ? "#ef4444"
      : "#FAA61A";
    const liqShort = liqLower.includes("high")
      ? "High"
      : liqLower.includes("low")
      ? "Low"
      : "Avg";

    const statusCfg = master?.status
      ? GRID_STATUS_CFG[master.status as keyof typeof GRID_STATUS_CFG]
      : null;

    const unitValDisplay =
      master?.value === "owner" || master?.valueDisplay === "O/C"
        ? "O/C"
        : singleVal > 0
        ? singleVal.toLocaleString()
        : master?.valueDisplay || "N/A";

    const updateTooltipPosition = () => {
      const rect = tileRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pad = 14;
      const centerX = rect.left + rect.width / 2;
      const idealLeft = centerX - TOOLTIP_WIDTH / 2;
      const clampedLeft = Math.max(
        pad,
        Math.min(window.innerWidth - TOOLTIP_WIDTH - pad, idealLeft)
      );
      const arrowLeft = Math.max(
        16,
        Math.min(TOOLTIP_WIDTH - 16, centerX - clampedLeft)
      );
      const placeBelow = rect.top < 185;
      const top = placeBelow ? rect.bottom + 8 : rect.top - 8;

      setTipPos({ left: clampedLeft, top, placeBelow, arrowLeft });
    };

    useEffect(() => {
      if (!tipPos) return;
      const handleScrollOrResize = () => setTipPos(null);
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }, [tipPos]);

    return (
      <>
        <button
          ref={tileRef}
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setTipPos(null);
            onInspectUnit(item.id);
          }}
          onMouseEnter={updateTooltipPosition}
          onMouseLeave={() => setTipPos(null)}
          onFocus={updateTooltipPosition}
          onBlur={() => setTipPos(null)}
          className="flex flex-col items-center gap-1.5 group relative cursor-pointer w-full min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[6px]"
          aria-label={`Inspect ${item.name} history`}
        >
          <div className="relative w-full aspect-square rounded-[6px] bg-card border border-border group-hover:border-primary/80 flex items-center justify-center overflow-hidden shadow-sm transition-colors">
            <div
              className="absolute inset-0 flex items-center justify-center text-white font-black text-[12px] z-0"
              style={getAvatarStyle(item.name)}
            >
              {getInitials(item.name)}
            </div>
            {proxyUrl && (
              <img
                src={proxyUrl}
                alt={item.name}
                className="absolute inset-0 w-full h-full object-cover z-10 bg-muted transition-transform duration-200 group-hover:scale-105"
                style={{ objectPosition: "center 15%" }}
                onError={(e) => handleImageError(e, item.id)}
              />
            )}

            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/45 to-transparent z-20 pointer-events-none" />
            <div className="absolute inset-x-1 bottom-1 z-30 flex items-center justify-between pointer-events-none">
              <span className="text-[9.5px] font-black font-mono text-white/95 leading-none truncate drop-shadow tabular-nums">
                {unitValDisplay}
              </span>
            </div>

            {item.qty > 1 && (
              <div className="absolute top-1 right-1 bg-background/95 text-foreground text-[9.5px] font-black px-1.5 py-0.5 rounded-[4px] z-30 border border-border leading-none font-mono shadow-sm tabular-nums">
                ×{item.qty}
              </div>
            )}
          </div>
          <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground truncate w-full text-center leading-tight transition-colors">
            {item.name}
          </span>
        </button>

        {tipPos &&
          master &&
          createPortal(
            <div
              className={`fixed z-[100050] pointer-events-none bg-popover border border-border text-foreground p-3 rounded-[8px] shadow-[0_14px_36px_rgba(0,0,0,0.75)] flex flex-col gap-2 animate-fade-in ${
                tipPos.placeBelow ? "" : "-translate-y-full"
              }`}
              style={{
                left: tipPos.left,
                top: tipPos.top,
                width: TOOLTIP_WIDTH,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-[12.5px] font-extrabold text-foreground leading-tight truncate">
                    {master.name}
                  </span>
                  <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider truncate mt-0.5">
                    {master.subtitle || "Official Unit"}
                  </span>
                </div>
                {statusCfg && (
                  <span
                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[4px] border shrink-0 inline-flex items-center gap-1 leading-none"
                    style={{
                      backgroundColor: statusCfg.bg,
                      color: statusCfg.color,
                      borderColor: statusCfg.border,
                    }}
                  >
                    <StatusIcon status={master.status} />
                    {statusCfg.label}
                  </span>
                )}
              </div>

              <div
                className="grid grid-cols-3 gap-1.5 bg-card/90 p-2 rounded-[6px] border border-border font-mono"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Value
                  </span>
                  <span className="text-[11px] font-black text-foreground truncate mt-0.5">
                    {unitValDisplay}
                  </span>
                </div>
                <div className="flex flex-col min-w-0 border-l border-border/70 pl-1.5">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Rarity
                  </span>
                  <span className="text-[11px] font-black text-[#4DB6AC] truncate mt-0.5">
                    {rarity}
                  </span>
                </div>
                <div className="flex flex-col min-w-0 border-l border-border/70 pl-1.5">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Demand
                  </span>
                  <span
                    className="text-[11px] font-black truncate mt-0.5"
                    style={{ color: liqColor }}
                  >
                    {liqShort}
                  </span>
                </div>
              </div>

              {item.qty > 1 && (
                <div
                  className="flex items-center justify-between text-[10.5px] font-mono px-0.5"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  <span className="text-muted-foreground font-semibold">
                    Stack Total (×{item.qty})
                  </span>
                  <span className="font-black text-foreground">
                    {conservativeVal.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1.5 border-t border-border/60 text-[9.5px] font-bold text-primary">
                <span>Click to view price history</span>
                <span>→</span>
              </div>

              {/* Pointer Arrow */}
              <div
                className={`absolute w-2.5 h-2.5 bg-popover rotate-45 ${
                  tipPos.placeBelow
                    ? "-top-[6px] border-t border-l border-border"
                    : "-bottom-[6px] border-b border-r border-border"
                }`}
                style={{ left: tipPos.arrowLeft - 5 }}
              />
            </div>,
            document.body
          )}
      </>
    );
  }
);

function DiscussionThreadSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 py-2"
      role="status"
      aria-label="Loading discussion comments"
    >
      {[0, 1, 2].map((idx) => (
        <div key={idx} className="flex items-start gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-muted border border-border shrink-0 mt-0.5" />
          <div className="flex-1 bg-muted p-3 rounded-[6px] border border-border flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-28 rounded bg-card" />
              <div className="h-3 w-12 rounded bg-card/70" />
            </div>
            <div className="h-3.5 w-4/5 rounded bg-card/80" />
            <div className="h-3.5 w-2/3 rounded bg-card/60" />
            <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
              <div className="h-5 w-24 rounded bg-card" />
              <div className="h-4 w-12 rounded bg-card/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdInteractionModal() {
  const activeAdId = useAdInteractionStore((s) => s.activeAdId);
  const comments = useAdInteractionStore((s) => s.comments);
  const adVotes = useAdInteractionStore((s) => s.adVotes);
  const commentVotes = useAdInteractionStore((s) => s.commentVotes);
  const isLoading = useAdInteractionStore((s) => s.isLoading);
  const isActionPending = useAdInteractionStore((s) => s.isActionPending);
  const closeAdContext = useAdInteractionStore((s) => s.closeAdContext);
  const postComment = useAdInteractionStore((s) => s.postComment);
  const deleteComment = useAdInteractionStore((s) => s.deleteComment);
  const voteAd = useAdInteractionStore((s) => s.voteAd);
  const voteComment = useAdInteractionStore((s) => s.voteComment);

  const ads = useTradingAdsStore((s) => s.ads);
  const profile = useAuthStore((s) => s.profile);
  const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);
  const overwrite = useTradeStore((s) => s.overwrite);
  const addToast = useToastStore((s) => s.addToast);
  const { units: ALL_UNITS } = useUnits();
  const openPopout = useProfileStore((s) => s.openPopout);
  const openHistoryModal = useHistoryModalStore((s) => s.openModal);

  const activeAd = ads.find((a) => a.id === activeAdId);
  const showDiscussionSkeleton = useShowDelay(isLoading);

  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [repTo, setRepTo] = useState<{ id: string; username: string } | null>(
    null
  );
  const [collapsedThreads, setCollapsedThreads] = useState<
    Record<string, boolean>
  >({});
  const [mobileTab, setMobileTab] = useState<"listing" | "comments">("listing");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDiscord, setCopiedDiscord] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  useEffect(() => {
    if (commentError && newComment.trim().length > 0 && newComment.length <= MAX_COMMENT_LENGTH) {
      setCommentError("");
    }
  }, [newComment, commentError]);

  useEffect(() => {
    if (!activeAdId) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (useHistoryModalStore.getState().isOpen) return;
        e.preventDefault();
        triggerHaptic("light");
        closeAdContext();
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
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [activeAdId, closeAdContext]);

  const forecast = useMemo(() => {
    if (!activeAd) return { calculable: false, st: 0, lt: 0 };
    return getTradeForecast(activeAd.give_items, activeAd.get_items, ALL_UNITS);
  }, [activeAd, ALL_UNITS]);

  const giveRarity = useMemo(() => {
    if (!activeAd) return "-";
    return avgStat(activeAd.give_items, "rarity", ALL_UNITS);
  }, [activeAd, ALL_UNITS]);

  const getRarity = useMemo(() => {
    if (!activeAd) return "-";
    return avgStat(activeAd.get_items, "rarity", ALL_UNITS);
  }, [activeAd, ALL_UNITS]);

  if (!activeAdId || !activeAd) return null;

  const submitCommentText = async (
    textToSubmit: string,
    parentIdToSubmit: string | null
  ) => {
    if (!profile) {
      addToast("Sign in with Discord to post a comment.", "warning", {
        action: {
          label: "Login",
          onClick: loginWithDiscord,
        },
      });
      return;
    }

    const trimmed = textToSubmit.trim();
    if (!trimmed) {
      setCommentError("Enter a comment before posting.");
      textareaRef.current?.focus();
      return;
    }
    if (textToSubmit.length > MAX_COMMENT_LENGTH) {
      setCommentError(
        `Comment exceeds the ${MAX_COMMENT_LENGTH}-character limit by ${
          textToSubmit.length - MAX_COMMENT_LENGTH
        } characters.`
      );
      textareaRef.current?.focus();
      return;
    }

    setCommentError("");
    triggerHaptic("light");
    const success = await postComment(
      activeAdId,
      profile,
      trimmed,
      parentIdToSubmit,
      activeAd?.user_id
    );
    if (success) {
      setNewComment("");
      setRepTo(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } else {
      addToast("Could not post comment—try again.", "error", {
        action: {
          label: "Retry",
          onClick: () => {
            void submitCommentText(textToSubmit, parentIdToSubmit);
          },
        },
      });
    }
  };

  const handlePost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isActionPending) return;
    await submitCommentText(newComment, repTo?.id || null);
  };

  const handleKeyDownTextarea = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handlePost();
    }
  };

  const handleLoadIntoCalculator = () => {
    triggerHaptic("medium");
    const storeBefore = useTradeStore.getState();
    const prevGiveMap = new Map(storeBefore.giveItems.map((c) => [c.id, c]));
    const prevGetMap = new Map(storeBefore.getItems.map((c) => [c.id, c]));

    const nextGiveMap = new Map(activeAd.get_items.map((c) => [c.id, c]));
    const nextGetMap = new Map(activeAd.give_items.map((c) => [c.id, c]));

    type CardDelta = {
      id: string;
      deltaQty: number;
      cardTemplate: TradeCard;
    };

    const giveDeltas: CardDelta[] = [];
    const allGiveIds = new Set([...prevGiveMap.keys(), ...nextGiveMap.keys()]);
    allGiveIds.forEach((id) => {
      const beforeCard = prevGiveMap.get(id);
      const afterCard = nextGiveMap.get(id);
      const beforeQty = beforeCard?.qty ?? 0;
      const afterQty = afterCard?.qty ?? 0;
      if (afterQty !== beforeQty) {
        giveDeltas.push({
          id,
          deltaQty: afterQty - beforeQty,
          cardTemplate: (beforeCard || afterCard)!,
        });
      }
    });

    const getDeltas: CardDelta[] = [];
    const allGetIds = new Set([...prevGetMap.keys(), ...nextGetMap.keys()]);
    allGetIds.forEach((id) => {
      const beforeCard = prevGetMap.get(id);
      const afterCard = nextGetMap.get(id);
      const beforeQty = beforeCard?.qty ?? 0;
      const afterQty = afterCard?.qty ?? 0;
      if (afterQty !== beforeQty) {
        getDeltas.push({
          id,
          deltaQty: afterQty - beforeQty,
          cardTemplate: (beforeCard || afterCard)!,
        });
      }
    });

    overwrite(activeAd.get_items, activeAd.give_items);
    window.dispatchEvent(new Event("open-analyzer"));
    closeAdContext();

    const giveSideCount = activeAd.get_items.length;
    const getSideCount = activeAd.give_items.length;

    addToast(
      `Loaded ${giveSideCount} ${
        giveSideCount === 1 ? "unit" : "units"
      } into You Give & ${getSideCount} ${
        getSideCount === 1 ? "unit" : "units"
      } into You Get.`,
      "success",
      {
        action: {
          label: "Undo",
          onClick: () => {
            const currentStore = useTradeStore.getState();

            const applyUndoSide = (
              side: "give" | "get",
              deltas: CardDelta[]
            ) => {
              const list =
                side === "give"
                  ? currentStore.giveItems
                  : currentStore.getItems;
              for (const d of deltas) {
                const existing = list.find((c) => c.id === d.id);
                if (d.deltaQty > 0) {
                  if (!existing) continue;
                  const targetQty = existing.qty - d.deltaQty;
                  if (targetQty <= 0) {
                    currentStore.removeCard(side, d.id);
                  } else {
                    currentStore.changeQty(side, d.id, targetQty);
                  }
                } else if (d.deltaQty < 0) {
                  const restoreQty = Math.abs(d.deltaQty);
                  if (existing) {
                    currentStore.changeQty(
                      side,
                      d.id,
                      existing.qty + restoreQty
                    );
                  } else {
                    currentStore.addCard(side, {
                      ...d.cardTemplate,
                      qty: restoreQty,
                    });
                  }
                }
              }
            };

            applyUndoSide("give", giveDeltas);
            applyUndoSide("get", getDeltas);
            addToast("Reverted loaded trade listing.", "info");
          },
        },
      }
    );
  };

  const handleShareLink = async () => {
    triggerHaptic("success");
    const ok = await copyTextWithFallback(window.location.href);
    if (ok) {
      setCopiedLink(true);
      addToast("Listing link copied to clipboard!", "success");
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      addToast(
        "Could not copy link automatically—copy the URL from your address bar.",
        "error"
      );
    }
  };

  const handleCopyDiscord = async () => {
    if (!activeAd.profiles?.discord_id) return;
    triggerHaptic("light");
    const ok = await copyTextWithFallback(activeAd.profiles.discord_id);
    if (ok) {
      setCopiedDiscord(true);
      addToast("Discord ID copied to clipboard!", "success");
      setTimeout(() => setCopiedDiscord(false), 2000);
    } else {
      addToast(
        `Could not copy automatically—Discord ID: ${activeAd.profiles.discord_id}`,
        "error"
      );
    }
  };

  const handleAdVoteClick = (val: number) => {
    if (!profile) {
      addToast("Sign in with Discord to vote on listings", "warning", {
        action: {
          label: "Login",
          onClick: loginWithDiscord,
        },
      });
      return;
    }
    triggerHaptic("light");
    void voteAd(activeAd.id, profile.id, val, activeAd.user_id);
  };

  const handleCommentVoteClick = (commentId: string, val: number) => {
    if (!profile) {
      addToast("Sign in with Discord to vote on comments", "warning", {
        action: {
          label: "Login",
          onClick: loginWithDiscord,
        },
      });
      return;
    }
    triggerHaptic("light");
    void voteComment(commentId, profile.id, val);
  };

  const canModerate = (commentUserId: string) => {
    if (!profile) return false;
    return (
      profile.id === commentUserId ||
      ["mod", "admin", "master"].includes(profile.role)
    );
  };

  const rootComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parent_id === parentId);

  const toggleCollapse = (id: string) => {
    triggerHaptic("light");
    setCollapsedThreads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleContact = async () => {
    if (!activeAd.profiles?.discord_id) return;
    triggerHaptic("medium");

    const giveNames = activeAd.give_items
      .map((i) => `${i.qty > 1 ? `${i.qty}x ` : ""}${i.name}`)
      .join(", ");
    const getNames =
      activeAd.get_items.length > 0
        ? activeAd.get_items
            .map((i) => `${i.qty > 1 ? `${i.qty}x ` : ""}${i.name}`)
            .join(", ")
        : "Offers";

    const messageStr = `Hey! Saw your ad on ASTD Value List.\nYou're giving: ${giveNames}\nYou're looking for: ${getNames}\nIs this still available?`;

    const ok = await copyTextWithFallback(messageStr);
    if (ok) {
      addToast("Copied trade message & opening Discord…", "info");
      safeOpenExternal(
        `https://discord.com/users/${activeAd.profiles.discord_id}`
      );
    } else {
      addToast(
        "Could not copy message automatically—opening Discord profile.",
        "warning"
      );
      safeOpenExternal(
        `https://discord.com/users/${activeAd.profiles.discord_id}`
      );
    }
  };

  const CommentThread = ({
    comment,
    depth = 0,
  }: {
    comment: AdComment;
    depth?: number;
  }) => {
    const votes = commentVotes[comment.id] || {
      upvotes: 0,
      downvotes: 0,
      userVote: 0,
    };
    const score = votes.upvotes - votes.downvotes;
    const replies = getReplies(comment.id);
    const isCollapsed = collapsedThreads[comment.id];
    const isOp = comment.user_id === activeAd.user_id;

    return (
      <div
        className={`flex flex-col animate-fade-in ${
          depth > 0 ? "ml-4 sm:ml-6 mt-3 pl-3 border-l border-border" : "mt-4"
        }`}
      >
        <div className="flex items-start gap-3 group">
          <div
            className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity mt-0.5"
            onClick={(e) => {
              triggerHaptic("light");
              const rect = e.currentTarget.getBoundingClientRect();
              openPopout(comment.user_id, rect.left, rect.bottom);
            }}
          >
            <UserAvatar
              avatarUrl={comment.profiles.avatar_url}
              username={comment.profiles.username}
              discordId={comment.profiles.discord_id}
              className="w-8 h-8 rounded-full bg-muted border border-border"
            />
          </div>

          <div className="flex flex-col flex-1 min-w-0 bg-muted hover:bg-muted/80 p-3 rounded-[6px] border border-border transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="text-[var(--ui-text-sm)] font-bold text-foreground truncate cursor-pointer hover:underline"
                  onClick={(e) => {
                    triggerHaptic("light");
                    const rect = e.currentTarget.getBoundingClientRect();
                    openPopout(comment.user_id, rect.left, rect.bottom);
                  }}
                >
                  {comment.profiles.username}
                </span>

                {isOp && (
                  <span className="bg-primary/20 text-primary border border-primary/30 text-[9px] font-black px-1.5 py-0.5 rounded-[2px] uppercase tracking-wider">
                    OP
                  </span>
                )}

                {["mod", "admin", "master"].includes(comment.profiles.role) && (
                  <span className="bg-muted text-foreground border border-border text-[9px] font-black px-1.5 py-0.5 rounded-[2px] uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-2.5 h-2.5 text-primary" /> Staff
                  </span>
                )}
              </div>

              <span className="text-[11px] font-mono font-medium text-muted-foreground shrink-0">
                {getTimeAgoShort(comment.created_at)}
              </span>
            </div>

            <p className="text-[var(--ui-text-sm)] text-foreground leading-relaxed break-all whitespace-pre-wrap font-medium">
              {comment.content}
            </p>

            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-card rounded-[4px] border border-border px-1.5 py-0.5">
                  <button
                    type="button"
                    aria-label="Upvote comment"
                    aria-pressed={votes.userVote === 1}
                    onClick={() => handleCommentVoteClick(comment.id, 1)}
                    className={`focus-visible:outline-none transition-colors hover:text-[#23a559] cursor-pointer ${
                      votes.userVote === 1
                        ? "text-[#23a559]"
                        : "text-muted-foreground"
                    }`}
                  >
                    <ArrowBigUp
                      className={`w-3.5 h-3.5 ${
                        votes.userVote === 1 ? "fill-current" : ""
                      }`}
                    />
                  </button>
                  <span
                    className={`text-[11px] font-bold font-mono tabular-nums ${
                      score > 0
                        ? "text-[#23a559]"
                        : score < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {score}
                  </span>
                  <button
                    type="button"
                    aria-label="Downvote comment"
                    aria-pressed={votes.userVote === -1}
                    onClick={() => handleCommentVoteClick(comment.id, -1)}
                    className={`focus-visible:outline-none transition-[transform,color] duration-150 active:scale-90 hover:text-destructive cursor-pointer ${
                      votes.userVote === -1
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    <ArrowBigDown
                      className={`w-3.5 h-3.5 ${
                        votes.userVote === -1 ? "fill-current" : ""
                      }`}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setRepTo({
                      id: comment.id,
                      username: comment.profiles.username,
                    });
                    textareaRef.current?.focus();
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-[transform,color] duration-150 active:scale-95 focus-visible:outline-none cursor-pointer"
                >
                  <Reply className="w-3 h-3 text-primary" /> Reply
                </button>
              </div>

              <div className="flex items-center gap-3">
                {replies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleCollapse(comment.id)}
                    className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer tabular-nums"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                    {isCollapsed
                      ? `Show replies (${replies.length})`
                      : "Hide replies"}
                  </button>
                )}

                {canModerate(comment.user_id) && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      void deleteComment(comment.id);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {!isCollapsed && replies.length > 0 && (
          <div className="flex flex-col">
            {replies.map((reply) => (
              <CommentThread key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const adScore = adVotes.upvotes - adVotes.downvotes;
  const isTakingOffers =
    activeAd.ad_type === "lf_offers" ||
    (activeAd.ad_type === "standard" && activeAd.get_items.length === 0);
  const isInventory = activeAd.ad_type === "inventory";

  let statusLabel = "Specific Trade";
  let statusColor = "bg-popover border-border text-foreground";
  if (isInventory) {
    statusLabel = "Showcase";
    statusColor = "bg-popover border-border text-foreground";
  } else if (isTakingOffers) {
    statusLabel = "Taking Offers";
    statusColor = "bg-primary/10 border-primary/30 text-primary";
  }

  const totalGiveVal = activeAd.give_items.reduce((acc, i) => {
    const m = ALL_UNITS.find((u) => u.id === i.id);
    const liveVal = m ? getUnitConservativeValue(m) : i.value;
    return acc + liveVal * i.qty;
  }, 0);

  const totalGetVal = activeAd.get_items.reduce((acc, i) => {
    const m = ALL_UNITS.find((u) => u.id === i.id);
    const liveVal = m ? getUnitConservativeValue(m) : i.value;
    return acc + liveVal * i.qty;
  }, 0);

  const valDiff = totalGiveVal - totalGetVal;
  const isCommentOverLimit = newComment.length > MAX_COMMENT_LENGTH;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-0 md:p-[var(--page-p)] bg-black/85 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Trade listing by ${activeAd.profiles?.username || "Trader"}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          triggerHaptic("light");
          closeAdContext();
        }
      }}
    >
      {/* Full width container, springy pop opening animation */}
      <div className="bg-card w-full h-[100dvh] md:h-[85vh] max-w-5xl md:rounded-[8px] shadow-2xl border-0 md:border border-border flex flex-col overflow-hidden animate-modal-pop">
        <div className="flex items-center justify-between px-[var(--panel-p)] py-3 bg-popover border-b border-border shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${statusColor}`}
            >
              {statusLabel}
            </span>
            <span className="text-[12px] font-mono font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Posted{" "}
              {getTimeAgoShort(activeAd.created_at)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleShareLink()}
              className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-[4px] text-[12px] font-bold text-foreground flex items-center gap-1.5 transition-[transform,background-color] duration-150 active:scale-95 focus-visible:outline-none cursor-pointer"
              aria-label="Share listing"
              data-tooltip="Share Listing Link"
              data-tooltip-side="bottom"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-[#23a559]" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className="hidden sm:inline">
                {copiedLink ? "Copied" : "Share"}
              </span>
            </button>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                closeAdContext();
              }}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-none cursor-pointer p-1.5 hover:bg-card rounded-[4px] transition-[transform,background-color,color] duration-150 active:scale-90"
              aria-label="Close listing discussion"
              data-tooltip="Close (Esc)"
              data-tooltip-side="bottom"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex md:hidden bg-input p-1 border-b border-border shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setMobileTab("listing");
            }}
            className={`flex-1 py-1.5 text-[12px] font-bold uppercase tracking-wider rounded-[3px] transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 ${
              mobileTab === "listing"
                ? "bg-foreground text-background shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Listing
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setMobileTab("comments");
            }}
            className={`flex-1 py-1.5 text-[12px] font-bold uppercase tracking-wider rounded-[3px] transition-[transform,background-color,color,box-shadow] duration-150 flex items-center justify-center gap-1.5 active:scale-95 ${
              mobileTab === "comments"
                ? "bg-foreground text-background shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Discussion{" "}
            <span
              className={`px-1.5 rounded text-[10px] font-mono tabular-nums ${
                mobileTab === "comments"
                  ? "bg-background/20 text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {comments.length}
            </span>
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          <div
            className={`w-full md:w-[380px] lg:w-[420px] bg-card border-r border-border flex flex-col shrink-0 min-h-0 ${
              mobileTab === "comments" ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-[var(--panel-p)] flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-[var(--gap-md)]">
              <div className="flex items-center justify-between gap-2 bg-muted p-3.5 rounded-[6px] border border-border shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      triggerHaptic("light");
                      const rect = e.currentTarget.getBoundingClientRect();
                      openPopout(activeAd.user_id, rect.left, rect.bottom);
                    }}
                  >
                    <UserAvatar
                      avatarUrl={activeAd.profiles?.avatar_url}
                      username={activeAd.profiles?.username}
                      discordId={activeAd.profiles?.discord_id}
                      className="w-11 h-11 rounded-full bg-background border border-border"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-[15px] font-black text-foreground truncate cursor-pointer hover:underline"
                      onClick={(e) => {
                        triggerHaptic("light");
                        const rect = e.currentTarget.getBoundingClientRect();
                        openPopout(activeAd.user_id, rect.left, rect.bottom);
                      }}
                    >
                      {activeAd.profiles?.username || "Trader"}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground truncate">
                      {activeAd.profiles?.discord_id
                        ? `@${activeAd.profiles.discord_id}`
                        : "Verified User"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopyDiscord()}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border rounded-[4px] text-[12px] font-bold text-foreground flex items-center gap-1.5 transition-colors shadow-sm focus-visible:outline-none shrink-0 cursor-pointer"
                >
                  {copiedDiscord ? (
                    <Check className="w-3.5 h-3.5 text-[#23a559]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span>{copiedDiscord ? "Copied" : "Discord"}</span>
                </button>
              </div>

              {activeAd.note && (
                <blockquote className="border-l-2 border-primary pl-4 pr-3 py-2 italic text-base md:text-sm text-foreground/90 bg-muted rounded-r-[6px] border border-border shadow-inner break-words">
                  “{activeAd.note}”
                </blockquote>
              )}

              <div className="flex flex-col gap-4 bg-muted rounded-[6px] p-4 border border-border shadow-inner">
                {isInventory ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[12px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                      <span>Showcase Assets</span>
                      <span className="font-mono text-foreground font-black tabular-nums">
                        Value: {totalGiveVal.toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2.5 pt-2">
                      {activeAd.give_items.map((item, i) => (
                        <ItemTile
                          key={i}
                          item={item}
                          ALL_UNITS={ALL_UNITS}
                          onInspectUnit={(unitId) =>
                            openHistoryModal(unitId, "value")
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : isTakingOffers ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[12px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                        <span>Offering</span>
                        <span className="font-mono font-black text-foreground tabular-nums">
                          {totalGiveVal.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2.5 pt-2">
                        {activeAd.give_items.map((item, i) => (
                          <ItemTile
                            key={i}
                            item={item}
                            ALL_UNITS={ALL_UNITS}
                            onInspectUnit={(unitId) =>
                              openHistoryModal(unitId, "value")
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-border">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                        Requesting
                      </span>
                      <div className="bg-card border border-dashed border-border rounded-[4px] p-5 flex flex-col items-center justify-center text-center gap-2">
                        <Search className="w-7 h-7 text-muted-foreground" />
                        <span className="text-[12px] font-black text-foreground uppercase tracking-wider">
                          Open to offers
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[12px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                        <span>Offering</span>
                        <span className="font-mono font-black text-foreground tabular-nums">
                          {totalGiveVal.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2.5 pt-1">
                        {activeAd.give_items.map((item, i) => (
                          <ItemTile
                            key={i}
                            item={item}
                            ALL_UNITS={ALL_UNITS}
                            onInspectUnit={(unitId) =>
                              openHistoryModal(unitId, "value")
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-center text-muted-foreground bg-card py-1 rounded-[4px] border border-border">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[12px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                        <span>Requesting</span>
                        <span className="font-mono font-black text-foreground tabular-nums">
                          {totalGetVal > 0
                            ? totalGetVal.toLocaleString()
                            : "Negotiable"}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2.5 pt-1">
                        {activeAd.get_items.map((item, i) => (
                          <ItemTile
                            key={i}
                            item={item}
                            ALL_UNITS={ALL_UNITS}
                            onInspectUnit={(unitId) =>
                              openHistoryModal(unitId, "value")
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!isTakingOffers && !isInventory && totalGetVal > 0 && (
                  <div className="mt-2 pt-3 border-t border-border flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className="text-muted-foreground font-bold uppercase">
                        Value Balance
                      </span>
                      <span
                        className={`font-black ${
                          valDiff > 0
                            ? "text-[#23a559]"
                            : valDiff < 0
                            ? "text-rose-400"
                            : "text-foreground"
                        }`}
                      >
                        {valDiff > 0
                          ? `+${valDiff.toLocaleString()} (Advantage)`
                          : valDiff < 0
                          ? `${valDiff.toLocaleString()} (Deficit)`
                          : "Even Trade"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1 tabular-nums">
                      <span className="text-muted-foreground font-bold uppercase">
                        Market Forecast
                      </span>
                      <span
                        className={
                          forecast.st > 0
                            ? "text-[#23a559] font-black"
                            : forecast.st < 0
                            ? "text-rose-400 font-black"
                            : "text-foreground font-black"
                        }
                      >
                        {forecast.calculable
                          ? `ST: ${
                              forecast.st > 0 ? "+" : ""
                            }${forecast.st.toFixed(1)} | LT: ${
                              forecast.lt > 0 ? "+" : ""
                            }${forecast.lt.toFixed(1)}`
                          : "Unavailable"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className="text-muted-foreground font-bold uppercase">
                        Rarity Shift
                      </span>
                      <span className="text-foreground font-bold">
                        {giveRarity} ➔ {getRarity}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-popover border-t border-border shrink-0 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleLoadIntoCalculator}
                className="w-full sm:flex-1 h-[var(--ui-height-btn)] bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-black uppercase tracking-wider rounded-[4px] transition-[transform,background-color] duration-150 active:scale-95 shadow-sm focus-visible:outline-none cursor-pointer flex items-center justify-center gap-2 border border-primary"
                data-tooltip="Load trade into analyzer"
              >
                <Calculator className="w-4 h-4" /> Load into Calculator
              </button>

              <button
                type="button"
                onClick={() => void handleContact()}
                className="w-full sm:w-auto px-4 h-[var(--ui-height-btn)] bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-bold rounded-[4px] transition-[transform,background-color] duration-150 active:scale-95 shadow-sm focus-visible:outline-none cursor-pointer flex items-center justify-center gap-2"
                data-tooltip="Copy trade text & open trader on Discord"
              >
                <MessageSquare className="w-4 h-4" /> Message
              </button>
            </div>
          </div>

          <div
            className={`flex-1 flex flex-col min-w-0 bg-transparent min-h-0 ${
              mobileTab === "listing" ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="hidden md:flex items-center justify-between px-6 py-4 bg-popover border-b border-border shrink-0">
              <h2 className="text-[15px] font-black text-foreground tracking-tight uppercase flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> Discussion{" "}
                <span className="bg-muted text-foreground text-[11px] px-2 py-0.5 rounded-[4px] font-mono border border-border tabular-nums">
                  {comments.length}
                </span>
              </h2>

              <div className="flex items-center gap-1.5 bg-card rounded-[4px] border border-border px-2.5 py-1">
                <button
                  type="button"
                  onClick={() => handleAdVoteClick(1)}
                  className={`focus-visible:outline-none transition-[transform,color] duration-150 active:scale-90 hover:text-[#23a559] cursor-pointer ${
                    adVotes.userVote === 1
                      ? "text-[#23a559]"
                      : "text-muted-foreground"
                  }`}
                  aria-label="Upvote listing"
                  aria-pressed={adVotes.userVote === 1}
                  data-tooltip="Upvote listing"
                >
                  <ArrowBigUp
                    className={`w-4 h-4 ${
                      adVotes.userVote === 1 ? "fill-current" : ""
                    }`}
                  />
                </button>
                <span
                  className={`text-[12px] font-bold font-mono min-w-[20px] text-center tabular-nums ${
                    adScore > 0
                      ? "text-[#23a559]"
                      : adScore < 0
                      ? "text-rose-400"
                      : "text-foreground"
                  }`}
                >
                  {adScore}
                </span>
                <button
                  type="button"
                  onClick={() => handleAdVoteClick(-1)}
                  className={`focus-visible:outline-none transition-[transform,color] duration-150 active:scale-90 hover:text-rose-400 cursor-pointer ${
                    adVotes.userVote === -1
                      ? "text-rose-400"
                      : "text-muted-foreground"
                  }`}
                  aria-label="Downvote listing"
                  aria-pressed={adVotes.userVote === -1}
                  data-tooltip="Downvote listing"
                >
                  <ArrowBigDown
                    className={`w-4 h-4 ${
                      adVotes.userVote === -1 ? "fill-current" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-[var(--panel-p)] flex flex-col pb-8">
              {isLoading ? (
                showDiscussionSkeleton ? (
                  <DiscussionThreadSkeleton />
                ) : null
              ) : rootComments.length === 0 ? (
                <div className="my-auto py-8 max-w-md mx-auto w-full">
                  <EmptyState
                    compact
                    icon={<MessageSquare className="w-5 h-5" />}
                    title="No Comments Yet"
                    description="Be the first to share your thoughts or make an offer on this trade listing."
                    action={
                      profile
                        ? {
                            label: "Write a Comment",
                            onClick: () => textareaRef.current?.focus(),
                          }
                        : {
                            label: "Sign In to Comment",
                            onClick: loginWithDiscord,
                          }
                    }
                  />
                </div>
              ) : (
                rootComments.map((comment) => (
                  <CommentThread key={comment.id} comment={comment} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-popover border-t border-border shrink-0 flex flex-col gap-2">
              {repTo && (
                <div className="flex items-center justify-between bg-card px-3 py-1.5 rounded-[4px] border border-primary/40 animate-fade-in">
                  <span className="text-[12px] font-bold text-foreground flex items-center gap-1.5">
                    <Reply className="w-3.5 h-3.5 text-primary" /> Replying to @
                    {repTo.username}
                  </span>
                  <button
                    type="button"
                    aria-label="Cancel reply"
                    onClick={() => {
                      triggerHaptic("light");
                      setRepTo(null);
                    }}
                    className="text-muted-foreground hover:text-destructive focus-visible:outline-none cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {profile ? (
                <form
                  onSubmit={(e) => void handlePost(e)}
                  className="flex flex-col gap-1.5"
                >
                  <div className="relative flex items-end gap-2">
                    <div className="flex items-center gap-2 mb-1 shrink-0">
                      <UserAvatar
                        avatarUrl={profile.avatar_url}
                        username={profile.username}
                        discordId={profile.discord_id}
                        className="w-8 h-8 rounded-full bg-card border border-border"
                      />
                    </div>

                    <div className="relative flex-1">
                      <textarea
                        ref={textareaRef}
                        value={newComment}
                        onChange={(e) => {
                          setNewComment(e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height =
                            Math.min(e.target.scrollHeight, 120) + "px";
                        }}
                        onKeyDown={handleKeyDownTextarea}
                        placeholder={
                          repTo
                            ? `Write a reply… (⌘/Ctrl+Enter to post)`
                            : `Type a message… (⌘/Ctrl+Enter to post)`
                        }
                        aria-label={repTo ? `Reply to ${repTo.username}` : "Comment on listing"}
                        aria-invalid={Boolean(commentError || isCommentOverLimit)}
                        aria-describedby={commentError ? "ad-comment-error" : undefined}
                        rows={1}
                        disabled={isActionPending}
                        className={`w-full bg-input text-foreground text-base md:text-sm pl-3.5 pr-14 py-2.5 rounded-[4px] outline-none border transition-colors font-medium placeholder:text-muted-foreground resize-none max-h-[120px] custom-scrollbar shadow-inner ${
                          commentError || isCommentOverLimit
                            ? "border-destructive focus:border-destructive"
                            : "border-border focus:border-foreground"
                        }`}
                      />
                      <div
                        className={`absolute right-2.5 bottom-2.5 text-[10px] font-mono pointer-events-none tabular-nums ${
                          isCommentOverLimit
                            ? "text-destructive font-bold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {newComment.length}/{MAX_COMMENT_LENGTH}
                      </div>
                    </div>

                    <AsyncButton
                      type="submit"
                      isLoading={isActionPending}
                      loadingAnnouncement="Posting…"
                      disabled={isActionPending}
                      className="h-10 px-4 flex items-center justify-center rounded-[4px] bg-primary hover:bg-primary/85 text-primary-foreground transition-[transform,background-color] duration-150 active:scale-95 focus-visible:outline-none cursor-pointer shrink-0 border border-primary"
                      aria-label="Post comment"
                      data-tooltip="Post Comment"
                    >
                      <Send className="w-4 h-4" />
                    </AsyncButton>
                  </div>

                  {commentError && (
                    <p
                      id="ad-comment-error"
                      role="alert"
                      aria-live="polite"
                      className="text-[11.5px] font-semibold text-destructive pl-10"
                    >
                      {commentError}
                    </p>
                  )}
                </form>
              ) : (
                <div className="w-full bg-card text-muted-foreground text-[13px] font-bold py-2.5 px-4 rounded-[4px] border border-border flex items-center justify-between gap-3">
                  <span>Sign in with Discord to join the discussion.</span>
                  <button
                    type="button"
                    onClick={loginWithDiscord}
                    className="px-3 py-1.5 rounded-[4px] bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
