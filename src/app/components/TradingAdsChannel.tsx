import { useState, useEffect, useMemo, memo } from "react";
import { 
  Megaphone, Search, Plus, Trash2, Clock, 
  ExternalLink, Check, Lock,
  ChevronsUp, ChevronsDown, Activity, TrendingUp, TrendingDown, ArrowUpCircle, Flame, EyeOff, Calculator, Package, BookOpen
} from "lucide-react";
import { useTradingAdsStore, TradingAd } from "../../store/useTradingAdsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradeStore } from "../../store/useTradeStore";
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
  const sz = "w-2.5 h-2.5 shrink-0";
  
  if (lower === "rising") return <ChevronsUp className={sz} />;
  if (lower === "dropping") return <ChevronsDown className={sz} />;
  if (lower === "unstable") return <Activity className={sz} />;
  if (lower === "inflated") return <TrendingUp className={sz} />;
  if (lower === "deflated") return <TrendingDown className={sz} />;
  if (lower === "highballed") return <ArrowUpCircle className={sz} />;
  if (lower === "hyped") return <Flame className={sz} />;
  if (lower === "gatekept") return <Lock className={sz} />;
  if (lower === "black-marketed") return <EyeOff className={sz} />;
  if (lower === "stable") return <span className="flex items-center justify-center w-2.5 h-2.5 font-black text-[10px] leading-none shrink-0">≈</span>;
  if (lower === "varies") return <span className="flex items-center justify-center w-2.5 h-2.5 font-black text-[10px] leading-none shrink-0">↕</span>;
  if (lower === "lowballed") return <span className="flex items-center justify-center w-2.5 h-2.5 font-black text-[10px] leading-none shrink-0">↓</span>;
  return null;
}

const CompactUnitList = ({ items, ALL_UNITS, onInspectUnit }: { items: TradeCard[]; ALL_UNITS: MasterUnit[]; onInspectUnit: (id: string) => void; }) => {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => {
        const master = ALL_UNITS.find((u) => u.id === item.id);
        const proxyUrl = getProxyImage(item.id, master?.imageUrl);
        const dropCfg = master?.status ? GRID_STATUS_CFG[master.status as keyof typeof GRID_STATUS_CFG] : null;

        return (
          <button
            key={`${item.id}-${index}`}
            type="button"
            onClick={() => onInspectUnit(item.id)}
            className="w-full flex items-center justify-between gap-3 p-2.5 rounded-[6px] bg-[#1E1F22] hover:bg-[#35373C] border border-[rgba(255,255,255,0.04)] cursor-pointer transition-colors text-left group shadow-inner focus-visible:outline-none"
            title={`Inspect ${item.name}`}
          >
            <div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
              <div className="relative w-9 h-9 rounded-[5px] bg-[#111214] overflow-hidden shrink-0 shadow-sm flex items-center justify-center border border-[rgba(255,255,255,0.08)]">
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white z-0" style={getAvatarStyle(item.name)}>
                  {getInitials(item.name)}
                </span>
                {proxyUrl && (
                  <img
                    src={proxyUrl}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover z-10"
                    style={{ objectPosition: "center 15%" }}
                    onError={(e) => handleImageError(e, item.id)}
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[13px] font-bold text-[#F2F3F5] group-hover:text-white leading-tight">
                  {item.qty > 1 ? `${item.qty}x ` : ""}
                  {item.name}
                </span>

                <div className="flex items-center gap-2 mt-1 min-w-0">
                  {master?.subtitle && (
                    <span className="truncate text-[9.5px] font-bold uppercase tracking-wider text-[#949BA4]">
                      {master.subtitle}
                    </span>
                  )}

                  {dropCfg && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-[3px] border text-[8px] font-black uppercase tracking-wider shrink-0"
                      style={{ color: dropCfg.color, backgroundColor: dropCfg.bg, borderColor: dropCfg.border }}
                    >
                      <AuthenticStatusIcon status={master.status} />
                      {dropCfg.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span className="shrink-0 font-mono font-bold text-[12.5px] text-[#DBDEE1] pl-3">
              {(item.value * item.qty).toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const AdCard = memo(({ ad, currentUserId, onDelete, ALL_UNITS, onInspectUnit, onSendToCalculator }: { ad: TradingAd; currentUserId?: string; onDelete: (id: string) => void; ALL_UNITS: MasterUnit[]; onInspectUnit: (unitId: string) => void; onSendToCalculator: (give: TradeCard[], get: TradeCard[]) => void; }) => {
    const isOwner = currentUserId === ad.user_id;
    const giveVal = ad.give_items.reduce((sum, item) => sum + item.value * item.qty, 0);
    const getVal = ad.get_items.reduce((sum, item) => sum + item.value * item.qty, 0);
    const isTakingOffers = ad.ad_type === "lf_offers" || ad.get_items.length === 0;

    const discordUrl = ad.profiles?.discord_id ? `https://discord.com/users/${ad.profiles.discord_id}` : null;
    const forecast = getTradeForecast(ad.give_items, ad.get_items, ALL_UNITS);

    const getAdTypeBadge = () => {
      if (ad.ad_type === "inventory") {
        return (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#23a559]/10 text-[#23a559] border border-[#23a559]/20 flex items-center gap-1">
            <Package className="w-3 h-3" /> Trading Inventory
          </span>
        );
      }
      if (isTakingOffers) {
        return (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#FAA61A]/10 text-[#FAA61A] border border-[#FAA61A]/20 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> LF Offers
          </span>
        );
      }
      return (
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20 flex items-center gap-1">
          <Calculator className="w-3 h-3" /> Specific Trade
        </span>
      );
    };

    return (
      <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] rounded-[10px] p-5 flex flex-col justify-between transition-all shadow-lg w-full">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={ad.profiles?.avatar_url || "/units/firezio.webp"}
                alt=""
                className="w-10 h-10 rounded-full bg-[#111214] object-cover shrink-0 border border-[rgba(255,255,255,0.08)] shadow-sm"
              />

              <div className="flex flex-col min-w-0 gap-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14.5px] font-extrabold text-[#F2F3F5] truncate leading-tight">
                    {ad.profiles?.username || "Unknown Trader"}
                  </span>
                  {isOwner && (
                    <span className="shrink-0 px-1.5 py-[2px] rounded-[3px] bg-[#3B3E44] border border-[#4E525B] text-[7.5px] font-black uppercase tracking-wider text-[#B8BDC6]">
                      You
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono font-medium text-[#949BA4] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#80848E]" />
                    <span>{getTimeAgo(ad.created_at)}</span>
                  </span>
                  {getAdTypeBadge()}
                </div>
              </div>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={() => onDelete(ad.id)}
                className="p-1.5 text-[#80848E] hover:text-[#ed4245] hover:bg-[#ed4245]/10 rounded-[4px] transition-colors focus-visible:outline-none"
                title="Delete ad"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="bg-[#111214] p-3.5 rounded-[8px] border border-[rgba(255,255,255,0.03)] flex flex-col justify-between shadow-inner min-w-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10.5px] font-black uppercase tracking-widest text-[#FAA61A]">Offering</span>
                <span className="font-mono text-[12px] font-bold text-[#DBDEE1]">{giveVal.toLocaleString()}</span>
              </div>
              <CompactUnitList items={ad.give_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} />
            </div>

            <div className="bg-[#111214] p-3.5 rounded-[8px] border border-[rgba(255,255,255,0.03)] flex flex-col justify-between shadow-inner min-w-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10.5px] font-black uppercase tracking-widest text-[#5865F2]">Looking For</span>
                {!isTakingOffers && (
                  <span className="font-mono text-[12px] font-bold text-[#DBDEE1]">{getVal.toLocaleString()}</span>
                )}
              </div>
              {isTakingOffers ? (
                <div className="min-h-[110px] flex flex-col items-center justify-center p-4 rounded-[6px] bg-[#5865F2]/10 border border-dashed border-[#5865F2]/40 text-[#5865F2] text-center">
                  <span className="font-black text-[12px] uppercase tracking-wider">Taking All Offers</span>
                  <span className="text-[10px] text-[#949BA4] mt-1">No specific units requested.</span>
                </div>
              ) : (
                <CompactUnitList items={ad.get_items} ALL_UNITS={ALL_UNITS} onInspectUnit={onInspectUnit} />
              )}
            </div>
          </div>

          {!isTakingOffers && (
            <div className="bg-[#111214] p-3 rounded-[6px] border border-[rgba(255,255,255,0.03)] flex flex-wrap items-center justify-between gap-2 shadow-inner">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#80848E] uppercase tracking-wider">Raw Diff:</span>
                <span className={`text-[12px] font-mono font-bold ${getVal > giveVal ? "text-[#ed4245]" : getVal < giveVal ? "text-[#23a559]" : "text-[#DBDEE1]"}`}>
                  {getVal > giveVal ? "+" : ""}{(getVal - giveVal).toLocaleString()}
                </span>
              </div>
              {forecast.calculable && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#80848E] uppercase tracking-wider">Poster's Forecast:</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-[4px] border ${forecast.st >= 0 || forecast.lt >= 0 ? 'bg-[#23a559]/10 text-[#23a559] border-[#23a559]/30' : 'bg-[#ed4245]/10 text-[#ed4245] border-[#ed4245]/30'}`}>
                    {forecast.st >= 0 || forecast.lt >= 0 ? "WIN" : "LOSS"}
                  </span>
                </div>
              )}
            </div>
          )}

          {ad.note && (
            <p className="text-[13px] text-[#B5BAC1] bg-[#111214]/70 p-3.5 rounded-[6px] border border-[rgba(255,255,255,0.03)] leading-relaxed italic shadow-inner">
              "{ad.note}"
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-[rgba(255,255,255,0.06)]">
          <button
            type="button"
            onClick={() => onSendToCalculator(ad.give_items, ad.get_items)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-[6px] bg-[#1E1F22] hover:bg-[#35373C] text-[#DBDEE1] hover:text-white text-[12px] font-bold uppercase tracking-wider transition-colors border border-[rgba(255,255,255,0.04)] focus-visible:outline-none shadow-sm"
          >
            <Calculator className="w-4 h-4 text-[#5865F2]" />
            Evaluate Trade
          </button>

          {discordUrl ? (
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-[6px] bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-bold uppercase tracking-wider transition-colors shadow-sm focus-visible:outline-none"
            >
              DM Trader
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="flex items-center justify-center py-2.5 text-[11px] font-bold text-[#80848E] bg-[#1E1F22] rounded-[6px] border border-[rgba(255,255,255,0.02)]">
              No Discord
            </span>
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

      const isTakingOffers = ad.ad_type === "lf_offers" || ad.get_items.length === 0;
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
              <span>Create Ad</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={loginWithDiscord}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#1E1F22] hover:bg-[#35373C] text-[#DBDEE1] text-[12px] font-bold uppercase tracking-wider transition-colors border border-[rgba(255,255,255,0.04)] focus-visible:outline-none shrink-0"
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
              <option value="inventory">Trading Inventory</option>
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 max-w-6xl mx-auto w-full">
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