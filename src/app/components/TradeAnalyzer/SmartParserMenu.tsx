import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Wand2,
  X,
  Book,
  HelpCircle,
  TriangleAlert,
  Trash2,
  Search,
  Check,
  Loader2,
} from "lucide-react";
import { TradeCard, MasterUnit } from "../../../types";
import {
  parseSmartTradeAsync,
  AmbiguousToken,
  getSlangCache,
  removeSlang,
  learnSlang,
} from "./smartParser";
import { getAvatarStyle, getInitials } from "./summaryUtils";
import { useTradeStore } from "../../../store/useTradeStore";
import { getProxyImage, handleImageError } from "../../../data";
import { triggerHaptic } from "../../../data/helpers";

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
  const { giveItems, getItems, pinnedIds, overwrite } = useTradeStore();

  const [activeMenuTab, setActiveMenuTab] = useState<"import" | "dictionary">(
    "import"
  );
  const [smartInput, setSmartInput] = useState("");
  const [smartInputError, setSmartInputError] = useState("");
  const [ambiguousItems, setAmbiguousItems] = useState<AmbiguousToken[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const [stagedGive, setStagedGive] = useState<TradeCard[]>([]);
  const [stagedGet, setStagedGet] = useState<TradeCard[]>([]);

  const [slangDict, setSlangDict] = useState<Record<string, string>>({});
  const [newSlangKey, setNewSlangKey] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [newSlangTargetId, setNewSlangTargetId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      setIsParsing(true);
      const result = await parseSmartTradeAsync(textToParse, ALL_UNITS);
      if (result.error) {
        setSmartInputError(result.error);
        setTimeout(() => setSmartInputError(""), 3000);
      } else {
        setStagedGive(result.giveCards);
        setStagedGet(result.getCards);
        setAmbiguousItems(result.ambiguous);
        setSmartInput("");
      }
      setIsParsing(false);
    },
    [ALL_UNITS]
  );

  const handleConfirmReview = () => {
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
      window.dispatchEvent(
        new CustomEvent("trade-added", {
          detail: {
            name: `Imported ${totalAdded} item${totalAdded > 1 ? "s" : ""}`,
            type: stagedGet.length > stagedGive.length ? "get" : "give",
          },
        })
      );
    }

    triggerHaptic("success");
    window.dispatchEvent(new Event("academy-used-parser"));

    setStagedGive([]);
    setStagedGet([]);
    onClose();
  };

  const handleSmartImport = useCallback(
    () => processImport(smartInput),
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
      processImport(initialText);
    }
  }, [initialText, processImport]);

  const resolveAmbiguity = useCallback(
    (
      index: number,
      resolvedUnit: MasterUnit | null,
      col: "give" | "get",
      qty: number
    ) => {
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

        learnSlang(ambiguousItems[index].rawName, resolvedUnit.id);
      }

      setAmbiguousItems((prev) => {
        const newAmbiguous = [...prev];
        newAmbiguous.splice(index, 1);
        return newAmbiguous;
      });
    },
    [ambiguousItems]
  );

  const handleAddSlang = () => {
    if (!newSlangKey.trim() || !newSlangTargetId) return;
    learnSlang(newSlangKey, newSlangTargetId);
    setSlangDict(getSlangCache());
    setNewSlangKey("");
    setNewSlangTargetId("");
    setSearchQuery("");
  };

  const handleRemoveSlang = (key: string) => {
    removeSlang(key);
    setSlangDict(getSlangCache());
  };

  return (
    <div className="absolute top-3 left-0 right-0 z-50 mx-3 md:mx-4 p-4 bg-card border border-border rounded-[8px] animate-fade-in shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex flex-col gap-4 max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Wand2 className="w-4 h-4 text-primary" /> Smart Parser
        </span>
        <button
          onClick={onClose}
          className="p-2 -m-2 md:p-1 md:-m-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[3px]"
        >
          <X className="w-4 h-4 md:w-3.5 md:h-3.5" />
        </button>
      </div>

      <div className="flex bg-black/20 p-1 rounded-[6px] border border-border">
        <button
          onClick={() => setActiveMenuTab("import")}
          className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2.5 md:py-1.5 rounded-[4px] transition-colors ${
            activeMenuTab === "import"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Import Trade
        </button>
        <button
          onClick={() => setActiveMenuTab("dictionary")}
          className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2.5 md:py-1.5 rounded-[4px] transition-colors flex items-center justify-center gap-1.5 ${
            activeMenuTab === "dictionary"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Book className="w-3 h-3" /> Dictionary
        </button>
      </div>

      {activeMenuTab === "import" ? (
        ambiguousItems.length > 0 ? (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="flex items-start gap-3 bg-[#FAA61A]/10 p-3 rounded-[6px] border border-[#FAA61A]/20">
              <TriangleAlert className="w-5 h-5 text-[#FAA61A] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-bold text-[#FAA61A]">
                  Clarification Needed
                </span>
                <span className="text-[13px] text-foreground leading-snug">
                  Multiple units match your input. Please select the correct one
                  below.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1 pb-1">
              {ambiguousItems.map((item, idx) => (
                <div
                  key={`${idx}-${item.rawName}`}
                  className="flex flex-col p-3 bg-popover rounded-[8px] border border-border shadow-inner"
                >
                  <div className="mb-3">
                    <p className="text-[13px] text-muted-foreground font-medium">
                      For{" "}
                      <strong className="text-foreground font-bold px-1.5 py-0.5 bg-black/20 border border-border rounded mx-1">
                        "{item.rawName}"
                      </strong>
                      <span className="text-muted-foreground text-[12px] ml-1">
                        (Qty: {item.qty}, {item.col})
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {item.options.slice(0, 4).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() =>
                          resolveAmbiguity(idx, opt, item.col, item.qty)
                        }
                        className="group w-full flex items-center justify-between bg-card hover:bg-primary text-foreground hover:text-primary-foreground px-3 py-3 md:py-2.5 rounded-[6px] transition-all duration-200 border border-border hover:border-primary active:scale-[0.98] shadow-sm focus-visible:outline-none cursor-pointer"
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
                        <div className="px-2 py-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider cursor-default">
                          +{item.options.length - 4} more
                        </div>
                      ) : (
                        <div />
                      )}

                      <button
                        onClick={() => resolveAmbiguity(idx, null, item.col, 0)}
                        className="bg-transparent hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-[11px] font-bold uppercase tracking-wider px-3 py-2 md:px-2 md:py-1.5 rounded-[4px] transition-colors focus-visible:outline-none"
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : stagedGive.length > 0 || stagedGet.length > 0 ? (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="bg-black/20 p-3 rounded-[6px] border border-border flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">
                  Review Import
                </h3>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  Remove incorrect items before confirming.
                </p>
              </div>
              <button
                onClick={() => {
                  setStagedGive([]);
                  setStagedGet([]);
                }}
                className="text-muted-foreground hover:text-destructive text-[10px] font-bold uppercase tracking-wider px-3 py-2 md:px-2 md:py-1 bg-white/5 hover:bg-destructive/10 rounded-[4px] transition-colors focus-visible:outline-none"
              >
                Discard
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1">
              {stagedGive.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-[#FAA61A] uppercase tracking-widest pl-1">
                    You Give
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
                        <span className="text-[10px] text-muted-foreground font-medium tracking-wide bg-black/20 px-1.5 py-0.5 rounded border border-border">
                          x{card.qty}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setStagedGive((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        className="p-2.5 md:p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[4px] transition-colors focus-visible:outline-none"
                      >
                        <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {stagedGet.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest pl-1">
                    You Get
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
                        <span className="text-[10px] text-muted-foreground font-medium tracking-wide bg-black/20 px-1.5 py-0.5 rounded border border-border">
                          x{card.qty}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setStagedGet((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        className="p-2.5 md:p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[4px] transition-colors focus-visible:outline-none"
                      >
                        <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
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
              onClick={handleConfirmReview}
              disabled={stagedGive.length === 0 && stagedGet.length === 0}
              className="w-full mt-2 py-3 bg-[#23a559] hover:bg-[#1f914e] disabled:bg-popover disabled:text-muted-foreground text-white text-[14px] font-bold rounded-[6px] transition-colors shadow-md flex items-center justify-center gap-2 focus-visible:outline-none"
            >
              <Check className="w-4 h-4" /> Confirm & Add to Trade
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2.5 bg-black/20 border border-border rounded-[6px] p-3 shadow-inner">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5" /> How to format your trade
              </div>
              <ul className="text-[12px] text-muted-foreground flex flex-col gap-1.5 list-disc pl-4 marker:text-primary leading-snug">
                <li>
                  Use{" "}
                  <strong className="text-foreground font-semibold">
                    "for"
                  </strong>{" "}
                  or{" "}
                  <strong className="text-foreground font-semibold">
                    "want"
                  </strong>{" "}
                  to separate your items from theirs.
                </li>
                <li>
                  Keep quantities next to the unit name (e.g.,{" "}
                  <strong className="text-foreground font-semibold">
                    "5 x3"
                  </strong>
                  ).
                </li>
                <li>
                  The AI will ask for clarification if a name matches multiple
                  units.
                </li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <input
                value={smartInput}
                onChange={(e) => setSmartInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSmartImport()}
                placeholder="Paste offer here..."
                maxLength={500}
                disabled={isParsing}
                className="flex-1 bg-input border-border border rounded-[4px] px-3 py-3 md:py-2.5 text-[14px] text-foreground outline-none placeholder-muted-foreground focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
                autoFocus
              />
              <button
                onClick={handleSmartImport}
                disabled={isParsing}
                className="bg-primary hover:bg-primary/80 text-primary-foreground px-5 py-3 md:py-2.5 rounded-[4px] text-[14px] font-medium transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white flex items-center justify-center min-w-[90px] disabled:opacity-50 cursor-pointer"
              >
                {isParsing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Import"
                )}
              </button>
            </div>
            {smartInputError && (
              <p className="text-[12px] text-destructive mt-1 font-medium animate-fade-in flex items-center gap-1.5">
                <TriangleAlert className="w-3.5 h-3.5" /> {smartInputError}
              </p>
            )}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Add New Slang
            </span>
            <div className="flex flex-col sm:flex-row gap-2 relative">
              <input
                value={newSlangKey}
                onChange={(e) => setNewSlangKey(e.target.value)}
                placeholder="e.g. gg"
                className="w-full sm:w-[100px] shrink-0 bg-input border border-border rounded-[4px] px-3 py-3 md:py-2 text-[14px] md:text-[13px] text-foreground outline-none placeholder-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />

              <div className="relative flex-1" ref={dropdownRef}>
                <div
                  className={`flex items-center bg-input rounded-[4px] px-3 py-3 md:py-2 transition-all border ${
                    isDropdownOpen
                      ? "border-primary ring-1 ring-primary"
                      : "border-border"
                  }`}
                >
                  <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                      if (newSlangTargetId) setNewSlangTargetId("");
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Search target unit..."
                    className="bg-transparent text-[14px] md:text-[13px] text-foreground w-full outline-none placeholder-muted-foreground"
                  />
                  {newSlangTargetId && (
                    <Check className="w-4 h-4 text-[#23a559] ml-2 shrink-0" />
                  )}
                </div>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-[250px] overflow-y-auto custom-scrollbar bg-popover border border-border rounded-[4px] shadow-2xl z-50 flex flex-col p-2 gap-1">
                    {filteredUnits.length === 0 ? (
                      <div className="p-4 text-center text-[13px] text-muted-foreground">
                        No units found matching that search.
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
                            onClick={() => {
                              setNewSlangTargetId(u.id);
                              setSearchQuery(u.name);
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
                            <span className="text-[12px] font-mono font-bold text-foreground shrink-0 ml-2">
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
                onClick={handleAddSlang}
                className={`shrink-0 px-4 py-3 md:py-2 rounded-[4px] text-[14px] md:text-[13px] font-bold transition-colors cursor-pointer focus-visible:outline-none ${
                  newSlangKey.trim() && newSlangTargetId
                    ? "bg-[#23a559] hover:bg-[#1f914e] text-white"
                    : "bg-popover text-muted-foreground cursor-not-allowed"
                }`}
                disabled={!newSlangKey.trim() || !newSlangTargetId}
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Saved Dictionary
            </span>
            {Object.keys(slangDict).length === 0 ? (
              <p className="text-[12px] text-muted-foreground italic p-3 bg-black/20 rounded-[6px] border border-border">
                Your dictionary is empty. Adding slang helps the parser
                recognize your unique abbreviations.
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
                          "{key}"
                        </span>
                        <span className="text-muted-foreground text-[12px]">
                          ➔
                        </span>
                        <span className="text-[12.5px] text-foreground truncate">
                          {targetName}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveSlang(key)}
                        className="text-muted-foreground hover:text-destructive p-2 md:p-1.5 transition-colors rounded-[4px] md:rounded-[3px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive bg-white/5 hover:bg-destructive/10 shrink-0 ml-2"
                        title="Remove slang"
                      >
                        <Trash2 className="w-4 h-4 md:w-3.5 h-3.5" />
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
