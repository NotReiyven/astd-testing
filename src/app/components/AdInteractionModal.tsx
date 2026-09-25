import { useState, useEffect, useRef, memo, useMemo } from "react";
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
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Package,
  Search,
} from "lucide-react";
import {
  useAdInteractionStore,
  AdComment,
} from "../../store/useAdInteractionStore";
import { useTradingAdsStore } from "../../store/useTradingAdsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useUnits } from "../../context/UnitContext";
import { getProxyImage, handleImageError } from "../../data";
import { triggerHaptic } from "../../data/helpers";
import { getUnitConservativeValue } from "./InventoryChannel/inventoryUtils";
import {
  getAvatarStyle,
  getInitials,
  getTradeForecast,
  avgStat,
} from "./TradeAnalyzer/summaryUtils";
import { TradeCard, MasterUnit } from "../../types";
import { safeOpenExternal } from "../../store/useExternalLinkStore";

function getTimeAgoShort(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const ItemTile = memo(
  ({ item, ALL_UNITS }: { item: TradeCard; ALL_UNITS: MasterUnit[] }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const master = ALL_UNITS.find((u) => u.id === item.id);
    const proxyUrl = master ? getProxyImage(master.id, master.imageUrl) : null;
    const conservativeVal = master
      ? getUnitConservativeValue(master) * item.qty
      : item.value * item.qty;
    const rarity = master?.rarity ?? "N/A";

    return (
      <div
        className="flex flex-col items-center gap-1 group relative cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="relative w-16 h-16 rounded-[4px] bg-muted border border-border flex items-center justify-center overflow-hidden shadow-sm group-hover:border-foreground transition-colors">
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
              className="absolute inset-0 w-full h-full object-cover z-10 bg-muted transition-transform group-hover:scale-105"
              onError={(e) => handleImageError(e, item.id)}
            />
          )}
          {item.qty > 1 && (
            <div className="absolute bottom-0 right-0 bg-popover text-foreground text-[10px] font-black px-1.5 py-0.5 rounded-tl-[4px] z-20 border-t border-l border-border leading-none font-mono">
              x{item.qty}
            </div>
          )}
        </div>
        <span
          className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground truncate w-full text-center"
          title={item.name}
        >
          {item.name}
        </span>

        {showTooltip && master && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border text-foreground text-[11px] p-3 rounded-[4px] shadow-2xl pointer-events-none z-50 w-48 animate-fade-in flex flex-col gap-1">
            <div className="font-extrabold text-foreground truncate">
              {master.name}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {master.subtitle || "Official Unit"}
            </div>
            <div className="flex justify-between items-center mt-1 pt-1 border-t border-border font-mono">
              <span className="text-[#4DB6AC]">R: {rarity}</span>
              <span className="text-foreground font-bold">
                {conservativeVal.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export function AdInteractionModal() {
  const {
    activeAdId,
    comments,
    adVotes,
    commentVotes,
    isLoading,
    isActionPending,
    closeAdContext,
    postComment,
    deleteComment,
    voteAd,
    voteComment,
  } = useAdInteractionStore();

  const { ads } = useTradingAdsStore();
  const { profile } = useAuthStore();
  const { overwrite } = useTradeStore();
  const { units: ALL_UNITS } = useUnits();
  const openPopout = useProfileStore((s) => s.openPopout);

  const activeAd = ads.find((a) => a.id === activeAdId);

  const [newComment, setNewComment] = useState("");
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        triggerHaptic("light");
        closeAdContext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeAdContext]);

  const forecast = useMemo(() => {
    if (!activeAd) return { calculable: false, st: 0, lt: 0 };
    return getTradeForecast(activeAd.give_items, activeAd.get_items, ALL_UNITS);
  }, [activeAd, ALL_UNITS]);

  const giveRarity = useMemo(() => {
    if (!activeAd) return "—";
    return avgStat(activeAd.give_items, "rarity", ALL_UNITS);
  }, [activeAd, ALL_UNITS]);

  const getRarity = useMemo(() => {
    if (!activeAd) return "—";
    return avgStat(activeAd.get_items, "rarity", ALL_UNITS);
  }, [activeAd, ALL_UNITS]);

  if (!activeAdId || !activeAd) return null;

  const handlePost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newComment.trim() || !profile) return;

    triggerHaptic("light");
    const success = await postComment(
      activeAdId,
      profile,
      newComment,
      repTo?.id || null
    );
    if (success) {
      setNewComment("");
      setRepTo(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDownTextarea = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  const handleLoadIntoCalculator = () => {
    triggerHaptic("medium");
    overwrite(activeAd.get_items, activeAd.give_items);
    window.dispatchEvent(new Event("open-analyzer"));
    closeAdContext(); // Automatically close modal so calculator is immediately visible
  };

  const handleShareLink = () => {
    triggerHaptic("success");
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyDiscord = () => {
    if (!activeAd.profiles?.discord_id) return;
    triggerHaptic("light");
    navigator.clipboard.writeText(activeAd.profiles.discord_id);
    setCopiedDiscord(true);
    setTimeout(() => setCopiedDiscord(false), 2000);
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

    try {
      await navigator.clipboard.writeText(messageStr);
      safeOpenExternal(
        `https://discord.com/users/${activeAd.profiles.discord_id}`
      );
    } catch (err) {
      console.error("Clipboard failed", err);
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
        className={`flex flex-col ${
          depth > 0 ? "ml-4 sm:ml-6 mt-3 pl-3 border-l border-border" : "mt-4"
        }`}
      >
        <div className="flex items-start gap-3 group">
          <img
            src={comment.profiles.avatar_url || "/units/firezio.webp"}
            className="w-8 h-8 rounded-full bg-muted object-cover shrink-0 cursor-pointer hover:opacity-80 transition-opacity mt-0.5 border border-border"
            alt=""
            onClick={(e) => {
              triggerHaptic("light");
              const rect = e.currentTarget.getBoundingClientRect();
              openPopout(comment.user_id, rect.left, rect.bottom);
            }}
          />

          <div className="flex flex-col flex-1 min-w-0 bg-muted hover:bg-muted/80 p-3 rounded-[6px] border border-border transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="text-[13px] font-bold text-foreground truncate cursor-pointer hover:underline"
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

            <p className="text-[13px] text-foreground leading-relaxed break-all whitespace-pre-wrap font-medium">
              {comment.content}
            </p>

            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-card rounded-[4px] border border-border px-1.5 py-0.5">
                  <button
                    onClick={() => {
                      if (profile) {
                        triggerHaptic("light");
                        voteComment(comment.id, profile.id, 1);
                      }
                    }}
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
                    className={`text-[11px] font-bold font-mono ${
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
                    onClick={() => {
                      if (profile) {
                        triggerHaptic("light");
                        voteComment(comment.id, profile.id, -1);
                      }
                    }}
                    className={`focus-visible:outline-none transition-colors hover:text-destructive cursor-pointer ${
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
                  onClick={() => {
                    triggerHaptic("light");
                    setRepTo({
                      id: comment.id,
                      username: comment.profiles.username,
                    });
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer"
                >
                  <Reply className="w-3 h-3 text-primary" /> Reply
                </button>
              </div>

              <div className="flex items-center gap-3">
                {replies.length > 0 && (
                  <button
                    onClick={() => toggleCollapse(comment.id)}
                    className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer"
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
                    onClick={() => {
                      triggerHaptic("medium");
                      deleteComment(comment.id);
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

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/80 animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          triggerHaptic("light");
          closeAdContext();
        }
      }}
    >
      {/* Container offset on desktop so Sidebar and Calculator remain visible/accessible */}
      <div className="bg-card w-full h-[90dvh] md:h-[82vh] md:max-w-4xl md:ml-[240px] md:mr-[420px] md:rounded-[6px] shadow-2xl border-0 md:border border-border flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-popover border-b border-border shrink-0 z-20">
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
              onClick={handleShareLink}
              className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-[4px] text-[12px] font-bold text-foreground flex items-center gap-1.5 transition-colors focus-visible:outline-none cursor-pointer"
              aria-label="Share listing"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-[#23a559]" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic("light");
                closeAdContext();
              }}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-none cursor-pointer p-1.5 hover:bg-card rounded-[4px] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex md:hidden bg-popover border-b border-border p-1 shrink-0">
          <button
            onClick={() => {
              triggerHaptic("light");
              setMobileTab("listing");
            }}
            className={`flex-1 py-2 text-[12px] font-bold uppercase tracking-wider rounded-[4px] transition-colors ${
              mobileTab === "listing"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Listing
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              setMobileTab("comments");
            }}
            className={`flex-1 py-2 text-[12px] font-bold uppercase tracking-wider rounded-[4px] transition-colors flex items-center justify-center gap-1.5 ${
              mobileTab === "comments"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Discussion{" "}
            <span className="bg-muted px-1.5 rounded text-[10px] font-mono">
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
            <div className="p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-5">
              <div className="flex items-center justify-between bg-muted p-3.5 rounded-[6px] border border-border shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={activeAd.profiles?.avatar_url || "/units/firezio.webp"}
                    className="w-11 h-11 rounded-full bg-background object-cover cursor-pointer hover:opacity-80 transition-opacity shrink-0 border border-border"
                    alt=""
                    onClick={(e) => {
                      triggerHaptic("light");
                      const rect = e.currentTarget.getBoundingClientRect();
                      openPopout(activeAd.user_id, rect.left, rect.bottom);
                    }}
                  />
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
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {activeAd.profiles?.discord_id
                        ? `@${activeAd.profiles.discord_id}`
                        : "Verified User"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCopyDiscord}
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
                <blockquote className="border-l-2 border-primary pl-4 py-2 italic text-[14px] text-foreground/90 bg-muted rounded-r-[6px] border border-border shadow-inner">
                  "{activeAd.note}"
                </blockquote>
              )}

              <div className="flex flex-col gap-4 bg-muted rounded-[6px] p-4 border border-border shadow-inner">
                {isInventory ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[12px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                      <span>Showcase Assets</span>
                      <span className="font-mono text-foreground font-black">
                        Value: {totalGiveVal.toLocaleString()}
                      </span>
                    </div>
                    <div
                      className="grid gap-2 pt-2"
                      style={{
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(56px, 1fr))",
                      }}
                    >
                      {activeAd.give_items.map((item, i) => (
                        <ItemTile key={i} item={item} ALL_UNITS={ALL_UNITS} />
                      ))}
                    </div>
                  </div>
                ) : isTakingOffers ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[12px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                        <span>Offering</span>
                        <span className="font-mono font-black text-foreground">
                          {totalGiveVal.toLocaleString()}
                        </span>
                      </div>
                      <div
                        className="grid gap-2 pt-2"
                        style={{
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(56px, 1fr))",
                        }}
                      >
                        {activeAd.give_items.map((item, i) => (
                          <ItemTile key={i} item={item} ALL_UNITS={ALL_UNITS} />
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
                        <span className="font-mono font-black text-foreground">
                          {totalGiveVal.toLocaleString()}
                        </span>
                      </div>
                      <div
                        className="grid gap-2 pt-1"
                        style={{
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(56px, 1fr))",
                        }}
                      >
                        {activeAd.give_items.map((item, i) => (
                          <ItemTile key={i} item={item} ALL_UNITS={ALL_UNITS} />
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-center text-muted-foreground bg-card py-1 rounded-[4px] border border-border">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[12px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                        <span>Requesting</span>
                        <span className="font-mono font-black text-foreground">
                          {totalGetVal > 0
                            ? totalGetVal.toLocaleString()
                            : "Negotiable"}
                        </span>
                      </div>
                      <div
                        className="grid gap-2 pt-1"
                        style={{
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(56px, 1fr))",
                        }}
                      >
                        {activeAd.get_items.map((item, i) => (
                          <ItemTile key={i} item={item} ALL_UNITS={ALL_UNITS} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!isTakingOffers && !isInventory && totalGetVal > 0 && (
                  <div className="mt-2 pt-3 border-t border-border flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
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
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1">
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
                    <div className="flex items-center justify-between text-[11px] font-mono">
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
                onClick={handleLoadIntoCalculator}
                className="w-full sm:flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-black uppercase tracking-wider rounded-[4px] transition-colors shadow-sm focus-visible:outline-none cursor-pointer flex items-center justify-center gap-2 border border-primary"
              >
                <Calculator className="w-4 h-4" /> Load into Calculator
              </button>

              <button
                onClick={handleContact}
                className="w-full sm:w-auto px-4 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-bold rounded-[4px] transition-colors shadow-sm focus-visible:outline-none cursor-pointer flex items-center justify-center gap-2"
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
                <span className="bg-muted text-foreground text-[11px] px-2 py-0.5 rounded-[4px] font-mono border border-border">
                  {comments.length}
                </span>
              </h2>

              <div className="flex items-center gap-1.5 bg-card rounded-[4px] border border-border px-2.5 py-1">
                <button
                  onClick={() => {
                    if (profile) {
                      triggerHaptic("light");
                      voteAd(activeAd.id, profile.id, 1);
                    }
                  }}
                  className={`focus-visible:outline-none transition-colors hover:text-[#23a559] cursor-pointer ${
                    adVotes.userVote === 1
                      ? "text-[#23a559]"
                      : "text-muted-foreground"
                  }`}
                  aria-label="Upvote listing"
                >
                  <ArrowBigUp
                    className={`w-4 h-4 ${
                      adVotes.userVote === 1 ? "fill-current" : ""
                    }`}
                  />
                </button>
                <span
                  className={`text-[12px] font-bold font-mono min-w-[20px] text-center ${
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
                  onClick={() => {
                    if (profile) {
                      triggerHaptic("light");
                      voteAd(activeAd.id, profile.id, -1);
                    }
                  }}
                  className={`focus-visible:outline-none transition-colors hover:text-rose-400 cursor-pointer ${
                    adVotes.userVote === -1
                      ? "text-rose-400"
                      : "text-muted-foreground"
                  }`}
                  aria-label="Downvote listing"
                >
                  <ArrowBigDown
                    className={`w-4 h-4 ${
                      adVotes.userVote === -1 ? "fill-current" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 flex flex-col pb-8">
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <Clock className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-[12px] font-bold uppercase tracking-widest">
                    Loading discussion...
                  </span>
                </div>
              ) : rootComments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 py-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
                  <span className="text-[16px] font-black text-foreground">
                    Start the conversation
                  </span>
                  <span className="text-[13px] text-muted-foreground mt-1 max-w-xs">
                    Be the first to share your thoughts or make an offer on this
                    listing.
                  </span>
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
                  onSubmit={handlePost}
                  className="relative flex items-end gap-2"
                >
                  <div className="flex items-center gap-2 mb-1 shrink-0">
                    <img
                      src={profile.avatar_url || "/units/firezio.webp"}
                      className="w-8 h-8 rounded-full bg-card object-cover border border-border"
                      alt=""
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
                        repTo ? `Write a reply...` : `Type a message...`
                      }
                      maxLength={500}
                      rows={1}
                      disabled={isActionPending}
                      className="w-full bg-input text-foreground text-[14px] px-3.5 py-2.5 rounded-[4px] outline-none border border-border focus:border-foreground transition-colors font-medium placeholder:text-muted-foreground resize-none max-h-[120px] custom-scrollbar shadow-inner"
                    />
                    <div className="absolute right-2 bottom-2.5 text-[10px] font-mono text-muted-foreground pointer-events-none">
                      {newComment.length}/500
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!newComment.trim() || isActionPending}
                    className="h-10 px-4 flex items-center justify-center rounded-[4px] bg-primary hover:bg-primary/85 text-primary-foreground disabled:opacity-45 transition-colors focus-visible:outline-none cursor-pointer shrink-0 border border-primary"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="w-full bg-card text-muted-foreground text-[13px] font-bold text-center py-3 rounded-[4px] border border-border">
                  You must be logged in to participate in the discussion.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
