// ================================================
// FILE: src/app/components/TradingAdsChannel.tsx
// ================================================

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

  const slotBase = "w-11 h-11 sm:w-[48px] sm:h-[48px] rounded-[6px] shrink-0";

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-2.5 w-fit">
      {slots.map((_, i) => {
        if (isOfferTile && i === 0) {
          return (
            <div key="offer-tile" className={`${slotBase} bg-[#1e2124] border-2 border-[#7289da] flex flex-col items-center justify-center gap-0.5`}>
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#7289da]" />
              <span className="text-[8px] font-black text-[#7289da] uppercase tracking-wider">Offer</span>
            </div>
          );
        }

        if (extraCount > 0 && i === limit - 1) {
          return (
            <div key="extra-slot" className={`relative ${slotBase} bg-[#1e2124] border border-[#424549] overflow-hidden flex items-center justify-center shadow-inner`}>
               <span className="relative z-10 text-[14px] font-black text-[#b9bbbe]">+{extraCount}</span>
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
              className={`relative ${slotBase} bg-[#1e2124] border border-[#424549] hover:border-[#7289da] cursor-pointer transition-colors overflow-visible flex items-center justify-center group shadow-sm`}
              title={`${item.qty > 1 ? `${item.qty}x ` : ''}${item.name}`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white z-0 rounded-[6px] overflow-hidden" style={getAvatarStyle(item.name)}>
                {getInitials(item.name)}
              </div>
              {proxyUrl && (
                <img src={proxyUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-[#1e2124] rounded-[6px] transition-transform duration-300 group-hover:scale-110" style={{ objectPosition: "center 15%" }} onError={(e) => handleImageError(e, item.id)} />
              )}
              {item.qty > 1 && (
                <div className="absolute -bottom-1.5 -right-1.5 bg-[#1e2124] text-[#7289da] text-[10px] font-black px-1.5 py-0.5 rounded-[4px] z-20 border border-[#424549] shadow-sm leading-none whitespace-nowrap">
                  x{item.qty}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={`empty-${i}`} className={`${slotBase} bg-transparent border-2 border-dashed border-[#424549] flex items-center justify-center`}>
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-[#424549]" strokeWidth={2.5} />
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
      // Pass "trading-ads" directly so the vault knows exactly where to return
      setViewingUser(ad.user_id, ad.profiles?.username || "Trader", "trading-ads");
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
      badgeBg = "bg-[#1e2124]";
      themeColor = "#1e2124";
    }

    return (
      <div className="relative bg-[#282b30] rounded-[8px] p-5 sm:p-6 flex flex-col h-full overflow-hidden border border-[#424549] shadow-md hover:border-[#7289da]/50 transition-colors">
        
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
               <span className="text-[15px] sm:text-[16px] font-bold text-[#ffffff] tracking-tight leading-none mb-1.5 flex items-center gap-1.5 group-hover/user:underline truncate">
                 {ad.profiles?.username || "Unknown"}
                 {copiedId && <Check className="w-3.5 h-3.5 text-[#23a559] shrink-0" />}
               </span>
               <span className="text-[12px] text-[#b9bbbe] font-medium leading-none flex items-center gap-1.5">
                 {getTimeAgo(ad.created_at)}
               </span>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-wider text-white shrink-0 ml-2 border border-[#424549] ${badgeBg}`}>
            {badgeTitle}
          </span>
        </div>

        <hr className="border-t border-[#424549] mb-4 w-full" />

        <div className="mb-5 bg-[#1e2124] border border-[#424549] rounded-[6px] p-3.5 shadow-inner">
          {ad.note ? (
            <div 
              className="text-[13px] text-[#ffffff] font-medium leading-relaxed break-words overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            >
              {ad.note}
            </div>
          ) : (
            <div className="text-[13px] text-[#72767d] font-medium italic">
              No notes provided.
            </div>
          )}
        </div>

        <div className="flex flex-col w-full flex-1 relative z-10">
          {isInventory ? (
            <>
              <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2 text-[#b9bbbe]">Showcase Assets</h4>
              <FixedSlotGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} limit={20} />
            </>
          ) : (
            <div className="flex flex-col">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2 text-[#b9bbbe]">Offering</h4>
                <FixedSlotGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} limit={8} />
              </div>
              
              <div className="w-full h-px bg-[#424549] my-4" />
              
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2 text-[#b9bbbe]">Requesting</h4>
                <FixedSlotGrid items={ad.get_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} isOfferTile={isTakingOffers} limit={8} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-[#424549] flex flex-col gap-3.5 relative z-10">
          
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-0.5 bg-[#1e2124] rounded-[4px] border border-[#424549] p-0.5">
               <button onClick={() => handleVote(1)} className={`p-1 rounded-[3px] hover:bg-[#424549] transition-colors focus-visible:outline-none ${votes.userVote === 1 ? 'text-[#23a559]' : 'text-[#72767d] hover:text-[#23a559]'}`}>
                  <ArrowBigUp className={`w-4 h-4 ${votes.userVote === 1 ? 'fill-current' : ''}`} />
               </button>
               <span className={`text-[12px] font-bold min-w-[24px] text-center ${score > 0 ? 'text-[#23a559]' : score < 0 ? 'text-[#ed4245]' : 'text-[#b9bbbe]'}`}>
                 {score}
               </span>
               <button onClick={() => handleVote(-1)} className={`p-1 rounded-[3px] hover:bg-[#424549] transition-colors focus-visible:outline-none ${votes.userVote === -1 ? 'text-[#ed4245]' : 'text-[#72767d] hover:text-[#ed4245]'}`}>
                  <ArrowBigDown className={`w-4 h-4 ${votes.userVote === -1 ? 'fill-current' : ''}`} />
               </button>
            </div>

            <div className="flex items-center gap-1.5 text-[#72767d]">
              <Clock className="w-3.5 h-3.5" />
              <CountdownTimer expiresAt={ad.expires_at} />
            </div>
          </div>

          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyId}
                className="px-3 py-2 flex items-center gap-1.5 text-[12px] font-bold rounded-[4px] border border-[#424549] bg-[#1e2124] hover:bg-[#36393e] text-[#b9bbbe] hover:text-[#ffffff] transition-colors focus-visible:outline-none shadow-sm"
              >
                {copiedId ? <Check className="w-4 h-4 text-[#23a559]" /> : <Copy className="w-4 h-4" />}
                <span className="hidden xl:inline">ID</span>
              </button>

              <button
                onClick={() => { triggerHaptic('light'); openAdContext(ad.id, currentUserId); }}
                className="px-3 py-2 flex items-center gap-1.5 text-[12px] font-bold rounded-[4px] border border-[#424549] bg-[#1e2124] hover:bg-[#36393e] text-[#b9bbbe] hover:text-[#ffffff] transition-colors focus-visible:outline-none shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Thread</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => isInventory ? handleInspectVault() : onSendToCalculator(ad.give_items, ad.get_items)}
                className="px-4 py-2 flex items-center gap-1.5 text-[12px] font-bold rounded-[4px] text-white bg-[#7289da] hover:bg-[#5b6eae] transition-colors focus-visible:outline-none shadow-sm active:scale-95"
              >
                {isInventory ? <Package className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
                <span className="hidden sm:inline">{isInventory ? "Inspect" : "Evaluate"}</span>
              </button>

              {canDelete && (
                <button
                  onClick={() => onDelete(ad.id)}
                  className="p-2 border border-[#424549] text-[#72767d] hover:text-[#ffffff] hover:border-[#ed4245] bg-[#1e2124] hover:bg-[#ed4245] rounded-[4px] transition-colors focus-visible:outline-none shadow-sm"
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
    <div className="flex-1 flex flex-col overflow-hidden bg-[#36393e] h-full select-none font-sans relative">
      
      <div className="flex-shrink-0 flex flex-col px-4 md:px-6 py-4 bg-[#282b30] border-b border-[#424549] shadow-sm z-20 gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-[#7289da] rounded-full z-10" />
              <div className="absolute inset-0 bg-[#7289da] rounded-full animate-ping opacity-60" />
            </div>
            <h2 className="text-[16px] font-black text-[#ffffff] tracking-tight">Live Trading Board</h2>
          </div>

          {profile ? (
            <button
              type="button"
              onClick={handleCreateAdClick}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-[4px] bg-[#7289da] hover:bg-[#5b6eae] text-white text-[13px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Ad</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={loginWithDiscord}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-[4px] bg-[#1e2124] border border-[#424549] text-[#b9bbbe] text-[13px] font-bold uppercase tracking-wider transition-colors hover:bg-[#36393e] focus-visible:outline-none shrink-0"
            >
              <Lock className="w-4 h-4 text-[#7289da]" />
              <span>Login to Post</span>
            </button>
          )}
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center gap-4 w-full">
          <div className="flex bg-[#1e2124] rounded-[4px] p-1 border border-[#424549] w-full md:w-fit overflow-x-auto hide-scrollbar shrink-0 shadow-inner">
            {[{ id: "all", label: "All" }, { id: "standard", label: "Trades" }, { id: "lf_offers", label: "LF Offers" }, { id: "inventory", label: "Showcases" }].map(t => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`flex-1 md:flex-none px-5 py-1.5 rounded-[4px] text-[12px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none whitespace-nowrap ${typeFilter === t.id ? 'bg-[#7289da] text-white shadow-sm' : 'text-[#72767d] hover:text-[#b9bbbe]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#72767d] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search board by unit name..."
                className="w-full bg-[#1e2124] text-[#ffffff] text-[14px] pl-10 pr-4 py-2 rounded-[4px] outline-none border border-[#424549] focus:border-[#7289da] transition-colors font-medium shadow-inner"
              />
            </div>
            
            <div className="w-full sm:w-auto shrink-0">
              <CustomDropdown icon={Clock} value={sortMode} options={SORT_OPTIONS} onChange={setSortMode} defaultLabel="Sort By" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-[#36393e] relative z-10">
        <div className="w-full h-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 pb-24">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#b9bbbe] gap-3">
              <Activity className="w-8 h-8 animate-pulse text-[#7289da]" />
              <span className="text-[13px] font-bold uppercase tracking-widest">Connecting to live market...</span>
            </div>
          ) : filteredAndSortedAds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-20 h-20 bg-[#282b30] rounded-full flex items-center justify-center border border-[#424549] mb-2 shadow-inner">
                <Megaphone className="w-10 h-10 text-[#424549]" />
              </div>
              <span className="text-[20px] font-black text-[#ffffff] tracking-tight">No Active Listings</span>
              <p className="text-[14px] text-[#b9bbbe] max-w-md leading-relaxed">
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