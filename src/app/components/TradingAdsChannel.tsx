import { useState, useEffect, useMemo, memo } from "react";
import { 
  Megaphone, Search, Plus, Trash2, Clock, 
  Check, Lock, Calculator, Package, 
  Copy, Activity, MessageSquare, ArrowBigUp, ArrowBigDown 
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTradingAdsStore, TradingAd } from "../../store/useTradingAdsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useUnits } from "../../context/UnitContext";
import { useHistoryModalStore } from "../../store/useHistoryModalStore";
import { TradeCard, MasterUnit } from "../../types";
import { getProxyImage, handleImageError } from "../../data";
import { getAvatarStyle, getInitials } from "./TradeAnalyzer/summaryUtils";
import { triggerHaptic } from "../../data/helpers";
import { CustomDropdown } from "./MainCanvas/CustomDropdown";
import { useAdInteractionStore } from "../../store/useAdInteractionStore";
import { AdInteractionModal } from "./AdInteractionModal";

const SORT_OPTIONS = {
  "newest": "Recently Posted",
  "oldest": "Oldest First",
  "value-desc": "Highest Value",
  "value-asc": "Lowest Value"
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

  const slotBase = "w-12 h-12 sm:w-[54px] sm:h-[54px] rounded-[8px] shrink-0";

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 w-fit mx-auto">
      {slots.map((_, i) => {
        if (isOfferTile && i === 0) {
          return (
            <div key="offer-tile" className={`${slotBase} bg-[#1e2124] border-2 border-[#7289da] flex flex-col items-center justify-center gap-0.5`}>
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#7289da]" />
              <span className="text-[8px] sm:text-[9px] font-black text-[#7289da] uppercase tracking-wider">Offer</span>
            </div>
          );
        }

        if (extraCount > 0 && i === limit - 1) {
          const item = displayItems[i];
          const master = item ? ALL_UNITS.find(u => u.id === item.id) : null;
          const proxyUrl = master ? getProxyImage(item.id, master.imageUrl) : null;
          return (
            <div key="extra-slot" className={`relative ${slotBase} bg-[#1e2124] border border-[rgba(255,255,255,0.08)] overflow-hidden flex items-center justify-center`}>
               {proxyUrl && <img src={proxyUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
               <div className="absolute inset-0 bg-[#1e2124]/70 z-0" />
               <span className="relative z-10 text-[13px] sm:text-[14px] font-black text-[#F2F3F5]">+{extraCount}</span>
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
              onClick={() => onInspectUnit(item.id)}
              className={`relative ${slotBase} bg-[#1e2124] border border-[rgba(255,255,255,0.08)] hover:border-[#7289da] cursor-pointer transition-colors overflow-visible flex items-center justify-center group`}
              title={`${item.qty > 1 ? `${item.qty}x ` : ''}${item.name}`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-white z-0 rounded-[8px] overflow-hidden" style={getAvatarStyle(item.name)}>
                {getInitials(item.name)}
              </div>
              {proxyUrl && (
                <img src={proxyUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-[#1e2124] rounded-[8px] transition-transform duration-300 group-hover:scale-105" style={{ objectPosition: "center 15%" }} onError={(e) => handleImageError(e, item.id)} />
              )}
              {item.qty > 1 && (
                <div className="absolute -bottom-1.5 -right-1.5 bg-[#1e2124] text-[#7289da] text-[10px] font-black px-1.5 py-0.5 rounded-[4px] z-20 border border-[rgba(255,255,255,0.15)] shadow-sm leading-none whitespace-nowrap">
                  x{item.qty}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={`empty-${i}`} className={`${slotBase} bg-transparent border-2 border-dashed border-[rgba(255,255,255,0.08)] flex items-center justify-center`}>
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-[rgba(255,255,255,0.1)]" strokeWidth={2.5} />
          </div>
        );
      })}
    </div>
  );
};

const VanguardAdCard = memo(({ ad, currentUserId, currentUserRole, onDelete, ALL_UNITS, onInspectUnit, onSendToCalculator }: { ad: TradingAd; currentUserId?: string; currentUserRole?: string; onDelete: (id: string) => void; ALL_UNITS: MasterUnit[]; onInspectUnit: (unitId: string) => void; onSendToCalculator: (give: TradeCard[], get: TradeCard[]) => void; }) => {
    const [copiedId, setCopiedId] = useState(false);
    const [votes, setVotes] = useState({ up: 0, down: 0, userVote: 0 });

    const isOwner = currentUserId === ad.user_id;
    const canModerate = currentUserRole === 'master' || currentUserRole === 'admin' || currentUserRole === 'mod';
    const canDelete = isOwner || canModerate;
    const isTakingOffers = ad.ad_type === "lf_offers" || (ad.ad_type === "standard" && ad.get_items.length === 0);
    const isInventory = ad.ad_type === "inventory";

    const setViewingUser = useInventoryStore(s => s.setViewingUser);
    const openAdContext = useAdInteractionStore(s => s.openAdContext);

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
      setViewingUser(ad.user_id, ad.profiles?.username || "Trader");
      window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
    };

    const handleCopyId = () => {
      if (!ad.profiles?.discord_id) return;
      navigator.clipboard.writeText(ad.profiles.discord_id);
      setCopiedId(true);
      triggerHaptic('light');
      setTimeout(() => setCopiedId(false), 2000);
    };

    const score = votes.up - votes.down;
    
    let badgeTitle = "TRADE";
    let badgeBg = "bg-[#7289da]";
    let themeColor = "#7289da";

    if (isTakingOffers) {
      badgeTitle = "LF OFFERS";
      badgeBg = "bg-[#424549]";
      themeColor = "#424549"; 
    } else if (isInventory) {
      badgeTitle = "SHOWCASE";
      badgeBg = "bg-[#36393e]";
      themeColor = "#36393e";
    }

    return (
      <div className="relative bg-[#282b30] rounded-[12px] p-5 sm:p-6 flex flex-col h-full overflow-hidden border border-[rgba(255,255,255,0.04)] shadow-md hover:border-[rgba(255,255,255,0.08)] transition-colors">
        
        {/* Solid Discord Palette Top Border */}
        <div className="absolute top-0 left-0 right-0 h-[4px]" style={{ backgroundColor: themeColor }} />

        <div className="flex items-start justify-between mb-4 h-[44px] relative z-10">
          <div className="flex items-center gap-3.5 cursor-pointer group/user min-w-0" onClick={handleCopyId} title="Click to copy Discord ID">
            <div className="relative shrink-0">
              <img 
                src={ad.profiles?.avatar_url || "/units/firezio.webp"} 
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1e2124] object-cover ring-2 ring-offset-2 ring-offset-[#282b30]" 
                style={{ '--tw-ring-color': '#7289da' } as React.CSSProperties}
                alt=""
              />
            </div>
            <div className="flex flex-col min-w-0 pt-0.5">
               <span className="text-[15px] sm:text-[16px] font-bold text-[#F2F3F5] tracking-tight leading-none mb-1.5 flex items-center gap-1.5 group-hover/user:underline truncate">
                 {ad.profiles?.username || "Unknown"}
                 {copiedId && <Check className="w-3.5 h-3.5 text-[#23a559] shrink-0" />}
               </span>
               <span className="text-[12px] text-[#B5BAC1] font-medium leading-none flex items-center gap-1.5">
                 {getTimeAgo(ad.created_at)}
               </span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-wider text-white shrink-0 ml-2 ${badgeBg}`}>
            {badgeTitle}
          </span>
        </div>

        <hr className="border-t border-[rgba(255,255,255,0.06)] mb-4 w-full" />

        <div className="mb-5 bg-[#1e2124] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-3.5">
          {ad.note ? (
            <div 
              className="text-[13px] text-[#DBDEE1] font-medium leading-relaxed break-words overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            >
              {ad.note}
            </div>
          ) : (
            <div className="text-[13px] text-[#B5BAC1] font-medium italic">
              No notes provided.
            </div>
          )}
        </div>

        <div className="flex flex-col items-center w-full flex-1 bg-[#1e2124] rounded-[10px] p-4 sm:p-5 border border-[rgba(255,255,255,0.03)] relative z-10 shadow-inner">
          {isInventory ? (
            <>
              <h4 className="text-[12px] font-bold uppercase tracking-wider mb-4 text-[#B5BAC1]">Showcase Assets</h4>
              <FixedSlotGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} limit={20} />
            </>
          ) : (
            <>
              <h4 className="text-[12px] font-bold uppercase tracking-wider mb-4 text-[#B5BAC1]">Offering</h4>
              <FixedSlotGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} limit={8} />
              
              <h4 className="text-[12px] font-bold uppercase tracking-wider mt-7 mb-4 text-[#B5BAC1]">Requesting</h4>
              <FixedSlotGrid items={ad.get_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} isOfferTile={isTakingOffers} limit={8} />
            </>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.04)] flex flex-col gap-3.5 relative z-10">
          
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-0.5 bg-[#1e2124] rounded-[6px] border border-[rgba(255,255,255,0.04)] p-0.5">
               <button onClick={() => handleVote(1)} className={`p-1 rounded-[4px] hover:bg-[rgba(255,255,255,0.04)] transition-colors focus-visible:outline-none ${votes.userVote === 1 ? 'text-[#23a559]' : 'text-[#B5BAC1] hover:text-[#23a559]'}`}>
                  <ArrowBigUp className={`w-4 h-4 ${votes.userVote === 1 ? 'fill-current' : ''}`} />
               </button>
               <span className={`text-[12px] font-bold min-w-[24px] text-center ${score > 0 ? 'text-[#23a559]' : score < 0 ? 'text-[#ed4245]' : 'text-[#DBDEE1]'}`}>
                 {score}
               </span>
               <button onClick={() => handleVote(-1)} className={`p-1 rounded-[4px] hover:bg-[rgba(255,255,255,0.04)] transition-colors focus-visible:outline-none ${votes.userVote === -1 ? 'text-[#ed4245]' : 'text-[#B5BAC1] hover:text-[#ed4245]'}`}>
                  <ArrowBigDown className={`w-4 h-4 ${votes.userVote === -1 ? 'fill-current' : ''}`} />
               </button>
            </div>

            <div className="flex items-center gap-1.5 text-[#B5BAC1]">
              <Clock className="w-3.5 h-3.5" />
              <CountdownTimer expiresAt={ad.expires_at} />
            </div>
          </div>

          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyId}
                className="px-3 py-2 flex items-center gap-1.5 text-[12px] font-bold rounded-[6px] border border-[rgba(255,255,255,0.06)] bg-[#1e2124] hover:bg-[rgba(255,255,255,0.04)] text-[#B5BAC1] hover:text-[#DBDEE1] transition-colors focus-visible:outline-none"
              >
                {copiedId ? <Check className="w-4 h-4 text-[#23a559]" /> : <Copy className="w-4 h-4" />}
                <span className="hidden xl:inline">ID</span>
              </button>

              <button
                onClick={() => { triggerHaptic('light'); openAdContext(ad.id, currentUserId); }}
                className="px-3 py-2 flex items-center gap-1.5 text-[12px] font-bold rounded-[6px] border border-[rgba(255,255,255,0.06)] bg-[#1e2124] hover:bg-[rgba(255,255,255,0.04)] text-[#B5BAC1] hover:text-[#DBDEE1] transition-colors focus-visible:outline-none"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Thread</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => isInventory ? handleInspectVault() : onSendToCalculator(ad.give_items, ad.get_items)}
                className="px-4 py-2 flex items-center gap-1.5 text-[12px] font-bold rounded-[4px] text-white bg-[#7289da] hover:bg-[#5b73c7] transition-colors focus-visible:outline-none shadow-sm active:scale-95"
              >
                {isInventory ? <Package className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
                <span className="hidden sm:inline">{isInventory ? "Inspect" : "Evaluate"}</span>
              </button>

              {canDelete && (
                <button
                  onClick={() => onDelete(ad.id)}
                  className="p-2 border border-[rgba(255,255,255,0.06)] text-[#B5BAC1] hover:text-[#ed4245] hover:border-[rgba(237,66,69,0.3)] bg-[#1e2124] hover:bg-[rgba(237,66,69,0.1)] rounded-[4px] transition-colors focus-visible:outline-none"
                  title="Delete listing"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
    setComposerOpen(true, "standard");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#313338] h-full select-none font-sans relative">
      
      <div className="flex-shrink-0 flex flex-col px-4 md:px-6 py-4 bg-[#282b30] border-b border-[rgba(0,0,0,0.22)] shadow-sm z-20 gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-[#7289da] rounded-full z-10" />
              <div className="absolute inset-0 bg-[#7289da] rounded-full animate-ping opacity-60" />
            </div>
            <h2 className="text-[16px] font-black text-[#F2F3F5] tracking-tight">Live Trading Board</h2>
          </div>

          {profile ? (
            <button
              type="button"
              onClick={handleCreateAdClick}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-[4px] bg-[#7289da] hover:bg-[#5b73c7] text-white text-[13px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Ad</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={loginWithDiscord}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-[4px] bg-[#1e2124] border border-[rgba(255,255,255,0.04)] text-[#DBDEE1] text-[13px] font-bold uppercase tracking-wider transition-colors hover:bg-[#36393e] focus-visible:outline-none shrink-0"
            >
              <Lock className="w-4 h-4 text-[#7289da]" />
              <span>Login to Post</span>
            </button>
          )}
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center gap-4 w-full">
          <div className="flex bg-[#1e2124] rounded-[6px] p-1 border border-[rgba(255,255,255,0.04)] w-full md:w-fit overflow-x-auto hide-scrollbar shrink-0 shadow-inner">
            {[{ id: "all", label: "All" }, { id: "standard", label: "Trades" }, { id: "lf_offers", label: "LF Offers" }, { id: "inventory", label: "Showcases" }].map(t => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`flex-1 md:flex-none px-5 py-1.5 rounded-[4px] text-[12px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none whitespace-nowrap ${typeFilter === t.id ? 'bg-[#7289da] text-white shadow-sm' : 'text-[#B5BAC1] hover:text-[#DBDEE1]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#B5BAC1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search board by unit name..."
                className="w-full bg-[#1e2124] text-[#F2F3F5] text-[14px] pl-10 pr-4 py-2 rounded-[6px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#7289da] transition-colors font-medium shadow-inner"
              />
            </div>
            
            <div className="w-full sm:w-auto shrink-0">
              <CustomDropdown icon={Clock} value={sortMode} options={SORT_OPTIONS} onChange={setSortMode} defaultLabel="Sort By" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-[#313338] relative z-10">
        <div className="w-full h-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 pb-24">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#B5BAC1] gap-3">
              <Activity className="w-8 h-8 animate-pulse text-[#7289da]" />
              <span className="text-[13px] font-bold uppercase tracking-widest">Connecting to live market...</span>
            </div>
          ) : filteredAndSortedAds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-20 h-20 bg-[#282b30] rounded-full flex items-center justify-center border border-[rgba(255,255,255,0.04)] mb-2 shadow-inner">
                <Megaphone className="w-10 h-10 text-[#4E5058]" />
              </div>
              <span className="text-[20px] font-black text-[#F2F3F5] tracking-tight">No Active Listings</span>
              <p className="text-[14px] text-[#B5BAC1] max-w-md leading-relaxed">
                There are currently no trading ads matching your search parameters. Try adjusting your filters or post a new ad yourself.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full animate-fade-in">
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