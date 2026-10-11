import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  RotateCcw,
  Share2,
  Check,
  ArrowUpDown,
  X,
  Trash2,
} from "lucide-react";
import {
  GiAbacus,
  GiFairyWand,
  GiBookmark,
  GiSettingsKnobs,
  GiMegaphone,
} from "react-icons/gi";
import { TradeSectionPanel } from "./TradeSectionPanel";
import { TradeNotices } from "./TradeNotices";
import { SmartParserMenu } from "./SmartParserMenu";
import { TradeSummaryBox } from "./TradeSummaryBox";
import { usePanelResize } from "../../../hooks/usePanelResize";
import { getShareText } from "./summaryUtils";
import { useUnits } from "../../../context/UnitContext";
import { GuideType } from "../guides/AquaGuideOverlay";
import {
  useTradeStore,
  DEFAULT_ANALYZER_SETTINGS,
  AnalyzerSettings,
  TradePreset,
} from "../../../store/useTradeStore";
import { triggerHaptic, copyTextWithFallback } from "../../../data/helpers";
import { useAuthStore } from "../../../store/useAuthStore";
import { useToastStore } from "../../../store/useToastStore";
import { useTradeUndo } from "../../../hooks/useTradeUndo";
import { useTradeGlobalInput } from "../../../hooks/useTradeGlobalInput";
import { RollingNumber } from "../shared/Formatters";
import { useBottomSheet } from "../../../hooks/useBottomSheet";
import { InlineHint } from "../ui/InlineHint";

const MAX_PRESET_NAME_LENGTH = 30;

export function TradeAnalyzerPanel({
  isOpen = true,
  onClose,
  guideState,
  startGuide: _startGuide,
  analyzerZ = "z-[60]",
}: {
  isOpen?: boolean;
  onClose?: () => void;
  guideState?: { type: string | null; step: number };
  startGuide: (type: GuideType) => void;
  analyzerZ?: string;
}) {
  const { units: ALL_UNITS } = useUnits();
  const profile = useAuthStore((s) => s.profile);
  const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);
  const addToast = useToastStore((s) => s.addToast);

  const giveItems = useTradeStore((s) => s.giveItems);
  const getItems = useTradeStore((s) => s.getItems);
  const changeQty = useTradeStore((s) => s.changeQty);
  const removeCard = useTradeStore((s) => s.removeCard);
  const clearSection = useTradeStore((s) => s.clearSection);
  const addCard = useTradeStore((s) => s.addCard);
  const swap = useTradeStore((s) => s.swap);
  const overwrite = useTradeStore((s) => s.overwrite);
  const pinnedIds = useTradeStore((s) => s.pinnedIds);
  const togglePin = useTradeStore((s) => s.togglePin);
  const setComposerOpen = useTradeStore((s) => s.setComposerOpen);
  const presets = useTradeStore((s) => s.presets);
  const savePreset = useTradeStore((s) => s.savePreset);
  const renamePreset = useTradeStore((s) => s.renamePreset);
  const deletePreset = useTradeStore((s) => s.deletePreset);
  const restorePreset = useTradeStore((s) => s.restorePreset);
  const loadPreset = useTradeStore((s) => s.loadPreset);
  const rawSettings = useTradeStore((s) => s.analyzerSettings);
  const updateAnalyzerSettings = useTradeStore((s) => s.updateAnalyzerSettings);

  const settings: AnalyzerSettings = {
    ...DEFAULT_ANALYZER_SETTINGS,
    ...(rawSettings || {}),
  };

  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [presetNameError, setPresetNameError] = useState<string | null>(null);
  const presetInputRef = useRef<HTMLInputElement>(null);

  const [renamingPresetId, setRenamingPresetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [isGuestHintDismissed, setIsGuestHintDismissed] = useState<boolean>(
    () => {
      try {
        return sessionStorage.getItem("astd_dismiss_analyzer_guest_hint") === "1";
      } catch {
        return false;
      }
    }
  );

  const handleDismissGuestHint = useCallback(() => {
    setIsGuestHintDismissed(true);
    try {
      sessionStorage.setItem("astd_dismiss_analyzer_guest_hint", "1");
    } catch {
      // Ignore storage errors in restricted environments
    }
  }, []);

  const { panelWidth, startResize, panelRef } = usePanelResize(360, 320, 600);
  const {
    undoCache,
    confirmClear,
    saveUndoState,
    handleSafeClear,
    handleUndo,
  } = useTradeUndo();
  const {
    isGlobalDragging,
    smartMenuOpen,
    setSmartMenuOpen,
    initialParserText,
    setInitialParserText,
  } = useTradeGlobalInput();

  useEffect(() => {
    const checkMobile = (width: number) => setIsMobile(width < 768);
    checkMobile(window.innerWidth);

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) checkMobile(entries[0].contentRect.width);
    });
    observer.observe(document.body);

    return () => observer.disconnect();
  }, []);

  const closeSheet = useCallback(() => {
    triggerHaptic("light");
    if (onClose) onClose();
  }, [onClose]);

  const { sheetRef, onTouchStart, onTouchMove, onTouchEnd } =
    useBottomSheet(isOpen, closeSheet, isMobile);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        if (renamingPresetId) {
          setRenamingPresetId(null);
          setRenameError(null);
          return;
        }
        if (smartMenuOpen) {
          setSmartMenuOpen(false);
          return;
        }
        if (isPresetsOpen) {
          setIsPresetsOpen(false);
          return;
        }
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        if (isOpen && onClose && document.activeElement?.tagName !== "INPUT") {
          closeSheet();
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [
    isOpen,
    onClose,
    smartMenuOpen,
    isPresetsOpen,
    isSettingsOpen,
    renamingPresetId,
    closeSheet,
  ]);

  const { giveTotal, getTotal, givePercent, getPercent } = useMemo(() => {
    const gTotal = giveItems.reduce((s, c) => s + c.value * c.qty, 0);
    const tTotal = getItems.reduce((s, c) => s + c.value * c.qty, 0);
    const totalTradeValue = gTotal + tTotal;
    return {
      giveTotal: gTotal,
      getTotal: tTotal,
      givePercent:
        totalTradeValue === 0 ? 50 : (gTotal / totalTradeValue) * 100,
      getPercent: totalTradeValue === 0 ? 50 : (tTotal / totalTradeValue) * 100,
    };
  }, [giveItems, getItems]);

  const handleShare = useCallback(() => {
    triggerHaptic("success");
    const text = getShareText(
      giveItems,
      getItems,
      giveTotal,
      getTotal,
      ALL_UNITS
    );
    void copyTextWithFallback(text).then((ok) => {
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        addToast("Copied formatted trade summary to clipboard.", "success", {
          dedupeKey: "trade-share-copied",
        });
      } else {
        addToast(
          "Could not copy trade summary automatically. Check browser clipboard permissions.",
          "error"
        );
      }
    });
  }, [giveItems, getItems, giveTotal, getTotal, ALL_UNITS, addToast]);

  const handleAdvertise = () => {
    triggerHaptic("medium");
    if (!profile) {
      addToast(
        "Sign in with Discord to post trade advertisements.",
        "warning",
        {
          dedupeKey: "advertise-auth-gate",
          action: {
            label: "Login",
            onClick: () => {
              void loginWithDiscord();
            },
          },
        }
      );
      return;
    }
    setComposerOpen(true, getItems.length === 0 ? "lf_offers" : "standard");
  };

  const validatePresetName = (
    rawName: string,
    excludeId?: string
  ): string | null => {
    const trimmed = rawName.trim();
    if (!trimmed) {
      return "Enter a name for this loadout.";
    }
    if (trimmed.length > MAX_PRESET_NAME_LENGTH) {
      return `Loadout name must be ${MAX_PRESET_NAME_LENGTH}\u00A0characters or fewer (currently ${trimmed.length}).`;
    }
    const isDuplicate = presets.some(
      (p) =>
        p.id !== excludeId &&
        p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      return `A loadout named “${trimmed}” already exists. Choose a unique name.`;
    }
    return null;
  };

  const handleSavePreset = () => {
    if (giveItems.length === 0 && getItems.length === 0) {
      setPresetNameError(
        "Add at least 1 unit to Give or Get before saving a loadout."
      );
      presetInputRef.current?.focus();
      return;
    }

    const err = validatePresetName(newPresetName);
    if (err) {
      setPresetNameError(err);
      presetInputRef.current?.focus();
      return;
    }

    const trimmed = newPresetName.trim();
    triggerHaptic("medium");
    savePreset(trimmed);
    setNewPresetName("");
    setPresetNameError(null);
    addToast(`Saved loadout “${trimmed}”.`, "success");
  };

  const handleStartRename = (preset: TradePreset) => {
    triggerHaptic("light");
    setRenamingPresetId(preset.id);
    setRenameValue(preset.name);
    setRenameError(null);
    window.setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 20);
  };

  const handleConfirmRename = (preset: TradePreset) => {
    const err = validatePresetName(renameValue, preset.id);
    if (err) {
      setRenameError(err);
      renameInputRef.current?.focus();
      return;
    }
    const trimmed = renameValue.trim();
    triggerHaptic("medium");
    renamePreset(preset.id, trimmed);
    setRenamingPresetId(null);
    setRenameError(null);
    addToast(`Renamed loadout to “${trimmed}”.`, "success");
  };

  const handleDeletePresetWithUndo = (preset: TradePreset, index: number) => {
    triggerHaptic("light");
    if (renamingPresetId === preset.id) {
      setRenamingPresetId(null);
      setRenameError(null);
    }
    const snapshot: TradePreset = {
      ...preset,
      give: [...preset.give],
      get: [...preset.get],
    };
    let didRestore = false;
    deletePreset(preset.id);
    addToast(`Deleted loadout “${preset.name}”.`, "info", {
      dedupeKey: `delete-preset-${preset.id}`,
      action: {
        label: "Undo",
        onClick: () => {
          if (didRestore) return;
          didRestore = true;
          restorePreset(snapshot, index);
          addToast(`Restored loadout “${snapshot.name}”.`, "info");
        },
      },
    });
  };

  const handleLoadPreset = (preset: TradePreset) => {
    triggerHaptic("medium");
    const hasExistingCards = giveItems.length > 0 || getItems.length > 0;
    const prevGive = [...giveItems];
    const prevGet = [...getItems];

    if (hasExistingCards) {
      saveUndoState();
    }

    loadPreset(preset.id);
    setIsPresetsOpen(false);

    if (hasExistingCards) {
      addToast(
        `Loaded loadout “${preset.name}” (replaced current trade).`,
        "success",
        {
          dedupeKey: `load-preset-${preset.id}`,
          action: {
            label: "Undo",
            onClick: () => {
              overwrite(prevGive, prevGet);
              addToast("Restored previous trade items.", "info");
            },
          },
        }
      );
    } else {
      addToast(`Loaded loadout “${preset.name}”.`, "success", {
        dedupeKey: `load-preset-${preset.id}`,
      });
    }
  };

  const openSheet = () => {
    triggerHaptic("medium");
    window.dispatchEvent(new Event("open-analyzer"));
  };

  const isGuestStep2 =
    guideState?.type === "guest_tour" && guideState?.step === 2;
  const isGuestStep3 =
    guideState?.type === "guest_tour" && guideState?.step === 3;

  const isWandTarget = isGuestStep2;
  const isClearTarget = false;
  const isElevated = isGuestStep2 || isGuestStep3;
  const hasActiveTrade = giveItems.length > 0 || getItems.length > 0;

  const renderToggleRow = (
    label: string,
    sub: string,
    checked: boolean,
    onToggle: () => void,
    disabled = false
  ) => (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        triggerHaptic("light");
        onToggle();
      }}
      disabled={disabled}
      className={`flex items-center justify-between gap-3 w-full p-2.5 rounded-[6px] border text-left transition-colors cursor-pointer focus-visible:outline-none ${
        disabled
          ? "opacity-40 cursor-not-allowed bg-popover/30 border-border/50"
          : "bg-popover hover:bg-muted/60 border-border"
      }`}
    >
      <div className="flex flex-col min-w-0 pr-2">
        <span className="text-[12.5px] font-bold text-foreground leading-tight">
          {label}
        </span>
        <span className="text-[10.5px] text-muted-foreground font-medium mt-0.5 leading-snug">
          {sub}
        </span>
      </div>
      <div
        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
          checked
            ? "bg-primary justify-end"
            : "bg-muted border border-border justify-start"
        }`}
      >
        <div
          className={`w-3.5 h-3.5 rounded-full transition-transform ${
            checked ? "bg-primary-foreground" : "bg-muted-foreground"
          }`}
        />
      </div>
    </button>
  );

  const renderCalculatorContent = () => (
    <>
      <div className="flex-shrink-0 flex items-center gap-1 px-2 @[28rem]/analyzer:px-3 py-2 border-b border-border relative z-20 bg-popover min-w-0">
        <div className="w-7 h-7 flex-shrink-0 rounded-[4px] flex items-center justify-center bg-card border border-border">
          <GiAbacus className="w-4 h-4 text-foreground" />
        </div>

        <div className="hidden @[36rem]/analyzer:flex items-center min-w-0 flex-1 pr-2">
          <span className="text-[var(--ui-text-base)] font-bold text-foreground select-none whitespace-nowrap truncate">
            Trade Analyzer
          </span>
        </div>

        <div className="@[36rem]/analyzer:hidden flex-1 min-w-0" />

        <>
          {undoCache && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                handleUndo();
              }}
              className="flex-shrink-0 flex items-center gap-1.5 px-2 h-8 rounded-[4px] text-[var(--ui-text-sm)] font-bold transition-colors active:scale-95 text-destructive-foreground bg-destructive hover:bg-destructive/80 focus-visible:outline-none relative z-35 pointer-events-auto shadow-sm mr-0.5 cursor-pointer"
              title="Undo Clear"
            >
              <RotateCcw className="w-3.5 h-3.5" />{" "}
              <span className="hidden sm:inline">Undo</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setSmartMenuOpen(!smartMenuOpen);
              setIsPresetsOpen(false);
              setIsSettingsOpen(false);
            }}
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-[4px] transition-colors active:scale-95 focus-visible:outline-none border relative z-35 pointer-events-auto cursor-pointer ${
              isWandTarget
                ? "bg-primary text-primary-foreground border-primary z-[100005] animate-pulse shadow-[0_0_15px_var(--primary)]"
                : smartMenuOpen
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted border-border text-muted-foreground hover:bg-card hover:text-foreground"
            }`}
            title="Smart Parser"
            aria-label="Smart Parser"
          >
            <GiFairyWand className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setIsPresetsOpen(!isPresetsOpen);
              setSmartMenuOpen(false);
              setIsSettingsOpen(false);
            }}
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-[4px] transition-colors active:scale-95 focus-visible:outline-none border relative z-35 pointer-events-auto cursor-pointer ${
              isPresetsOpen
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted border-border text-muted-foreground hover:bg-card hover:text-foreground"
            }`}
            title="Saved Loadouts"
            aria-label="Saved Loadouts"
          >
            <GiBookmark className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setIsSettingsOpen(!isSettingsOpen);
              setSmartMenuOpen(false);
              setIsPresetsOpen(false);
            }}
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-[4px] transition-colors active:scale-95 focus-visible:outline-none border relative z-35 pointer-events-auto cursor-pointer ${
              isSettingsOpen
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted border-border text-muted-foreground hover:bg-card hover:text-foreground"
            }`}
            title="Analyzer Layout Settings"
            aria-label="Analyzer Layout Settings"
          >
            <GiSettingsKnobs className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("medium");
              handleSafeClear();
            }}
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-[4px] transition-colors active:scale-95 focus-visible:outline-none border relative z-35 pointer-events-auto cursor-pointer ${
              isClearTarget
                ? "bg-destructive text-destructive-foreground border-destructive z-[100005] animate-pulse"
                : confirmClear
                ? "bg-destructive text-destructive-foreground border-destructive animate-pulse"
                : "bg-muted border-border text-muted-foreground hover:bg-card hover:text-foreground"
            }`}
            title={confirmClear ? "Click again to confirm" : "Clear trade"}
            aria-label={confirmClear ? "Confirm clear trade" : "Clear trade"}
          >
            {confirmClear ? (
              <Check className="w-4 h-4" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 px-2 h-8 min-w-8 rounded-[4px] text-[var(--ui-text-sm)] font-bold transition-colors active:scale-95 text-foreground focus-visible:outline-none relative z-35 pointer-events-auto cursor-pointer"
            style={{
              background: copied ? "#23a559" : "var(--muted)",
              border: "1px solid var(--border)",
            }}
            title="Share formatted trade string"
            aria-label={copied ? "Copied" : "Share"}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className="hidden @[40rem]/analyzer:inline">
              {copied ? "Copied!" : "Share"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleAdvertise}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 px-2 h-8 min-w-8 rounded-[4px] text-[var(--ui-text-sm)] font-bold transition-colors active:scale-95 text-primary-foreground bg-primary hover:bg-primary/90 focus-visible:outline-none border border-primary relative z-35 pointer-events-auto shadow-sm cursor-pointer"
            title={
              profile
                ? "Post this trade as an advertisement"
                : "Sign in with Discord to post this trade as an advertisement"
            }
            aria-label={
              profile ? "Advertise" : "Advertise (Sign in required)"
            }
          >
            <GiMegaphone className="w-4 h-4" />
            <span className="hidden @[40rem]/analyzer:inline">
              {profile ? "Advertise" : "Advertise · Sign In"}
            </span>
          </button>
        </>

        {onClose && (
          <button
            type="button"
            onClick={closeSheet}
            aria-label="Close Analyzer"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-[4px] text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors focus-visible:outline-none border border-transparent hover:border-destructive relative z-35 pointer-events-auto cursor-pointer ml-0.5"
            title="Close Analyzer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!profile && !isGuestHintDismissed && (
        <div className="px-2 @[28rem]/analyzer:px-3 py-1.5 bg-popover/60 border-b border-border flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>Sign in with Discord to post trades to the public feed.</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void loginWithDiscord()}
              className="font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[3px] px-1.5 py-0.5 cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={handleDismissGuestHint}
              aria-label="Dismiss sign-in hint for this session"
              title="Dismiss for this session"
              className="w-6 h-6 flex items-center justify-center rounded-[3px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col relative bg-card">
        {smartMenuOpen && (
          <SmartParserMenu
            ALL_UNITS={ALL_UNITS}
            onClose={() => {
              setSmartMenuOpen(false);
              setInitialParserText("");
            }}
            onSaveUndo={saveUndoState}
            initialText={initialParserText}
          />
        )}

        {isPresetsOpen && (
          <div className="absolute top-[var(--gap-sm)] left-[var(--gap-sm)] right-[var(--gap-sm)] z-50 p-[var(--panel-p)] bg-card border border-border rounded-[8px] animate-fade-in shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex flex-col gap-3.5 max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-[var(--ui-text-sm)] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <GiBookmark className="w-4 h-4 text-primary" /> Saved Loadouts
              </span>
              <button
                type="button"
                onClick={() => setIsPresetsOpen(false)}
                aria-label="Close Saved Loadouts"
                className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none rounded-[3px] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSavePreset();
              }}
              noValidate
              className="flex flex-col gap-1.5"
            >
              <label
                htmlFor="new-preset-name-input"
                className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                Save Current Trade as Loadout
              </label>
              <div className="flex gap-2">
                <input
                  id="new-preset-name-input"
                  ref={presetInputRef}
                  value={newPresetName}
                  onChange={(e) => {
                    setNewPresetName(e.target.value);
                    if (presetNameError) setPresetNameError(null);
                  }}
                  placeholder="e.g. High Tier Offer…"
                  aria-invalid={Boolean(presetNameError)}
                  aria-describedby={
                    presetNameError ? "preset-name-error" : undefined
                  }
                  className={`flex-1 bg-input border rounded-[4px] px-3 py-2 text-base md:text-[var(--ui-text-base)] text-foreground outline-none placeholder-muted-foreground focus:ring-1 transition-colors shadow-inner ${
                    presetNameError
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-primary"
                  }`}
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-[4px] text-[var(--ui-text-sm)] font-bold transition-colors active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                >
                  Save Loadout
                </button>
              </div>
              {presetNameError && (
                <p
                  id="preset-name-error"
                  role="alert"
                  className="text-[11.5px] font-medium text-destructive leading-snug"
                >
                  {presetNameError}
                </p>
              )}
            </form>

            {hasActiveTrade && presets.length > 0 && (
              <InlineHint variant="warning">
                Loading a loadout replaces your current trade (
                {giveItems.length}&nbsp;Give, {getItems.length}&nbsp;Get). You
                can undo immediately after loading.
              </InlineHint>
            )}

            <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {presets.length === 0 ? (
                <p className="text-[var(--ui-text-sm)] text-muted-foreground italic text-center py-4 bg-muted rounded-[6px] border border-border">
                  No saved loadouts yet. Add units to Give or Get above and save
                  a loadout for quick reuse.
                </p>
              ) : (
                presets.map((p, idx) => {
                  const isRenaming = renamingPresetId === p.id;
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col gap-2 bg-popover p-2.5 rounded-[6px] border border-border group hover:border-primary/50 transition-colors shadow-sm"
                    >
                      {isRenaming ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleConfirmRename(p);
                          }}
                          noValidate
                          className="flex flex-col gap-1.5"
                        >
                          <label
                            htmlFor={`rename-preset-${p.id}`}
                            className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                          >
                            Rename Loadout
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`rename-preset-${p.id}`}
                              ref={renameInputRef}
                              value={renameValue}
                              onChange={(e) => {
                                setRenameValue(e.target.value);
                                if (renameError) setRenameError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.stopPropagation();
                                  setRenamingPresetId(null);
                                  setRenameError(null);
                                }
                              }}
                              placeholder="Loadout name…"
                              aria-invalid={Boolean(renameError)}
                              aria-describedby={
                                renameError
                                  ? `rename-preset-error-${p.id}`
                                  : undefined
                              }
                              className={`flex-1 min-w-0 bg-input border rounded-[4px] px-2.5 py-1.5 text-base md:text-xs text-foreground outline-none focus:ring-1 ${
                                renameError
                                  ? "border-destructive focus:ring-destructive"
                                  : "border-border focus:ring-primary"
                              }`}
                            />
                            <button
                              type="submit"
                              className="px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-[4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shrink-0"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingPresetId(null);
                                setRenameError(null);
                              }}
                              className="px-2 py-1.5 bg-muted hover:bg-card text-muted-foreground hover:text-foreground text-xs font-bold rounded-[4px] border border-border transition-colors focus-visible:outline-none cursor-pointer shrink-0"
                            >
                              Cancel
                            </button>
                          </div>
                          {renameError && (
                            <p
                              id={`rename-preset-error-${p.id}`}
                              role="alert"
                              className="text-[11px] font-medium text-destructive leading-snug"
                            >
                              {renameError}
                            </p>
                          )}
                        </form>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-[var(--ui-text-base)] font-bold text-foreground truncate">
                              {p.name}
                            </span>
                            <span className="text-[var(--ui-text-xs)] font-medium text-muted-foreground truncate tabular-nums">
                              {p.give.length}&nbsp;Give • {p.get.length}
                              &nbsp;Get
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleLoadPreset(p)}
                              className="px-2.5 py-1.5 bg-muted hover:bg-primary hover:text-primary-foreground text-foreground text-[var(--ui-text-sm)] font-bold rounded-[4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer border border-border hover:border-primary"
                              title={
                                hasActiveTrade
                                  ? `Replace current trade with “${p.name}”`
                                  : `Load “${p.name}”`
                              }
                            >
                              {hasActiveTrade ? "Replace" : "Load"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartRename(p)}
                              className="px-2 py-1.5 bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold rounded-[4px] border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                              title={`Rename “${p.name}”`}
                            >
                              Rename…
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePresetWithUndo(p, idx)}
                              aria-label={`Delete loadout ${p.name}`}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive cursor-pointer"
                              title={`Delete “${p.name}”`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {isSettingsOpen && (
          <div className="absolute top-[var(--gap-sm)] left-[var(--gap-sm)] right-[var(--gap-sm)] z-50 p-4 bg-card border border-border rounded-[8px] animate-fade-in shadow-[0_15px_40px_rgba(0,0,0,0.65)] flex flex-col gap-4 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <GiSettingsKnobs className="w-4 h-4 text-primary" /> Analyzer
                Display
              </span>
              <button
                type="button"
                aria-label="Close Analyzer Display Settings"
                onClick={() => setIsSettingsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none rounded-[4px] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Unit Rows Section */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
                Unit Cards
              </span>
              {renderToggleRow(
                "Compact Unit Rows",
                "Collapse unit QTY & controls into a single compact line",
                settings.collapseUnitsByDefault,
                () =>
                  updateAnalyzerSettings({
                    collapseUnitsByDefault: !settings.collapseUnitsByDefault,
                  })
              )}
            </div>

            {/* Forecast & Metrics Section */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
                Summary Metrics
              </span>
              {renderToggleRow(
                "Forecast & Metrics Row",
                "Show ST Flip, LT Hold, Rarity, and Liquidity below totals",
                settings.showSummaryMetrics,
                () =>
                  updateAnalyzerSettings({
                    showSummaryMetrics: !settings.showSummaryMetrics,
                  })
              )}

              {settings.showSummaryMetrics && (
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  {(
                    [
                      { key: "showStFlip", label: "ST Flip" },
                      { key: "showLtHold", label: "LT Hold" },
                      { key: "showRarity", label: "Rarity" },
                      { key: "showLiquidity", label: "Liquidity" },
                    ] as const
                  ).map((m) => {
                    const active = settings[m.key];
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          updateAnalyzerSettings({ [m.key]: !active });
                        }}
                        className={`py-1.5 px-2 rounded-[5px] text-[10.5px] font-bold border transition-colors cursor-pointer ${
                          active
                            ? "bg-primary/15 border-primary text-primary"
                            : "bg-popover border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Trade Notices Section */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
                Trade Notices
              </span>
              {renderToggleRow(
                "Show Trade Notices",
                "Master toggle for the entire Trade Notices box",
                settings.showTradeNotices,
                () =>
                  updateAnalyzerSettings({
                    showTradeNotices: !settings.showTradeNotices,
                  })
              )}

              {renderToggleRow(
                "Status Momentum Summary",
                "Show the Give ➔ Get market status tag counts",
                settings.showMomentumSummary,
                () =>
                  updateAnalyzerSettings({
                    showMomentumSummary: !settings.showMomentumSummary,
                  }),
                !settings.showTradeNotices
              )}

              {renderToggleRow(
                "You Give Notices",
                "Show unit copy counts & notes for your Offering side",
                settings.showGiveNotices,
                () =>
                  updateAnalyzerSettings({
                    showGiveNotices: !settings.showGiveNotices,
                  }),
                !settings.showTradeNotices
              )}

              {renderToggleRow(
                "You Get Notices",
                "Show unit copy counts & notes for your Requesting side",
                settings.showGetNotices,
                () =>
                  updateAnalyzerSettings({
                    showGetNotices: !settings.showGetNotices,
                  }),
                !settings.showTradeNotices
              )}

              {renderToggleRow(
                "Terms in this Trade",
                "Show definitions for market tags present in the trade",
                settings.showTermsInTrade,
                () =>
                  updateAnalyzerSettings({
                    showTermsInTrade: !settings.showTermsInTrade,
                  }),
                !settings.showTradeNotices
              )}
            </div>
          </div>
        )}

          <TradeSummaryBox
            isAnalyzerTarget={isGuestStep3}
            giveTotal={giveTotal}
            getTotal={getTotal}
            givePercent={givePercent}
            getPercent={getPercent}
            giveItems={giveItems}
            getItems={getItems}
            ALL_UNITS={ALL_UNITS}
            isCompact={isMobile && isInputFocused}
          />

          <div className="flex-1 min-h-0 overflow-y-auto py-1 custom-scrollbar overscroll-y-contain pb-safe flex flex-col [&>*]:shrink-0">
            <div
              className={`relative transition-all duration-300 ${
                isClearTarget
                  ? "ring-2 ring-primary rounded-[8px] bg-primary/5 shadow-lg z-[100005]"
                  : ""
              }`}
            >
              <TradeSectionPanel
                label="You Give"
                type="give"
                items={giveItems}
                isDraggingGlobal={isGlobalDragging}
                onQtyChange={(id, qty) => {
                  const item = giveItems.find((i) => i.id === id);
                  if (item && qty > item.qty) {
                    window.dispatchEvent(
                      new CustomEvent("trade-added", {
                        detail: { name: item.name, type: "give" },
                      })
                    );
                  }
                  changeQty("give", id, qty);
                }}
                onRemove={(id) => removeCard("give", id)}
                onClear={() => {
                  const prevGive = [...giveItems];
                  const prevGet = [...getItems];
                  saveUndoState();
                  clearSection("give");
                  addToast("Cleared unpinned items from You Give.", "info", {
                    dedupeKey: "clear-give",
                    action: {
                      label: "Undo",
                      onClick: () => {
                        overwrite(prevGive, prevGet);
                        addToast("Restored You Give items.", "info");
                      },
                    },
                  });
                }}
                onAdd={(card) => {
                  addCard("give", card);
                  window.dispatchEvent(
                    new CustomEvent("trade-added", {
                      detail: { name: card.name, type: "give" },
                    })
                  );
                }}
                pinnedIds={new Set(pinnedIds)}
                onTogglePin={(id) => {
                  togglePin("give", id);
                }}
                onInputFocus={() => setIsInputFocused(true)}
                onInputBlur={() => setIsInputFocused(false)}
              />
            </div>

            <div className="relative mx-[var(--panel-p)] flex items-center justify-center my-[var(--gap-sm)]">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <button
                type="button"
                aria-label="Swap Give and Get"
                onClick={() => {
                  triggerHaptic("light");
                  swap();
                }}
                className="relative flex items-center justify-center w-11 h-11 md:w-8 md:h-8 rounded-full transition-colors z-10 bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-card focus-visible:outline-none cursor-pointer"
                title="Swap Give and Get"
              >
                <ArrowUpDown className="w-5 h-5 md:w-4 md:h-4" />
              </button>
            </div>

            <TradeSectionPanel
              label="You Get"
              type="get"
              items={getItems}
              isDraggingGlobal={isGlobalDragging}
              onQtyChange={(id, qty) => {
                const item = getItems.find((i) => i.id === id);
                if (item && qty > item.qty) {
                  window.dispatchEvent(
                    new CustomEvent("trade-added", {
                      detail: { name: item.name, type: "get" },
                    })
                  );
                }
                changeQty("get", id, qty);
              }}
              onRemove={(id) => removeCard("get", id)}
              onClear={() => {
                const prevGive = [...giveItems];
                const prevGet = [...getItems];
                saveUndoState();
                clearSection("get");
                addToast("Cleared unpinned items from You Get.", "info", {
                  dedupeKey: "clear-get",
                  action: {
                    label: "Undo",
                    onClick: () => {
                      overwrite(prevGive, prevGet);
                      addToast("Restored You Get items.", "info");
                    },
                  },
                });
              }}
              onAdd={(card) => {
                addCard("get", card);
                window.dispatchEvent(
                  new CustomEvent("trade-added", {
                    detail: { name: card.name, type: "get" },
                  })
                );
              }}
              pinnedIds={new Set(pinnedIds)}
              onTogglePin={(id) => {
                togglePin("get", id);
              }}
              onInputFocus={() => setIsInputFocused(true)}
              onInputBlur={() => setIsInputFocused(false)}
            />

            <TradeNotices
              giveItems={giveItems}
              getItems={getItems}
              ALL_UNITS={ALL_UNITS}
            />
          </div>
        </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Minimized bottom tab */}
        <div
          className={`fixed left-0 right-0 bottom-0 bg-card border-t border-border transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] pb-safe
          ${
            isOpen
              ? "translate-y-[100%] opacity-0 pointer-events-none z-[80]"
              : "bottom-0 translate-y-0 opacity-100"
          } 
          ${
            isElevated && !isOpen
              ? "!z-[100005] ring-2 ring-primary shadow-lg"
              : "z-[80]"
          }`}
        >
          <div 
            className="flex items-center justify-between px-3 py-2 pb-safe cursor-pointer"
            onClick={openSheet}
          >
            <div className="flex flex-col min-w-0 flex-1 border-r border-border pr-2">
              <span className="text-[11px] font-medium text-muted-foreground mb-[1px] flex items-center gap-1.5 uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-[2px] bg-[#FAA61A]" /> Give
              </span>
              <span className="text-[13px] font-black text-foreground font-mono truncate">
                <RollingNumber value={giveTotal} />
              </span>
            </div>

            <div className="flex flex-col min-w-0 flex-1 pl-3 pr-2">
              <span className="text-[11px] font-medium text-muted-foreground mb-[1px] flex items-center gap-1.5 uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-[2px] bg-primary" /> Get
              </span>
              <span className="text-[13px] font-black text-foreground font-mono truncate">
                <RollingNumber value={getTotal} />
              </span>
            </div>

            <button 
              onClick={(e) => {
                 e.stopPropagation();
                 triggerHaptic("medium");
                 handleSafeClear();
              }}
              className="w-10 h-10 flex flex-shrink-0 items-center justify-center bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground rounded-[6px] border border-border"
              title="Clear Trade"
            >
              {confirmClear ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div
          ref={sheetRef}
          className={`fixed left-0 right-0 bottom-0 bg-card flex flex-col border-t border-border rounded-t-[16px] overflow-hidden transition-transform duration-200 ease-out shadow-[0_-8px_40px_rgba(0,0,0,0.4)] ${
            isElevated ? "!z-[100000]" : "z-[100]"
          }`}
          style={{
            height: "85dvh",
            transform: isOpen ? "translateY(0%)" : "translateY(100%)",
          }}
        >
          <div
            className="w-full py-5 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none flex-shrink-0 select-none bg-popover"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="w-12 h-1 bg-border rounded-full pointer-events-none" />
          </div>

          {renderCalculatorContent()}
        </div>
      </>
    );
  }

  // DESKTOP RETURN
  return (
    <>
      <div
        className={`hidden md:block absolute xl:relative top-0 bottom-0 right-0 flex-shrink-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width,transform] z-[60] xl:z-auto ${
          isOpen
            ? "translate-x-0 pointer-events-auto shadow-[-20px_0_50px_rgba(0,0,0,0.5)] xl:shadow-none"
            : "translate-x-full pointer-events-none"
        } ${analyzerZ}`}
        style={{
          opacity: isOpen ? 1 : 0,
          width: isOpen ? `${panelWidth}px` : "0px",
        }}
      >
        <div className="w-full h-full">
          <div className="w-full h-full">
            <div
              ref={panelRef}
              className="flex flex-col h-full w-full select-none border-l border-border bg-card relative"
              style={{
                width: `${panelWidth}px`,
                minWidth: "320px",
                fontFamily: "var(--font-sans)",
              }}
            >
              <div
                className="absolute top-0 left-0 w-2 h-full cursor-col-resize hover:bg-primary z-[100000] transition-colors"
                onMouseDown={startResize}
                title="Drag to resize panel"
              />
              {renderCalculatorContent()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
