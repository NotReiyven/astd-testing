// ================================================
// FILE: src/app/components/layout/TopBar.tsx
// ================================================

import { useState, useRef, useEffect } from "react";
import { 
  PanelLeft, Hash, Search, X, Calculator, LogIn, LogOut, User, Check, Terminal, Sparkles
} from "lucide-react";
import { LiveAvatars } from "./LiveAvatars";
import { useAuthStore } from "../../../store/useAuthStore";
import { useLayoutStore } from "../../../store/useLayoutStore";
import { CommandPalette } from "./CommandPalette";

interface TopBarProps {
  calcHeaderZ: string;
  isRosterOpen: boolean;
  setIsRosterOpen: (val: boolean) => void;
  currentChannelInfo: { title: string; subtitle: string };
  startGuide: (type: any) => void;
  handleToggleAnalyzer: () => void;
  isAnalyzerOpen: boolean;
  isMainStep3: boolean;
  activeItemsCount: number;
  isDictionaryActive: boolean;
}

const STATUS_COLORS = {
  online: "#23a559",
  dnd: "#f23f43",
  invisible: "#80848e",
  offline: "#80848e"
};

export function TopBar({
  calcHeaderZ,
  isRosterOpen,
  setIsRosterOpen,
  currentChannelInfo,
  handleToggleAnalyzer,
  isAnalyzerOpen,
  isMainStep3,
  activeItemsCount,
  isDictionaryActive
}: TopBarProps) {
  const { globalSearchQuery, setGlobalSearchQuery, commandPaletteOpen, setCommandPaletteOpen } = useLayoutStore();
  
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { profile, loginWithDiscord, logout, updateStatus, isLoading: isAuthLoading } = useAuthStore();

  // --- Contextual Banners ---
  const [dismissedTips, setDismissedTips] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('astd_tips') || '{}'); } catch { return {}; }
  });

  const dismissTip = (channel: string) => {
    const next = { ...dismissedTips, [channel]: true };
    setDismissedTips(next);
    localStorage.setItem('astd_tips', JSON.stringify(next));
  };

  const getTipForChannel = (channelTitle: string) => {
    if (channelTitle === "trading-ads") return "Tip: Click any unit in an ad to view its market history, or drag it into your calculator.";
    if (channelTitle === "home") return "Tip: Keep an eye on the Patch Notes. The meta shifts quickly.";
    if (channelTitle === "extra-notices") return "Tip: Pin important notices to keep them at the top of your feed.";
    return null;
  };
  
  const currentTip = getTipForChannel(currentChannelInfo.title);
  const showTip = currentTip && !dismissedTips[currentChannelInfo.title];

  // --- Hotkeys ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          desktopSearchRef.current?.focus();
        }
      }
      if (e.key === "Escape" || e.key === "Esc") {
        setGlobalSearchQuery("");
        setMobileSearchOpen(false);
        setIsProfileMenuOpen(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [setCommandPaletteOpen, setGlobalSearchQuery]);

  useEffect(() => {
    if (mobileSearchOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const showCalcPulse = isDictionaryActive && !isAnalyzerOpen;

  return (
    <div className="flex flex-col w-full relative z-[99999]">
      <div className={`flex-shrink-0 flex items-center justify-between px-2 md:px-4 py-2.5 md:py-3 min-h-[48px] relative border-b border-border shadow-sm bg-background ${calcHeaderZ}`}>

        {mobileSearchOpen && (
          <div className="absolute inset-0 z-[100] bg-background px-3 flex items-center gap-2 animate-fade-in border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
            <input 
              ref={mobileInputRef}
              type="text" 
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
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
              <div className="relative" ref={profileMenuRef}>
                <button 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-1 md:pr-3 md:py-1 bg-popover hover:bg-muted border border-border rounded-full md:rounded-[20px] transition-all shrink-0 cursor-pointer focus-visible:outline-none"
                  title="Account Settings"
                >
                  <div className="relative">
                    <img src={profile.avatar_url} alt="Avatar" className="w-6 h-6 md:w-6 md:h-6 rounded-full object-cover bg-background" />
                    <div 
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-popover"
                      style={{ backgroundColor: STATUS_COLORS[profile.status] || STATUS_COLORS.offline }}
                    />
                  </div>
                  <span className="text-[12px] font-bold text-foreground hidden sm:block max-w-[80px] truncate">{profile.username}</span>
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-[99999] p-1.5 flex flex-col animate-fade-in">
                    <div className="px-2 py-1.5 mb-1 border-b border-border">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block">Status</span>
                    </div>
                    
                    <button onClick={() => { updateStatus('online'); setIsProfileMenuOpen(false); }} className="flex items-center justify-between w-full px-2 py-2 rounded-[4px] hover:bg-primary hover:text-primary-foreground transition-colors group cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#23a559]" />
                        <span className="text-[13px] font-semibold text-foreground group-hover:text-primary-foreground">Online</span>
                      </div>
                      {profile.status === 'online' && <Check className="w-4 h-4 text-foreground group-hover:text-primary-foreground" />}
                    </button>

                    <button onClick={() => { updateStatus('dnd'); setIsProfileMenuOpen(false); }} className="flex items-center justify-between w-full px-2 py-2 rounded-[4px] hover:bg-primary hover:text-primary-foreground transition-colors group cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#f23f43]" />
                        <span className="text-[13px] font-semibold text-foreground group-hover:text-primary-foreground">Do Not Disturb</span>
                      </div>
                      {profile.status === 'dnd' && <Check className="w-4 h-4 text-foreground group-hover:text-primary-foreground" />}
                    </button>

                    <button onClick={() => { updateStatus('invisible'); setIsProfileMenuOpen(false); }} className="flex items-center justify-between w-full px-2 py-2 rounded-[4px] hover:bg-primary hover:text-primary-foreground transition-colors group cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-transparent border-2 border-[#80848e] group-hover:border-primary-foreground" />
                        <span className="text-[13px] font-semibold text-foreground group-hover:text-primary-foreground">Invisible</span>
                      </div>
                      {profile.status === 'invisible' && <Check className="w-4 h-4 text-foreground group-hover:text-primary-foreground" />}
                    </button>

                    <div className="w-full h-px bg-border my-1" />

                    <button onClick={() => { setIsProfileMenuOpen(false); window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'profile' })); }} className="flex items-center gap-2 w-full px-2 py-2 rounded-[4px] hover:bg-primary hover:text-primary-foreground transition-colors group cursor-pointer">
                      <User className="w-4 h-4 text-muted-foreground group-hover:text-primary-foreground" />
                      <span className="text-[13px] font-semibold text-foreground group-hover:text-primary-foreground">Profile Settings</span>
                    </button>

                    <button onClick={() => { logout(); setIsProfileMenuOpen(false); }} className="flex items-center gap-2 w-full px-2 py-2 rounded-[4px] hover:bg-destructive hover:text-destructive-foreground transition-colors group cursor-pointer mt-0.5">
                      <LogOut className="w-4 h-4 text-destructive group-hover:text-destructive-foreground" />
                      <span className="text-[13px] font-semibold text-destructive group-hover:text-destructive-foreground">Log Out</span>
                    </button>
                  </div>
                )}
              </div>
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

          <button 
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center justify-center gap-2 px-3 py-2 md:px-3 md:py-1.5 rounded-[6px] bg-card border border-border hover:bg-secondary text-card-foreground transition-all text-[12px] font-bold shadow-sm active:scale-95 focus-visible:outline-none shrink-0 cursor-pointer"
            title="Open Command Palette"
          >
            <Terminal className="w-4 h-4 sm:hidden flex-shrink-0" />
            <span className="hidden sm:inline text-[11px] text-muted-foreground font-mono bg-popover px-1.5 py-0.5 rounded border border-border tracking-wider leading-none">⌘K</span>
          </button>

          <button 
            onClick={() => setMobileSearchOpen(true)}
            className="md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-[4px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          <div 
            className="relative hidden md:flex items-center bg-input rounded-[6px] px-2.5 h-[28px] w-[120px] focus-within:w-[180px] lg:w-48 lg:focus-within:w-64 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border border-border shadow-inner cursor-text" 
            onClick={() => desktopSearchRef.current?.focus()}
          >
            <input 
              ref={desktopSearchRef}
              type="text" 
              placeholder="Search units... (Ctrl+F)" 
              value={globalSearchQuery} 
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              className="bg-transparent text-[13px] text-foreground w-full h-full outline-none placeholder-muted-foreground font-medium tracking-wide" 
            />
            {globalSearchQuery ? (
              <button onClick={(e) => { e.stopPropagation(); setGlobalSearchQuery(""); }} className="p-2 -mr-2 md:p-1 md:-mr-1 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer">
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
            } ${isMainStep3 || showCalcPulse ? 'animate-pulse ring-4 ring-primary shadow-[0_0_20px_var(--primary)] !z-[100005]' : ''}`}
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

      {showTip && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between animate-fade-in shadow-sm relative z-40">
          <span className="text-[12px] font-medium text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" /> {currentTip}
          </span>
          <button onClick={() => dismissTip(currentChannelInfo.title)} className="text-primary hover:text-primary-foreground transition-colors p-1 rounded hover:bg-primary/20 shrink-0 ml-4"><X className="w-4 h-4" /></button>
        </div>
      )}

      {commandPaletteOpen && <CommandPalette />}
    </div>
  );
}