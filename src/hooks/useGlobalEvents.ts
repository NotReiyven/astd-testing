import { useEffect } from "react";
import { triggerHaptic } from "../data/helpers";
import { useToastStore } from "../store/useToastStore";

export function useGlobalEvents({
  setCompletedGuides,
  setActiveChannel,
  setIsRosterOpen,
  setIsAnalyzerOpen,
  setTutorialTab,
  setGuideState,
}: any) {

  // Global Window Event Listeners
  useEffect(() => {
    const handleSetTab = (e: Event) =>
      setTutorialTab((e as CustomEvent).detail);

    const handleAcademyEvent = (e: Event) => {
      if (e.type === "academy-used-parser")
        setCompletedGuides((p: any) => ({ ...p, hasUsedParser: true }));
      if (e.type === "academy-used-filter")
        setCompletedGuides((p: any) => ({ ...p, hasFiltered: true }));
      if (e.type === "academy-passed-sim")
        setCompletedGuides((p: any) => ({ ...p, hasPassedSim: true }));
      if (e.type === "academy-posted-ad")
        setCompletedGuides((p: any) => ({ ...p, hasPostedAd: true }));
      if (e.type === "academy-give-get")
        setCompletedGuides((p: any) => ({ ...p, hasGiveGet: true }));
      if (e.type === "academy-pinned")
        setCompletedGuides((p: any) => ({ ...p, hasPinned: true }));
      if (e.type === "academy-saved-preset")
        setCompletedGuides((p: any) => ({ ...p, hasPresets: true }));
      if (e.type === "academy-vault")
        setCompletedGuides((p: any) => ({ ...p, hasVault: true }));
      if (e.type === "academy-wishlist")
        setCompletedGuides((p: any) => ({ ...p, hasWishlist: true }));
    };

    const handleWelcomeClosed = () => {
      // The start Guide trigger is now handled directly by WelcomeModal firing the "start-guest-tour" event.
    };

    const handleTradeAdded = (e: Event) => {
      const customEvent = e as CustomEvent<{
        name: string;
        type: "give" | "get";
      }>;
      if (!customEvent.detail) return;
      triggerHaptic("medium");
      setCompletedGuides((p: any) =>
        p.hasGiveGet ? p : { ...p, hasGiveGet: true }
      );

      const sideLabel = customEvent.detail.type === "give" ? "Give" : "Get";
      useToastStore.getState().addToast(
        `Added ${customEvent.detail.name} to ${sideLabel}`,
        "success",
        {
          dedupeKey: `trade-add:${customEvent.detail.name}:${customEvent.detail.type}`,
          action: {
            label: "Open Calculator",
            onClick: () => {
              setIsAnalyzerOpen(true);
            },
          },
        }
      );

      // Guest Tour Progression
      setGuideState((prev: any) =>
        prev.type === "guest_tour" && prev.step === 3
          ? { ...prev, step: 4 }
          : prev
      );
    };

    const handleNavigate = (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      if (target) {
        setActiveChannel(target);
        if (window.innerWidth < 768) setIsRosterOpen(false);
      }
    };

    const handleOpenAnalyzer = () => {
      setIsAnalyzerOpen(true);
      // Advance Guest Tour from Step 2 to Step 3 if triggered
      setGuideState((prev: any) =>
        prev.type === "guest_tour" && prev.step === 2
          ? { ...prev, step: 3 }
          : prev
      );
    };

    const academyEventNames = [
      "academy-used-parser",
      "academy-used-filter",
      "academy-passed-sim",
      "academy-posted-ad",
      "academy-give-get",
      "academy-pinned",
      "academy-saved-preset",
      "academy-vault",
      "academy-wishlist",
    ];

    window.addEventListener("set-tutorial-tab", handleSetTab);
    academyEventNames.forEach((evt) =>
      window.addEventListener(evt, handleAcademyEvent)
    );
    window.addEventListener("welcome-closed", handleWelcomeClosed);
    window.addEventListener("trade-added", handleTradeAdded);
    window.document.addEventListener("navigate", handleNavigate);
    window.addEventListener("open-analyzer", handleOpenAnalyzer);

    return () => {
      window.removeEventListener("set-tutorial-tab", handleSetTab);
      academyEventNames.forEach((evt) =>
        window.removeEventListener(evt, handleAcademyEvent)
      );
      window.removeEventListener("welcome-closed", handleWelcomeClosed);
      window.removeEventListener("trade-added", handleTradeAdded);
      window.document.removeEventListener("navigate", handleNavigate);
      window.removeEventListener("open-analyzer", handleOpenAnalyzer);
    };
  }, [
    setCompletedGuides,
    setTutorialTab,
    setActiveChannel,
    setIsRosterOpen,
    setIsAnalyzerOpen,
    setGuideState,
  ]);

  return {};
}
