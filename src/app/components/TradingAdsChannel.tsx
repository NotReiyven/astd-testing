import { useState, useEffect, useMemo, memo } from "react";
import { 
  Megaphone, Search, Plus, Trash2, Clock, 
  ExternalLink, AlertCircle, X, Check, Lock,
  ChevronsUp, ChevronsDown, Activity, TrendingUp, TrendingDown, ArrowUpCircle, Flame, EyeOff, Calculator, Package, Minus, BookOpen
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

const TTL_OPTIONS = [
  { hours: 1, label: "1 Hour (Quick Flip)" },
  { hours: 4, label: "4 Hours (Standard)" },
  { hours: 12, label: "12 Hours (Overnight)" },
  { hours: 24, label: "24 Hours (Max)" }
];

const PRESET_NOTES = [
  "Upgrading only",
  "Downgrading only",
  "Taking underpays",
  "Strictly fair trades",
  "DM on Discord to offer",
  "NLF: Low demand units"
];

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

const CompactUnitList = ({
  items,
  ALL_UNITS,
  onInspectUnit
}: {
  items: TradeCard[];
  ALL_UNITS: MasterUnit[];
  onInspectUnit: (id: string) => void;
}) => {
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
                      style={{
                        color: dropCfg.color,
                        backgroundColor: dropCfg.bg,
                        borderColor: dropCfg.border
                      }}
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

const AdCard = memo(
  ({
    ad,
    currentUserId,
    onDelete,
    ALL_UNITS,
    onInspectUnit,
    onSendToCalculator
  }: {
    ad: TradingAd;
    currentUserId?: string;
    onDelete: (id: string) => void;
    ALL_UNITS: MasterUnit[];
    onInspectUnit: (unitId: string) => void;
    onSendToCalculator: (give: TradeCard[], get: TradeCard[]) => void;
  }) => {
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
  const {
    ads,
    isLoading,
    fetchAds,
    subscribeToAds,
    createAd,
    deleteAd,
    stagedGiveForAd,
    stagedGetForAd,
    setStagedGiveForAd,
    setStagedGetForAd
  } = useTradingAdsStore();

  const { profile, loginWithDiscord } = useAuthStore();
  const { overwrite } = useTradeStore();
  const { items: inventoryItems } = useInventoryStore();
  const { units: ALL_UNITS } = useUnits();
  const openHistoryModal = useHistoryModalStore((state) => state.openModal);

  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const [adType, setAdType] = useState<"standard" | "lf_offers" | "inventory">("standard");
  const [giveSlots, setGiveSlots] = useState<TradeCard[]>([]);
  const [getSlots, setGetSlots] = useState<TradeCard[]>([]);
  const [note, setNote] = useState("");
  const [ttl, setTtl] = useState(12);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  const [giveQuery, setGiveQuery] = useState("");
  const [getQuery, setGetQuery] = useState("");

  useEffect(() => {
    fetchAds();
    const unsubscribe = subscribeToAds();
    return () => unsubscribe();
  }, [fetchAds, subscribeToAds]);

  // Handle incoming staged trades from TradeAnalyzer or Inventory
  useEffect(() => {
    if (stagedGiveForAd.length > 0 || stagedGetForAd.length > 0) {
      setGiveSlots(stagedGiveForAd);
      setGetSlots(stagedGetForAd);
      setAdType(stagedGetForAd.length === 0 && stagedGiveForAd.length > 0 ? "lf_offers" : "standard");
      setModalOpen(true);
      setStagedGiveForAd([]);
      setStagedGetForAd([]);
    }
  }, [stagedGiveForAd, stagedGetForAd, setStagedGiveForAd, setStagedGetForAd]);

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
    // Perspective mapping: What the poster gives is what I get; what the poster wants is what I give.
    overwrite(get, give);
    window.dispatchEvent(new Event("open-analyzer"));
  };

  const handleAddModalUnit = (target: "give" | "get", unit: MasterUnit) => {
    const list = target === "give" ? giveSlots : getSlots;

    if (list.length >= 8 && !list.some((item) => item.id === unit.id)) {
      setPublishError(`Maximum 8 unit slots allowed for ${target.toUpperCase()}`);
      setTimeout(() => setPublishError(""), 3000);
      return;
    }

    const numericVal = typeof unit.value === "number" ? unit.value : unit.valueMin || 0;
    const existing = list.find((item) => item.id === unit.id);

    const updated = existing
      ? list.map((item) => item.id === unit.id ? { ...item, qty: item.qty + 1 } : item)
      : [...list, { id: unit.id, name: unit.name, subtitle: unit.subtitle, value: numericVal, qty: 1 }];

    if (target === "give") {
      setGiveSlots(updated);
      setGiveQuery("");
    } else {
      setGetSlots(updated);
      setGetQuery("");
    }
  };

  const handleUpdateQty = (target: "give" | "get", id: string, delta: number) => {
    const list = target === "give" ? giveSlots : getSlots;
    const updated = list.map((item) => {
      if (item.id !== id) return item;
      const newQty = item.qty + delta;
      return newQty > 0 ? { ...item, qty: newQty } : null;
    }).filter(Boolean) as TradeCard[];

    if (target === "give") setGiveSlots(updated);
    else setGetSlots(updated);
  };

  const handleRemoveModalUnit = (target: "give" | "get", id: string) => {
    if (target === "give") setGiveSlots((prev) => prev.filter((item) => item.id !== id));
    else setGetSlots((prev) => prev.filter((item) => item.id !== id));
  };

  const handleImportInventory = () => {
    const cards: TradeCard[] = [];
    inventoryItems.forEach((inv) => {
      const master = ALL_UNITS.find((unit) => unit.id === inv.unit_id);
      if (master && !inv.is_pinned && cards.length < 8) {
        const numericVal = typeof master.value === "number" ? master.value : master.valueMin || 0;
        cards.push({
          id: master.id,
          name: master.name,
          subtitle: master.subtitle,
          value: numericVal,
          qty: inv.quantity
        });
      }
    });
    setGiveSlots(cards);
  };

  const handlePublish = async () => {
    if (!profile) return;

    if (giveSlots.length === 0) {
      setPublishError("You must offer at least 1 unit.");
      setTimeout(() => setPublishError(""), 3000);
      return;
    }

    if (adType === "standard" && getSlots.length === 0) {
      setPublishError("Specific trades require requested units. Switch to 'LF Offers' if you want open offers.");
      setTimeout(() => setPublishError(""), 4000);
      return;
    }

    setIsPublishing(true);
    setPublishError("");

    try {
      await createAd({
        userId: profile.id,
        giveItems: giveSlots,
        getItems: adType === "lf_offers" ? [] : getSlots,
        note,
        ttlHours: ttl,
        adType
      });

      setModalOpen(false);
      setGiveSlots([]);
      setGetSlots([]);
      setNote("");
      setGiveQuery("");
      setGetQuery("");
    } catch (err: any) {
      setPublishError(err.message || "Failed to publish ad.");
    } finally {
      setIsPublishing(false);
    }
  };

  const searchUnits = (q: string) => {
    if (!q.trim()) return [];
    const low = q.toLowerCase();
    return ALL_UNITS.filter((unit) =>
      unit.name.toLowerCase().includes(low) || (unit.subtitle && unit.subtitle.toLowerCase().includes(low))
    ).slice(0, 6);
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
              onClick={() => setModalOpen(true)}
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
                onClick={() => setModalOpen(true)}
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

      {modalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade-in" onClick={() => setModalOpen(false)} />

          <div className="relative z-10 w-full max-w-2xl bg-[#2B2D31] border border-[rgba(255,255,255,0.08)] rounded-[8px] p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto custom-scrollbar animate-slide-up">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-3">
              <h3 className="text-[16px] font-black text-[#F2F3F5] uppercase tracking-wide">
                Publish Trading Ad
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[#80848E] hover:text-white focus-visible:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            {publishError && (
              <div className="bg-[#ed4245]/10 border border-[#ed4245]/30 p-2.5 rounded-[4px] text-[#ed4245] text-[12px] font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{publishError}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#949BA4]">Ad Type</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdType("standard")}
                  className={`p-2.5 rounded-[4px] border text-center font-bold text-[12px] transition-all ${adType === "standard" ? "bg-[#5865F2]/10 border-[#5865F2] text-[#5865F2]" : "bg-[#1E1F22] border-[rgba(255,255,255,0.04)] text-[#80848E]"}`}
                >
                  Specific Trade
                </button>
                <button
                  type="button"
                  onClick={() => setAdType("lf_offers")}
                  className={`p-2.5 rounded-[4px] border text-center font-bold text-[12px] transition-all ${adType === "lf_offers" ? "bg-[#FAA61A]/10 border-[#FAA61A] text-[#FAA61A]" : "bg-[#1E1F22] border-[rgba(255,255,255,0.04)] text-[#80848E]"}`}
                >
                  LF Offers
                </button>
                <button
                  type="button"
                  onClick={() => { setAdType("inventory"); handleImportInventory(); }}
                  className={`p-2.5 rounded-[4px] border text-center font-bold text-[12px] transition-all ${adType === "inventory" ? "bg-[#23a559]/10 border-[#23a559] text-[#23a559]" : "bg-[#1E1F22] border-[rgba(255,255,255,0.04)] text-[#80848E]"}`}
                >
                  Trade Inventory
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FAA61A]">
                  You Are Offering ({giveSlots.length}/8 Slots)
                </span>
                <button
                  type="button"
                  onClick={handleImportInventory}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#1E1F22] hover:bg-[#35373C] text-[#5865F2] text-[11px] font-bold border border-[rgba(255,255,255,0.04)] transition-colors"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Import Unpinned Inventory</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#80848E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={giveQuery}
                  onChange={(e) => setGiveQuery(e.target.value)}
                  placeholder="Search units to offer..."
                  className="w-full bg-[#1E1F22] text-[#F2F3F5] text-[12px] pl-9 pr-3 py-2 rounded-[4px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#FAA61A]"
                />
                {giveQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E1F22] border border-[rgba(255,255,255,0.08)] rounded-[6px] z-50 p-1.5 flex flex-col gap-1 shadow-2xl max-h-[220px] overflow-y-auto custom-scrollbar">
                    {searchUnits(giveQuery).map((unit) => (
                      <button
                        key={unit.id}
                        type="button"
                        onClick={() => handleAddModalUnit("give", unit)}
                        className="w-full flex items-center justify-between gap-3 p-2 hover:bg-[#2B2D31] rounded-[4px] text-left"
                      >
                        <span className="text-[12.5px] font-bold text-[#F2F3F5]">{unit.name}</span>
                        <span className="font-mono text-[11px] font-bold text-[#DBDEE1]">{(unit.value as number).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 min-h-[44px] p-2.5 bg-[#111214] rounded-[6px] border border-[rgba(255,255,255,0.02)] items-center">
                {giveSlots.length === 0 ? (
                  <span className="text-[11.5px] text-[#80848E] italic px-1">Select at least one unit to offer</span>
                ) : (
                  giveSlots.map((i) => (
                    <div key={i.id} className="flex items-center gap-2 bg-[#1E1F22] px-2.5 py-1.5 rounded-[4px] border border-[rgba(255,255,255,0.06)]">
                      <span className="text-[12px] font-bold text-[#F2F3F5] truncate max-w-[130px]">{i.name}</span>
                      <div className="flex items-center gap-1 bg-[#111214] px-1.5 py-0.5 rounded-[3px]">
                        <button type="button" onClick={() => handleUpdateQty("give", i.id, -1)} className="text-[#80848E] hover:text-white"><Minus className="w-3 h-3" /></button>
                        <span className="font-mono text-[11px] font-bold text-[#DBDEE1] px-1">{i.qty}</span>
                        <button type="button" onClick={() => handleUpdateQty("give", i.id, 1)} className="text-[#80848E] hover:text-white"><Plus className="w-3 h-3" /></button>
                      </div>
                      <button type="button" onClick={() => handleRemoveModalUnit("give", i.id)} className="text-[#80848E] hover:text-[#ed4245]"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {adType === "standard" ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5865F2]">
                  You Want ({getSlots.length}/8 Slots)
                </span>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#80848E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={getQuery}
                    onChange={(e) => setGetQuery(e.target.value)}
                    placeholder="Search units you want..."
                    className="w-full bg-[#1E1F22] text-[#F2F3F5] text-[12px] pl-9 pr-3 py-2 rounded-[4px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2]"
                  />
                  {getQuery && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E1F22] border border-[rgba(255,255,255,0.08)] rounded-[6px] z-50 p-1.5 flex flex-col gap-1 shadow-2xl max-h-[220px] overflow-y-auto custom-scrollbar">
                      {searchUnits(getQuery).map((unit) => (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => handleAddModalUnit("get", unit)}
                          className="w-full flex items-center justify-between gap-3 p-2 hover:bg-[#2B2D31] rounded-[4px] text-left"
                        >
                          <span className="text-[12.5px] font-bold text-[#F2F3F5]">{unit.name}</span>
                          <span className="font-mono text-[11px] font-bold text-[#DBDEE1]">{(unit.value as number).toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 min-h-[44px] p-2.5 bg-[#111214] rounded-[6px] border border-[rgba(255,255,255,0.02)] items-center">
                  {getSlots.length === 0 ? (
                    <span className="text-[11.5px] text-[#80848E] italic px-1">Select requested units</span>
                  ) : (
                    getSlots.map((i) => (
                      <div key={i.id} className="flex items-center gap-2 bg-[#1E1F22] px-2.5 py-1.5 rounded-[4px] border border-[rgba(255,255,255,0.06)]">
                        <span className="text-[12px] font-bold text-[#F2F3F5] truncate max-w-[130px]">{i.name}</span>
                        <div className="flex items-center gap-1 bg-[#111214] px-1.5 py-0.5 rounded-[3px]">
                          <button type="button" onClick={() => handleUpdateQty("get", i.id, -1)} className="text-[#80848E] hover:text-white"><Minus className="w-3 h-3" /></button>
                          <span className="font-mono text-[11px] font-bold text-[#DBDEE1] px-1">{i.qty}</span>
                          <button type="button" onClick={() => handleUpdateQty("get", i.id, 1)} className="text-[#80848E] hover:text-white"><Plus className="w-3 h-3" /></button>
                        </div>
                        <button type="button" onClick={() => handleRemoveModalUnit("get", i.id)} className="text-[#80848E] hover:text-[#ed4245]"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#111214] p-3 rounded-[6px] border border-[rgba(255,255,255,0.04)] text-[12px] text-[#FAA61A] flex items-center gap-2">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Requested items disabled: your listing will show that you are taking all offers.</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#949BA4]">Trader Note</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_NOTES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNote(preset)}
                    className="text-[11px] font-medium bg-[#1E1F22] hover:bg-[#35373C] text-[#DBDEE1] px-2.5 py-1 rounded-[4px] border border-[rgba(255,255,255,0.04)]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                maxLength={150}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Custom message..."
                className="bg-[#1E1F22] text-[#F2F3F5] text-[12px] px-3 py-2 rounded-[4px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#949BA4]">Duration</span>
              <select
                value={ttl}
                onChange={(e) => setTtl(Number(e.target.value))}
                className="bg-[#1E1F22] text-[#F2F3F5] text-[12px] px-3 py-2 rounded-[4px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2]"
              >
                {TTL_OPTIONS.map((o) => (
                  <option key={o.hours} value={o.hours}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(255,255,255,0.04)]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-[12px] font-bold text-[#DBDEE1] hover:bg-[#1E1F22] rounded-[4px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPublishing || giveSlots.length === 0}
                onClick={handlePublish}
                className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#1E1F22] disabled:text-[#80848E] text-white text-[12px] font-bold uppercase tracking-wider rounded-[4px] transition-colors shadow-sm flex items-center gap-1.5"
              >
                {isPublishing ? "Publishing..." : <><Check className="w-3.5 h-3.5" /><span>Publish Ad</span></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}