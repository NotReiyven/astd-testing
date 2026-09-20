import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, Trash2, Check, Book } from "lucide-react";
import { useUnits } from "../../../context/UnitContext";
import { getSlangCache, learnSlang, removeSlang } from "../TradeAnalyzer/smartParser";
import { getProxyImage, handleImageError } from "../../../data";
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
      
      <div className="bg-popover border-l-4 border-l-destructive border-y border-y-border border-r border-r-border rounded-r-[8px] p-5 shadow-sm flex items-start gap-4">
         <img src={FIRE_ZIO_AVATAR} className="w-12 h-12 rounded-full border border-destructive object-cover shrink-0" alt="Fire Zio" />
         <div className="flex flex-col gap-1">
           <span className="text-[11px] font-black uppercase tracking-widest text-destructive">Fire Zio's Dictionary Setup</span>
           <p className="text-muted-foreground text-[13px] italic font-medium leading-relaxed">
             "The Smart Parser relies on this local dictionary to understand your specific abbreviations. Add them here. This data never touches our servers. If you clear your browser cache, you will lose your custom slang."
           </p>
         </div>
      </div>

      <div className="bg-card border border-border rounded-[8px] p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-1.5 mb-2">
           <h3 className="text-[14px] font-bold text-foreground uppercase tracking-wider">Add New Slang</h3>
           <p className="text-muted-foreground text-[12px]">Link a custom abbreviation to an official unit.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 relative">
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Your Custom Slang</span>
            <input 
              value={newSlangKey} 
              onChange={e => setNewSlangKey(e.target.value)} 
              placeholder="e.g., 'fbg', 'flaw', 'udbz'" 
              className="w-full bg-input border border-border rounded-[4px] px-4 py-3 text-[14px] text-foreground outline-none placeholder-muted-foreground focus:ring-1 focus:ring-primary transition-all shadow-inner" 
            />
          </div>

          <div className="flex-1 flex flex-col gap-2 relative" ref={dropdownRef}>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Target Official Unit</span>
            <div className={`flex items-center bg-input rounded-[4px] px-3 py-3 transition-all border shadow-inner ${isDropdownOpen ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
              <Search className="w-4 h-4 text-muted-foreground mr-3 shrink-0" />
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
                className="bg-transparent text-[14px] text-foreground w-full outline-none placeholder-muted-foreground"
              />
              {newSlangTargetId && <Check className="w-4 h-4 text-[#23a559] ml-2 shrink-0" />}
            </div>

            {isDropdownOpen && (
              <div className="absolute top-[105%] left-0 right-0 max-h-[300px] overflow-y-auto custom-scrollbar bg-card border border-border rounded-[4px] shadow-2xl z-50 flex flex-col p-2 gap-1">
                {filteredUnits.length === 0 ? (
                    <div className="p-4 text-center text-[13px] text-muted-foreground">No units found matching that search.</div>
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
                                className="flex items-center gap-3 w-full p-2.5 hover:bg-popover rounded-[4px] transition-colors text-left group focus-visible:outline-none"
                            >
                                <div className="w-10 h-10 rounded-[4px] bg-popover overflow-hidden shrink-0 flex items-center justify-center border border-border">
                                    {proxyUrl ? (
                                        <img src={proxyUrl} alt={u.name} className="w-full h-full object-cover" onError={(e) => handleImageError(e, u.id)} />
                                    ) : (
                                        <span className="text-white font-bold text-[12px]" style={getAvatarStyle(u.name)}>{getInitials(u.name)}</span>
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[14px] font-bold text-foreground truncate group-hover:text-white transition-colors">{u.name}</span>
                                    {u.subtitle && <span className="text-[11px] font-medium text-muted-foreground truncate">{u.subtitle}</span>}
                                </div>
                            </button>
                        );
                    })
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end">
            <button 
              onClick={handleAddSlang} 
              className={`flex items-center justify-center h-[46px] px-8 rounded-[4px] text-[14px] font-bold transition-colors focus-visible:outline-none ${newSlangKey.trim() && newSlangTargetId ? "bg-[#23a559] hover:bg-[#1f914e] text-white active:scale-95 shadow-sm" : "bg-popover text-muted-foreground border border-border cursor-not-allowed"}`}
              disabled={!newSlangKey.trim() || !newSlangTargetId}
            >
              Save Link
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
           <h3 className="text-[14px] font-bold text-foreground uppercase tracking-wider">Your Dictionary</h3>
           <span className="text-[11px] font-bold bg-popover border border-border text-foreground px-2.5 py-1 rounded-[4px]">{savedEntries.length} Saved</span>
        </div>

        {savedEntries.length === 0 ? (
          <div className="bg-card border border-border rounded-[8px] p-10 flex flex-col items-center justify-center text-center opacity-70 shadow-inner">
            <Book className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-[15px] font-bold text-foreground">Your dictionary is empty.</p>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-sm leading-relaxed">Add your most commonly used abbreviations above so the Calculator can parse your trades flawlessly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedEntries.map(([key, targetId]) => {
              const targetUnit = ALL_UNITS.find(u => u.id === targetId);
              const targetName = targetUnit?.name || targetId;
              const proxyUrl = targetUnit ? getProxyImage(targetUnit.id, targetUnit.imageUrl) : null;

              return (
                <div key={key} className="flex items-center bg-card p-3 rounded-[6px] border border-border hover:border-primary transition-colors group">
                  <div className="flex-1 flex items-center gap-3 overflow-hidden">
                    <div className="flex flex-col min-w-0 pr-2">
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Slang</span>
                       <span className="text-[14px] font-black text-foreground truncate">"{key}"</span>
                    </div>

                    <span className="text-muted-foreground text-[12px] font-black">➔</span>

                    <div className="flex items-center gap-2 min-w-0 flex-1 pl-1">
                      <div className="w-7 h-7 rounded-[4px] bg-popover overflow-hidden shrink-0 border border-border">
                        {proxyUrl ? (
                            <img src={proxyUrl} alt={targetName} className="w-full h-full object-cover" onError={(e) => handleImageError(e, targetId)} />
                        ) : (
                            <span className="w-full h-full flex items-center justify-center text-white font-bold text-[9px]" style={getAvatarStyle(targetName)}>{getInitials(targetName)}</span>
                        )}
                      </div>
                      <span className="text-[13px] font-medium text-foreground truncate">{targetName}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleRemoveSlang(key)} 
                    className="text-muted-foreground hover:text-destructive p-2 transition-colors rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive hover:bg-destructive/10 shrink-0 ml-2"
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