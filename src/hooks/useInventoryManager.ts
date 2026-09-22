// ================================================
// FILE: src/hooks/useInventoryManager.ts
// ================================================

import { useState, useMemo, useRef, useCallback } from "react";
import { useInventoryStore, InventoryItem } from "../store/useInventoryStore";
import { useAuthStore } from "../store/useAuthStore";
import { useTradeStore } from "../store/useTradeStore";
import { MasterUnit, FilterKey, TradeCard } from "../types";
import { getTier } from "../data";
import { getUnitConservativeValue, TIER_ORDER } from "../app/components/InventoryChannel/inventoryUtils";
import { parseSmartTrade } from "../app/components/TradeAnalyzer/smartParser";
import { useStickyState } from "./useStickyState";
import { triggerHaptic } from "../data/helpers";

export function useInventoryManager(ALL_UNITS: MasterUnit[]) {
  const { 
    items: myItems, 
    wishlistItems: myWishlist, 
    viewedItems, 
    viewedWishlist, 
    addOrUpdateUnit, 
    removeUnit, 
    togglePin, 
    restoreItem, 
    clearInventory, 
    clearUnpinned, 
    toggleWishlist, 
    viewingUserId, 
    viewingUsername, 
    returnChannel,
    setViewingUser 
  } = useInventoryStore();
  
  const { addCard, overwrite, setComposerOpen } = useTradeStore();
  const { profile } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTierFilter, setActiveTierFilter] = useState<FilterKey | "Pinned">("All");
  const [sortMode, setSortMode] = useState("value-desc");
  const [collapsedTiers, setCollapsedTiers] = useState<Record<string, boolean>>({});

  const isReadOnly = viewingUserId !== null && viewingUserId !== "";
  const items = isReadOnly ? viewedItems : myItems;
  const wishlistItems = isReadOnly ? viewedWishlist : myWishlist;

  const [vaultView, setVaultView] = useState<"owned" | "wishlist">("owned");
  const [sandboxDismissed, setSandboxDismissed] = useStickyState(false, "astd_sandbox_dismissed_v1");

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [inspectTarget, setInspectTarget] = useState<{ item: InventoryItem; master: MasterUnit } | null>(null);

  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [confirmClear, setConfirmClear] = useState<"unpinned" | "all" | null>(null);

  const [toast, setToast] = useState<{ id: number, message: string, isError: boolean, itemToRestore?: InventoryItem } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const showToast = useCallback((message: string, isError = false, itemToRestore?: InventoryItem) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message, isError, itemToRestore });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const handleCloseVault = useCallback(() => {
    triggerHaptic('light');
    const target = returnChannel || "trading-ads";
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: target }));
    setTimeout(() => {
      setViewingUser(null, null, null);
    }, 100);
  }, [returnChannel, setViewingUser]);

  const handleTabSwitch = (view: "owned" | "wishlist") => {
    triggerHaptic('light');
    setVaultView(view);
    setIsSelectMode(false);
    setSelectedUnits(new Set());
    setSearchQuery("");
  };

  const handleUndo = useCallback(async () => {
    if (toast?.itemToRestore && profile && !isReadOnly) {
      try {
        await restoreItem(toast.itemToRestore);
        triggerHaptic('light');
        setToast(null);
      } catch (e) { showToast("Failed to restore unit.", true); }
    }
  }, [toast, profile, restoreItem, showToast, isReadOnly]);

  const handleQtyChange = useCallback(async (unitId: string, delta: number) => {
    if (!profile || delta === 0 || isReadOnly || vaultView === "wishlist") return;
    try { 
      await addOrUpdateUnit(profile.id, unitId, delta);
      triggerHaptic('light');
      setInspectTarget(prev => {
        if (!prev || prev.item.unit_id !== unitId) return prev;
        const updatedQty = prev.item.quantity + delta;
        if (updatedQty <= 0) return null;
        return { ...prev, item: { ...prev.item, quantity: updatedQty } };
      });
    } catch (e) { showToast("Failed to update quantity.", true); }
  }, [profile, addOrUpdateUnit, showToast, isReadOnly, vaultView]);

  const handleTogglePin = useCallback(async (unitId: string, status: boolean) => {
    if (!profile || isReadOnly) return;
    try { 
      await togglePin(profile.id, unitId, status); 
      triggerHaptic('light');
      setInspectTarget(prev => prev && prev.item.unit_id === unitId ? { ...prev, item: { ...prev.item, is_pinned: !status } } : prev);
    } catch (e) { showToast("Failed to pin unit.", true); }
  }, [profile, togglePin, showToast, isReadOnly]);

  const handleRemove = useCallback(async (item: InventoryItem, master: MasterUnit) => {
    if (!profile || isReadOnly) return;
    try {
      if (vaultView === "wishlist") {
        await toggleWishlist(profile.id, item.unit_id);
      } else {
        await removeUnit(profile.id, item.unit_id);
      }
      triggerHaptic('light');
      setInspectTarget(null);
      showToast(`Removed ${master.name}`, false, vaultView === "wishlist" ? undefined : item);
    } catch (e) { showToast("Failed to remove unit.", true); }
  }, [profile, removeUnit, toggleWishlist, showToast, isReadOnly, vaultView]);

  const activeItems = useMemo(() => {
    if (vaultView === "wishlist") {
      return wishlistItems.map(w => ({ ...w, quantity: 1, is_pinned: false }) as InventoryItem);
    }
    return items;
  }, [items, wishlistItems, vaultView]);

  const vaultLiquidValue = useMemo(() => {
    let liqVal = 0;
    const sourceItems = isReadOnly ? viewedItems : myItems;
    sourceItems.forEach(item => {
      const master = ALL_UNITS.find(u => u.id === item.unit_id);
      if (master) {
        const liq = (master.liquidity || "Average").toLowerCase();
        if (liq === "high" || liq === "average") {
          liqVal += getUnitConservativeValue(master) * item.quantity;
        }
      }
    });
    return liqVal;
  }, [myItems, viewedItems, isReadOnly, ALL_UNITS]);

  const metrics = useMemo(() => {
    let estVal = 0, liqVal = 0, totQty = 0, unpinned = 0;
    let unobVal = 0, risingCount = 0, droppingCount = 0;
    let highLiq = 0, avgLiq = 0, lowLiq = 0;

    const resolved = activeItems.map(item => {
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
    }).filter(i => i.master !== undefined) as (typeof activeItems[0] & { master: MasterUnit })[];

    const totalVal = estVal > 0 ? estVal : 1;

    return { 
      resolvedInventory: resolved, 
      estimatedValue: estVal, 
      liquidValue: liqVal,
      totalQuantity: totQty, 
      uniqueCount: resolved.length, 
      unpinnedCount: unpinned,
      unobPercentage: estVal > 0 ? (unobVal / estVal) * 100 : 0,
      marketMomentum: { net: risingCount - droppingCount, rising: risingCount, dropping: droppingCount },
      liqDistribution: { high: highLiq, avg: avgLiq, low: lowLiq },
      liqTotal: totalVal,
      highPct: (highLiq / totalVal) * 100,
      avgPct: (avgLiq / totalVal) * 100,
      lowPct: (lowLiq / totalVal) * 100
    };
  }, [activeItems, ALL_UNITS]);

  const isSandbox = !isReadOnly && vaultView !== "wishlist" && metrics.uniqueCount === 0 && !sandboxDismissed;
  
  const sandboxMockItems = useMemo(() => {
    if (!isSandbox) return [];
    return [
      { unit_id: "bunny-girl", quantity: 1, is_pinned: false },
      { unit_id: "the-ripper", quantity: 3, is_pinned: false },
      { unit_id: "death", quantity: 1, is_pinned: true }
    ].map(item => ({
      ...item, id: `sandbox-${item.unit_id}`, user_id: "sandbox", created_at: new Date().toISOString(),
      master: ALL_UNITS.find(u => u.id === item.unit_id)!
    })).filter(i => i.master) as (InventoryItem & { master: MasterUnit })[];
  }, [isSandbox, ALL_UNITS]);

  const displayInventory = isSandbox ? sandboxMockItems : metrics.resolvedInventory;

  const top3Units = useMemo(() => {
    return [...displayInventory]
      .sort((a, b) => (getUnitConservativeValue(b.master) * b.quantity) - (getUnitConservativeValue(a.master) * a.quantity))
      .slice(0, 3);
  }, [displayInventory]);

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
    const ownedIds = new Set(activeItems.map(i => i.unit_id));
    return ALL_UNITS.filter(u => {
      if (ownedIds.has(u.id)) return false;
      return u.name.toLowerCase().includes(q) || (u.subtitle && u.subtitle.toLowerCase().includes(q)) || (u.aliases && u.aliases.some(a => a.toLowerCase().includes(q)));
    }).slice(0, 10);
  }, [searchQuery, activeItems, ALL_UNITS, isReadOnly]);

  const parsedImportItems = useMemo(() => {
    if (!importText.trim()) return [];
    return parseSmartTrade(importText, ALL_UNITS).giveCards;
  }, [importText, ALL_UNITS]);

  const handleClearAction = useCallback(async () => {
    if (!profile || !confirmClear || isReadOnly) return;
    try {
      if (confirmClear === "unpinned") await clearUnpinned(profile.id);
      if (confirmClear === "all") await clearInventory(profile.id);
      triggerHaptic('heavy');
      setConfirmClear(null);
    } catch (e) { showToast("Failed to clear inventory.", true); }
  }, [profile, confirmClear, clearUnpinned, clearInventory, showToast, isReadOnly]);

  const handleCopyVault = useCallback(() => {
    triggerHaptic('light');
    const header = isReadOnly && viewingUsername 
      ? `${viewingUsername}'s ASTD ${vaultView === "wishlist" ? "Wishlist" : "Vault"}` 
      : `My ASTD ${vaultView === "wishlist" ? "Wishlist" : "Vault"}`;
      
    const text = `${header} (Total: ${metrics.estimatedValue.toLocaleString()} | Liquid: ${vaultLiquidValue.toLocaleString()} | UNOB: ${metrics.unobPercentage.toFixed(0)}%):\n` +
      displayInventory.map(i => `- ${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.master.name}`).join('\n');
    navigator.clipboard.writeText(text);
    showToast(`${vaultView === "wishlist" ? "Wishlist" : "Vault"} summary copied to clipboard!`);
  }, [displayInventory, metrics.estimatedValue, vaultLiquidValue, metrics.unobPercentage, showToast, isReadOnly, viewingUsername, vaultView]);

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

  const handlePostAsAd = () => {
    triggerHaptic('medium');
    const cardsToGive: TradeCard[] = [];
    selectedUnits.forEach(itemId => {
      const invItem = displayInventory.find(i => i.id === itemId);
      if (invItem && !invItem.is_pinned) { 
        const numVal = getUnitConservativeValue(invItem.master);
        cardsToGive.push({ id: invItem.master.id, name: invItem.master.name, subtitle: invItem.master.subtitle, value: numVal, qty: invItem.quantity });
      }
    });
    overwrite(cardsToGive, []);
    setComposerOpen(true, "standard");
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'trading-ads' }));
    setSelectedUnits(new Set());
    setIsSelectMode(false);
  };

  const handleQuickTransfer = async (unitId: string) => {
    if (!profile) return;
    try {
      await toggleWishlist(profile.id, unitId);
      await addOrUpdateUnit(profile.id, unitId, 1);
      triggerHaptic('medium');
      showToast("Moved unit to Vault successfully!", false);
    } catch(e) { showToast("Failed to move unit.", true); }
  };

  const toggleSelectUnit = (item: InventoryItem) => {
    if (item.is_pinned) {
      showToast("Cannot select locked units.", true);
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
      if (vaultView === "wishlist") await toggleWishlist(profile.id, master.id);
      else await addOrUpdateUnit(profile.id, master.id, 1);
      if (isSandbox) setSandboxDismissed(true);
      triggerHaptic('medium');
      setSearchQuery("");
      showToast(`Added ${master.name} to ${vaultView === "wishlist" ? "Wishlist" : "Vault"}.`);
    } catch (e) { showToast("Failed to add unit.", true); }
  };

  const executeMassImport = async () => {
    if (!profile || parsedImportItems.length === 0 || isReadOnly || vaultView === "wishlist") return;
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
    setImportText("");
    if (successCount > 0) {
      triggerHaptic('success');
      showToast(`Imported ${successCount} items successfully.`, false);
    }
  };

  return {
    vaultView, isSandbox, sandboxMockItems, displayInventory, top3Units,
    searchQuery, setSearchQuery, activeTierFilter, setActiveTierFilter, sortMode, setSortMode,
    collapsedTiers, setCollapsedTiers, isSelectMode, setIsSelectMode, selectedUnits, setSelectedUnits,
    inspectTarget, setInspectTarget, importText, setImportText, isImporting, confirmClear, setConfirmClear,
    toast, setToast, isReadOnly, viewingUsername, returnChannel, setViewingUser, profile,
    metrics, vaultLiquidValue, tierGroupedUnits, unownedSearchResults, parsedImportItems,
    handleTabSwitch, handleUndo, handleQtyChange, handleTogglePin, handleRemove, handleClearAction,
    handleCopyVault, handleSendToAnalyzer, handlePostAsAd, handleQuickTransfer, toggleSelectUnit,
    handleQuickAdd, executeMassImport, handleCloseVault
  };
}