import { BulkSelectionDock } from "./shared/BulkSelectionDock";
import { ViewingUserBar } from "./shared/ViewingUserBar";
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  GiChest,
  GiPadlock,
  GiHeartInside,
  GiFairyWand,
} from "react-icons/gi";
import { useUnits } from "../../context/UnitContext";
import { useShowDelay } from "../../hooks/useShowDelay";
import { EmptyState } from "./ui/EmptyState";
import { AsyncButton } from "./ui/AsyncButton";
import { getContrastTextColor } from "./shared/DiscordRolePill";

// Inline SVG icons — no lucide-react
const IconSearch = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconTrash = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);
const IconPlus = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconArrowUpDown = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m21 16-4 4-4-4" />
    <path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
  </svg>
);
const IconSettings = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7h-9" />
    <path d="M14 17H5" />
    <circle cx="17" cy="17" r="3" />
    <circle cx="7" cy="7" r="3" />
  </svg>
);
const IconClose = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconUploadCloud = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const IconCheck = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconChevronUp = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const IconCopy = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconArrowUpCircle = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="16 12 12 8 8 12" />
    <line x1="12" y1="16" x2="12" y2="8" />
  </svg>
);
const IconArrowDownCircle = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="8 12 12 16 16 12" />
    <line x1="12" y1="8" x2="12" y2="16" />
  </svg>
);
const IconBulkSelect = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3a2 2 0 0 0-2 2" />
    <path d="M19 3a2 2 0 0 1 2 2" />
    <path d="M21 19a2 2 0 0 1-2 2" />
    <path d="M5 21a2 2 0 0 1-2-2" />
    <path d="M9 3h1" />
    <path d="M9 21h1" />
    <path d="M14 3h1" />
    <path d="M14 21h1" />
    <path d="M3 9v1" />
    <path d="M21 9v1" />
    <path d="M3 14v1" />
    <path d="M21 14v1" />
  </svg>
);
const IconTrendingUp = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconTrendingDown = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);
const IconInfo = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const IconArrowLeft = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);
const IconPin = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
  </svg>
);
const IconSliders = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);
import {
  getProxyImage,
  handleImageError,
  TIER_CONFIG,
  FILTERS,
  getTier,
  GRID_STATUS_CFG,
} from "../../data";
import { getAvatarStyle, getInitials } from "./TradeAnalyzer/summaryUtils";
import { QuantitySelector } from "./ui/QuantitySelector";
import { CustomDropdown, useClickOutside } from "./MainCanvas/CustomDropdown";
import { triggerHaptic } from "../../data/helpers";
import { StatusIcon } from "./shared/Formatters";

import {
  SORT_OPTIONS,
  TIER_ORDER,
  getUnitConservativeValue,
} from "./InventoryChannel/inventoryUtils";
import { Sparkline } from "./InventoryChannel/Sparkline";
import { TradingCardSlot } from "./InventoryChannel/TradingCardSlot";
import { ValueBreakdownModal } from "./InventoryChannel/ValueBreakdownModal";
import { useInventoryManager } from "../../hooks/useInventoryManager";
import { useHistoryModalStore } from "../../store/useHistoryModalStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useAuthStore } from "../../store/useAuthStore";
import { InventoryVaultSkeleton } from "./InventoryChannel/InventoryVaultSkeleton";

export function InventoryChannel() {
  const { units: ALL_UNITS, isLoading: isUnitsLoading } = useUnits();
  const isInventoryLoading = useInventoryStore((s) => s.isLoading);
  const fetchInventory = useInventoryStore((s) => s.fetchInventory);
  const fetchWishlist = useInventoryStore((s) => s.fetchWishlist);
  const session = useAuthStore((s) => s.session);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);
  const giveItems = useTradeStore((s) => s.giveItems);
  const getItems = useTradeStore((s) => s.getItems);

  const {
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
    viewingUsername,
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
    viewingUserId,
    returnChannel,
    handleSwitchToProfile,
  } = useInventoryManager(ALL_UNITS);

  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const [omniboxIndex, setOmniboxIndex] = useState(-1);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const omniboxRef = useRef<HTMLDivElement>(null);
  useClickOutside(omniboxRef, null, () => setIsOmniboxOpen(false));

  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const importInputRef = useRef<HTMLTextAreaElement>(null);
  const importDialogRef = useRef<HTMLDivElement>(null);
  const inspectDialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [manageOpen, setManageOpen] = useState(false);
  const manageRef = useRef<HTMLDivElement>(null);
  useClickOutside(manageRef, null, () => {
    setManageOpen(false);
    setConfirmClear(null);
  });

  useEffect(() => {
    const activeDialog = importMenuOpen
      ? importDialogRef.current
      : inspectTarget
      ? inspectDialogRef.current
      : null;

    if (!activeDialog) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (importMenuOpen) setImportMenuOpen(false);
        else if (inspectTarget) setInspectTarget(null);
        return;
      }

      if (e.key === "Tab") {
        const focusables = activeDialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [importMenuOpen, inspectTarget, setInspectTarget]);

  const handleOmniboxKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOmniboxIndex((prev) =>
        Math.min(prev + 1, unownedSearchResults.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOmniboxIndex((prev) => Math.max(prev - 1, -1));
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

  const ownerUserId = profile?.id || session?.user?.id;

  useEffect(() => {
    if (!isReadOnly && ownerUserId) {
      fetchInventory(ownerUserId, false);
      fetchWishlist(ownerUserId, false);
    }
  }, [isReadOnly, ownerUserId, fetchInventory, fetchWishlist]);

  const isVaultLoading =
    isInventoryLoading ||
    isAuthLoading ||
    isUnitsLoading ||
    Boolean(!isReadOnly && session?.user?.id && !profile);

  const showVaultSkeleton = useShowDelay(isVaultLoading);

  const totalFilteredUnits = useMemo(
    () =>
      Object.values(tierGroupedUnits).reduce((sum, arr) => sum + arr.length, 0),
    [tierGroupedUnits]
  );

  const activeFilterDescription = useMemo(() => {
    const parts: string[] = [];
    if (searchQuery.trim()) {
      parts.push(`search “${searchQuery.trim()}”`);
    }
    if (activeTierFilter !== "All") {
      parts.push(
        `tier “${activeTierFilter === "Pinned" ? "Locked" : activeTierFilter}”`
      );
    }
    return parts.join(" & ");
  }, [searchQuery, activeTierFilter]);

  if (!profile && !isReadOnly && !isVaultLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <EmptyState
            icon={<GiChest className="w-6 h-6" />}
            title="Sign In to Open Your Vault"
            description="Connect your Discord account to track your unit collection, net worth, and wishlist targets across devices."
            action={{
              label: "Sign In with Discord",
              onClick: loginWithDiscord,
            }}
          />
        </div>
      </div>
    );
  }

  const goalProgress =
    metrics.estimatedValue > 0
      ? Math.min(100, (vaultTotalValue / metrics.estimatedValue) * 100)
      : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full select-none font-sans relative bg-background">
      {/* Read-Only Viewing Header Bar */}
      {isReadOnly && (
        <ViewingUserBar
          targetUserId={viewingUserId || ""}
          targetUsername={viewingUsername || "Trader"}
          activeTab="vault"
          returnChannel={returnChannel}
          onSwitchTab={(tab) => {
            if (tab === "profile") {
              handleSwitchToProfile();
            }
          }}
          onClose={handleCloseVault}
        />
      )}

      {/* Master Tabs */}
      <div className="flex items-center justify-between px-6 pt-3 pb-3 bg-card border-b border-border shrink-0 z-20">
        <div className="flex bg-input rounded-[4px] p-1 border border-border shadow-inner">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              handleTabSwitch("owned");
            }}
            className={`px-4 py-1.5 rounded-[3px] text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-150 focus-visible:outline-none cursor-pointer active:scale-95 ${
              vaultView === "owned"
                ? "bg-foreground text-background shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
            }`}
          >
            {isReadOnly ? "Vault" : "My Vault"}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              handleTabSwitch("wishlist");
            }}
            className={`px-4 py-1.5 rounded-[3px] text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-150 focus-visible:outline-none cursor-pointer active:scale-95 ${
              vaultView === "wishlist"
                ? "bg-foreground text-background shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
            }`}
          >
            Wishlist
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <button
            onClick={() => {
              triggerHaptic("light");
              setIsControlsCollapsed(!isControlsCollapsed);
            }}
            className="md:hidden flex items-center gap-1 px-3 py-1.5 rounded-[4px] bg-muted border border-border text-foreground text-[13px] font-medium text-muted-foreground cursor-pointer"
          >
            <IconSliders className="w-3.5 h-3.5" />
            <span>{isControlsCollapsed ? "Filters" : "Collapse"}</span>
            {isControlsCollapsed ? (
              <IconChevronDown className="w-3.5 h-3.5" />
            ) : (
              <IconChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Header Controls Bar (Collapsible on Mobile) */}
      <div
        className={`flex-shrink-0 flex flex-col bg-card border-b border-border shadow-sm z-20 relative overflow-visible ${
          importMenuOpen ? "opacity-30 pointer-events-none" : ""
        }`}
      >
        <div
          className={`flex flex-col lg:flex-row lg:items-center justify-between px-3 md:px-5 py-3 gap-3 transition-[max-height,opacity,padding] duration-300 ${
            isControlsCollapsed
              ? "max-h-0 opacity-0 overflow-hidden py-0 pointer-events-none md:max-h-none md:opacity-100 md:overflow-visible md:py-3 md:pointer-events-auto"
              : "max-h-none opacity-100 overflow-visible"
          }`}
        >
          {/* Filter Toggles Row */}
          <div className="flex bg-input rounded-[4px] p-1 border border-border w-full lg:w-auto overflow-x-auto hide-scrollbar shrink-0 shadow-inner h-[var(--ui-height-input)] items-center">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTierFilter("All");
              }}
              className={`flex-shrink-0 px-3 h-full rounded-[3px] text-[12px] font-bold tracking-wide transition-[transform,background-color,color,box-shadow] duration-150 focus-visible:outline-none cursor-pointer active:scale-95 flex items-center justify-center ${
                activeTierFilter === "All"
                  ? "bg-foreground text-background shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
              }`}
            >
              All
            </button>
            {vaultView !== "wishlist" && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTierFilter("Pinned");
                }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-full rounded-[3px] text-[12px] font-bold tracking-wide transition-[transform,background-color,color,box-shadow] duration-150 focus-visible:outline-none cursor-pointer active:scale-95 justify-center ${
                  activeTierFilter === "Pinned"
                    ? "bg-foreground text-background shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
                }`}
              >
                <GiPadlock
                  className={`w-3.5 h-3.5 fill-current ${
                    activeTierFilter === "Pinned"
                      ? "text-background"
                      : "text-[#FAA61A]"
                  }`}
                />{" "}
                Locked
              </button>
            )}
            {FILTERS.filter((f) => f !== "All").map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTierFilter(f);
                }}
                className={`flex-shrink-0 px-3 h-full rounded-[3px] text-[12px] font-bold tracking-wide transition-[transform,background-color,color,box-shadow] duration-150 focus-visible:outline-none cursor-pointer active:scale-95 flex items-center justify-center ${
                  activeTierFilter === f
                    ? "bg-foreground text-background shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-between lg:justify-start">
            <div className="flex items-center gap-2 shrink-0">
              {!isReadOnly && vaultView !== "wishlist" && (
                <button
                  onClick={() => {
                    triggerHaptic("light");
                    setIsSelectMode(!isSelectMode);
                    setSelectedUnits(new Set());
                  }}
                  className={`flex items-center gap-1.5 px-3 h-[32px] rounded-[4px] text-[12px] font-bold transition-all shrink-0 focus-visible:outline-none border cursor-pointer ${
                    isSelectMode
                      ? "bg-foreground text-background border-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-card border-transparent hover:border-border"
                  }`}
                  title="Toggle Select Mode"
                >
                  <IconBulkSelect className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bulk Select</span>
                </button>
              )}
              <div className="shrink-0 w-full sm:w-auto sm:min-w-[190px] md:min-w-[225px]">
                <CustomDropdown
                  icon={IconArrowUpDown}
                  value={sortMode}
                  options={SORT_OPTIONS}
                  onChange={setSortMode}
                  defaultLabel="Sort By"
                  className="sm:min-w-[190px] md:min-w-[225px]"
                />
              </div>
            </div>

            <div
              className="relative flex-1 lg:w-[280px] shrink-0 flex items-center gap-1.5"
              ref={omniboxRef}
            >
              <div className="relative w-full">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsOmniboxOpen(true);
                    setOmniboxIndex(-1);
                  }}
                  onFocus={() => setIsOmniboxOpen(true)}
                  onKeyDown={handleOmniboxKeyDown}
                  placeholder={
                    isReadOnly
                      ? `Search ${
                          vaultView === "wishlist" ? "wishlist" : "vault"
                        }...`
                      : vaultView === "wishlist"
                      ? "Search wishlist..."
                      : "Search units..."
                  }
                  className="w-full bg-input border border-border rounded-[4px] pl-9 pr-8 py-1 text-[13px] text-foreground outline-none placeholder-muted-foreground focus:border-foreground transition-colors h-[32px]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsOmniboxOpen(false);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-[2px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    aria-label="Clear search"
                  >
                    <IconClose className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={handleCopyVault}
                className="w-[32px] h-[32px] shrink-0 bg-muted hover:bg-card text-muted-foreground hover:text-foreground rounded-[4px] flex items-center justify-center transition-colors focus-visible:outline-none border border-transparent hover:border-border cursor-pointer"
                title={`Copy ${
                  vaultView === "wishlist" ? "Wishlist" : "Vault"
                } Summary`}
              >
                <IconCopy className="w-3.5 h-3.5" />
              </button>

              {!isReadOnly && vaultView !== "wishlist" && (
                <div className="relative shrink-0" ref={manageRef}>
                  <button
                    onClick={() => setManageOpen(!manageOpen)}
                    className={`w-[32px] h-[32px] shrink-0 flex items-center justify-center rounded-[4px] transition-colors focus-visible:outline-none border cursor-pointer ${
                      manageOpen || confirmClear
                        ? "bg-card text-foreground border-border"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-card border-transparent hover:border-border"
                    }`}
                    title="Inventory Options"
                  >
                    <IconSettings className="w-3.5 h-3.5" />
                  </button>

                  {manageOpen && (
                    <div className="absolute top-full right-0 mt-2 w-[260px] bg-popover border border-border shadow-2xl rounded-[6px] p-1.5 z-50 flex flex-col">
                      {confirmClear ? (
                        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-[4px] flex flex-col gap-3">
                          <span className="text-[12.5px] text-foreground font-medium leading-snug">
                            Remove{" "}
                            {confirmClear === "unpinned" ? (
                              <span className="font-bold text-destructive">
                                {metrics.unpinnedCount} unlocked
                              </span>
                            ) : (
                              <span className="font-bold text-destructive">
                                all {metrics.uniqueCount}
                              </span>
                            )}{" "}
                            units? This cannot be undone.
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setConfirmClear(null)}
                              className="flex-1 px-3 py-2 bg-muted hover:bg-card rounded-[2px] text-[12px] font-bold text-foreground transition-colors focus-visible:outline-none cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleClearAction}
                              className="flex-1 px-3 py-2 bg-destructive hover:bg-destructive/90 rounded-[2px] text-[12px] font-bold text-white transition-colors focus-visible:outline-none cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setImportMenuOpen(true);
                              setManageOpen(false);
                              setTimeout(
                                () => importInputRef.current?.focus(),
                                100
                              );
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-bold text-foreground hover:bg-muted transition-colors focus-visible:outline-none flex items-center justify-between cursor-pointer"
                          >
                            Import from Text{" "}
                            <GiFairyWand className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <div className="w-full h-px bg-border my-1" />
                          <button
                            onClick={() => {
                              if (metrics.unpinnedCount > 0)
                                setConfirmClear("unpinned");
                            }}
                            disabled={metrics.unpinnedCount === 0}
                            className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-bold text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none flex items-center justify-between cursor-pointer"
                          >
                            Clear Unlocked{" "}
                            <span className="text-muted-foreground font-mono font-bold text-[11px]">
                              {metrics.unpinnedCount}
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              if (metrics.uniqueCount > 0)
                                setConfirmClear("all");
                            }}
                            disabled={metrics.uniqueCount === 0}
                            className="w-full text-left px-3 py-2.5 rounded-[4px] text-[12.5px] font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none flex items-center justify-between cursor-pointer"
                          >
                            Clear Entire Vault{" "}
                            <span className="text-destructive opacity-70 font-mono font-bold text-[11px]">
                              {metrics.uniqueCount}
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Omnibox Dropdown */}
              {!isReadOnly && isOmniboxOpen && searchQuery.trim() && (
                <div
                  id="omnibox-dropdown"
                  role="listbox"
                  aria-label="Unit search results"
                  className="absolute top-full right-0 w-[min(380px,calc(100vw-24px))] sm:w-[380px] mt-1.5 max-h-[380px] overflow-y-auto custom-scrollbar bg-popover border border-border rounded-[8px] shadow-2xl z-[100] flex flex-col p-1.5 text-left"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1 flex items-center justify-between shrink-0 select-none">
                    <span>
                      Quick Add to {vaultView === "wishlist" ? "Wishlist" : "Vault"}
                    </span>
                    <span className="text-[9px] font-mono opacity-70">
                      ↑↓ navigate · ↵ add
                    </span>
                  </div>

                  {unownedSearchResults.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[12px] text-muted-foreground flex flex-col items-center gap-1.5 select-none">
                      <IconSearch className="w-5 h-5 opacity-40" />
                      <span>No units match “{searchQuery.trim()}”</span>
                    </div>
                  ) : (
                    unownedSearchResults.map((u, i) => {
                      const isSelected = i === omniboxIndex;
                      const ownedItem = displayInventory.find(
                        (item) => item.unit_id === u.id
                      );
                      const ownedQty = ownedItem ? ownedItem.quantity : 0;
                      const tier = getTier(u);
                      const tierColor =
                        TIER_CONFIG[tier]?.badgeColor || "#5865F2";
                      const unitVal = getUnitConservativeValue(u);

                      return (
                        <button
                          key={u.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            handleQuickAdd(u);
                            setIsOmniboxOpen(false);
                          }}
                          onMouseEnter={() => setOmniboxIndex(i)}
                          className={`flex items-center gap-2.5 w-full p-2 rounded-[6px] transition-[background-color,color] duration-150 focus-visible:outline-none cursor-pointer text-left ${
                            isSelected
                              ? "bg-muted text-foreground"
                              : "bg-transparent hover:bg-muted text-foreground"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-[4px] bg-muted/70 flex items-center justify-center shrink-0 border border-border overflow-hidden relative">
                            {getProxyImage(u.id, u.imageUrl) ? (
                              <img
                                src={getProxyImage(u.id, u.imageUrl)!}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => handleImageError(e, u.id)}
                              />
                            ) : (
                              <span
                                className="text-[8px] font-bold z-0"
                                style={getAvatarStyle(u.name)}
                              >
                                {getInitials(u.name)}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[13px] font-bold truncate leading-tight">
                              {u.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] font-mono text-muted-foreground font-semibold tabular-nums">
                                {unitVal > 0 ? unitVal.toLocaleString() : "—"} Val
                              </span>
                              <span className="text-border text-[10px]">·</span>
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.2 rounded-[3px] border shadow-xs"
                                style={{
                                  backgroundColor: tierColor,
                                  color: getContrastTextColor(tierColor),
                                  borderColor:
                                    getContrastTextColor(tierColor) === "#000000"
                                      ? "rgba(0, 0, 0, 0.25)"
                                      : "rgba(255, 255, 255, 0.2)",
                                }}
                              >
                                {tier}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center pl-1">
                            {vaultView === "wishlist" ? (
                              ownedQty > 0 ? (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-[4px] border border-emerald-500/20">
                                  Saved
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-foreground bg-foreground/10 hover:bg-foreground hover:text-background px-2.5 py-1 rounded-[4px] transition-colors flex items-center gap-1 active:scale-95">
                                  <IconPlus className="w-3 h-3" /> Wishlist
                                </span>
                              )
                            ) : ownedQty > 0 ? (
                              <span className="text-[11px] font-bold text-foreground bg-muted hover:bg-foreground hover:text-background px-2 py-1 rounded-[4px] border border-border flex items-center gap-1 active:scale-95 transition-colors">
                                <span className="text-[10px] font-mono opacity-80 tabular-nums">
                                  {ownedQty}x
                                </span>
                                <IconPlus className="w-3 h-3" />
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-background bg-foreground hover:opacity-90 px-2.5 py-1 rounded-[4px] transition-opacity flex items-center gap-1 shadow-sm active:scale-95">
                                <IconPlus className="w-3 h-3" /> Add
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto custom-scrollbar relative z-0 transition-all duration-150 ${
          importMenuOpen ? "opacity-30 pointer-events-none" : ""
        }`}
      >
        <div className="p-4 md:p-8 pb-32">
          {isVaultLoading ? (
            showVaultSkeleton ? (
              <InventoryVaultSkeleton />
            ) : null
          ) : displayInventory.length === 0 ? (
            <div className="py-12 max-w-lg mx-auto">
              {searchQuery.trim() ? (
                <EmptyState
                  icon={<IconSearch className="w-5 h-5" />}
                  title="No Matching Units Found"
                  description={`No units in this ${
                    vaultView === "wishlist" ? "wishlist" : "vault"
                  } match “${searchQuery.trim()}”.`}
                  action={{
                    label: "Clear Search",
                    onClick: () => setSearchQuery(""),
                  }}
                />
              ) : vaultView === "wishlist" ? (
                <EmptyState
                  icon={<GiHeartInside className="w-6 h-6" />}
                  title={
                    isReadOnly
                      ? `${viewingUsername || "Trader"}'s Wishlist Is Empty`
                      : "Your Wishlist Is Empty"
                  }
                  description={
                    isReadOnly
                      ? "This trader hasn't added any target units to their wishlist yet."
                      : "Search for units using the bar above to set your trading targets and track your goal progress automatically."
                  }
                  action={
                    !isReadOnly
                      ? {
                          label: "Search Units to Add",
                          onClick: () => searchInputRef.current?.focus(),
                        }
                      : undefined
                  }
                />
              ) : metrics.uniqueCount === 0 ? (
                <EmptyState
                  icon={<GiChest className="w-6 h-6" />}
                  title={
                    isReadOnly
                      ? `${viewingUsername || "Trader"}'s Vault Is Empty`
                      : "Your Vault Is Empty"
                  }
                  description={
                    isReadOnly
                      ? "This trader hasn't added any units to their collection yet."
                      : "Search for your first unit to start tracking your net worth, or import your entire list from text at once."
                  }
                  action={
                    !isReadOnly
                      ? {
                          label: "Search Units to Add",
                          onClick: () => searchInputRef.current?.focus(),
                        }
                      : undefined
                  }
                  secondaryAction={
                    !isReadOnly
                      ? {
                          label: "Import from Text…",
                          variant: "outline",
                          onClick: () => {
                            setImportMenuOpen(true);
                            setTimeout(
                              () => importInputRef.current?.focus(),
                              100
                            );
                          },
                        }
                      : undefined
                  }
                />
              ) : null}
            </div>
          ) : (
            <>
              {/* Portfolio Dashboard */}
              {!searchQuery &&
                activeTierFilter === "All" &&
                (vaultView === "wishlist" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 mb-8">
                    <div className="bg-card border border-border rounded-[8px] p-6 flex flex-col justify-center relative shadow-sm">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                        {isReadOnly && viewingUsername
                          ? `${viewingUsername}'s Wishlist Progress`
                          : "Wishlist Goal Progress"}
                      </h3>
                      <div className="flex justify-between items-end mb-3">
                        <div className="flex flex-col">
                          <span className="text-[28px] md:text-[36px] font-black text-foreground font-mono leading-none">
                            {vaultTotalValue.toLocaleString()}{" "}
                            <span className="text-muted-foreground text-[16px] md:text-[20px]">
                              / {metrics.estimatedValue.toLocaleString()}
                            </span>
                          </span>
                          <span className="text-[11px] text-muted-foreground mt-2 font-medium">
                            Vault Net Worth vs Wishlist Target Value
                          </span>
                        </div>
                        <span className="text-[24px] font-black text-foreground">
                          {goalProgress.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-[2px] overflow-hidden border border-border">
                        <div
                          className="h-full bg-foreground transition-all duration-1000 ease-out"
                          style={{ width: `${goalProgress}%` }}
                        />
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-[8px] p-6 flex flex-col shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                        Most Expensive Targets
                      </span>
                      <div className="flex flex-col gap-2.5 flex-1 justify-center">
                        {top3Units.map((item, idx) => {
                          const proxyUrl = getProxyImage(
                            item.master.id,
                            item.master.imageUrl
                          );
                          const unitVal = getUnitConservativeValue(item.master);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2.5 rounded-[4px] bg-muted border border-border"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <span className="font-mono font-black text-[12px] text-muted-foreground w-6 text-center shrink-0 py-0.5">
                                  #{idx + 1}
                                </span>
                                <div className="w-8 h-8 rounded-[2px] bg-popover border border-border overflow-hidden shrink-0 flex items-center justify-center relative">
                                  <span
                                    className="text-[9px] font-bold text-white z-0"
                                    style={getAvatarStyle(item.master.name)}
                                  >
                                    {getInitials(item.master.name)}
                                  </span>
                                  {proxyUrl && (
                                    <img
                                      src={proxyUrl}
                                      alt={item.master.name}
                                      className="absolute inset-0 w-full h-full object-cover z-10"
                                      style={{ objectPosition: "center 15%" }}
                                      onError={(e) =>
                                        handleImageError(e, item.master.id)
                                      }
                                    />
                                  )}
                                </div>
                                <span className="text-[13px] font-bold text-foreground truncate leading-tight">
                                  {item.master.name}
                                </span>
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
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 mb-8">
                    <div className="bg-card border border-border rounded-[8px] p-6 flex flex-col justify-between relative shadow-sm">
                      <Sparkline />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {isReadOnly && viewingUsername
                              ? `${viewingUsername}'s Vault Net Worth`
                              : "Vault Net Worth"}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono">
                            {metrics.marketMomentum.net > 0 ? (
                              <span className="text-[#23a559] flex items-center gap-1 bg-[#23a559]/10 px-2 py-0.5 rounded-[2px] border border-[#23a559]/20">
                                <IconTrendingUp className="w-3 h-3" /> +
                                {metrics.marketMomentum.net} Net Rising
                              </span>
                            ) : metrics.marketMomentum.net < 0 ? (
                              <span className="text-destructive flex items-center gap-1 bg-destructive/10 px-2 py-0.5 rounded-[2px] border border-destructive/20">
                                <IconTrendingDown className="w-3 h-3" />{" "}
                                {Math.abs(metrics.marketMomentum.net)} Net
                                Dropping
                              </span>
                            ) : (
                              <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded-[2px] border border-border">
                                Market Stable
                              </span>
                            )}
                          </div>
                        </div>

                        <h2 onClick={() => setBreakdownModalOpen(true)} className="text-[32px] md:text-[40px] font-black text-foreground tracking-tighter leading-none font-mono cursor-pointer hover:text-primary transition-colors" title="Click to view value breakdown">
                          {metrics.estimatedValue.toLocaleString()}
                        </h2>

                        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                          <div className="bg-muted p-3 rounded-[4px] border border-border flex flex-col">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                              Liquid Assets
                            </span>
                            <span className="text-[14px] font-bold text-foreground font-mono mt-0.5">
                              {metrics.liquidValue.toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-muted p-3 rounded-[4px] border border-border flex flex-col">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                              UNOB Proportion
                            </span>
                            <span className="text-[14px] font-bold text-foreground font-mono mt-0.5">
                              {metrics.unobPercentage.toFixed(0)}% Unobtainable
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-5 relative z-10">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span>Demand Distribution</span>
                          <span>
                            {(
                              (metrics.liquidValue / metrics.liqTotal) *
                              100
                            ).toFixed(0)}
                            % Liquid
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-[2px] bg-muted overflow-hidden flex border border-border">
                          <div
                            className="h-full bg-[#4DB6AC] transition-all duration-700 ease-out"
                            style={{ width: `${metrics.highPct}%` }}
                            title={`High Demand: ${metrics.highPct.toFixed(
                              0
                            )}%`}
                          />
                          <div
                            className="h-full bg-foreground transition-all duration-700 ease-out"
                            style={{ width: `${metrics.avgPct}%` }}
                            title={`Average Demand: ${metrics.avgPct.toFixed(
                              0
                            )}%`}
                          />
                          <div
                            className="h-full bg-destructive transition-all duration-700 ease-out"
                            style={{ width: `${metrics.lowPct}%` }}
                            title={`Low Demand: ${metrics.lowPct.toFixed(
                              0
                            )}%`}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground">
                          <span>High: {metrics.highPct.toFixed(0)}%</span>
                          <span>Avg: {metrics.avgPct.toFixed(0)}%</span>
                          <span>Low: {metrics.lowPct.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-[8px] p-6 flex flex-col shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                        Crown Assets
                      </span>

                      <div className="flex flex-col gap-2.5 flex-1 justify-center">
                        {top3Units.map((item, idx) => {
                          const proxyUrl = getProxyImage(
                            item.master.id,
                            item.master.imageUrl
                          );
                          const unitVal =
                            getUnitConservativeValue(item.master) *
                            item.quantity;
                          const share =
                            metrics.estimatedValue > 0
                              ? (unitVal / metrics.estimatedValue) * 100
                              : 0;

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2.5 rounded-[4px] bg-muted border border-border"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <span className="font-mono font-black text-[12px] text-muted-foreground w-6 text-center shrink-0 py-0.5">
                                  #{idx + 1}
                                </span>
                                <div className="w-8 h-8 rounded-[2px] bg-popover border border-border overflow-hidden shrink-0 flex items-center justify-center relative">
                                  <span
                                    className="text-[9px] font-bold text-white z-0"
                                    style={getAvatarStyle(item.master.name)}
                                  >
                                    {getInitials(item.master.name)}
                                  </span>
                                  {proxyUrl && (
                                    <img
                                      src={proxyUrl}
                                      alt={item.master.name}
                                      className="absolute inset-0 w-full h-full object-cover z-10"
                                      style={{ objectPosition: "center 15%" }}
                                      onError={(e) =>
                                        handleImageError(e, item.master.id)
                                      }
                                    />
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[13px] font-bold text-foreground truncate leading-tight">
                                    {item.master.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {`${share.toFixed(1)}% of total net worth`}
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
                ))}

              {/* Unit Cards Grid */}
              {totalFilteredUnits === 0 ? (
                <div className="py-12 max-w-lg mx-auto">
                  <EmptyState
                    icon={<IconSearch className="w-5 h-5" />}
                    title="No Units Match Your Active Filters"
                    description={
                      activeFilterDescription
                        ? `No units in your ${
                            vaultView === "wishlist" ? "wishlist" : "vault"
                          } match ${activeFilterDescription}.`
                        : `No units match the current filter selection.`
                    }
                    action={{
                      label: "Clear Filters",
                      onClick: () => {
                        setSearchQuery("");
                        setActiveTierFilter("All");
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {TIER_ORDER.map((tier) => {
                    const tierItems = tierGroupedUnits[tier] || [];
                    if (tierItems.length === 0) return null;
                    const isCollapsed = collapsedTiers[tier];
                    const tierCfg = TIER_CONFIG[tier] || {
                      badgeColor: "#5865F2",
                      label: tier,
                    };

                    const totalInTier = ALL_UNITS.filter(
                      (u) => getTier(u) === tier
                    ).length;
                    const uniqueCollected = new Set(
                      tierItems.map((i) => i.unit_id)
                    ).size;
                    const progressPct =
                      totalInTier > 0 ? (uniqueCollected / totalInTier) * 100 : 0;

                    return (
                      <div key={tier} className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-[3px] h-[16px] rounded-full"
                            style={{ backgroundColor: tierCfg.badgeColor }}
                          />
                          <h3 className="text-[15px] font-black uppercase tracking-wider text-foreground leading-none mt-0.5">
                            {tierCfg.label}
                          </h3>
                          <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-[2px] border border-border ml-1 tabular-nums">
                            {tierItems.reduce((s, i) => s + i.quantity, 0)} Units
                          </span>

                          {vaultView !== "wishlist" && (
                            <div className="hidden md:flex items-center gap-2 ml-4">
                              <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                                {uniqueCollected} / {totalInTier} Collected
                              </span>
                              <div className="w-20 h-1.5 bg-muted rounded-[2px] overflow-hidden border border-border">
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${progressPct}%`,
                                    backgroundColor: tierCfg.badgeColor,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex-1 h-px bg-border ml-2" />
                          <button
                            onClick={() =>
                              setCollapsedTiers((prev) => ({
                                ...prev,
                                [tier]: !prev[tier],
                              }))
                            }
                            aria-label={isCollapsed ? "Expand tier" : "Collapse tier"}
                            className="p-1 rounded-[4px] hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer"
                          >
                            <IconChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isCollapsed ? "-rotate-90" : ""
                              }`}
                            />
                          </button>
                        </div>

                        {!isCollapsed && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                            {tierItems.map((item, idx) => {
                              const stagedGive =
                                giveItems.find((g) => g.id === item.unit_id)
                                  ?.qty || 0;
                              const stagedGet =
                                getItems.find((g) => g.id === item.unit_id)
                                  ?.qty || 0;

                              return (
                                <TradingCardSlot
                                  key={`${item.unit_id}-${idx}`}
                                  item={item}
                                  master={item.master}
                                  onInspect={(it, mst) =>
                                    setInspectTarget({ item: it, master: mst })
                                  }
                                  isSelectMode={isSelectMode}
                                  isSelected={selectedUnits.has(item.id)}
                                  toggleSelect={toggleSelectUnit}
                                  stagedGiveQty={stagedGive}
                                  stagedGetQty={stagedGet}
                                  onQtyChange={handleQtyChange}
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
              )}
            </>
          )}
        </div>
      </div>

      {/* Persistent Action Dock for Selection Mode */}
      {isSelectMode && selectedUnits.size > 0 && (
        <BulkSelectionDock
          selectedCount={selectedUnits.size}
          onClearSelection={() => {
            setIsSelectMode(false);
            setSelectedUnits(new Set());
          }}
          onPostAsAd={handlePostAsAd}
          onSendToGive={() => handleSendToAnalyzer("give")}
          onSendToGet={() => handleSendToAnalyzer("get")}
        />
      )}

      {/* Mass Import Modal */}
      {importMenuOpen && !isReadOnly && (
        <div className="absolute inset-0 z-[100000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setImportMenuOpen(false)}
          />
          <div
            ref={importDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mass Import Inventory"
            className="bg-popover border border-border rounded-[8px] w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative z-10 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-2 text-foreground">
                <IconUploadCloud className="w-5 h-5 text-foreground" />
                <h3 className="text-[15px] font-bold tracking-tight">
                  Mass Import
                </h3>
              </div>
              <button
                onClick={() => setImportMenuOpen(false)}
                aria-label="Close Mass Import modal"
                className="text-muted-foreground hover:text-foreground p-1 focus-visible:outline-none cursor-pointer"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Paste your inventory text below. The parser automatically
                detects unit names and quantities (e.g.{" "}
                <strong className="text-foreground">
                  “3x Koku Drip, 1 Death”
                </strong>
                ).
              </p>

              <textarea
                ref={importInputRef}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    (e.metaKey || e.ctrlKey) &&
                    e.key === "Enter" &&
                    parsedImportItems.length > 0 &&
                    !isImporting
                  ) {
                    e.preventDefault();
                    void executeMassImport();
                  }
                }}
                placeholder="Paste items here…"
                aria-label="Inventory text to import"
                className="w-full h-[120px] bg-input border border-border rounded-[4px] p-3 text-[13px] text-foreground outline-none focus:border-foreground resize-none custom-scrollbar"
              />

              <div className="min-h-[60px] bg-muted rounded-[4px] p-3 border border-border flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Live Parser Output
                  </span>
                  <span className="text-[12px] font-mono font-bold text-foreground tabular-nums">
                    {parsedImportItems.length} Found
                  </span>
                </div>
                {parsedImportItems.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {parsedImportItems.map((item, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold bg-card text-foreground border border-border px-2 py-0.5 rounded-[2px] truncate max-w-[120px]"
                      >
                        x{item.qty} {item.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic mt-1">
                    Waiting for valid input…
                  </span>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-border bg-card flex justify-end gap-2">
              <button
                onClick={() => setImportMenuOpen(false)}
                className="px-4 py-2 rounded-[4px] text-[12px] font-bold text-foreground hover:bg-muted border border-transparent focus-visible:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <AsyncButton
                onClick={executeMassImport}
                isLoading={isImporting}
                loadingAnnouncement="Importing…"
                disabled={parsedImportItems.length === 0 || isImporting}
                className="px-5 py-2 rounded-[4px] text-[12px] font-bold text-background bg-foreground hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground shadow-sm flex items-center gap-2 focus-visible:outline-none cursor-pointer"
              >
                <IconCheck className="w-3.5 h-3.5" /> Import Items
              </AsyncButton>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {inspectTarget && (
        <div className="absolute inset-0 z-[100000] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setInspectTarget(null)}
          />
          <div
            ref={inspectDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Inspect ${inspectTarget.master.name}`}
            className="relative w-full md:max-w-xl max-h-[88vh] overflow-y-auto custom-scrollbar bg-popover rounded-t-[8px] md:rounded-[6px] p-5 shadow-2xl border-t md:border border-border z-10 flex flex-col gap-4"
          >
            <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border rounded-full" />

            <div className="flex items-center justify-between border-b border-border pb-3 mt-2 md:mt-0">
              <div className="flex items-center gap-3.5 min-w-0 pr-4">
                <div className="w-12 h-12 rounded-[2px] overflow-hidden bg-muted border border-border shrink-0 relative flex items-center justify-center">
                  <div
                    className="absolute inset-0 flex items-center justify-center text-white font-bold text-[14px] z-0"
                    style={getAvatarStyle(inspectTarget.master.name)}
                  >
                    {getInitials(inspectTarget.master.name)}
                  </div>
                  {getProxyImage(
                    inspectTarget.master.id,
                    inspectTarget.master.imageUrl
                  ) && (
                    <img
                      src={
                        getProxyImage(
                          inspectTarget.master.id,
                          inspectTarget.master.imageUrl
                        )!
                      }
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover z-10 bg-transparent"
                      onError={(e) =>
                        handleImageError(e, inspectTarget.master.id)
                      }
                    />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-foreground text-[20px] sm:text-[24px] font-black tracking-tight truncate">
                      {inspectTarget.master.name}
                    </h2>
                    {inspectTarget.master.status && (
                      <span
                        className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-[4px] border tracking-wider inline-flex items-center gap-1 shadow-xs select-none"
                        style={{
                          backgroundColor:
                            GRID_STATUS_CFG[
                              inspectTarget.master
                                .status as keyof typeof GRID_STATUS_CFG
                            ]?.bg,
                          color:
                            GRID_STATUS_CFG[
                              inspectTarget.master
                                .status as keyof typeof GRID_STATUS_CFG
                            ]?.color,
                          borderColor:
                            GRID_STATUS_CFG[
                              inspectTarget.master
                                .status as keyof typeof GRID_STATUS_CFG
                            ]?.border,
                        }}
                      >
                        <StatusIcon status={inspectTarget.master.status} />
                        {
                          GRID_STATUS_CFG[
                            inspectTarget.master
                              .status as keyof typeof GRID_STATUS_CFG
                          ]?.label
                        }
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-muted-foreground text-[11px] sm:text-[12px] font-bold uppercase tracking-wider">
                      {inspectTarget.master.subtitle || "Official Unit"}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-[2px] bg-card text-foreground border border-border">
                      Tier {getTier(inspectTarget.master)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectTarget(null)}
                aria-label="Close inspect modal"
                className="p-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer self-start"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-[4px] p-3 flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  Individual Unit Value
                </span>
                <span className="text-[18px] font-black font-mono text-foreground mt-1 tabular-nums">
                  {inspectTarget.master.valueDisplay ||
                    (typeof inspectTarget.master.value === "number"
                      ? inspectTarget.master.value.toLocaleString()
                      : inspectTarget.master.value)}
                </span>
                {vaultView !== "wishlist" && (
                  <span className="text-[11px] text-muted-foreground mt-1 font-medium">
                    Vault Subtotal:{" "}
                    <strong className="text-foreground font-mono tabular-nums">
                      {(
                        getUnitConservativeValue(inspectTarget.master) *
                        inspectTarget.item.quantity
                      ).toLocaleString()}
                    </strong>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-card border border-border rounded-[4px] p-3 flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Rarity (0-20)
                  </span>
                  <span className="text-[14px] font-black font-mono text-foreground mt-1 tabular-nums">
                    {inspectTarget.master.rarity ?? "N/A"}
                  </span>
                </div>
                <div className="bg-card border border-border rounded-[4px] p-3 flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Liquidity
                  </span>
                  <span className="text-[13px] font-black font-mono text-foreground mt-1 uppercase">
                    {inspectTarget.master.liquidity ?? "Average"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 bg-card p-3.5 rounded-[6px] border border-border">
              {vaultView !== "wishlist" && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Vault Quantity
                  </span>
                  {!isReadOnly ? (
                    <QuantitySelector
                      qty={inspectTarget.item.quantity}
                      onChange={(newQty) =>
                        handleQtyChange(
                          inspectTarget.item.unit_id,
                          newQty - inspectTarget.item.quantity
                        )
                      }
                      minQty={0}
                    />
                  ) : (
                    <span className="font-mono font-bold text-foreground tabular-nums">
                      x{inspectTarget.item.quantity}
                    </span>
                  )}
                </div>
              )}

              <div
                className={`grid grid-cols-2 gap-2 ${
                  vaultView !== "wishlist" ? "pt-2 border-t border-border" : ""
                }`}
              >
                <button
                  disabled={inspectTarget.item.is_pinned}
                  onClick={() => handleSendToAnalyzer("give")}
                  className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-black bg-[#FAA61A] hover:bg-[#d98b14] disabled:bg-muted disabled:text-muted-foreground transition-colors focus-visible:outline-none cursor-pointer border border-transparent"
                >
                  <IconArrowUpCircle className="w-4 h-4" /> To Give
                </button>
                <button
                  disabled={inspectTarget.item.is_pinned}
                  onClick={() => handleSendToAnalyzer("get")}
                  className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-background bg-foreground hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground transition-colors focus-visible:outline-none cursor-pointer border border-transparent"
                >
                  <IconArrowDownCircle className="w-4 h-4" /> To Get
                </button>
              </div>

              {!isReadOnly &&
                (vaultView === "wishlist" ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={async () => {
                        await handleQuickTransfer(inspectTarget.master.id);
                        setInspectTarget(null);
                      }}
                      className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-background bg-foreground hover:bg-foreground/90 transition-colors focus-visible:outline-none cursor-pointer border border-transparent"
                    >
                      <GiChest className="w-3.5 h-3.5" />
                      <span>Move to Vault</span>
                    </button>
                    <button
                      onClick={() =>
                        handleRemove(inspectTarget.item, inspectTarget.master)
                      }
                      className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-muted-foreground hover:text-destructive bg-muted hover:bg-destructive/10 border border-border hover:border-destructive transition-colors focus-visible:outline-none cursor-pointer"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() =>
                        handleTogglePin(
                          inspectTarget.item.unit_id,
                          inspectTarget.item.is_pinned
                        )
                      }
                      className={`flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold border focus-visible:outline-none cursor-pointer transition-colors ${
                        inspectTarget.item.is_pinned
                          ? "bg-destructive/10 text-destructive border-destructive"
                          : "bg-muted text-foreground border-border hover:bg-card hover:border-muted-foreground"
                      }`}
                    >
                      {inspectTarget.item.is_pinned ? (
                        <GiPadlock className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <IconPin className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {inspectTarget.item.is_pinned ? "Locked" : "Lock"}
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        handleRemove(inspectTarget.item, inspectTarget.master)
                      }
                      className="flex items-center justify-center gap-2 py-2 rounded-[4px] text-[12px] font-bold text-muted-foreground hover:text-foreground bg-muted hover:bg-card border border-border hover:border-muted-foreground transition-colors focus-visible:outline-none cursor-pointer"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
            </div>

            <div className="w-full h-[env(safe-area-inset-bottom)] md:hidden mt-1" />
          </div>
        </div>
      )}

      <ValueBreakdownModal
        isOpen={breakdownModalOpen}
        onClose={() => setBreakdownModalOpen(false)}
        items={Object.values(tierGroupedUnits).flat()}
      />
    </div>
  );
}
