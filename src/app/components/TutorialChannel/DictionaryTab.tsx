import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, Trash2, Check, Plus, Book } from "lucide-react";
import { useUnits } from "../../../context/UnitContext";
import { getSlangCache, learnSlang, removeSlang } from "../TradeAnalyzer/smartParser";
import { getProxyImage } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";

const FIRE_ZIO_AVATAR = "/units/firezio.webp";
export function DictionaryTab() {
  const { units: ALL_UNITS } = useUnits();
  
  const [slangDict, setSlangDict] = useState<Record<string, string>>({});
  const [newSlangKey, setNewSlangKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newSlangTargetId, setNewSlangTargetId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSlangDict(getSlangCache());
  }, []);

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
    ).slice(0, 50);
  }, [searchQuery, ALL_UNITS]);

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

  const savedEntries = Object.entries(slangDict);

  return (
    <div className="animate-fade-in pb-8 max-w-4xl mx-auto flex flex-col h-full gap-6 font-sans select-none">
      
      <div className="bg-[#111214] border-l-4 border-l-[#ed4245] border-y border-y-[rgba(255,255,255,0.04)] border-r border-r-[rgba(255,255,255,0.04)] rounded-r-[8px] p-5 shadow-sm flex items-start gap-4">
         <img src={FIRE_ZIO_AVATAR} className="w-12 h-12 rounded-full border border-[#ed4245] object-cover shrink-0" alt="Fire Zio" />
         <div className="flex flex-col gap-1">
           <span className="text-[11px] font-black uppercase tracking-widest text-[#ed4245]">Fire Zio's Dictionary Setup</span>
           <p className="text-[#949BA4] text-[13px] italic font-medium leading-relaxed">
             "The Smart Parser relies on this local dictionary to understand your specific abbreviations. Add them here. This data never touches our servers. If you clear your browser cache, you will lose your custom slang."
           </p>
         </div>
      </div>

      <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-1.5 mb-2">
           <h3 className="text-[14px] font-bold text-[#F2F3F5] uppercase tracking-wider">Add New Slang</h3>
           <p className="text-[#949BA4] text-[12px]">Link a custom abbreviation to an official unit.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 relative">
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-[#80848E] uppercase tracking-widest pl-1">Your Custom Slang</span>
            <input 
              value={newSlangKey} 
              onChange={e => setNewSlangKey(e.target.value)} 
              placeholder="e.g., 'fbg', 'flaw', 'udbz'" 
              className="w-full bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[4px] px-4 py-3 text-[14px] text-[#F2F3F5] outline-none placeholder-[#80848E] focus:ring-1 focus:ring-[#5865F2] transition-all shadow-inner" 
            />
          </div>

          <div className="flex-1 flex flex-col gap-2 relative" ref={dropdownRef}>
            <span className="text-[10px] font-bold text-[#80848E] uppercase tracking-widest pl-1">Target Official Unit</span>
            <div className={`flex items-center bg-[#1E1F22] rounded-[4px] px-3 py-3 transition-all border shadow-inner ${isDropdownOpen ? 'border-[#5865F2]' : 'border-[rgba(255,255,255,0.04)]'}`}>
              <Search className="w-4 h-4 text-[#80848E] mr-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                  if (newSlangTargetId) setNewSlangTargetId("");
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search official database..."
                className="bg-transparent text-[14px] text-[#F2F3F5] w-full outline-none placeholder-[#80848E]"
              />
              {newSlangTargetId && <Check className="w-4 h-4 text-[#23a559] ml-2 shrink-0" />}
            </div>

            {isDropdownOpen && (
              <div className="absolute top-[105%] left-0 right-0 max-h-[300px] overflow-y-auto custom-scrollbar bg-[#2B2D31] border border-[rgba(255,255,255,0.08)] rounded-[4px] shadow-2xl z-50 flex flex-col p-2 gap-1">
                {filteredUnits.length === 0 ? (
                    <div className="p-4 text-center text-[13px] text-[#80848E]">No units found matching that search.</div>
                ) : (
                    filteredUnits.map(u => {
                        const proxyUrl = getProxyImage(u.id, u.imageUrl);
                        return (
                            <button
                                key={u.id}
                                onClick={() => {
                                    setNewSlangTargetId(u.id);
                                    setSearchQuery(u.name);
                                    setIsDropdownOpen(false);
                                }}
                                className="flex items-center gap-3 w-full p-2.5 hover:bg-[#1E1F22] rounded-[4px] transition-colors text-left group"
                            >
                                <div className="w-10 h-10 rounded-[4px] bg-[#111214] overflow-hidden shrink-0 flex items-center justify-center border border-[rgba(255,255,255,0.04)]">
                                    {proxyUrl ? (
                                        <img src={proxyUrl} alt={u.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-white font-bold text-[12px]" style={getAvatarStyle(u.name)}>{getInitials(u.name)}</span>
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[14px] font-bold text-[#F2F3F5] truncate group-hover:text-white transition-colors">{u.name}</span>
                                    {u.subtitle && <span className="text-[11px] font-medium text-[#949BA4] truncate">{u.subtitle}</span>}
                                </div>
                            </button>
                        );
                    })
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end pt-2 md:pt-0">
            <button 
              onClick={handleAddSlang} 
              className={`flex items-center justify-center gap-2 h-[46px] px-6 rounded-[4px] text-[14px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white ${newSlangKey.trim() && newSlangTargetId ? "bg-[#5865F2] hover:bg-[#4752C4] text-white active:scale-95" : "bg-[#1E1F22] text-[#80848E] cursor-not-allowed border border-[rgba(255,255,255,0.02)]"}`}
              disabled={!newSlangKey.trim() || !newSlangTargetId}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-3">
           <h3 className="text-[14px] font-bold text-[#F2F3F5] uppercase tracking-wider">Your Dictionary</h3>
           <span className="text-[11px] font-bold bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] text-[#DBDEE1] px-2.5 py-1 rounded-[4px]">{savedEntries.length} Saved</span>
        </div>

        {savedEntries.length === 0 ? (
          <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-10 flex flex-col items-center justify-center text-center opacity-70 shadow-inner">
            <Book className="w-10 h-10 text-[#80848E] mb-3" />
            <p className="text-[15px] font-bold text-[#DBDEE1]">Your dictionary is empty.</p>
            <p className="text-[13px] text-[#80848E] mt-1 max-w-sm leading-relaxed">Add your most commonly used abbreviations above so the Calculator can parse your trades flawlessly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedEntries.map(([key, targetId]) => {
              const targetUnit = ALL_UNITS.find(u => u.id === targetId);
              const targetName = targetUnit?.name || targetId;
              const proxyUrl = targetUnit ? getProxyImage(targetUnit.id, targetUnit.imageUrl) : null;

              return (
                <div key={key} className="flex items-center bg-[#2B2D31] p-3 rounded-[6px] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-colors group">
                  <div className="flex-1 flex items-center gap-3 overflow-hidden">
                    <div className="flex flex-col min-w-0 pr-2">
                       <span className="text-[10px] font-bold text-[#80848E] uppercase tracking-widest mb-0.5">Slang</span>
                       <span className="text-[14px] font-black text-[#F2F3F5] truncate">"{key}"</span>
                    </div>

                    <span className="text-[#4E5058] text-[12px] font-black">➔</span>

                    <div className="flex items-center gap-2 min-w-0 flex-1 pl-1">
                      <div className="w-7 h-7 rounded-[4px] bg-[#111214] overflow-hidden shrink-0 border border-[rgba(255,255,255,0.04)]">
                        {proxyUrl ? (
                            <img src={proxyUrl} alt={targetName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="w-full h-full flex items-center justify-center text-white font-bold text-[9px]" style={getAvatarStyle(targetName)}>{getInitials(targetName)}</span>
                        )}
                      </div>
                      <span className="text-[13px] font-medium text-[#DBDEE1] truncate">{targetName}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleRemoveSlang(key)} 
                    className="text-[#80848E] hover:text-[#ed4245] p-2 transition-colors rounded-[4px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed4245] hover:bg-[rgba(237,66,69,0.1)] shrink-0 ml-2"
                    title="Remove slang"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}