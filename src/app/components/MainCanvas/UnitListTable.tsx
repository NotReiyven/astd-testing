import { memo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  ArrowDown,
  ArrowUp,
  Loader2,
  Package,
} from "lucide-react";
import { PopupUnit, MasterUnit } from "../../../types";
import { useTradeStore } from "../../../store/useTradeStore";
import { useHistoryModalStore } from "../../../store/useHistoryModalStore";
import { triggerHaptic } from "../../../data/helpers";
import { HighlightText } from "./UnitGrid";
import { useAuthStore } from "../../../store/useAuthStore";
import { useInventoryStore } from "../../../store/useInventoryStore";
import { UnitAvatar } from "../shared/UnitAvatar";
import { logger } from "../../../lib/logger";

export const getStatColor = (label: string, value: number | string) => {
  if (label === "R") {
    const numVal = Number(value) || 0;
    if (numVal >= 19) return "#4DB6AC";
    if (numVal >= 9) return "#81C784";
    if (numVal >= 6) return "#FFB74D";
    return "var(--destructive)";
  }
  if (label === "L") {
    const stringVal = String(value).toLowerCase();
    if (stringVal === "high") return "#4DB6AC";
    if (stringVal === "average") return "var(--muted-foreground)";
    return "var(--destructive)";
  }
  return "var(--foreground)";
};

export const ListHeaderRow = memo(function ListHeaderRow({
  sortMode,
  setSortMode,
  viewMode,
}: {
  sortMode: string;
  setSortMode: (s: string) => void;
  viewMode: string;
}) {
  const isCompact = viewMode === "compact";

  const handleSort = (key: string) => {
    if (key === "value")
      setSortMode(sortMode === "value-desc" ? "value-asc" : "value-desc");
    if (key === "rarity") setSortMode("rarity-desc");
    if (key === "liquidity")
      setSortMode(sortMode === "liq-desc" ? "liq-asc" : "liq-desc");
  };

  const getSortIcon = (key: string) => {
    if (sortMode === `${key}-desc`)
      return <ArrowDown className="w-3 h-3 text-foreground ml-1" />;
    if (sortMode === `${key}-asc`)
      return <ArrowUp className="w-3 h-3 text-foreground ml-1" />;
    return null;
  };

  return (
    <div className="hidden md:flex items-center text-muted-foreground text-sm font-semibold select-none w-full gap-4">
      {!isCompact && <div className="w-10" />}
      <div className="flex-1">Unit</div>
      
      <div className="flex items-center justify-end gap-2 w-[300px] shrink-0">
        <button
          onClick={() => handleSort("value")}
          className="flex-1 flex items-center justify-end transition-colors hover:text-foreground cursor-pointer focus-visible:outline-none"
        >
          Value {getSortIcon("value")}
        </button>
        <button
          onClick={() => handleSort("rarity")}
          className="w-16 flex items-center justify-center transition-colors hover:text-foreground cursor-pointer focus-visible:outline-none"
        >
          R {getSortIcon("rarity")}
        </button>
        <button
          onClick={() => handleSort("liq")}
          className="w-16 flex items-center justify-center transition-colors hover:text-foreground cursor-pointer focus-visible:outline-none"
        >
          Liq {getSortIcon("liq")}
        </button>
      </div>

      <div className="w-48 shrink-0 pl-4 border-l border-border">Notices</div>
    </div>
  );
});

export const UnitListRow = memo(function UnitListRow({
  unit,
  isLast,
  searchQuery,
  viewMode,
}: {
  unit: MasterUnit;
  isLast: boolean;
  searchQuery?: string;
  viewMode: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addCard = useTradeStore((s) => s.addCard);
  const openModal = useHistoryModalStore((s) => s.openModal);
  const profile = useAuthStore((s) => s.profile);
  const addOrUpdateUnit = useInventoryStore((s) => s.addOrUpdateUnit);

  const isCompact = viewMode === "compact";

  const numericValue =
    typeof unit.value === "number"
      ? unit.value
      : typeof unit.valueMin === "number" && unit.valueMin > 0
      ? unit.valueMin
      : 0;

  const popupUnit: PopupUnit = {
    id: unit.id,
    name: unit.name,
    subtitle: unit.subtitle,
    value: numericValue,
  };

  const handleAdd = (type: "give" | "get") => {
    triggerHaptic("medium");
    addCard(type, { ...popupUnit, qty: 1 });
    window.dispatchEvent(
      new CustomEvent("trade-added", {
        detail: { name: popupUnit.name, type },
      })
    );
    setMenuOpen(false);
  };

  const handleSaveToInventory = async () => {
    const { useToastStore } = await import("../../../store/useToastStore");
    if (!profile) {
      useToastStore
        .getState()
        .addToast(
          "Sign in with Discord to save units to your Vault.",
          "warning",
          {
            action: {
              label: "Login",
              onClick: () => {
                void useAuthStore.getState().loginWithDiscord();
              },
            },
          }
        );
      return;
    }

    setIsSaving(true);
    try {
      await addOrUpdateUnit(profile.id, unit.id, 1);
      useToastStore
        .getState()
        .addToast(`Added 1× ${unit.name} to your Vault.`, "success");
      setMenuOpen(false);
    } catch (err) {
      logger.error("ASTD-INV-010", `Failed to add ${unit.name} to vault from UnitListTable`, {
        scope: "UnitListTable",
        action: "handleAddToVault",
        metadata: { unitId: unit.id },
        error: err,
      });
      useToastStore
        .getState()
        .addToast(
          `Could not save ${unit.name} to your Vault. Try again.`,
          "error"
        );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            triggerHaptic("light");
            setMenuOpen(true);
          }
        }}
        className={`relative w-full overflow-hidden bg-card transition-colors hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
          isLast ? "" : "border-b border-border"
        }`}
        onClick={() => {
          triggerHaptic("light");
          setMenuOpen(true);
        }}
      >
        {/* Desktop View */}
        <div
          className={`hidden md:flex items-center w-full gap-4 px-[var(--panel-p)] ${
            isCompact ? "py-2" : "py-3"
          }`}
        >
          {!isCompact && (
            <div className="w-10 h-10 rounded-[4px] bg-muted overflow-hidden shrink-0 border border-border relative">
              <UnitAvatar
                unitId={unit.id}
                unitName={unit.name}
                imageUrl={unit.imageUrl}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0 justify-center">
            <span className="text-[var(--ui-text-base)] font-bold text-foreground truncate">
              <HighlightText text={unit.name} query={searchQuery} />
            </span>
            {!isCompact && unit.subtitle && (
              <span className="text-sm font-medium text-muted-foreground truncate">
                <HighlightText text={unit.subtitle} query={searchQuery} />
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 w-[300px] shrink-0 font-mono tabular-nums">
            <div
              className="flex-1 flex justify-end cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                openModal(unit.id, "value");
              }}
            >
              <span className="text-[var(--ui-text-base)] font-black text-foreground">
                {unit.valueDisplay || unit.value.toLocaleString()}
              </span>
            </div>
            <div
              className="w-16 flex justify-center text-[12px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: getStatColor("R", unit.rarity) }}
              onClick={(e) => {
                e.stopPropagation();
                openModal(unit.id, "rarity");
              }}
            >
              {unit.rarity}
            </div>
            <div
              className="w-16 flex justify-center text-[12px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: getStatColor("L", unit.liquidity || "average") }}
              onClick={(e) => {
                e.stopPropagation();
                openModal(unit.id, "liquidity");
              }}
            >
              {(unit.liquidity || "Average").substring(0, 3)}
            </div>
          </div>

          <div className="w-48 shrink-0 pl-4 border-l border-border flex items-center">
            {unit.notice ? (
              <span className="text-[var(--ui-text-sm)] text-muted-foreground line-clamp-2 leading-snug">
                {unit.notice}
              </span>
            ) : (
              <span className="text-[var(--ui-text-sm)] text-muted-foreground italic">
                No notes
              </span>
            )}
          </div>
        </div>

        {/* Mobile View */}
        <div className="flex md:hidden flex-col w-full p-[var(--panel-p)] gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-[4px] bg-muted overflow-hidden shrink-0 relative">
                <UnitAvatar
                  unitId={unit.id}
                  unitName={unit.name}
                  imageUrl={unit.imageUrl}
                />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[var(--ui-text-base)] font-extrabold text-foreground truncate">
                  <HighlightText text={unit.name} query={searchQuery} />
                </span>
                <span className="text-sm font-medium text-muted-foreground truncate">
                  <HighlightText
                    text={unit.subtitle || "Official Unit"}
                    query={searchQuery}
                  />
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right font-mono font-black text-[var(--ui-text-lg)] tabular-nums">
              {unit.valueDisplay || unit.value.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[var(--ui-text-sm)] font-mono border-t border-border/50 pt-2">
            <span className="text-muted-foreground">
              R{" "}
              <span style={{ color: getStatColor("R", unit.rarity) }}>
                {unit.rarity}
              </span>
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">
              L{" "}
              <span
                style={{ color: getStatColor("L", unit.liquidity || "average") }}
              >
                {(unit.liquidity || "Avg").substring(0, 3)}
              </span>
            </span>
            {unit.notice && (
              <span className="flex-1 text-right text-muted-foreground italic truncate ml-auto">
                {unit.notice}
              </span>
            )}
          </div>
        </div>
      </div>

      {menuOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${unit.name} actions`}
            className="fixed inset-0 z-[1000000] flex flex-col justify-end md:justify-center md:items-center"
          >
            <div
              className="absolute inset-0 bg-black/90"
              onClick={() => setMenuOpen(false)}
            />

            <div className="relative w-full md:max-w-sm bg-popover rounded-t-[12px] md:rounded-[6px] p-5 shadow-2xl border-t md:border border-border animate-slide-up md:animate-fade-in">
              <div className="flex items-center justify-between mb-5 mt-2 md:mt-0">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="w-12 h-12 rounded-[4px] overflow-hidden bg-muted border border-border shrink-0 relative">
                    <UnitAvatar
                      unitId={unit.id}
                      unitName={unit.name}
                      imageUrl={unit.imageUrl}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[16px] font-black text-foreground tracking-tight truncate">
                      {unit.name}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground truncate">
                      {unit.subtitle}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close"
                  className="w-11 h-11 md:w-8 md:h-8 rounded-[4px] border border-transparent hover:border-border hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  <X className="w-6 h-6 md:w-4 md:h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleAdd("give")}
                  className="w-full flex items-center justify-center gap-2 bg-[#FAA61A] hover:bg-[#d98b14] transition-colors text-white text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none cursor-pointer"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Add to 'You Give'
                </button>

                <button
                  type="button"
                  onClick={() => handleAdd("get")}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 transition-colors text-primary-foreground text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none cursor-pointer"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  Add to 'You Get'
                </button>

                <button
                  type="button"
                  onClick={() => void handleSaveToInventory()}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 bg-[#23a559] hover:bg-[#1f914e] disabled:opacity-50 transition-colors text-white text-[13px] font-bold h-[44px] rounded-[4px] focus-visible:outline-none cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  {isSaving ? "Saving…" : "Save to My Inventory"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openModal(unit.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-card hover:bg-muted transition-colors text-foreground border border-border text-[13px] font-bold h-[44px] rounded-[4px] mt-0.5 focus-visible:outline-none cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  View Market History
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
});

