import { useState, useMemo, useRef, useCallback, memo } from "react";
import { Package, Search, Trash2, Pin, Plus, ArrowUpDown, Info, Settings2, AlertTriangle, X, Wand2, UploadCloud, Check, ChevronDown, Copy, ArrowUpCircle, ArrowDownCircle, History, TrendingUp } from "lucide-react";
import { useInventoryStore, InventoryItem } from "../../store/useInventoryStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useUnits } from "../../context/UnitContext";
import { getProxyImage, handleImageError, TIER_CONFIG, getTier, FILTERS, GRID_STATUS_CFG } from "../../data";
import { getAvatarStyle, getInitials } from "./TradeAnalyzer/summaryUtils";
import { QuantitySelector } from "./ui/QuantitySelector";
import { CustomDropdown, useClickOutside } from "./MainCanvas/CustomDropdown";
import { StatusIcon, JargonWrap } from "./MainCanvas/UnitGrid";
import { FilterKey, MasterUnit } from "../../types";
import { parseSmartTrade } from "./TradeAnalyzer/smartParser";
import { triggerHaptic } from "../../data/helpers";

const SORT_OPTIONS = {
  "value-desc": "Value: High to Low",
  "value-asc": "Value: Low to High",
  "alpha-asc": "Alphabetical (A-Z)",
  "recent-desc": "Recently Added"
};

const TIER_ORDER: FilterKey[] = ["S", "A", "B", "C", "Pure", "Oddities", "Untiered"];

// --- Compact Draggable RPG Inventory Slot Component ---
const VaultSlot = memo(({ 
  item, master, onInspect 
}: { 
  item: InventoryItem; master: MasterUnit; 
  onInspect: (item: InventoryItem, master: MasterUnit) => void;
}) => {
  const tierKey = getTier(master);
  const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "#5865F2";
  const proxyUrl = getProxyImage(master.id, master.imageUrl);
  const dropCfg = master.status ? GRID_STATUS_CFG[master.status as keyof typeof GRID_STATUS_CFG] : null;

  const handleDragStart = (e: React.DragEvent) => {
    const numericValue = typeof master.value === "number" ? master.value : master.valueMin || 0;
    const popupUnit = { id: master.id, name: master.name, subtitle: master.subtitle, value: numericValue };
    e.dataTransfer.setData("unit", JSON.stringify(popupUnit));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onInspect(item, master)}
      className="group relative flex flex-col items-center bg-[#1E1F22] hover:bg-[#2B2D31] rounded-[8px] p-2 transition-all border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] text-left cursor-grab active:cursor-grabbing overflow-hidden aspect-square shadow-sm"
    >
      {item.is_pinned && (
        <div className="absolute inset-0 border-2 border-[#5865F2] rounded-[8px] pointer-events-none z-20 shadow-[inset_0_0_8px_rgba(88,101,242,0.3)]" />
      )}
      <div className="absolute top-0 left-0 right-0 h-[3px] z-20" style={{ backgroundColor: tierColor }} />

      <div className="w-full flex-1 rounded-[6px] bg-[#111214] overflow-hidden relative flex items-center justify-center border border-[rgba(255,255,255,0.04)] mt-1">
        <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[12px] z-0" style={getAvatarStyle(master.name)}>
          {getInitials(master.name)}
        </div>
        {proxyUrl && (
          <img src={proxyUrl} alt={master.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-[#111214]" onError={(e) => handleImageError(e, master.id)} />
        )}

        {dropCfg && (
          <div 
            className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-[1px] rounded-[3px] z-30 shadow-md pointer-events-none"
            style={{ background: dropCfg.bg, border: `1px solid ${dropCfg.border}` }}
          >
            <StatusIcon status={master.status} />
            <span className="text-[7.5px] font-bold leading-none uppercase tracking-wide hidden sm:inline-block" style={{ color: dropCfg.color }}>
              {dropCfg.label}
            </span>
          </div>
        )}

        <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-md text-white font-mono font-black text-[10px] px-1.5 py-0.5 rounded-[4px] z-30 border border-white/10 shadow-md">
          x{item.quantity}
        </div>

        {item.is_pinned && (
          <div className="absolute top-1.5 left-1.5 bg-[#5865F2] text-white p-1 rounded-full z-30 shadow-sm">
            <Pin className="w-2.5 h-2.5 fill-current" />
          </div>
        )}
      </div>

      <div className="w-full mt-1.5 px-0.5 flex flex-col min-w-0">
        <span className="text-[11px] font-bold text-[#F2F3F5] truncate leading-tight">{master.name}</span>
      </div>
    </div>
  );
});

export function InventoryChannel() {
  const { units: ALL_UNITS } = useUnits();
  const { items, addOrUpdateUnit, removeUnit, togglePin, restoreItem, clearInventory, clearUnpinned } = useInventoryStore();
  const addCard = useTradeStore(state => state.addCard);
  const { profile } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTierFilter, setActiveTierFilter] = useState<FilterKey | "Pinned">("All");
  const [sortMode, setSortMode] = useState("value-desc");
  const [collapsedTiers, setCollapsedTiers] = useState<Record<string, boolean>>({});

  // Inspect Modal State
  const [inspectTarget, setInspectTarget] = useState<{ item: InventoryItem; master: MasterUnit } | null>(null);
  const [showValueHistory, setShowValueHistory] = useState(false);

  // Omnibox State
  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const [omniboxIndex, setOmniboxIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const omniboxRef = useRef<HTMLDivElement>(null);
  useClickOutside(omniboxRef, () => setIsOmniboxOpen(false));

  // Mass Import State
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLTextAreaElement>(null);

  // Manage Menu State
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState<"unpinned" | "all" | null>(null);
  const manageRef = useRef<HTMLDivElement>(null);
  useClickOutside(manageRef, () => { setManageOpen(false); setConfirmClear(null); });

  // Toast System
  const [toast, setToast] = useState<{ id: number, message: string, isError: boolean, itemToRestore?: InventoryItem } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, isError = false, itemToRestore?: InventoryItem) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message, isError, itemToRestore });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const handleUndo = useCallback(async () => {
    if (toast?.itemToRestore && profile) {
      try {
        await restoreItem(toast.itemToRestore);
        setToast(null);
      } catch (e) { showToast("Failed to restore unit.", true); }
    }
  }, [toast, profile, restoreItem, showToast]);

  const handleQtyChange = useCallback(async (unitId: string, delta: number) => {
    if (!profile || delta === 0) return;
    try { 
      await addOrUpdateUnit(profile.id, unitId, delta);
      setInspectTarget(prev => {
        if (!prev || prev.item.unit_id !== unitId) return prev;
        const updatedQty = prev.item.quantity + delta;
        if (updatedQty <= 0) return null;
        return { ...prev, item: { ...prev.item, quantity: updatedQty } };
      });
    } catch (e) { showToast("Failed to update quantity. Network error.", true); }
  }, [profile, addOrUpdateUnit, showToast]);

  const handleTogglePin = useCallback(async (unitId: string, status: boolean) => {
    if (!profile) return;
    try { 
      await togglePin(profile.id, unitId, status); 
      setInspectTarget(prev => prev && prev.item.unit_id === unitId ? { ...prev, item: { ...prev.item, is_pinned: !status } } : prev);
    } catch (e) { showToast("Failed to pin unit.", true); }
  }, [profile, togglePin, showToast]);

  const handleRemove = useCallback(async (item: InventoryItem, master: MasterUnit) => {
    if (!profile) return;
    try {
      await removeUnit(profile.id, item.unit_id);
      setInspectTarget(null);
      showToast(`Removed ${master.name}`, false, item);
    } catch (e) { showToast("Failed to remove unit.", true); }
  }, [profile, removeUnit, showToast]);

  const handleClearAction = useCallback(async () => {
    if (!profile || !confirmClear) return;
    try {
      if (confirmClear === "unpinned") await clearUnpinned(profile.id);
      if (confirmClear === "all") await clearInventory(profile.id);
      setManageOpen(false);
      setConfirmClear(null);
    } catch (e) { showToast("Failed to clear inventory.", true); }
  }, [profile, confirmClear, clearUnpinned, clearInventory, showToast]);

  // Derived Data
  const getUnitConservativeValue = (master: MasterUnit): number => {
    if (master.value === "owner" || master.valueDisplay === "Owner's Choice" || master.valueDisplay === "O/C") return 0;
    if (typeof master.value === "number" && master.value > 0) return master.value;
    if (typeof master.valueMin === "number" && master.valueMin > 0) return master.valueMin;
    return 0; 
  };

  const { resolvedInventory, estimatedValue, totalQuantity, uniqueCount, unpinnedCount } = useMemo(() => {
    let estVal = 0, totQty = 0, unpinned = 0;
    const resolved = items.map(item => {
      const master = ALL_UNITS.find(u => u.id === item.unit_id);
      if (master) {
        totQty += item.quantity;
        estVal += getUnitConservativeValue(master) * item.quantity;
        if (!item.is_pinned) unpinned++;
      }
      return { ...item, master };
    }).filter(i => i.master !== undefined) as (typeof items[0] & { master: MasterUnit })[];

    return { resolvedInventory: resolved, estimatedValue: estVal, totalQuantity: totQty, uniqueCount: resolved.length, unpinnedCount: unpinned };
  }, [items, ALL_UNITS]);

  const handleCopyVault = useCallback(() => {
    const text = `My Vault (Est. Value: ${estimatedValue.toLocaleString()}):\n` +
      resolvedInventory.map(i => `- ${i.quantity}x ${i.master.name}`).join('\n');
    navigator.clipboard.writeText(text);
    showToast("Vault summary copied to clipboard!");
    setManageOpen(false);
  }, [resolvedInventory, estimatedValue, showToast]);

  const handleSendToAnalyzer = (type: "give" | "get") => {
    if (!inspectTarget) return;
    triggerHaptic('medium');
    const numericValue = getUnitConservativeValue(inspectTarget.master) || (typeof inspectTarget.master.value === "number" ? inspectTarget.master.value : 0);
    addCard(type, {
      id: inspectTarget.master.id,
      name: inspectTarget.master.name,
      subtitle: inspectTarget.master.subtitle,
      value: numericValue,
      qty: 1
    });
    showToast(`Added ${inspectTarget.master.name} to You ${type === "give" ? "Give" : "Get"}!`);
    window.dispatchEvent(new CustomEvent("trade-added", { detail: { name: inspectTarget.master.name, type } }));
    setInspectTarget(null);
  };

  // Processed owned units grouped by Tier
  const tierGroupedUnits = useMemo(() => {
    let filtered = resolvedInventory;
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
  }, [resolvedInventory, searchQuery, activeTierFilter, sortMode]);

  const unownedSearchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const ownedIds = new Set(items.map(i => i.unit_id));
    return ALL_UNITS.filter(u => {
      if (ownedIds.has(u.id)) return false;
      return u.name.toLowerCase().includes(q) || (u.subtitle && u.subtitle.toLowerCase().includes(q)) || (u.aliases && u.aliases.some(a => a.toLowerCase().includes(q)));
    }).slice(0, 10);
  }, [searchQuery, items, ALL_UNITS]);

  const parsedImportItems = useMemo(() => {
    if (!importText.trim()) return [];
    const result = parseSmartTrade(importText, ALL_UNITS);
    return result.giveCards;
  }, [importText, ALL_UNITS]);

  const handleQuickAdd = async (master: MasterUnit) => {
    if (!profile) return;
    try {
      await addOrUpdateUnit(profile.id, master.id, 1);
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
    if (!profile || parsedImportItems.length === 0) return;
    setIsImporting(true);
    let successCount = 0;
    
    for (const item of parsedImportItems) {
      try {
        await addOrUpdateUnit(profile.id, item.id, item.qty);
        successCount++;
      } catch (e) {
        console.error("Failed to import", item.name);
      }
    }
    
    setIsImporting(false);
    setImportMenuOpen(false);
    setImportText("");
    if (successCount > 0) showToast(`Imported ${successCount} items successfully.`, false);
    if (successCount < parsedImportItems.length) showToast(`Failed to import ${parsedImportItems.length - successCount} items.`, true);
  };

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#313338] p-6 text-center">
        <Package className="w-12 h-12 text-[#80848E] mb-3" />
        <h2 className="text-[18px] font-bold text-[#F2F3F5] mb-1">Authentication Required</h2>
        <p className="text-[#949BA4] text-[13px] max-w-sm">Please log in with Discord using the top navigation bar to access your personal unit collection.</p>
      </div>
    );
  }

  // --- EMPTY STATE TAKEOVER ---
  if (uniqueCount === 0 && !importMenuOpen) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#313338] p-4 md:p-6 animate-fade-in relative font-sans">
        <style>{`
          .bg-grid-pattern { background-size: 40px 40px; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px); }
        `}</style>
        <div className="absolute inset-0 bg-grid-pattern z-0" />
        <div className="relative z-10 flex flex-col items-center w-full max-w-xl text-center px-2">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-[12px] bg-[#1E1F22] border border-[#5865F2]/30 flex items-center justify-center shadow-[0_0_40px_rgba(88,101,242,0.15)] mb-5">
            <Package className="w-8 h-8 md:w-10 md:h-10 text-[#5865F2]" />
          </div>
          <h1 className="text-[22px] md:text-[32px] font-black text-[#F2F3F5] tracking-tight mb-2">Welcome to your Vault</h1>
          <p className="text-[#949BA4] text-[13px] md:text-[15px] mb-6 md:mb-8 leading-relaxed max-w-md mx-auto">
            Search for your first unit below to start tracking your net worth, or paste your entire inventory list at once.
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
                      className={`flex items-center gap-3 w-full p-3 rounded-[8px] transition-colors ${isSelected ? 'bg-[#5865F2] text-white shadow-sm' : 'bg-transparent hover:bg-[rgba(255,255,255,0.04)] text-[#F2F3F5]'}`}
                    >
                      <div className="w-8 h-8 rounded-[4px] bg-[#111214] flex items-center justify-center shrink-0 border border-[rgba(255,255,255,0.08)] overflow-hidden">
                        {getProxyImage(u.id, u.imageUrl) ? <img src={getProxyImage(u.id, u.imageUrl)!} alt="" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.opacity = '0'} /> : <span className="text-[9px] font-bold" style={getAvatarStyle(u.name)}>{getInitials(u.name)}</span>}
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
      
      {/* HEADER SECTION */}
      <div className={`flex-shrink-0 flex flex-col bg-[#2B2D31] border-b border-[rgba(0,0,0,0.2)] shadow-sm z-20 relative transition-all duration-300 ${importMenuOpen ? "opacity-30 pointer-events-none blur-sm" : ""}`}>
        
        {/* Top Row */}
        <div className="px-3 md:px-5 py-3 flex items-center justify-between border-b border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-[8px] bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] flex items-center justify-center shadow-inner shrink-0">
              <Package className="w-4 h-4 md:w-5 md:h-5 text-[#5865F2]" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 group relative cursor-help w-fit">
                <span className="text-[9.5px] md:text-[10px] font-bold uppercase tracking-widest text-[#949BA4] truncate">Est. Value: <span className="text-[#DBDEE1] font-mono">{estimatedValue.toLocaleString()}</span></span>
                <Info className="w-3 h-3 text-[#4e5058] group-hover:text-[#DBDEE1] transition-colors shrink-0" />
                <div className="absolute top-full left-0 mt-1 w-[220px] bg-[#111214] border border-[rgba(255,255,255,0.08)] text-[#DBDEE1] text-[10.5px] p-2.5 rounded-[6px] shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 leading-relaxed font-medium">
                  Calculated using minimum range values. Owner's Choice and unavailable units are excluded from this sum.
                </div>
              </div>
              <h2 className="text-[15px] md:text-[17px] font-black text-[#F2F3F5] tracking-tight truncate">
                My Inventory <span className="text-[#80848E] font-bold text-[12px] md:text-[14px]">({uniqueCount}u / {totalQuantity}t)</span>
              </h2>
            </div>
          </div>

          {/* Manage Dropdown */}
          <div className="relative shrink-0" ref={manageRef}>
            <button 
              onClick={() => setManageOpen(!manageOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] ${manageOpen || confirmClear ? 'bg-[rgba(255,255,255,0.08)] text-[#F2F3F5]' : 'bg-[rgba(255,255,255,0.04)] text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.08)]'}`}
            >
              <Settings2 className="w-3.5 h-3.5" /> Manage
            </button>
            
            {manageOpen && (
              <div className="absolute top-full right-0 mt-2 w-[260px] bg-[#2B2D31] border border-[rgba(255,255,255,0.08)] shadow-2xl rounded-[8px] p-1.5 z-50 animate-fade-in flex flex-col">
                {confirmClear ? (
                  <div className="p-3 bg-[rgba(237,66,69,0.1)] border border-[rgba(237,66,69,0.2)] rounded-[6px] flex flex-col gap-3">
                    <span className="text-[12.5px] text-[#F2F3F5] font-medium leading-snug">
                      Remove {confirmClear === "unpinned" ? <span className="font-bold text-[#ed4245]">{unpinnedCount} unpinned</span> : <span className="font-bold text-[#ed4245]">all {uniqueCount}</span>} units? This cannot be undone.
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setConfirmClear(null)} className="flex-1 px-3 py-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded-[4px] text-[12px] font-bold text-[#DBDEE1] transition-colors focus-visible:outline-none">Cancel</button>
                      <button onClick={handleClearAction} className="flex-1 px-3 py-2 bg-[#ed4245] hover:bg-[#c9383a] rounded-[4px] text-[12px] font-bold text-white transition-colors focus-visible:outline-none">Clear</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={handleCopyVault} className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-semibold text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.04)] transition-colors focus-visible:outline-none flex items-center justify-between">
                      Copy Vault Summary <Copy className="w-3.5 h-3.5 text-[#80848E]" />
                    </button>
                    <div className="w-full h-px bg-[rgba(255,255,255,0.04)] my-1" />
                    <button onClick={() => { if (unpinnedCount > 0) setConfirmClear("unpinned"); }} disabled={unpinnedCount === 0} className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-semibold text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none flex items-center justify-between">
                      Clear Unpinned <span className="text-[#80848E] font-mono font-bold text-[11px]">{unpinnedCount}</span>
                    </button>
                    <div className="w-full h-px bg-[rgba(255,255,255,0.04)] my-1" />
                    <button onClick={() => { if (uniqueCount > 0) setConfirmClear("all"); }} disabled={uniqueCount === 0} className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-semibold text-[#ed4245] hover:bg-[rgba(237,66,69,0.1)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none flex items-center justify-between">
                      Clear Entire Inventory <span className="text-[#ed4245] opacity-70 font-mono font-bold text-[11px]">{uniqueCount}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between px-3 md:px-5 py-2.5 md:py-3 gap-2.5">
          
          <div className="flex flex-nowrap gap-1.5 md:gap-2 overflow-x-auto hide-scrollbar pb-1 -mb-1 w-full xl:w-auto snap-x snap-mandatory pr-6 mask-fade-edges" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button 
              onClick={() => setActiveTierFilter("Pinned")} 
              className="snap-start flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] md:text-[12px] font-bold tracking-wide transition-all duration-200 ease-out active:scale-95 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]" 
              style={activeTierFilter === "Pinned" ? { background: "#5865F2", color: "#fff", borderColor: "#5865F2", boxShadow: "0 4px 12px rgba(88,101,242,0.3)" } : { background: "rgba(255,255,255,0.03)", color: "#FAA61A", borderColor: "rgba(250,166,26,0.3)" }}
            >
              ⭐ Pinned
            </button>
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setActiveTierFilter(f)} className="snap-start flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] md:text-[12px] font-bold tracking-wide transition-all duration-200 ease-out active:scale-95 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]" style={activeTierFilter === f ? { background: "#5865F2", color: "#fff", borderColor: "#5865F2", boxShadow: "0 4px 12px rgba(88,101,242,0.3)" } : { background: "rgba(255,255,255,0.03)", color: "#949BA4", borderColor: "rgba(255,255,255,0.05)" }}>
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
                  placeholder="Search or quick add..."
                  className="w-full bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-full pl-9 pr-3 py-1 text-[13px] text-[#F2F3F5] outline-none placeholder-[#80848E] focus:ring-1 focus:ring-[#5865F2] transition-all shadow-inner h-[36px] md:h-[30px]"
                />
              </div>

              <button 
                onClick={() => { setImportMenuOpen(true); setTimeout(() => importInputRef.current?.focus(), 100); }} 
                className="w-[36px] h-[36px] md:w-[30px] md:h-[30px] shrink-0 bg-[rgba(255,255,255,0.04)] hover:bg-[#5865F2] text-[#80848E] hover:text-white rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                title="Mass Import from Text"
              >
                <Wand2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
              </button>

              {/* Omnibox Dropdown */}
              {isOmniboxOpen && searchQuery && unownedSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-10 mt-1 max-h-[300px] overflow-y-auto custom-scrollbar bg-[#2B2D31] border border-[rgba(255,255,255,0.08)] rounded-[8px] shadow-[0_12px_40px_rgba(0,0,0,0.4)] z-[99999] flex flex-col p-1.5 text-left">
                  {unownedSearchResults.map((u, i) => {
                    const isSelected = i === omniboxIndex;
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleQuickAdd(u)}
                        onMouseEnter={() => setOmniboxIndex(i)}
                        className={`flex items-center gap-2.5 w-full p-2 rounded-[6px] transition-colors focus-visible:outline-none ${isSelected ? 'bg-[#5865F2] text-white shadow-sm' : 'bg-transparent hover:bg-[rgba(255,255,255,0.04)] text-[#F2F3F5]'}`}
                      >
                        <div className="w-6 h-6 rounded-[4px] bg-[#111214] flex items-center justify-center shrink-0 border border-[rgba(255,255,255,0.08)] overflow-hidden">
                          {getProxyImage(u.id, u.imageUrl) ? <img src={getProxyImage(u.id, u.imageUrl)!} alt="" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.opacity = '0'} /> : <span className="text-[7px] font-bold" style={getAvatarStyle(u.name)}>{getInitials(u.name)}</span>}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[12px] font-bold truncate leading-tight">{u.name}</span>
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

      {/* MASS IMPORT MODAL */}
      {importMenuOpen && (
        <div className="absolute inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setImportMenuOpen(false)} />
          <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.06)] rounded-[12px] w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative z-10 flex flex-col overflow-hidden animate-slide-up">
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.04)] bg-[#1E1F22]">
              <div className="flex items-center gap-2 text-[#F2F3F5]">
                <UploadCloud className="w-5 h-5 text-[#5865F2]" />
                <h3 className="text-[15px] font-bold tracking-tight">Mass Import</h3>
              </div>
              <button onClick={() => setImportMenuOpen(false)} className="text-[#80848E] hover:text-[#DBDEE1] p-1 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <p className="text-[13px] text-[#949BA4] leading-relaxed">
                Paste your inventory list below. The Smart Parser will automatically read unit names and quantities (e.g., <strong className="text-[#DBDEE1]">"3x Koku Drip, 1 Death"</strong>).
              </p>
              
              <textarea
                ref={importInputRef}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste items here..."
                className="w-full h-[140px] bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[6px] p-3 text-[13px] text-[#F2F3F5] outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2] resize-none custom-scrollbar shadow-inner"
              />

              {importText.trim().length > 0 && (
                <div className="bg-[#111214] border border-[rgba(255,255,255,0.02)] rounded-[6px] p-3 flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#80848E] uppercase tracking-widest">Items Detected</span>
                  <span className="text-[13px] font-mono font-bold text-[#5865F2]">{parsedImportItems.length}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.04)] bg-[#1E1F22] flex justify-end gap-2">
              <button onClick={() => setImportMenuOpen(false)} className="px-5 py-2.5 rounded-[4px] text-[13px] font-bold text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.04)] transition-colors">Cancel</button>
              <button 
                onClick={executeMassImport}
                disabled={parsedImportItems.length === 0 || isImporting}
                className="px-6 py-2.5 rounded-[4px] text-[13px] font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[rgba(255,255,255,0.04)] disabled:text-[#80848E] disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
              >
                {isImporting ? "Importing..." : <><Check className="w-4 h-4" /> Import Units</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTION MODAL / ACTION SHEET (Desktop-Optimized Wide Layout & Mobile Sheet) */}
      {inspectTarget && (
        <div className="absolute inset-0 z-[100000] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => { setInspectTarget(null); setShowValueHistory(false); }} />
          <div className="relative w-full md:max-w-2xl max-h-[88vh] overflow-y-auto custom-scrollbar bg-[#2B2D31] rounded-t-[24px] md:rounded-[16px] p-5 md:p-7 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] md:shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-slide-up border-t md:border border-[rgba(255,255,255,0.08)] z-10 flex flex-col gap-4">
            
            <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-[rgba(255,255,255,0.2)] rounded-full" />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-3">
              <div className="flex items-center gap-3.5 min-w-0 pr-4">
                <div className="w-14 h-14 rounded-[8px] overflow-hidden bg-[#111214] border border-[rgba(255,255,255,0.1)] shadow-sm shrink-0 relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[14px] z-0" style={getAvatarStyle(inspectTarget.master.name)}>
                    {getInitials(inspectTarget.master.name)}
                  </div>
                  {getProxyImage(inspectTarget.master.id, inspectTarget.master.imageUrl) && (
                    <img src={getProxyImage(inspectTarget.master.id, inspectTarget.master.imageUrl)!} alt="" className="absolute inset-0 w-full h-full object-cover z-10 bg-[#111214]" onError={(e) => handleImageError(e, inspectTarget.master.id)} />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[18px] font-black text-[#F2F3F5] tracking-tight truncate">{inspectTarget.master.name}</span>
                    {inspectTarget.master.status && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] uppercase tracking-wider" style={{ background: GRID_STATUS_CFG[inspectTarget.master.status as keyof typeof GRID_STATUS_CFG]?.bg, color: GRID_STATUS_CFG[inspectTarget.master.status as keyof typeof GRID_STATUS_CFG]?.color }}>
                        {inspectTarget.master.status}
                      </span>
                    )}
                  </div>
                  <span className="text-[11.5px] font-bold uppercase tracking-wider text-[#949BA4] truncate">{inspectTarget.master.subtitle || "Unit"}</span>
                </div>
              </div>
              <button onClick={() => { setInspectTarget(null); setShowValueHistory(false); }} className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#949BA4] shrink-0 active:scale-90 hover:bg-[rgba(255,255,255,0.1)] transition-colors focus-visible:outline-none">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              <div className="flex flex-col gap-3">
                <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-4 flex flex-col gap-1 shadow-inner">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#80848E]">Current Value</span>
                  <span className="text-[18px] font-black font-mono text-[#F2F3F5]">
                    {inspectTarget.master.valueDisplay || (typeof inspectTarget.master.value === 'number' ? inspectTarget.master.value.toLocaleString() : inspectTarget.master.value)}
                  </span>
                  <span className="text-[11.5px] text-[#949BA4] font-medium">Vault Total: <strong className="text-[#DBDEE1] font-mono">{(getUnitConservativeValue(inspectTarget.master) * inspectTarget.item.quantity).toLocaleString()}</strong></span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-3 flex flex-col">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#80848E]">Rarity (0-20)</span>
                    <span className="text-[15px] font-black font-mono text-[#5865F2] mt-0.5">{inspectTarget.master.rarity ?? "N/A"}</span>
                  </div>
                  <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-3 flex flex-col">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#80848E]">Liquidity</span>
                    <span className="text-[15px] font-black font-mono text-[#DBDEE1] mt-0.5">{inspectTarget.master.liquidity ?? "Avg"}</span>
                  </div>
                </div>

                {inspectTarget.master.notice && (
                  <div className="bg-[rgba(88,101,242,0.08)] border border-[rgba(88,101,242,0.2)] rounded-[8px] p-3 flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5865F2] flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Notice</span>
                    <span className="text-[12px] text-[#DBDEE1] leading-relaxed">{inspectTarget.master.notice}</span>
                  </div>
                )}
              </div>

              <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-5 flex flex-col items-center justify-center text-center relative min-h-[160px] shadow-inner">
                <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.04)] flex items-center justify-center text-[#80848E] mb-2">
                  <TrendingUp className="w-5 h-5 text-[#5865F2]" />
                </div>
                <h4 className="text-[14px] font-bold text-[#F2F3F5] tracking-tight mb-1">Tracking Initiated</h4>
                <p className="text-[12px] text-[#949BA4] leading-relaxed max-w-[240px]">
                  Baseline snapshot recorded for {inspectTarget.master.name}. Trend charts will generate as market shifts happen.
                </p>
              </div>

            </div>

            {/* Action Bar */}
            <div className="flex flex-col gap-3.5 bg-[#1E1F22] p-4 rounded-[10px] border border-[rgba(255,255,255,0.04)] shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#949BA4] uppercase tracking-wider">Adjust Quantity</span>
                <QuantitySelector 
                  qty={inspectTarget.item.quantity} 
                  onChange={(newQty) => handleQtyChange(inspectTarget.item.unit_id, newQty - inspectTarget.item.quantity)} 
                  minQty={0} 
                />
              </div>

              {/* Send to Trade Analyzer Actions */}
              <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-[rgba(255,255,255,0.04)]">
                <button 
                  onClick={() => handleSendToAnalyzer("give")}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-[6px] text-[12.5px] font-bold text-white bg-[#FAA61A] hover:bg-[#d98b14] transition-colors shadow-sm"
                >
                  <ArrowUpCircle className="w-4 h-4" /> + Give
                </button>
                <button 
                  onClick={() => handleSendToAnalyzer("get")}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-[6px] text-[12.5px] font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] transition-colors shadow-sm"
                >
                  <ArrowDownCircle className="w-4 h-4" /> + Get
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-[rgba(255,255,255,0.04)]">
                <button 
                  onClick={() => handleTogglePin(inspectTarget.item.unit_id, inspectTarget.item.is_pinned)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-[6px] text-[13px] font-bold transition-colors border ${inspectTarget.item.is_pinned ? 'bg-[rgba(88,101,242,0.15)] text-[#5865F2] border-[rgba(88,101,242,0.4)]' : 'bg-[#2B2D31] text-[#DBDEE1] border-[rgba(255,255,255,0.04)] hover:bg-[#3F4147]'}`}
                >
                  <Pin className="w-4 h-4" style={{ fill: inspectTarget.item.is_pinned ? "currentColor" : "none" }} />
                  <span>{inspectTarget.item.is_pinned ? "Pinned" : "Pin Unit"}</span>
                </button>

                <button 
                  onClick={() => handleRemove(inspectTarget.item, inspectTarget.master)}
                  className="flex items-center justify-center gap-2 py-3 rounded-[6px] text-[13px] font-bold text-[#ed4245] bg-[rgba(237,66,69,0.1)] hover:bg-[rgba(237,66,69,0.2)] border border-[rgba(237,66,69,0.2)] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove</span>
                </button>
              </div>
            </div>

            <div className="w-full h-[env(safe-area-inset-bottom)] md:hidden mt-1" />
          </div>
        </div>
      )}

      {/* OWNED TIER-GROUPED POCKETS GRID */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar p-3 md:p-6 relative z-0 transition-all duration-300 ${importMenuOpen ? "opacity-30 pointer-events-none blur-sm" : ""}`}>
        {uniqueCount === 0 && searchQuery === "" ? (
          <div className="flex flex-col items-center justify-center h-full opacity-60 mt-10">
            <Package className="w-16 h-16 text-[#4e5058] mb-4" />
            <p className="text-[#F2F3F5] text-[15px] font-bold">No units found</p>
            <p className="text-[#949BA4] text-[13px] mt-1 text-center max-w-sm">Adjust your filters to see more units.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {TIER_ORDER.map(tier => {
              const tierItems = tierGroupedUnits[tier] || [];
              if (tierItems.length === 0) return null;
              const isCollapsed = collapsedTiers[tier];
              const tierCfg = TIER_CONFIG[tier] || { badgeColor: "#5865F2", label: tier };

              return (
                <div key={tier} className="flex flex-col gap-3">
                  {/* Tier Pocket Header */}
                  <button
                    onClick={() => setCollapsedTiers(prev => ({ ...prev, [tier]: !prev[tier] }))}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-[6px] bg-[#2B2D31] hover:bg-[#3F4147] border border-[rgba(255,255,255,0.04)] transition-colors group focus-visible:outline-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: tierCfg.badgeColor }} />
                      <span className="text-[13px] font-black uppercase tracking-wider text-[#F2F3F5]">{tierCfg.label}</span>
                      <span className="text-[11px] font-bold text-[#80848E] bg-[#1E1F22] px-2 py-0.5 rounded-[4px] border border-[rgba(255,255,255,0.04)]">
                        {tierItems.reduce((s, i) => s + i.quantity, 0)} total
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[#80848E] group-hover:text-[#F2F3F5] transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`} />
                  </button>

                  {/* Tier Pocket Grid Slots */}
                  {!isCollapsed && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 md:gap-3 animate-fade-in">
                      {tierItems.map(item => (
                        <VaultSlot 
                          key={item.unit_id} 
                          item={item} 
                          master={item.master} 
                          onInspect={(it, mst) => { setInspectTarget({ item: it, master: mst }); setShowValueHistory(false); }} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GLOBAL TOAST OVERLAY */}
      {toast && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] animate-slide-up w-max max-w-[90vw]">
          <div className={`bg-[#111214] border px-4 py-2.5 rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex items-center gap-4 ${toast.isError ? 'border-[rgba(237,66,69,0.3)]' : 'border-[rgba(255,255,255,0.08)]'}`}>
            <span className="flex items-center gap-2 text-[13px] font-medium text-[#DBDEE1]">
              {toast.isError && <AlertTriangle className="w-4 h-4 text-[#ed4245]" />}
              {toast.message}
            </span>
            
            {(toast.itemToRestore || !toast.isError) && (
              <div className="flex items-center gap-2">
                {toast.itemToRestore && (
                  <button onClick={handleUndo} className="text-[12.5px] font-bold text-[#5865F2] hover:text-[#4752C4] hover:underline transition-all focus-visible:outline-none px-1">Undo</button>
                )}
                <div className="w-[1px] h-3 bg-[rgba(255,255,255,0.1)] mx-1"></div>
                <button onClick={() => { setToast(null); if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }} className="text-[#80848E] hover:text-[#DBDEE1] p-1 -m-1 transition-colors focus-visible:outline-none">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}