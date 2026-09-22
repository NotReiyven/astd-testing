// ================================================
// FILE: src/app/components/InventoryChannel.tsx
// ================================================

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
      <div className="flex-1 flex flex-col items-center justify-center bg-card p-6 text-center">
        <Package className="w-12 h-12 text-muted-foreground mb-3" />
        <h2 className="text-[18px] font-bold text-foreground mb-1">Authentication Required</h2>
        <p className="text-muted-foreground text-[13px] max-w-sm">Please log in with Discord using the top navigation bar to access your personal vault.</p>
      </div>
    );
  }

  const goalProgress = metrics.estimatedValue > 0 ? Math.min(100, (vaultLiquidValue / metrics.estimatedValue) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full select-none font-sans relative bg-transparent">
      <style>{`.mask-fade-edges { mask-image: linear-gradient(to right, black 90%, transparent 100%); -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%); }`}</style>
      
      {/* Read-Only Banner Header */}
      {isReadOnly && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-primary text-primary-foreground shrink-0 shadow-md z-30 animate-fade-in">
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
      <div className="flex items-center gap-6 px-6 pt-4 bg-card border-b border-border shrink-0 z-20">
        <button onClick={() => handleTabSwitch('owned')} className={`pb-3 text-[13px] font-black uppercase tracking-widest transition-all border-b-[3px] focus-visible:outline-none ${vaultView === 'owned' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}>{isReadOnly ? 'Vault' : 'My Vault'}</button>
        <button onClick={() => handleTabSwitch('wishlist')} className={`pb-3 text-[13px] font-black uppercase tracking-widest transition-all border-b-[3px] focus-visible:outline-none ${vaultView === 'wishlist' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}>Wishlist</button>
      </div>

      {/* Header Controls Bar */}
      <div className={`flex-shrink-0 flex flex-col bg-card border-b border-border shadow-sm z-20 relative ${importMenuOpen ? "opacity-30 pointer-events-none blur-sm" : ""}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-3 md:px-5 py-3 gap-3">
          
          {/* Filter Pills Row */}
          <div 
            className="flex flex-nowrap items-center gap-1.5 md:gap-2 overflow-x-auto w-full lg:w-auto snap-x snap-mandatory pr-4 mask-fade-edges" 
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button onClick={() => setActiveTierFilter("All")} className="snap-start flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] md:text-[12px] font-bold tracking-wide transition-colors border focus-visible:outline-none" style={activeTierFilter === "All" ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { background: "var(--popover)", color: "var(--muted-foreground)", borderColor: "var(--border)" }}>
              All
            </button>
            {vaultView !== "wishlist" && (
              <button 
                onClick={() => setActiveTierFilter("Pinned")} 
                className="snap-start flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] md:text-[12px] font-bold tracking-wide transition-colors border focus-visible:outline-none" 
                style={
                  activeTierFilter === "Pinned" 
                    ? { background: "#FAA61A", color: "#111214", borderColor: "#FAA61A" } 
                    : { background: "var(--popover)", color: "#FAA61A", borderColor: "rgba(250,166,26,0.3)" }
                }
              >
                <LockIcon className="w-3 h-3 inline mr-1" /> Locked
              </button>
            )}
            {FILTERS.filter(f => f !== "All").map((f) => (
              <button key={f} onClick={() => setActiveTierFilter(f)} className="snap-start flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] md:text-[12px] font-bold tracking-wide transition-colors border focus-visible:outline-none" style={activeTierFilter === f ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { background: "var(--popover)", color: "var(--muted-foreground)", borderColor: "var(--border)" }}>
                {f}
              </button>
            ))}
          </div>
          
          {/* Action Controls */}
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-between lg:justify-start">
            <div className="flex items-center gap-2 shrink-0">
              {!isReadOnly && vaultView !== "wishlist" && (
                <button 
                  onClick={() => { triggerHaptic('light'); setIsSelectMode(!isSelectMode); setSelectedUnits(new Set()); }}
                  className={`flex items-center gap-1.5 px-3 h-[32px] rounded-[6px] text-[12px] font-bold transition-all shrink-0 focus-visible:outline-none ${isSelectMode ? 'bg-primary/20 text-primary border border-primary/50' : 'bg-popover text-muted-foreground hover:text-foreground hover:bg-muted border border-border'}`}
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsOmniboxOpen(true); setOmniboxIndex(-1); }}
                  onFocus={() => setIsOmniboxOpen(true)}
                  onKeyDown={handleOmniboxKeyDown}
                  placeholder={isReadOnly ? `Search ${vaultView === 'wishlist' ? 'wishlist' : 'vault'}...` : vaultView === "wishlist" ? "Search wishlist..." : "Search units..."}
                  className="w-full bg-popover border border-border rounded-[6px] pl-9 pr-3 py-1 text-[13px] text-foreground outline-none placeholder-muted-foreground focus:ring-1 focus:ring-primary transition-colors shadow-inner h-[32px]"
                />
              </div>

              <button
                onClick={handleCopyVault}
                className="w-[32px] h-[32px] shrink-0 bg-popover hover:bg-muted text-muted-foreground hover:text-foreground rounded-[6px] flex items-center justify-center transition-colors focus-visible:outline-none border border-border"
                title={`Copy ${vaultView === "wishlist" ? "Wishlist" : "Vault"} Summary`}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {!isReadOnly && vaultView !== "wishlist" && (
                <div className="relative shrink-0" ref={manageRef}>
                  <button 
                    onClick={() => setManageOpen(!manageOpen)}
                    className={`w-[32px] h-[32px] shrink-0 flex items-center justify-center rounded-[6px] transition-colors focus-visible:outline-none border ${manageOpen || confirmClear ? 'bg-muted text-foreground border-border' : 'bg-popover text-muted-foreground hover:text-foreground hover:bg-muted border-border'}`}
                    title="Inventory Options"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                  
                  {manageOpen && (
                    <div className="absolute top-full right-0 mt-2 w-[260px] bg-popover border border-border shadow-2xl rounded-[8px] p-1.5 z-50 animate-fade-in flex flex-col">
                      {confirmClear ? (
                        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-[6px] flex flex-col gap-3">
                          <span className="text-[12.5px] text-foreground font-medium leading-snug">
                            Remove {confirmClear === "unpinned" ? <span className="font-bold text-destructive">{metrics.unpinnedCount} unlocked</span> : <span className="font-bold text-destructive">all {metrics.uniqueCount}</span>} units? This cannot be undone.
                          </span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setConfirmClear(null)} className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-[4px] text-[12px] font-bold text-foreground transition-colors focus-visible:outline-none">Cancel</button>
                            <button onClick={handleClearAction} className="flex-1 px-3 py-2 bg-destructive hover:bg-destructive/80 rounded-[4px] text-[12px] font-bold text-white transition-colors focus-visible:outline-none">Clear</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => { setImportMenuOpen(true); setManageOpen(false); setTimeout(() => importInputRef.current?.focus(), 100); }} className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-semibold text-foreground hover:bg-white/5 transition-colors focus-visible:outline-none flex items-center justify-between">
                            Import from Text <Wand2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <div className="w-full h-px bg-border my-1" />
                          <button onClick={() => { if (metrics.unpinnedCount > 0) setConfirmClear("unpinned"); }} disabled={metrics.unpinnedCount === 0} className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-semibold text-foreground hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none flex items-center justify-between">
                            Clear Unlocked <span className="text-muted-foreground font-mono font-bold text-[11px]">{metrics.unpinnedCount}</span>
                          </button>
                          <button onClick={() => { if (metrics.uniqueCount > 0) setConfirmClear("all"); }} disabled={metrics.uniqueCount === 0} className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none flex items-center justify-between">
                            Clear Entire Inventory <span className="text-destructive opacity-70 font-mono font-bold text-[11px]">{metrics.uniqueCount}</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Omnibox Dropdown */}
              {!isReadOnly && isOmniboxOpen && searchQuery && unownedSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-10 mt-1 max-h-[300px] overflow-y-auto custom-scrollbar bg-popover border border-border rounded-[8px] shadow-2xl z-[99999] flex flex-col p-1.5 text-left">
                  {unownedSearchResults.map((u, i) => {
                    const isSelected = i === omniboxIndex;
                    return (
                      <button
                        key={u.id}
                        onClick={() => { handleQuickAdd(u); setIsOmniboxOpen(false); }}
                        onMouseEnter={() => setOmniboxIndex(i)}
                        className={`flex items-center gap-2.5 w-full p-2.5 rounded-[6px] transition-colors focus-visible:outline-none ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-white/5 text-foreground'}`}
                      >
                        <div className="w-7 h-7 rounded-[4px] bg-background flex items-center justify-center shrink-0 border border-border overflow-hidden relative">
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
        <div className="p-4 md:p-8 pb-32">
          
          {displayInventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center px-4">
              {searchQuery ? (
                <>
                  <Search className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-[14px] font-bold text-foreground">No matches found</p>
                  <p className="text-[12px] text-muted-foreground mt-1">Try adjusting your search or filters.</p>
                </>
              ) : vaultView === "wishlist" ? (
                <>
                  <Heart className="w-12 h-12 text-primary mb-4 opacity-80" />
                  <h2 className="text-[20px] md:text-[24px] font-black text-foreground mb-2 tracking-tight">
                    {isReadOnly ? `${viewingUsername}'s Wishlist is Empty` : "Your Wishlist is Empty"}
                  </h2>
                  <p className="text-muted-foreground text-[13px] md:text-[14px] max-w-md leading-relaxed">
                    {isReadOnly 
                      ? "This trader hasn't added any units to their wishlist." 
                      : "Search for units using the bar above to set your trading targets. Track your progress automatically as your vault grows."}
                  </p>
                </>
              ) : !isSandbox && metrics.uniqueCount === 0 ? (
                <div className="relative z-10 flex flex-col items-center w-full max-w-xl text-center px-2">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-[12px] bg-card border border-primary/30 flex items-center justify-center shadow-lg mb-5">
                    <Package className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                  </div>
                  <h1 className="text-[22px] md:text-[32px] font-black text-foreground tracking-tight mb-2">
                    {isReadOnly ? `${viewingUsername}'s Vault is Empty` : "Welcome to your Vault"}
                  </h1>
                  <p className="text-muted-foreground text-[13px] md:text-[15px] mb-6 md:mb-8 leading-relaxed max-w-md mx-auto">
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
                 <div className="bg-card border-l-4 border-l-primary border-y border-y-border border-r border-r-border rounded-r-[8px] p-4 flex items-center justify-between mb-6 shadow-sm">
                    <div className="flex items-center gap-3">
                       <Info className="w-5 h-5 text-primary shrink-0" />
                       <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-foreground">Sandbox Mode Active</span>
                          <span className="text-[12px] text-muted-foreground">Try adjusting quantities or moving these dummy units to the Calculator. Adding any real unit clears the sandbox.</span>
                       </div>
                    </div>
                 </div>
              )}

              {/* Portfolio Dashboard */}
              {!searchQuery && activeTierFilter === "All" && (
                vaultView === "wishlist" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 mb-8 animate-fade-in">
                    <div className="bg-card border border-border rounded-[8px] p-6 flex flex-col justify-center relative overflow-hidden shadow-sm">
                       <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                         {isReadOnly && viewingUsername ? `${viewingUsername}'s Wishlist Progress` : 'Wishlist Goal Progress'}
                       </h3>
                       <div className="flex justify-between items-end mb-3">
                         <div className="flex flex-col">
                           <span className="text-[28px] md:text-[36px] font-black text-foreground font-mono leading-none">{vaultLiquidValue.toLocaleString()} <span className="text-muted-foreground text-[16px] md:text-[20px]">/ {metrics.estimatedValue.toLocaleString()}</span></span>
                           <span className="text-[11px] text-muted-foreground mt-2">Vault Liquid Value vs Wishlist Target Value</span>
                         </div>
                         <span className="text-[24px] font-black text-primary">{goalProgress.toFixed(1)}%</span>
                       </div>
                       <div className="w-full h-3 bg-background rounded-full overflow-hidden border border-border shadow-inner mt-2">
                          <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${goalProgress}%` }} />
                       </div>
                    </div>
                    <div className="bg-card border border-border rounded-[8px] p-6 flex flex-col shadow-sm">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Most Expensive Targets</span>
                       <div className="flex flex-col gap-2.5 flex-1 justify-center">
                          {top3Units.map((item, idx) => {
                            const proxyUrl = getProxyImage(item.master.id, item.master.imageUrl);
                            const unitVal = getUnitConservativeValue(item.master);
                            const rankColor = idx === 0 ? "#FAA61A" : idx === 1 ? "#B5BAC1" : "#A0714F";
                            const rankBg = idx === 0 ? "rgba(250,166,26,0.1)" : idx === 1 ? "rgba(181,186,193,0.1)" : "rgba(160,113,79,0.1)";

                            return (
                              <div key={item.id} className="flex items-center justify-between p-2.5 rounded-[6px] bg-background border border-border transition-colors hover:border-muted-foreground">
                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                  <span className="font-mono font-black text-[12px] w-6 text-center shrink-0 rounded-[4px] py-0.5" style={{ color: rankColor, backgroundColor: rankBg }}>#{idx + 1}</span>
                                  <div className="w-10 h-10 rounded-full bg-popover border border-border overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm">
                                    <span className="text-[9px] font-bold text-white z-0" style={getAvatarStyle(item.master.name)}>{getInitials(item.master.name)}</span>
                                    {proxyUrl && <img src={proxyUrl} alt={item.master.name} className="absolute inset-0 w-full h-full object-cover z-10" style={{ objectPosition: "center 15%" }} onError={(e) => handleImageError(e, item.master.id)} />}
                                  </div>
                                  <span className="text-[13px] font-bold text-foreground truncate leading-tight">{item.master.name}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[13px] font-mono font-bold text-foreground">{unitVal.toLocaleString()}</span>
                                </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 mb-8 animate-fade-in">
                    <div className="bg-card border border-border rounded-[8px] p-6 flex flex-col justify-between relative overflow-hidden shadow-sm">
                      <Sparkline />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{isReadOnly && viewingUsername ? `${viewingUsername}'s Vault Net Worth` : 'Vault Net Worth'}</span>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono">
                            {isSandbox ? (
                               <span className="text-muted-foreground bg-background px-2 py-0.5 rounded-[4px] border border-border">Sandbox Value</span>
                            ) : metrics.marketMomentum.net > 0 ? (
                              <span className="text-[#23a559] flex items-center gap-1 bg-[#23a559]/10 px-2 py-0.5 rounded-[4px] border border-[#23a559]/20">
                                <TrendingUp className="w-3 h-3" /> +{metrics.marketMomentum.net} Net Rising
                              </span>
                            ) : metrics.marketMomentum.net < 0 ? (
                              <span className="text-destructive flex items-center gap-1 bg-destructive/10 px-2 py-0.5 rounded-[4px] border border-destructive/20">
                                <TrendingDown className="w-3 h-3" /> {Math.abs(metrics.marketMomentum.net)} Net Dropping
                              </span>
                            ) : (
                              <span className="text-muted-foreground bg-background px-2 py-0.5 rounded-[4px] border border-border">Market Stable</span>
                            )}
                          </div>
                        </div>

                        <h2 className="text-[32px] md:text-[40px] font-black text-foreground tracking-tighter leading-none font-mono">
                          {isSandbox ? sandboxMockItems.reduce((acc, c) => acc + (c.master.value as number)*c.quantity, 0).toLocaleString() : metrics.estimatedValue.toLocaleString()}
                        </h2>

                        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                          <div className="bg-background p-3 rounded-[6px] border border-border flex flex-col shadow-inner">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Liquid Assets</span>
                            <span className="text-[14px] font-bold text-[#4DB6AC] font-mono mt-0.5">{isSandbox ? "0" : metrics.liquidValue.toLocaleString()}</span>
                          </div>
                          <div className="bg-background p-3 rounded-[6px] border border-border flex flex-col shadow-inner">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">UNOB Proportion</span>
                            <span className="text-[14px] font-bold text-[#FAA61A] font-mono mt-0.5">{isSandbox ? "0" : metrics.unobPercentage.toFixed(0)}% Unobtainable</span>
                          </div>
                        </div>
                      </div>

                      {!isSandbox && (
                        <div className="flex flex-col gap-2 mt-5 relative z-10">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            <span>Demand Distribution</span>
                            <span>{((metrics.liquidValue / metrics.liqTotal) * 100).toFixed(0)}% Liquid</span>
                          </div>
                          <div className="w-full h-2 rounded-[2px] bg-background overflow-hidden flex shadow-inner border border-border">
                            <div className="h-full bg-[#4DB6AC] transition-all duration-700 ease-out" style={{ width: `${metrics.highPct}%` }} title={`High Demand: ${metrics.highPct.toFixed(0)}%`} />
                            <div className="h-full bg-[#B5BAC1] transition-all duration-700 ease-out" style={{ width: `${metrics.avgPct}%` }} title={`Average Demand: ${metrics.avgPct.toFixed(0)}%`} />
                            <div className="h-full bg-[#E57373] transition-all duration-700 ease-out" style={{ width: `${metrics.lowPct}%` }} title={`Low Demand: ${metrics.lowPct.toFixed(0)}%`} />
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground">
                            <span className="text-[#4DB6AC]">High: {metrics.highPct.toFixed(0)}%</span>
                            <span className="text-[#B5BAC1]">Avg: {metrics.avgPct.toFixed(0)}%</span>
                            <span className="text-[#E57373]">Low: {metrics.lowPct.toFixed(0)}%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-card border border-border rounded-[8px] p-6 flex flex-col shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Crown Assets</span>
                      
                      <div className="flex flex-col gap-2.5 flex-1 justify-center">
                        {top3Units.map((item, idx) => {
                          const proxyUrl = getProxyImage(item.master.id, item.master.imageUrl);
                          const unitVal = getUnitConservativeValue(item.master) * item.quantity;
                          const share = metrics.estimatedValue > 0 ? (unitVal / metrics.estimatedValue) * 100 : 0;
                          const rankColor = idx === 0 ? "#FAA61A" : idx === 1 ? "#B5BAC1" : "#A0714F";
                          const rankBg = idx === 0 ? "rgba(250,166,26,0.1)" : idx === 1 ? "rgba(181,186,193,0.1)" : "rgba(160,113,79,0.1)";

                          return (
                            <div 
                              key={item.id} 
                              className="flex items-center justify-between p-2.5 rounded-[6px] bg-background border border-border transition-colors hover:border-muted-foreground"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <span className="font-mono font-black text-[12px] w-6 text-center shrink-0 rounded-[4px] py-0.5" style={{ color: rankColor, backgroundColor: rankBg }}>
                                  #{idx + 1}
                                </span>
                                <div className="w-10 h-10 rounded-full bg-popover border border-border overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm">
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
                                  <span className="text-[13px] font-bold text-foreground truncate leading-tight">
                                    {item.master.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {isSandbox ? "Sandbox Item" : `${share.toFixed(1)}% of total net worth`}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[13px] font-mono font-bold text-foreground">
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
                        <h3 className="text-[15px] font-black uppercase tracking-wider text-foreground leading-none mt-0.5">{tierCfg.label}</h3>
                        <span className="text-[11px] font-bold text-muted-foreground bg-card px-2 py-0.5 rounded-[4px] border border-border ml-1">
                          {tierItems.reduce((s, i) => s + i.quantity, 0)} Units
                        </span>
                        
                        {!isSandbox && vaultView !== "wishlist" && (
                          <div className="hidden md:flex items-center gap-2 ml-4">
                            <span className="text-[10px] font-mono text-muted-foreground">{uniqueCollected} / {totalInTier} Collected</span>
                            <div className="w-20 h-1.5 bg-card rounded-full overflow-hidden border border-border">
                               <div className="h-full rounded-full" style={{ width: `${progressPct}%`, backgroundColor: tierCfg.badgeColor }} />
                            </div>
                          </div>
                        )}

                        <div className="flex-1 h-px bg-border ml-2" />
                        <button
                          onClick={() => setCollapsedTiers(prev => ({ ...prev, [tier]: !prev[tier] }))}
                          className="p-1 rounded-[4px] hover:bg-card text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
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
          <div className="max-w-2xl mx-auto bg-card border border-border p-3 rounded-[8px] shadow-2xl pointer-events-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-bold text-foreground">
                {selectedUnits.size} Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                disabled={selectedUnits.size === 0}
                onClick={handlePostAsAd}
                className="px-4 py-2 bg-[#23a559] hover:bg-[#1f914e] disabled:bg-card disabled:text-muted-foreground text-white text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none flex items-center gap-1.5"
                title="Create a new trade ad using these units"
              >
                <Megaphone className="w-3.5 h-3.5" /> Post as Ad
              </button>
              <div className="w-px h-6 bg-border mx-1" />
              <button 
                disabled={selectedUnits.size === 0}
                onClick={() => handleSendToAnalyzer("give")}
                className="px-4 py-2 bg-[#FAA61A] hover:bg-[#d98b14] disabled:bg-card disabled:text-muted-foreground text-white text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none"
              >
                To Give
              </button>
              <button 
                disabled={selectedUnits.size === 0}
                onClick={() => handleSendToAnalyzer("get")}
                className="px-4 py-2 bg-primary hover:bg-primary/80 disabled:bg-card disabled:text-muted-foreground text-white text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none"
              >
                To Get
              </button>
              <button 
                onClick={() => { setIsSelectMode(false); setSelectedUnits(new Set()); }}
                className="p-2 text-muted-foreground hover:text-foreground rounded-[4px] hover:bg-white/5 ml-1 focus-visible:outline-none"
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
          <div className="bg-popover border border-border rounded-[12px] w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative z-10 flex flex-col overflow-hidden animate-slide-up">
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-2 text-foreground">
                <UploadCloud className="w-5 h-5 text-primary" />
                <h3 className="text-[15px] font-bold tracking-tight">Mass Import</h3>
              </div>
              <button onClick={() => setImportMenuOpen(false)} className="text-muted-foreground hover:text-foreground p-1 focus-visible:outline-none"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Paste your inventory text below. The parser automatically detects unit names and quantities (e.g. <strong className="text-foreground">"3x Koku Drip, 1 Death"</strong>).
              </p>
              
              <textarea
                ref={importInputRef}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste items here..."
                className="w-full h-[120px] bg-input border border-border rounded-[6px] p-3 text-[13px] text-foreground outline-none focus:border-primary resize-none custom-scrollbar shadow-inner"
              />

              <div className="min-h-[60px] bg-background rounded-[6px] p-3 border border-border flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Live Parser Output</span>
                  <span className="text-[12px] font-mono font-bold text-primary">{parsedImportItems.length} Found</span>
                </div>
                {parsedImportItems.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {parsedImportItems.map((item, i) => (
                      <span key={i} className="text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-[3px] truncate max-w-[120px]">
                        x{item.qty} {item.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic mt-1">Waiting for valid input...</span>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-border bg-card flex justify-end gap-2">
              <button onClick={() => setImportMenuOpen(false)} className="px-4 py-2 rounded-[4px] text-[12px] font-bold text-foreground hover:bg-white/5 focus-visible:outline-none">Cancel</button>
              <button 
                onClick={executeMassImport}
                disabled={parsedImportItems.length === 0 || isImporting}
                className="px-5 py-2 rounded-[4px] text-[12px] font-bold text-white bg-primary hover:bg-primary/80 disabled:bg-card disabled:text-muted-foreground shadow-sm flex items-center gap-2 focus-visible:outline-none"
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
          <div className="relative w-full md:max-w-xl max-h-[88vh] overflow-y-auto custom-scrollbar bg-popover rounded-t-[12px] md:rounded-[8px] p-5 shadow-2xl border-t md:border border-border z-10 flex flex-col gap-4 animate-slide-up">
            
            <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full" />

            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3.5 min-w-0 pr-4">
                <div className="w-12 h-12 rounded-[4px] overflow-hidden bg-background border border-border shrink-0 relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[14px] z-0" style={getAvatarStyle(inspectTarget.master.name)}>
                    {getInitials(inspectTarget.master.name)}
                  </div>
                  {getProxyImage(inspectTarget.master.id, inspectTarget.master.imageUrl) && (
                    <img src={getProxyImage(inspectTarget.master.id, inspectTarget.master.imageUrl)!} alt="" className="absolute inset-0 w-full h-full object-cover z-10 bg-background" onError={(e) => handleImageError(e, inspectTarget.master.id)} />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[17px] font-black text-foreground tracking-tight truncate">{inspectTarget.master.name}</span>
                    {inspectTarget.master.status && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] uppercase tracking-wider" style={{ background: GRID_STATUS_CFG[inspectTarget.master.status as keyof typeof GRID_STATUS_CFG]?.bg, color: GRID_STATUS_CFG[inspectTarget.master.status as keyof typeof GRID_STATUS_CFG]?.color }}>
                        {inspectTarget.master.status}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{inspectTarget.master.subtitle || "Unit"}</span>
                </div>
              </div>
              <button onClick={() => setInspectTarget(null)} className="p-1 text-muted-foreground hover:text-white transition-colors focus-visible:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-[6px] p-3 flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Individual Unit Value</span>
                <span className="text-[18px] font-black font-mono text-foreground mt-1">
                  {inspectTarget.master.valueDisplay || (typeof inspectTarget.master.value === 'number' ? inspectTarget.master.value.toLocaleString() : inspectTarget.master.value)}
                </span>
                {vaultView !== "wishlist" && (
                  <span className="text-[11px] text-muted-foreground mt-1">Vault Subtotal: <strong className="text-foreground font-mono">{(getUnitConservativeValue(inspectTarget.master) * inspectTarget.item.quantity).toLocaleString()}</strong></span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-card border border-border rounded-[6px] p-3 flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Rarity (0-20)</span>
                  <span className="text-[14px] font-black font-mono text-[#4DB6AC] mt-1">{inspectTarget.master.rarity ?? "N/A"}</span>
                </div>
                <div className="bg-card border border-border rounded-[6px] p-3 flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Liquidity</span>
                  <span className="text-[13px] font-black font-mono text-foreground mt-1 uppercase">{inspectTarget.master.liquidity ?? "Average"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 bg-card p-3.5 rounded-[6px] border border-border">
              {vaultView !== "wishlist" && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Vault Quantity</span>
                  {!isReadOnly ? (
                    <QuantitySelector 
                      qty={inspectTarget.item.quantity} 
                      onChange={(newQty) => handleQtyChange(inspectTarget.item.unit_id, newQty - inspectTarget.item.quantity)} 
                      minQty={0} 
                    />
                  ) : (
                    <span className="font-mono font-bold text-foreground">x{inspectTarget.item.quantity}</span>
                  )}
                </div>
              )}

              <div className={`grid grid-cols-2 gap-2 ${vaultView !== 'wishlist' ? 'pt-2 border-t border-border' : ''}`}>
                <button 
                  disabled={inspectTarget.item.is_pinned}
                  onClick={() => handleSendToAnalyzer("give")} 
                  className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-white bg-[#FAA61A] hover:bg-[#d98b14] disabled:bg-card disabled:text-muted-foreground transition-colors focus-visible:outline-none"
                >
                  <ArrowUpCircle className="w-4 h-4" /> To Give
                </button>
                <button 
                  disabled={inspectTarget.item.is_pinned}
                  onClick={() => handleSendToAnalyzer("get")} 
                  className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-white bg-primary hover:bg-primary/80 disabled:bg-card disabled:text-muted-foreground transition-colors focus-visible:outline-none"
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
                    }} className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-white bg-[#23a559] hover:bg-[#1f914e] transition-colors focus-visible:outline-none shadow-sm">
                      <Package className="w-3.5 h-3.5" />
                      <span>Move to Vault</span>
                    </button>
                    <button onClick={() => handleRemove(inspectTarget.item, inspectTarget.master)} className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-muted-foreground hover:text-destructive bg-white/5 hover:bg-destructive/10 border border-border focus-visible:outline-none">
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button onClick={() => handleTogglePin(inspectTarget.item.unit_id, inspectTarget.item.is_pinned)} className={`flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold border focus-visible:outline-none ${inspectTarget.item.is_pinned ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-card text-foreground border-border hover:bg-muted'}`}>
                      {inspectTarget.item.is_pinned ? <LockIcon className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      <span>{inspectTarget.item.is_pinned ? "Locked" : "Lock"}</span>
                    </button>
                    <button onClick={() => handleRemove(inspectTarget.item, inspectTarget.master)} className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 border border-border focus-visible:outline-none">
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
          <div className={`bg-popover border px-4 py-2.5 rounded-[8px] shadow-2xl flex items-center gap-4 ${toast.isError ? 'border-destructive/30' : 'border-border'}`}>
            <span className="text-[13px] font-bold text-foreground">
              {toast.message}
            </span>
            {toast.itemToRestore && !isReadOnly && (
              <button onClick={handleUndo} className="text-[12px] font-bold text-primary hover:underline focus-visible:outline-none">Undo</button>
            )}
            <button onClick={() => setToast(null)} className="text-muted-foreground hover:text-foreground focus-visible:outline-none p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}