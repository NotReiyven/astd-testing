import { useState, useCallback, useEffect } from 'react';
import { useStickyState } from './useStickyState';
import { GuideType } from '../app/components/guides/AquaGuideOverlay';

export function useGuideSystem({ 
  setActiveChannel, 
  setIsRosterOpen, 
  setIsAnalyzerOpen, 
  setTutorialTab, 
  bootStage 
}: any) {
  const [guideState, setGuideState] = useState<{ type: GuideType; step: number }>({ type: null, step: 0 });
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  
  const [completedGuides, setCompletedGuides] = useStickyState<Record<string, boolean>>(
    {}, 
    "astd_completed_guides", 
    (v): v is Record<string, boolean> => typeof v === "object" && v !== null
  );

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
    if (guideState.type) setCompletedGuides((prev: any) => ({ ...prev, [guideState.type as string]: true }));
    setGuideState({ type: null, step: 0 });
  }, [guideState.type, setCompletedGuides]);

  return { guideState, setGuideState, helpMenuOpen, setHelpMenuOpen, completedGuides, setCompletedGuides, startGuide, endGuide };
}