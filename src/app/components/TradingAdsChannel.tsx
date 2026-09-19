// FILE: src/app/components/TradingAdsChannel.tsx

import { useState, useEffect, useMemo, memo } from "react";
import { 
  Megaphone, Search, Plus, Trash2, Clock, 
  ExternalLink, Check, Lock, X, ArrowDownCircle,
  Calculator, Package, BookOpen, UserCircle2, ArrowRight
} from "lucide-react";
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

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getExpiryDate(dateStr: string) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const SlotGrid = ({ items, ALL_UNITS, onInspectUnit, label }: { items: TradeCard[]; ALL_UNITS: MasterUnit[]; onInspectUnit: (id: string) => void; label: string }) => {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#80848E]">{label}</span>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 bg-[#161719] p-3 rounded-[8px] border border-[rgba(255,255,255,0.03)] shadow-inner max-h-[190px] overflow-y-auto custom-scrollbar">
        {items.length === 0 ? (
          <div className="w-full py-4 text-center text-[11px] text-[#80848E] italic">No items</div>
        ) : (
          items.map((item, index) => {
            const master = ALL_UNITS.find((u) => u.id === item.id);
            const proxyUrl = getProxyImage(item.id, master?.imageUrl);

            return (
              <div
                key={`${item.id}-${index}`}
                onClick={() => onInspectUnit(item.id)}
                className="relative w-[52px] h-[52px] rounded-[6px] bg-[#111214] border border-[rgba(255,255,255,0.08)] hover:border-[#5865F2] cursor-pointer transition-all shadow-sm group overflow-hidden flex items-center justify-center shrink-0"
                title={`${item.qty > 1 ? `${item.qty}x ` : ''}${item.name} • ${(item.value * item.qty).toLocaleString()}`}
              >
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white z-0" style={getAvatarStyle(item.name)}>
                  {getInitials(item.name)}
                </div>
                {proxyUrl && (
                  <img 
                    src={proxyUrl} 
                    alt={item.name} 
                    className="absolute inset-0 w-full h-full object-cover z-10 bg-[#111214]" 
                    style={{ objectPosition: "center 15%" }} 
                    onError={(e) => handleImageError(e, item.id)} 
                  />
                )}

                {item.qty > 1 && (
                  <div className="absolute top-1 right-1 bg-[#2B2D31] text-[#DBDEE1] text-[9px] font-black px-1.5 py-0.5 rounded-full z-20 border border-[rgba(255,255,255,0.1)] shadow-sm">
                    x{item.qty}
                  </div>
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex items-center justify-center">
                  <Search className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const AdCard = memo(({ ad, currentUserId, currentUserRole, onDelete, ALL_UNITS, onInspectUnit, onSendToCalculator }: { ad: TradingAd; currentUserId?: string; currentUserRole?: string; onDelete: (id: string) => void; ALL_UNITS: MasterUnit[]; onInspectUnit: (unitId: string) => void; onSendToCalculator: (give: TradeCard[], get: TradeCard[]) => void; }) => {
    const isOwner = currentUserId === ad.user_id;
    const canModerate = currentUserRole === 'master' || currentUserRole === 'admin' || currentUserRole === 'mod';
    const canDelete = isOwner || canModerate;

    const giveVal = ad.give_items.reduce((sum, item) => sum + item.value * item.qty, 0);
    
    const isTakingOffers = ad.ad_type === "lf_offers" || (ad.ad_type === "standard" && ad.get_items.length === 0);
    const isInventory = ad.ad_type === "inventory";

    const setViewingUser = useInventoryStore(s => s.setViewingUser);

    const handleInspectVault = () => {
      triggerHaptic('medium');
      setViewingUser(ad.user_id, ad.profiles?.username || "Trader");
      window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
    };

    const getAdTypeBadge = () => {
      if (isInventory) {
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[rgba(255,255,255,0.06)] text-[#DBDEE1] border border-[rgba(255,255,255,0.08)] flex items-center gap-1.5">
            <Package className="w-3 h-3 text-[#949BA4]" /> Showcase
          </span>
        );
      }
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[rgba(88,101,242,0.1)] text-[#5865F2] border border-[rgba(88,101,242,0.2)] flex items-center gap-1.5">
          <Calculator className="w-3 h-3" /> Trade
        </span>
      );
    };

    return (
      <div className="bg-[#2B2D31] rounded-[8px] flex flex-col transition-all shadow-sm border border-[rgba(255,255,255,0.04)] overflow-hidden hover:border-[rgba(255,255,255,0.08)]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#1E1F22] border-b border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2">
            {getAdTypeBadge()}
            {isOwner && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#5865F2]/20 text-[#5865F2]">
                You
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[13px] font-bold text-[#F2F3F5] truncate max-w-[140px]">
              {ad.profiles?.username || "Unknown Trader"}
            </span>
            <img
              src={ad.profiles?.avatar_url || "/units/firezio.webp"}
              alt="Avatar"
              className="w-7 h-7 rounded-full bg-[#111214] object-cover shrink-0 border border-[rgba(255,255,255,0.08)]"
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4 flex-1">
          {/* Note block with invisible placeholder to maintain equal card heights */}
          <div className={`px-3.5 py-2.5 rounded-r-[6px] text-[12.5px] italic leading-relaxed transition-opacity ${ad.note ? 'bg-[#1E1F22] border-l-2 border-[#5865F2] text-[#DBDEE1]' : 'opacity-0 pointer-events-none select-none h-[38px] bg-transparent'}`}>
            "{ad.note || "placeholder"}"
          </div>

          {isInventory ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#80848E]">Vault Showcase</span>
                <span className="font-mono text-[11.5px] font-bold text-[#DBDEE1]">{giveVal.toLocaleString()} Value</span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-[225px] overflow-y-auto custom-scrollbar p-3 rounded-[8px] bg-[#161719] border border-[rgba(255,255,255,0.03)] shadow-inner">
                {ad.give_items.map((item, index) => {
                  const master = ALL_UNITS.find((u) => u.id === item.id);
                  const proxyUrl = getProxyImage(item.id, master?.imageUrl);
                  return (
                    <div
                      key={`${item.id}-${index}`}
                      onClick={() => onInspectUnit(item.id)}
                      className="relative w-[52px] h-[52px] rounded-[6px] bg-[#111214] border border-[rgba(255,255,255,0.08)] hover:border-[#5865F2] cursor-pointer transition-all shadow-sm group overflow-hidden flex items-center justify-center shrink-0"
                      title={`${item.qty > 1 ? `${item.qty}x ` : ''}${item.name} • ${(item.value * item.qty).toLocaleString()}`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white z-0" style={getAvatarStyle(item.name)}>
                        {getInitials(item.name)}
                      </div>
                      {proxyUrl && (
                        <img 
                          src={proxyUrl} 
                          alt={item.name} 
                          className="absolute inset-0 w-full h-full object-cover z-10 bg-[#111214]" 
                          style={{ objectPosition: "center 15%" }} 
                          onError={(e) => handleImageError(e, item.id)} 
                        />
                      )}
                      {item.qty > 1 && (
                        <div className="absolute top-1 right-1 bg-[#2B2D31] text-[#DBDEE1] text-[9px] font-black px-1.5 py-0.5 rounded-full z-20 border border-[rgba(255,255,255,0.1)] shadow-sm">
                          x{item.qty}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex items-center justify-center">
                        <Search className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 bg-[#1E1F22] p-3 rounded-[6px] border border-[rgba(255,255,255,0.03)] shadow-inner">
                <div className="flex items-center justify-between pb-1.5 border-b border-[rgba(255,255,255,0.04)]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#FAA61A]">Offering</span>
                  <span className="font-mono text-[11px] font-bold text-[#DBDEE1]">{giveVal.toLocaleString()}</span>
                </div>
                <SlotGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} label="" />
              </div>

              <div className="flex flex-col gap-2 bg-[#1E1F22] p-3 rounded-[6px] border border-[rgba(255,255,255,0.03)] shadow-inner">
                <div className="flex items-center justify-between pb-1.5 border-b border-[rgba(255,255,255,0.04)]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#5865F2]">Requesting</span>
                  {!isTakingOffers && <span className="font-mono text-[11px] font-bold text-[#DBDEE1]">{ad.get_items.reduce((s, i) => s + i.value * i.qty, 0).toLocaleString()}</span>}
                </div>
                {isTakingOffers ? (
                  <div className="flex flex-col gap-2 py-2">
                    <div className="flex items-center justify-center py-5 bg-[#161719] rounded-[6px] border border-dashed border-[rgba(250,166,26,0.3)] text-[#FAA61A]">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Taking All Offers</span>
                    </div>
                  </div>
                ) : (
                  <SlotGrid items={ad.get_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} label="" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions & Metadata */}
        <div className="mt-auto px-4 py-3 bg-[#18191C] border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between gap-3">
          <span className="text-[10.5px] text-[#80848E] truncate">
            Posted {getTimeAgo(ad.created_at)} • Expires {getExpiryDate(ad.expires_at)}
          </span>
          
          <div className="flex items-center gap-2 shrink-0">
            {isInventory ? (
              <button
                onClick={handleInspectVault}
                className="px-4 py-1.5 rounded-[4px] bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-[11px] uppercase tracking-wider transition-colors shadow-sm focus-visible:outline-none"
              >
                Inspect
              </button>
            ) : (
              <button
                onClick={() => onSendToCalculator(ad.give_items, ad.get_items)}
                className="px-4 py-1.5 rounded-[4px] bg-[#313338] hover:bg-[#3F4147] text-[#DBDEE1] hover:text-white font-bold text-[11px] uppercase tracking-wider transition-colors border border-[rgba(255,255,255,0.04)] focus-visible:outline-none"
              >
                Evaluate
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => onDelete(ad.id)}
                className="p-1.5 text-[#80848E] hover:text-[#ed4245] transition-colors focus-visible:outline-none"
                title={isOwner ? "Delete your listing" : "Moderator: Delete listing"}
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
      
      {/* Top Navigation Sub-Bar */}
      <div className="flex-shrink-0 px-4 md:px-6 py-4 bg-[#2B2D31] border-b border-[rgba(0,0,0,0.22)] shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-black text-[#F2F3F5] tracking-tight">Active Listings</h2>

          {profile ? (
            <button
              type="button"
              onClick={handleCreateAdClick}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-bold uppercase tracking-wider transition-colors shadow-sm focus-visible:outline-none shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Ad</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={loginWithDiscord}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] text-[#DBDEE1] text-[12px] font-bold uppercase tracking-wider transition-colors hover:bg-[#35373C] focus-visible:outline-none shrink-0"
            >
              <Lock className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Login to Post</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-[#80848E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by item..."
              className="w-full bg-[#1E1F22] text-[#F2F3F5] text-[13px] pl-9 pr-3 py-2 rounded-[6px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2] transition-colors shadow-inner"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 sm:flex-none bg-[#1E1F22] text-[#DBDEE1] text-[12px] font-bold uppercase tracking-wider px-3 py-2 rounded-[6px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2] shadow-inner cursor-pointer"
            >
              <option value="all">All Listings</option>
              <option value="standard">Specific Trades</option>
              <option value="lf_offers">LF Offers</option>
              <option value="inventory">Vault Showcases</option>
            </select>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="flex-1 sm:flex-none bg-[#1E1F22] text-[#DBDEE1] text-[12px] font-bold uppercase tracking-wider px-3 py-2 rounded-[6px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2] shadow-inner cursor-pointer"
            >
              <option value="newest">Recently Posted</option>
              <option value="oldest">Oldest First</option>
              <option value="value-desc">Highest Value</option>
              <option value="value-asc">Lowest Value</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#80848E] gap-2">
            <span className="text-[13px] font-bold">Connecting to live market...</span>
          </div>
        ) : filteredAndSortedAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#80848E] gap-2">
            <Megaphone className="w-12 h-12 opacity-30 mb-2" />
            <span className="text-[15px] font-bold text-[#DBDEE1]">No Active Ads & Vault Showcases</span>
            <p className="text-[12px] max-w-sm text-center">
              There are currently no trading ads matching your search parameters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 mx-auto w-full">
            {filteredAndSortedAds.map((ad) => (
              <AdCard
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
  );
}