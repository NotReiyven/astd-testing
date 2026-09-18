import { useState, useRef, useEffect } from "react";
import { PanelLeft, Hash, Search, X, GraduationCap, Map, User, Settings2, Calculator, HelpCircle, Book } from "lucide-react";
import { GuideType } from "../guides/AquaGuideOverlay";
import { LiveAvatars } from "./LiveAvatars";

interface TopBarProps {
  calcHeaderZ: string;
  isRosterOpen: boolean;
  setIsRosterOpen: (val: boolean) => void;
  currentChannelInfo: { title: string; subtitle: string };
  helpMenuOpen: boolean;
  setHelpMenuOpen: (val: boolean) => void;
  startGuide: (type: GuideType) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (val: string) => void;
  handleToggleAnalyzer: () => void;
  isAnalyzerOpen: boolean;
  isMainStep3: boolean;
  activeItemsCount: number;
  isDictionaryActive: boolean;
}

export function TopBar({
  calcHeaderZ,
  isRosterOpen,
  setIsRosterOpen,
  currentChannelInfo,
  helpMenuOpen,
  setHelpMenuOpen,
  startGuide,
  globalSearchQuery,
  setGlobalSearchQuery,
  handleToggleAnalyzer,
  isAnalyzerOpen,
  isMainStep3,
  activeItemsCount,
  isDictionaryActive
}: TopBarProps) {
  const [helpClicks, setHelpClicks] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileSearchOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        setGlobalSearchQuery("");
        setMobileSearchOpen(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setGlobalSearchQuery]);

  const handleHelpClick = () => {
    const now = Date.now();
    if (now - lastClickTime > 10000) {
      setHelpClicks(1);
    } else {
      if (helpClicks + 1 >= 3) {
        setHelpMenuOpen(false);
        startGuide("annoyed");
        setHelpClicks(0);
        return;
      }
      setHelpClicks(prev => prev + 1);
    }
    setLastClickTime(now);
    setHelpMenuOpen(!helpMenuOpen);
  };

  const showCalcPulse = isDictionaryActive && !isAnalyzerOpen;

  return (
    <div className={`flex-shrink-0 flex items-center justify-between px-2 md:px-4 py-3 min-h-[48px] relative border-b border-[rgba(0,0,0,0.22)] shadow-sm bg-[#313338] ${calcHeaderZ}`}>

      {mobileSearchOpen && (
        <div className="absolute inset-0 z-[100] bg-[#313338] px-3 flex items-center gap-2 animate-fade-in border-b border-[rgba(0,0,0,0.22)]">
          <Search className="w-4 h-4 text-[#80848E] ml-1 shrink-0" />
          <input 
            ref={mobileInputRef}
            type="text" 
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === "Esc") {
                e.preventDefault();
                setGlobalSearchQuery("");
                setMobileSearchOpen(false);
                e.currentTarget.blur();
              }
            }}
            placeholder="Search all units..."
            className="flex-1 bg-transparent outline-none text-[#DBDEE1] text-[14px] px-2 h-full"
          />
          <button 
            onClick={() => { setMobileSearchOpen(false); setGlobalSearchQuery(""); }} 
            className="p-3 text-[#80848E] hover:text-[#F2F3F5] active:scale-95 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 md:gap-3 overflow-hidden pr-2">
        <button onClick={() => setIsRosterOpen(!isRosterOpen)} className={`p-2 transition-colors flex-shrink-0 ${isRosterOpen ? 'text-[#F2F3F5]' : 'text-[#80848E] hover:text-[#DBDEE1]'}`}>
          <PanelLeft className="w-6 h-6 md:w-[20px] md:h-[20px]" />
        </button>

        <div className="w-px h-5 mx-0.5 md:mx-1 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
        <Hash className="w-5 h-5 flex-shrink-0 text-[#80848E]" />
        <span className="text-[14px] md:text-[15px] font-bold text-[#F2F3F5] whitespace-nowrap truncate">{currentChannelInfo.title}</span>

        {currentChannelInfo.subtitle && (
          <div className="hidden lg:flex items-center flex-shrink-0 min-w-0">
            <div className="w-px h-5 mx-2" style={{ background: "rgba(255,255,255,0.08)" }} />
            <span className="text-[13px] font-medium text-[#B5BAC1] truncate max-w-[300px] xl:max-w-none">{currentChannelInfo.subtitle}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <LiveAvatars />

        <div className="relative">
          <button 
            onClick={handleHelpClick}
            className="flex items-center justify-center gap-2 px-3 py-2 md:py-1.5 rounded-[6px] bg-[#5865F2] hover:bg-[#4752C4] text-white transition-all text-[12px] font-bold shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            title="Need Help? Open Guides"
          >
            <HelpCircle className="w-4 h-4 sm:hidden flex-shrink-0" />
            <span className="hidden sm:inline">Need Help?</span>
          </button>
          {helpMenuOpen && (
            <>
              <div className="fixed inset-0 z-[99998]" onClick={() => setHelpMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-2 w-56 bg-[#2B2D31] border border-[rgba(255,255,255,0.08)] rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-[99999] py-1.5 flex flex-col animate-fade-in max-h-[70vh] overflow-y-auto custom-scrollbar">

                <span className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">Platform Basics</span>
                <button onClick={() => startGuide("main")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-[#DBDEE1] hover:bg-[#5865F2] hover:text-white transition-colors text-left text-[12.5px] font-semibold">
                  <GraduationCap className="w-4 h-4" /> Replay Tutorial
                </button>
                <button onClick={() => startGuide("channels")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-[#DBDEE1] hover:bg-[#5865F2] hover:text-white transition-colors text-left text-[12.5px] font-semibold">
                  <Map className="w-4 h-4" /> Channel Guide
                </button>
                <button onClick={() => startGuide("stats")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-[#DBDEE1] hover:bg-[#5865F2] hover:text-white transition-colors text-left text-[12.5px] font-semibold">
                  <Settings2 className="w-4 h-4" /> R / S / D Stats
                </button>

                <div className="w-full h-px bg-[rgba(255,255,255,0.04)] my-1" />
                <span className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">Pro Tools</span>
                <button onClick={() => startGuide("advanced")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-[#DBDEE1] hover:bg-[#5865F2] hover:text-white transition-colors text-left text-[12.5px] font-semibold">
                  <Settings2 className="w-4 h-4" /> Academy Checklist
                </button>
                <button onClick={() => startGuide("filters")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-[#DBDEE1] hover:bg-[#5865F2] hover:text-white transition-colors text-left text-[12.5px] font-semibold">
                  <Search className="w-4 h-4" /> Market Status Filters
                </button>
                <button onClick={() => startGuide("dictionary")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-[#DBDEE1] hover:bg-[#5865F2] hover:text-white transition-colors text-left text-[12.5px] font-semibold">
                  <Book className="w-4 h-4" /> Smart Dictionary
                </button>
                <button onClick={() => startGuide("management")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-[#DBDEE1] hover:bg-[#5865F2] hover:text-white transition-colors text-left text-[12.5px] font-semibold">
                  <Calculator className="w-4 h-4" /> Pinning & Clearing
                </button>

                <div className="w-full h-px bg-[rgba(255,255,255,0.04)] my-1" />
                <button onClick={() => startGuide("developer")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-[#DBDEE1] hover:bg-[#5865F2] hover:text-white transition-colors text-left text-[12.5px] font-semibold">
                  <User className="w-4 h-4" /> About the Developer
                </button>
              </div>
            </>
          )}
        </div>

        <button 
          onClick={() => setMobileSearchOpen(true)}
          className="md:hidden flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-[4px] text-[#80848E] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F2F3F5] transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>

        <div className="relative hidden md:flex items-center bg-[#1E1F22] rounded-[6px] px-2.5 h-[28px] w-[120px] focus-within:w-[180px] lg:w-48 lg:focus-within:w-64 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border border-[rgba(255,255,255,0.04)] shadow-inner">
          <input 
            type="text" 
            placeholder="Search..." 
            value={globalSearchQuery} 
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === "Esc") {
                e.preventDefault();
                setGlobalSearchQuery("");
                e.currentTarget.blur();
              }
            }}
            className="bg-transparent text-[13px] text-[#DBDEE1] w-full h-full outline-none placeholder-[#80848E] font-medium tracking-wide" 
          />
          {globalSearchQuery ? (
            <X className="w-3.5 h-3.5 flex-shrink-0 text-[#949BA4] cursor-pointer hover:text-[#DBDEE1] transition-colors" onClick={() => setGlobalSearchQuery("")} />
          ) : (
            <Search className="w-3.5 h-3.5 flex-shrink-0 text-[#80848E]" />
          )}
        </div>

        <div className="hidden md:block w-px h-5 mx-0.5 md:mx-1 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />

        <button 
          onClick={handleToggleAnalyzer} 
          className={`hidden md:flex relative items-center gap-2 px-3 py-1.5 rounded-[6px] transition-all duration-300 shadow-sm font-bold text-[12px] active:scale-95 ${
            isAnalyzerOpen 
              ? 'bg-[#4752C4] text-white shadow-[0_0_12px_rgba(88,101,242,0.4)]' 
              : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'
          } ${isMainStep3 || showCalcPulse ? 'animate-pulse ring-4 ring-[#5865F2] shadow-[0_0_20px_rgba(88,101,242,0.8)]' : ''}`}
          title="Toggle Trade Analyzer"
        >
          <Calculator className="w-4 h-4 flex-shrink-0" />
          <span>Calculator</span>
          {activeItemsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#ed4245] text-white font-mono font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
              {activeItemsCount > 9 ? '9+' : activeItemsCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}