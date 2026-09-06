import { useState, useEffect, Suspense, lazy, useRef, useCallback } from "react";
import { Hash, Calculator, Check } from "lucide-react";
import { FilterKey, PopupUnit } from "../types";
import { useStickyState, isBoolean, isNonEmptyString } from "../hooks/useStickyState";
import { AquaGuideOverlay, GuideType } from "./components/guides/AquaGuideOverlay";
import { TopBar } from "./components/layout/TopBar";
import { WelcomeModal } from "./components/WelcomeModal";
import { useTradeStore } from "../store/useTradeStore";
import { HistoryModal } from "./components/MainCanvas/HistoryModal";

const TradeAnalyzerPanel = lazy(() => import("./components/TradeAnalyzer").then(module => ({ default: module.TradeAnalyzerPanel })));
const Sidebar = lazy(() => import("./components/Sidebar").then(module => ({ default: module.Sidebar })));
const MainCanvas = lazy(() => import("./components/MainCanvas").then(module => ({ default: module.MainCanvas })));
const HomeChannel = lazy(() => import("./components/HomeChannel").then(module => ({ default: module.HomeChannel })));
const TutorialChannel = lazy(() => import("./components/TutorialChannel").then(module => ({ default: module.TutorialChannel })));

const ExtraNoticesChannel = lazy(() => import("./components/ExtraNoticesChannel").then(module => ({ default: module.ExtraNoticesChannel })));
const LegalChannel = lazy(() => import("./components/LegalChannel").then(module => ({ default: module.LegalChannel })));

const CHANNEL_INFO: Record<string, { title: string; subtitle: string }> = {
  "home": { title: "home", subtitle: "Welcome to the ASTD Value List! Important information and update logs are posted here." },
  "value-list": { title: "value-list", subtitle: "ASTD unit values • Being Observed Live by Fire Zio" },
  "tutorial": { title: "tutorial", subtitle: "Learn how to use the ASTD trading calculator and value list." },
  "extra-notices": { title: "extra-notices", subtitle: "Additional rules, exceptions, and community notes." },
  "terms-of-service": { title: "terms-of-service", subtitle: "Rules and guidelines for using the ASTD Value List." },
  "privacy-policy": { title: "privacy-policy", subtitle: "How we handle and protect your data." }
};

type BootStage = 'loading' | 'tension' | 'strike' | 'fracture' | 'complete';

export default function App() {
  const [bootStage, setBootStage] = useState<BootStage>('loading');
  const [guideState, setGuideState] = useState<{ type: GuideType; step: number }>({ type: null, step: 0 });
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);

  const giveItems = useTradeStore((s) => s.giveItems);
  const getItems = useTradeStore((s) => s.getItems);

  const [activeChannel, setActiveChannel] = useStickyState("home", "astd_channel", isNonEmptyString);
  const [tutorialTab, setTutorialTab] = useState<"sandbox" | "simulator" | "theory" | "dictionary">("sandbox");
  const [activeTierFilter, setActiveTierFilter] = useStickyState<FilterKey>("S", "astd_tier");

  const [completedGuides, setCompletedGuides] = useStickyState<Record<string, boolean>>(
    {}, 
    "astd_completed_guides", 
    (v): v is Record<string, boolean> => typeof v === "object" && v !== null
  );

  const [scrollToSection, setScrollToSection] = useState<{ tier: string; sectionId: string } | null>(null);
  const [isRosterOpen, setIsRosterOpen] = useStickyState(window.innerWidth >= 768, "astd_roster", isBoolean);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useStickyState(false, "astd_analyzer", isBoolean);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const [toast, setToast] = useState<{ id: number; unitName: string; type: "give" | "get" } | null>(null);
  const activeItemsCount = giveItems.reduce((acc, c) => acc + c.qty, 0) + getItems.reduce((acc, c) => acc + c.qty, 0);

  const isDictionaryActive = activeChannel === "tutorial" && tutorialTab === "dictionary";

  useEffect(() => {
    if (globalSearchQuery.trim().length > 0) {
      if (activeChannel !== "value-list") {
        setActiveChannel("value-list");
      }
      if (activeTierFilter !== "All") {
        setActiveTierFilter("All");
      }
      if (window.innerWidth < 768 && isRosterOpen) {
        setIsRosterOpen(false);
      }
    }
  }, [globalSearchQuery, activeChannel, activeTierFilter, setActiveChannel, setActiveTierFilter, isRosterOpen, setIsRosterOpen]);

  // Cinematic Boot Sequence orchestration (Refined Iaijutsu Timing)
  useEffect(() => {
    Promise.all([
      import("./components/TradeAnalyzer"),
      import("./components/Sidebar"),
      import("./components/MainCanvas"),
      import("./components/HomeChannel"),
      import("./components/TutorialChannel"),
      import("./components/ExtraNoticesChannel"),
      import("./components/LegalChannel")
    ]).then(() => {
      setTimeout(() => {
        setBootStage('tension'); // Vignette dims, focus narrows
        setTimeout(() => {
          setBootStage('strike'); // The blade draws and snaps across cleanly
          setTimeout(() => {
            setBootStage('fracture'); // Halves slide apart with cooling plasma edges
            setTimeout(() => {
              setBootStage('complete'); 
            }, 900);
          }, 200); // 200ms strike frame
        }, 900); // 900ms anticipation
      }, 700); // Initial load hold
    }).catch(() => setBootStage('complete'));
  }, []);

  useEffect(() => {
    if (bootStage !== 'complete') return;

    const timer = setTimeout(() => {
      if (localStorage.getItem("astd_welcome_acknowledged") !== "true") {
        window.dispatchEvent(new Event("open-welcome-modal"));
      } else if (!completedGuides["main"]) {
        setGuideState({ type: "main", step: 1 });
        if (window.innerWidth < 768) setIsRosterOpen(true);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [setIsRosterOpen, completedGuides, bootStage]);

  useEffect(() => {
    const handleSetTab = (e: Event) => {
      setTutorialTab((e as CustomEvent).detail);
    };
    const handleAcademyEvent = (e: Event) => {
      if (e.type === "academy-used-parser") setCompletedGuides(p => ({ ...p, hasUsedParser: true }));
      if (e.type === "academy-used-filter") setCompletedGuides(p => ({ ...p, hasFiltered: true }));
    };
    const handleWelcomeClosed = () => {
      if (!completedGuides["main"]) {
        setGuideState({ type: "main", step: 1 });
        if (window.innerWidth < 768) setIsRosterOpen(true);
      }
    };
    
    window.addEventListener("set-tutorial-tab", handleSetTab);
    window.addEventListener("academy-used-parser", handleAcademyEvent);
    window.addEventListener("academy-used-filter", handleAcademyEvent);
    window.addEventListener("welcome-closed", handleWelcomeClosed);
    
    return () => {
      window.removeEventListener("set-tutorial-tab", handleSetTab);
      window.removeEventListener("academy-used-parser", handleAcademyEvent);
      window.removeEventListener("academy-used-filter", handleAcademyEvent);
      window.removeEventListener("welcome-closed", handleWelcomeClosed);
    };
  }, [setCompletedGuides, completedGuides]);

  useEffect(() => {
    const handleTradeAdded = (e: Event) => {
      const customEvent = e as CustomEvent<{ name: string; type: "give" | "get" }>;
      if (!customEvent.detail) return;
      setToast({ id: Date.now(), unitName: customEvent.detail.name, type: customEvent.detail.type });
      setGuideState(prev => (prev.type === "main" && prev.step === 2) ? { ...prev, step: 3 } : prev);
    };

    const handleNavigate = (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      if (target) {
        setActiveChannel(target);
        if (window.innerWidth < 768) setIsRosterOpen(false);
      }
    };

    window.addEventListener("trade-added", handleTradeAdded);
    window.document.addEventListener("navigate", handleNavigate);

    return () => {
      window.removeEventListener("trade-added", handleTradeAdded);
      window.document.removeEventListener("navigate", handleNavigate);
    };
  }, [setActiveChannel, setIsRosterOpen]);

  const startGuide = useCallback((type: GuideType, force: boolean = false) => {
    if (!force && type && completedGuides[type]) return;

    setHelpMenuOpen(false);
    setGuideState({ type, step: 1 });

    if (type === "developer") setActiveChannel("home");
    else if (type === "channels" || type === "main") {
      if (window.innerWidth < 768) setIsRosterOpen(true);
    } 
    else if (type === "advanced" || type === "management") {
      setActiveChannel("tutorial");
      setTutorialTab("sandbox");
      if (type === "advanced") setIsAnalyzerOpen(true);
    } else if (type === "filters" || type === "stats") {
      setActiveChannel("tutorial");
      setTutorialTab("theory");
    } else if (type === "dictionary") {
      setActiveChannel("tutorial");
      setTutorialTab("dictionary");
      setIsAnalyzerOpen(true);
    }
  }, [completedGuides, setActiveChannel, setIsAnalyzerOpen, setIsRosterOpen, setTutorialTab]);

  const endGuide = useCallback(() => {
    if (guideState.type) {
      setCompletedGuides(prev => ({ ...prev, [guideState.type as string]: true }));
    }
    setGuideState({ type: null, step: 0 });
  }, [guideState.type, setCompletedGuides]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsRosterOpen(false);
      setIsAnalyzerOpen(false);
    }
  }, [setIsRosterOpen, setIsAnalyzerOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    
    const edgeWidth = 40;
    const isLeftEdge = x <= edgeWidth;
    const isRightEdge = x >= window.innerWidth - edgeWidth;
    
    if (isLeftEdge || isRightEdge || isRosterOpen || isAnalyzerOpen) {
      touchStartPos.current = { x, y };
    } else {
      touchStartPos.current = null;
    }
  }, [isRosterOpen, isAnalyzerOpen]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const dx = e.changedTouches[0].clientX - touchStartPos.current.x;
    const dy = e.changedTouches[0].clientY - touchStartPos.current.y;
    
    if (Math.abs(dy) > Math.abs(dx) * 0.6) {
      touchStartPos.current = null;
      return;
    }

    if (dx > 90) {
      if (isAnalyzerOpen) setIsAnalyzerOpen(false);
      else if (!isRosterOpen && window.innerWidth < 768) setIsRosterOpen(true);
    } else if (dx < -90) {
      if (isRosterOpen) setIsRosterOpen(false);
      else if (!isAnalyzerOpen && window.innerWidth < 768) setIsAnalyzerOpen(true);
    }
    touchStartPos.current = null;
  }, [isAnalyzerOpen, isRosterOpen, setIsAnalyzerOpen, setIsRosterOpen]);

  const handleChannelChange = useCallback((id: string) => {
    setActiveChannel(id);
    if (id === "value-list" && guideState.type === "main" && guideState.step === 1) {
      setGuideState(prev => ({ ...prev, step: 2 }));
      if (window.innerWidth < 768) setIsRosterOpen(false);
    }
  }, [setActiveChannel, guideState, setIsRosterOpen]);

  const handleThreadClick = useCallback((tier: FilterKey, sectionId: string) => {
    setActiveChannel("value-list");
    setActiveTierFilter(tier); 
    setGlobalSearchQuery(""); 
    if (window.innerWidth < 768) setIsRosterOpen(false);
    setScrollToSection({ tier, sectionId });
    setTimeout(() => setScrollToSection(null), 400);
  }, [setActiveChannel, setActiveTierFilter, setIsRosterOpen]);

  const handleAddGive = useCallback((unit: PopupUnit) => {
    useTradeStore.getState().addCard("give", { ...unit, qty: 1 });
    window.dispatchEvent(new CustomEvent("trade-added", { detail: { name: unit.name, type: "give" } }));
  }, []);

  const handleAddGet = useCallback((unit: PopupUnit) => {
    useTradeStore.getState().addCard("get", { ...unit, qty: 1 });
    window.dispatchEvent(new CustomEvent("trade-added", { detail: { name: unit.name, type: "get" } }));
  }, []);

  const handleToggleAnalyzer = useCallback(() => {
    setIsAnalyzerOpen(prev => !prev);
    if (guideState.type === "main" && guideState.step === 3) setGuideState(prev => ({ ...prev, step: 4 }));
  }, [setIsAnalyzerOpen, guideState]);

  const currentChannelInfo = CHANNEL_INFO[activeChannel] || { title: activeChannel, subtitle: "" };

  const isMainStep1 = guideState.type === "main" && guideState.step === 1;
  const isMainStep2 = guideState.type === "main" && guideState.step === 2;
  const isMainStep3 = guideState.type === "main" && guideState.step === 3;
  const isMainStep4 = guideState.type === "main" && guideState.step === 4;

  const sidebarZ = isMainStep1 || guideState.type === "channels" ? "!z-[100000] shadow-[15px_0_50px_rgba(0,0,0,0.8)]" : "z-50";
  const mainContentZ = isMainStep2 || guideState.type === "developer" || guideState.type === "filters" || guideState.type === "stats" ? "!z-[100000] relative shadow-[0_0_50px_rgba(0,0,0,0.8)]" : "";
  const calcHeaderZ = helpMenuOpen || isMainStep3 ? "!z-[99999] shadow-[0_0_50px_rgba(0,0,0,0.8)]" : "z-50";
  const analyzerZ = isMainStep4 || guideState.type === "advanced" || guideState.type === "dictionary" || guideState.type === "management" ? "!z-[100000] shadow-[-20px_0_50px_rgba(0,0,0,0.8)]" : "z-50";

  return (
    <>
      <style>{`
        @keyframes loadingBarProgress { 0% { transform: translateX(-100%); width: 30%; } 50% { transform: translateX(100%); width: 50%; } 100% { transform: translateX(350%); width: 30%; } }
        .animate-loading-bar { animation: loadingBarProgress 1.5s infinite ease-in-out; }

        @keyframes masterSlash { 
          0% { transform: scaleX(0) rotate(-45deg); opacity: 0; } 
          20% { transform: scaleX(0.15) rotate(-45deg); opacity: 1; } 
          50% { transform: scaleX(1.1) rotate(-45deg); opacity: 1; filter: drop-shadow(0 0 16px #01EFFD); } 
          100% { transform: scaleX(1.4) rotate(-45deg); opacity: 0; filter: drop-shadow(0 0 8px #5865F2); } 
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
          0% { box-shadow: inset 0 0 40px rgba(1, 239, 253, 0.7), inset 0 0 15px rgba(88, 101, 242, 0.5); }
          100% { box-shadow: inset 0 0 0px rgba(1, 239, 253, 0), inset 0 0 0px rgba(88, 101, 242, 0); }
        }
        .animate-edge-glow { animation: edgeGlow 0.8s ease-out forwards; }

        @keyframes lensGlint {
          0%, 15% { opacity: 0; transform: scale(0) rotate(0deg); }
          30% { opacity: 1; transform: scale(1.2) rotate(45deg); }
          50% { opacity: 0; transform: scale(0.4) rotate(90deg); }
          100% { opacity: 0; }
        }
        .animate-lens-glint { animation: lensGlint 0.3s ease-out forwards; }

        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-6deg) scale(1.05); }
          50% { transform: rotate(6deg) scale(1.05); }
          75% { transform: rotate(-6deg) scale(1.05); }
        }
        .animate-wiggle { animation: wiggle 0.4s ease-in-out infinite; }

        @keyframes fadeThrough {
          0% { opacity: 0; transform: scale(0.995); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-through { animation: fadeThrough 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {bootStage !== 'complete' && (
        <div className="fixed inset-0 z-[1000000] pointer-events-none flex items-center justify-center overflow-hidden bg-transparent">
          
          <div className="absolute inset-0 w-full h-full">
            {/* Top Left Fracture Half */}
            <div 
              className={`absolute inset-0 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${bootStage === 'fracture' ? '-translate-x-full -translate-y-full opacity-0' : 'translate-x-0 translate-y-0 opacity-100'} ${bootStage === 'fracture' ? 'animate-edge-glow' : ''}`}
            >
               <div className="absolute inset-0 bg-[#313338]" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
            </div>
            
            {/* Bottom Right Fracture Half */}
            <div 
              className={`absolute inset-0 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${bootStage === 'fracture' ? 'translate-x-full translate-y-full opacity-0' : 'translate-x-0 translate-y-0 opacity-100'} ${bootStage === 'fracture' ? 'animate-edge-glow' : ''}`}
            >
               <div className="absolute inset-0 bg-[#313338]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
            </div>
          </div>

          {(bootStage === 'strike' || bootStage === 'fracture') && (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Pre-strike lens glint at origin */}
              <div className="absolute w-12 h-12 bg-white rounded-full blur-[4px] animate-lens-glint z-40" />
              {/* Master blade slice */}
              <div className="w-[160vw] h-[2px] bg-gradient-to-r from-transparent via-[#01EFFD] to-transparent shadow-[0_0_25px_4px_#5865F2] animate-master-slash rounded-full z-40" />
              {/* Perpendicular sparks */}
              <div className="absolute w-[35vw] h-[1.5px] bg-[#01EFFD] shadow-[0_0_12px_#5865F2] animate-spark-1 z-30" />
              <div className="absolute w-[25vw] h-[1px] bg-white shadow-[0_0_12px_#5865F2] animate-spark-2 z-30" />
            </div>
          )}

          <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${bootStage === 'loading' ? 'opacity-100 scale-100 blur-none' : 'opacity-0 scale-95 blur-sm'}`}>
            <div className="relative flex items-center justify-center mb-6">
               <div className="absolute w-24 h-24 bg-[#5865F2] rounded-full blur-[40px] opacity-30 animate-pulse"></div>
               <div className="w-16 h-16 bg-[#2B2D31] rounded-[16px] border border-[rgba(255,255,255,0.06)] flex items-center justify-center shadow-xl relative z-10">
                 <Hash className="w-8 h-8 text-[#5865F2]" />
               </div>
            </div>
            <h3 className="text-[#F2F3F5] font-extrabold text-[18px] tracking-tight mb-1">ASTD Value List</h3>
            <p className="text-[#949BA4] text-[12px] font-medium uppercase tracking-widest mb-6 animate-pulse">Starting Engine...</p>
            <div className="w-48 h-[3px] bg-[#1E1F22] rounded-full overflow-hidden border border-[rgba(255,255,255,0.02)] relative">
              <div className="absolute top-0 bottom-0 left-0 bg-[#5865F2] rounded-full animate-loading-bar shadow-[0_0_8px_rgba(88,101,242,0.8)]"></div>
            </div>
          </div>
        </div>
      )}

      <div 
        className="flex h-screen overflow-hidden relative" 
        style={{ 
          background: "#313338", 
          fontFamily: "'Inter', sans-serif", 
          color: "#F2F3F5",
          transform: bootStage === 'complete' ? 'none' : (bootStage === 'fracture' ? 'scale(1)' : 'scale(1.05)'),
          filter: bootStage === 'complete' ? 'none' : (bootStage === 'fracture' ? 'blur(0px)' : 'blur(8px)'),
          transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1), filter 0.7s cubic-bezier(0.16,1,0.3,1)'
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Suspense fallback={null}>

          <WelcomeModal />
          <HistoryModal /> {/* <-- ADD IT HERE */}
          
          <AquaGuideOverlay guideState={guideState} onEndGuide={endGuide} />

          {isRosterOpen && <div className="md:hidden fixed inset-0 bg-black/60 z-40 animate-fade-in" onClick={() => setIsRosterOpen(false)} />}
          {isAnalyzerOpen && <div className="md:hidden fixed inset-0 bg-black/60 z-40 animate-fade-in" onClick={() => setIsAnalyzerOpen(false)} />}

          <div 
            className={`fixed bottom-[100px] md:bottom-8 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${guideState.type ? 'z-[100002]' : 'z-[9999]'} ${
              toast ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-90"
            }`}
          >
            {toast && (
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-[rgba(255,255,255,0.1)] bg-[#2B2D31]/95 backdrop-blur-md">
                 <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-[#23a559] shadow-sm">
                   <Check className="w-4 h-4 text-white" />
                 </div>
                 <span className="text-[#F2F3F5] text-[13.5px] font-medium tracking-wide whitespace-nowrap">
                   Added <strong className="font-black text-white">{toast.unitName}</strong> to {toast.type === "give" ? "Give" : "Get"}
                 </span>
              </div>
            )}
          </div>

          <div 
            className={`fixed md:relative top-0 bottom-0 left-0 flex-shrink-0 overflow-hidden transition-all duration-300 ease-out shadow-2xl md:shadow-none will-change-[width,transform] ${isRosterOpen ? 'w-[85vw] max-w-[320px] md:w-[240px] translate-x-0' : 'w-0 -translate-x-full md:translate-x-0'} ${sidebarZ}`}
            style={{ opacity: isRosterOpen ? 1 : 0 }}
          >
            <div className="w-[85vw] max-w-[320px] md:w-[240px] h-full">
              <Sidebar activeChannel={activeChannel} setActiveChannel={handleChannelChange} onThreadClick={handleThreadClick} guideState={guideState} />
            </div>
          </div>

          <div className={`flex-1 flex flex-col min-w-0 bg-[#313338] ${mainContentZ}`}>

            <TopBar 
              calcHeaderZ={calcHeaderZ}
              isRosterOpen={isRosterOpen}
              setIsRosterOpen={setIsRosterOpen}
              currentChannelInfo={currentChannelInfo}
              helpMenuOpen={helpMenuOpen}
              setHelpMenuOpen={setHelpMenuOpen}
              startGuide={(type) => startGuide(type, true)}
              globalSearchQuery={globalSearchQuery}
              setGlobalSearchQuery={setGlobalSearchQuery}
              handleToggleAnalyzer={handleToggleAnalyzer}
              isAnalyzerOpen={isAnalyzerOpen}
              isMainStep3={isMainStep3}
              activeItemsCount={activeItemsCount}
              isDictionaryActive={isDictionaryActive}
            />

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
                />
              ) : activeChannel === "extra-notices" ? ( <ExtraNoticesChannel />
              ) : activeChannel === "terms-of-service" ? ( <LegalChannel type="tos" />
              ) : activeChannel === "privacy-policy" ? ( <LegalChannel type="privacy" />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-[#313338] px-4">
                   <div className="text-center"><h2 className="text-2xl font-bold text-[#F2F3F5] mb-2 capitalize">Welcome to {activeChannel}</h2><p className="text-[#949BA4]">This channel is currently under construction.</p></div>
                </div>
              )}
            </div>
          </div>

          {!isAnalyzerOpen && (
            <button
              onClick={handleToggleAnalyzer}
              className={`md:hidden fixed bottom-6 right-6 z-40 bg-[#5865F2] hover:bg-[#4752C4] text-white p-3.5 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                isMainStep3 || (isDictionaryActive && !isAnalyzerOpen) ? '!z-[99999] animate-pulse ring-4 ring-[#5865F2]/60 shadow-[0_0_30px_rgba(88,101,242,0.8)]' : 'z-40 shadow-[0_4px_20px_rgba(88,101,242,0.5)]'
              }`}
              title="Open Calculator"
            >
              <Calculator className="w-6 h-6" />
              {activeItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ed4245] text-white font-mono font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {activeItemsCount}
                </span>
              )}
            </button>
          )}

          <div 
            className={`fixed md:relative top-0 bottom-0 right-0 flex-shrink-0 overflow-hidden transition-all duration-300 ease-out shadow-2xl md:shadow-none will-change-[width,transform] ${isAnalyzerOpen ? 'w-[90vw] max-w-[400px] md:w-[400px] translate-x-0 pointer-events-auto' : 'w-0 translate-x-full md:translate-x-0 pointer-events-none'} ${analyzerZ}`}
            style={{ opacity: isAnalyzerOpen ? 1 : 0 }}
          >
            <div className="w-[90vw] max-w-[400px] md:w-[400px] h-full bg-[#2B2D31]">
              <TradeAnalyzerPanel 
                isOpen={isAnalyzerOpen}
                onClose={() => setIsAnalyzerOpen(false)}
                guideState={guideState}
                startGuide={startGuide}
                isDictionaryActive={isDictionaryActive}
              />
            </div>
          </div>
        </Suspense>
      </div>
    </>
  );
}