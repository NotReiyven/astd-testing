import { useState, useEffect, useMemo, useRef, memo } from "react";
import { Search, Plus, Trash2, Check, Send, Clock, ArrowBigUp, ArrowBigDown, Shield } from "lucide-react";
import { GiMegaphone, GiHourglass, GiLockedFortress, GiAbacus, GiChest, GiChatBubble } from "react-icons/gi";
import { supabase } from "../../lib/supabase";
import { useTradingAdsStore, TradingAd } from "../../store/useTradingAdsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useUnits } from "../../context/UnitContext";
import { useHistoryModalStore } from "../../store/useHistoryModalStore";
import { TradeCard, MasterUnit } from "../../types";
import { getProxyImage, getUnitAssetUrl, handleImageError } from "../../data";
import { getAvatarStyle, getInitials } from "./TradeAnalyzer/summaryUtils";
import { triggerHaptic, copyTextWithFallback } from "../../data/helpers";
import { CustomDropdown } from "./MainCanvas/CustomDropdown";
import { useAdInteractionStore } from "../../store/useAdInteractionStore";
import { useNotificationStore } from "../../store/useNotificationStore";
import { safeOpenExternal } from "../../store/useExternalLinkStore";
import { ResponsiveToolbar } from "./shared/ResponsiveToolbar";
import { useToastStore } from "../../store/useToastStore";
import { useShowDelay } from "../../hooks/useShowDelay";
import { EmptyState } from "./ui/EmptyState";
import { AsyncButton } from "./ui/AsyncButton";
import { STATUS_COLORS, useEffectiveStatus } from "../../hooks/usePresence";
import { UserAvatar } from "./shared/UserAvatar";
import { DiscordRolePill } from "./shared/DiscordRolePill";
import { useAdCooldown } from "../../hooks/useAdCooldown";

const SORT_OPTIONS = {
  newest: "Recently Posted",
  oldest: "Oldest First",
  "value-desc": "Highest Value",
  "value-asc": "Lowest Value",
};

const TYPE_FILTER_LABELS: Record<string, string> = {
  all: "All",
  standard: "Trades",
  lf_offers: "LF Offers",
  inventory: "Showcases",
  my_ads: "My Ads",
};

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(h > 0 ? `${h}h ${m}m left` : `${m}m left`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className="text-xs font-medium font-mono text-muted-foreground tabular-nums">
      {timeLeft}
    </span>
  );
}

const getUnitConservativeValue = (master: MasterUnit): number => {
  if (
    master.value === "owner" ||
    master.valueDisplay === "Owner's Choice" ||
    master.valueDisplay === "O/C"
  )
    return 0;
  if (typeof master.value === "number" && master.value > 0) return master.value;
  if (typeof master.valueMin === "number" && master.valueMin > 0)
    return master.valueMin;
  return 0;
};

const FixedSlotGrid = ({
  items,
  ALL_UNITS,
  onInspectUnit,
  isOfferTile,
  limit = 8,
  label,
}: {
  items: TradeCard[];
  ALL_UNITS: MasterUnit[];
  onInspectUnit: (id: string) => void;
  isOfferTile?: boolean;
  limit?: number;
  label: string;
}) => {
  const slots = Array.from({ length: limit });
  const displayItems = items.slice(0, limit);
  const extraCount = items.length > limit ? items.length - limit + 1 : 0;

  const slotBase = "w-full aspect-square rounded-[6px] shrink-0";

  const totalVal = items.reduce((acc, i) => {
    const m = ALL_UNITS.find((u) => u.id === i.id);
    const liveVal = m ? getUnitConservativeValue(m) : i.value;
    return acc + liveVal * i.qty;
  }, 0);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-sm font-semibold text-foreground">
          {label}
        </span>
        {totalVal > 0 && !isOfferTile && (
          <span className="text-[12px] font-mono font-bold text-foreground tabular-nums">
            {totalVal.toLocaleString()}
          </span>
        )}
      </div>
      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-4 gap-2 w-full">
        {slots.map((_, i) => {
          if (isOfferTile && i === 0) {
            return (
              <div
                key="offer-tile"
                className={`${slotBase} bg-popover border border-border flex flex-col items-center justify-center gap-1 shadow-inner`}
              >
                <Search className="w-5 h-5 text-muted-foreground opacity-80" />
                <span className="text-xs font-medium text-muted-foreground">
                  Offers
                </span>
              </div>
            );
          }

          if (extraCount > 0 && i === limit - 1) {
            return (
              <div
                key="extra-slot"
                className={`relative ${slotBase} bg-muted border border-border overflow-hidden flex items-center justify-center shadow-sm`}
              >
                <span className="relative z-10 text-[16px] font-black font-mono text-muted-foreground tabular-nums">
                  +{extraCount}
                </span>
              </div>
            );
          }

          if (i < displayItems.length) {
            const item = displayItems[i];
            const master = ALL_UNITS.find((u) => u.id === item.id);
            const proxyUrl = master
              ? getProxyImage(item.id, master.imageUrl)
              : null;
            return (
              <div
                key={`item-${i}`}
                onClick={() => {
                  triggerHaptic("light");
                  onInspectUnit(item.id);
                }}
                className={`relative ${slotBase} bg-muted border border-border hover:border-primary cursor-pointer transition-colors overflow-hidden flex items-center justify-center group active:scale-95`}
                title={`${item.qty > 1 ? `${item.qty}x ` : ""}${item.name}`}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white z-0"
                  style={getAvatarStyle(item.name)}
                >
                  {getInitials(item.name)}
                </div>
                {proxyUrl && (
                  <img
                    src={proxyUrl}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover z-10 transition-transform duration-300 group-hover:scale-110"
                    style={{ objectPosition: "center 15%" }}
                    onError={(e) => handleImageError(e, item.id)}
                  />
                )}

                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 p-1.5 z-30 pointer-events-none flex flex-col justify-end">
                  <span className="block text-[9px] font-bold text-white leading-tight truncate drop-shadow-md">
                    {item.name}
                  </span>
                </div>

                {item.qty > 1 && (
                  <div className="absolute top-1 right-1 bg-background/90 text-foreground text-[10px] font-black px-1.5 py-0.5 rounded-[4px] z-30 border border-border shadow-sm leading-none tabular-nums">
                    x{item.qty}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={`empty-${i}`}
              className={`${slotBase} bg-muted/30 border border-dashed border-border/80 flex items-center justify-center`}
            >
              <Plus
                className="w-5 h-5 text-muted-foreground/50"
                strokeWidth={2}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const VanguardAdCard = memo(
  ({
    ad,
    currentUserId,
    currentUserRole,
    onRequestDelete,
    ALL_UNITS,
    onInspectUnit,
    onSendToCalculator,
  }: {
    ad: TradingAd;
    currentUserId?: string;
    currentUserRole?: string;
    onRequestDelete: (ad: TradingAd) => void;
    ALL_UNITS: MasterUnit[];
    onInspectUnit: (unitId: string) => void;
    onSendToCalculator: (give: TradeCard[], get: TradeCard[]) => void;
  }) => {
    const [isContacting, setIsContacting] = useState(false);
    const [votes, setVotes] = useState({ up: 0, down: 0, userVote: 0 });
    const isVotingRef = useRef(false);
    const [isNewAd, setIsNewAd] = useState(
      () => Date.now() - new Date(ad.created_at).getTime() < 5000
    );

    const isOwner = currentUserId === ad.user_id;
    const canModerate =
      currentUserRole === "master" ||
      currentUserRole === "admin" ||
      currentUserRole === "mod";
    const canDelete = isOwner || canModerate;
    const isTakingOffers =
      ad.ad_type === "lf_offers" ||
      (ad.ad_type === "standard" && ad.get_items.length === 0);
    const isInventory = ad.ad_type === "inventory";

    const setViewingUser = useInventoryStore((s) => s.setViewingUser);
    const openAdContext = useAdInteractionStore((s) => s.openAdContext);
    const openPopout = useProfileStore((s) => s.openPopout);
    const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);
    const addToast = useToastStore((s) => s.addToast);
    const effectiveStatus = useEffectiveStatus(ad.user_id, ad.profiles?.status);

    useEffect(() => {
      if (isNewAd) {
        const timer = setTimeout(() => setIsNewAd(false), 4500);
        return () => clearTimeout(timer);
      }
    }, [isNewAd]);

    useEffect(() => {
      const fetchVotes = async () => {
        const { data } = await supabase
          .from("ad_votes")
          .select("user_id, vote_value")
          .eq("ad_id", ad.id);
        if (data) {
          let up = 0,
            down = 0,
            userVote = 0;
          data.forEach((v) => {
            if (v.vote_value === 1) up++;
            if (v.vote_value === -1) down++;
            if (currentUserId && v.user_id === currentUserId)
              userVote = v.vote_value;
          });
          setVotes({ up, down, userVote });
        }
      };
      fetchVotes();
    }, [ad.id, currentUserId]);

    const handleVote = async (val: number) => {
      if (!currentUserId) {
        addToast("Sign in with Discord to vote on listings", "warning", {
          action: {
            label: "Login",
            onClick: loginWithDiscord,
          },
        });
        return;
      }

      if (isVotingRef.current) return;
      isVotingRef.current = true;
      triggerHaptic("light");

      const prevVotes = { ...votes };
      const isRemoving = prevVotes.userVote === val;
      const newVal = isRemoving ? 0 : val;

      setVotes((prev) => {
        let up = prev.up,
          down = prev.down;
        if (prev.userVote === 1) up--;
        if (prev.userVote === -1) down--;
        if (newVal === 1) up++;
        if (newVal === -1) down++;
        return { up, down, userVote: newVal };
      });

      try {
        if (isRemoving) {
          const { error } = await supabase
            .from("ad_votes")
            .delete()
            .match({ ad_id: ad.id, user_id: currentUserId });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("ad_votes")
            .upsert({
              ad_id: ad.id,
              user_id: currentUserId,
              vote_value: newVal,
            });
          if (error) throw error;

          if (newVal === 1 && ad.user_id !== currentUserId) {
            void useNotificationStore.getState().createNotification({
              user_id: ad.user_id,
              actor_id: currentUserId,
              ad_id: ad.id,
              type: "upvote",
            });
          }
        }
      } catch {
        setVotes(prevVotes);
        addToast("Could not record your vote—try again.", "error", {
          action: {
            label: "Retry",
            onClick: () => {
              void handleVote(val);
            },
          },
        });
      } finally {
        isVotingRef.current = false;
      }
    };

    const handleInspectVault = () => {
      triggerHaptic("medium");
      setViewingUser(
        ad.user_id,
        ad.profiles?.username || "Trader",
        "trading-ads"
      );
      useProfileStore.getState().setViewingProfile(ad.user_id, "trading-ads");
      window.document.dispatchEvent(
        new CustomEvent("navigate", { detail: "inventory" })
      );
    };

    const handleDiscordContact = async () => {
      if (!ad.profiles?.discord_id) return;
      triggerHaptic("medium");
      setIsContacting(true);

      const giveNames = ad.give_items
        .map((i) => `${i.qty > 1 ? `${i.qty}x ` : ""}${i.name}`)
        .join(", ");
      const getNames =
        ad.get_items.length > 0
          ? ad.get_items
              .map((i) => `${i.qty > 1 ? `${i.qty}x ` : ""}${i.name}`)
              .join(", ")
          : "Offers";

      let messageStr = "";
      if (isInventory) {
        messageStr = `Hey! Saw your inventory showcase on ASTD Value List:\n• Showcase: ${giveNames}\nI'm interested in discussing an offer. Are you open to trade?`;
      } else {
        messageStr = `Hey! Saw your listing on ASTD Value List:\n• Your Offer: ${giveNames}\n• You Want: ${getNames}\nI'm interested in this trade. Is it still available?`;
      }

      const copied = await copyTextWithFallback(messageStr);
      const recipientName = ad.profiles?.username ? `@${ad.profiles.username}` : "Trader";
      if (copied) {
        addToast(`Copied trade offer for ${recipientName} & opening Discord…`, "success");
        safeOpenExternal(`https://discord.com/users/${ad.profiles.discord_id}`);
      } else {
        addToast(
          `Opening Discord profile for ${recipientName} (ID: ${ad.profiles.discord_id})`,
          "info"
        );
        safeOpenExternal(`https://discord.com/users/${ad.profiles.discord_id}`);
      }

      setTimeout(() => setIsContacting(false), 2500);
    };

    const score = votes.up - votes.down;

    let badgeTitle = "Trade";
    let badgeClasses = "bg-primary text-primary-foreground border-primary";

    if (isTakingOffers) {
      badgeTitle = "LF Offers";
      badgeClasses = "bg-foreground text-background border-foreground";
    } else if (isInventory) {
      badgeTitle = "Showcase";
      badgeClasses = "bg-muted text-foreground border-border";
    }

    return (
      <div
        className={`relative rounded-[8px] flex flex-col h-full bg-card border border-border transition-colors duration-200 will-change-transform specular-card p-4 ${
          isNewAd
            ? "border-primary ring-1 ring-primary"
            : "hover:border-muted-foreground shadow-sm"
        }`}
      >
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="relative shrink-0 cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
              onClick={(e) => {
                triggerHaptic("light");
                const rect = e.currentTarget.getBoundingClientRect();
                openPopout(ad.user_id, rect.left, rect.bottom);
              }}
              title="View Profile"
            >
              <UserAvatar
                avatarUrl={ad.profiles?.avatar_url}
                username={ad.profiles?.username}
                discordId={ad.profiles?.discord_id}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-muted border border-border"
              />
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-card z-10"
                style={{
                  backgroundColor: STATUS_COLORS[effectiveStatus],
                }}
                title={`Status: ${effectiveStatus.toUpperCase()}`}
              />
            </div>
            <div className="flex flex-col min-w-0 pt-0.5">
              <div className="flex items-center gap-2 mb-1 min-w-0">
                <span
                  className="text-[var(--ui-text-base)] font-bold text-foreground tracking-tight leading-none truncate cursor-pointer hover:underline"
                  onClick={(e) => {
                    triggerHaptic("light");
                    const rect = e.currentTarget.getBoundingClientRect();
                    openPopout(ad.user_id, rect.left, rect.bottom);
                  }}
                >
                  {ad.profiles?.username || "Unknown"}
                </span>
                {ad.profiles?.role && ad.profiles.role !== "user" && (
                  <DiscordRolePill
                    name={ad.profiles.role}
                    size="sm"
                    className="shrink-0"
                  />
                )}
              </div>
              <span className="text-[var(--ui-text-xs)] text-muted-foreground font-medium leading-none flex items-center gap-1.5">
                {getTimeAgo(ad.created_at)}
              </span>
            </div>
          </div>
          <span
            className={`px-2 py-1 rounded-[4px] text-xs font-semibold shrink-0 ml-2 border ${badgeClasses}`}
          >
            {badgeTitle}
          </span>
        </div>

        {ad.note && (
          <div className="mb-4 bg-muted/30 border border-border border-l-2 border-l-primary rounded-[4px] p-3 shadow-inner">
            <div
              className="text-[var(--ui-text-sm)] text-foreground font-medium leading-relaxed break-words overflow-hidden"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {ad.note}
            </div>
          </div>
        )}

        <div className="flex flex-col w-full flex-1 relative z-10 gap-4">
          {isInventory ? (
            <FixedSlotGrid
              items={ad.give_items}
              ALL_UNITS={ALL_UNITS}
              onInspectUnit={onInspectUnit}
              limit={20}
              label="Showcase Assets"
            />
          ) : (
            <>
              <FixedSlotGrid
                items={ad.give_items}
                ALL_UNITS={ALL_UNITS}
                onInspectUnit={onInspectUnit}
                limit={8}
                label="Offering"
              />
              <FixedSlotGrid
                items={ad.get_items}
                ALL_UNITS={ALL_UNITS}
                onInspectUnit={onInspectUnit}
                isOfferTile={isTakingOffers}
                limit={8}
                label="Requesting"
              />
            </>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-border flex flex-col gap-3 relative z-10">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-0.5 bg-muted rounded-[4px] border border-border p-0.5">
              <button
                type="button"
                onClick={() => void handleVote(1)}
                aria-label="Upvote listing"
                aria-pressed={votes.userVote === 1}
                className={`p-1.5 rounded-[3px] hover:bg-card transition-colors focus-visible:outline-none cursor-pointer active:scale-90 flex items-center justify-center ${
                  votes.userVote === 1
                    ? "text-[#23a559]"
                    : "text-muted-foreground hover:text-[#23a559]"
                }`}
              >
                <ArrowBigUp
                  className={`w-4 h-4 ${
                    votes.userVote === 1 ? "fill-current" : ""
                  }`}
                />
              </button>
              <span
                className={`text-[var(--ui-text-sm)] font-bold min-w-[20px] text-center font-mono tabular-nums ${
                  score > 0
                    ? "text-[#23a559]"
                    : score < 0
                    ? "text-destructive"
                    : "text-foreground"
                }`}
              >
                {score}
              </span>
              <button
                type="button"
                onClick={() => void handleVote(-1)}
                aria-label="Downvote listing"
                aria-pressed={votes.userVote === -1}
                className={`p-1.5 rounded-[3px] hover:bg-card transition-colors focus-visible:outline-none cursor-pointer active:scale-90 flex items-center justify-center ${
                  votes.userVote === -1
                    ? "text-destructive"
                    : "text-muted-foreground hover:text-destructive"
                }`}
              >
                <ArrowBigDown
                  className={`w-4 h-4 ${
                    votes.userVote === -1 ? "fill-current" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted px-2 py-1 rounded-[4px] border border-border">
              <GiHourglass className="w-3.5 h-3.5" />
              <CountdownTimer expiresAt={ad.expires_at} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleDiscordContact()}
            className={`w-full h-[var(--ui-height-btn)] flex items-center justify-center gap-2 text-[var(--ui-text-sm)] font-bold rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer border ${
              isContacting
                ? "bg-[#23a559] text-white border-[#23a559]"
                : "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
            }`}
          >
            {isContacting ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isContacting ? "Copied! Paste in Discord" : "Contact on Discord"}
          </button>

          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                if (isInventory) {
                  handleInspectVault();
                } else {
                  onSendToCalculator(ad.give_items, ad.get_items);
                }
              }}
              className="flex-1 h-[var(--ui-height-btn)] flex items-center justify-center gap-1.5 text-[var(--ui-text-sm)] font-bold rounded-[4px] border border-border bg-muted hover:bg-card text-foreground transition-colors active:scale-95 focus-visible:outline-none cursor-pointer"
            >
              {isInventory ? (
                <GiChest className="w-3.5 h-3.5" />
              ) : (
                <GiAbacus className="w-3.5 h-3.5" />
              )}
              <span className="truncate">
                {isInventory ? "Inspect Vault" : "Analyze Trade"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                openAdContext(ad.id, currentUserId);
              }}
              className="flex-1 h-[var(--ui-height-btn)] flex items-center justify-center gap-1.5 text-[var(--ui-text-sm)] font-bold rounded-[4px] border border-border bg-muted hover:bg-card text-foreground transition-colors active:scale-95 focus-visible:outline-none cursor-pointer"
            >
              <GiChatBubble className="w-3.5 h-3.5" />
              <span className="truncate">Thread</span>
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onRequestDelete(ad);
                }}
                aria-label="Delete listing"
                title="Delete listing"
                className="w-[var(--ui-height-btn)] h-[var(--ui-height-btn)] border border-border text-muted-foreground hover:text-destructive-foreground hover:border-destructive bg-muted hover:bg-destructive rounded-[4px] transition-colors focus-visible:outline-none flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

const VanguardAdCardSkeleton = () => (
  <div className="relative rounded-[8px] flex flex-col h-full bg-card border border-border p-4 animate-pulse">
    {/* Header: Avatar + Username + Timestamp + Badge */}
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-muted border border-border shrink-0" />
        <div className="flex flex-col gap-2 pt-0.5">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted/70" />
        </div>
      </div>
      <div className="h-6 w-16 rounded-[4px] bg-muted shrink-0" />
    </div>

    {/* Note Callout Skeleton */}
    <div className="mb-4 bg-muted/30 border border-border border-l-2 border-l-primary/40 rounded-[4px] p-3">
      <div className="h-3.5 w-3/4 rounded bg-muted/80" />
    </div>

    {/* Offering & Requesting 8-Slot Grids */}
    <div className="flex flex-col w-full flex-1 gap-4">
      {["Offering", "Requesting"].map((section) => (
        <div key={section} className="flex flex-col gap-3 w-full">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-3.5 w-16 rounded bg-muted/70" />
          </div>
          <div className="grid grid-cols-4 gap-2 w-full">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`w-full aspect-square rounded-[6px] ${
                  i < 3
                    ? "bg-muted border border-border"
                    : "bg-muted/25 border border-dashed border-border/60"
                }`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* Footer: Votes + Timer + Discord Button + Action Row */}
    <div className="mt-auto pt-4 border-t border-border flex flex-col gap-3">
      <div className="flex items-center justify-between w-full">
        <div className="h-7 w-20 rounded-[4px] bg-muted border border-border" />
        <div className="h-7 w-24 rounded-[4px] bg-muted border border-border" />
      </div>
      <div className="w-full h-[var(--ui-height-btn)] rounded-[4px] bg-primary/20 border border-primary/30" />
      <div className="flex gap-2 w-full">
        <div className="flex-1 h-[var(--ui-height-btn)] rounded-[4px] bg-muted border border-border" />
        <div className="flex-1 h-[var(--ui-height-btn)] rounded-[4px] bg-muted border border-border" />
      </div>
    </div>
  </div>
);

function TradingAdsBoardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid w-full gap-6"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}
      role="status"
      aria-label="Loading live trading board"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <VanguardAdCardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function TradingAdsChannel() {
  const ads = useTradingAdsStore((s) => s.ads);
  const isLoading = useTradingAdsStore((s) => s.isLoading);
  const fetchAds = useTradingAdsStore((s) => s.fetchAds);
  const subscribeToAds = useTradingAdsStore((s) => s.subscribeToAds);
  const deleteAd = useTradingAdsStore((s) => s.deleteAd);
  const profile = useAuthStore((s) => s.profile);
  const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);
  const overwrite = useTradeStore((s) => s.overwrite);
  const setComposerOpen = useTradeStore((s) => s.setComposerOpen);
  const addToast = useToastStore((s) => s.addToast);
  const { units: ALL_UNITS } = useUnits();
  const openHistoryModal = useHistoryModalStore((state) => state.openModal);
  const {
    isStaff,
    activeAdsCount,
    isAtMaxActiveAds,
    isOnCooldown,
    formattedCooldown,
  } = useAdCooldown();

  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState("newest");

  const [adPendingDelete, setAdPendingDelete] = useState<TradingAd | null>(null);
  const [isDeletingAd, setIsDeletingAd] = useState(false);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const deleteCancelBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const showAdsSkeleton = useShowDelay(isLoading);

  useEffect(() => {
    fetchAds();
    const unsubscribe = subscribeToAds();
    return () => unsubscribe();
  }, [fetchAds, subscribeToAds]);

  useEffect(() => {
    if (!adPendingDelete) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = setTimeout(() => {
      deleteCancelBtnRef.current?.focus();
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeletingAd) {
        e.preventDefault();
        setAdPendingDelete(null);
        return;
      }
      if (e.key === "Tab" && deleteDialogRef.current) {
        const focusables =
          deleteDialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
  }, [adPendingDelete, isDeletingAd]);

  const filteredAndSortedAds = useMemo(() => {
    const list = ads.filter((ad) => {
      const q = searchFilter.toLowerCase().trim();
      const matchSearch =
        q === "" ||
        ad.profiles?.username?.toLowerCase().includes(q) ||
        ad.give_items.some((i) => i.name.toLowerCase().includes(q)) ||
        ad.get_items.some((i) => i.name.toLowerCase().includes(q));

      const isTakingOffers =
        ad.ad_type === "lf_offers" ||
        (ad.ad_type === "standard" && ad.get_items.length === 0);
      let matchesType = true;
      if (typeFilter === "standard")
        matchesType = ad.ad_type === "standard" && !isTakingOffers;
      if (typeFilter === "lf_offers") matchesType = isTakingOffers;
      if (typeFilter === "inventory") matchesType = ad.ad_type === "inventory";
      if (typeFilter === "my_ads")
        matchesType = Boolean(profile?.id && ad.user_id === profile.id);

      return matchSearch && matchesType;
    });

    return list.sort((a, b) => {
      if (sortMode === "newest") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (sortMode === "oldest") {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      const valA = a.give_items.reduce((s, i) => s + i.value * i.qty, 0);
      const valB = b.give_items.reduce((s, i) => s + i.value * i.qty, 0);
      return sortMode === "value-desc" ? valB - valA : valA - valB;
    });
  }, [ads, searchFilter, typeFilter, sortMode]);

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (searchFilter.trim()) {
      parts.push(`search “${searchFilter.trim()}”`);
    }
    if (typeFilter !== "all") {
      parts.push(`type “${TYPE_FILTER_LABELS[typeFilter] || typeFilter}”`);
    }
    return parts.join(" & ");
  }, [searchFilter, typeFilter]);

  const handleSendToCalculator = (give: TradeCard[], get: TradeCard[]) => {
    triggerHaptic("medium");
    const storeBefore = useTradeStore.getState();
    const prevGiveMap = new Map(storeBefore.giveItems.map((c) => [c.id, c]));
    const prevGetMap = new Map(storeBefore.getItems.map((c) => [c.id, c]));

    // Note: an ad's `get_items` become what `You Give`, and `give_items` become what `You Get`
    const nextGiveMap = new Map(get.map((c) => [c.id, c]));
    const nextGetMap = new Map(give.map((c) => [c.id, c]));

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

    overwrite(get, give);
    window.dispatchEvent(new Event("open-analyzer"));

    const giveSideCount = get.length;
    const getSideCount = give.length;

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

  const handleConfirmDeleteAd = async () => {
    if (!adPendingDelete || isDeletingAd) return;
    setIsDeletingAd(true);
    triggerHaptic("heavy");
    const targetAd = adPendingDelete;
    try {
      const ok = await deleteAd(targetAd.id);
      if (ok) {
        addToast("Deleted trade listing from the Live Trading Board.", "info");
        setAdPendingDelete(null);
      }
    } finally {
      setIsDeletingAd(false);
    }
  };

  const handleCreateAdClick = () => {
    triggerHaptic("medium");
    setComposerOpen(true, "standard");
    window.dispatchEvent(new Event("open-analyzer"));
  };

  const SearchNode = (
    <div className="relative w-full">
      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={searchFilter}
        onChange={(e) => setSearchFilter(e.target.value)}
        placeholder="Search board by unit or trader…"
        aria-label="Search trading board"
        className="w-full bg-input text-foreground text-[var(--ui-text-sm)] pl-9 pr-4 h-[var(--ui-height-input)] rounded-[4px] outline-none border border-border focus:border-primary transition-colors shadow-inner"
      />
    </div>
  );

  const FilterNodes = (
    <>
      <div className="flex bg-input rounded-[4px] p-1 border border-border w-full sm:w-auto overflow-x-auto hide-scrollbar shrink-0 shadow-inner h-[var(--ui-height-input)]">
        {[
          { id: "all", label: "All" },
          { id: "standard", label: "Trades" },
          { id: "lf_offers", label: "LF Offers" },
          { id: "inventory", label: "Showcases" },
          ...(profile ? [{ id: "my_ads", label: "My Ads" }] : []),
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setTypeFilter(t.id);
            }}
            className={`flex-1 sm:flex-none px-4 rounded-[4px] text-sm font-medium transition-all focus-visible:outline-none cursor-pointer whitespace-nowrap active:scale-95 flex items-center justify-center ${
              typeFilter === t.id
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="w-full sm:w-[190px] shrink-0">
        <CustomDropdown
          icon={Clock}
          value={sortMode}
          options={SORT_OPTIONS}
          onChange={(val: string) => {
            triggerHaptic("light");
            setSortMode(val);
          }}
          defaultLabel="Sort By"
        />
      </div>
    </>
  );

  const ActionNodes = (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      {profile ? (
        <>
          {/* Active ads counter badge */}
          {isStaff ? (
            <div
              title="Staff Role: Bypass active listings limit and post cooldowns"
              className="hidden sm:flex items-center gap-1.5 px-2.5 h-[var(--ui-height-btn)] rounded-[4px] bg-primary/10 border border-primary/30 text-primary text-xs font-semibold shrink-0"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Staff Bypass</span>
            </div>
          ) : (
            <div
              title="Your active trade listings (Max 3)"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 h-[var(--ui-height-btn)] rounded-[4px] border text-xs font-semibold shrink-0 ${
                isAtMaxActiveAds
                  ? "bg-[#241215] border-[#ef4444] text-[#f87171]"
                  : "bg-muted border border-border text-muted-foreground"
              }`}
            >
              <span>Ads:</span>
              <strong className="text-foreground font-mono tabular-nums">
                {activeAdsCount}/3
              </strong>
            </div>
          )}

          {/* Cooldown timer pill */}
          {isOnCooldown && (
            <div
              title="Trade listing cooldown remaining"
              className="flex items-center gap-1.5 px-2.5 h-[var(--ui-height-btn)] rounded-[4px] bg-[#281b0a] border border-[#b45309] text-[#fbbf24] text-xs font-mono font-bold shrink-0 tabular-nums shadow-xs"
            >
              <GiHourglass
                className="w-3.5 h-3.5 text-[#fbbf24] animate-spin"
                style={{ animationDuration: "8s" }}
              />
              <span>{formattedCooldown}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleCreateAdClick}
            className={`flex items-center justify-center gap-1.5 px-4 w-full sm:w-auto h-[var(--ui-height-btn)] rounded-[4px] text-sm font-semibold transition-all focus-visible:outline-none shrink-0 shadow-sm cursor-pointer active:scale-95 border ${
              isOnCooldown
                ? "bg-muted text-muted-foreground border-border hover:bg-card hover:text-foreground"
                : "bg-primary hover:bg-primary/90 text-primary-foreground border-primary"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>
              {isOnCooldown ? `Create Ad (${formattedCooldown})` : "Create Ad"}
            </span>
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            loginWithDiscord();
          }}
          className="flex items-center justify-center gap-1.5 px-4 w-full sm:w-auto h-[var(--ui-height-btn)] rounded-[4px] bg-muted border border-border text-foreground text-sm font-semibold transition-all hover:bg-card focus-visible:outline-none shrink-0 cursor-pointer active:scale-95"
        >
          <GiLockedFortress className="w-4 h-4 text-primary" />
          <span>Login</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full select-none font-sans relative bg-background">
      <ResponsiveToolbar
        title="Live Trading Board"
        searchNode={SearchNode}
        filterNodes={FilterNodes}
        actionNodes={ActionNodes}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-transparent relative z-10">
        <div className="w-full h-full max-w-[1400px] mx-auto pb-24 p-6">
          {isLoading ? (
            showAdsSkeleton ? (
              <TradingAdsBoardSkeleton count={6} />
            ) : null
          ) : ads.length === 0 ? (
            <div className="py-16 max-w-lg mx-auto">
              <EmptyState
                icon={<GiMegaphone className="w-6 h-6" />}
                title="No Active Listings Yet"
                description="There are currently no active trade ads on the board. Post the first listing to start receiving offers."
                action={
                  profile
                    ? {
                        label: "Create First Ad",
                        onClick: handleCreateAdClick,
                      }
                    : {
                        label: "Sign In to Post an Ad",
                        onClick: loginWithDiscord,
                      }
                }
              />
            </div>
          ) : filteredAndSortedAds.length === 0 ? (
            <div className="py-16 max-w-lg mx-auto">
              <EmptyState
                icon={<Search className="w-5 h-5" />}
                title="No Listings Match Your Filters"
                description={
                  activeFilterSummary
                    ? `No active trade ads match ${activeFilterSummary}.`
                    : "No active trade ads match your current filter selection."
                }
                action={{
                  label: "Clear Filters",
                  onClick: () => {
                    setSearchFilter("");
                    setTypeFilter("all");
                  },
                }}
              />
            </div>
          ) : (
            <div
              className="grid w-full animate-fade-in gap-6"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              }}
            >
              {filteredAndSortedAds.map((ad) => (
                <VanguardAdCard
                  key={ad.id}
                  ad={ad}
                  currentUserId={profile?.id}
                  currentUserRole={profile?.role}
                  onRequestDelete={setAdPendingDelete}
                  ALL_UNITS={ALL_UNITS}
                  onInspectUnit={(unitId) => openHistoryModal(unitId)}
                  onSendToCalculator={handleSendToCalculator}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Ad Confirmation Modal */}
      {adPendingDelete && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => {
              if (!isDeletingAd) setAdPendingDelete(null);
            }}
          />
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm Delete Listing"
            className="relative z-10 w-full max-w-md bg-popover border border-border rounded-[8px] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-5 py-4 border-b border-border bg-card flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-destructive shrink-0" />
              <h3 className="text-[15px] font-bold text-foreground tracking-tight">
                Delete Trade Listing?
              </h3>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                This will permanently remove{" "}
                <strong className="text-foreground">
                  {adPendingDelete.user_id === profile?.id
                    ? "your listing"
                    : `${adPendingDelete.profiles?.username || "this trader"}'s listing`}
                </strong>{" "}
                from the Live Trading Board, including its{" "}
                <strong className="text-foreground tabular-nums">
                  {adPendingDelete.give_items.length} Offering
                </strong>{" "}
                {adPendingDelete.ad_type !== "inventory" && (
                  <>
                    &{" "}
                    <strong className="text-foreground tabular-nums">
                      {adPendingDelete.get_items.length} Requesting
                    </strong>{" "}
                  </>
                )}
                items, votes, and discussion thread. This action cannot be
                undone.
              </p>
            </div>
            <div className="px-5 py-3.5 border-t border-border bg-card flex justify-end gap-2">
              <button
                ref={deleteCancelBtnRef}
                type="button"
                disabled={isDeletingAd}
                onClick={() => setAdPendingDelete(null)}
                className="px-4 py-2 rounded-[4px] text-[12px] font-bold text-foreground hover:bg-muted border border-border focus-visible:outline-none cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <AsyncButton
                type="button"
                variant="destructive"
                size="sm"
                isLoading={isDeletingAd}
                loadingAnnouncement="Deleting…"
                onClick={handleConfirmDeleteAd}
              >
                Delete Listing
              </AsyncButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
