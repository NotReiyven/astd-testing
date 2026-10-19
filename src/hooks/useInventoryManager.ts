import { useState, useMemo, useCallback, useEffect } from "react";
import { useInventoryStore, InventoryItem } from "../store/useInventoryStore";
import { useAuthStore } from "../store/useAuthStore";
import { useProfileStore } from "../store/useProfileStore";
import { useTradeStore } from "../store/useTradeStore";
import { MasterUnit, FilterKey, TradeCard } from "../types";
import { getTier } from "../data";
import {
  getUnitConservativeValue,
  TIER_ORDER,
} from "../app/components/InventoryChannel/inventoryUtils";
import { parseSmartTradeAsync } from "../app/components/TradeAnalyzer/smartParser";
import { triggerHaptic, copyTextWithFallback } from "../data/helpers";
import { useToastStore } from "../store/useToastStore";
import { logger } from "../lib/logger";

export function useInventoryManager(ALL_UNITS: MasterUnit[]) {
  const myItems = useInventoryStore((s) => s.items);
  const myWishlist = useInventoryStore((s) => s.wishlistItems);
  const viewedItems = useInventoryStore((s) => s.viewedItems);
  const viewedWishlist = useInventoryStore((s) => s.viewedWishlist);
  const addOrUpdateUnit = useInventoryStore((s) => s.addOrUpdateUnit);
  const removeUnit = useInventoryStore((s) => s.removeUnit);
  const togglePin = useInventoryStore((s) => s.togglePin);
  const restoreItem = useInventoryStore((s) => s.restoreItem);
  const clearInventory = useInventoryStore((s) => s.clearInventory);
  const clearUnpinned = useInventoryStore((s) => s.clearUnpinned);
  const toggleWishlist = useInventoryStore((s) => s.toggleWishlist);
  const viewingUserId = useInventoryStore((s) => s.viewingUserId);
  const viewingUsername = useInventoryStore((s) => s.viewingUsername);
  const returnChannel = useInventoryStore((s) => s.returnChannel);
  const setViewingUser = useInventoryStore((s) => s.setViewingUser);

  const addCard = useTradeStore((s) => s.addCard);
  const overwrite = useTradeStore((s) => s.overwrite);
  const setComposerOpen = useTradeStore((s) => s.setComposerOpen);
  const profile = useAuthStore((s) => s.profile);
  const addToast = useToastStore((s) => s.addToast);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTierFilter, setActiveTierFilter] = useState<
    FilterKey | "Pinned"
  >("All");
  const [sortMode, setSortMode] = useState("value-desc");
  const [collapsedTiers, setCollapsedTiers] = useState<Record<string, boolean>>(
    {}
  );

  const isReadOnly = viewingUserId !== null && viewingUserId !== "";
  const items = isReadOnly ? viewedItems : myItems;
  const wishlistItems = isReadOnly ? viewedWishlist : myWishlist;

  const [vaultView, setVaultView] = useState<"owned" | "wishlist">("owned");

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [inspectTarget, setInspectTarget] = useState<{
    item: InventoryItem;
    master: MasterUnit;
  } | null>(null);

  const [importText, setImportText] = useState("");
  const [parsedImportItems, setParsedImportItems] = useState<TradeCard[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmClear, setConfirmClear] = useState<"unpinned" | "all" | null>(
    null
  );

  // Performance: O(1) Cache Map
  const unitMap = useMemo(
    () => new Map(ALL_UNITS.map((u) => [u.id, u])),
    [ALL_UNITS]
  );

  useEffect(() => {
    if (!importText.trim()) {
      setParsedImportItems([]);
      return;
    }
    parseSmartTradeAsync(importText, ALL_UNITS).then((res) => {
      setParsedImportItems(res.giveCards);
    });
  }, [importText, ALL_UNITS]);

  const handleCloseVault = useCallback(() => {
    triggerHaptic("light");
    const target = returnChannel || "trading-ads";
    setViewingUser(null, null, null);
    useProfileStore.getState().setViewingProfile(null);
    window.document.dispatchEvent(
      new CustomEvent("navigate", { detail: target })
    );
  }, [returnChannel, setViewingUser]);

  const handleSwitchToProfile = useCallback(() => {
    if (!viewingUserId) return;
    triggerHaptic("light");
    const origin = returnChannel || "trading-ads";
    useProfileStore.getState().setViewingProfile(viewingUserId, origin);
    setViewingUser(viewingUserId, viewingUsername, origin);
    window.document.dispatchEvent(
      new CustomEvent("navigate", { detail: "profile" })
    );
  }, [viewingUserId, viewingUsername, returnChannel, setViewingUser]);

  const handleTabSwitch = (view: "owned" | "wishlist") => {
    triggerHaptic("light");
    setVaultView(view);
    setIsSelectMode(false);
    setSelectedUnits(new Set());
    setSearchQuery("");
  };

  const handleQtyChange = useCallback(
    async (unitId: string, delta: number) => {
      if (!profile || delta === 0 || isReadOnly || vaultView === "wishlist")
        return;
      const existingItem = myItems.find((i) => i.unit_id === unitId);
      const unitMaster = unitMap.get(unitId);
      const unitName = unitMaster?.name || unitId;
      const prevSnapshot = existingItem ? { ...existingItem } : null;

      try {
        await addOrUpdateUnit(profile.id, unitId, delta);
        triggerHaptic("light");
        setInspectTarget((prev) => {
          if (!prev || prev.item.unit_id !== unitId) return prev;
          const updatedQty = prev.item.quantity + delta;
          if (updatedQty <= 0) return null;
          return { ...prev, item: { ...prev.item, quantity: updatedQty } };
        });

        if (prevSnapshot && prevSnapshot.quantity + delta <= 0) {
          addToast(`Removed ${unitName} from Vault.`, "info", {
            action: {
              label: "Undo",
              onClick: () => {
                restoreItem(prevSnapshot);
                addToast(`Restored ${unitName} to Vault.`, "success");
              },
            },
          });
        }
      } catch (e) {
        logger.error("ASTD-INV-004", `Failed to update quantity for ${unitName}`, {
          scope: "useInventoryManager",
          action: "handleQtyChange",
          metadata: { unitId, delta },
          error: e,
        });
        addToast(
          `Could not update quantity for ${unitName}—check your connection and try again.`,
          "error",
          {
            action: {
              label: "Retry",
              onClick: () => {
                void handleQtyChange(unitId, delta);
              },
            },
          }
        );
      }
    },
    [
      profile,
      addOrUpdateUnit,
      restoreItem,
      addToast,
      isReadOnly,
      vaultView,
      myItems,
      unitMap,
    ]
  );

  const handleTogglePin = useCallback(
    async (unitId: string, status: boolean) => {
      if (!profile || isReadOnly) return;
      const unitName = unitMap.get(unitId)?.name || unitId;
      try {
        await togglePin(profile.id, unitId, status);
        triggerHaptic("light");
        setInspectTarget((prev) =>
          prev && prev.item.unit_id === unitId
            ? { ...prev, item: { ...prev.item, is_pinned: !status } }
            : prev
        );
      } catch (e) {
        logger.error("ASTD-INV-005", `Failed to toggle pin for ${unitName}`, {
          scope: "useInventoryManager",
          action: "handleTogglePin",
          metadata: { unitId, status },
          error: e,
        });
        addToast(
          `Could not ${status ? "unlock" : "lock"} ${unitName}—try again.`,
          "error",
          {
            action: {
              label: "Retry",
              onClick: () => {
                void handleTogglePin(unitId, status);
              },
            },
          }
        );
      }
    },
    [profile, togglePin, addToast, isReadOnly, unitMap]
  );

  const handleRemove = useCallback(
    async (item: InventoryItem, master: MasterUnit) => {
      if (!profile || isReadOnly) return;
      const itemSnapshot = { ...item };
      const isWishlistView = vaultView === "wishlist";
      try {
        if (isWishlistView) {
          await toggleWishlist(profile.id, item.unit_id);
        } else {
          await removeUnit(profile.id, item.unit_id);
        }
        triggerHaptic("light");
        setInspectTarget(null);
        addToast(
          `Removed ${master.name} from ${isWishlistView ? "Wishlist" : "Vault"}.`,
          "info",
          {
            action: {
              label: "Undo",
              onClick: () => {
                if (isWishlistView) {
                  void toggleWishlist(profile.id, itemSnapshot.unit_id);
                  addToast(`Restored ${master.name} to Wishlist.`, "success");
                } else {
                  void restoreItem(itemSnapshot);
                  addToast(`Restored ${master.name} to Vault.`, "success");
                }
              },
            },
          }
        );
      } catch (e) {
        logger.error("ASTD-INV-006", `Failed to remove ${master.name}`, {
          scope: "useInventoryManager",
          action: "handleRemove",
          metadata: { unitId: item.unit_id, isWishlistView },
          error: e,
        });
        addToast(
          `Could not remove ${master.name}—check your connection and try again.`,
          "error",
          {
            action: {
              label: "Retry",
              onClick: () => {
                void handleRemove(item, master);
              },
            },
          }
        );
      }
    },
    [
      profile,
      removeUnit,
      toggleWishlist,
      restoreItem,
      addToast,
      isReadOnly,
      vaultView,
    ]
  );

  const activeItems = useMemo(() => {
    if (vaultView === "wishlist") {
      return wishlistItems.map(
        (w) => ({ ...w, quantity: 1, is_pinned: false } as InventoryItem)
      );
    }
    return items;
  }, [items, wishlistItems, vaultView]);

  const vaultTotalValue = useMemo(() => {
    let totalVal = 0;
    const sourceItems = isReadOnly ? viewedItems : myItems;
    sourceItems.forEach((item) => {
      const master = unitMap.get(item.unit_id);
      if (master) {
        totalVal += getUnitConservativeValue(master) * item.quantity;
      }
    });
    return totalVal;
  }, [myItems, viewedItems, isReadOnly, unitMap]);

  const vaultLiquidValue = useMemo(() => {
    let liqVal = 0;
    const sourceItems = isReadOnly ? viewedItems : myItems;
    sourceItems.forEach((item) => {
      const master = unitMap.get(item.unit_id);
      if (master) {
        const liq = (master.liquidity || "Average").toLowerCase();
        if (liq === "high" || liq === "average") {
          liqVal += getUnitConservativeValue(master) * item.quantity;
        }
      }
    });
    return liqVal;
  }, [myItems, viewedItems, isReadOnly, unitMap]);

  const metrics = useMemo(() => {
    let estVal = 0,
      liqVal = 0,
      totQty = 0,
      unpinned = 0;
    let unobVal = 0,
      risingCount = 0,
      droppingCount = 0;
    let highLiq = 0,
      avgLiq = 0,
      lowLiq = 0;

    const resolved = activeItems
      .map((item) => {
        const master = unitMap.get(item.unit_id);
        if (master) {
          totQty += item.quantity;
          const conservativeVal =
            getUnitConservativeValue(master) * item.quantity;
          estVal += conservativeVal;

          const isUnob =
            (master.notice || "").toLowerCase().includes("unobtainable") ||
            master.obtainability === "UNOB";
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
      })
      .filter((i) => i.master !== undefined) as ((typeof activeItems)[0] & {
      master: MasterUnit;
    })[];

    const totalVal = estVal > 0 ? estVal : 1;

    return {
      resolvedInventory: resolved,
      estimatedValue: estVal,
      liquidValue: liqVal,
      totalQuantity: totQty,
      uniqueCount: resolved.length,
      unpinnedCount: unpinned,
      unobPercentage: estVal > 0 ? (unobVal / estVal) * 100 : 0,
      marketMomentum: {
        net: risingCount - droppingCount,
        rising: risingCount,
        dropping: droppingCount,
      },
      liqDistribution: { high: highLiq, avg: avgLiq, low: lowLiq },
      liqTotal: totalVal,
      highPct: (highLiq / totalVal) * 100,
      avgPct: (avgLiq / totalVal) * 100,
      lowPct: (lowLiq / totalVal) * 100,
    };
  }, [activeItems, unitMap]);

  const displayInventory = metrics.resolvedInventory;

  const top3Units = useMemo(() => {
    return [...displayInventory]
      .sort(
        (a, b) =>
          getUnitConservativeValue(b.master) * b.quantity -
          getUnitConservativeValue(a.master) * a.quantity
      )
      .slice(0, 3);
  }, [displayInventory]);

  const tierGroupedUnits = useMemo(() => {
    let filtered = displayInventory;
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      filtered = filtered.filter((i) => {
        const m = i.master;
        return (
          m.name.toLowerCase().includes(q) ||
          (m.subtitle && m.subtitle.toLowerCase().includes(q)) ||
          (m.aliases && m.aliases.some((a) => a.toLowerCase().includes(q)))
        );
      });
    }

    if (activeTierFilter === "Pinned") {
      filtered = filtered.filter((i) => i.is_pinned);
    } else if (activeTierFilter !== "All") {
      filtered = filtered.filter((i) => getTier(i.master) === activeTierFilter);
    }

    const groups: Record<string, typeof filtered> = {};
    TIER_ORDER.forEach((t) => {
      groups[t] = [];
    });

    filtered.forEach((item) => {
      const t = getTier(item.master);
      if (groups[t]) groups[t].push(item);
    });

    Object.keys(groups).forEach((tier) => {
      groups[tier].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        if (sortMode === "value-desc" || sortMode === "value-asc") {
          const valA = getUnitConservativeValue(a.master);
          const valB = getUnitConservativeValue(b.master);
          if (valA !== valB)
            return sortMode === "value-desc" ? valB - valA : valA - valB;
        } else if (sortMode === "alpha-asc")
          return a.master.name.localeCompare(b.master.name);
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
    const ownedIds = new Set(activeItems.map((i) => i.unit_id));
    return ALL_UNITS.filter((u) => {
      return (
        u.name.toLowerCase().includes(q) ||
        (u.subtitle && u.subtitle.toLowerCase().includes(q)) ||
        (u.aliases && u.aliases.some((a) => a.toLowerCase().includes(q)))
      );
    })
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aPrefix = aName.startsWith(q);
        const bPrefix = bName.startsWith(q);
        if (aPrefix && !bPrefix) return -1;
        if (!aPrefix && bPrefix) return 1;

        const aOwned = ownedIds.has(a.id);
        const bOwned = ownedIds.has(b.id);
        if (!aOwned && bOwned) return -1;
        if (aOwned && !bOwned) return 1;

        return aName.localeCompare(bName);
      })
      .slice(0, 12);
  }, [searchQuery, activeItems, ALL_UNITS, isReadOnly]);

  const handleClearAction = useCallback(async () => {
    if (!profile || !confirmClear || isReadOnly) return;
    const mode = confirmClear;
    try {
      if (mode === "unpinned") await clearUnpinned(profile.id);
      if (mode === "all") await clearInventory(profile.id);
      triggerHaptic("heavy");
      setConfirmClear(null);
      addToast(
        mode === "unpinned"
          ? "Cleared all unlocked units from Vault."
          : "Cleared entire Vault.",
        "info"
      );
    } catch (e) {
      logger.error("ASTD-INV-007", `Failed to clear inventory (${mode})`, {
        scope: "useInventoryManager",
        action: "handleClearAction",
        metadata: { mode },
        error: e,
      });
      addToast("Could not clear inventory—try again.", "error", {
        action: {
          label: "Retry",
          onClick: () => {
            void handleClearAction();
          },
        },
      });
    }
  }, [
    profile,
    confirmClear,
    clearUnpinned,
    clearInventory,
    addToast,
    isReadOnly,
  ]);

  const handleCopyVault = useCallback(async () => {
    triggerHaptic("light");
    const header =
      isReadOnly && viewingUsername
        ? `${viewingUsername}'s ASTD ${
            vaultView === "wishlist" ? "Wishlist" : "Vault"
          }`
        : `My ASTD ${vaultView === "wishlist" ? "Wishlist" : "Vault"}`;

    const text =
      `${header} (Total: ${metrics.estimatedValue.toLocaleString()} | Liquid: ${vaultLiquidValue.toLocaleString()} | UNOB: ${metrics.unobPercentage.toFixed(
        0
      )}%):\n` +
      displayInventory
        .map(
          (i) => `- ${i.quantity > 1 ? `${i.quantity}x ` : ""}${i.master.name}`
        )
        .join("\n");

    const ok = await copyTextWithFallback(text);
    if (ok) {
      addToast(
        `${
          vaultView === "wishlist" ? "Wishlist" : "Vault"
        } summary copied to clipboard!`,
        "success"
      );
    } else {
      addToast(
        "Could not copy summary automatically—press Ctrl+C to copy manually.",
        "error"
      );
    }
  }, [
    displayInventory,
    metrics.estimatedValue,
    vaultLiquidValue,
    metrics.unobPercentage,
    isReadOnly,
    viewingUsername,
    vaultView,
    addToast,
  ]);

  const handleSendToAnalyzer = (
    type: "give" | "get",
    targetMaster?: MasterUnit
  ) => {
    triggerHaptic("medium");
    const sideLabel = type === "give" ? "You Give" : "You Get";

    if (isSelectMode && selectedUnits.size > 0) {
      const addedDeltas: { id: string; qty: number }[] = [];
      selectedUnits.forEach((itemId) => {
        const invItem = displayInventory.find((i) => i.id === itemId);
        if (invItem && !invItem.is_pinned) {
          const numVal = getUnitConservativeValue(invItem.master);
          addCard(type, {
            id: invItem.master.id,
            name: invItem.master.name,
            subtitle: invItem.master.subtitle,
            value: numVal,
            qty: invItem.quantity,
          });
          addedDeltas.push({ id: invItem.master.id, qty: invItem.quantity });
        }
      });

      if (addedDeltas.length > 0) {
        addToast(
          `Added ${addedDeltas.length} ${
            addedDeltas.length === 1 ? "unit" : "units"
          } to ${sideLabel}`,
          "success",
          {
            action: {
              label: "Undo",
              onClick: () => {
                const currentStore = useTradeStore.getState();
                const currentList =
                  type === "give"
                    ? currentStore.giveItems
                    : currentStore.getItems;
                for (const delta of addedDeltas) {
                  const currentCard = currentList.find(
                    (c) => c.id === delta.id
                  );
                  if (!currentCard) continue;
                  const nextQty = currentCard.qty - delta.qty;
                  if (nextQty <= 0) {
                    currentStore.removeCard(type, delta.id);
                  } else {
                    currentStore.changeQty(type, delta.id, nextQty);
                  }
                }
                addToast(
                  `Removed ${addedDeltas.length} ${
                    addedDeltas.length === 1 ? "unit" : "units"
                  } from ${sideLabel}.`,
                  "info"
                );
              },
            },
          }
        );
      }

      setSelectedUnits(new Set());
      setIsSelectMode(false);
      window.dispatchEvent(new Event("open-analyzer"));
      return;
    }

    const master = targetMaster || inspectTarget?.master;
    if (!master) return;

    const qty = targetMaster ? 1 : inspectTarget?.item.quantity || 1;
    const numericValue = getUnitConservativeValue(master);
    addCard(type, {
      id: master.id,
      name: master.name,
      subtitle: master.subtitle,
      value: numericValue,
      qty,
    });
    addToast(`Added ${master.name} to ${sideLabel}!`, "success", {
      action: {
        label: "Undo",
        onClick: () => {
          const currentStore = useTradeStore.getState();
          const currentList =
            type === "give" ? currentStore.giveItems : currentStore.getItems;
          const currentCard = currentList.find((c) => c.id === master.id);
          if (!currentCard) return;
          const nextQty = currentCard.qty - qty;
          if (nextQty <= 0) {
            currentStore.removeCard(type, master.id);
          } else {
            currentStore.changeQty(type, master.id, nextQty);
          }
          addToast(`Removed ${master.name} from ${sideLabel}.`, "info");
        },
      },
    });
    window.dispatchEvent(
      new CustomEvent("trade-added", { detail: { name: master.name, type } })
    );
    window.dispatchEvent(new Event("open-analyzer"));
    if (!targetMaster) setInspectTarget(null);
  };

  const handlePostAsAd = () => {
    triggerHaptic("medium");
    const cardsToGive: TradeCard[] = [];
    selectedUnits.forEach((itemId) => {
      const invItem = displayInventory.find((i) => i.id === itemId);
      if (invItem && !invItem.is_pinned) {
        const numVal = getUnitConservativeValue(invItem.master);
        cardsToGive.push({
          id: invItem.master.id,
          name: invItem.master.name,
          subtitle: invItem.master.subtitle,
          value: numVal,
          qty: invItem.quantity,
        });
      }
    });
    overwrite(cardsToGive, []);
    setComposerOpen(true, "standard");
    window.document.dispatchEvent(
      new CustomEvent("navigate", { detail: "trading-ads" })
    );
    setSelectedUnits(new Set());
    setIsSelectMode(false);
  };

  const handleQuickTransfer = async (unitId: string) => {
    if (!profile) return;
    const unitName = unitMap.get(unitId)?.name || unitId;
    try {
      await toggleWishlist(profile.id, unitId);
      await addOrUpdateUnit(profile.id, unitId, 1);
      triggerHaptic("medium");
      addToast(`Moved ${unitName} from Wishlist to Vault.`, "success", {
        action: {
          label: "Undo",
          onClick: () => {
            void addOrUpdateUnit(profile.id, unitId, -1);
            void toggleWishlist(profile.id, unitId);
            addToast(`Moved ${unitName} back to Wishlist.`, "info");
          },
        },
      });
    } catch (e) {
      logger.error("ASTD-INV-008", `Failed to move ${unitName} to Vault`, {
        scope: "useInventoryManager",
        action: "handleQuickTransfer",
        metadata: { unitId },
        error: e,
      });
      addToast(`Could not move ${unitName} to Vault—try again.`, "error", {
        action: {
          label: "Retry",
          onClick: () => {
            void handleQuickTransfer(unitId);
          },
        },
      });
    }
  };

  const toggleSelectUnit = (item: InventoryItem) => {
    if (item.is_pinned) {
      addToast(
        "Locked units cannot be bulk-selected. Unlock the unit first.",
        "warning"
      );
      return;
    }
    triggerHaptic("light");
    setSelectedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  const handleQuickAdd = async (master: MasterUnit, keepSearch = false) => {
    if (!profile) {
      addToast(
        "Please sign in with Discord to add units to your vault.",
        "info"
      );
      return;
    }
    if (isReadOnly) return;
    const isWishlistView = vaultView === "wishlist";
    const alreadyInWishlist =
      isWishlistView && activeItems.some((i) => i.unit_id === master.id);
    try {
      if (isWishlistView) await toggleWishlist(profile.id, master.id);
      else await addOrUpdateUnit(profile.id, master.id, 1);
      triggerHaptic("medium");
      if (!keepSearch) {
        setSearchQuery("");
      }
      if (alreadyInWishlist) {
        addToast(`Removed ${master.name} from Wishlist.`, "info", {
          action: {
            label: "Undo",
            onClick: () => {
              void toggleWishlist(profile.id, master.id);
              addToast(`Restored ${master.name} to Wishlist.`, "success");
            },
          },
        });
      } else {
        addToast(
          `Added ${master.name} to ${isWishlistView ? "Wishlist" : "Vault"}.`,
          "success",
          {
            action: {
              label: "Undo",
              onClick: () => {
                if (isWishlistView) {
                  void toggleWishlist(profile.id, master.id);
                } else {
                  void addOrUpdateUnit(profile.id, master.id, -1);
                }
                addToast(
                  `Removed ${master.name} from ${
                    isWishlistView ? "Wishlist" : "Vault"
                  }.`,
                  "info"
                );
              },
            },
          }
        );
      }
    } catch (e) {
      logger.error("ASTD-INV-009", `Failed to add ${master.name}`, {
        scope: "useInventoryManager",
        action: "handleQuickAdd",
        metadata: { unitId: master.id, isWishlistView },
        error: e,
      });
      addToast(`Could not add ${master.name}—try again.`, "error", {
        action: {
          label: "Retry",
          onClick: () => {
            void handleQuickAdd(master, keepSearch);
          },
        },
      });
    }
  };

  const executeMassImport = async () => {
    if (
      !profile ||
      parsedImportItems.length === 0 ||
      isReadOnly ||
      vaultView === "wishlist"
    )
      return;
    setIsImporting(true);
    let successCount = 0;

    for (const item of parsedImportItems) {
      try {
        await addOrUpdateUnit(profile.id, item.id, item.qty);
        successCount++;
      } catch (e) {
        logger.error("ASTD-INV-003", `Failed to import unit ${item.name} into vault`, {
          scope: "useInventoryManager",
          action: "handleImportSubmit",
          metadata: { unitId: item.id, qty: item.qty },
          error: e,
        });
      }
    }

    setIsImporting(false);
    setImportText("");
    if (successCount > 0) {
      triggerHaptic("success");
      addToast(
        `Imported ${successCount} ${
          successCount === 1 ? "unit" : "units"
        } into Vault.`,
        "success"
      );
    }
  };

  return {
    vaultView,
    displayInventory,
    top3Units,
    searchQuery,
    setSearchQuery,
    activeTierFilter,
    setActiveTierFilter,
    sortMode,
    setSortMode,
    collapsedTiers,
    setCollapsedTiers,
    isSelectMode,
    setIsSelectMode,
    selectedUnits,
    setSelectedUnits,
    inspectTarget,
    setInspectTarget,
    importText,
    setImportText,
    isImporting,
    confirmClear,
    setConfirmClear,
    isReadOnly,
    viewingUserId,
    viewingUsername,
    returnChannel,
    setViewingUser,
    profile,
    metrics,
    vaultTotalValue,
    vaultLiquidValue,
    tierGroupedUnits,
    unownedSearchResults,
    parsedImportItems,
    handleTabSwitch,
    handleQtyChange,
    handleTogglePin,
    handleRemove,
    handleClearAction,
    handleCopyVault,
    handleSendToAnalyzer,
    handlePostAsAd,
    handleQuickTransfer,
    toggleSelectUnit,
    handleQuickAdd,
    executeMassImport,
    handleCloseVault,
    handleSwitchToProfile,
  };
}
