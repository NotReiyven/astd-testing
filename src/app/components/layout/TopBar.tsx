// ================================================
// FILE: src/app/components/layout/TopBar.tsx
// ================================================

import { useState, useRef, useEffect } from "react";
import { PanelLeft, Hash, Search, X, Calculator, HelpCircle, Book, LogIn, LogOut, GraduationCap, Map, Settings2, User } from "lucide-react";
import { GuideType } from "../guides/AquaGuideOverlay";
import { LiveAvatars } from "./LiveAvatars";
import { useAuthStore } from "../../../store/useAuthStore";
import { useLayoutStore } from "../../../store/useLayoutStore";

interface TopBarProps {
  calcHeaderZ: string;
  isRosterOpen: boolean;
  setIsRosterOpen: (val: boolean) => void;
  currentChannelInfo: { title: string; subtitle: string };
  startGuide: (type: GuideType) => void;
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
  startGuide,
  handleToggleAnalyzer,
  isAnalyzerOpen,
  isMainStep3,
  activeItemsCount,
  isDictionaryActive
}: TopBarProps) {
  const { globalSearchQuery, setGlobalSearchQuery, helpMenuOpen, setHelpMenuOpen } = useLayoutStore();
  
  const [helpClicks, setHelpClicks] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);

  const { profile, loginWithDiscord, logout, isLoading: isAuthLoading } = useAuthStore();

  useEffect(() => {
    if (mobileSearchOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        desktopSearchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

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
    <div className={`flex-shrink-0 flex items-center justify-between px-2 md:px-4 py-2.5 md:py-3 min-h-[48px] relative border-b border-border shadow-sm bg-background ${calcHeaderZ}`}>

      {mobileSearchOpen && (
        <div className="absolute inset-0 z-[100] bg-background px-3 flex items-center gap-2 animate-fade-in border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
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
            className="flex-1 bg-transparent outline-none text-foreground text-[14px] px-2 h-full"
          />
          <button 
            onClick={() => { setMobileSearchOpen(false); setGlobalSearchQuery(""); }} 
            className="p-3 text-muted-foreground hover:text-foreground active:scale-95 transition-colors focus-visible:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* LEFT SECTION: Roster Toggle & Dynamic Title/Subtitle */}
      <div className="flex items-center gap-2 md:gap-3 pr-2 flex-1 min-w-0">
        <button onClick={() => setIsRosterOpen(!isRosterOpen)} className={`p-1.5 md:p-2 transition-colors flex-shrink-0 focus-visible:outline-none ${isRosterOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          <PanelLeft className="w-5 h-5 md:w-[20px] md:h-[20px]" />
        </button>

        <div className="w-px h-5 flex-shrink-0 bg-border hidden sm:block" />
        
        <div className="flex flex-col md:flex-row md:items-center min-w-0 overflow-hidden w-full">
          {/* Mobile: Show Title Only */}
          <div className="flex md:hidden items-center gap-1.5 min-w-0">
             <Hash className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
             <span className="text-[14px] font-bold text-foreground whitespace-nowrap truncate">{currentChannelInfo.title}</span>
          </div>

          {/* Desktop: Show Subtitle if it exists, otherwise Title */}
          <div className="hidden md:flex items-center min-w-0 flex-1">
            {currentChannelInfo.subtitle ? (
              <span className="text-[13px] font-medium text-muted-foreground truncate w-full">{currentChannelInfo.subtitle}</span>
            ) : (
              <>
                <Hash className="w-4 h-4 flex-shrink-0 text-muted-foreground mr-1.5" />
                <span className="text-[14px] font-bold text-foreground whitespace-nowrap truncate">{currentChannelInfo.title}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Controls */}
      <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
        <LiveAvatars />

        <div className="w-px h-5 mx-0.5 md:mx-1 flex-shrink-0 hidden md:block bg-border" />

        {!isAuthLoading && (
          profile ? (
            <button 
              onClick={logout}
              className="flex items-center gap-2 pl-1 pr-3 py-1 bg-popover hover:bg-destructive/20 border border-border hover:border-destructive/50 rounded-full transition-all group shrink-0 cursor-pointer"
              title="Click to Logout"
            >
              <img src={profile.avatar_url} alt="Avatar" className="w-5 h-5 md:w-6 md:h-6 rounded-full" />
              <span className="text-[12px] font-bold text-card-foreground group-hover:hidden hidden sm:block max-w-[80px] truncate">{profile.username}</span>
              <span className="text-[12px] font-bold text-destructive hidden group-hover:block hidden sm:block">Logout</span>
              <LogOut className="w-3.5 h-3.5 text-destructive sm:hidden hidden group-hover:block" />
            </button>
          ) : (
            <button 
              onClick={loginWithDiscord}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-[6px] text-[12px] font-bold transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Login</span>
            </button>
          )
        )}

        <div className="relative">
          <button 
            onClick={handleHelpClick}
            className="flex items-center justify-center gap-2 px-3 py-2 md:px-3 md:py-1.5 rounded-[6px] bg-card border border-border hover:bg-secondary text-card-foreground transition-all text-[12px] font-bold shadow-sm active:scale-95 focus-visible:outline-none shrink-0 cursor-pointer"
            title="Need Help? Open Guides"
          >
            <HelpCircle className="w-4 h-4 sm:hidden flex-shrink-0" />
            <span className="hidden sm:inline">Help</span>
          </button>
          {helpMenuOpen && (
            <>
              <div className="fixed inset-0 z-[99998]" onClick={() => setHelpMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-[99999] py-1.5 flex flex-col animate-fade-in max-h-[70vh] overflow-y-auto custom-scrollbar">

                <span className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Platform Basics</span>
                <button onClick={() => startGuide("main")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-card-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-left text-[12.5px] font-semibold cursor-pointer">
                  <GraduationCap className="w-4 h-4" /> Replay Tutorial
                </button>
                <button onClick={() => startGuide("channels")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-card-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-left text-[12.5px] font-semibold cursor-pointer">
                  <Map className="w-4 h-4" /> Channel Guide
                </button>
                <button onClick={() => startGuide("stats")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-card-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-left text-[12.5px] font-semibold cursor-pointer">
                  <Settings2 className="w-4 h-4" /> R / S / D Stats
                </button>

                <div className="w-full h-px bg-border my-1" />
                <span className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pro Tools</span>
                <button onClick={() => startGuide("advanced")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-card-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-left text-[12.5px] font-semibold cursor-pointer">
                  <Settings2 className="w-4 h-4" /> Academy Checklist
                </button>
                <button onClick={() => startGuide("filters")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-card-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-left text-[12.5px] font-semibold cursor-pointer">
                  <Search className="w-4 h-4" /> Market Status Filters
                </button>
                <button onClick={() => startGuide("dictionary")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-card-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-left text-[12.5px] font-semibold cursor-pointer">
                  <Book className="w-4 h-4" /> Smart Dictionary
                </button>
                <button onClick={() => startGuide("management")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-card-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-left text-[12.5px] font-semibold cursor-pointer">
                  <Calculator className="w-4 h-4" /> Pinning & Clearing
                </button>

                <div className="w-full h-px bg-border my-1" />
                <button onClick={() => startGuide("developer")} className="flex items-center gap-3 px-4 py-3 md:py-2 text-card-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-left text-[12.5px] font-semibold cursor-pointer">
                  <User className="w-4 h-4" /> About the Developer
                </button>
              </div>
            </>
          )}
        </div>

        <button 
          onClick={() => setMobileSearchOpen(true)}
          className="md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-[4px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer"
        >
          <Search className="w-4 h-4" />
        </button>

        <div className="relative hidden md:flex items-center bg-input rounded-[6px] px-2.5 h-[28px] w-[120px] focus-within:w-[180px] lg:w-48 lg:focus-within:w-64 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border border-border shadow-inner">
          <input 
            ref={desktopSearchRef}
            type="text" 
            placeholder="Search... (Ctrl+K)" 
            value={globalSearchQuery} 
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === "Esc") {
                e.preventDefault();
                setGlobalSearchQuery("");
                e.currentTarget.blur();
              }
            }}
            className="bg-transparent text-[13px] text-foreground w-full h-full outline-none placeholder-muted-foreground font-medium tracking-wide" 
          />
          {globalSearchQuery ? (
            <button onClick={() => setGlobalSearchQuery("")} className="p-2 -mr-2 md:p-1 md:-mr-1 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          )}
        </div>

        <div className="hidden md:block w-px h-5 mx-0.5 md:mx-1 flex-shrink-0 bg-border" />

        <button 
          onClick={handleToggleAnalyzer} 
          className={`hidden md:flex relative items-center gap-2 px-3 py-1.5 rounded-[6px] transition-all duration-300 shadow-sm font-bold text-[12px] active:scale-95 focus-visible:outline-none cursor-pointer ${
            isAnalyzerOpen 
              ? 'bg-primary/80 text-primary-foreground shadow-[0_0_12px_var(--primary)]' 
              : 'bg-primary hover:bg-primary/80 text-primary-foreground'
          } ${isMainStep3 || showCalcPulse ? 'animate-pulse ring-4 ring-primary shadow-[0_0_20px_var(--primary)]' : ''}`}
          title="Toggle Trade Analyzer"
        >
          <Calculator className="w-4 h-4 flex-shrink-0" />
          <span>Calculator</span>
          {activeItemsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground font-mono font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
              {activeItemsCount > 9 ? '9+' : activeItemsCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}