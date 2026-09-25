import { useCallback, useEffect, useRef } from "react";
import { useStickyState } from "./useStickyState";
import { useAuthStore } from "../store/useAuthStore";

export type GuideType = "guest_tour" | "auth_tour" | "academy_grad" | null;

interface UseGuideSystemProps {
  setActiveChannel: (channel: string) => void;
  setIsRosterOpen: (open: boolean) => void;
  setIsAnalyzerOpen: (open: boolean) => void;
  setTutorialTab: (
    tab: "sandbox" | "simulator" | "theory" | "dictionary"
  ) => void;
  bootStage: string;
}

export function useGuideSystem({
  setActiveChannel,
  setIsRosterOpen,
  setIsAnalyzerOpen,
  setTutorialTab,
  bootStage,
}: UseGuideSystemProps) {
  const { profile } = useAuthStore();
  const hasTriggeredAuthTour = useRef(false);

  // Persist the active guide state so it survives page refreshes
  const [guideState, setGuideState] = useStickyState<{
    type: GuideType;
    step: number;
  }>(
    { type: null, step: 0 },
    "astd_active_guide",
    (v): v is { type: GuideType; step: number } =>
      typeof v === "object" && v !== null && "step" in v
  );

  const [completedGuides, setCompletedGuides] = useStickyState<
    Record<string, boolean>
  >(
    {},
    "astd_completed_guides",
    (v): v is Record<string, boolean> => typeof v === "object" && v !== null
  );

  // Initial Boot: Check if Welcome Wizard needs to open
  useEffect(() => {
    if (bootStage !== "complete") return;

    const timer = setTimeout(() => {
      const isAcknowledged =
        localStorage.getItem("astd_welcome_acknowledged") === "true";
      if (!isAcknowledged) {
        window.dispatchEvent(new Event("open-welcome-modal"));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [bootStage]);

  // First-Time Login Detector (Triggers Auth Tour)
  useEffect(() => {
    if (bootStage !== "complete" || !profile || hasTriggeredAuthTour.current)
      return;

    if (!completedGuides["auth_tour"]) {
      hasTriggeredAuthTour.current = true;
      const timer = setTimeout(() => {
        setGuideState({ type: "auth_tour", step: 1 });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [profile, completedGuides, bootStage, setGuideState]);

  const startGuide = useCallback(
    (type: GuideType, force: boolean = false) => {
      if (!type) return;
      if (!force && completedGuides[type]) return;

      setGuideState({ type, step: 1 });

      // Auto-navigate to relevant starting context
      if (type === "guest_tour") {
        setActiveChannel("value-list");
      } else if (type === "auth_tour") {
        setActiveChannel("inventory");
      }
    },
    [completedGuides, setActiveChannel, setGuideState]
  );

  const nextStep = useCallback(
    (maxSteps: number) => {
      setGuideState((prev) => {
        if (!prev.type) return prev;
        if (prev.step >= maxSteps) {
          setCompletedGuides((c) => ({ ...c, [prev.type as string]: true }));
          return { type: null, step: 0 };
        }
        return { ...prev, step: prev.step + 1 };
      });
    },
    [setCompletedGuides, setGuideState]
  );

  const prevStep = useCallback(() => {
    setGuideState((prev) => {
      if (!prev.type || prev.step <= 1) return prev;
      return { ...prev, step: prev.step - 1 };
    });
  }, [setGuideState]);

  const endGuide = useCallback(() => {
    if (guideState.type) {
      setCompletedGuides((prev) => ({
        ...prev,
        [guideState.type as string]: true,
      }));
    }
    setGuideState({ type: null, step: 0 });
  }, [guideState.type, setCompletedGuides, setGuideState]);

  return {
    guideState,
    setGuideState,
    completedGuides,
    setCompletedGuides,
    startGuide,
    nextStep,
    prevStep,
    endGuide,
  };
}
