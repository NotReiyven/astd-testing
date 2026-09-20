// ================================================
// FILE: src/app/components/InventoryChannel/index.tsx
// ================================================

import { useMemo } from "react";
import { 
  Package, Search, X, Lock, 
  ArrowLeft, Archive, Trash2, ArrowUpRight, Check,
  Download, ArrowDownCircle, ArrowUpCircle, BookOpen, Plus, CheckSquare
} from "lucide-react";
import { useUnits } from "../../../context/UnitContext";
import { useInventoryManager } from "../../../hooks/useInventoryManager";
import { TIER_CONFIG } from "../../../data";
import { TradingCardSlot } from "./TradingCardSlot";
import { Sparkline } from "./Sparkline";
import { FilterKey } from "../../../types";
import { getUnitConservativeValue } from "./inventoryUtils";
import { HoldToConfirmButton } from "../shared/Formatters";

export function InventoryChannel() {
  const { units: ALL_UNITS } = useUnits();
  
  const {
    vaultView, isSandbox, displayInventory,
    searchQuery, setSearchQuery, activeTierFilter, setActiveTierFilter, sortMode, setSortMode,
    isSelectMode, setIsSelectMode, selectedUnits, collapsedTiers, setCollapsedTiers,
    inspectTarget, setInspectTarget, importText, setImportText, isImporting, confirmClear, setConfirmClear,
    toast, setToast, isReadOnly, viewingUsername, profile,
    metrics, vaultLiquidValue, tierGroupedUnits, unownedSearchResults, parsedImportItems,
    handleTabSwitch, handleUndo, handleQtyChange, handleTogglePin, handleRemove, handleClearAction,
    handleCopyVault, handleSendToAnalyzer, handlePostAsAd, handleQuickTransfer, toggleSelectUnit,
    handleQuickAdd, executeMassImport, handleCloseVault
  } = useInventoryManager(ALL_UNITS);

  const TIER_FILTERS = ["All", "Locked", "S", "A", "B", "C", "Pure", "Oddities", "Untiered"];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background h-full font-sans relative">
      
      {/* HEADER SECTION */}
      <div className="flex-shrink-0 flex flex-col bg-card border-b border-border shadow-sm z-20">
        <div className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            {isReadOnly ? (
              <button 
                onClick={handleCloseVault}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-popover hover:bg-muted border border-border text-muted-foreground hover:text-foreground rounded-[4px] text-[12px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none"
              >
                <ArrowLeft className="w-4 h-4" /> Return
              </button>
            ) : (
              <div className="flex bg-popover rounded-[4px] p-1 border border-border shadow-inner">
                <button 
                  onClick={() => handleTabSwitch("owned")}
                  className={`px-4 py-1.5 rounded-[3px] text-[12px] font-bold uppercase tracking-wider transition-colors ${vaultView === "owned" ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  My Vault
                </button>
                <button 
                  onClick={() => handleTabSwitch("wishlist")}
                  className={`px-4 py-1.5 rounded-[3px] text-[12px] font-bold uppercase tracking-wider transition-colors ${vaultView === "wishlist" ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Wishlist
                </button>
              </div>
            )}
            
            <h2 className="text-[16px] font-black text-foreground tracking-tight ml-2 hidden md:block">
              {isReadOnly ? `${viewingUsername}'s Showcase` : vaultView === "owned" ? "Inventory Management" : "Target Wishlist"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {!isReadOnly && vaultView === "owned" && profile && (
              <button
                onClick={() => setConfirmClear("unpinned")}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-popover hover:bg-destructive/10 border border-border hover:border-destructive/30 text-muted-foreground hover:text-destructive rounded-[4px] text-[12px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Unpinned
              </button>
            )}
          </div>
        </div>

        {/* METRICS BAR */}
        {vaultView === "owned" && !isSandbox && (
          <div className="bg-popover px-4 md:px-6 py-2.5 border-t border-border flex items-center gap-6 overflow-x-auto hide-scrollbar text-[11px] uppercase tracking-widest font-bold">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-muted-foreground">Total Value:</span>
              <span className="text-foreground font-mono">{metrics.estimatedValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-muted-foreground">Liquid Value:</span>
              <span className="text-[#23a559] font-mono">{vaultLiquidValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-muted-foreground">Unique Units:</span>
              <span className="text-foreground font-mono">{metrics.uniqueCount}</span>
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <button onClick={handleCopyVault} className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Export Text
                </button>
              </div>
            )}
          </div>
        )}

        {/* CONTROLS BAR (STABLE TWO-ROW LAYOUT WITH WRAPPING) */}
        <div className="px-4 md:px-6 py-3 border-t border-border flex flex-col gap-3">
          
          {/* ROW 1: Dedicated Tier Filter Pills (Wrapped cleanly so every pill is fully visible) */}
          <div 
            className="flex flex-wrap items-center gap-2 w-full"
            onTouchStart={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            {TIER_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setActiveTierFilter(f as FilterKey | "Pinned")}
                className="px-4 py-1.5 rounded-full text-[12px] font-bold tracking-wide transition-all duration-200 ease-out active:scale-95 border shrink-0"
                style={
                  activeTierFilter === f
                    ? { background: "var(--primary)", color: "var(--primary-foreground)", borderColor: "var(--primary)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }
                    : { background: "transparent", color: "var(--muted-foreground)", borderColor: "var(--border)" }
                }
              >
                {f}
              </button>
            ))}
          </div>

          {/* ROW 2: Utility Controls, Bulk Select, Search Bar, and Sort Dropdown */}
          <div 
            className="flex flex-wrap items-center justify-between gap-2.5 w-full pt-2.5 border-t border-border/60"
            onTouchStart={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              {!isReadOnly && vaultView === "owned" && displayInventory.length > 0 && (
                <button
                  onClick={() => setIsSelectMode(!isSelectMode)}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors border focus-visible:outline-none shrink-0 ${
                    isSelectMode ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-popover text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{isSelectMode ? "Cancel Select" : "Bulk Select"}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap justify-end flex-1 min-w-0 max-w-xl ml-auto">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search units..."
                  className="w-full bg-popover border border-border rounded-[4px] pl-9 pr-3 py-1.5 text-[13px] text-foreground outline-none placeholder-muted-foreground focus:border-primary transition-colors shadow-inner h-[32px]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                className="bg-popover text-muted-foreground text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-[4px] outline-none border border-border focus:border-primary cursor-pointer h-[32px] shrink-0"
              >
                <option value="value-desc">Highest Value</option>
                <option value="value-asc">Lowest Value</option>
                <option value="alpha-asc">A to Z</option>
                <option value="recent-desc">Recently Added</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* MULTI-SELECT ACTION BAR */}
      {isSelectMode && selectedUnits.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-primary shadow-[0_10px_40px_rgba(0,0,0,0.8)] px-5 py-3 rounded-[8px] flex items-center gap-4 animate-slide-up">
          <span className="text-[13px] font-bold text-foreground"><span className="text-primary">{selectedUnits.size}</span> Units Selected</span>
          <div className="w-px h-5 bg-border" />
          <button onClick={() => handleSendToAnalyzer("give")} className="flex items-center gap-1.5 text-[12px] font-bold bg-[#FAA61A] text-white px-3 py-1.5 rounded-[4px] hover:bg-[#d98b14] transition-colors">
            <ArrowUpCircle className="w-3.5 h-3.5" /> Give
          </button>
          <button onClick={() => handleSendToAnalyzer("get")} className="flex items-center gap-1.5 text-[12px] font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-[4px] hover:bg-primary/80 transition-colors">
            <ArrowDownCircle className="w-3.5 h-3.5" /> Get
          </button>
          <div className="w-px h-5 bg-border" />
          <button onClick={handlePostAsAd} className="flex items-center gap-1.5 text-[12px] font-bold bg-[#23a559] text-white px-3 py-1.5 rounded-[4px] hover:bg-[#1f914e] transition-colors">
            Post as Ad
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 relative">
        
        {/* ADD UNIT SEARCH RESULTS (WHEN SEARCHING) */}
        {!isReadOnly && searchQuery && unownedSearchResults.length > 0 && (
          <div className="mb-6 bg-card border border-primary/30 rounded-[8px] p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest mb-3">Add to {vaultView === "wishlist" ? "Wishlist" : "Vault"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {unownedSearchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleQuickAdd(u)}
                  className="flex items-center justify-between p-2.5 bg-popover hover:bg-muted border border-border rounded-[4px] text-left transition-colors group focus-visible:outline-none"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[13px] font-bold text-foreground truncate">{u.name}</span>
                    {u.subtitle && <span className="text-[10px] text-muted-foreground truncate">{u.subtitle}</span>}
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground group-hover:text-[#23a559] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATES */}
        {displayInventory.length === 0 && !searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-70">
            <div className="w-16 h-16 bg-card border border-border rounded-full flex items-center justify-center mb-4">
              {vaultView === "wishlist" ? <BookOpen className="w-8 h-8 text-muted-foreground" /> : <Archive className="w-8 h-8 text-muted-foreground" />}
            </div>
            <h3 className="text-[18px] font-black text-foreground mb-1">
              {isReadOnly ? `Empty ${vaultView === "wishlist" ? "Wishlist" : "Showcase"}` : `Your ${vaultView === "wishlist" ? "Wishlist" : "Vault"} is empty`}
            </h3>
            {!isReadOnly && (
              <p className="text-[13px] text-muted-foreground max-w-sm mt-2">
                Use the search bar above to find and add units, or use the Mass Import tool below.
              </p>
            )}
          </div>
        ) : (
          /* GRID VIEW */
          <div className="flex flex-col gap-6 pb-20">
            {Object.entries(tierGroupedUnits).map(([tier, itemsInTier]) => {
              if (itemsInTier.length === 0) return null;
              const cfg = TIER_CONFIG[tier] || TIER_CONFIG["Untiered"];
              const isCollapsed = collapsedTiers[tier];

              return (
                <div key={tier} className="flex flex-col">
                  <button 
                    onClick={() => setCollapsedTiers(p => ({ ...p, [tier]: !p[tier] }))}
                    className="flex items-center gap-3 mb-3 focus-visible:outline-none group"
                  >
                    <span className="text-[12px] font-bold uppercase tracking-widest transition-colors" style={{ color: cfg.badgeColor }}>
                      {tier} {["Pure", "Oddities", "Untiered"].includes(tier) ? "" : "Tier"}
                    </span>
                    <div className="flex-1 h-px bg-border group-hover:bg-muted-foreground transition-colors" />
                    <span className="text-[10px] font-bold text-muted-foreground bg-popover px-2 py-0.5 rounded-[4px] border border-border">
                      {itemsInTier.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="grid gap-3 sm:gap-4 w-full" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))" }}>
                      {itemsInTier.map((item) => (
                        <TradingCardSlot
                          key={item.id}
                          item={item}
                          master={item.master}
                          onInspect={(i, m) => setInspectTarget({ item: i, master: m })}
                          isSelectMode={isSelectMode}
                          isSelected={selectedUnits.has(item.id)}
                          toggleSelect={toggleSelectUnit}
                          stagedGiveQty={0} 
                          stagedGetQty={0}
                          onQtyChange={handleQtyChange}
                          isSandbox={isSandbox}
                          isReadOnly={isReadOnly}
                          isWishlist={vaultView === "wishlist"}
                          onQuickTransfer={handleQuickTransfer}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* MASS IMPORT WIDGET */}
        {!isReadOnly && vaultView === "owned" && (
          <div className="mt-8 bg-card border border-border rounded-[8px] p-5 shadow-sm">
            <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" /> Mass Import Inventory
            </h3>
            <p className="text-[11px] text-muted-foreground mb-3">Paste a list of your units (e.g., "3x Goku, 1x Vegeta") to instantly populate your vault.</p>
            <div className="flex flex-col md:flex-row gap-3">
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="Paste trade format text here..."
                className="flex-1 bg-popover border border-border rounded-[4px] p-3 text-[13px] text-foreground outline-none placeholder-muted-foreground resize-none h-20 focus:border-primary transition-colors"
              />
              <button
                onClick={executeMassImport}
                disabled={!importText.trim() || isImporting || parsedImportItems.length === 0}
                className="bg-primary hover:bg-primary/80 disabled:bg-border disabled:text-muted-foreground text-primary-foreground px-6 rounded-[4px] text-[12px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none flex flex-col items-center justify-center py-3 md:py-0"
              >
                {isImporting ? "Importing..." : "Import"}
                {parsedImportItems.length > 0 && <span className="text-[9px] font-medium normal-case mt-0.5 opacity-80">({parsedImportItems.length} units parsed)</span>}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ITEM INSPECTION MODAL */}
      {inspectTarget && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setInspectTarget(null)} />
          <div className="relative bg-card border border-border rounded-[8px] w-full max-w-sm shadow-2xl animate-slide-up overflow-hidden">
            <div className="p-4 border-b border-border bg-popover flex items-center justify-between">
              <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Unit Details</span>
              <button onClick={() => setInspectTarget(null)} className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="p-5 flex flex-col items-center text-center">
              <h3 className="text-[18px] font-black text-foreground leading-tight mb-1">{inspectTarget.master.name}</h3>
              <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">{inspectTarget.master.subtitle}</p>
              
              <div className="my-5 bg-popover w-full p-4 rounded-[6px] border border-border flex justify-between items-center">
                <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Value</span>
                <span className="text-[16px] font-mono font-black text-foreground">{getUnitConservativeValue(inspectTarget.master).toLocaleString()}</span>
              </div>

              {!isReadOnly && vaultView === "owned" && (
                <div className="w-full flex flex-col gap-3">
                  <div className="flex items-center justify-between bg-popover p-1 rounded-[4px] border border-border">
                     <button onClick={() => handleQtyChange(inspectTarget.item.unit_id, -1)} className="w-10 h-8 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-[3px] transition-colors">-</button>
                     <span className="font-mono font-bold text-[14px] text-foreground">{inspectTarget.item.quantity}</span>
                     <button onClick={() => handleQtyChange(inspectTarget.item.unit_id, 1)} className="w-10 h-8 flex items-center justify-center text-[#23a559] hover:bg-[#23a559]/10 rounded-[3px] transition-colors">+</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleTogglePin(inspectTarget.item.unit_id, inspectTarget.item.is_pinned)} className={`py-2 text-[12px] font-bold rounded-[4px] border transition-colors flex items-center justify-center gap-1.5 ${inspectTarget.item.is_pinned ? 'bg-primary/10 text-primary border-primary/30' : 'bg-popover text-muted-foreground border-border hover:bg-muted'}`}>
                      <Lock className="w-3.5 h-3.5" /> {inspectTarget.item.is_pinned ? "Unlock" : "Lock"}
                    </button>
                    <button onClick={() => handleRemove(inspectTarget.item, inspectTarget.master)} className="py-2 text-[12px] font-bold rounded-[4px] border border-border bg-popover text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Analyzer Send Actions */}
              <div className="w-full flex gap-2 mt-4 pt-4 border-t border-border">
                <button onClick={() => handleSendToAnalyzer("give")} className="flex-1 py-2 text-[12px] font-bold rounded-[4px] bg-[#FAA61A] hover:bg-[#d98b14] text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                  <ArrowUpCircle className="w-3.5 h-3.5" /> Give
                </button>
                <button onClick={() => handleSendToAnalyzer("get")} className="flex-1 py-2 text-[12px] font-bold rounded-[4px] bg-primary hover:bg-primary/80 text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                  <ArrowDownCircle className="w-3.5 h-3.5" /> Get
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION OVERLAY */}
      {confirmClear && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-[8px] p-6 max-w-sm w-full shadow-2xl flex flex-col text-center">
            <h3 className="text-[18px] font-black text-foreground mb-2">Are you absolutely sure?</h3>
            <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
              This will permanently delete {confirmClear === "unpinned" ? "all unpinned items" : "EVERYTHING"} from your inventory.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmClear(null)} className="flex-1 py-2.5 rounded-[4px] bg-popover hover:bg-muted border border-border text-foreground text-[13px] font-bold transition-colors">Cancel</button>
              <HoldToConfirmButton 
                onConfirm={handleClearAction} 
                className="flex-1 py-2.5 rounded-[4px] bg-destructive text-destructive-foreground text-[13px] font-bold transition-colors shadow-md"
                holdTime={800}
              >
                Hold to Wipe
              </HoldToConfirmButton>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[1000000] animate-slide-up">
          <div className={`px-4 py-3 rounded-[6px] shadow-2xl flex items-center gap-3 border ${toast.isError ? 'bg-popover border-destructive/50 text-destructive' : 'bg-popover border-[#23a559]/50 text-[#23a559]'}`}>
            <span className="text-[13px] font-bold">{toast.message}</span>
            {toast.itemToRestore && (
              <button onClick={handleUndo} className="ml-2 text-[11px] uppercase tracking-wider font-bold underline hover:text-white transition-colors">Undo</button>
            )}
            <button onClick={() => setToast(null)} className="ml-2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

    </div>
  );
}