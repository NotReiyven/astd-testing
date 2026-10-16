import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  GiFairyWand,
  GiBookCover,
  GiHelp,
  GiHazardSign,
  GiTrashCan,
  GiMagnifyingGlass,
  GiCheckMark,
  GiSpinningBlades,
} from "react-icons/gi";
import { TradeCard, MasterUnit } from "../../../types";
import {
  parseSmartTradeAsync,
  AmbiguousToken,
  getSlangCache,
  restoreSlangCache,
  removeSlang,
  learnSlang,
} from "./smartParser";
import { getAvatarStyle, getInitials } from "./summaryUtils";
import { useTradeStore } from "../../../store/useTradeStore";
import { useToastStore } from "../../../store/useToastStore";
import { useShowDelay } from "../../../hooks/useShowDelay";
import { getProxyImage, handleImageError } from "../../../data";
import { triggerHaptic } from "../../../data/helpers";
import { InlineHint } from "../ui/InlineHint";

const MAX_SMART_INPUT_LENGTH = 5000;
const MAX_SLANG_KEY_LENGTH = 24;

function formatParserErrorWithNextStep(rawError: string): string {
  const lower = rawError.toLowerCase();
  if (lower.includes("empty")) {
    return "Paste or type a trade offer first: for example, “2 gogeta for 1 vegito”.";
  }
  if (lower.includes("too large") || lower.includes("too long")) {
    return `${rawError} Try fewer lines or split the trade into smaller imports.`;
  }
  if (lower.includes("no matching units")) {
    return "No matching units found. Check spelling, or add custom abbreviations in the Dictionary tab.";
  }
  if (lower.includes("malformed")) {
    return "Could not read that [I GIVE] / [I GET] summary. Try pasting just the unit names separated by “for”.";
  }
  if (lower.includes("loading")) {
    return "Unit database is still syncing. Wait a moment and try importing again.";
  }
  return `${rawError} Check spelling or try fewer lines.`;
}

interface SmartParserMenuProps {
  ALL_UNITS: MasterUnit[];
  onClose: () => void;
  onSaveUndo?: () => void;
  initialText?: string;
}

export function SmartParserMenu({
  ALL_UNITS,
  onClose,
  onSaveUndo,
  initialText,
}: SmartParserMenuProps) {
  const giveItems = useTradeStore((s) => s.giveItems);
  const getItems = useTradeStore((s) => s.getItems);
  const pinnedIds = useTradeStore((s) => s.pinnedIds);
  const overwrite = useTradeStore((s) => s.overwrite);
  const addToast = useToastStore((s) => s.addToast);

  const [activeMenuTab, setActiveMenuTab] = useState<"import" | "dictionary">(
    "import"
  );
  const [smartInput, setSmartInput] = useState("");
  const [smartInputError, setSmartInputError] = useState("");
  const [ambiguousItems, setAmbiguousItems] = useState<AmbiguousToken[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const showParsingSpinner = useShowDelay(isParsing);
  const isVisuallyParsing = isParsing || showParsingSpinner;
  const [parseAnnouncement, setParseAnnouncement] = useState("");

  const [stagedGive, setStagedGive] = useState<TradeCard[]>([]);
  const [stagedGet, setStagedGet] = useState<TradeCard[]>([]);

  const [slangDict, setSlangDict] = useState<Record<string, string>>({});
  const [newSlangKey, setNewSlangKey] = useState("");
  const [slangKeyError, setSlangKeyError] = useState<string | null>(null);
  const [slangTargetError, setSlangTargetError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [newSlangTargetId, setNewSlangTargetId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const smartInputRef = useRef<HTMLInputElement>(null);
  const slangKeyInputRef = useRef<HTMLInputElement>(null);
  const slangTargetInputRef = useRef<HTMLInputElement>(null);

  const lastProcessedText = useRef<string | null>(null);

  useEffect(() => {
    setSlangDict(getSlangCache());
  }, [activeMenuTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return ALL_UNITS.slice(0, 50);
    const q = searchQuery.toLowerCase().trim();
    return ALL_UNITS.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.subtitle && u.subtitle.toLowerCase().includes(q)) ||
        (u.aliases && u.aliases.some((a) => a.toLowerCase().includes(q)))
    ).slice(0, 30);
  }, [searchQuery, ALL_UNITS]);

  const processImport = useCallback(
    async (textToParse: string) => {
      const trimmed = textToParse.trim();
      if (!trimmed) {
        const msg = formatParserErrorWithNextStep("Input is empty.");
        setSmartInputError(msg);
        setParseAnnouncement(msg);
        smartInputRef.current?.focus();
        return;
      }

      if (trimmed.length > MAX_SMART_INPUT_LENGTH) {
        const msg = `Input too large (${trimmed.length.toLocaleString()}/${MAX_SMART_INPUT_LENGTH.toLocaleString()}\u00A0characters, max 5,000). Paste a smaller trade block or split the trade into two imports.`;
        setSmartInputError(msg);
        setParseAnnouncement(msg);
        smartInputRef.current?.focus();
        return;
      }

      setSmartInputError("");
      setIsParsing(true);
      setParseAnnouncement("Parsing trade offer…");

      try {
        const result = await parseSmartTradeAsync(trimmed, ALL_UNITS);
        if (result.error) {
          const formattedErr = formatParserErrorWithNextStep(result.error);
          setSmartInputError(formattedErr);
          setParseAnnouncement(formattedErr);
          smartInputRef.current?.focus();
        } else {
          setStagedGive(result.giveCards);
          setStagedGet(result.getCards);
          setAmbiguousItems(result.ambiguous);
          setSmartInput("");

          const exactCount = result.giveCards.length + result.getCards.length;
          const ambigCount = result.ambiguous.length;
          const totalCount = exactCount + ambigCount;
          const summaryMsg =
            ambigCount > 0
              ? `Found ${totalCount}\u00A0${
                  totalCount === 1 ? "unit" : "units"
                }, ${ambigCount}\u00A0${
                  ambigCount === 1 ? "needs" : "need"
                } review.`
              : `Found ${exactCount}\u00A0${
                  exactCount === 1 ? "unit" : "units"
                }. Ready to review and confirm.`;
          setParseAnnouncement(summaryMsg);
        }
      } finally {
        setIsParsing(false);
      }
    },
    [ALL_UNITS]
  );

  const handleConfirmReview = () => {
    const prevGive = [...giveItems];
    const prevGet = [...getItems];
    onSaveUndo?.();

    const mergeCards = (arr1: TradeCard[], arr2: TradeCard[]) => {
      const map = new Map<string, TradeCard>();
      arr1.forEach((c) => map.set(c.id, { ...c }));
      arr2.forEach((c) => {
        if (map.has(c.id)) map.get(c.id)!.qty += c.qty;
        else map.set(c.id, { ...c });
      });
      return Array.from(map.values());
    };

    const pinnedSet = new Set(pinnedIds);
    const pinnedGive = giveItems.filter((i) => pinnedSet.has(`give-${i.id}`));
    const pinnedGet = getItems.filter((i) => pinnedSet.has(`get-${i.id}`));

    overwrite(
      mergeCards(pinnedGive, stagedGive),
      mergeCards(pinnedGet, stagedGet)
    );

    const totalAdded = stagedGive.length + stagedGet.length;
    if (totalAdded > 0) {
      addToast(
        `Imported ${totalAdded}\u00A0${
          totalAdded === 1 ? "unit" : "units"
        } into Trade Analyzer.`,
        "success",
        {
          dedupeKey: "smart-parser-import",
          action: {
            label: "Undo",
            onClick: () => {
              overwrite(prevGive, prevGet);
              addToast("Reverted Smart Parser import.", "info");
            },
          },
        }
      );
    }

    triggerHaptic("success");
    window.dispatchEvent(new Event("academy-used-parser"));

    setStagedGive([]);
    setStagedGet([]);
    onClose();
  };

  const handleSmartImport = useCallback(
    () => void processImport(smartInput),
    [processImport, smartInput]
  );

  useEffect(() => {
    if (
      initialText &&
      initialText.trim().length > 0 &&
      lastProcessedText.current !== initialText
    ) {
      lastProcessedText.current = initialText;
      setSmartInput(initialText);
      void processImport(initialText);
    }
  }, [initialText, processImport]);

  const resolveAmbiguity = useCallback(
    (
      index: number,
      resolvedUnit: MasterUnit | null,
      col: "give" | "get",
      qty: number
    ) => {
      const rawToken = ambiguousItems[index]?.rawName || "item";
      const remaining = Math.max(0, ambiguousItems.length - 1);

      if (resolvedUnit && qty > 0) {
        const newCard: TradeCard = {
          id: resolvedUnit.id,
          name: resolvedUnit.name,
          subtitle: resolvedUnit.subtitle,
          value:
            typeof resolvedUnit.value === "number" ? resolvedUnit.value : 0,
          qty,
        };

        if (col === "give") setStagedGive((prev) => [...prev, newCard]);
        else setStagedGet((prev) => [...prev, newCard]);

        learnSlang(rawToken, resolvedUnit.id);
        setParseAnnouncement(
          remaining > 0
            ? `Matched “${rawToken}” to ${resolvedUnit.name}. ${remaining}\u00A0${
                remaining === 1 ? "item still needs" : "items still need"
              } review.`
            : `Matched “${rawToken}” to ${resolvedUnit.name}. All items reviewed.`
        );
      } else {
        setParseAnnouncement(
          remaining > 0
            ? `Skipped “${rawToken}”. ${remaining}\u00A0${
                remaining === 1 ? "item still needs" : "items still need"
              } review.`
            : `Skipped “${rawToken}”. All items reviewed.`
        );
      }

      setAmbiguousItems((prev) => {
        const newAmbiguous = [...prev];
        newAmbiguous.splice(index, 1);
        return newAmbiguous;
      });
    },
    [ambiguousItems]
  );

  const handleAddSlang = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanKey = newSlangKey
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim();

    let keyErr: string | null = null;
    if (!cleanKey) {
      keyErr =
        "Enter an abbreviation using letters, numbers, spaces, or hyphens.";
    } else if (cleanKey.length > MAX_SLANG_KEY_LENGTH) {
      keyErr = `Abbreviation must be ${MAX_SLANG_KEY_LENGTH}\u00A0characters or fewer (currently ${cleanKey.length}).`;
    } else if (slangDict[cleanKey]) {
      const existingUnitName =
        ALL_UNITS.find((u) => u.id === slangDict[cleanKey])?.name ||
        slangDict[cleanKey];
      keyErr = `“${cleanKey}” is already mapped to ${existingUnitName}. Delete it below first to remap.`;
    }

    const resolvedTargetUnit =
      ALL_UNITS.find((u) => u.id === newSlangTargetId) ??
      (searchQuery.trim()
        ? ALL_UNITS.find(
            (u) => u.name.toLowerCase() === searchQuery.trim().toLowerCase()
          )
        : undefined);

    let targetErr: string | null = null;
    if (!resolvedTargetUnit) {
      targetErr = searchQuery.trim()
        ? `No matching unit found for “${searchQuery.trim()}”. Select a unit from the dropdown.`
        : "Select a target unit for this abbreviation.";
    }

    setSlangKeyError(keyErr);
    setSlangTargetError(targetErr);

    if (keyErr) {
      slangKeyInputRef.current?.focus();
      return;
    }
    if (targetErr || !resolvedTargetUnit) {
      slangTargetInputRef.current?.focus();
      return;
    }

    triggerHaptic("medium");
    learnSlang(cleanKey, resolvedTargetUnit.id);
    setSlangDict(getSlangCache());
    setNewSlangKey("");
    setNewSlangTargetId("");
    setSearchQuery("");
    setSlangKeyError(null);
    setSlangTargetError(null);

    addToast(
      `Added slang “${cleanKey}” → ${resolvedTargetUnit.name}.`,
      "success",
      {
        dedupeKey: `slang-add-${cleanKey}`,
        action: {
          label: "Undo",
          onClick: () => {
            removeSlang(cleanKey);
            setSlangDict(getSlangCache());
            addToast(`Removed slang “${cleanKey}”.`, "info");
          },
        },
      }
    );
  };

  const handleRemoveSlang = (key: string) => {
    triggerHaptic("light");
    const prevSnapshot = { ...slangDict };
    const targetId = slangDict[key];
    const targetName =
      ALL_UNITS.find((u) => u.id === targetId)?.name || targetId;

    removeSlang(key);
    setSlangDict(getSlangCache());

    addToast(`Deleted slang “${key}” (${targetName}).`, "info", {
      dedupeKey: `slang-del-${key}`,
      action: {
        label: "Undo",
        onClick: () => {
          const restored = restoreSlangCache(prevSnapshot);
          setSlangDict(restored);
          addToast(`Restored slang “${key}” → ${targetName}.`, "info");
        },
      },
    });
  };

  const unpinnedActiveCount =
    giveItems.filter((i) => !pinnedIds.includes(`give-${i.id}`)).length +
    getItems.filter((i) => !pinnedIds.includes(`get-${i.id}`)).length;

  return (
    <div className="absolute top-3 left-0 right-0 z-[100] mx-3 md:mx-4 p-4 bg-card border border-border rounded-[8px] animate-fade-in shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex flex-col gap-4 max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {parseAnnouncement}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <GiFairyWand className="w-4 h-4 text-primary" /> Smart Parser
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Smart Parser"
          className="p-2 -m-2 md:p-1 md:-m-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[3px] cursor-pointer"
        >
          <svg className="w-4 h-4 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Smart Parser mode"
        className="flex bg-black/20 p-1 rounded-[6px] border border-border"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeMenuTab === "import"}
          onClick={() => setActiveMenuTab("import")}
          className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2.5 md:py-1.5 rounded-[4px] transition-colors cursor-pointer ${
            activeMenuTab === "import"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Import Trade
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMenuTab === "dictionary"}
          onClick={() => setActiveMenuTab("dictionary")}
          className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2.5 md:py-1.5 rounded-[4px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeMenuTab === "dictionary"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <GiBookCover className="w-3 h-3" /> Dictionary (
          {Object.keys(slangDict).length})
        </button>
      </div>

      {activeMenuTab === "import" ? (
        ambiguousItems.length > 0 ? (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="flex items-start gap-3 bg-[#FAA61A]/10 p-3 rounded-[6px] border border-[#FAA61A]/30">
              <GiHazardSign className="w-5 h-5 text-[#FAA61A] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#FAA61A]">
                    Clarification Needed
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-[#FAA61A]/20 text-[#FAA61A] border border-[#FAA61A]/30 tabular-nums">
                    {ambiguousItems.length}&nbsp;
                    {ambiguousItems.length === 1
                      ? "item still needs"
                      : "items still need"}{" "}
                    choosing
                  </span>
                </div>
                <span className="text-[12.5px] text-foreground leading-snug">
                  Multiple units matched your input. Choose the exact unit for
                  each flagged entry below
                  {stagedGive.length + stagedGet.length > 0
                    ? ` (${stagedGive.length + stagedGet.length}\u00A0exact ${
                        stagedGive.length + stagedGet.length === 1
                          ? "match"
                          : "matches"
                      } already staged).`
                    : "."}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1 pb-1">
              {ambiguousItems.map((item, idx) => (
                <div
                  key={`${idx}-${item.rawName}`}
                  className="flex flex-col p-3 bg-popover rounded-[8px] border border-[#FAA61A]/35 shadow-inner"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                    <p className="text-[13px] text-muted-foreground font-medium">
                      For{" "}
                      <strong className="text-foreground font-bold px-1.5 py-0.5 bg-black/20 border border-border rounded mx-1">
                        “{item.rawName}”
                      </strong>
                      <span className="text-muted-foreground text-[12px] ml-1 tabular-nums">
                        (×{item.qty} ·{" "}
                        {item.col === "give" ? "You Give" : "You Get"})
                      </span>
                    </p>
                    <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#FAA61A] bg-[#FAA61A]/10 px-1.5 py-0.5 rounded border border-[#FAA61A]/25 tabular-nums">
                      Review {idx + 1} of {ambiguousItems.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {item.options.slice(0, 4).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          resolveAmbiguity(idx, opt, item.col, item.qty)
                        }
                        className="group w-full flex items-center justify-between bg-card hover:bg-primary text-foreground hover:text-primary-foreground px-3 py-3 md:py-2.5 rounded-[6px] transition-colors duration-150 border border-border hover:border-primary active:scale-[0.98] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                      >
                        <div className="flex flex-col items-start text-left">
                          <span className="text-[13.5px] font-bold tracking-tight">
                            {opt.name}
                          </span>
                          {opt.subtitle && (
                            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary-foreground/80 transition-colors tracking-wide mt-0.5">
                              {opt.subtitle}
                            </span>
                          )}
                        </div>
                        <div className="w-4 h-4 rounded-full border-2 border-border group-hover:border-primary-foreground/50 flex items-center justify-center shrink-0 ml-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-primary-foreground transition-colors" />
                        </div>
                      </button>
                    ))}

                    <div className="flex items-center justify-between mt-1">
                      {item.options.length > 4 ? (
                        <div className="px-2 py-1 text-[11px] text-muted-foreground font-medium cursor-default">
                          +{item.options.length - 4}&nbsp;more matches
                        </div>
                      ) : (
                        <div />
                      )}

                      <button
                        type="button"
                        onClick={() => resolveAmbiguity(idx, null, item.col, 0)}
                        className="bg-transparent hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-[11px] font-bold uppercase tracking-wider px-3 py-2 md:px-2 md:py-1.5 rounded-[4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive cursor-pointer"
                      >
                        Skip Item
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : stagedGive.length > 0 || stagedGet.length > 0 ? (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="bg-black/20 p-3 rounded-[6px] border border-border flex justify-between items-start gap-2">
              <div className="flex flex-col gap-1">
                <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">
                  Review Import ({stagedGive.length + stagedGet.length}&nbsp;
                  {stagedGive.length + stagedGet.length === 1
                    ? "unit"
                    : "units"}
                  )
                </h3>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  Remove any unintended units before adding to the calculator.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStagedGive([]);
                  setStagedGet([]);
                  setParseAnnouncement("Discarded staged import.");
                }}
                className="text-muted-foreground hover:text-destructive text-[10px] font-bold uppercase tracking-wider px-3 py-2 md:px-2 md:py-1 bg-white/5 hover:bg-destructive/10 rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer shrink-0"
              >
                Discard
              </button>
            </div>

            {unpinnedActiveCount > 0 && (
              <InlineHint variant="warning">
                Confirming replaces {unpinnedActiveCount}&nbsp;unpinned{" "}
                {unpinnedActiveCount === 1 ? "unit" : "units"} in your current
                trade (pinned units are kept).
              </InlineHint>
            )}

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1">
              {stagedGive.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-[#FAA61A] uppercase tracking-widest pl-1">
                    You Give ({stagedGive.length})
                  </span>
                  {stagedGive.map((card, i) => (
                    <div
                      key={`give-${card.id}-${i}`}
                      className="flex items-center justify-between bg-popover p-2 rounded-[6px] border border-border"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-[13px] font-bold text-foreground truncate">
                          {card.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono font-medium tracking-wide bg-black/20 px-1.5 py-0.5 rounded border border-border tabular-nums">
                          ×{card.qty}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${card.name} from You Give`}
                        onClick={() =>
                          setStagedGive((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        className="p-2.5 md:p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                      >
                        <GiTrashCan className="w-4 h-4 md:w-3.5 md:h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {stagedGet.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
                    You Get ({stagedGet.length})
                  </span>
                  {stagedGet.map((card, i) => (
                    <div
                      key={`get-${card.id}-${i}`}
                      className="flex items-center justify-between bg-popover p-2 rounded-[6px] border border-border"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-[13px] font-bold text-foreground truncate">
                          {card.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono font-medium tracking-wide bg-black/20 px-1.5 py-0.5 rounded border border-border tabular-nums">
                          ×{card.qty}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${card.name} from You Get`}
                        onClick={() =>
                          setStagedGet((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        className="p-2.5 md:p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                      >
                        <GiTrashCan className="w-4 h-4 md:w-3.5 md:h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {stagedGive.length === 0 && stagedGet.length === 0 && (
                <p className="text-[12px] text-muted-foreground text-center py-4 italic">
                  No items left to import.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirmReview}
              disabled={stagedGive.length === 0 && stagedGet.length === 0}
              className="w-full mt-2 py-3 bg-[#23a559] hover:bg-[#1f914e] disabled:bg-popover disabled:text-muted-foreground text-white text-base md:text-sm font-bold rounded-[6px] transition-colors shadow-md flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23a559] cursor-pointer"
            >
              <GiCheckMark className="w-4 h-4" /> Confirm & Add to Trade
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2.5 bg-black/20 border border-border rounded-[6px] p-3 shadow-inner">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <GiHelp className="w-3.5 h-3.5" /> How to format your trade
              </div>
              <ul className="text-[12px] text-muted-foreground flex flex-col gap-1.5 list-disc pl-4 marker:text-primary leading-snug">
                <li>
                  Use{" "}
                  <strong className="text-foreground font-semibold">
                    “for”
                  </strong>{" "}
                  or{" "}
                  <strong className="text-foreground font-semibold">
                    “want”
                  </strong>{" "}
                  to separate your offer from theirs.
                </li>
                <li>
                  Keep quantities next to the unit name (e.g.,{" "}
                  <strong className="text-foreground font-semibold">
                    “5 x3 for 2 gogeta”
                  </strong>
                  ).
                </li>
                <li>
                  Ambiguous matches will prompt you to pick the exact unit.
                </li>
              </ul>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSmartImport();
              }}
              noValidate
              className="flex flex-col gap-1.5 mt-1"
            >
              <label
                htmlFor="smart-parser-offer-input"
                className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                Trade Offer Text
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="smart-parser-offer-input"
                  ref={smartInputRef}
                  value={smartInput}
                  onChange={(e) => {
                    setSmartInput(e.target.value);
                    if (smartInputError) setSmartInputError("");
                  }}
                  placeholder="e.g. 2 gogeta for 1 vegito…"
                  aria-invalid={Boolean(smartInputError)}
                  aria-describedby={
                    smartInputError ? "smart-parser-error" : undefined
                  }
                  className={`flex-1 bg-input border rounded-[4px] px-3 py-3 md:py-2.5 text-base md:text-sm text-foreground outline-none placeholder-muted-foreground focus:ring-2 transition-colors ${
                    smartInputError
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-primary"
                  }`}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isVisuallyParsing}
                  aria-busy={isVisuallyParsing}
                  className="bg-primary hover:bg-primary/80 text-primary-foreground px-5 py-3 md:py-2.5 rounded-[4px] text-base md:text-sm font-bold transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white flex items-center justify-center gap-2 min-w-[110px] disabled:opacity-60 cursor-pointer"
                >
                  {isVisuallyParsing ? (
                    <>
                      <GiSpinningBlades className="w-4 h-4 animate-spin shrink-0" />
                      <span>Parsing…</span>
                    </>
                  ) : (
                    <span>Import Offer</span>
                  )}
                </button>
              </div>

              {smartInputError && (
                <div
                  id="smart-parser-error"
                  role="alert"
                  className="text-[12px] text-destructive mt-1 font-medium animate-fade-in flex items-start gap-1.5 leading-snug"
                >
                  <GiHazardSign className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{smartInputError}</span>
                </div>
              )}
            </form>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4 animate-fade-in">
          <form
            onSubmit={handleAddSlang}
            noValidate
            className="flex flex-col gap-2"
          >
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Add Custom Slang
            </span>
            <div className="flex flex-col sm:flex-row gap-2 relative items-start">
              <div className="w-full sm:w-[130px] shrink-0 flex flex-col gap-1">
                <label htmlFor="slang-key-input" className="sr-only">
                  Slang abbreviation
                </label>
                <input
                  id="slang-key-input"
                  ref={slangKeyInputRef}
                  value={newSlangKey}
                  onChange={(e) => {
                    setNewSlangKey(e.target.value);
                    if (slangKeyError) setSlangKeyError(null);
                  }}
                  placeholder="e.g. gg…"
                  aria-invalid={Boolean(slangKeyError)}
                  aria-describedby={
                    slangKeyError ? "slang-key-error" : undefined
                  }
                  className={`w-full bg-input border rounded-[4px] px-3 py-3 md:py-2 text-base md:text-sm text-foreground outline-none placeholder-muted-foreground focus:ring-1 transition-colors ${
                    slangKeyError
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-primary focus:border-primary"
                  }`}
                />
              </div>

              <div
                className="relative flex-1 w-full flex flex-col gap-1"
                ref={dropdownRef}
              >
                <label htmlFor="slang-target-unit-input" className="sr-only">
                  Target unit
                </label>
                <div
                  className={`flex items-center bg-input rounded-[4px] px-3 py-3 md:py-2 transition-colors border ${
                    slangTargetError
                      ? "border-destructive ring-1 ring-destructive"
                      : isDropdownOpen
                      ? "border-primary ring-1 ring-primary"
                      : "border-border"
                  }`}
                >
                  <GiMagnifyingGlass className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                  <input
                    id="slang-target-unit-input"
                    ref={slangTargetInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                      if (newSlangTargetId) setNewSlangTargetId("");
                      if (slangTargetError) setSlangTargetError(null);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Search target unit…"
                    aria-invalid={Boolean(slangTargetError)}
                    aria-describedby={
                      slangTargetError ? "slang-target-error" : undefined
                    }
                    className="bg-transparent text-base md:text-sm text-foreground w-full outline-none placeholder-muted-foreground"
                  />
                  {newSlangTargetId && (
                    <GiCheckMark className="w-4 h-4 text-[#23a559] ml-2 shrink-0" />
                  )}
                </div>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-[250px] overflow-y-auto custom-scrollbar bg-popover border border-border rounded-[4px] shadow-2xl z-[110] flex flex-col p-2 gap-1">
                    {filteredUnits.length === 0 ? (
                      <div className="p-4 text-center text-[13px] text-muted-foreground">
                        No units found matching “{searchQuery}”. Check spelling.
                      </div>
                    ) : (
                      filteredUnits.map((u) => {
                        const proxyUrl = getProxyImage(u.id, u.imageUrl);
                        const valText =
                          u.value === "owner"
                            ? "O/C"
                            : typeof u.value === "number"
                            ? u.value.toLocaleString()
                            : u.valueMin?.toLocaleString() || "0";
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setNewSlangTargetId(u.id);
                              setSearchQuery(u.name);
                              setSlangTargetError(null);
                              setIsDropdownOpen(false);
                            }}
                            className="flex items-center gap-3 w-full p-2.5 md:p-2 hover:bg-white/5 rounded-[4px] transition-colors text-left group cursor-pointer focus-visible:outline-none"
                          >
                            <div className="w-8 h-8 rounded-[4px] bg-black/20 overflow-hidden shrink-0 flex items-center justify-center border border-border">
                              {proxyUrl ? (
                                <img
                                  src={proxyUrl}
                                  alt={u.name}
                                  onError={(e) => handleImageError(e, u.id)}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span
                                  className="text-white font-bold text-[10px]"
                                  style={getAvatarStyle(u.name)}
                                >
                                  {getInitials(u.name)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-[13px] font-bold text-foreground truncate group-hover:text-white transition-colors">
                                {u.name}
                              </span>
                              {u.subtitle && (
                                <span className="text-[10px] font-medium text-muted-foreground truncate">
                                  {u.subtitle}
                                </span>
                              )}
                            </div>
                            <span className="text-[12px] font-mono font-bold text-foreground shrink-0 ml-2 tabular-nums">
                              {valText}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto shrink-0 px-4 py-3 md:py-2 rounded-[4px] text-base md:text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white bg-[#23a559] hover:bg-[#1f914e] text-white"
              >
                Add Slang
              </button>
            </div>

            {slangKeyError && (
              <p
                id="slang-key-error"
                role="alert"
                className="text-[11.5px] font-medium text-destructive leading-snug"
              >
                {slangKeyError}
              </p>
            )}
            {slangTargetError && (
              <p
                id="slang-target-error"
                role="alert"
                className="text-[11.5px] font-medium text-destructive leading-snug"
              >
                {slangTargetError}
              </p>
            )}
          </form>

          <div className="flex flex-col gap-2 mt-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Saved Dictionary ({Object.keys(slangDict).length})
            </span>
            {Object.keys(slangDict).length === 0 ? (
              <p className="text-[12px] text-muted-foreground italic p-3 bg-black/20 rounded-[6px] border border-border">
                Your dictionary is empty. Adding slang helps the parser
                recognize your custom unit abbreviations.
              </p>
            ) : (
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-2">
                {Object.entries(slangDict).map(([key, targetId]) => {
                  const targetUnit = ALL_UNITS.find((u) => u.id === targetId);
                  const targetName = targetUnit?.name || targetId;

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between bg-popover p-2.5 rounded-[6px] border border-border hover:border-border transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-[13px] font-bold text-foreground shrink-0">
                          “{key}”
                        </span>
                        <span className="text-muted-foreground text-[12px]">
                          ➔
                        </span>
                        <span className="text-[12.5px] text-foreground truncate">
                          {targetName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlang(key)}
                        aria-label={`Remove slang ${key}`}
                        className="text-muted-foreground hover:text-destructive p-2 md:p-1.5 transition-colors rounded-[4px] md:rounded-[3px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive bg-white/5 hover:bg-destructive/10 shrink-0 ml-2"
                        title={`Delete “${key}”`}
                      >
                        <GiTrashCan className="w-4 h-4 md:w-3.5 md:h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
