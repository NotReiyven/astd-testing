import { useState, useMemo, useRef, useCallback, memo, useEffect } from "react";
import { 
  Package, Search, Trash2, Pin, Plus, Minus, ArrowUpDown, 
  Settings2, AlertTriangle, X, Wand2, UploadCloud, 
  Check, ChevronDown, Copy, ArrowUpCircle, ArrowDownCircle, 
  Star, MousePointerSquareDashed, Scale, Lock as LockIcon,
  TrendingUp, TrendingDown, Flame, EyeOff, ChevronsUp, ChevronsDown, Activity, Heart,
  Info, ArrowLeft
} from "lucide-react";
import { useInventoryStore, InventoryItem } from "../../store/useInventoryStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useUnits } from "../../context/UnitContext";
import { getProxyImage, handleImageError, TIER_CONFIG, getTier, FILTERS, GRID_STATUS_CFG } from "../../data";
import { getAvatarStyle, getInitials } from "./TradeAnalyzer/summaryUtils";
import { QuantitySelector } from "./ui/QuantitySelector";
import { CustomDropdown, useClickOutside } from "./MainCanvas/CustomDropdown";
import { FilterKey, MasterUnit } from "../../types";
import { parseSmartTrade } from "./TradeAnalyzer/smartParser";
import { triggerHaptic } from "../../data/helpers";
import { useStickyState } from "../../hooks/useStickyState";

const SORT_OPTIONS = {
  "value-desc": "Value: High to Low",
  "value-asc": "Value: Low to High",
  "alpha-asc": "Alphabetical (A-Z)",
  "recent-desc": "Recently Added"
};

const TIER_ORDER: FilterKey[] = ["S", "A", "B", "C", "Pure", "Oddities", "Untiered"];

const getUnitConservativeValue = (master: MasterUnit): number => {
  if (master.value === "owner" || master.valueDisplay === "Owner's Choice" || master.valueDisplay === "O/C") return 0;
  if (typeof master.value === "number" && master.value > 0) return master.value;
  if (typeof master.valueMin === "number" && master.valueMin > 0) return master.valueMin;
  return 0; 
};

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
  if (lower === "gatekept") return <LockIcon className={sz} />;
  if (lower === "black-marketed") return <EyeOff className={sz} />;
  if (lower === "stable") return <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">≈</span>;
  if (lower === "varies") return <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">↕</span>;
  if (lower === "lowballed") return <span className="flex items-center justify-center w-3 h-3 font-black text-[12px] leading-none shrink-0">↓</span>;
  return null;
}

const Sparkline = () => (
  <svg className="absolute bottom-0 left-0 w-full h-[65%] opacity-[0.15] pointer-events-none z-0" preserveAspectRatio="none" viewBox="0 0 100 100">
    <path d="M0,100 C15,80 25,95 40,65 C60,25 80,45 100,10 L100,100 Z" fill="url(#sparkGradient)" />
    <path d="M0,100 C15,80 25,95 40,65 C60,25 80,45 100,10" fill="none" stroke="#23a559" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    <defs>
      <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#23a559" stopOpacity="1" />
        <stop offset="100%" stopColor="#23a559" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

const TradingCardSlot = memo(({ 
  item, 
  master, 
  onInspect, 
  isSelectMode, 
  isSelected, 
  toggleSelect,
  stagedGiveQty,
  stagedGetQty,
  onQtyChange,
  isSandbox,
  isReadOnly
}: { 
  item: InventoryItem; 
  master: MasterUnit; 
  onInspect: (item: InventoryItem, master: MasterUnit) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  toggleSelect: (item: InventoryItem) => void;
  stagedGiveQty: number;
  stagedGetQty: number;
  onQtyChange: (unitId: string, delta: number) => void;
  isSandbox?: boolean;
  isReadOnly?: boolean;
}) => {
  const tierKey = getTier(master);
  const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "#5865F2";
  const proxyUrl = getProxyImage(master.id, master.imageUrl);
  const dropCfg = master.status ? GRID_STATUS_CFG[master.status as keyof typeof GRID_STATUS_CFG] : null;

  const totalStaged = stagedGiveQty + stagedGetQty;
  const isFullyStaged = totalStaged >= item.quantity;
  const availableQty = Math.max(0, item.quantity - totalStaged);

  const displayVal = master.value === "owner" 
    ? "Owner's Choice" 
    : (master.valueDisplay && master.valueDisplay !== "N/A" 
        ? master.valueDisplay 
        : (getUnitConservativeValue(master) || "N/A").toLocaleString());

  const obtainability = (() => {
    const note = (master.notice || "").toLowerCase();
    if (note.includes("(unobtainable)") || note.includes("[unobtainable]") || note.includes("unobtainable")) return "UNOB";
    if (note.includes("(obtainable)") || note.includes("[obtainable]")) return "OBN";
    return master.obtainability || "UNOB";
  })();

  const handleDragStart = (e: React.DragEvent) => {
    if (item.is_pinned || isSelectMode || isSandbox || isReadOnly) {
      e.preventDefault();
      return;
    }
    const numericValue = typeof master.value === "number" ? master.value : master.valueMin || 0;
    const popupUnit = { id: master.id, name: master.name, subtitle: master.subtitle, value: numericValue };
    e.dataTransfer.setData("unit", JSON.stringify(popupUnit));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleClick = () => {
    if (isSelectMode) toggleSelect(item);
    else onInspect(item, master);
  };

  const tagBgTint = dropCfg?.bg ? dropCfg.bg : "transparent";

  return (
    <div
      onClick={handleClick}
      draggable={!item.is_pinned && !isSelectMode && !isSandbox && !isReadOnly}
      onDragStart={handleDragStart}
      className={`group relative flex flex-col bg-[#2B2D31] rounded-[8px] transition-all cursor-pointer overflow-hidden border will-change-transform ${
        isSelected 
          ? "border-[#5865F2] ring-2 ring-[#5865F2] scale-[0.98]" 
          : isFullyStaged
            ? "border-[rgba(255,255,255,0.02)] opacity-50"
            : "border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.18)] hover:-translate-y-0.5"
      }`}
      style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}
    >
      {!isSelectMode && !isSandbox && !isReadOnly && (
        <div className="absolute top-0 bottom-[35%] left-0 w-8 bg-[#111214]/95 backdrop-blur-sm border-r border-[rgba(255,255,255,0.05)] flex flex-col justify-center items-center py-2 gap-2 -translate-x-full group-hover:translate-x-0 transition-transform duration-200 z-50 rounded-br-[8px]" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onQtyChange(item.unit_id, 1)} className="w-6 h-6 flex items-center justify-center bg-[rgba(255,255,255,0.05)] hover:bg-[#23a559]/20 rounded-[4px] transition-colors focus-visible:outline-none"><Plus className="w-4 h-4 text-[#23a559]" /></button>
          <span className="font-mono font-bold text-[11px] text-[#DBDEE1] py-1">{item.quantity}</span>
          <button onClick={() => onQtyChange(item.unit_id, -1)} className="w-6 h-6 flex items-center justify-center bg-[rgba(255,255,255,0.05)] hover:bg-[#ed4245]/20 rounded-[4px] transition-colors focus-visible:outline-none"><Minus className="w-4 h-4 text-[#ed4245]" /></button>
        </div>
      )}

      {isSelected && (
        <div className="absolute top-2 right-2 z-50 bg-[#5865F2] text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md">
          <Check className="w-4 h-4 stroke-[3]" />
        </div>
      )}

      <div 
        className="relative w-full overflow-hidden flex items-center justify-center border-b border-[rgba(255,255,255,0.03)] bg-[#111214]"
        style={{ aspectRatio: "1/1", background: `radial-gradient(circle at 50% 30%, ${tagBgTint} 0%, #18191C 85%)` }}
      >
        {dropCfg && !isSelected && (
          <div 
            className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2 py-1 rounded-full shadow-sm max-w-[70%]"
            style={{ background: dropCfg.bg, border: `1px solid ${dropCfg.border}`, color: dropCfg.color }}
          >
            <AuthenticStatusIcon status={master.status} />
            <span className="text-[9.5px] font-bold tracking-wide border-b border-dashed border-[rgba(255,255,255,0.4)] truncate">
              {dropCfg.label}
            </span>
          </div>
        )}

        <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
          {item.is_pinned && !isReadOnly && (
            <div className="bg-[#ed4245] text-white p-1 rounded-[4px] shadow-sm flex items-center justify-center" title="Locked">
              <LockIcon className="w-3 h-3 fill-current" />
            </div>
          )}
          <div className="bg-[#111214]/90 backdrop-blur-sm text-[#DBDEE1] font-mono font-bold text-[11px] px-2 py-0.5 rounded-[4px] border border-[rgba(255,255,255,0.08)] shadow-sm">
            x{item.quantity}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center text-white font-black text-4xl z-0 opacity-40 select-none" style={getAvatarStyle(master.name)}>
          {getInitials(master.name)}
        </div>
        {proxyUrl && (
          <img 
            src={proxyUrl} 
            alt={master.name} 
            className="absolute inset-0 w-full h-full object-cover z-10 transition-transform duration-500 group-hover:scale-105" 
            style={{ objectPosition: "center 15%" }}
            onError={(e) => handleImageError(e, master.id)} 
          />
        )}
      </div>

      <div className="p-3 flex flex-col flex-1 bg-[#2B2D31]">
        <div className="flex flex-col mb-2">
          <span className="text-[14px] font-black text-[#F2F3F5] tracking-tight truncate leading-snug">
            {master.name}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#949BA4] truncate mt-0.5">
            {master.subtitle || "Official Unit"}
          </span>

          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded-[3px] border tracking-wider leading-none ${
              obtainability === "UNOB" 
                ? "bg-[#1E1F22] text-[#949BA4] border-[rgba(255,255,255,0.06)]" 
                : "bg-[rgba(255,255,255,0.05)] text-[#DBDEE1] border-[rgba(255,255,255,0.1)]"
            }`}>
              {obtainability}
            </span>
          </div>
        </div>

        <div className="mt-auto pt-2 border-t border-[rgba(255,255,255,0.03)]">
          <div className="pl-2.5 border-l-[3px] mb-2.5" style={{ borderColor: tierColor }}>
            <span className={`text-[15px] font-black font-mono tracking-tight block truncate ${
              displayVal === "Owner's Choice" 
                ? "bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400" 
                : "text-[#F2F3F5]"
            }`}>
              {displayVal}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[4px] p-1.5 flex flex-col justify-center">
              <span className="text-[8px] font-bold uppercase tracking-wider text-[#80848E]">Rarity</span>
              <span className="text-[12px] font-mono font-bold text-[#4DB6AC]">
                {master.rarity ?? "N/A"}
              </span>
            </div>
            <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[4px] p-1.5 flex flex-col justify-center">
              <span className="text-[8px] font-bold uppercase tracking-wider text-[#80848E]">Liquidity</span>
              <span className={`text-[11px] font-mono font-bold uppercase truncate ${
                (master.liquidity || "").toLowerCase() === "high" ? "text-[#4DB6AC]" :
                (master.liquidity || "").toLowerCase() === "low" ? "text-[#E57373]" : "text-[#B5BAC1]"
              }`}>
                {master.liquidity || "AVG"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export function InventoryChannel() {
  const { units: ALL_UNITS } = useUnits();
  const { items, addOrUpdateUnit, removeUnit, togglePin, restoreItem, clearInventory, clearUnpinned, viewingUserId, viewingUsername, setViewingUser } = useInventoryStore();
  const { addCard, giveItems, getItems } = useTradeStore();
  const { profile } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTierFilter, setActiveTierFilter] = useState<FilterKey | "Pinned">("All");
  const [sortMode, setSortMode] = useState("value-desc");
  const [collapsedTiers, setCollapsedTiers] = useState<Record<string, boolean>>({});

  const isReadOnly = viewingUserId !== null;
  const activeProfileId = viewingUserId || profile?.id;

  const [vaultView, setVaultView] = useState<"owned" | "wishlist">("owned");
  const [sandboxDismissed, setSandboxDismissed] = useStickyState(false, "astd_sandbox_dismissed_v1");

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [inspectTarget, setInspectTarget] = useState<{ item: InventoryItem; master: MasterUnit } | null>(null);

  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const [omniboxIndex, setOmniboxIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const omniboxRef = useRef<HTMLDivElement>(null);
  useClickOutside(omniboxRef, () => setIsOmniboxOpen(false));

  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLTextAreaElement>(null);

  const [manageOpen, setManageOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState<"unpinned" | "all" | null>(null);
  const manageRef = useRef<HTMLDivElement>(null);
  useClickOutside(manageRef, () => { setManageOpen(false); setConfirmClear(null); });

  const [toast, setToast] = useState<{ id: number, message: string, isError: boolean, itemToRestore?: InventoryItem } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, isError = false, itemToRestore?: InventoryItem) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message, isError, itemToRestore });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const handleUndo = useCallback(async () => {
    if (toast?.itemToRestore && profile && !isReadOnly) {
      try {
        await restoreItem(toast.itemToRestore);
        setToast(null);
      } catch (e) { showToast("Failed to restore unit.", true); }
    }
  }, [toast, profile, restoreItem, showToast, isReadOnly]);

  const handleQtyChange = useCallback(async (unitId: string, delta: number) => {
    if (!profile || delta === 0 || isReadOnly) return;
    try { 
      await addOrUpdateUnit(profile.id, unitId, delta);
      setInspectTarget(prev => {
        if (!prev || prev.item.unit_id !== unitId) return prev;
        const updatedQty = prev.item.quantity + delta;
        if (updatedQty <= 0) return null;
        return { ...prev, item: { ...prev.item, quantity: updatedQty } };
      });
    } catch (e) { showToast("Failed to update quantity.", true); }
  }, [profile, addOrUpdateUnit, showToast, isReadOnly]);

  const handleTogglePin = useCallback(async (unitId: string, status: boolean) => {
    if (!profile || isReadOnly) return;
    try { 
      await togglePin(profile.id, unitId, status); 
      setInspectTarget(prev => prev && prev.item.unit_id === unitId ? { ...prev, item: { ...prev.item, is_pinned: !status } } : prev);
    } catch (e) { showToast("Failed to pin unit.", true); }
  }, [profile, togglePin, showToast, isReadOnly]);

  const handleRemove = useCallback(async (item: InventoryItem, master: MasterUnit) => {
    if (!profile || isReadOnly) return;
    try {
      await removeUnit(profile.id, item.unit_id);
      setInspectTarget(null);
      showToast(`Removed ${master.name}`, false, item);
    } catch (e) { showToast("Failed to remove unit.", true); }
  }, [profile, removeUnit, showToast, isReadOnly]);

  const handleClearAction = useCallback(async () => {
    if (!profile || !confirmClear || isReadOnly) return;
    try {
      if (confirmClear === "unpinned") await clearUnpinned(profile.id);
      if (confirmClear === "all") await clearInventory(profile.id);
      setManageOpen(false);
      setConfirmClear(null);
    } catch (e) { showToast("Failed to clear inventory.", true); }
  }, [profile, confirmClear, clearUnpinned, clearInventory, showToast, isReadOnly]);

  const { 
    resolvedInventory, 
    estimatedValue, 
    liquidValue, 
    totalQuantity, 
    uniqueCount, 
    unpinnedCount, 
    unobPercentage,
    marketMomentum,
    liqDistribution,
    liqTotal,
    highPct,
    avgPct,
    lowPct
  } = useMemo(() => {
    let estVal = 0, liqVal = 0, totQty = 0, unpinned = 0;
    let unobVal = 0;
    let risingCount = 0, droppingCount = 0;
    let highLiq = 0, avgLiq = 0, lowLiq = 0;

    const resolved = items.map(item => {
      const master = ALL_UNITS.find(u => u.id === item.unit_id);
      if (master) {
        totQty += item.quantity;
        const conservativeVal = getUnitConservativeValue(master) * item.quantity;
        estVal += conservativeVal;

        const isUnob = (master.notice || "").toLowerCase().includes("unobtainable") || master.obtainability === "UNOB";
        if (isUnob) unobVal += conservativeVal;

        if (master.status === "rising") risingCount += item.quantity;
        if (master.status === "dropping") droppingCount += item.quantity;

        const liq = (master.liquidity || "Average").toLowerCase();
        if (liq === "high") {
          liqVal += conservativeVal;
          highLiq += conservativeVal;
        } else if (liq === "average") {
          liqVal += conservativeVal;
          avgLiq += conservativeVal;
        } else {
          lowLiq += conservativeVal;
        }

        if (!item.is_pinned) unpinned++;
      }
      return { ...item, master };
    }).filter(i => i.master !== undefined) as (typeof items[0] & { master: MasterUnit })[];

    const unobPct = estVal > 0 ? (unobVal / estVal) * 100 : 0;
    const netMomentum = risingCount - droppingCount;

    const totalVal = estVal > 0 ? estVal : 1;
    const hPct = (highLiq / totalVal) * 100;
    const aPct = (avgLiq / totalVal) * 100;
    const lPct = (lowLiq / totalVal) * 100;

    return { 
      resolvedInventory: resolved, 
      estimatedValue: estVal, 
      liquidValue: liqVal,
      totalQuantity: totQty, 
      uniqueCount: resolved.length, 
      unpinnedCount: unpinned,
      unobPercentage: unobPct,
      marketMomentum: { net: netMomentum, rising: risingCount, dropping: droppingCount },
      liqDistribution: { high: highLiq, avg: avgLiq, low: lowLiq },
      liqTotal: totalVal,
      highPct: hPct,
      avgPct: aPct,
      lowPct: lPct
    };
  }, [items, ALL_UNITS]);

  const isSandbox = !isReadOnly && uniqueCount === 0 && !sandboxDismissed;
  
  const sandboxMockItems = useMemo(() => {
    if (!isSandbox) return [];
    const mocks = [
      { unit_id: "bunny-girl", quantity: 1, is_pinned: false },
      { unit_id: "the-ripper", quantity: 3, is_pinned: false },
      { unit_id: "death", quantity: 1, is_pinned: true }
    ];
    return mocks.map(item => ({
      ...item,
      id: `sandbox-${item.unit_id}`,
      user_id: "sandbox",
      created_at: new Date().toISOString(),
      master: ALL_UNITS.find(u => u.id === item.unit_id)!
    })).filter(i => i.master) as (InventoryItem & { master: MasterUnit })[];
  }, [isSandbox, ALL_UNITS]);

  const displayInventory = isSandbox ? sandboxMockItems : resolvedInventory;

  const top3Units = useMemo(() => {
    return [...displayInventory]
      .sort((a, b) => (getUnitConservativeValue(b.master) * b.quantity) - (getUnitConservativeValue(a.master) * a.quantity))
      .slice(0, 3);
  }, [displayInventory]);

  const handleCopyVault = useCallback(() => {
    const text = `${isReadOnly && viewingUsername ? `${viewingUsername}'s` : 'My'} ASTD Vault (Total: ${estimatedValue.toLocaleString()} | Liquid: ${liquidValue.toLocaleString()} | UNOB: ${unobPercentage.toFixed(0)}%):\n` +
      displayInventory.map(i => `- ${i.quantity}x ${i.master.name}`).join('\n');
    navigator.clipboard.writeText(text);
    showToast("Vault summary copied to clipboard!");
  }, [displayInventory, estimatedValue, liquidValue, unobPercentage, showToast, isReadOnly, viewingUsername]);

  const handleSendToAnalyzer = (type: "give" | "get", targetMaster?: MasterUnit) => {
    triggerHaptic('medium');
    
    if (isSelectMode && selectedUnits.size > 0) {
      let count = 0;
      selectedUnits.forEach(itemId => {
        const invItem = displayInventory.find(i => i.id === itemId);
        if (invItem && !invItem.is_pinned) { 
          const numVal = getUnitConservativeValue(invItem.master);
          addCard(type, { id: invItem.master.id, name: invItem.master.name, subtitle: invItem.master.subtitle, value: numVal, qty: invItem.quantity });
          count++;
        }
      });
      showToast(`Added ${count} units to You ${type === "give" ? "Give" : "Get"}`);
      setSelectedUnits(new Set());
      setIsSelectMode(false);
      return;
    }

    const master = targetMaster || inspectTarget?.master;
    if (!master) return;
    
    const qty = targetMaster ? 1 : (inspectTarget?.item.quantity || 1);
    const numericValue = getUnitConservativeValue(master);
    addCard(type, { id: master.id, name: master.name, subtitle: master.subtitle, value: numericValue, qty });
    showToast(`Added ${master.name} to You ${type === "give" ? "Give" : "Get"}!`);
    window.dispatchEvent(new CustomEvent("trade-added", { detail: { name: master.name, type } }));
    if (!targetMaster) setInspectTarget(null);
  };

  const toggleSelectUnit = (item: InventoryItem) => {
    if (item.is_pinned) {
      showToast("Cannot select locked units.", true);
      triggerHaptic('light');
      return;
    }
    triggerHaptic('light');
    setSelectedUnits(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  const handleQuickAdd = async (master: MasterUnit) => {
    if (!profile || isReadOnly) return;
    try {
      await addOrUpdateUnit(profile.id, master.id, 1);
      if (isSandbox) setSandboxDismissed(true);
      setSearchQuery("");
      setIsOmniboxOpen(false);
      setOmniboxIndex(-1);
    } catch (e) { showToast("Failed to add unit.", true); }
  };

  const handleOmniboxKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOmniboxIndex(prev => Math.min(prev + 1, unownedSearchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOmniboxIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (omniboxIndex >= 0 && unownedSearchResults[omniboxIndex]) {
        handleQuickAdd(unownedSearchResults[omniboxIndex]);
      } else if (unownedSearchResults.length > 0) {
        handleQuickAdd(unownedSearchResults[0]);
      }
    } else if (e.key === "Escape") {
      setIsOmniboxOpen(false);
      searchInputRef.current?.blur();
    }
  };

  const executeMassImport = async () => {
    if (!profile || parsedImportItems.length === 0 || isReadOnly) return;
    setIsImporting(true);
    let successCount = 0;
    
    for (const item of parsedImportItems) {
      try {
        await addOrUpdateUnit(profile.id, item.id, item.qty);
        successCount++;
      } catch (e) { console.error("Failed to import", item.name); }
    }
    
    if (isSandbox && successCount > 0) setSandboxDismissed(true);

    setIsImporting(false);
    setImportMenuOpen(false);
    setImportText("");
    if (successCount > 0) showToast(`Imported ${successCount} items successfully.`, false);
  };

  const tierGroupedUnits = useMemo(() => {
    let filtered = displayInventory;
    const q = searchQuery.toLowerCase().trim();
    
    if (q) {
      filtered = filtered.filter(i => {
        const m = i.master;
        return m.name.toLowerCase().includes(q) || (m.subtitle && m.subtitle.toLowerCase().includes(q)) || (m.aliases && m.aliases.some(a => a.toLowerCase().includes(q)));
      });
    }

    if (activeTierFilter === "Pinned") {
      filtered = filtered.filter(i => i.is_pinned);
    } else if (activeTierFilter !== "All") {
      filtered = filtered.filter(i => getTier(i.master) === activeTierFilter);
    }

    const groups: Record<string, typeof filtered> = {};
    TIER_ORDER.forEach(t => { groups[t] = []; });

    filtered.forEach(item => {
      const t = getTier(item.master);
      if (groups[t]) groups[t].push(item);
    });

    Object.keys(groups).forEach(tier => {
      groups[tier].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        if (sortMode === "value-desc" || sortMode === "value-asc") {
          const valA = getUnitConservativeValue(a.master);
          const valB = getUnitConservativeValue(b.master);
          if (valA !== valB) return sortMode === "value-desc" ? valB - valA : valA - valB;
        } else if (sortMode === "alpha-asc") return a.master.name.localeCompare(b.master.name);
        else if (sortMode === "recent-desc") {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          if (timeA !== timeB) return timeB - timeA;
        }
        return a.master.name.localeCompare(b.master.name);
      });
    });

    return groups;
  }, [displayInventory, searchQuery, activeTierFilter, sortMode]);

  const unownedSearchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q || isReadOnly) return [];
    const ownedIds = new Set(items.map(i => i.unit_id));
    return ALL_UNITS.filter(u => {
      if (ownedIds.has(u.id)) return false;
      return u.name.toLowerCase().includes(q) || (u.subtitle && u.subtitle.toLowerCase().includes(q)) || (u.aliases && u.aliases.some(a => a.toLowerCase().includes(q)));
    }).slice(0, 10);
  }, [searchQuery, items, ALL_UNITS, isReadOnly]);

  const parsedImportItems = useMemo(() => {
    if (!importText.trim()) return [];
    return parseSmartTrade(importText, ALL_UNITS).giveCards;
  }, [importText, ALL_UNITS]);

  if (!profile && !isReadOnly) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#313338] p-6 text-center">
        <Package className="w-12 h-12 text-[#80848E] mb-3" />
        <h2 className="text-[18px] font-bold text-[#F2F3F5] mb-1">Authentication Required</h2>
        <p className="text-[#949BA4] text-[13px] max-w-sm">Please log in with Discord using the top navigation bar to access your personal vault.</p>
      </div>
    );
  }

  // Progressive Disclosure Empty State View
  if (uniqueCount === 0 && sandboxDismissed && !importMenuOpen && !isReadOnly) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#313338] p-4 md:p-6 animate-fade-in relative font-sans">
        <style>{`.bg-grid-pattern { background-size: 40px 40px; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px); }`}</style>
        <div className="absolute inset-0 bg-grid-pattern z-0" />
        <div className="relative z-10 flex flex-col items-center w-full max-w-xl text-center px-2">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-[12px] bg-[#1E1F22] border border-[#5865F2]/30 flex items-center justify-center shadow-[0_0_40px_rgba(88,101,242,0.15)] mb-5">
            <Package className="w-8 h-8 md:w-10 md:h-10 text-[#5865F2]" />
          </div>
          <h1 className="text-[22px] md:text-[32px] font-black text-[#F2F3F5] tracking-tight mb-2">Welcome to your Vault</h1>
          <p className="text-[#949BA4] text-[13px] md:text-[15px] mb-6 md:mb-8 leading-relaxed max-w-md mx-auto">
            Search for your first unit below to start tracking your net worth, or import your entire inventory list at once.
          </p>

          <div className="w-full relative" ref={omniboxRef}>
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#80848E]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setIsOmniboxOpen(true); setOmniboxIndex(-1); }}
                onFocus={() => setIsOmniboxOpen(true)}
                onKeyDown={handleOmniboxKeyDown}
                placeholder="Type a unit name to quick add..."
                className="w-full bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] rounded-full pl-12 pr-4 py-3.5 md:py-4 text-[15px] md:text-[16px] text-[#F2F3F5] outline-none placeholder-[#80848E] focus:ring-2 focus:ring-[#5865F2] transition-all shadow-xl"
                autoFocus
              />
            </div>

            {isOmniboxOpen && searchQuery && unownedSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 max-h-[300px] overflow-y-auto custom-scrollbar bg-[#2B2D31] border border-[rgba(255,255,255,0.08)] rounded-[12px] shadow-[0_20px_60px_rgba(0,0,0,0.4)] z-50 flex flex-col p-2 text-left">
                {unownedSearchResults.map((u, i) => {
                  const isSelected = i === omniboxIndex;
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleQuickAdd(u)}
                      onMouseEnter={() => setOmniboxIndex(i)}
                      className={`flex items-center gap-3 w-full p-3 rounded-[8px] transition-colors focus-visible:outline-none ${isSelected ? 'bg-[#5865F2] text-white shadow-sm' : 'bg-transparent hover:bg-[rgba(255,255,255,0.04)] text-[#F2F3F5]'}`}
                    >
                      <div className="w-8 h-8 rounded-[4px] bg-[#111214] flex items-center justify-center shrink-0 border border-[rgba(255,255,255,0.08)] overflow-hidden relative">
                        {getProxyImage(u.id, u.imageUrl) ? <img src={getProxyImage(u.id, u.imageUrl)!} alt="" className="w-full h-full object-cover" onError={(e) => handleImageError(e, u.id)} /> : <span className="text-[9px] font-bold z-0" style={getAvatarStyle(u.name)}>{getInitials(u.name)}</span>}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[14px] font-bold truncate">{u.name}</span>
                        {u.subtitle && <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-white/80' : 'text-[#949BA4]'}`}>{u.subtitle}</span>}
                      </div>
                      <Plus className={`w-4 h-4 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-5 md:mt-6">
            <div className="h-px bg-[rgba(255,255,255,0.06)] w-12 md:w-16" />
            <span className="text-[11px] md:text-[12px] font-bold uppercase tracking-widest text-[#80848E]">OR</span>
            <div className="h-px bg-[rgba(255,255,255,0.06)] w-12 md:w-16" />
          </div>

          <button 
            onClick={() => { setImportMenuOpen(true); setTimeout(() => importInputRef.current?.focus(), 100); }}
            className="mt-5 md:mt-6 flex items-center gap-2 px-6 py-3 rounded-full bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.06)] text-[#DBDEE1] hover:text-[#F2F3F5] text-[13px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]"
          >
            <UploadCloud className="w-4 h-4 text-[#5865F2]" /> Import from Text
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#313338] h-full select-none font-sans relative">
      <style>{`.mask-fade-edges { mask-image: linear-gradient(to right, black 90%, transparent 100%); -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%); }`}</style>
      
      {/* Read-Only Banner Header */}
      {isReadOnly && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#5865F2] text-white shrink-0 shadow-md z-30 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded">Viewing Vault</span>
            <span className="text-[14px] font-black truncate">{viewingUsername || "Trader"}'s Collection</span>
          </div>
          <button 
            onClick={() => setViewingUser(null, null)}
            className="flex items-center gap-1.5 px-3 py-1 bg-black/20 hover:bg-black/30 rounded-[4px] text-[12px] font-bold transition-colors focus-visible:outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to My Vault
          </button>
        </div>
      )}

      {/* Header Controls Bar */}
      <div className={`flex-shrink-0 flex flex-col bg-[#2B2D31] border-b border-[rgba(0,0,0,0.22)] shadow-sm z-20 relative ${importMenuOpen ? "opacity-30 pointer-events-none blur-sm" : ""}`}>
        
        {!isReadOnly && (
          <div className="flex bg-[#1E1F22] rounded-[4px] p-[3px] mx-3 md:mx-5 mt-3 mb-1 border border-[rgba(255,255,255,0.04)] w-fit shadow-inner">
            <button 
              onClick={() => setVaultView("owned")} 
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[3px] text-[11px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none ${vaultView === "owned" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#949BA4] hover:text-[#DBDEE1]"}`}
            >
              <Package className="w-3.5 h-3.5" /> My Vault
            </button>
            <button 
              onClick={() => { setVaultView("wishlist"); showToast("Wishlist feature arriving in the Trading Ads update.", false); }} 
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[3px] text-[11px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none ${vaultView === "wishlist" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#949BA4] hover:text-[#DBDEE1]"}`}
            >
              <Heart className="w-3.5 h-3.5" /> Wishlist
            </button>
          </div>
        )}

        <div className="flex flex-col xl:flex-row xl:items-center justify-between px-3 md:px-5 py-2.5 gap-2.5">
          <div className="flex flex-nowrap items-center gap-1.5 md:gap-2 overflow-x-auto hide-scrollbar pb-1 -mb-1 w-full xl:w-auto snap-x snap-mandatory pr-6 mask-fade-edges" style={{ WebkitOverflowScrolling: 'touch' }}>
            
            {!isReadOnly && (
              <div className="flex items-center pr-2 border-r border-[rgba(255,255,255,0.06)] mr-1 shrink-0">
                <button 
                  onClick={() => { setIsSelectMode(!isSelectMode); setSelectedUnits(new Set()); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] ${isSelectMode ? 'bg-[rgba(88,101,242,0.15)] text-[#5865F2] ring-1 ring-[#5865F2]/50' : 'bg-[#1E1F22] text-[#80848E] hover:text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.04)]'}`}
                >
                  <MousePointerSquareDashed className="w-3.5 h-3.5" />
                  Select
                </button>
              </div>
            )}

            <button onClick={() => setActiveTierFilter("All")} className="snap-start flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] md:text-[12px] font-bold tracking-wide transition-colors border focus-visible:outline-none" style={activeTierFilter === "All" ? { background: "#5865F2", color: "#fff", borderColor: "#5865F2" } : { background: "rgba(255,255,255,0.03)", color: "#949BA4", borderColor: "rgba(255,255,255,0.05)" }}>
              All
            </button>
            <button onClick={() => setActiveTierFilter("Pinned")} className="snap-start flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] md:text-[12px] font-bold tracking-wide transition-colors border focus-visible:outline-none" style={activeTierFilter === "Pinned" ? { background: "#5865F2", color: "#fff", borderColor: "#5865F2" } : { background: "rgba(255,255,255,0.03)", color: "#FAA61A", borderColor: "rgba(250,166,26,0.3)" }}>
              <LockIcon className="w-3 h-3 inline mr-1" /> Locked
            </button>
            {FILTERS.filter(f => f !== "All").map((f) => (
              <button key={f} onClick={() => setActiveTierFilter(f)} className="snap-start flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] md:text-[12px] font-bold tracking-wide transition-colors border focus-visible:outline-none" style={activeTierFilter === f ? { background: "#5865F2", color: "#fff", borderColor: "#5865F2" } : { background: "rgba(255,255,255,0.03)", color: "#949BA4", borderColor: "rgba(255,255,255,0.05)" }}>
                {f}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 w-full xl:w-auto">
            <CustomDropdown icon={ArrowUpDown} value={sortMode} options={SORT_OPTIONS} onChange={setSortMode} defaultLabel="Sort By" />
            
            <div className="relative flex-1 min-w-[160px] shrink-0 flex items-center gap-1.5" ref={omniboxRef}>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#80848E]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsOmniboxOpen(true); setOmniboxIndex(-1); }}
                  onFocus={() => setIsOmniboxOpen(true)}
                  onKeyDown={handleOmniboxKeyDown}
                  placeholder={isReadOnly ? "Search vault..." : "Search or add units..."}
                  className="w-full bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[4px] pl-9 pr-3 py-1 text-[13px] text-[#F2F3F5] outline-none placeholder-[#80848E] focus:ring-1 focus:ring-[#5865F2] transition-colors shadow-inner h-[32px]"
                />
              </div>

              <button
                onClick={handleCopyVault}
                className="w-[32px] h-[32px] shrink-0 bg-[#1E1F22] hover:bg-[#35373C] text-[#80848E] hover:text-[#F2F3F5] rounded-[4px] flex items-center justify-center transition-colors focus-visible:outline-none border border-[rgba(255,255,255,0.04)]"
                title="Copy Vault Summary"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {!isReadOnly && (
                <div className="relative shrink-0" ref={manageRef}>
                  <button 
                    onClick={() => setManageOpen(!manageOpen)}
                    className={`w-[32px] h-[32px] shrink-0 flex items-center justify-center rounded-[4px] transition-colors focus-visible:outline-none border ${manageOpen || confirmClear ? 'bg-[#35373C] text-[#F2F3F5] border-[rgba(255,255,255,0.1)]' : 'bg-[#1E1F22] text-[#80848E] hover:text-[#DBDEE1] hover:bg-[#35373C] border-[rgba(255,255,255,0.04)]'}`}
                    title="Inventory Options"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                  
                  {manageOpen && (
                    <div className="absolute top-full right-0 mt-2 w-[260px] bg-[#2B2D31] border border-[rgba(255,255,255,0.08)] shadow-2xl rounded-[8px] p-1.5 z-50 animate-fade-in flex flex-col">
                      {confirmClear ? (
                        <div className="p-3 bg-[rgba(237,66,69,0.1)] border border-[rgba(237,66,69,0.2)] rounded-[6px] flex flex-col gap-3">
                          <span className="text-[12.5px] text-[#F2F3F5] font-medium leading-snug">
                            Remove {confirmClear === "unpinned" ? <span className="font-bold text-[#ed4245]">{unpinnedCount} unlocked</span> : <span className="font-bold text-[#ed4245]">all {uniqueCount}</span>} units? This cannot be undone.
                          </span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setConfirmClear(null)} className="flex-1 px-3 py-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded-[4px] text-[12px] font-bold text-[#DBDEE1] transition-colors focus-visible:outline-none">Cancel</button>
                            <button onClick={handleClearAction} className="flex-1 px-3 py-2 bg-[#ed4245] hover:bg-[#c9383a] rounded-[4px] text-[12px] font-bold text-white transition-colors focus-visible:outline-none">Clear</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => { setImportMenuOpen(true); setManageOpen(false); setTimeout(() => importInputRef.current?.focus(), 100); }} className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-semibold text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.04)] transition-colors focus-visible:outline-none flex items-center justify-between">
                            Import from Text <Wand2 className="w-3.5 h-3.5 text-[#80848E]" />
                          </button>
                          <div className="w-full h-px bg-[rgba(255,255,255,0.04)] my-1" />
                          <button onClick={() => { if (unpinnedCount > 0) setConfirmClear("unpinned"); }} disabled={unpinnedCount === 0} className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-semibold text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none flex items-center justify-between">
                            Clear Unlocked <span className="text-[#80848E] font-mono font-bold text-[11px]">{unpinnedCount}</span>
                          </button>
                          <button onClick={() => { if (uniqueCount > 0) setConfirmClear("all"); }} disabled={uniqueCount === 0} className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-semibold text-[#ed4245] hover:bg-[rgba(237,66,69,0.1)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none flex items-center justify-between">
                            Clear Entire Inventory <span className="text-[#ed4245] opacity-70 font-mono font-bold text-[11px]">{uniqueCount}</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Omnibox Dropdown */}
              {!isReadOnly && isOmniboxOpen && searchQuery && unownedSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-10 mt-1 max-h-[300px] overflow-y-auto custom-scrollbar bg-[#2B2D31] border border-[rgba(255,255,255,0.08)] rounded-[6px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] z-[99999] flex flex-col p-1 text-left">
                  {unownedSearchResults.map((u, i) => {
                    const isSelected = i === omniboxIndex;
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleQuickAdd(u)}
                        onMouseEnter={() => setOmniboxIndex(i)}
                        className={`flex items-center gap-2.5 w-full p-2 rounded-[4px] transition-colors focus-visible:outline-none ${isSelected ? 'bg-[#5865F2] text-white' : 'bg-transparent hover:bg-[rgba(255,255,255,0.04)] text-[#F2F3F5]'}`}
                      >
                        <div className="w-7 h-7 rounded-[4px] bg-[#111214] flex items-center justify-center shrink-0 border border-[rgba(255,255,255,0.08)] overflow-hidden relative">
                          {getProxyImage(u.id, u.imageUrl) ? <img src={getProxyImage(u.id, u.imageUrl)!} alt="" className="w-full h-full object-cover" onError={(e) => handleImageError(e, u.id)} /> : <span className="text-[7px] font-bold z-0" style={getAvatarStyle(u.name)}>{getInitials(u.name)}</span>}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[12.5px] font-bold truncate leading-tight">{u.name}</span>
                        </div>
                        <Plus className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto custom-scrollbar relative z-0 transition-all duration-300 ${importMenuOpen ? "opacity-30 pointer-events-none blur-sm" : ""}`}>
        <div className="p-3 md:p-6 pb-32">
          
          {/* Sandbox Banner */}
          {!isReadOnly && isSandbox && (
             <div className="bg-[rgba(88,101,242,0.1)] border border-[#5865F2]/30 rounded-[8px] p-4 flex items-center justify-between mb-6 shadow-sm">
                <div className="flex items-center gap-3">
                   <Info className="w-5 h-5 text-[#5865F2] shrink-0" />
                   <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#F2F3F5]">Sandbox Mode Active</span>
                      <span className="text-[12px] text-[#B5BAC1]">Try adjusting quantities or moving these dummy units to the Calculator. Adding any real unit clears the sandbox.</span>
                   </div>
                </div>
                <button onClick={() => setSandboxDismissed(true)} className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none shrink-0">Exit Sandbox</button>
             </div>
          )}

          {/* Portfolio Dashboard */}
          {displayInventory.length > 0 && !searchQuery && activeTierFilter === "All" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 mb-6">
              
              <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-5 flex flex-col justify-between relative overflow-hidden">
                <Sparkline />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">{isReadOnly && viewingUsername ? `${viewingUsername}'s Vault Net Worth` : 'Vault Net Worth'}</span>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono">
                      {isSandbox ? (
                         <span className="text-[#949BA4] bg-[#1E1F22] px-2 py-0.5 rounded-[4px] border border-[rgba(255,255,255,0.04)]">Sandbox Value</span>
                      ) : marketMomentum.net > 0 ? (
                        <span className="text-[#23a559] flex items-center gap-1 bg-[#23a559]/10 px-2 py-0.5 rounded-[4px] border border-[#23a559]/20">
                          <TrendingUp className="w-3 h-3" /> +{marketMomentum.net} Net Rising
                        </span>
                      ) : marketMomentum.net < 0 ? (
                        <span className="text-[#ed4245] flex items-center gap-1 bg-[#ed4245]/10 px-2 py-0.5 rounded-[4px] border border-[#ed4245]/20">
                          <TrendingDown className="w-3 h-3" /> {Math.abs(marketMomentum.net)} Net Dropping
                        </span>
                      ) : (
                        <span className="text-[#949BA4] bg-[#1E1F22] px-2 py-0.5 rounded-[4px] border border-[rgba(255,255,255,0.04)]">Market Stable</span>
                      )}
                    </div>
                  </div>

                  <h2 className="text-[32px] md:text-[40px] font-black text-[#F2F3F5] tracking-tighter leading-none font-mono">
                    {isSandbox ? sandboxMockItems.reduce((acc, c) => acc + (c.master.value as number)*c.quantity, 0).toLocaleString() : estimatedValue.toLocaleString()}
                  </h2>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)]">
                    <div className="bg-[#111214]/60 backdrop-blur-sm p-2.5 rounded-[6px] border border-[rgba(255,255,255,0.02)] flex flex-col shadow-inner">
                      <span className="text-[9px] font-bold text-[#80848E] uppercase tracking-wider">Liquid Assets</span>
                      <span className="text-[14px] font-bold text-[#4DB6AC] font-mono mt-0.5">{isSandbox ? "0" : liquidValue.toLocaleString()}</span>
                    </div>
                    <div className="bg-[#111214]/60 backdrop-blur-sm p-2.5 rounded-[6px] border border-[rgba(255,255,255,0.02)] flex flex-col shadow-inner">
                      <span className="text-[9px] font-bold text-[#80848E] uppercase tracking-wider">UNOB Proportion</span>
                      <span className="text-[14px] font-bold text-[#FAA61A] font-mono mt-0.5">{isSandbox ? "0" : unobPercentage.toFixed(0)}% Unobtainable</span>
                    </div>
                  </div>
                </div>

                {!isSandbox && (
                  <div className="flex flex-col gap-1.5 mt-5 relative z-10">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">
                      <span>Demand Distribution</span>
                      <span>{((liquidValue / liqTotal) * 100).toFixed(0)}% Liquid</span>
                    </div>
                    <div className="w-full h-2 rounded-[2px] bg-[#111214] overflow-hidden flex shadow-inner border border-[rgba(255,255,255,0.02)]">
                      <div className="h-full bg-[#4DB6AC] transition-all duration-700 ease-out" style={{ width: `${highPct}%` }} title={`High Demand: ${highPct.toFixed(0)}%`} />
                      <div className="h-full bg-[#B5BAC1] transition-all duration-700 ease-out" style={{ width: `${avgPct}%` }} title={`Average Demand: ${avgPct.toFixed(0)}%`} />
                      <div className="h-full bg-[#E57373] transition-all duration-700 ease-out" style={{ width: `${lowPct}%` }} title={`Low Demand: ${lowPct.toFixed(0)}%`} />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-[#80848E]">
                      <span className="text-[#4DB6AC]">High: {highPct.toFixed(0)}%</span>
                      <span className="text-[#B5BAC1]">Avg: {avgPct.toFixed(0)}%</span>
                      <span className="text-[#E57373]">Low: {lowPct.toFixed(0)}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-5 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#949BA4] mb-3">Crown Assets</span>
                
                <div className="flex flex-col gap-2 flex-1 justify-center">
                  {top3Units.map((item, idx) => {
                    const proxyUrl = getProxyImage(item.master.id, item.master.imageUrl);
                    const unitVal = getUnitConservativeValue(item.master) * item.quantity;
                    const share = estimatedValue > 0 ? (unitVal / estimatedValue) * 100 : 0;
                    const rankColor = idx === 0 ? "#FAA61A" : idx === 1 ? "#B5BAC1" : "#A0714F";
                    const rankBg = idx === 0 ? "rgba(250,166,26,0.1)" : idx === 1 ? "rgba(181,186,193,0.1)" : "rgba(160,113,79,0.1)";

                    return (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-2 rounded-[6px] bg-[#1E1F22] border border-[rgba(255,255,255,0.02)] transition-colors hover:border-[rgba(255,255,255,0.06)]"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <span className="font-mono font-black text-[12px] w-5 text-center shrink-0 rounded-[3px] py-0.5" style={{ color: rankColor, backgroundColor: rankBg }}>
                            #{idx + 1}
                          </span>
                          <div className="w-10 h-10 rounded-full bg-[#111214] border border-[rgba(255,255,255,0.06)] overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm">
                            <span className="text-[9px] font-bold text-white z-0" style={getAvatarStyle(item.master.name)}>
                              {getInitials(item.master.name)}
                            </span>
                            {proxyUrl && (
                              <img 
                                src={proxyUrl} 
                                alt={item.master.name} 
                                className="absolute inset-0 w-full h-full object-cover z-10" 
                                style={{ objectPosition: "center 15%" }}
                                onError={(e) => handleImageError(e, item.master.id)} 
                              />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-bold text-[#F2F3F5] truncate leading-tight">
                              {item.master.name}
                            </span>
                            <span className="text-[10px] font-mono text-[#80848E]">
                              {isSandbox ? "Sandbox Item" : `${share.toFixed(1)}% of total net worth`}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[13px] font-mono font-bold text-[#DBDEE1]">
                            {unitVal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Unit Cards Grid */}
          <div className="flex flex-col gap-6">
            {TIER_ORDER.map(tier => {
              const tierItems = tierGroupedUnits[tier] || [];
              if (tierItems.length === 0) return null;
              const isCollapsed = collapsedTiers[tier];
              const tierCfg = TIER_CONFIG[tier] || { badgeColor: "#5865F2", label: tier };
              
              const totalInTier = ALL_UNITS.filter(u => getTier(u) === tier).length;
              const uniqueCollected = new Set(tierItems.map(i => i.unit_id)).size;
              const progressPct = totalInTier > 0 ? (uniqueCollected / totalInTier) * 100 : 0;

              return (
                <div key={tier} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-[3px] h-[16px] rounded-full" style={{ backgroundColor: tierCfg.badgeColor }} />
                    <h3 className="text-[15px] font-black uppercase tracking-wider text-[#F2F3F5] leading-none mt-0.5">{tierCfg.label}</h3>
                    <span className="text-[11px] font-bold text-[#80848E] bg-[#1E1F22] px-2 py-0.5 rounded-[4px] border border-[rgba(255,255,255,0.04)] ml-1">
                      {tierItems.reduce((s, i) => s + i.quantity, 0)} Units
                    </span>
                    
                    {!isSandbox && (
                      <div className="hidden md:flex items-center gap-2 ml-4">
                        <span className="text-[10px] font-mono text-[#80848E]">{uniqueCollected} / {totalInTier} Collected</span>
                        <div className="w-20 h-1.5 bg-[#1E1F22] rounded-full overflow-hidden">
                           <div className="h-full bg-[#5865F2] rounded-full" style={{ width: `${progressPct}%`, backgroundColor: tierCfg.badgeColor }} />
                        </div>
                      </div>
                    )}

                    <div className="flex-1 h-px bg-[rgba(255,255,255,0.04)] ml-2" />
                    <button
                      onClick={() => setCollapsedTiers(prev => ({ ...prev, [tier]: !prev[tier] }))}
                      className="p-1 rounded-[4px] hover:bg-[#1E1F22] text-[#80848E] hover:text-[#DBDEE1] transition-colors focus-visible:outline-none"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 animate-fade-in">
                      {tierItems.map((item, idx) => {
                        const stagedGive = giveItems.find(g => g.id === item.unit_id)?.qty || 0;
                        const stagedGet = getItems.find(g => g.id === item.unit_id)?.qty || 0;

                        return (
                          <TradingCardSlot 
                            key={`${item.unit_id}-${idx}`} 
                            item={item} 
                            master={item.master} 
                            onInspect={(it, mst) => setInspectTarget({ item: it, master: mst })}
                            isSelectMode={isSelectMode}
                            isSelected={selectedUnits.has(item.id)}
                            toggleSelect={toggleSelectUnit}
                            stagedGiveQty={stagedGive}
                            stagedGetQty={stagedGet}
                            onQtyChange={handleQtyChange}
                            isSandbox={isSandbox}
                            isReadOnly={isReadOnly}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Persistent Action Dock for Selection Mode */}
      {isSelectMode && (
        <div className="fixed bottom-0 left-0 right-0 z-[80] p-4 pointer-events-none">
          <div className="max-w-2xl mx-auto bg-[#1E1F22] border border-[rgba(255,255,255,0.1)] p-3 rounded-[8px] shadow-2xl pointer-events-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-bold text-[#F2F3F5]">
                {selectedUnits.size} Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                disabled={selectedUnits.size === 0}
                onClick={() => handleSendToAnalyzer("give")}
                className="px-4 py-2 bg-[#FAA61A] hover:bg-[#d98b14] disabled:bg-[#2B2D31] disabled:text-[#80848E] text-white text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none"
              >
                To Give
              </button>
              <button 
                disabled={selectedUnits.size === 0}
                onClick={() => handleSendToAnalyzer("get")}
                className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#2B2D31] disabled:text-[#80848E] text-white text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none"
              >
                To Get
              </button>
              <button 
                onClick={() => { setIsSelectMode(false); setSelectedUnits(new Set()); }}
                className="p-2 text-[#80848E] hover:text-[#F2F3F5] rounded-[4px] hover:bg-[rgba(255,255,255,0.05)] ml-1 focus-visible:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mass Import Modal */}
      {importMenuOpen && !isReadOnly && (
        <div className="absolute inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setImportMenuOpen(false)} />
          <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.06)] rounded-[12px] w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative z-10 flex flex-col overflow-hidden animate-slide-up">
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.04)] bg-[#1E1F22]">
              <div className="flex items-center gap-2 text-[#F2F3F5]">
                <UploadCloud className="w-5 h-5 text-[#5865F2]" />
                <h3 className="text-[15px] font-bold tracking-tight">Mass Import</h3>
              </div>
              <button onClick={() => setImportMenuOpen(false)} className="text-[#80848E] hover:text-[#DBDEE1] p-1 focus-visible:outline-none"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <p className="text-[13px] text-[#949BA4] leading-relaxed">
                Paste your inventory text below. The parser automatically detects unit names and quantities (e.g. <strong className="text-[#DBDEE1]">"3x Koku Drip, 1 Death"</strong>).
              </p>
              
              <textarea
                ref={importInputRef}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste items here..."
                className="w-full h-[120px] bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[6px] p-3 text-[13px] text-[#F2F3F5] outline-none focus:border-[#5865F2] resize-none custom-scrollbar shadow-inner"
              />

              <div className="min-h-[60px] bg-[#111214] rounded-[6px] p-3 border border-[rgba(255,255,255,0.02)] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#80848E] uppercase tracking-wider">Live Parser Output</span>
                  <span className="text-[12px] font-mono font-bold text-[#5865F2]">{parsedImportItems.length} Found</span>
                </div>
                {parsedImportItems.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {parsedImportItems.map((item, i) => (
                      <span key={i} className="text-[10px] font-bold bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 px-2 py-0.5 rounded-[3px] truncate max-w-[120px]">
                        x{item.qty} {item.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-[#4E5058] italic mt-1">Waiting for valid input...</span>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-[rgba(255,255,255,0.04)] bg-[#1E1F22] flex justify-end gap-2">
              <button onClick={() => setImportMenuOpen(false)} className="px-4 py-2 rounded-[4px] text-[12px] font-bold text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.04)] focus-visible:outline-none">Cancel</button>
              <button 
                onClick={executeMassImport}
                disabled={parsedImportItems.length === 0 || isImporting}
                className="px-5 py-2 rounded-[4px] text-[12px] font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#1E1F22] disabled:text-[#80848E] shadow-sm flex items-center gap-2 focus-visible:outline-none"
              >
                {isImporting ? "Importing..." : <><Check className="w-3.5 h-3.5" /> Import Items</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {inspectTarget && (
        <div className="absolute inset-0 z-[100000] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setInspectTarget(null)} />
          <div className="relative w-full md:max-w-xl max-h-[88vh] overflow-y-auto custom-scrollbar bg-[#2B2D31] rounded-t-[12px] md:rounded-[8px] p-5 shadow-2xl border-t md:border border-[rgba(255,255,255,0.08)] z-10 flex flex-col gap-4">
            
            <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-[rgba(255,255,255,0.2)] rounded-full" />

            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-3">
              <div className="flex items-center gap-3.5 min-w-0 pr-4">
                <div className="w-12 h-12 rounded-[4px] overflow-hidden bg-[#111214] border border-[rgba(255,255,255,0.08)] shrink-0 relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[14px] z-0" style={getAvatarStyle(inspectTarget.master.name)}>
                    {getInitials(inspectTarget.master.name)}
                  </div>
                  {getProxyImage(inspectTarget.master.id, inspectTarget.master.imageUrl) && (
                    <img src={getProxyImage(inspectTarget.master.id, inspectTarget.master.imageUrl)!} alt="" className="absolute inset-0 w-full h-full object-cover z-10 bg-[#111214]" onError={(e) => handleImageError(e, inspectTarget.master.id)} />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[17px] font-black text-[#F2F3F5] tracking-tight truncate">{inspectTarget.master.name}</span>
                    {inspectTarget.master.status && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] uppercase tracking-wider" style={{ background: GRID_STATUS_CFG[inspectTarget.master.status as keyof typeof GRID_STATUS_CFG]?.bg, color: GRID_STATUS_CFG[inspectTarget.master.status as keyof typeof GRID_STATUS_CFG]?.color }}>
                        {inspectTarget.master.status}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#949BA4] truncate">{inspectTarget.master.subtitle || "Unit"}</span>
                </div>
              </div>
              <button onClick={() => setInspectTarget(null)} className="p-1 text-[#949BA4] hover:text-white transition-colors focus-visible:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[6px] p-3 flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#80848E]">Individual Unit Value</span>
                <span className="text-[18px] font-black font-mono text-[#F2F3F5] mt-1">
                  {inspectTarget.master.valueDisplay || (typeof inspectTarget.master.value === 'number' ? inspectTarget.master.value.toLocaleString() : inspectTarget.master.value)}
                </span>
                <span className="text-[11px] text-[#949BA4] mt-1">Vault Subtotal: <strong className="text-[#DBDEE1] font-mono">{(getUnitConservativeValue(inspectTarget.master) * inspectTarget.item.quantity).toLocaleString()}</strong></span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[6px] p-3 flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#80848E]">Rarity (0-20)</span>
                  <span className="text-[14px] font-black font-mono text-[#4DB6AC] mt-1">{inspectTarget.master.rarity ?? "N/A"}</span>
                </div>
                <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[6px] p-3 flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#80848E]">Liquidity</span>
                  <span className="text-[13px] font-black font-mono text-[#DBDEE1] mt-1 uppercase">{inspectTarget.master.liquidity ?? "Average"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 bg-[#1E1F22] p-3.5 rounded-[6px] border border-[rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#949BA4] uppercase tracking-wider">Vault Quantity</span>
                {!isReadOnly ? (
                  <QuantitySelector 
                    qty={inspectTarget.item.quantity} 
                    onChange={(newQty) => handleQtyChange(inspectTarget.item.unit_id, newQty - inspectTarget.item.quantity)} 
                    minQty={0} 
                  />
                ) : (
                  <span className="font-mono font-bold text-[#DBDEE1]">x{inspectTarget.item.quantity}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[rgba(255,255,255,0.04)]">
                <button 
                  disabled={inspectTarget.item.is_pinned}
                  onClick={() => handleSendToAnalyzer("give")} 
                  className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-white bg-[#FAA61A] hover:bg-[#d98b14] disabled:bg-[rgba(255,255,255,0.04)] disabled:text-[#80848E] transition-colors focus-visible:outline-none"
                >
                  <ArrowUpCircle className="w-4 h-4" /> To Give
                </button>
                <button 
                  disabled={inspectTarget.item.is_pinned}
                  onClick={() => handleSendToAnalyzer("get")} 
                  className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[rgba(255,255,255,0.04)] disabled:text-[#80848E] transition-colors focus-visible:outline-none"
                >
                  <ArrowDownCircle className="w-4 h-4" /> To Get
                </button>
              </div>

              {!isReadOnly && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => handleTogglePin(inspectTarget.item.unit_id, inspectTarget.item.is_pinned)} className={`flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold border focus-visible:outline-none ${inspectTarget.item.is_pinned ? 'bg-[rgba(237,66,69,0.1)] text-[#ed4245] border-[rgba(237,66,69,0.3)]' : 'bg-[#2B2D31] text-[#DBDEE1] border-[rgba(255,255,255,0.04)] hover:bg-[#35373C]'}`}>
                    {inspectTarget.item.is_pinned ? <LockIcon className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    <span>{inspectTarget.item.is_pinned ? "Locked" : "Lock"}</span>
                  </button>
                  <button onClick={() => handleRemove(inspectTarget.item, inspectTarget.master)} className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-[#80848E] hover:text-[#DBDEE1] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.04)] focus-visible:outline-none">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              )}
            </div>

            <div className="w-full h-[env(safe-area-inset-bottom)] md:hidden mt-1" />
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toast && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] w-max max-w-[90vw]">
          <div className={`bg-[#111214] border px-4 py-2 rounded-[6px] shadow-2xl flex items-center gap-4 ${toast.isError ? 'border-[rgba(237,66,69,0.3)]' : 'border-[rgba(255,255,255,0.08)]'}`}>
            <span className="text-[13px] font-medium text-[#DBDEE1]">
              {toast.message}
            </span>
            {toast.itemToRestore && !isReadOnly && (
              <button onClick={handleUndo} className="text-[12px] font-bold text-[#5865F2] hover:underline focus-visible:outline-none">Undo</button>
            )}
            <button onClick={() => setToast(null)} className="text-[#80848E] hover:text-[#DBDEE1] focus-visible:outline-none">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}