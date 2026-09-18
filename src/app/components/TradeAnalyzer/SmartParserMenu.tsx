import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Wand2, X, Book, HelpCircle, TriangleAlert, Trash2, Search, Check } from "lucide-react";
import { TradeCard, MasterUnit } from "../../../types";
import { parseSmartTrade, AmbiguousToken, getSlangCache, removeSlang, learnSlang } from "./smartParser";
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

export function SmartParserMenu({ ALL_UNITS, onClose, onSaveUndo, initialText }: SmartParserMenuProps) {
  const { giveItems, getItems, pinnedIds, overwrite } = useTradeStore();

  const [activeMenuTab, setActiveMenuTab] = useState<"import" | "dictionary">("import");
  const [smartInput, setSmartInput] = useState("");
  const [smartInputError, setSmartInputError] = useState("");
  const [ambiguousItems, setAmbiguousItems] = useState<AmbiguousToken[]>([]);

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
    return ALL_UNITS.filter(u =>
      u.name.toLowerCase().includes(q) ||
      (u.subtitle && u.subtitle.toLowerCase().includes(q)) ||
      (u.aliases && u.aliases.some(a => a.toLowerCase().includes(q)))
    ).slice(0, 30);
  }, [searchQuery, ALL_UNITS]);

  const processImport = useCallback((textToParse: string) => {
    const result = parseSmartTrade(textToParse, ALL_UNITS); 
    if (result.error) {
      setSmartInputError(result.error);
      setTimeout(() => setSmartInputError(""), 3000);
    } else {
      setStagedGive(result.giveCards);
      setStagedGet(result.getCards);
      setAmbiguousItems(result.ambiguous);
      setSmartInput("");
    }
  }, [ALL_UNITS]);

  const handleConfirmReview = () => {
    onSaveUndo?.();
    
    const mergeCards = (arr1: TradeCard[], arr2: TradeCard[]) => {
      const map = new Map<string, TradeCard>();
      arr1.forEach(c => map.set(c.id, { ...c }));
      arr2.forEach(c => {
        if (map.has(c.id)) map.get(c.id)!.qty += c.qty;
        else map.set(c.id, { ...c });
      });
      return Array.from(map.values());
    };

    const pinnedSet = new Set(pinnedIds);
    const pinnedGive = giveItems.filter(i => pinnedSet.has(`give-${i.id}`));
    const pinnedGet = getItems.filter(i => pinnedSet.has(`get-${i.id}`));

    overwrite(mergeCards(pinnedGive, stagedGive), mergeCards(pinnedGet, stagedGet));
    
    const totalAdded = stagedGive.length + stagedGet.length;
    if (totalAdded > 0) {
      window.dispatchEvent(new CustomEvent("trade-added", { 
        detail: { name: `Imported ${totalAdded} item${totalAdded > 1 ? 's' : ''}`, type: stagedGet.length > stagedGive.length ? "get" : "give" } 
      }));
    }

    triggerHaptic('success');
    window.dispatchEvent(new Event("academy-used-parser"));
    
    setStagedGive([]);
    setStagedGet([]);
    onClose();
  };

  const handleSmartImport = useCallback(() => processImport(smartInput), [processImport, smartInput]);

  useEffect(() => {
    if (initialText && initialText.trim().length > 0 && lastProcessedText.current !== initialText) {
      lastProcessedText.current = initialText;
      setSmartInput(initialText);
      processImport(initialText);
    }
  }, [initialText, processImport]);

  const resolveAmbiguity = useCallback((index: number, resolvedUnit: MasterUnit | null, col: "give" | "get", qty: number) => {
    if (resolvedUnit && qty > 0) {
      const newCard: TradeCard = {
          id: resolvedUnit.id, 
          name: resolvedUnit.name, 
          subtitle: resolvedUnit.subtitle,
          value: typeof resolvedUnit.value === "number" ? resolvedUnit.value : 0,
          qty
      };
      
      if (col === "give") setStagedGive(prev => [...prev, newCard]);
      else setStagedGet(prev => [...prev, newCard]);

      learnSlang(ambiguousItems[index].rawName, resolvedUnit.id);
    }

    setAmbiguousItems(prev => {
      const newAmbiguous = [...prev];
      newAmbiguous.splice(index, 1);
      return newAmbiguous;
    });
  }, [ambiguousItems]);

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
    <div className="relative z-50 mx-3 md:mx-4 mt-3 p-4 bg-[#2B2D31] border border-[#1E1F22] rounded-[8px] animate-fade-in shadow-[0_8px_24px_rgba(0,0,0,0.15)] flex flex-col gap-4 max-h-[calc(92vh-140px)] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-[#F2F3F5] uppercase tracking-wider flex items-center gap-1.5">
          <Wand2 className="w-4 h-4 text-[#5865F2]"/> Smart Parser
        </span>
        <button onClick={onClose} className="p-2 -m-2 md:p-1 md:-m-1 text-[#949BA4] hover:text-[#DBDEE1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] rounded-[3px]">
           <X className="w-4 h-4 md:w-3.5 md:h-3.5" />
        </button>
      </div>

      <div className="flex bg-[#111214] p-1 rounded-[6px] border border-[rgba(255,255,255,0.04)]">
        <button onClick={() => setActiveMenuTab("import")} className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2.5 md:py-1.5 rounded-[4px] transition-colors ${activeMenuTab === "import" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#949BA4] hover:text-[#DBDEE1]"}`}>Import Trade</button>
        <button onClick={() => setActiveMenuTab("dictionary")} className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2.5 md:py-1.5 rounded-[4px] transition-colors flex items-center justify-center gap-1.5 ${activeMenuTab === "dictionary" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#949BA4] hover:text-[#DBDEE1]"}`}><Book className="w-3 h-3" /> Dictionary</button>
      </div>

      {activeMenuTab === "import" ? (
        ambiguousItems.length > 0 ? (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="flex items-start gap-3 bg-[rgba(250,166,26,0.1)] p-3 rounded-[6px] border border-[rgba(250,166,26,0.2)]">
              <TriangleAlert className="w-5 h-5 text-[#FAA61A] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-bold text-[#FAA61A]">Clarification Needed</span>
                <span className="text-[13px] text-[#DBDEE1] leading-snug">Multiple units match your input. Please select the correct one below.</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1 pb-1">
              {ambiguousItems.map((item, idx) => (
                <div key={`${idx}-${item.rawName}`} className="flex flex-col p-3 bg-[#1E1F22] rounded-[8px] border border-[rgba(255,255,255,0.02)] shadow-inner">
                  <div className="mb-3">
                      <p className="text-[13px] text-[#B5BAC1] font-medium">
                        For <strong className="text-[#F2F3F5] font-bold px-1.5 py-0.5 bg-[rgba(255,255,255,0.06)] rounded mx-1">"{item.rawName}"</strong>
                        <span className="text-[#949BA4] text-[12px] ml-1">(Qty: {item.qty}, {item.col})</span>
                      </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {item.options.slice(0, 4).map(opt => (
                       <button 
                        key={opt.id} 
                        onClick={() => resolveAmbiguity(idx, opt, item.col, item.qty)} 
                        className="group w-full flex items-center justify-between bg-[#2B2D31] hover:bg-[#5865F2] text-[#DBDEE1] hover:text-white px-3 py-3 md:py-2.5 rounded-[6px] transition-all duration-200 border border-[rgba(255,255,255,0.04)] hover:border-[#5865F2] active:scale-[0.98] shadow-sm focus-visible:outline-none cursor-pointer"
                       >
                         <div className="flex flex-col items-start text-left">
                            <span className="text-[13.5px] font-bold tracking-tight">{opt.name}</span>
                            {opt.subtitle && <span className="text-[11px] font-medium text-[#80848E] group-hover:text-white/80 transition-colors tracking-wide mt-0.5">{opt.subtitle}</span>}
                         </div>
                         <div className="w-4 h-4 rounded-full border-2 border-[rgba(255,255,255,0.1)] group-hover:border-white/50 flex items-center justify-center shrink-0 ml-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-white transition-colors" />
                         </div>
                       </button>
                    ))}
                    
                    <div className="flex items-center justify-between mt-1">
                        {item.options.length > 4 ? (
                            <div className="px-2 py-1 text-[10px] text-[#80848E] font-bold uppercase tracking-wider cursor-default">
                                +{item.options.length - 4} more
                            </div>
                        ) : <div />}
                        
                        <button 
                            onClick={() => resolveAmbiguity(idx, null, item.col, 0)} 
                            className="bg-transparent hover:bg-[rgba(237,66,69,0.1)] text-[#80848E] hover:text-[#ed4245] text-[11px] font-bold uppercase tracking-wider px-3 py-2 md:px-2 md:py-1.5 rounded-[4px] transition-colors focus-visible:outline-none"
                        >
                            Ignore
                        </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (stagedGive.length > 0 || stagedGet.length > 0) ? (
          <div className="flex flex-col gap-3 animate-fade-in">
             <div className="bg-[#111214] p-3 rounded-[6px] border border-[rgba(255,255,255,0.04)] flex justify-between items-start">
               <div className="flex flex-col gap-1">
                 <h3 className="text-[12px] font-bold text-[#F2F3F5] uppercase tracking-wider">Review Import</h3>
                 <p className="text-[11.5px] text-[#949BA4] leading-relaxed">Remove incorrect items before confirming.</p>
               </div>
               <button onClick={() => { setStagedGive([]); setStagedGet([]); }} className="text-[#80848E] hover:text-[#ed4245] text-[10px] font-bold uppercase tracking-wider px-3 py-2 md:px-2 md:py-1 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(237,66,69,0.1)] rounded-[4px] transition-colors focus-visible:outline-none">Discard</button>
             </div>
             
             <div className="max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1">
               {stagedGive.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                     <span className="text-[10px] font-bold text-[#FAA61A] uppercase tracking-widest pl-1">You Give</span>
                     {stagedGive.map((card, i) => (
                        <div key={`give-${card.id}-${i}`} className="flex items-center justify-between bg-[#1E1F22] p-2 rounded-[6px] border border-[rgba(255,255,255,0.04)]">
                           <div className="flex items-center gap-2 overflow-hidden">
                             <span className="text-[13px] font-bold text-[#F2F3F5] truncate">{card.name}</span>
                             <span className="text-[10px] text-[#949BA4] font-medium tracking-wide bg-[#111214] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.04)]">x{card.qty}</span>
                           </div>
                           <button onClick={() => setStagedGive(prev => prev.filter((_, idx) => idx !== i))} className="p-2.5 md:p-1.5 text-[#80848E] hover:text-[#ed4245] hover:bg-[rgba(237,66,69,0.1)] rounded-[4px] transition-colors focus-visible:outline-none">
                             <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                           </button>
                        </div>
                     ))}
                  </div>
               )}

               {stagedGet.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                     <span className="text-[10px] font-bold text-[#5865F2] uppercase tracking-widest pl-1">You Get</span>
                     {stagedGet.map((card, i) => (
                        <div key={`get-${card.id}-${i}`} className="flex items-center justify-between bg-[#1E1F22] p-2 rounded-[6px] border border-[rgba(255,255,255,0.04)]">
                           <div className="flex items-center gap-2 overflow-hidden">
                             <span className="text-[13px] font-bold text-[#F2F3F5] truncate">{card.name}</span>
                             <span className="text-[10px] text-[#949BA4] font-medium tracking-wide bg-[#111214] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.04)]">x{card.qty}</span>
                           </div>
                           <button onClick={() => setStagedGet(prev => prev.filter((_, idx) => idx !== i))} className="p-2.5 md:p-1.5 text-[#80848E] hover:text-[#ed4245] hover:bg-[rgba(237,66,69,0.1)] rounded-[4px] transition-colors focus-visible:outline-none">
                             <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                           </button>
                        </div>
                     ))}
                  </div>
               )}
               
               {stagedGive.length === 0 && stagedGet.length === 0 && (
                   <p className="text-[12px] text-[#80848E] text-center py-4 italic">No items left to import.</p>
               )}
             </div>
             
             <button 
               onClick={handleConfirmReview} 
               disabled={stagedGive.length === 0 && stagedGet.length === 0}
               className="w-full mt-2 py-3 bg-[#23a559] hover:bg-[#1f914e] disabled:bg-[#1E1F22] disabled:text-[#80848E] text-white text-[14px] font-bold rounded-[6px] transition-colors shadow-md flex items-center justify-center gap-2 focus-visible:outline-none"
             >
                <Check className="w-4 h-4" /> Confirm & Add to Trade
             </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2.5 bg-[#111214] border border-[rgba(255,255,255,0.04)] rounded-[6px] p-3 shadow-inner">
               <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#949BA4] uppercase tracking-wider">
                 <HelpCircle className="w-3.5 h-3.5" /> How to format your trade
               </div>
               <ul className="text-[12px] text-[#B5BAC1] flex flex-col gap-1.5 list-disc pl-4 marker:text-[#5865F2] leading-snug">
                 <li>Use <strong className="text-[#DBDEE1] font-semibold">"for"</strong> or <strong className="text-[#DBDEE1] font-semibold">"want"</strong> to separate your items from theirs.</li>
                 <li>Keep quantities next to the unit name (e.g., <strong className="text-[#DBDEE1] font-semibold">"5 x3"</strong>).</li>
                 <li>The AI will ask for clarification if a name matches multiple units.</li>
               </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <input 
                value={smartInput} 
                onChange={e => setSmartInput(e.target.value)} 
                onKeyDown={e => e.key === "Enter" && handleSmartImport()} 
                placeholder="Paste offer here..." 
                maxLength={500} 
                className="flex-1 bg-[#1E1F22] border-none rounded-[4px] px-3 py-3 md:py-2.5 text-[14px] text-[#F2F3F5] outline-none placeholder-[#80848E] focus:ring-2 focus:ring-[#5865F2] transition-all" 
                autoFocus 
              />
              <button onClick={handleSmartImport} className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-5 py-3 md:py-2.5 rounded-[4px] text-[14px] font-medium transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                Import
              </button>
            </div>
            {smartInputError && <p className="text-[12px] text-[#ed4245] mt-1 font-medium animate-fade-in flex items-center gap-1.5"><TriangleAlert className="w-3.5 h-3.5" /> {smartInputError}</p>}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col gap-2">
             <span className="text-[11px] font-bold text-[#949BA4] uppercase tracking-wider">Add New Slang</span>
             <div className="flex flex-col sm:flex-row gap-2 relative">
                <input 
                  value={newSlangKey} 
                  onChange={e => setNewSlangKey(e.target.value)} 
                  placeholder="e.g. gg" 
                  className="w-full sm:w-[100px] shrink-0 bg-[#1E1F22] border border-transparent rounded-[4px] px-3 py-3 md:py-2 text-[14px] md:text-[13px] text-[#F2F3F5] outline-none placeholder-[#80848E] focus:ring-1 focus:ring-[#5865F2] focus:border-[#5865F2] transition-all" 
                />

                <div className="relative flex-1" ref={dropdownRef}>
                  <div className={`flex items-center bg-[#1E1F22] rounded-[4px] px-3 py-3 md:py-2 transition-all border ${isDropdownOpen ? 'border-[#5865F2] ring-1 ring-[#5865F2]' : 'border-transparent'}`}>
                    <Search className="w-4 h-4 text-[#80848E] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                        if (newSlangTargetId) setNewSlangTargetId("");
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder="Search target unit..."
                      className="bg-transparent text-[14px] md:text-[13px] text-[#F2F3F5] w-full outline-none placeholder-[#80848E]"
                    />
                    {newSlangTargetId && <Check className="w-4 h-4 text-[#23a559] ml-2 shrink-0" />}
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-[250px] overflow-y-auto custom-scrollbar bg-[#2B2D31] border border-[rgba(255,255,255,0.08)] rounded-[6px] shadow-xl z-50 flex flex-col p-1.5 gap-1">
                      {filteredUnits.length === 0 ? (
                         <div className="p-3 text-center text-[12px] text-[#80848E]">No units found.</div>
                      ) : (
                         filteredUnits.map(u => {
                             const proxyUrl = getProxyImage(u.id, u.imageUrl);
                             const valText = u.value === "owner" ? "O/C" : (typeof u.value === "number" ? u.value.toLocaleString() : u.valueMin?.toLocaleString() || "0");
                             return (
                                 <button
                                     key={u.id}
                                     onClick={() => {
                                         setNewSlangTargetId(u.id);
                                         setSearchQuery(u.name);
                                         setIsDropdownOpen(false);
                                     }}
                                     className="flex items-center gap-3 w-full p-2.5 md:p-2 hover:bg-[#1E1F22] rounded-[4px] transition-colors text-left group"
                                 >
                                     <div className="w-8 h-8 rounded-[4px] bg-[#111214] overflow-hidden shrink-0 flex items-center justify-center border border-[rgba(255,255,255,0.04)]">
                                         {proxyUrl ? (
                                             <img src={proxyUrl} alt={u.name} onError={(e) => handleImageError(e, u.id)} className="w-full h-full object-cover" />
                                         ) : (
                                             <span className="text-white font-bold text-[10px]" style={getAvatarStyle(u.name)}>{getInitials(u.name)}</span>
                                         )}
                                     </div>
                                     <div className="flex flex-col min-w-0 flex-1">
                                         <span className="text-[13px] font-bold text-[#F2F3F5] truncate group-hover:text-white transition-colors">{u.name}</span>
                                         {u.subtitle && <span className="text-[10px] font-medium text-[#949BA4] truncate">{u.subtitle}</span>}
                                     </div>
                                     <span className="text-[12px] font-mono font-bold text-[#DBDEE1] shrink-0 ml-2">
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
                  className={`shrink-0 px-4 py-3 md:py-2 rounded-[4px] text-[14px] md:text-[13px] font-bold transition-colors ${newSlangKey.trim() && newSlangTargetId ? "bg-[#23a559] hover:bg-[#1f914e] text-white" : "bg-[#1E1F22] text-[#80848E] cursor-not-allowed"}`}
                  disabled={!newSlangKey.trim() || !newSlangTargetId}
                >
                  Add
                </button>
             </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
             <span className="text-[11px] font-bold text-[#949BA4] uppercase tracking-wider">Saved Dictionary</span>
             {Object.keys(slangDict).length === 0 ? (
               <p className="text-[12px] text-[#80848E] italic p-3 bg-[#111214] rounded-[6px] border border-[rgba(255,255,255,0.02)]">Your dictionary is empty. Adding slang helps the parser recognize your unique abbreviations.</p>
             ) : (
               <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-2">
                 {Object.entries(slangDict).map(([key, targetId]) => {
                   const targetUnit = ALL_UNITS.find(u => u.id === targetId);
                   const targetName = targetUnit?.name || targetId;
                   const proxyUrl = targetUnit ? getProxyImage(targetUnit.id, targetUnit.imageUrl) : null;

                   return (
                     <div key={key} className="flex items-center justify-between bg-[#1E1F22] p-2.5 rounded-[6px] border border-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.06)] transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-[13px] font-bold text-[#F2F3F5] shrink-0">"{key}"</span>
                          <span className="text-[#80848E] text-[12px]">➔</span>
                          <span className="text-[12.5px] text-[#DBDEE1] truncate">{targetName}</span>
                        </div>
                        <button onClick={() => handleRemoveSlang(key)} className="text-[#80848E] hover:text-[#ed4245] p-2 md:p-1.5 transition-colors rounded-[4px] md:rounded-[3px] focus-visible:ring-2 focus-visible:ring-[#ed4245] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(237,66,69,0.1)] shrink-0 ml-2" title="Remove slang">
                          <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </button>
                     </div>
                   )
                 })}
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}