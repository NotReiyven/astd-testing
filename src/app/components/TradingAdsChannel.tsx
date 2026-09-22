// ================================================
// FILE: src/app/components/TradingAdsChannel.tsx
// ================================================

import { useState, useEffect, useMemo, memo } from "react";
import { 
  Megaphone, Search, Plus, Trash2, Clock, 
  Check, Lock, Calculator, Package, 
  Copy, Activity, MessageSquare, ArrowBigUp, ArrowBigDown, Send
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTradingAdsStore, TradingAd } from "../../store/useTradingAdsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useProfileStore } from "../../store/useProfileStore";
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

const SORT_OPTIONS = {
  "newest": "Recently Posted",
  "oldest": "Oldest First",
  "value-desc": "Highest Value",
  "value-asc": "Lowest Value"
};

const STATUS_COLORS: Record<string, string> = {
  online: "#23a559",
  dnd: "#f23f43",
  invisible: "#80848e",
  offline: "#80848e"
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

  return <span className="text-[11px] font-bold tracking-wider uppercase">{timeLeft}</span>;
}

const FixedSlotGrid = ({ items, ALL_UNITS, onInspectUnit, isOfferTile, limit = 8 }: { items: TradeCard[]; ALL_UNITS: MasterUnit[]; onInspectUnit: (id: string) => void; isOfferTile?: boolean; limit?: number; }) => {
  const slots = Array.from({ length: limit });
  const displayItems = items.slice(0, limit);
  const extraCount = items.length > limit ? items.length - limit + 1 : 0; 

  const slotBase = "w-full aspect-square rounded-[6px] shrink-0";

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-2.5 w-full">
      {slots.map((_, i) => {
        if (isOfferTile && i === 0) {
          return (
            <div key="offer-tile" className={`${slotBase} bg-popover/90 border-2 border-primary flex flex-col items-center justify-center gap-0.5`}>
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-[8px] font-black text-primary uppercase tracking-wider">Offer</span>
            </div>
          );
        }

        if (extraCount > 0 && i === limit - 1) {
          return (
            <div key="extra-slot" className={`relative ${slotBase} bg-popover/90 border border-border overflow-hidden flex items-center justify-center shadow-inner`}>
               <span className="relative z-10 text-[14px] font-black text-muted-foreground">+{extraCount}</span>
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
              className={`relative ${slotBase} bg-popover/90 border border-border hover:border-primary cursor-pointer transition-colors overflow-visible flex items-center justify-center group shadow-sm active:scale-95`}
              title={`${item.qty > 1 ? `${item.qty}x ` : ''}${item.name}`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white z-0 rounded-[6px] overflow-hidden" style={getAvatarStyle(item.name)}>
                {getInitials(item.name)}
              </div>
              {proxyUrl && (
                <img src={proxyUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-popover rounded-[6px] transition-transform duration-300 group-hover:scale-110" style={{ objectPosition: "center 15%" }} onError={(e) => handleImageError(e, item.id)} />
              )}
              {item.qty > 1 && (
                <div className="absolute -bottom-1.5 -right-1.5 bg-popover/95 text-primary text-[10px] font-black px-1.5 py-0.5 rounded-[4px] z-20 border border-border shadow-sm leading-none whitespace-nowrap">
                  x{item.qty}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={`empty-${i}`} className={`${slotBase} bg-transparent border-2 border-dashed border-border/60 flex items-center justify-center`}>
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-border" strokeWidth={2.5} />
          </div>
        );
      })}
    </div>
  );
};

const VanguardAdCard = memo(({ ad, currentUserId, currentUserRole, onDelete, ALL_UNITS, onInspectUnit, onSendToCalculator }: { ad: TradingAd; currentUserId?: string; currentUserRole?: string; onDelete: (id: string) => void; ALL_UNITS: MasterUnit[]; onInspectUnit: (unitId: string) => void; onSendToCalculator: (give: TradeCard[], get: TradeCard[]) => void; }) => {
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
        window.open(`https://discord.com/users/${ad.profiles.discord_id}`, '_blank');
      } catch (err) {
        console.error("Clipboard failed", err);
      }

      setTimeout(() => setIsContacting(false), 2500);
    };

    const handleAvatarClick = (e: React.MouseEvent) => {
      triggerHaptic('light');
      const rect = e.currentTarget.getBoundingClientRect();
      openPopout(ad.user_id, rect.left, rect.bottom);
    };

    const score = votes.up - votes.down;
    
    let badgeTitle = "TRADE";
    let badgeBg = "bg-primary";
    let themeColor = "var(--primary)";

    if (isTakingOffers) {
      badgeTitle = "LF OFFERS";
      badgeBg = "bg-popover";
      themeColor = "var(--border)"; 
    } else if (isInventory) {
      badgeTitle = "SHOWCASE";
      badgeBg = "bg-popover";
      themeColor = "var(--border)";
    }

    const totalGiveVal = ad.give_items.reduce((acc, i) => {
      const m = ALL_UNITS.find(u => u.id === i.id);
      const val = m && typeof m.value === 'number' ? m.value : (m?.valueMin || i.value);
      return acc + (val * i.qty);
    }, 0);

    return (
      <div 
        className={`relative bg-card/90 backdrop-blur-md rounded-[8px] p-4 sm:p-6 flex flex-col h-full overflow-hidden border shadow-md transition-all duration-500 will-change-transform ${
          isNewAd ? 'animate-[newAdGlow_3s_ease-out_forwards] border-primary scale-[1.02]' : 'hover:border-primary/50 border-border scale-100'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-[4px]" style={{ backgroundColor: themeColor }} />

        <div className="flex items-start justify-between mb-4 h-[44px] relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="relative shrink-0 cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
              onClick={handleAvatarClick}
              title="View Profile"
            >
              <img 
                src={ad.profiles?.avatar_url || "/units/firezio.webp"} 
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-popover object-cover ring-2 ring-offset-2 ring-offset-card" 
                style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
                alt=""
              />
              <div 
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-card z-10"
                style={{ backgroundColor: STATUS_COLORS[ad.profiles?.status || 'offline'] }}
              />
            </div>
            <div className="flex flex-col min-w-0 pt-0.5">
               <span 
                 className="text-[14px] sm:text-[16px] font-bold text-foreground tracking-tight leading-none mb-1.5 truncate cursor-pointer hover:underline"
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
          <span className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-[4px] text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-white shrink-0 ml-2 border border-border ${badgeBg}`}>
            {badgeTitle}
          </span>
        </div>

        <hr className="border-t border-border mb-4 w-full" />

        <div className="mb-4 sm:mb-5 bg-popover/80 border border-border rounded-[6px] p-3 sm:p-3.5 shadow-inner">
          {ad.note ? (
            <div 
              className="text-[12px] sm:text-[13px] text-foreground font-medium leading-relaxed break-all overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            >
              {ad.note}
            </div>
          ) : (
            <div className="text-[12px] sm:text-[13px] text-muted-foreground font-medium italic">
              No notes provided.
            </div>
          )}
        </div>

        <div className="flex flex-col w-full flex-1 relative z-10">
          {isInventory ? (
            <>
              <h4 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">Showcase Assets</h4>
              <FixedSlotGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} limit={20} />
            </>
          ) : (
            <div className="flex flex-col">
              <div>
                <h4 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">Offering</h4>
                <FixedSlotGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} limit={8} />
              </div>
              
              <div className="w-full h-px bg-border my-3 sm:my-4" />
              
              <div>
                <h4 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">Requesting</h4>
                <FixedSlotGrid items={ad.get_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} isOfferTile={isTakingOffers} limit={8} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-border flex flex-col gap-3 sm:gap-3.5 relative z-10">
          
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-0.5 bg-popover/90 rounded-[4px] border border-border p-0.5">
               <button onClick={() => handleVote(1)} className={`p-2 rounded-[3px] hover:bg-muted transition-colors focus-visible:outline-none cursor-pointer active:scale-90 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center ${votes.userVote === 1 ? 'text-[#23a559]' : 'text-muted-foreground hover:text-[#23a559]'}`}>
                  <ArrowBigUp className={`w-4 h-4 sm:w-4 sm:h-4 ${votes.userVote === 1 ? 'fill-current' : ''}`} />
               </button>
               <span className={`text-[12px] font-bold min-w-[24px] text-center ${score > 0 ? 'text-[#23a559]' : score < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                 {score}
               </span>
               <button onClick={() => handleVote(-1)} className={`p-2 rounded-[3px] hover:bg-muted transition-colors focus-visible:outline-none cursor-pointer active:scale-90 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center ${votes.userVote === -1 ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}`}>
                  <ArrowBigDown className={`w-4 h-4 sm:w-4 sm:h-4 ${votes.userVote === -1 ? 'fill-current' : ''}`} />
               </button>
            </div>

            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <CountdownTimer expiresAt={ad.expires_at} />
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full mt-1">
            <button
              onClick={handleDiscordContact}
              className={`w-full px-4 py-3 flex items-center justify-center gap-2 text-[13px] font-bold rounded-[6px] transition-all shadow-sm focus-visible:outline-none cursor-pointer min-h-[44px] ${
                isContacting 
                  ? "bg-[#23a559] text-white active:scale-95" 
                  : "bg-[#5865F2] hover:bg-[#4752C4] text-white active:scale-95"
              }`}
            >
              {isContacting ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {isContacting ? "Copied! Paste in Discord" : "Contact on Discord"}
            </button>

            <div className="flex items-center gap-2 w-full">
              <button 
                onClick={() => { triggerHaptic('light'); isInventory ? handleInspectVault() : onSendToCalculator(ad.give_items, ad.get_items); }}
                className="flex-1 px-3 py-2.5 flex items-center justify-center gap-1.5 text-[11px] sm:text-[12px] font-bold rounded-[4px] border border-border bg-popover/90 hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95 focus-visible:outline-none cursor-pointer shadow-sm min-h-[40px]"
              >
                {isInventory ? <Package className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
                <span className="hidden sm:inline">{isInventory ? "Inspect Vault" : "Analyze Trade"}</span>
              </button>

              <button
                onClick={() => { triggerHaptic('light'); openAdContext(ad.id, currentUserId); }}
                className="flex-1 px-3 py-2.5 flex items-center justify-center gap-1.5 text-[11px] sm:text-[12px] font-bold rounded-[4px] border border-border bg-popover/90 hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95 focus-visible:outline-none cursor-pointer shadow-sm min-h-[40px]"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Thread</span>
              </button>

              {canDelete && (
                <HoldToConfirmButton
                  onConfirm={() => { triggerHaptic('heavy'); onDelete(ad.id); }}
                  title="Hold to delete"
                  className="flex-none p-2.5 border border-border text-muted-foreground hover:text-foreground hover:border-destructive bg-popover/90 hover:bg-destructive/10 rounded-[4px] transition-colors focus-visible:outline-none shadow-sm min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </HoldToConfirmButton>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }
);

export function TradingAdsChannel() {
  const { ads, isLoading, fetchAds, subscribeToAds, deleteAd } = useTradingAdsStore();
  const { profile, loginWithDiscord } = useAuthStore();
  const { overwrite, setComposerOpen } = useTradeStore();
  const { units: ALL_UNITS } = useUnits();
  const openHistoryModal = useHistoryModalStore((state) => state.openModal);

  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState("newest");

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
    <div 
      className="flex-1 flex flex-col overflow-hidden h-full select-none font-sans relative"
      style={{
        backgroundColor: "#16181c",
        backgroundImage: `
          linear-gradient(30deg, #1b1d22 12%, transparent 12.5%, transparent 87%, #1b1d22 87.5%, #1b1d22),
          linear-gradient(150deg, #1b1d22 12%, transparent 12.5%, transparent 87%, #1b1d22 87.5%, #1b1d22),
          linear-gradient(30deg, #1b1d22 12%, transparent 12.5%, transparent 87%, #1b1d22 87.5%, #1b1d22),
          linear-gradient(150deg, #1b1d22 12%, transparent 12.5%, transparent 87%, #1b1d22 87.5%, #1b1d22),
          linear-gradient(60deg, #1e2025 25%, transparent 25.5%, transparent 75%, #1e2025 75.5%, #1e2025),
          linear-gradient(60deg, #1e2025 25%, transparent 25.5%, transparent 75%, #1e2025 75.5%, #1e2025)
        `,
        backgroundSize: "80px 140px",
        backgroundPosition: "0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px"
      }}
    >
      <style>{`
        @keyframes newAdGlow {
          0% { box-shadow: 0 0 0 0 rgba(88,101,242,0.4); border-color: var(--primary); }
          50% { box-shadow: 0 0 20px 0 rgba(88,101,242,0.6); border-color: var(--primary); }
          100% { box-shadow: 0 0 0 0 rgba(88,101,242,0); border-color: var(--border); }
        }
      `}</style>
      
      <div className="flex-shrink-0 flex flex-col px-3 md:px-6 py-3 md:py-4 bg-card/90 backdrop-blur-md border-b border-border shadow-sm z-20 gap-3 md:gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-primary rounded-full z-10" />
              <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-60" />
            </div>
            <h2 className="text-[15px] md:text-[16px] font-black text-foreground tracking-tight">Live Trading Board</h2>
          </div>

          {profile ? (
            <button
              type="button"
              onClick={handleCreateAdClick}
              className="flex items-center justify-center gap-1.5 px-4 md:px-5 py-2.5 rounded-[4px] bg-primary hover:bg-primary/80 text-primary-foreground text-[12px] md:text-[13px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none shrink-0 shadow-sm w-full md:w-auto cursor-pointer active:scale-95 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Ad</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { triggerHaptic('medium'); loginWithDiscord(); }}
              className="flex items-center justify-center gap-1.5 px-4 md:px-5 py-2.5 rounded-[4px] bg-popover/90 border border-border text-muted-foreground text-[12px] md:text-[13px] font-bold uppercase tracking-wider transition-all hover:bg-muted focus-visible:outline-none shrink-0 w-full md:w-auto cursor-pointer active:scale-95 min-h-[44px]"
            >
              <Lock className="w-4 h-4 text-primary" />
              <span>Login to Post</span>
            </button>
          )}
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center gap-3 w-full">
          <div className="flex bg-popover/90 rounded-[4px] p-1 border border-border w-full md:w-fit overflow-x-auto hide-scrollbar shrink-0 shadow-inner">
            {[{ id: "all", label: "All" }, { id: "standard", label: "Trades" }, { id: "lf_offers", label: "LF Offers" }, { id: "inventory", label: "Showcases" }].map(t => (
              <button
                key={t.id}
                onClick={() => { triggerHaptic('light'); setTypeFilter(t.id); }}
                className={`flex-1 md:flex-none px-4 py-2 rounded-[4px] text-[11px] md:text-[12px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none cursor-pointer whitespace-nowrap active:scale-95 min-h-[40px] ${typeFilter === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
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
                className="w-full bg-popover/90 text-foreground text-[13px] md:text-[14px] pl-9 pr-4 py-2.5 rounded-[4px] outline-none border border-border focus:border-primary transition-colors font-medium shadow-inner min-h-[44px]"
              />
            </div>
            
            <div className="w-full sm:w-[190px] shrink-0">
              <CustomDropdown icon={Clock} value={sortMode} options={SORT_OPTIONS} onChange={(val: string) => { triggerHaptic('light'); setSortMode(val); }} defaultLabel="Sort By" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-transparent relative z-10">
        <div className="w-full h-full max-w-[1400px] mx-auto p-3 md:p-6 lg:p-8 pb-24">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Activity className="w-8 h-8 animate-pulse text-primary" />
              <span className="text-[12px] md:text-[13px] font-bold uppercase tracking-widest">Connecting to live market...</span>
            </div>
          ) : filteredAndSortedAds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3 md:gap-4 px-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-card/90 rounded-full flex items-center justify-center border border-border mb-2 shadow-inner">
                <Megaphone className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
              </div>
              <span className="text-[18px] md:text-[20px] font-black text-foreground tracking-tight">No Active Listings</span>
              <p className="text-[13px] md:text-[14px] text-muted-foreground max-w-md leading-relaxed">
                There are currently no trading ads matching your search parameters. Try adjusting your filters or post a new ad yourself.
              </p>
              
              <button 
                onClick={handleCreateAdClick}
                className="mt-4 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-[6px] transition-all active:scale-95 hover:bg-primary/80 cursor-pointer shadow-md min-h-[44px]"
              >
                Be the first to post a trade
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 w-full animate-fade-in">
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