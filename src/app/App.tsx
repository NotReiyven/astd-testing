// ================================================
// FILE: src/app/App.tsx
// ================================================

import { useState, useEffect, Suspense, lazy, useCallback } from "react";
import { Hash, Check, GraduationCap, Ban, ExternalLink } from "lucide-react";
import { FilterKey } from "../types";
import { useStickyState, isBoolean, isNonEmptyString } from "../hooks/useStickyState";
import { AquaGuideOverlay } from "./components/guides/AquaGuideOverlay";
import { TopBar } from "./components/layout/TopBar";
import { SyncBanner } from "./components/layout/SyncBanner";
import { WelcomeModal } from "./components/WelcomeModal";
import { MiniProfilePopout } from "./components/layout/MiniProfilePopout";
import { useTradeStore } from "../store/useTradeStore";
import { useLayoutStore } from "../store/useLayoutStore";
import { HistoryModal } from "./components/MainCanvas/HistoryModal";

import { useAppBoot } from "../hooks/useAppBoot";
import { useGuideSystem } from "../hooks/useGuideSystem";
import { useGlobalEvents } from "../hooks/useGlobalEvents";
import { useMobileSwipe } from "../hooks/useMobileSwipe";
import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";

const TradeAnalyzerPanel = lazy(() => import("./components/TradeAnalyzer").then(module => ({ default: module.TradeAnalyzerPanel })));
const Sidebar = lazy(() => import("./components/Sidebar").then(module => ({ default: module.Sidebar })));
const MainCanvas = lazy(() => import("./components/MainCanvas").then(module => ({ default: module.MainCanvas })));
const HomeChannel = lazy(() => import("./components/HomeChannel").then(module => ({ default: module.HomeChannel })));
const TutorialChannel = lazy(() => import("./components/TutorialChannel").then(module => ({ default: module.TutorialChannel })));
const InventoryChannel = lazy(() => import("./components/InventoryChannel").then(module => ({ default: module.InventoryChannel })));
const TradingAdsChannel = lazy(() => import("./components/TradingAdsChannel").then(module => ({ default: module.TradingAdsChannel })));
const ExtraNoticesChannel = lazy(() => import("./components/ExtraNoticesChannel").then(module => ({ default: module.ExtraNoticesChannel })));
const LegalChannel = lazy(() => import("./components/LegalChannel").then(module => ({ default: module.LegalChannel })));
const AdminChannel = lazy(() => import("./components/AdminChannel").then(module => ({ default: module.AdminChannel }))); 
const ProfileChannel = lazy(() => import("./components/ProfileChannel").then(module => ({ default: module.ProfileChannel }))); 

const CHANNEL_INFO: Record<string, { title: string; subtitle: string }> = {
  "home": { title: "home", subtitle: "Welcome to the ASTD Value List! Important information and update logs are posted here." },
  "value-list": { title: "value-list", subtitle: "ASTD unit values • Being Observed Live by Fire Zio" },
  "trading-ads": { title: "trading-ads", subtitle: "Live community trade listings • Direct Discord messaging" },
  "tutorial": { title: "tutorial", subtitle: "Learn how to use the ASTD trading calculator and value list." },
  "inventory": { title: "my-inventory", subtitle: "Manage your personal unit collection and vault." },
  "profile": { title: "user-profile", subtitle: "Trader Identity & Public Records" },
  "extra-notices": { title: "extra-notices", subtitle: "Additional rules, exceptions, and community notes." },
  "terms-of-service": { title: "terms-of-service", subtitle: "Rules and guidelines for using the ASTD Value List." },
  "privacy-policy": { title: "privacy-policy", subtitle: "How we handle and protect your data." },
  "admin-panel": { title: "admin-panel", subtitle: "Moderation and User Management Database." } 
};

export default function App() {
  const giveItems = useTradeStore((s) => s.giveItems);
  const getItems = useTradeStore((s) => s.getItems);
  const pinnedIds = useTradeStore((s) => s.pinnedIds);
  const { profile } = useAuthStore();

  const { globalSearchQuery, setGlobalSearchQuery } = useLayoutStore();

  const [activeChannel, setActiveChannel] = useStickyState("home", "astd_channel", isNonEmptyString);
  const [tutorialTab, setTutorialTab] = useState<"sandbox" | "simulator" | "theory" | "dictionary">("sandbox");
  const [activeTierFilter, setActiveTierFilter] = useStickyState<FilterKey>("S", "astd_tier");
  const [scrollToSection, setScrollToSection] = useState<{ tier: string; sectionId: string } | null>(null);
  const [isRosterOpen, setIsRosterOpen] = useStickyState(window.innerWidth >= 768, "astd_roster", isBoolean);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useStickyState(false, "astd_analyzer", isBoolean);

  const { bootStage, isMobile } = useAppBoot();
  
  const [banReason, setBanReason] = useState<string>("Violation of Terms of Service.");
  useEffect(() => {
    if (profile?.role === 'banned') {
      const getBanReason = async () => {
        const { data } = await supabase
          .from('moderation_logs')
          .select('reason')
          .eq('target_user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (data && data.length > 0 && data[0].reason) {
          setBanReason(data[0].reason);
        }
      };
      getBanReason();
    }
  }, [profile]);

  const { guideState, setGuideState, completedGuides, setCompletedGuides, startGuide, endGuide } = useGuideSystem({ 
    setActiveChannel, setIsRosterOpen, setIsAnalyzerOpen, setTutorialTab, bootStage 
  });

  const { toast, academyToast } = useGlobalEvents({ 
    giveItems, getItems, pinnedIds, completedGuides, setCompletedGuides, 
    setActiveChannel, setIsRosterOpen, setIsAnalyzerOpen, setTutorialTab, setGuideState 
  });

  const { handleTouchStart, handleTouchEnd } = useMobileSwipe(isRosterOpen, setIsRosterOpen);

  const activeItemsCount = giveItems.reduce((acc, c) => acc + c.qty, 0) + getItems.reduce((acc, c) => acc + c.qty, 0);
  const isDictionaryActive = activeChannel === "tutorial" && tutorialTab === "dictionary";

  useEffect(() => {
    if (globalSearchQuery.trim().length > 0) {
      if (activeChannel !== "value-list") setActiveChannel("value-list");
      if (activeTierFilter !== "All") setActiveTierFilter("All");
      if (window.innerWidth < 768 && isRosterOpen) setIsRosterOpen(false);
    }
  }, [globalSearchQuery, activeChannel, activeTierFilter, setActiveChannel, setActiveTierFilter, isRosterOpen, setIsRosterOpen]);

  useEffect(() => {
    if (window.innerWidth < 768) setIsRosterOpen(false);
  }, [setIsRosterOpen]);

  const handleChannelChange = useCallback((id: string) => {
    setActiveChannel(id);
    if (id === "value-list" && guideState.type === "main" && guideState.step === 1) {
      setGuideState(prev => ({ ...prev, step: 2 }));
      if (window.innerWidth < 768) setIsRosterOpen(false);
    }
  }, [setActiveChannel, guideState, setIsRosterOpen, setGuideState]);

  const handleThreadClick = useCallback((tier: FilterKey, sectionId: string) => {
    setActiveChannel("value-list");
    setActiveTierFilter(tier); 
    setGlobalSearchQuery(""); 
    if (window.innerWidth < 768) setIsRosterOpen(false);
    setScrollToSection({ tier, sectionId });
    setTimeout(() => setScrollToSection(null), 400);
  }, [setActiveChannel, setActiveTierFilter, setIsRosterOpen, setGlobalSearchQuery]);

  const handleToggleAnalyzer = useCallback(() => {
    setIsAnalyzerOpen(prev => !prev);
    if (guideState.type === "main" && guideState.step === 3) setGuideState(prev => ({ ...prev, step: 4 }));
  }, [setIsAnalyzerOpen, guideState, setGuideState]);

  const currentChannelInfo = CHANNEL_INFO[activeChannel] || { title: activeChannel, subtitle: "" };

  const isMainStep1 = guideState.type === "main" && guideState.step === 1;
  const isMainStep2 = guideState.type === "main" && guideState.step === 2;
  const isMainStep3 = guideState.type === "main" && guideState.step === 3;
  const isMainStep4 = guideState.type === "main" && guideState.step === 4;

  const sidebarZ = isMainStep1 ? "!z-[100000] shadow-[15px_0_50px_rgba(0,0,0,0.8)] relative" : "z-50";
  const mainContentZ = isMainStep2 ? "!z-[100000] relative shadow-[0_0_50px_rgba(0,0,0,0.8)]" : "z-auto";
  const calcHeaderZ = isMainStep3 ? "!z-[99999] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative" : "z-50";
  const analyzerZ = isMainStep4 ? "!z-[100000] shadow-[-20px_0_50px_rgba(0,0,0,0.8)]" : "z-50";

  // HARD LOCK SCREEN FOR BANNED USERS
  if (bootStage === 'complete' && profile?.role === 'banned') {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-dvh bg-[#111214] text-[#F2F3F5] font-sans p-6 text-center select-none animate-fade-in">
        <Ban className="w-20 h-20 text-destructive mb-6 shadow-sm" />
        <h1 className="text-[28px] font-black uppercase tracking-widest text-destructive mb-2">Account Terminated</h1>
        <p className="text-[#949BA4] text-[14px] max-w-md leading-relaxed mb-8">
          Your access to the ASTD Value List platform has been permanently revoked by the moderation team.
        </p>
        <div className="bg-[#1E1F22] border border-border rounded-[8px] p-5 w-full max-w-md text-left mb-8 shadow-inner">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Official Reason</span>
          <p className="text-[14px] text-foreground font-medium leading-relaxed italic">"{banReason}"</p>
        </div>
        <a href="https://discord.gg/Q7JTvPUEM" target="_blank" rel="noopener noreferrer" className="px-8 py-3.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-[13px] uppercase tracking-wider rounded-[4px] transition-colors shadow-md flex items-center justify-center gap-2 border border-[#5865F2] focus-visible:outline-none">
          Appeal in Discord <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes loadingBarProgress { 0% { transform: translateX(-100%); width: 30%; } 50% { transform: translateX(100%); width: 50%; } 100% { transform: translateX(350%); width: 30%; } }
        .animate-loading-bar { animation: loadingBarProgress 1.5s infinite ease-in-out; }

        @keyframes masterSlash { 
          0% { transform: scaleX(0) rotate(-45deg); opacity: 0; } 
          20% { transform: scaleX(0.15) rotate(-45deg); opacity: 1; } 
          50% { transform: scaleX(1.1) rotate(-45deg); opacity: 1; filter: drop-shadow(0 0 16px var(--primary)); } 
          100% { transform: scaleX(1.4) rotate(-45deg); opacity: 0; filter: drop-shadow(0 0 8px var(--primary)); } 
        }
        .animate-master-slash { animation: masterSlash 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards; }

        @keyframes sparkFly1 {
          0% { transform: rotate(45deg) translateX(0) scaleX(0); opacity: 0; }
          20% { transform: rotate(45deg) translateX(0) scaleX(1); opacity: 1; }
          100% { transform: rotate(45deg) translateX(20vw) scaleX(0); opacity: 0; }
        }
        @keyframes sparkFly2 {
          0% { transform: rotate(45deg) translateX(0) scaleX(0); opacity: 0; }
          20% { transform: rotate(45deg) translateX(0) scaleX(1); opacity: 1; }
          100% { transform: rotate(45deg) translateX(-20vw) scaleX(0); opacity: 0; }
        }
        .animate-spark-1 { animation: sparkFly1 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
        .animate-spark-2 { animation: sparkFly2 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }

        @keyframes edgeGlow {
          0% { box-shadow: inset 0 0 40px rgba(114, 137, 218, 0.7), inset 0 0 15px rgba(114, 137, 218, 0.5); }
          100% { box-shadow: inset 0 0 0px rgba(114, 137, 218, 0), inset 0 0 0px rgba(114, 137, 218, 0); }
        }
        .animate-edge-glow { animation: edgeGlow 0.8s ease-out forwards; }

        @keyframes lensGlint {
          0%, 15% { opacity: 0; transform: scale(0) rotate(0deg); }
          30% { opacity: 1; transform: scale(1.2) rotate(45deg); }
          50% { opacity: 0; transform: scale(0.4) rotate(90deg); }
          100% { opacity: 0; }
        }
        .animate-lens-glint { animation: lensGlint 0.3s ease-out forwards; }

        @keyframes fadeThrough {
          0% { opacity: 0; transform: scale(0.995); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-through { animation: fadeThrough 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {bootStage !== 'complete' && (
        <div className="fixed inset-0 z-[1000000] pointer-events-none flex items-center justify-center overflow-hidden bg-transparent">
          <div className="absolute inset-0 w-full h-full">
            <div className={`absolute inset-0 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${bootStage === 'fracture' ? '-translate-x-full -translate-y-full opacity-0' : 'translate-x-0 translate-y-0 opacity-100'} ${bootStage === 'fracture' ? 'animate-edge-glow' : ''}`}>
               <div className="absolute inset-0 bg-background" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
            </div>
            <div className={`absolute inset-0 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${bootStage === 'fracture' ? 'translate-x-full translate-y-full opacity-0' : 'translate-x-0 translate-y-0 opacity-100'} ${bootStage === 'fracture' ? 'animate-edge-glow' : ''}`}>
               <div className="absolute inset-0 bg-background" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
            </div>
          </div>
          {(bootStage === 'strike' || bootStage === 'fracture') && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-12 h-12 bg-white rounded-full blur-[4px] animate-lens-glint z-40" />
              <div className="w-[160vw] h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_25px_4px_var(--primary)] animate-master-slash rounded-full z-40" />
              <div className="absolute w-[35vw] h-[1.5px] bg-primary shadow-[0_0_12px_var(--primary)] animate-spark-1 z-30" />
              <div className="absolute w-[25vw] h-[1px] bg-white shadow-[0_0_12px_var(--primary)] animate-spark-2 z-30" />
            </div>
          )}
          <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${bootStage === 'loading' ? 'opacity-100 scale-100 blur-none' : 'opacity-0 scale-95 blur-sm'}`}>
            <div className="relative flex items-center justify-center mb-6">
               <div className="absolute w-24 h-24 bg-primary rounded-full blur-[40px] opacity-30 animate-pulse"></div>
               <div className="w-16 h-16 bg-card rounded-[16px] border border-border flex items-center justify-center shadow-xl relative z-10">
                 <Hash className="w-8 h-8 text-primary" />
               </div>
            </div>
            <h3 className="text-foreground font-extrabold text-[18px] tracking-tight mb-1">ASTD Value List</h3>
            <p className="text-muted-foreground text-[12px] font-medium uppercase tracking-widest mb-6 animate-pulse">Starting Engine...</p>
            <div className="w-48 h-[3px] bg-popover rounded-full overflow-hidden border border-border relative">
              <div className="absolute top-0 bottom-0 left-0 bg-primary rounded-full animate-loading-bar shadow-[0_0_8px_var(--primary)]"></div>
            </div>
          </div>
        </div>
      )}

      <div 
        className="flex h-dvh overflow-hidden relative bg-transparent text-foreground" 
        style={{ 
          transform: bootStage === 'complete' ? 'none' : (bootStage === 'fracture' ? 'scale(1)' : 'scale(1.05)'),
          filter: bootStage === 'complete' ? 'none' : (bootStage === 'fracture' ? 'blur(0px)' : 'blur(8px)'),
          transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1), filter 0.7s cubic-bezier(0.16,1,0.3,1)'
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Suspense fallback={null}>
          <WelcomeModal />
          <HistoryModal />
          <AquaGuideOverlay guideState={guideState} onEndGuide={endGuide} />
          <MiniProfilePopout />

          {isRosterOpen && <div className="md:hidden fixed inset-0 bg-black/60 z-40 animate-fade-in" onClick={() => setIsRosterOpen(false)} />}

          <div 
            className={`fixed bottom-[140px] md:bottom-8 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col gap-2 items-center ${guideState.type ? 'z-[100002]' : 'z-[9999]'}`}
          >
            {academyToast && (
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-[8px] shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-primary/30 bg-[#1E1F22] animate-slide-up">
                 <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-primary shadow-sm">
                   <GraduationCap className="w-4 h-4 text-white" />
                 </div>
                 <span className="text-foreground text-[13.5px] font-medium tracking-wide whitespace-nowrap">
                   Academy Task Complete! <strong className="font-black text-primary">({academyToast.step}/4)</strong>
                 </span>
              </div>
            )}

            <div className={`transition-all duration-300 ${toast ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-90"}`}>
              {toast && (
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-[8px] shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-border bg-[#1E1F22]">
                   <div className="w-6 h-6 rounded-[4px] flex items-center justify-center flex-shrink-0 bg-[#23a559] shadow-sm">
                     <Check className="w-4 h-4 text-white" />
                   </div>
                   <span className="text-foreground text-[13.5px] font-medium tracking-wide whitespace-nowrap">
                     Added <strong className="font-black text-white">{toast.unitName}</strong>
                     {toast.count > 1 && <span className="text-muted-foreground ml-1 font-bold">({toast.count - 1} more)</span>}
                     {" "}to {toast.type === "give" ? "Give" : "Get"}
                   </span>
                </div>
              )}
            </div>
          </div>

          <div 
            className={`fixed md:relative top-0 bottom-0 left-0 flex-shrink-0 overflow-hidden transition-all duration-300 ease-out shadow-2xl md:shadow-none will-change-[width,transform] bg-card ${isRosterOpen ? 'w-[85vw] max-w-[320px] md:w-[240px] translate-x-0' : 'w-0 -translate-x-full md:translate-x-0'} ${sidebarZ}`}
            style={{ opacity: isRosterOpen ? 1 : 0 }}
          >
            <div className="w-[85vw] max-w-[320px] md:w-[240px] h-full">
              <Sidebar activeChannel={activeChannel} setActiveChannel={handleChannelChange} onThreadClick={handleThreadClick} guideState={guideState} />
            </div>
          </div>

          <div className={`flex-1 flex flex-col min-w-0 bg-transparent md:pb-0 pb-[84px] ${mainContentZ}`}>
            <div className={`relative ${calcHeaderZ}`}>
              <SyncBanner />
              <TopBar 
                calcHeaderZ={calcHeaderZ}
                isRosterOpen={isRosterOpen}
                setIsRosterOpen={setIsRosterOpen}
                currentChannelInfo={currentChannelInfo}
                startGuide={(type) => startGuide(type, true)}
                handleToggleAnalyzer={handleToggleAnalyzer}
                isAnalyzerOpen={isAnalyzerOpen}
                isMainStep3={isMainStep3}
                activeItemsCount={activeItemsCount}
                isDictionaryActive={isDictionaryActive}
              />
            </div>

            <div key={activeChannel} className="flex-1 flex flex-col overflow-hidden relative animate-fade-through h-full">
              {activeChannel === "home" ? ( <HomeChannel guideState={guideState} />
              ) : activeChannel === "tutorial" ? ( 
                <TutorialChannel 
                  startGuide={startGuide}
                  completedGuides={completedGuides}
                  activeTab={tutorialTab}
                  setActiveTab={setTutorialTab}
                /> 
              ) : activeChannel === "value-list" ? ( 
                <MainCanvas 
                  activeTierFilter={activeTierFilter} 
                  setActiveTierFilter={setActiveTierFilter} 
                  searchQuery={globalSearchQuery} 
                  setSearchQuery={setGlobalSearchQuery} 
                  scrollToSection={scrollToSection}
                  startGuide={startGuide}
                  guideState={guideState}
                  isMobile={isMobile}
                />
              ) : activeChannel === "inventory" ? ( <InventoryChannel />
              ) : activeChannel === "profile" ? ( <ProfileChannel />
              ) : activeChannel === "trading-ads" ? ( <TradingAdsChannel />
              ) : activeChannel === "extra-notices" ? ( <ExtraNoticesChannel />
              ) : activeChannel === "terms-of-service" ? ( <LegalChannel type="tos" />
              ) : activeChannel === "privacy-policy" ? ( <LegalChannel type="privacy" />
              ) : activeChannel === "admin-panel" ? ( <AdminChannel /> 
              ) : (
                <div className="flex-1 flex items-center justify-center bg-background px-4">
                   <div className="text-center"><h2 className="text-2xl font-bold text-foreground mb-2 capitalize">Welcome to {activeChannel}</h2><p className="text-muted-foreground">This channel is currently under construction.</p></div>
                </div>
              )}
            </div>
          </div>

          <TradeAnalyzerPanel 
            isOpen={isAnalyzerOpen}
            onClose={() => setIsAnalyzerOpen(false)}
            guideState={guideState}
            startGuide={startGuide}
            analyzerZ={analyzerZ}
          />

        </Suspense>
      </div>
    </>
  );
}