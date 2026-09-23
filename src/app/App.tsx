// ================================================
// FILE: src/app/App.tsx
// ================================================

import { useState, useEffect, Suspense, lazy, useCallback, useRef } from "react";
import { Hash, Check, Ban, ExternalLink } from "lucide-react";
import { FilterKey } from "../types";
import { useStickyState, isBoolean, isNonEmptyString } from "../hooks/useStickyState";
import { AquaGuideOverlay } from "./components/guides/AquaGuideOverlay";
import { TopBar } from "./components/layout/TopBar";
import { SyncBanner } from "./components/layout/SyncBanner";
import { WelcomeModal } from "./components/WelcomeModal";
import { ExternalLinkModal } from "./components/layout/ExternalLinkModal";
import { MiniProfilePopout } from "./components/layout/MiniProfilePopout";
import { LoginRecommendationModal } from "./components/layout/LoginRecommendationModal";
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

  const { globalSearchQuery, setGlobalSearchQuery, bootChannel } = useLayoutStore();

  const [activeChannel, setActiveChannel] = useStickyState("home", "astd_channel", isNonEmptyString);
  const [tutorialTab, setTutorialTab] = useState<"sandbox" | "simulator" | "theory" | "dictionary">("sandbox");
  const [activeTierFilter, setActiveTierFilter] = useStickyState<FilterKey>("S", "astd_tier");
  const [scrollToSection, setScrollToSection] = useState<{ tier: string; sectionId: string } | null>(null);
  const [isRosterOpen, setIsRosterOpen] = useStickyState(window.innerWidth >= 768, "astd_roster", isBoolean);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useStickyState(false, "astd_analyzer", isBoolean);
  const [loginModalChannel, setLoginModalChannel] = useState<string | null>(null);

  const { bootStage, isMobile } = useAppBoot();
  const hasRoutedBootChannel = useRef(false);

  const { 
    guideState, 
    setGuideState, 
    completedGuides, 
    setCompletedGuides, 
    startGuide, 
    nextStep,
    prevStep,
    endGuide 
  } = useGuideSystem({ 
    setActiveChannel, 
    setIsRosterOpen, 
    setIsAnalyzerOpen, 
    setTutorialTab, 
    bootStage 
  });

  // Custom Boot Channel Routing
  useEffect(() => {
    if (bootStage === 'complete' && !hasRoutedBootChannel.current) {
      hasRoutedBootChannel.current = true;
      if (bootChannel !== 'last-used' && activeChannel !== bootChannel) {
        setActiveChannel(bootChannel);
      }
    }
  }, [bootStage, bootChannel, activeChannel, setActiveChannel]);

  // Trigger login recommendation modal if unauthenticated user hits inventory or trading-ads
  useEffect(() => {
    if (!profile && (activeChannel === "inventory" || activeChannel === "trading-ads")) {
      setLoginModalChannel(activeChannel);
    }
  }, [activeChannel, profile]);

  // Guest Tour listener triggered from WelcomeModal
  useEffect(() => {
    const handleStartGuest = () => {
      startGuide("guest_tour", true);
    };
    window.addEventListener("start-guest-tour", handleStartGuest);
    return () => window.removeEventListener("start-guest-tour", handleStartGuest);
  }, [startGuide]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      document.body.style.overflow = isRosterOpen ? "hidden" : "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isRosterOpen]);

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

  const { toast } = useGlobalEvents({ 
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
    if (id === "value-list" && guideState.type === "guest_tour" && guideState.step === 1) {
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
    if (guideState.type === "guest_tour" && guideState.step === 2) {
      setGuideState(prev => ({ ...prev, step: 3 }));
    }
  }, [setIsAnalyzerOpen, guideState, setGuideState]);

  const currentChannelInfo = CHANNEL_INFO[activeChannel] || { title: activeChannel, subtitle: "" };

  const isGuestStep1 = guideState.type === "guest_tour" && guideState.step === 1;
  const isGuestStep2 = guideState.type === "guest_tour" && guideState.step === 2;
  const isGuestStep3 = guideState.type === "guest_tour" && guideState.step === 3;
  const isGuestStep4 = guideState.type === "guest_tour" && guideState.step === 4;

  const sidebarZ = isGuestStep1 ? "!z-[100000] shadow-[15px_0_50px_rgba(0,0,0,0.8)] relative" : "z-50";
  const mainContentZ = isGuestStep2 ? "!z-[100000] relative shadow-[0_0_50px_rgba(0,0,0,0.8)]" : "z-auto";
  const calcHeaderZ = isGuestStep3 ? "!z-[99999] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative" : "z-50";
  const analyzerZ = isGuestStep4 ? "!z-[100000] shadow-[-20px_0_50px_rgba(0,0,0,0.8)]" : "z-50";

  if (bootStage === 'complete' && profile?.role === 'banned') {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-dvh bg-background text-foreground font-sans p-6 text-center select-none">
        <Ban className="w-20 h-20 text-destructive mb-6" />
        <h1 className="text-[28px] font-black uppercase tracking-widest text-destructive mb-2">Account Terminated</h1>
        <p className="text-muted-foreground text-[14px] max-w-md leading-relaxed mb-8">
          Your access to the ASTD Value List platform has been permanently revoked by the moderation team.
        </p>
        <div className="bg-card border border-border rounded-[4px] p-5 w-full max-w-md text-left mb-8">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Official Reason</span>
          <p className="text-[14px] text-foreground font-medium leading-relaxed italic">"{banReason}"</p>
        </div>
        <a href="https://discord.gg/Q7JTvPUEM" target="_blank" rel="noopener noreferrer" className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[13px] uppercase tracking-wider rounded-[4px] flex items-center justify-center gap-2 border border-border focus-visible:outline-none">
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
      `}</style>

      {bootStage !== 'complete' && (
        <div className="fixed inset-0 z-[1000000] pointer-events-none flex items-center justify-center overflow-hidden bg-background">
          <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ${bootStage === 'loading' ? 'opacity-100' : 'opacity-0'}`}>
            <div className="relative flex items-center justify-center mb-6">
               <div className="w-16 h-16 bg-card rounded-[8px] border border-border flex items-center justify-center shadow-sm relative z-10">
                 <Hash className="w-8 h-8 text-primary" />
               </div>
            </div>
            <h3 className="text-foreground font-black text-[18px] tracking-tight mb-1">ASTD Value List</h3>
            <p className="text-muted-foreground text-[12px] font-bold uppercase tracking-widest mb-6">Starting Engine...</p>
            <div className="w-48 h-[2px] bg-border overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 bg-primary animate-loading-bar"></div>
            </div>
          </div>
        </div>
      )}

      <div 
        className="flex h-dvh overflow-hidden relative bg-background text-foreground" 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Suspense fallback={null}>
          <WelcomeModal />
          <HistoryModal />
          <ExternalLinkModal />
          <LoginRecommendationModal 
            isOpen={!!loginModalChannel} 
            onClose={() => setLoginModalChannel(null)} 
            channelName={loginModalChannel || ""} 
          />
           
          <AquaGuideOverlay 
            guideState={guideState} 
            onNext={nextStep}
            onPrev={prevStep}
            onEndGuide={endGuide} 
            isAnalyzerOpen={isAnalyzerOpen}
          />

          <MiniProfilePopout />

          {isRosterOpen && <div className="md:hidden fixed inset-0 bg-black/80 z-40" onClick={() => setIsRosterOpen(false)} />}

          <div 
            className="fixed bottom-[140px] md:bottom-8 left-1/2 -translate-x-1/2 pointer-events-none transition-all flex flex-col gap-2 items-center z-[9999]"
          >
            <div className={`transition-all duration-150 ${toast ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}`}>
              {toast && (
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-[4px] border border-border bg-card shadow-sm">
                   <div className="w-6 h-6 rounded-[4px] flex items-center justify-center flex-shrink-0 bg-[#23a559]">
                     <Check className="w-4 h-4 text-white" />
                   </div>
                   <span className="text-foreground text-[13px] font-bold tracking-wide whitespace-nowrap">
                     Added <strong className="font-black">{toast.unitName}</strong>
                     {toast.count > 1 && <span className="text-muted-foreground ml-1">({toast.count - 1} more)</span>}
                     {" "}to {toast.type === "give" ? "Give" : "Get"}
                   </span>
                </div>
              )}
            </div>
          </div>

          <div 
            className={`fixed md:relative top-0 bottom-0 left-0 flex-shrink-0 overflow-hidden transition-transform shadow-2xl md:shadow-none bg-card z-30 ${isRosterOpen ? 'w-[85vw] max-w-[260px] md:w-[240px] translate-x-0' : 'w-0 -translate-x-full md:translate-x-0'} ${sidebarZ}`}
          >
            <div className="w-[85vw] max-w-[260px] md:w-[240px] h-full">
              <Sidebar activeChannel={activeChannel} setActiveChannel={handleChannelChange} onThreadClick={handleThreadClick} guideState={guideState} />
            </div>
          </div>

          <div className={`flex-1 flex flex-col min-w-0 bg-background md:pb-0 pb-[84px] z-10 ${mainContentZ}`}>
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
                isMainStep3={isGuestStep2}
                activeItemsCount={activeItemsCount}
                isDictionaryActive={isDictionaryActive}
              />
            </div>

            <div key={activeChannel} className="flex-1 flex flex-col overflow-hidden relative h-full">
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