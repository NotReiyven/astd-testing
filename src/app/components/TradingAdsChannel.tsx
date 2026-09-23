// ================================================
// FILE: src/app/components/TradingAdsChannel.tsx
// ================================================

import { useState, useEffect, useMemo, memo } from "react";
import { 
  Megaphone, Search, Plus, Trash2, Clock, 
  Check, Lock, Calculator, Package, 
  Copy, Activity, MessageSquare, ArrowBigUp, ArrowBigDown, Send, ChevronDown, ChevronUp, SlidersHorizontal
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTradingAdsStore, TradingAd } from "../../store/useTradingAdsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useLayoutStore } from "../../store/useLayoutStore";
import { useUnits } from "../../context/UnitContext";
import { useHistoryModalStore } from "../../store/useHistoryModalStore";
import { TradeCard, MasterUnit } from "../../types";
import { getProxyImage, handleImageError } from "../../data";
import { getAvatarStyle, getInitials } from "./TradeAnalyzer/summaryUtils";
import { triggerHaptic } from "../../data/helpers";
import { CustomDropdown } from "./MainCanvas/CustomDropdown";
import { useAdInteractionStore } from "../../store/useAdInteractionStore";
import { AdInteractionModal } from "./AdInteractionModal";
import { HoldToConfirmButton } from "./shared/Formatters";
import { safeOpenExternal } from "../../store/useExternalLinkStore";

const SORT_OPTIONS = {
  "newest": "Recently Posted",
  "oldest": "Oldest First",
  "value-desc": "Highest Value",
  "value-asc": "Lowest Value"
};

const STATUS_COLORS: Record<string, string> = {
  online: "#23a559",
  dnd: "#ef4444",
  invisible: "#888888",
  offline: "#888888"
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

  return <span className="text-[11px] font-bold tracking-wider uppercase font-mono">{timeLeft}</span>;
}

const getUnitConservativeValue = (master: MasterUnit): number => {
  if (master.value === "owner" || master.valueDisplay === "Owner's Choice" || master.valueDisplay === "O/C") return 0;
  if (typeof master.value === "number" && master.value > 0) return master.value;
  if (typeof master.valueMin === "number" && master.valueMin > 0) return master.valueMin;
  return 0; 
};

const FixedSlotGrid = ({ items, ALL_UNITS, onInspectUnit, isOfferTile, limit = 8, label }: { items: TradeCard[]; ALL_UNITS: MasterUnit[]; onInspectUnit: (id: string) => void; isOfferTile?: boolean; limit?: number; label: string; }) => {
  const slots = Array.from({ length: limit });
  const displayItems = items.slice(0, limit);
  const extraCount = items.length > limit ? items.length - limit + 1 : 0; 

  const slotBase = "w-full aspect-square rounded-[6px] shrink-0";

  const totalVal = items.reduce((acc, i) => {
    const m = ALL_UNITS.find(u => u.id === i.id);
    const liveVal = m ? getUnitConservativeValue(m) : i.value;
    return acc + (liveVal * i.qty);
  }, 0);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between border-b border-border pb-2">
         <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
         {totalVal > 0 && !isOfferTile && (
            <span className="text-[12px] font-mono font-bold text-foreground">{totalVal.toLocaleString()}</span>
         )}
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5 w-full">
        {slots.map((_, i) => {
          if (isOfferTile && i === 0) {
            return (
              <div key="offer-tile" className={`${slotBase} bg-popover border border-border flex flex-col items-center justify-center gap-1 shadow-inner`}>
                <Search className="w-5 h-5 text-muted-foreground opacity-80" />
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Offers</span>
              </div>
            );
          }

          if (extraCount > 0 && i === limit - 1) {
            return (
              <div key="extra-slot" className={`relative ${slotBase} bg-muted border border-border overflow-hidden flex items-center justify-center shadow-sm`}>
                 <span className="relative z-10 text-[16px] font-black font-mono text-muted-foreground">+{extraCount}</span>
              </div>
            );
          }

          if (i < displayItems.length) {
            const item = displayItems[i];
            const master = ALL_UNITS.find(u => u.id === item.id);
            const proxyUrl = master ? getProxyImage(item.id, master.imageUrl) : null;
            return (
              <div
                key={`item-${i}`}
                onClick={() => { triggerHaptic('light'); onInspectUnit(item.id); }}
                className={`relative ${slotBase} bg-muted border border-border hover:border-primary cursor-pointer transition-colors overflow-hidden flex items-center justify-center group active:scale-95`}
                title={`${item.qty > 1 ? `${item.qty}x ` : ''}${item.name}`}
              >
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white z-0" style={getAvatarStyle(item.name)}>
                  {getInitials(item.name)}
                </div>
                {proxyUrl && (
                  <img src={proxyUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover z-10 transition-transform duration-300 group-hover:scale-110" style={{ objectPosition: "center 15%" }} onError={(e) => handleImageError(e, item.id)} />
                )}

                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 p-1.5 z-30 pointer-events-none flex flex-col justify-end">
                    <span className="block text-[9px] font-bold text-white leading-tight truncate drop-shadow-md">{item.name}</span>
                </div>

                {item.qty > 1 && (
                  <div className="absolute top-1 right-1 bg-background/90 text-foreground text-[10px] font-black px-1.5 py-0.5 rounded-[4px] z-30 border border-border shadow-sm leading-none">
                    x{item.qty}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={`empty-${i}`} className={`${slotBase} bg-muted/30 border border-dashed border-border/80 flex items-center justify-center`}>
              <Plus className="w-5 h-5 text-muted-foreground/50" strokeWidth={2} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const VanguardAdCard = memo(({ ad, currentUserId, currentUserRole, onDelete, ALL_UNITS, onInspectUnit, onSendToCalculator }: { ad: TradingAd; currentUserId?: string; currentUserRole?: string; onDelete: (id: string) => void; ALL_UNITS: MasterUnit[]; onInspectUnit: (unitId: string) => void; onSendToCalculator: (give: TradeCard[], get: TradeCard[]) => void; }) => {
    const { globalCompactMode } = useLayoutStore();
    const [isContacting, setIsContacting] = useState(false);
    const [votes, setVotes] = useState({ up: 0, down: 0, userVote: 0 });
    const [isNewAd, setIsNewAd] = useState(() => Date.now() - new Date(ad.created_at).getTime() < 5000);

    const isOwner = currentUserId === ad.user_id;
    const canModerate = currentUserRole === 'master' || currentUserRole === 'admin' || currentUserRole === 'mod';
    const canDelete = isOwner || canModerate;
    const isTakingOffers = ad.ad_type === "lf_offers" || (ad.ad_type === "standard" && ad.get_items.length === 0);
    const isInventory = ad.ad_type === "inventory";

    const setViewingUser = useInventoryStore(s => s.setViewingUser);
    const openAdContext = useAdInteractionStore(s => s.openAdContext);
    const openPopout = useProfileStore(s => s.openPopout);

    useEffect(() => {
      if (isNewAd) {
        const timer = setTimeout(() => setIsNewAd(false), 4500);
        return () => clearTimeout(timer);
      }
    }, [isNewAd]);

    useEffect(() => {
      const fetchVotes = async () => {
        const { data } = await supabase.from('ad_votes').select('user_id, vote_value').eq('ad_id', ad.id);
        if (data) {
          let up = 0, down = 0, userVote = 0;
          data.forEach(v => {
             if (v.vote_value === 1) up++;
             if (v.vote_value === -1) down++;
             if (currentUserId && v.user_id === currentUserId) userVote = v.vote_value;
          });
          setVotes({ up, down, userVote });
        }
      };
      fetchVotes();
    }, [ad.id, currentUserId]);

    const handleVote = async (val: number) => {
      if (!currentUserId) return;
      triggerHaptic('light');

      const isRemoving = votes.userVote === val;
      const newVal = isRemoving ? 0 : val;

      setVotes(prev => {
           let up = prev.up, down = prev.down;
           if (prev.userVote === 1) up--;
           if (prev.userVote === -1) down--;
           if (newVal === 1) up++;
           if (newVal === -1) down++;
           return { up, down, userVote: newVal };
      });

      if (isRemoving) {
        await supabase.from('ad_votes').delete().match({ ad_id: ad.id, user_id: currentUserId });
      } else {
        await supabase.from('ad_votes').upsert({ ad_id: ad.id, user_id: currentUserId, vote_value: newVal });
      }
    };

    const handleInspectVault = () => {
      triggerHaptic('medium');
      setViewingUser(ad.user_id, ad.profiles?.username || "Trader", "trading-ads");
      window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
    };

    const handleDiscordContact = async () => {
      if (!ad.profiles?.discord_id) return;
      triggerHaptic('medium');
      setIsContacting(true);

      const giveNames = ad.give_items.map(i => `${i.qty > 1 ? `${i.qty}x ` : ''}${i.name}`).join(', ');
      const getNames = ad.get_items.length > 0 ? ad.get_items.map(i => `${i.qty > 1 ? `${i.qty}x ` : ''}${i.name}`).join(', ') : 'Offers';

      let messageStr = "";
      if (isInventory) {
        messageStr = `Hey! Saw your inventory showcase on ASTD Value List.\nI'm interested in offering for some of your units. Are you around to trade?`;
      } else {
        messageStr = `Hey! Saw your ad on ASTD Value List.\nYou're giving: ${giveNames}\nYou're looking for: ${getNames}\nIs this still available?`;
      }

      try {
        await navigator.clipboard.writeText(messageStr);
        safeOpenExternal(`https://discord.com/users/${ad.profiles.discord_id}`);
      } catch (err) {
        console.error("Clipboard failed", err);
      }

      setTimeout(() => setIsContacting(false), 2500);
    };

    const score = votes.up - votes.down;

    let badgeTitle = "TRADE";
    let badgeClasses = "bg-primary text-primary-foreground border-primary";

    if (isTakingOffers) {
      badgeTitle = "LF OFFERS";
      badgeClasses = "bg-foreground text-background border-foreground"; 
    } else if (isInventory) {
      badgeTitle = "SHOWCASE";
      badgeClasses = "bg-muted text-foreground border-border";
    }

    return (
      <div 
        className={`relative rounded-[8px] flex flex-col h-full transition-all duration-200 will-change-transform specular-card ${
          globalCompactMode ? 'p-2.5 sm:p-3' : 'p-4 sm:p-5'
        } ${isNewAd ? 'border-primary ring-1 ring-primary' : ''}`}
      >
        <div className={`flex items-start justify-between ${globalCompactMode ? 'mb-2.5 h-[32px]' : 'mb-4 h-[40px]'} relative z-10`}>
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="relative shrink-0 cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
              onClick={(e) => {
                triggerHaptic('light');
                const rect = e.currentTarget.getBoundingClientRect();
                openPopout(ad.user_id, rect.left, rect.bottom);
              }}
              title="View Profile"
            >
              <img 
                src={ad.profiles?.avatar_url || "/units/firezio.webp"} 
                className={`${globalCompactMode ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-10 h-10 sm:w-11 sm:h-11'} rounded-full bg-muted object-cover border border-border`} 
                alt=""
              />
              <div 
                className={`absolute -bottom-0.5 -right-0.5 ${globalCompactMode ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3 h-3 sm:w-3.5 sm:h-3.5'} rounded-full border-2 border-card z-10`}
                style={{ backgroundColor: STATUS_COLORS[ad.profiles?.status || 'offline'] }}
              />
            </div>
            <div className="flex flex-col min-w-0 pt-0.5">
               <span 
                 className={`${globalCompactMode ? 'text-[13px] sm:text-[14px]' : 'text-[14px] sm:text-[15px]'} font-bold text-foreground tracking-tight leading-none mb-1.5 truncate cursor-pointer hover:underline`}
                 onClick={(e) => {
                   triggerHaptic('light');
                   const rect = e.currentTarget.getBoundingClientRect();
                   openPopout(ad.user_id, rect.left, rect.bottom);
                 }}
               >
                 {ad.profiles?.username || "Unknown"}
               </span>
               <span className="text-[11px] sm:text-[12px] text-muted-foreground font-medium leading-none flex items-center gap-1.5">
                 {getTimeAgo(ad.created_at)}
               </span>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-wider shrink-0 ml-2 border ${badgeClasses}`}>
            {badgeTitle}
          </span>
        </div>

        {ad.note && (
          <div className="mb-5 bg-muted/30 border border-border border-l-2 border-l-primary rounded-[4px] p-3 shadow-inner">
            <div 
              className="text-[12px] text-foreground font-medium leading-relaxed break-words overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            >
              {ad.note}
            </div>
          </div>
        )}

        <div className="flex flex-col w-full flex-1 relative z-10 gap-5">
          {isInventory ? (
            <FixedSlotGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} limit={20} label="Showcase Assets" />
          ) : (
            <>
              <FixedSlotGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} limit={8} label="Offering" />
              <FixedSlotGrid items={ad.get_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} isOfferTile={isTakingOffers} limit={8} label="Requesting" />
            </>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-border flex flex-col gap-2 relative z-10">

          <div className="flex items-center justify-between w-full mb-2">
            <div className="flex items-center gap-0.5 bg-muted rounded-[4px] border border-border p-0.5">
               <button onClick={() => handleVote(1)} className={`p-1.5 rounded-[3px] hover:bg-card transition-colors focus-visible:outline-none cursor-pointer active:scale-90 flex items-center justify-center ${votes.userVote === 1 ? 'text-[#23a559]' : 'text-muted-foreground hover:text-[#23a559]'}`}>
                  <ArrowBigUp className={`w-4 h-4 ${votes.userVote === 1 ? 'fill-current' : ''}`} />
               </button>
               <span className={`text-[12px] font-bold min-w-[20px] text-center font-mono ${score > 0 ? 'text-[#23a559]' : score < 0 ? 'text-destructive' : 'text-foreground'}`}>
                 {score}
               </span>
               <button onClick={() => handleVote(-1)} className={`p-1.5 rounded-[3px] hover:bg-card transition-colors focus-visible:outline-none cursor-pointer active:scale-90 flex items-center justify-center ${votes.userVote === -1 ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}`}>
                  <ArrowBigDown className={`w-4 h-4 ${votes.userVote === -1 ? 'fill-current' : ''}`} />
               </button>
            </div>

            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted px-2 py-1 rounded-[4px] border border-border">
              <Clock className="w-3.5 h-3.5" />
              <CountdownTimer expiresAt={ad.expires_at} />
            </div>
          </div>

          <button
            onClick={handleDiscordContact}
            className={`w-full px-4 py-2.5 flex items-center justify-center gap-2 text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer border ${
              isContacting 
                ? "bg-[#23a559] text-white border-[#23a559]" 
                : "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
            }`}
          >
            {isContacting ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {isContacting ? "Copied! Paste in Discord" : "Contact on Discord"}
          </button>

          <div className="flex gap-2 w-full mt-1">
            <button 
              onClick={() => { triggerHaptic('light'); isInventory ? handleInspectVault() : onSendToCalculator(ad.give_items, ad.get_items); }}
              className="flex-1 px-3 py-2 flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-[4px] border border-border bg-muted hover:bg-card text-foreground transition-colors active:scale-95 focus-visible:outline-none cursor-pointer"
            >
              {isInventory ? <Package className="w-3.5 h-3.5" /> : <Calculator className="w-3.5 h-3.5" />}
              <span className="truncate">{isInventory ? "Inspect Vault" : "Analyze Trade"}</span>
            </button>

            <button
              onClick={() => { triggerHaptic('light'); openAdContext(ad.id, currentUserId); }}
              className="flex-1 px-3 py-2 flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-[4px] border border-border bg-muted hover:bg-card text-foreground transition-colors active:scale-95 focus-visible:outline-none cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="truncate">Thread</span>
            </button>

            {canDelete && (
              <HoldToConfirmButton
                onConfirm={() => { triggerHaptic('heavy'); onDelete(ad.id); }}
                title="Hold to delete"
                className="px-3 py-2 border border-border text-muted-foreground hover:text-destructive-foreground hover:border-destructive bg-muted hover:bg-destructive rounded-[4px] transition-colors focus-visible:outline-none flex items-center justify-center shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </HoldToConfirmButton>
            )}
          </div>
        </div>
      </div>
    );
});

export function TradingAdsChannel() {
  const { ads, isLoading, fetchAds, subscribeToAds, deleteAd } = useTradingAdsStore();
  const { profile, loginWithDiscord } = useAuthStore();
  const { overwrite, setComposerOpen } = useTradeStore();
  const { units: ALL_UNITS } = useUnits();
  const openHistoryModal = useHistoryModalStore((state) => state.openModal);
  const { globalCompactMode } = useLayoutStore();

  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState("newest");
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);

  useEffect(() => {
    fetchAds();
    const unsubscribe = subscribeToAds();
    return () => unsubscribe();
  }, [fetchAds, subscribeToAds]);

  const filteredAndSortedAds = useMemo(() => {
    const list = ads.filter((ad) => {
      const q = searchFilter.toLowerCase().trim();
      const matchSearch = q === "" || 
        ad.profiles?.username?.toLowerCase().includes(q) ||
        ad.give_items.some(i => i.name.toLowerCase().includes(q)) ||
        ad.get_items.some(i => i.name.toLowerCase().includes(q));

      const isTakingOffers = ad.ad_type === "lf_offers" || (ad.ad_type === "standard" && ad.get_items.length === 0);
      let matchesType = true;
      if (typeFilter === "standard") matchesType = ad.ad_type === "standard" && !isTakingOffers;
      if (typeFilter === "lf_offers") matchesType = isTakingOffers;
      if (typeFilter === "inventory") matchesType = ad.ad_type === "inventory";

      return matchSearch && matchesType;
    });

    return list.sort((a, b) => {
      if (sortMode === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortMode === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      const valA = a.give_items.reduce((s, i) => s + i.value * i.qty, 0);
      const valB = b.give_items.reduce((s, i) => s + i.value * i.qty, 0);
      return sortMode === "value-desc" ? valB - valA : valA - valB;
    });
  }, [ads, searchFilter, typeFilter, sortMode]);

  const handleSendToCalculator = (give: TradeCard[], get: TradeCard[]) => {
    triggerHaptic("medium");
    overwrite(get, give); 
    window.dispatchEvent(new Event("open-analyzer"));
  };

  const handleCreateAdClick = () => {
    triggerHaptic("medium");
    setComposerOpen(true, "standard");
    window.dispatchEvent(new Event("open-analyzer"));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full select-none font-sans relative bg-background">

      <div className="flex-shrink-0 flex flex-col px-4 py-3 border-b border-border z-20 gap-3 bg-card">
        <div className="flex items-center justify-between gap-2.5">
          <div className="hidden sm:flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 bg-primary rounded-full z-10" />
              <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-60" />
            </div>
            <h2 className="text-[15px] font-black text-foreground tracking-tight whitespace-nowrap">Live Trading Board</h2>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              onClick={() => { triggerHaptic('light'); setIsControlsCollapsed(!isControlsCollapsed); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-muted border border-border text-foreground text-[11px] font-bold uppercase tracking-wider cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isControlsCollapsed ? "Filters" : "Collapse"}</span>
              {isControlsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            {profile ? (
              <button
                type="button"
                onClick={handleCreateAdClick}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none shrink-0 shadow-sm cursor-pointer active:scale-95 border border-primary"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Ad</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { triggerHaptic('medium'); loginWithDiscord(); }}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-muted border border-border text-foreground text-[11px] font-bold uppercase tracking-wider transition-all hover:bg-card focus-visible:outline-none shrink-0 cursor-pointer active:scale-95"
              >
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>

        <div className={`flex flex-col gap-3 transition-all duration-300 overflow-hidden ${isControlsCollapsed ? 'max-h-0 opacity-0 md:max-h-none md:opacity-100' : 'max-h-[300px] opacity-100'}`}>
          <div className="flex flex-col xl:flex-row xl:items-center gap-3 w-full">
            <div className="flex bg-muted rounded-[4px] p-1 border border-border w-full md:w-fit overflow-x-auto hide-scrollbar shrink-0 shadow-inner">
              {[{ id: "all", label: "All" }, { id: "standard", label: "Trades" }, { id: "lf_offers", label: "LF Offers" }, { id: "inventory", label: "Showcases" }].map(t => (
                <button
                  key={t.id}
                  onClick={() => { triggerHaptic('light'); setTypeFilter(t.id); }}
                  className={`flex-1 md:flex-none px-4 py-1.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none cursor-pointer whitespace-nowrap active:scale-95 ${typeFilter === t.id ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search board by unit name..."
                  className="w-full bg-input text-foreground text-[13px] pl-9 pr-4 py-2 rounded-[4px] outline-none border border-border focus:border-primary transition-colors font-medium h-[36px] shadow-inner"
                />
              </div>

              <div className="w-full sm:w-[190px] shrink-0">
                <CustomDropdown icon={Clock} value={sortMode} options={SORT_OPTIONS} onChange={(val: string) => { triggerHaptic('light'); setSortMode(val); }} defaultLabel="Sort By" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-transparent relative z-10">
        <div className={`w-full h-full max-w-[1400px] mx-auto pb-24 ${globalCompactMode ? 'p-2 md:p-3 lg:p-4' : 'p-4 md:p-6 lg:p-8'}`}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Activity className="w-8 h-8 animate-pulse text-primary" /> 
              <span className="text-[12px] md:text-[13px] font-bold uppercase tracking-widest">Connecting to live market...</span>
            </div>
          ) : filteredAndSortedAds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3 md:gap-4 px-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-muted rounded-[8px] flex items-center justify-center border border-border mb-2 shadow-sm">
                <Megaphone className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
              </div>
              <span className="text-[18px] md:text-[20px] font-black text-foreground tracking-tight">No Active Listings</span>
              <p className="text-[13px] md:text-[14px] text-muted-foreground max-w-md leading-relaxed">
                There are currently no trading ads matching your search parameters. Try adjusting your filters or post a new ad yourself.
              </p>

              <button 
                onClick={handleCreateAdClick}
                className="mt-4 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-[4px] transition-all active:scale-95 hover:bg-primary/80 cursor-pointer shadow-md min-h-[44px]"
              >
                Be the first to post a trade
              </button>
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full animate-fade-in ${globalCompactMode ? 'gap-2 sm:gap-3' : 'gap-4 sm:gap-6'}`}>
              {filteredAndSortedAds.map((ad) => (
                <VanguardAdCard
                  key={ad.id}
                  ad={ad}
                  currentUserId={profile?.id}
                  currentUserRole={profile?.role}
                  onDelete={deleteAd}
                  ALL_UNITS={ALL_UNITS}
                  onInspectUnit={(unitId) => openHistoryModal(unitId)}
                  onSendToCalculator={handleSendToCalculator}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AdInteractionModal />
    </div>
  );
}