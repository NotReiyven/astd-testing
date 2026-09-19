import { useState, useEffect, useMemo, memo } from "react";
import { 
  Megaphone, Search, Plus, Trash2, Clock, 
  ExternalLink, Check, Lock, X, ArrowDownCircle,
  ChevronsUp, ChevronsDown, Activity, TrendingUp, TrendingDown, ArrowUpCircle, Flame, EyeOff, Calculator, Package, BookOpen, UserCircle2, ArrowRight
} from "lucide-react";
import { useTradingAdsStore, TradingAd } from "../../store/useTradingAdsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useUnits } from "../../context/UnitContext";
import { useHistoryModalStore } from "../../store/useHistoryModalStore";
import { TradeCard, MasterUnit } from "../../types";
import { getProxyImage, handleImageError, GRID_STATUS_CFG } from "../../data";
import { getAvatarStyle, getInitials, getTradeForecast } from "./TradeAnalyzer/summaryUtils";
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

function AuthenticStatusIcon({ status }: { status?: string | null }) {
  if (!status) return null;
  const lower = status.toLowerCase();
  const sz = "w-3 h-3 shrink-0";
  
  if (lower === "rising") return <ChevronsUp className={sz} />;
  if (lower === "dropping") return <ChevronsDown className={sz} />;
  if (lower === "unstable") return <Activity className={sz} />;
  if (lower === "inflated") return <TrendingUp className={sz} />;
  if (lower === "deflated") return <TrendingDown className={sz} />;
  if (lower === "highballed") return <ArrowUpCircle className={sz} />;
  if (lower === "hyped") return <Flame className={sz} />;
  if (lower === "gatekept") return <Lock className={sz} />;
  if (lower === "black-marketed") return <EyeOff className={sz} />;
  if (lower === "stable") return <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">≈</span>;
  if (lower === "varies") return <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">↕</span>;
  if (lower === "lowballed") return <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">↓</span>;
  return null;
}

const MinimalUnitList = ({ items, ALL_UNITS, onInspectUnit }: { items: TradeCard[]; ALL_UNITS: MasterUnit[]; onInspectUnit: (id: string) => void; }) => {
  return (
    <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
      {items.map((item, index) => {
        const master = ALL_UNITS.find((u) => u.id === item.id);
        const proxyUrl = getProxyImage(item.id, master?.imageUrl);
        const dropCfg = master?.status ? GRID_STATUS_CFG[master.status as keyof typeof GRID_STATUS_CFG] : null;

        return (
          <div
            key={`${item.id}-${index}`}
            onClick={() => onInspectUnit(item.id)}
            className="group flex items-center justify-between gap-3 p-2 rounded-[6px] bg-[#161719] hover:bg-[#1E1F22] cursor-pointer transition-colors border border-[rgba(255,255,255,0.02)]"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-8 h-8 rounded-[4px] bg-[#111214] overflow-hidden shrink-0 border border-[rgba(255,255,255,0.06)] shadow-sm">
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white z-0" style={getAvatarStyle(item.name)}>
                  {getInitials(item.name)}
                </span>
                {proxyUrl && (
                  <img src={proxyUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover z-10" style={{ objectPosition: "center 15%" }} onError={(e) => handleImageError(e, item.id)} />
                )}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.qty > 1 && <span className="text-[10px] font-bold text-[#80848E] bg-[#111214] px-1.5 py-0.5 rounded-[3px] border border-[rgba(255,255,255,0.04)]">x{item.qty}</span>}
                  <span className="text-[13px] font-bold text-[#DBDEE1] group-hover:text-[#F2F3F5] transition-colors">{item.name}</span>
                  {dropCfg && (
                    <span className="shrink-0" style={{ color: dropCfg.color }} title={dropCfg.label}>
                      <AuthenticStatusIcon status={master.status} />
                    </span>
                  )}
                </div>
                {master?.subtitle && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#80848E] truncate">
                    {master.subtitle}
                  </span>
                )}
              </div>
            </div>

            <span className="shrink-0 font-mono font-bold text-[12.5px] text-[#DBDEE1]">
              {(item.value * item.qty).toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const VaultGridItem = ({ item, master, onClick }: { item: TradeCard; master?: MasterUnit; onClick: () => void; }) => {
  const proxyUrl = getProxyImage(item.id, master?.imageUrl);
  return (
    <div
      onClick={onClick}
      className="relative w-[44px] h-[44px] rounded-[6px] bg-[#111214] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.2)] cursor-pointer transition-all shadow-sm group shrink-0"
      title={`${item.qty > 1 ? `${item.qty}x ` : ''}${item.name} • ${(item.value * item.qty).toLocaleString()}`}
    >
      <div className="absolute inset-0 rounded-[5px] overflow-hidden">
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white z-0" style={getAvatarStyle(item.name)}>
          {getInitials(item.name)}
        </span>
        {proxyUrl && <img src={proxyUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => handleImageError(e, item.id)} />}
      </div>
      {item.qty > 1 && (
        <div className="absolute -top-1.5 -right-1.5 bg-[#2B2D31] text-[#DBDEE1] text-[9px] font-black px-1.5 py-0.5 rounded-full z-20 border border-[rgba(255,255,255,0.1)] shadow-sm">
          x{item.qty}
        </div>
      )}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex items-center justify-center rounded-[5px]">
        <Search className="w-4 h-4 text-white" />
      </div>
    </div>
  );
};

const AdCard = memo(({ ad, currentUserId, onDelete, ALL_UNITS, onInspectUnit, onSendToCalculator }: { ad: TradingAd; currentUserId?: string; onDelete: (id: string) => void; ALL_UNITS: MasterUnit[]; onInspectUnit: (unitId: string) => void; onSendToCalculator: (give: TradeCard[], get: TradeCard[]) => void; }) => {
    const isOwner = currentUserId === ad.user_id;
    const giveVal = ad.give_items.reduce((sum, item) => sum + item.value * item.qty, 0);
    const getVal = ad.get_items.reduce((sum, item) => sum + item.value * item.qty, 0);
    
    const isTakingOffers = ad.ad_type === "lf_offers" || (ad.ad_type === "standard" && ad.get_items.length === 0);
    const isInventory = ad.ad_type === "inventory";

    const discordUrl = ad.profiles?.discord_id ? `https://discord.com/users/${ad.profiles.discord_id}` : null;
    
    // Viewer's POV: Viewer receives ad.give_items (Vault value received) and gives ad.get_items (Vault value given)
    const viewerDiff = giveVal - getVal;
    const forecast = getTradeForecast(ad.get_items, ad.give_items, ALL_UNITS);
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
            <Package className="w-3 h-3 text-[#949BA4]" /> Vault Showcase
          </span>
        );
      }
      if (isTakingOffers) {
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[rgba(250,166,26,0.1)] text-[#FAA61A] border border-[rgba(250,166,26,0.2)] flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" /> LF Offers
          </span>
        );
      }
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[rgba(88,101,242,0.1)] text-[#5865F2] border border-[rgba(88,101,242,0.2)] flex items-center gap-1.5">
          <Calculator className="w-3 h-3" /> Specific Trade
        </span>
      );
    };

    return (
      <div className="bg-[#2B2D31] rounded-[8px] flex flex-col transition-all shadow-sm border border-[rgba(255,255,255,0.04)] overflow-hidden hover:border-[rgba(255,255,255,0.08)]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#1E1F22] border-b border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={ad.profiles?.avatar_url || "/units/firezio.webp"}
              alt="Avatar"
              className="w-10 h-10 rounded-full bg-[#111214] object-cover shrink-0 border border-[rgba(255,255,255,0.04)]"
            />
            <div className="flex flex-col min-w-0 gap-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[14.5px] font-bold text-[#F2F3F5] truncate">
                  {ad.profiles?.username || "Unknown Trader"}
                </span>
                {isOwner && (
                  <span className="shrink-0 px-1.5 py-[2px] rounded-[3px] bg-[#3B3E44] text-[9px] font-bold uppercase tracking-wider text-[#DBDEE1]">
                    You
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-[#949BA4] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {getTimeAgo(ad.created_at)}
                </span>
                <span className="text-[#4E5058] text-[10px]">•</span>
                {getAdTypeBadge()}
              </div>
            </div>
          </div>

          {isOwner && (
            <button
              onClick={() => onDelete(ad.id)}
              className="p-2 text-[#80848E] hover:text-[#ed4245] hover:bg-[#ed4245]/10 rounded-[6px] transition-colors focus-visible:outline-none"
              title="Delete listing"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4 flex-1">
          {ad.note && (
            <div className="px-3.5 py-2.5 bg-[#1E1F22] border-l-2 border-[#5865F2] rounded-r-[6px] text-[12.5px] text-[#DBDEE1] italic leading-relaxed shadow-inner">
              "{ad.note}"
            </div>
          )}

          {isInventory ? (
            /* Inventory Layout */
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">Vault Preview</span>
                <span className="font-mono text-[12px] font-bold text-[#DBDEE1]">{giveVal.toLocaleString()} Value</span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1 bg-[#1E1F22] p-2.5 rounded-[6px] border border-[rgba(255,255,255,0.03)] shadow-inner">
                {ad.give_items.map(item => (
                  <VaultGridItem 
                    key={item.id} 
                    item={item} 
                    master={ALL_UNITS.find(u => u.id === item.id)} 
                    onClick={handleInspectVault} 
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Standard / LF Offers Vertical Stack Layout */
            <div className="flex flex-col gap-3">
              
              <div className="flex flex-col gap-2 bg-[#1E1F22] p-3 rounded-[6px] border border-[rgba(255,255,255,0.03)] shadow-inner">
                <div className="flex items-center justify-between pb-1.5 border-b border-[rgba(255,255,255,0.04)]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#FAA61A]">Offering</span>
                  <span className="font-mono text-[11px] font-bold text-[#DBDEE1]">{giveVal.toLocaleString()}</span>
                </div>
                <MinimalUnitList items={ad.give_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} />
              </div>

              <div className="flex flex-col gap-2 bg-[#1E1F22] p-3 rounded-[6px] border border-[rgba(255,255,255,0.03)] shadow-inner">
                <div className="flex items-center justify-between pb-1.5 border-b border-[rgba(255,255,255,0.04)]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#5865F2]">Looking For</span>
                  {!isTakingOffers && <span className="font-mono text-[11px] font-bold text-[#DBDEE1]">{getVal.toLocaleString()}</span>}
                </div>
                {isTakingOffers ? (
                  <div className="flex items-center justify-center py-6 border border-dashed border-[rgba(250,166,26,0.3)] rounded-[6px] bg-[rgba(250,166,26,0.03)] text-[#FAA61A]">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Taking All Offers</span>
                  </div>
                ) : (
                  <MinimalUnitList items={ad.get_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} />
                )}
              </div>
            </div>
          )}

          {/* Trade Math Footer (Viewer's POV) */}
          {!isTakingOffers && !isInventory && (
            <div className="mt-auto pt-3 border-t border-[rgba(255,255,255,0.04)] flex flex-wrap items-center justify-between gap-3 bg-[#111214] p-2.5 rounded-[6px] shadow-inner">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#80848E] uppercase tracking-wider">Raw Diff:</span>
                <span className={`text-[12px] font-mono font-bold ${viewerDiff > 0 ? "text-[#23a559]" : viewerDiff < 0 ? "text-[#ed4245]" : "text-[#DBDEE1]"}`}>
                  {viewerDiff > 0 ? "+" : ""}{viewerDiff.toLocaleString()}
                </span>
              </div>
              {forecast.calculable && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#80848E] uppercase tracking-wider">Metrics:</span>
                  <span className="text-[10.5px] font-mono font-bold text-[#DBDEE1] bg-[#1E1F22] px-2 py-0.5 rounded-[4px] border border-[rgba(255,255,255,0.04)]">
                    ST: {forecast.st > 0 ? '+' : ''}{forecast.st.toFixed(1)} | LT: {forecast.lt > 0 ? '+' : ''}{forecast.lt.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-px bg-[rgba(255,255,255,0.04)] border-t border-[rgba(255,255,255,0.04)]">
          {isInventory ? (
            <button
              onClick={handleInspectVault}
              className="flex items-center justify-center gap-2 py-3 bg-[#1E1F22] hover:bg-[#35373C] text-[#DBDEE1] hover:text-white text-[11.5px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none"
            >
              <Package className="w-3.5 h-3.5 text-[#5865F2]" />
              Inspect Vault
            </button>
          ) : (
            <button
              onClick={() => onSendToCalculator(ad.give_items, ad.get_items)}
              className="flex items-center justify-center gap-2 py-3 bg-[#1E1F22] hover:bg-[#35373C] text-[#DBDEE1] hover:text-white text-[11.5px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none"
            >
              <Calculator className="w-3.5 h-3.5 text-[#5865F2]" />
              Evaluate Trade
            </button>
          )}

          {discordUrl ? (
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-[11.5px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none shadow-sm"
            >
              <UserCircle2 className="w-3.5 h-3.5" />
              DM Trader
            </a>
          ) : (
            <div className="flex items-center justify-center py-3 bg-[#1E1F22] text-[#80848E] text-[11.5px] font-bold uppercase tracking-wider cursor-not-allowed">
              No Discord
            </div>
          )}
        </div>
      </div>
    );
  }
);

export function TradingAdsChannel() {
  const { ads, isLoading, fetchAds, subscribeToAds, deleteAd } = useTradingAdsStore();
  const { profile, loginWithDiscord } = useAuthStore();
  const { overwrite } = useTradeStore();
  const { units: ALL_UNITS } = useUnits();
  const openHistoryModal = useHistoryModalStore((state) => state.openModal);

  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchAds();
    const unsubscribe = subscribeToAds();
    return () => unsubscribe();
  }, [fetchAds, subscribeToAds]);

  const filteredAds = useMemo(() => {
    return ads.filter((ad) => {
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
  }, [ads, searchFilter, typeFilter]);

  const handleSendToCalculator = (give: TradeCard[], get: TradeCard[]) => {
    triggerHaptic("medium");
    overwrite(get, give);
    window.dispatchEvent(new Event("open-analyzer"));
  };

  const handleCreateAdClick = () => {
    useTradeStore.getState().setComposerOpen(true, "standard");
    window.dispatchEvent(new Event("open-analyzer"));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#313338] h-full select-none font-sans relative">
      <div className="flex-shrink-0 px-4 md:px-6 py-4 bg-[#2B2D31] border-b border-[rgba(0,0,0,0.22)] shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-[#5865F2]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#80848E] block mb-0.5">Live Player Market</span>
              <h2 className="text-[17px] font-black text-[#F2F3F5] tracking-tight leading-none">Trading Ads</h2>
            </div>
          </div>

          {profile ? (
            <button
              type="button"
              onClick={handleCreateAdClick}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-bold uppercase tracking-wider transition-colors shadow-sm focus-visible:outline-none shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Ad</span>
              <span className="sm:hidden">Post</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={loginWithDiscord}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] text-[#DBDEE1] text-[12px] font-bold uppercase tracking-wider transition-colors hover:bg-[#35373C] focus-visible:outline-none shrink-0"
            >
              <Lock className="w-3.5 h-3.5 text-[#5865F2]" />
              <span className="hidden sm:inline">Login to Post</span>
              <span className="sm:hidden">Login</span>
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
              placeholder="Search units or traders..."
              className="w-full bg-[#1E1F22] text-[#F2F3F5] text-[13px] pl-9 pr-3 py-2 rounded-[6px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2] transition-colors shadow-inner"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#1E1F22] text-[#DBDEE1] text-[12px] font-bold uppercase tracking-wider px-3 py-2 rounded-[6px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2] shadow-inner cursor-pointer"
            >
              <option value="all">All Listings</option>
              <option value="standard">Specific Trades</option>
              <option value="lf_offers">LF Offers</option>
              <option value="inventory">Vault Showcases</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#80848E] gap-2">
            <span className="text-[13px] font-bold">Connecting to live market...</span>
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#80848E] gap-2">
            <Megaphone className="w-12 h-12 opacity-30 mb-2" />
            <span className="text-[15px] font-bold text-[#DBDEE1]">No Active Ads</span>
            <p className="text-[12px] max-w-sm text-center">
              There are currently no trading ads matching your search parameters.
            </p>
            {profile && (
              <button
                type="button"
                onClick={handleCreateAdClick}
                className="mt-4 px-5 py-2 rounded-[4px] bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                Post an Ad
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 mx-auto w-full">
            {filteredAds.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                currentUserId={profile?.id}
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