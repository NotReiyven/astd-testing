import { useCallback, useEffect, useRef } from "react";
import { useStickyState } from "./useStickyState";
import { useAuthStore } from "../store/useAuthStore";
import { useTradeStore } from "../store/useTradeStore";
import { useInventoryStore } from "../store/useInventoryStore";
import { hasAcceptedCurrentLegalVersion } from "../data/legal";

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
  const giveCount = useTradeStore((s) => s.giveItems.length);
  const getCount = useTradeStore((s) => s.getItems.length);
  const pinnedCount = useTradeStore((s) => s.pinnedIds.length);
  const presetCount = useTradeStore((s) => s.presets.length);
  const vaultCount = useInventoryStore((s) => s.items.length);
  const wishlistCount = useInventoryStore((s) => s.wishlistItems.length);

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

  // App-level one-way latch for Academy checklist tasks (also latches existing live state on first load)
  useEffect(() => {
    const liveHasGiveGet = giveCount > 0 || getCount > 0;
    const liveHasPinned = pinnedCount > 0;
    const liveHasPresets = presetCount > 0;
    const liveHasLogin = Boolean(profile);
    const liveHasVault = vaultCount > 0;
    const liveHasWishlist = wishlistCount > 0;

    setCompletedGuides((prev) => {
      const updates: Record<string, boolean> = {};
      if (liveHasGiveGet && !prev.hasGiveGet) updates.hasGiveGet = true;
      if (liveHasPinned && !prev.hasPinned) updates.hasPinned = true;
      if (liveHasPresets && !prev.hasPresets) updates.hasPresets = true;
      if (liveHasLogin && !prev.hasLogin) updates.hasLogin = true;
      if (liveHasVault && !prev.hasVault) updates.hasVault = true;
      if (liveHasWishlist && !prev.hasWishlist) updates.hasWishlist = true;

      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });
  }, [
    giveCount,
    getCount,
    pinnedCount,
    presetCount,
    profile,
    vaultCount,
    wishlistCount,
    setCompletedGuides,
  ]);

  const hasTriggeredWelcome = useRef(false);

  // Initial Boot: Check if Welcome Wizard needs to open
  useEffect(() => {
    if (bootStage !== "complete" || hasTriggeredWelcome.current) return;

    const timer = setTimeout(() => {
      hasTriggeredWelcome.current = true;
      const isAcknowledged = hasAcceptedCurrentLegalVersion();
      if (!isAcknowledged) {
        window.dispatchEvent(new Event("open-welcome-modal"));
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [bootStage]);

  // First-Time Login Detector (Triggers Auth Tour)
  useEffect(() => {
    if (bootStage !== "complete" || !profile || hasTriggeredAuthTour.current)
      return;

    const isWelcomeOpen = !hasAcceptedCurrentLegalVersion();
    if (isWelcomeOpen) return;

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

  // Listen for global 'start-guest-tour' event dispatched by WelcomeModal or Academy
  useEffect(() => {
    const handleStartGuestTour = () => {
      startGuide("guest_tour", true);
    };
    window.addEventListener("start-guest-tour", handleStartGuestTour);
    return () =>
      window.removeEventListener("start-guest-tour", handleStartGuestTour);
  }, [startGuide]);

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
    setGuideState((prev) => {
      if (prev.type) {
        setCompletedGuides((c) => ({
          ...c,
          [prev.type as string]: true,
        }));
      }
      return { type: null, step: 0 };
    });
  }, [setCompletedGuides, setGuideState]);

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
