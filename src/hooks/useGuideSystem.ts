import { useState, useCallback, useEffect } from 'react';
import { useStickyState } from './useStickyState';

export type GuideType = "main" | "academy_grad" | null;

export function useGuideSystem({ 
  setIsRosterOpen, 
  bootStage 
}: any) {
  const [guideState, setGuideState] = useState<{ type: GuideType; step: number }>({ type: null, step: 0 });

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
    if (!force && type && completedGuides[type as string]) return;
    setGuideState({ type, step: 1 });
    if (type === "main" && window.innerWidth < 768) {
      setIsRosterOpen(true);
    }
  }, [completedGuides, setIsRosterOpen]);

  const endGuide = useCallback(() => {
    if (guideState.type) {
      setCompletedGuides((prev: any) => ({ ...prev, [guideState.type as string]: true }));
    }
    setGuideState({ type: null, step: 0 });
  }, [guideState.type, setCompletedGuides]);

  return { guideState, setGuideState, completedGuides, setCompletedGuides, startGuide, endGuide };
}