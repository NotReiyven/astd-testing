import { useState, useRef } from "react";
import { 
  Package, Search, Trash2, Plus, ArrowUpDown, 
  Settings2, X, Wand2, UploadCloud, Check, ChevronDown, 
  Copy, ArrowUpCircle, ArrowDownCircle, MousePointerSquareDashed, 
  Lock as LockIcon, TrendingUp, TrendingDown, Heart, Info, ArrowLeft, Megaphone, History, Pin
} from "lucide-react";
import { useUnits } from "../../context/UnitContext";
import { getProxyImage, handleImageError, TIER_CONFIG, FILTERS, getTier, GRID_STATUS_CFG } from "../../data";
import { getAvatarStyle, getInitials } from "./TradeAnalyzer/summaryUtils";
import { QuantitySelector } from "./ui/QuantitySelector";
import { CustomDropdown, useClickOutside } from "./MainCanvas/CustomDropdown";
import { triggerHaptic } from "../../data/helpers";

import { SORT_OPTIONS, TIER_ORDER, getUnitConservativeValue } from "./InventoryChannel/inventoryUtils";
import { Sparkline } from "./InventoryChannel/Sparkline";
import { TradingCardSlot } from "./InventoryChannel/TradingCardSlot";
import { useInventoryManager } from "../../hooks/useInventoryManager";
import { useHistoryModalStore } from "../../store/useHistoryModalStore";
import { useTradeStore } from "../../store/useTradeStore";

export function InventoryChannel() {
  const { units: ALL_UNITS } = useUnits();
  const openModal = useHistoryModalStore(state => state.openModal);
  const { giveItems, getItems, addCard, overwrite, setComposerOpen } = useTradeStore();
  
  const {
    vaultView, isSandbox, sandboxMockItems, displayInventory, top3Units,
    searchQuery, setSearchQuery, activeTierFilter, setActiveTierFilter, sortMode, setSortMode,
    collapsedTiers, setCollapsedTiers, isSelectMode, setIsSelectMode, selectedUnits, setSelectedUnits,
    inspectTarget, setInspectTarget, importText, setImportText, isImporting, confirmClear, setConfirmClear,
    toast, setToast, isReadOnly, viewingUsername, setViewingUser, profile,
    metrics, vaultLiquidValue, tierGroupedUnits, unownedSearchResults, parsedImportItems,
    handleTabSwitch, handleUndo, handleQtyChange, handleTogglePin, handleRemove, handleClearAction,
    handleCopyVault, handleSendToAnalyzer, handlePostAsAd, handleQuickTransfer, toggleSelectUnit,
    handleQuickAdd, executeMassImport
  } = useInventoryManager(ALL_UNITS);
  
  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const [omniboxIndex, setOmniboxIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const omniboxRef = useRef<HTMLDivElement>(null);
  useClickOutside(omniboxRef, () => setIsOmniboxOpen(false));

  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const importInputRef = useRef<HTMLTextAreaElement>(null);

  const [manageOpen, setManageOpen] = useState(false);
  const manageRef = useRef<HTMLDivElement>(null);
  useClickOutside(manageRef, () => { setManageOpen(false); setConfirmClear(null); });

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
        setIsOmniboxOpen(false);
      } else if (unownedSearchResults.length > 0) {
        handleQuickAdd(unownedSearchResults[0]);
        setIsOmniboxOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOmniboxOpen(false);
      searchInputRef.current?.blur();
    }
  };

  if (!profile && !isReadOnly) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#313338] p-6 text-center">
        <Package className="w-12 h-12 text-[#80848E] mb-3" />
        <h2 className="text-[18px] font-bold text-[#F2F3F5] mb-1">Authentication Required</h2>
        <p className="text-[#949BA4] text-[13px] max-w-sm">Please log in with Discord using the top navigation bar to access your personal vault.</p>
      </div>
    );
  }

  const goalProgress = metrics.estimatedValue > 0 ? Math.min(100, (vaultLiquidValue / metrics.estimatedValue) * 100) : 0;

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
      <style>{`.mask-fade-edges { mask-image: linear-gradient(to right, black 90%, transparent 100%); -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%); }`}</style>
      
      {/* Read-Only Banner Header */}
      {isReadOnly && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#5865F2] text-white shrink-0 shadow-md z-30 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded">Viewing</span>
            <span className="text-[14px] font-black truncate">{viewingUsername || "Trader"}'s {vaultView === "wishlist" ? "Wishlist" : "Collection"}</span>
          </div>
          <button 
            onClick={() => setViewingUser(null, null)}
            className="flex items-center gap-1.5 px-3 py-1 bg-black/20 hover:bg-black/30 rounded-[4px] text-[12px] font-bold transition-colors focus-visible:outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to My Vault
          </button>
        </div>
      )}

      {/* Master Tabs */}
      <div className="flex items-center gap-6 px-6 pt-4 bg-[#2B2D31] border-b border-[rgba(0,0,0,0.22)] shrink-0 z-20">
        <button onClick={() => handleTabSwitch('owned')} className={`pb-3 text-[13px] font-black uppercase tracking-widest transition-all border-b-[3px] focus-visible:outline-none ${vaultView === 'owned' ? 'text-[#F2F3F5] border-[#5865F2]' : 'text-[#80848E] border-transparent hover:text-[#DBDEE1]'}`}>{isReadOnly ? 'Vault' : 'My Vault'}</button>
        <button onClick={() => handleTabSwitch('wishlist')} className={`pb-3 text-[13px] font-black uppercase tracking-widest transition-all border-b-[3px] focus-visible:outline-none ${vaultView === 'wishlist' ? 'text-[#F2F3F5] border-[#5865F2]' : 'text-[#80848E] border-transparent hover:text-[#DBDEE1]'}`}>Wishlist</button>
      </div>

      {/* Header Controls Bar */}
      <div className={`flex-shrink-0 flex flex-col bg-[#2B2D31] border-b border-[rgba(0,0,0,0.22)] shadow-sm z-20 relative ${importMenuOpen ? "opacity-30 pointer-events-none blur-sm" : ""}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-3 md:px-5 py-3 gap-3">
          
          {/* Filter Pills Row (Scrollable, Cleaned Up) */}
          <div 
            className="flex flex-nowrap items-center gap-1.5 md:gap-2 overflow-x-auto w-full lg:w-auto snap-x snap-mandatory pr-4 mask-fade-edges" 
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>

            <button onClick={() => setActiveTierFilter("All")} className="snap-start flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] md:text-[12px] font-bold tracking-wide transition-colors border focus-visible:outline-none" style={activeTierFilter === "All" ? { background: "#5865F2", color: "#fff", borderColor: "#5865F2" } : { background: "rgba(255,255,255,0.03)", color: "#949BA4", borderColor: "rgba(255,255,255,0.05)" }}>
              All
            </button>
            {vaultView !== "wishlist" && (
              <button 
                onClick={() => setActiveTierFilter("Pinned")} 
                className="snap-start flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] md:text-[12px] font-bold tracking-wide transition-colors border focus-visible:outline-none" 
                style={
                  activeTierFilter === "Pinned" 
                    ? { background: "#FAA61A", color: "#1E1F22", borderColor: "#FAA61A" } 
                    : { background: "#1E1F22", color: "#FAA61A", borderColor: "rgba(250,166,26,0.3)" }
                }
              >
                <LockIcon className="w-3 h-3 inline mr-1" /> Locked
              </button>
            )}
            {FILTERS.filter(f => f !== "All").map((f) => (
              <button key={f} onClick={() => setActiveTierFilter(f)} className="snap-start flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] md:text-[12px] font-bold tracking-wide transition-colors border focus-visible:outline-none" style={activeTierFilter === f ? { background: "#5865F2", color: "#fff", borderColor: "#5865F2" } : { background: "rgba(255,255,255,0.03)", color: "#949BA4", borderColor: "rgba(255,255,255,0.05)" }}>
                {f}
              </button>
            ))}
          </div>
          
          {/* Action Controls: Select, Sort, Search, Copy, Settings */}
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-between lg:justify-start">
            <div className="flex items-center gap-2 shrink-0">
              {!isReadOnly && vaultView !== "wishlist" && (
                <button 
                  onClick={() => { triggerHaptic('light'); setIsSelectMode(!isSelectMode); setSelectedUnits(new Set()); }}
                  className={`flex items-center gap-1.5 px-3 h-[32px] rounded-[4px] text-[12px] font-bold transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] ${isSelectMode ? 'bg-[rgba(88,101,242,0.15)] text-[#5865F2] ring-1 ring-[#5865F2]/50' : 'bg-[#1E1F22] text-[#80848E] hover:text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.04)]'}`}
                  title="Toggle Select Mode"
                >
                  <MousePointerSquareDashed className="w-3.5 h-3.5" /> 
                  <span className="inline">Bulk Select</span>
                </button>
              )}
              <div className="shrink-0">
                <CustomDropdown icon={ArrowUpDown} value={sortMode} options={SORT_OPTIONS} onChange={setSortMode} defaultLabel="Sort By" />
              </div>
            </div>
            
            <div className="relative flex-1 lg:w-[240px] shrink-0 flex items-center gap-1.5" ref={omniboxRef}>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#80848E]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsOmniboxOpen(true); setOmniboxIndex(-1); }}
                  onFocus={() => setIsOmniboxOpen(true)}
                  onKeyDown={handleOmniboxKeyDown}
                  placeholder={isReadOnly ? `Search ${vaultView === 'wishlist' ? 'wishlist' : 'vault'}...` : vaultView === "wishlist" ? "Search wishlist..." : "Search units..."}
                  className="w-full bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[4px] pl-9 pr-3 py-1 text-[13px] text-[#F2F3F5] outline-none placeholder-[#80848E] focus:ring-1 focus:ring-[#5865F2] transition-colors shadow-inner h-[32px]"
                />
              </div>

              <button
                onClick={handleCopyVault}
                className="w-[32px] h-[32px] shrink-0 bg-[#1E1F22] hover:bg-[#35373C] text-[#80848E] hover:text-[#F2F3F5] rounded-[4px] flex items-center justify-center transition-colors focus-visible:outline-none border border-[rgba(255,255,255,0.04)]"
                title={`Copy ${vaultView === "wishlist" ? "Wishlist" : "Vault"} Summary`}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {!isReadOnly && vaultView !== "wishlist" && (
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
                            Remove {confirmClear === "unpinned" ? <span className="font-bold text-[#ed4245]">{metrics.unpinnedCount} unlocked</span> : <span className="font-bold text-[#ed4245]">all {metrics.uniqueCount}</span>} units? This cannot be undone.
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
                          <button onClick={() => { if (metrics.unpinnedCount > 0) setConfirmClear("unpinned"); }} disabled={metrics.unpinnedCount === 0} className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-semibold text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none flex items-center justify-between">
                            Clear Unlocked <span className="text-[#80848E] font-mono font-bold text-[11px]">{metrics.unpinnedCount}</span>
                          </button>
                          <button onClick={() => { if (metrics.uniqueCount > 0) setConfirmClear("all"); }} disabled={metrics.uniqueCount === 0} className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-semibold text-[#ed4245] hover:bg-[rgba(237,66,69,0.1)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none flex items-center justify-between">
                            Clear Entire Inventory <span className="text-[#ed4245] opacity-70 font-mono font-bold text-[11px]">{metrics.uniqueCount}</span>
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
                        onClick={() => { handleQuickAdd(u); setIsOmniboxOpen(false); }}
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
          
          {/* Empty States Handling */}
          {displayInventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center px-4">
              {searchQuery ? (
                <>
                  <Search className="w-10 h-10 text-[#4E5058] mb-3" />
                  <p className="text-[14px] font-bold text-[#F2F3F5]">No matches found</p>
                  <p className="text-[12px] text-[#949BA4] mt-1">Try adjusting your search or filters.</p>
                </>
              ) : vaultView === "wishlist" ? (
                <>
                  <Heart className="w-12 h-12 text-[#5865F2] mb-4 opacity-80" />
                  <h2 className="text-[20px] md:text-[24px] font-black text-[#F2F3F5] mb-2 tracking-tight">
                    {isReadOnly ? `${viewingUsername}'s Wishlist is Empty` : "Your Wishlist is Empty"}
                  </h2>
                  <p className="text-[#949BA4] text-[13px] md:text-[14px] max-w-md leading-relaxed">
                    {isReadOnly 
                      ? "This trader hasn't added any units to their wishlist." 
                      : "Search for units using the bar above to set your trading targets. Track your progress automatically as your vault grows."}
                  </p>
                </>
              ) : !isSandbox && metrics.uniqueCount === 0 ? (
                <div className="relative z-10 flex flex-col items-center w-full max-w-xl text-center px-2">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-[12px] bg-[#1E1F22] border border-[#5865F2]/30 flex items-center justify-center shadow-[0_0_40px_rgba(88,101,242,0.15)] mb-5">
                    <Package className="w-8 h-8 md:w-10 md:h-10 text-[#5865F2]" />
                  </div>
                  <h1 className="text-[22px] md:text-[32px] font-black text-[#F2F3F5] tracking-tight mb-2">
                    {isReadOnly ? `${viewingUsername}'s Vault is Empty` : "Welcome to your Vault"}
                  </h1>
                  <p className="text-[#949BA4] text-[13px] md:text-[15px] mb-6 md:mb-8 leading-relaxed max-w-md mx-auto">
                    {isReadOnly 
                      ? "This trader hasn't added any units to their collection yet." 
                      : "Search for your first unit to start tracking your net worth, or click Inventory Options to import your entire list at once."}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {/* Sandbox Banner */}
              {!isReadOnly && isSandbox && (
                 <div className="bg-[#1E1F22] border-l-4 border-l-[#5865F2] border-y border-y-[rgba(255,255,255,0.04)] border-r border-r-[rgba(255,255,255,0.04)] rounded-r-[8px] p-4 flex items-center justify-between mb-6 shadow-sm">
                    <div className="flex items-center gap-3">
                       <Info className="w-5 h-5 text-[#5865F2] shrink-0" />
                       <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-[#F2F3F5]">Sandbox Mode Active</span>
                          <span className="text-[12px] text-[#949BA4]">Try adjusting quantities or moving these dummy units to the Calculator. Adding any real unit clears the sandbox.</span>
                       </div>
                    </div>
                 </div>
              )}

              {/* Portfolio Dashboard */}
              {!searchQuery && activeTierFilter === "All" && (
                vaultView === "wishlist" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 mb-6 animate-fade-in">
                    <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-5 flex flex-col justify-center relative overflow-hidden">
                       <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#949BA4] mb-4">
                         {isReadOnly && viewingUsername ? `${viewingUsername}'s Wishlist Progress` : 'Wishlist Goal Progress'}
                       </h3>
                       <div className="flex justify-between items-end mb-2">
                         <div className="flex flex-col">
                           <span className="text-[28px] md:text-[36px] font-black text-[#F2F3F5] font-mono leading-none">{vaultLiquidValue.toLocaleString()} <span className="text-[#80848E] text-[16px] md:text-[20px]">/ {metrics.estimatedValue.toLocaleString()}</span></span>
                           <span className="text-[11px] text-[#949BA4] mt-1.5">Vault Liquid Value vs Wishlist Target Value</span>
                         </div>
                         <span className="text-[24px] font-black text-[#5865F2]">{goalProgress.toFixed(1)}%</span>
                       </div>
                       <div className="w-full h-3 bg-[#111214] rounded-full overflow-hidden border border-[rgba(255,255,255,0.02)] shadow-inner mt-2">
                         <div className="h-full bg-[#5865F2] transition-all duration-1000 ease-out" style={{ width: `${goalProgress}%` }} />
                       </div>
                    </div>
                    <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-5 flex flex-col">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-[#949BA4] mb-3">Most Expensive Targets</span>
                       <div className="flex flex-col gap-2 flex-1 justify-center">
                          {top3Units.map((item, idx) => {
                            const proxyUrl = getProxyImage(item.master.id, item.master.imageUrl);
                            const unitVal = getUnitConservativeValue(item.master);
                            const rankColor = idx === 0 ? "#FAA61A" : idx === 1 ? "#B5BAC1" : "#A0714F";
                            const rankBg = idx === 0 ? "rgba(250,166,26,0.1)" : idx === 1 ? "rgba(181,186,193,0.1)" : "rgba(160,113,79,0.1)";

                            return (
                              <div key={item.id} className="flex items-center justify-between p-2 rounded-[6px] bg-[#1E1F22] border border-[rgba(255,255,255,0.02)] transition-colors hover:border-[rgba(255,255,255,0.06)]">
                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                  <span className="font-mono font-black text-[12px] w-5 text-center shrink-0 rounded-[3px] py-0.5" style={{ color: rankColor, backgroundColor: rankBg }}>#{idx + 1}</span>
                                  <div className="w-10 h-10 rounded-full bg-[#111214] border border-[rgba(255,255,255,0.06)] overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm">
                                    <span className="text-[9px] font-bold text-white z-0" style={getAvatarStyle(item.master.name)}>{getInitials(item.master.name)}</span>
                                    {proxyUrl && <img src={proxyUrl} alt={item.master.name} className="absolute inset-0 w-full h-full object-cover z-10" style={{ objectPosition: "center 15%" }} onError={(e) => handleImageError(e, item.master.id)} />}
                                  </div>
                                  <span className="text-[13px] font-bold text-[#F2F3F5] truncate leading-tight">{item.master.name}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[13px] font-mono font-bold text-[#DBDEE1]">{unitVal.toLocaleString()}</span>
                                </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 mb-6 animate-fade-in">
                    <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-5 flex flex-col justify-between relative overflow-hidden">
                      <Sparkline />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">{isReadOnly && viewingUsername ? `${viewingUsername}'s Vault Net Worth` : 'Vault Net Worth'}</span>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono">
                            {isSandbox ? (
                               <span className="text-[#949BA4] bg-[#1E1F22] px-2 py-0.5 rounded-[4px] border border-[rgba(255,255,255,0.04)]">Sandbox Value</span>
                            ) : metrics.marketMomentum.net > 0 ? (
                              <span className="text-[#23a559] flex items-center gap-1 bg-[#23a559]/10 px-2 py-0.5 rounded-[4px] border border-[#23a559]/20">
                                <TrendingUp className="w-3 h-3" /> +{metrics.marketMomentum.net} Net Rising
                              </span>
                            ) : metrics.marketMomentum.net < 0 ? (
                              <span className="text-[#ed4245] flex items-center gap-1 bg-[#ed4245]/10 px-2 py-0.5 rounded-[4px] border border-[#ed4245]/20">
                                <TrendingDown className="w-3 h-3" /> {Math.abs(metrics.marketMomentum.net)} Net Dropping
                              </span>
                            ) : (
                              <span className="text-[#949BA4] bg-[#1E1F22] px-2 py-0.5 rounded-[4px] border border-[rgba(255,255,255,0.04)]">Market Stable</span>
                            )}
                          </div>
                        </div>

                        <h2 className="text-[32px] md:text-[40px] font-black text-[#F2F3F5] tracking-tighter leading-none font-mono">
                          {isSandbox ? sandboxMockItems.reduce((acc, c) => acc + (c.master.value as number)*c.quantity, 0).toLocaleString() : metrics.estimatedValue.toLocaleString()}
                        </h2>

                        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)]">
                          <div className="bg-[#111214] p-2.5 rounded-[6px] border border-[rgba(255,255,255,0.02)] flex flex-col shadow-inner">
                            <span className="text-[9px] font-bold text-[#80848E] uppercase tracking-wider">Liquid Assets</span>
                            <span className="text-[14px] font-bold text-[#4DB6AC] font-mono mt-0.5">{isSandbox ? "0" : metrics.liquidValue.toLocaleString()}</span>
                          </div>
                          <div className="bg-[#111214] p-2.5 rounded-[6px] border border-[rgba(255,255,255,0.02)] flex flex-col shadow-inner">
                            <span className="text-[9px] font-bold text-[#80848E] uppercase tracking-wider">UNOB Proportion</span>
                            <span className="text-[14px] font-bold text-[#FAA61A] font-mono mt-0.5">{isSandbox ? "0" : metrics.unobPercentage.toFixed(0)}% Unobtainable</span>
                          </div>
                        </div>
                      </div>

                      {!isSandbox && (
                        <div className="flex flex-col gap-1.5 mt-5 relative z-10">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">
                            <span>Demand Distribution</span>
                            <span>{((metrics.liquidValue / metrics.liqTotal) * 100).toFixed(0)}% Liquid</span>
                          </div>
                          <div className="w-full h-2 rounded-[2px] bg-[#111214] overflow-hidden flex shadow-inner border border-[rgba(255,255,255,0.02)]">
                            <div className="h-full bg-[#4DB6AC] transition-all duration-700 ease-out" style={{ width: `${metrics.highPct}%` }} title={`High Demand: ${metrics.highPct.toFixed(0)}%`} />
                            <div className="h-full bg-[#B5BAC1] transition-all duration-700 ease-out" style={{ width: `${metrics.avgPct}%` }} title={`Average Demand: ${metrics.avgPct.toFixed(0)}%`} />
                            <div className="h-full bg-[#E57373] transition-all duration-700 ease-out" style={{ width: `${metrics.lowPct}%` }} title={`Low Demand: ${metrics.lowPct.toFixed(0)}%`} />
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-[#80848E]">
                            <span className="text-[#4DB6AC]">High: {metrics.highPct.toFixed(0)}%</span>
                            <span className="text-[#B5BAC1]">Avg: {metrics.avgPct.toFixed(0)}%</span>
                            <span className="text-[#E57373]">Low: {metrics.lowPct.toFixed(0)}%</span>
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
                          const share = metrics.estimatedValue > 0 ? (unitVal / metrics.estimatedValue) * 100 : 0;
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
                )
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
                        
                        {!isSandbox && vaultView !== "wishlist" && (
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
                                isWishlist={vaultView === "wishlist"}
                                onQuickTransfer={handleQuickTransfer}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Persistent Action Dock for Selection Mode */}
      {isSelectMode && (
        <div className="fixed bottom-0 left-0 right-0 z-[80] p-4 pointer-events-none animate-slide-up">
          <div className="max-w-2xl mx-auto bg-[#1E1F22] border border-[rgba(255,255,255,0.1)] p-3 rounded-[8px] shadow-2xl pointer-events-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-bold text-[#F2F3F5]">
                {selectedUnits.size} Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                disabled={selectedUnits.size === 0}
                onClick={handlePostAsAd}
                className="px-4 py-2 bg-[#23a559] hover:bg-[#1f914e] disabled:bg-[#2B2D31] disabled:text-[#80848E] text-white text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none flex items-center gap-1.5"
                title="Create a new trade ad using these units"
              >
                <Megaphone className="w-3.5 h-3.5" /> Post as Ad
              </button>
              <div className="w-px h-6 bg-[rgba(255,255,255,0.1)] mx-1" />
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] animate-fade-in" onClick={() => setImportMenuOpen(false)} />
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] animate-fade-in" onClick={() => setInspectTarget(null)} />
          <div className="relative w-full md:max-w-xl max-h-[88vh] overflow-y-auto custom-scrollbar bg-[#2B2D31] rounded-t-[12px] md:rounded-[8px] p-5 shadow-2xl border-t md:border border-[rgba(255,255,255,0.08)] z-10 flex flex-col gap-4 animate-slide-up">
            
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
                {vaultView !== "wishlist" && (
                  <span className="text-[11px] text-[#949BA4] mt-1">Vault Subtotal: <strong className="text-[#DBDEE1] font-mono">{(getUnitConservativeValue(inspectTarget.master) * inspectTarget.item.quantity).toLocaleString()}</strong></span>
                )}
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
              {vaultView !== "wishlist" && (
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
              )}

              <div className={`grid grid-cols-2 gap-2 ${vaultView !== 'wishlist' ? 'pt-2 border-t border-[rgba(255,255,255,0.04)]' : ''}`}>
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
                vaultView === "wishlist" ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button onClick={async () => {
                      await handleQuickTransfer(inspectTarget.master.id);
                      setInspectTarget(null);
                    }} className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-[#DBDEE1] bg-[#23a559] hover:bg-[#1f914e] transition-colors focus-visible:outline-none shadow-sm">
                      <Package className="w-3.5 h-3.5" />
                      <span>Move to Vault</span>
                    </button>
                    <button onClick={() => handleRemove(inspectTarget.item, inspectTarget.master)} className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-[#80848E] hover:text-[#ed4245] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.04)] focus-visible:outline-none">
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
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
                )
              )}
            </div>

            <div className="w-full h-[env(safe-area-inset-bottom)] md:hidden mt-1" />
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toast && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] w-max max-w-[90vw] animate-slide-up">
          <div className={`bg-[#111214] border px-4 py-2.5 rounded-[8px] shadow-2xl flex items-center gap-4 ${toast.isError ? 'border-[rgba(237,66,69,0.3)]' : 'border-[rgba(255,255,255,0.08)]'}`}>
            <span className="text-[13px] font-bold text-[#DBDEE1]">
              {toast.message}
            </span>
            {toast.itemToRestore && !isReadOnly && (
              <button onClick={handleUndo} className="text-[12px] font-bold text-[#5865F2] hover:underline focus-visible:outline-none">Undo</button>
            )}
            <button onClick={() => setToast(null)} className="text-[#80848E] hover:text-[#DBDEE1] focus-visible:outline-none p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}