import { useState, useEffect, useMemo, memo } from "react";
import { 
  Megaphone, Search, Plus, Trash2, Clock, 
  ExternalLink, AlertCircle, X, Check, Lock,
  ChevronsUp, ChevronsDown, Activity, TrendingUp, TrendingDown, ArrowUpCircle, Flame, EyeOff, Calculator, Package, Minus
} from "lucide-react";
import { useTradingAdsStore, TradingAd } from "../../store/useTradingAdsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useUnits } from "../../context/UnitContext";
import { useHistoryModalStore } from "../../store/useHistoryModalStore";
import { TradeCard, MasterUnit } from "../../types";
import { getProxyImage, handleImageError, GRID_STATUS_CFG } from "../../data";
import { getAvatarStyle, getInitials } from "./TradeAnalyzer/summaryUtils";
import { triggerHaptic } from "../../data/helpers";

const TTL_OPTIONS = [
  { hours: 1, label: "1 Hour" },
  { hours: 4, label: "4 Hours" },
  { hours: 12, label: "12 Hours" },
  { hours: 24, label: "24 Hours (Max)" }
];

const PRESET_NOTES = [
  "NLF: Anything else",
  "Upgrading only",
  "Taking underpays",
  "Strictly fair trades",
  "DM on Discord to offer"
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
            className="w-full flex items-center justify-between gap-3 p-2.5 rounded-[6px] bg-[#1E1F22] hover:bg-[#35373C] border border-[rgba(255,255,255,0.04)] cursor-pointer transition-colors text-left group shadow-inner"
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

const TradeColumn = ({
  type,
  total,
  items,
  empty,
  ALL_UNITS,
  onInspectUnit
}: {
  type: "give" | "get";
  total?: number;
  items: TradeCard[];
  empty?: boolean;
  ALL_UNITS: MasterUnit[];
  onInspectUnit: (id: string) => void;
}) => {
  const give = type === "give";

  return (
    <div className="bg-[#111214] p-3.5 rounded-[8px] border border-[rgba(255,255,255,0.03)] flex flex-col justify-between shadow-inner min-w-0">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10.5px] font-black uppercase tracking-widest ${give ? "text-[#FAA61A]" : "text-[#5865F2]"}`}>
          {give ? "Offering" : "Looking For"}
        </span>
        {typeof total === "number" && (
          <span className="font-mono text-[12px] font-bold text-[#DBDEE1]">
            {total.toLocaleString()}
          </span>
        )}
      </div>

      {empty ? (
        <div className="min-h-[110px] flex flex-col items-center justify-center p-4 rounded-[6px] bg-[#5865F2]/10 border border-dashed border-[#5865F2]/40 text-[#5865F2] text-center">
          <span className="font-black text-[12px] uppercase tracking-wider">Taking All Offers</span>
          <span className="text-[10px] text-[#949BA4] mt-1">No specific units requested.</span>
        </div>
      ) : (
        <CompactUnitList
          items={items}
          ALL_UNITS={ALL_UNITS}
          onInspectUnit={onInspectUnit}
        />
      )}
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
    onSendToCalculator: (
      give: TradeCard[],
      get: TradeCard[]
    ) => void;
  }) => {
    const isOwner = currentUserId === ad.user_id;

    const giveVal = ad.give_items.reduce(
      (sum, item) => sum + item.value * item.qty,
      0
    );

    const getVal = ad.get_items.reduce(
      (sum, item) => sum + item.value * item.qty,
      0
    );

    const isTakingOffers = ad.get_items.length === 0;

    const discordUrl = ad.profiles?.discord_id
      ? `https://discord.com/users/${ad.profiles.discord_id}`
      : null;

    return (
      <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] rounded-[10px] p-5 flex flex-col justify-between transition-all shadow-lg w-full">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={
                  ad.profiles?.avatar_url ||
                  "/units/firezio.webp"
                }
                alt=""
                className="w-10 h-10 rounded-full bg-[#111214] object-cover shrink-0 border border-[rgba(255,255,255,0.08)] shadow-sm"
              />

              <div className="flex flex-col min-w-0">
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

                <span className="text-[11px] font-mono font-medium text-[#949BA4] flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-[#80848E]" />
                  <span>{getTimeAgo(ad.created_at)}</span>
                </span>
              </div>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={() => onDelete(ad.id)}
                className="p-1.5 text-[#80848E] hover:text-[#ed4245] hover:bg-[#ed4245]/10 rounded-[4px] transition-colors focus-visible:outline-none"
                title="Delete ad"
                aria-label="Delete ad"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <TradeColumn
              type="give"
              total={giveVal}
              items={ad.give_items}
              ALL_UNITS={ALL_UNITS}
              onInspectUnit={onInspectUnit}
            />

            <TradeColumn
              type="get"
              total={!isTakingOffers ? getVal : undefined}
              items={ad.get_items}
              empty={isTakingOffers}
              ALL_UNITS={ALL_UNITS}
              onInspectUnit={onInspectUnit}
            />
          </div>

          {ad.note && (
            <p className="text-[13px] text-[#B5BAC1] bg-[#111214]/70 p-3.5 rounded-[6px] border border-[rgba(255,255,255,0.03)] leading-relaxed italic shadow-inner">
              "{ad.note}"
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-[rgba(255,255,255,0.06)]">
          <button
            type="button"
            onClick={() =>
              onSendToCalculator(
                ad.give_items,
                ad.get_items
              )
            }
            className="flex items-center justify-center gap-2 py-2.5 rounded-[6px] bg-[#1E1F22] hover:bg-[#35373C] text-[#DBDEE1] hover:text-white text-[12px] font-bold uppercase tracking-wider transition-colors border border-[rgba(255,255,255,0.04)] focus-visible:outline-none shadow-sm"
          >
            <Calculator className="w-4 h-4 text-[#5865F2]" />
            Analyzer
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

const UnitSearchResult = ({
  unit,
  onSelect
}: {
  unit: MasterUnit;
  onSelect: () => void;
}) => {
  const imageUrl = getProxyImage(unit.id, unit.imageUrl);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center justify-between gap-3 p-2 hover:bg-[#2B2D31] rounded-[4px] transition-colors text-left group"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-[4px] bg-[#111214] overflow-hidden shrink-0 relative flex items-center justify-center border border-[rgba(255,255,255,0.08)]">
          <span className="text-[8px] font-bold z-0" style={getAvatarStyle(unit.name)}>
            {getInitials(unit.name)}
          </span>
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover z-10"
              onError={(e) => handleImageError(e, unit.id)}
            />
          )}
        </div>
        <span className="text-[12.5px] font-bold text-[#F2F3F5] truncate">
          {unit.name}
        </span>
      </div>

      <span className="font-mono text-[11px] font-bold text-[#DBDEE1] shrink-0 pl-2">
        {typeof unit.value === "number"
          ? unit.value.toLocaleString()
          : "N/A"}
      </span>
    </button>
  );
};

const DraftSlotList = ({
  slots,
  emptyText,
  onUpdateQty,
  onRemove,
  accent
}: {
  slots: TradeCard[];
  emptyText: string;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  accent: "give" | "get";
}) => {
  const give = accent === "give";

  if (slots.length === 0) {
    return (
      <div className="min-h-[44px] p-2.5 bg-[#111214] rounded-[6px] border border-[rgba(255,255,255,0.02)] flex items-center">
        <span className="text-[11.5px] text-[#80848E] italic px-1">
          {emptyText}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 min-h-[44px] p-2.5 bg-[#111214] rounded-[6px] border border-[rgba(255,255,255,0.02)] items-center">
      {slots.map((i) => (
        <div
          key={i.id}
          className="flex items-center gap-2 bg-[#1E1F22] px-2.5 py-1.5 rounded-[4px] border border-[rgba(255,255,255,0.06)] shadow-sm"
        >
          <span className="text-[12px] font-bold text-[#F2F3F5] truncate max-w-[130px]">
            {i.name}
          </span>

          <div className="flex items-center gap-1 bg-[#111214] px-1.5 py-0.5 rounded-[3px] border border-[rgba(255,255,255,0.04)]">
            <button
              type="button"
              onClick={() => onUpdateQty(i.id, -1)}
              className="text-[#80848E] hover:text-white p-0.5 focus-visible:outline-none"
              aria-label={`Decrease ${i.name}`}
            >
              <Minus className="w-3 h-3" />
            </button>

            <span className="font-mono text-[11px] font-bold text-[#DBDEE1] px-1">
              {i.qty}
            </span>

            <button
              type="button"
              onClick={() => onUpdateQty(i.id, 1)}
              className="text-[#80848E] hover:text-white p-0.5 focus-visible:outline-none"
              aria-label={`Increase ${i.name}`}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemove(i.id)}
            className="text-[#80848E] hover:text-[#ed4245] p-0.5 transition-colors"
            aria-label={`Remove ${i.name}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

export function TradingAdsChannel() {
  const {
    ads,
    isLoading,
    fetchAds,
    subscribeToAds,
    createAd,
    deleteAd,
    stagedGiveForAd,
    setStagedGiveForAd
  } = useTradingAdsStore();

  const { profile, loginWithDiscord } = useAuthStore();
  const { overwrite } = useTradeStore();
  const { items: inventoryItems } = useInventoryStore();
  const { units: ALL_UNITS } = useUnits();
  const openHistoryModal = useHistoryModalStore(
    (state) => state.openModal
  );

  const [searchFilter, setSearchFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [, setVaultPickerOpen] = useState(false);

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

  useEffect(() => {
    if (stagedGiveForAd.length > 0) {
      setGiveSlots(stagedGiveForAd);
      setModalOpen(true);
      setStagedGiveForAd([]);
    }
  }, [stagedGiveForAd, setStagedGiveForAd]);

  const userActiveAd = useMemo(() => {
    if (!profile) return null;
    return (
      ads.find((ad) => ad.user_id === profile.id) ||
      null
    );
  }, [ads, profile]);

  const filteredAds = useMemo(() => {
    if (!searchFilter.trim()) return ads;

    const q = searchFilter.toLowerCase().trim();

    return ads.filter((ad) => {
      const matchGive = ad.give_items.some((item) =>
        item.name.toLowerCase().includes(q)
      );

      const matchGet = ad.get_items.some((item) =>
        item.name.toLowerCase().includes(q)
      );

      const matchUser = ad.profiles?.username
        ?.toLowerCase()
        .includes(q);

      return matchGive || matchGet || matchUser;
    });
  }, [ads, searchFilter]);

  const handleSendToCalculator = (
    give: TradeCard[],
    get: TradeCard[]
  ) => {
    triggerHaptic("medium");
    overwrite(get, give);
    window.dispatchEvent(new Event("open-analyzer"));
  };

  const handleAddModalUnit = (
    target: "give" | "get",
    unit: MasterUnit
  ) => {
    const list =
      target === "give" ? giveSlots : getSlots;

    if (
      list.length >= 8 &&
      !list.some((item) => item.id === unit.id)
    ) {
      setPublishError(
        `Maximum 8 unit slots allowed for ${target.toUpperCase()}`
      );

      setTimeout(() => setPublishError(""), 3000);
      return;
    }

    const numericVal =
      typeof unit.value === "number"
        ? unit.value
        : unit.valueMin || 0;

    const existing = list.find(
      (item) => item.id === unit.id
    );

    const updated = existing
      ? list.map((item) =>
          item.id === unit.id
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      : [
          ...list,
          {
            id: unit.id,
            name: unit.name,
            subtitle: unit.subtitle,
            value: numericVal,
            qty: 1
          }
        ];

    if (target === "give") {
      setGiveSlots(updated);
      setGiveQuery("");
    } else {
      setGetSlots(updated);
      setGetQuery("");
    }
  };

  const handleUpdateQty = (
    target: "give" | "get",
    id: string,
    delta: number
  ) => {
    const list =
      target === "give" ? giveSlots : getSlots;

    const updated = list
      .map((item) => {
        if (item.id !== id) return item;

        const newQty = item.qty + delta;

        return newQty > 0
          ? { ...item, qty: newQty }
          : null;
      })
      .filter(Boolean) as TradeCard[];

    if (target === "give") {
      setGiveSlots(updated);
    } else {
      setGetSlots(updated);
    }
  };

  const handleRemoveModalUnit = (
    target: "give" | "get",
    id: string
  ) => {
    if (target === "give") {
      setGiveSlots((prev) =>
        prev.filter((item) => item.id !== id)
      );
    } else {
      setGetSlots((prev) =>
        prev.filter((item) => item.id !== id)
      );
    }
  };

  const handleImportVaultAll = () => {
    const cards: TradeCard[] = [];

    inventoryItems.forEach((inv) => {
      const master = ALL_UNITS.find(
        (unit) => unit.id === inv.unit_id
      );

      if (
        master &&
        !inv.is_pinned &&
        cards.length < 8
      ) {
        const numericVal =
          typeof master.value === "number"
            ? master.value
            : master.valueMin || 0;

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
    setVaultPickerOpen(false);
  };

  const handlePublish = async () => {
    if (!profile) return;

    if (giveSlots.length === 0) {
      setPublishError(
        "You must offer at least 1 unit."
      );

      setTimeout(() => setPublishError(""), 3000);
      return;
    }

    setIsPublishing(true);
    setPublishError("");

    try {
      await createAd({
        userId: profile.id,
        giveItems: giveSlots,
        getItems: getSlots,
        note,
        ttlHours: ttl
      });

      setModalOpen(false);
      setGiveSlots([]);
      setGetSlots([]);
      setNote("");
      setGiveQuery("");
      setGetQuery("");
    } catch (err: any) {
      setPublishError(
        err.message || "Failed to publish ad."
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const searchUnits = (q: string) => {
    if (!q.trim()) return [];

    const low = q.toLowerCase();

    return ALL_UNITS.filter(
      (unit) =>
        unit.name.toLowerCase().includes(low) ||
        (unit.subtitle &&
          unit.subtitle.toLowerCase().includes(low))
    ).slice(0, 6);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#313338] h-full select-none font-sans relative">
      <div className="flex-shrink-0 px-4 md:px-6 py-3 bg-[#2B2D31] border-b border-[rgba(0,0,0,0.22)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[6px] bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4 text-[#5865F2]" />
          </div>
          <div>
            <h2 className="text-[16px] font-black text-[#F2F3F5] tracking-tight leading-none">
              Trading Ads
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#80848E] mt-1 block">
              Live Player Market • {filteredAds.length} active listings
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#80848E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

            <input
              type="text"
              value={searchFilter}
              onChange={(e) =>
                setSearchFilter(e.target.value)
              }
              placeholder="Filter by unit or user..."
              aria-label="Search trading ads"
              className="w-full bg-[#1E1F22] text-[#F2F3F5] text-[12px] pl-8 pr-3 py-1.5 rounded-[4px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2] transition-colors"
            />
          </div>

          {profile ? (
            <button
              type="button"
              disabled={!!userActiveAd}
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#1E1F22] disabled:text-[#80848E] disabled:cursor-not-allowed text-white text-[12px] font-bold uppercase tracking-wider transition-colors shadow-sm focus-visible:outline-none shrink-0"
              title={
                userActiveAd
                  ? "You already have an active ad posted."
                  : "Post an ad"
              }
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Ad</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={loginWithDiscord}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-[#1E1F22] hover:bg-[#35373C] text-[#DBDEE1] text-[12px] font-bold uppercase tracking-wider transition-colors border border-[rgba(255,255,255,0.04)] focus-visible:outline-none shrink-0"
            >
              <Lock className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#80848E] gap-2">
            <span className="text-[13px] font-bold">
              Connecting to live market...
            </span>
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#80848E] gap-2">
            <AlertCircle className="w-10 h-10 opacity-40 mb-1" />
            <span className="text-[14px] font-bold text-[#DBDEE1]">
              No Active Ads
            </span>
            <p className="text-[12px] max-w-sm text-center">
              There are currently no trading ads matching your search parameters.
            </p>
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
                onInspectUnit={(unitId) =>
                  openHistoryModal(unitId)
                }
                onSendToCalculator={
                  handleSendToCalculator
                }
              />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
            onClick={() => setModalOpen(false)}
          />

          <div className="relative z-10 w-full max-w-2xl bg-[#2B2D31] border border-[rgba(255,255,255,0.08)] rounded-[8px] p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto custom-scrollbar animate-slide-up">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-3">
              <h3 className="text-[16px] font-black text-[#F2F3F5] uppercase tracking-wide">
                Publish Trading Ad
              </h3>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#80848E] hover:text-white focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {publishError && (
              <div className="bg-[#ed4245]/10 border border-[#ed4245]/30 p-2.5 rounded-[4px] text-[#ed4245] text-[12px] font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{publishError}</span>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FAA61A]">
                  You Are Offering ({giveSlots.length}/8 Slots)
                </span>

                <button
                  type="button"
                  onClick={handleImportVaultAll}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#1E1F22] hover:bg-[#35373C] text-[#5865F2] text-[11px] font-bold border border-[rgba(255,255,255,0.04)] transition-colors focus-visible:outline-none"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Import from Vault</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#80848E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

                <input
                  type="text"
                  value={giveQuery}
                  onChange={(e) =>
                    setGiveQuery(e.target.value)
                  }
                  placeholder="Search units to offer..."
                  className="w-full bg-[#1E1F22] text-[#F2F3F5] text-[12px] pl-9 pr-3 py-2.5 rounded-[4px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#FAA61A]"
                />

                {giveQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E1F22] border border-[rgba(255,255,255,0.08)] rounded-[6px] z-50 p-1.5 flex flex-col gap-1 shadow-2xl max-h-[220px] overflow-y-auto custom-scrollbar">
                    {searchUnits(giveQuery).length === 0 ? (
                      <div className="px-3 py-2 text-[12px] text-[#80848E]">
                        No units found.
                      </div>
                    ) : (
                      searchUnits(giveQuery).map((unit) => (
                        <UnitSearchResult
                          key={unit.id}
                          unit={unit}
                          onSelect={() =>
                            handleAddModalUnit(
                              "give",
                              unit
                            )
                          }
                        />
                      ))
                    )}
                  </div>
                )}
              </div>

              <DraftSlotList
                slots={giveSlots}
                accent="give"
                emptyText="Select at least one unit to offer"
                onUpdateQty={(id, delta) =>
                  handleUpdateQty("give", id, delta)
                }
                onRemove={(id) =>
                  handleRemoveModalUnit("give", id)
                }
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5865F2]">
                  You Want ({getSlots.length}/8 Slots)
                </span>
                <span className="text-[10px] text-[#80848E]">
                  Leave empty for Taking Offers
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#80848E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

                <input
                  type="text"
                  value={getQuery}
                  onChange={(e) =>
                    setGetQuery(e.target.value)
                  }
                  placeholder="Search units you want..."
                  className="w-full bg-[#1E1F22] text-[#F2F3F5] text-[12px] pl-9 pr-3 py-2.5 rounded-[4px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2]"
                />

                {getQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E1F22] border border-[rgba(255,255,255,0.08)] rounded-[6px] z-50 p-1.5 flex flex-col gap-1 shadow-2xl max-h-[220px] overflow-y-auto custom-scrollbar">
                    {searchUnits(getQuery).length === 0 ? (
                      <div className="px-3 py-2 text-[12px] text-[#80848E]">
                        No units found.
                      </div>
                    ) : (
                      searchUnits(getQuery).map((unit) => (
                        <UnitSearchResult
                          key={unit.id}
                          unit={unit}
                          onSelect={() =>
                            handleAddModalUnit(
                              "get",
                              unit
                            )
                          }
                        />
                      ))
                    )}
                  </div>
                )}
              </div>

              <DraftSlotList
                slots={getSlots}
                accent="get"
                emptyText="Taking all offers"
                onUpdateQty={(id, delta) =>
                  handleUpdateQty("get", id, delta)
                }
                onRemove={(id) =>
                  handleRemoveModalUnit("get", id)
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#949BA4]">
                Trader Note (150 chars max)
              </span>

              <div className="flex flex-wrap gap-1.5">
                {PRESET_NOTES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNote(preset)}
                    className="text-[11px] font-medium bg-[#1E1F22] hover:bg-[#35373C] text-[#DBDEE1] px-2.5 py-1 rounded-[4px] border border-[rgba(255,255,255,0.04)] transition-colors focus-visible:outline-none"
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
                placeholder="Type custom note or select a preset above..."
                className="bg-[#1E1F22] text-[#F2F3F5] text-[12px] px-3 py-2.5 rounded-[4px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#949BA4]">
                Duration (TTL)
              </span>

              <select
                value={ttl}
                onChange={(e) => setTtl(Number(e.target.value))}
                className="bg-[#1E1F22] text-[#F2F3F5] text-[12px] px-3 py-2.5 rounded-[4px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2]"
              >
                {TTL_OPTIONS.map((o) => (
                  <option key={o.hours} value={o.hours}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(255,255,255,0.04)]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-[12px] font-bold text-[#DBDEE1] hover:bg-[#1E1F22] rounded-[4px] focus-visible:outline-none"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPublishing || giveSlots.length === 0}
                onClick={handlePublish}
                className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#1E1F22] disabled:text-[#80848E] text-white text-[12px] font-bold uppercase tracking-wider rounded-[4px] transition-colors shadow-sm flex items-center gap-1.5 focus-visible:outline-none"
              >
                {isPublishing ? (
                  "Publishing..."
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Publish Ad</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}