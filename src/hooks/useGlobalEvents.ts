import { useState, useEffect, useRef } from 'react';
import { triggerHaptic } from '../data/helpers';

export function useGlobalEvents({
  giveItems, getItems, pinnedIds, completedGuides, setCompletedGuides,
  setActiveChannel, setIsRosterOpen, setIsAnalyzerOpen, setTutorialTab, setGuideState
}: any) {
  const [toast, setToast] = useState<{ id: number; unitName: string; count: number; type: "give" | "get" } | null>(null);
  const [academyToast, setAcademyToast] = useState<{ step: number } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCompletedCount = useRef(0);
  const [isMounted, setIsMounted] = useState(false);

  // Used to prevent rapid flashing by keeping the same ID if a new toast arrives quickly
  const lastToastIdRef = useRef<number>(Date.now());
  const lastToastTimeRef = useRef<number>(0);

  useEffect(() => setIsMounted(true), []);

  // Academy Progression Observer
  useEffect(() => {
    const currentCompletedCount = (
      (giveItems.length > 0 || getItems.length > 0 ? 1 : 0) + 
      (pinnedIds.length > 0 ? 1 : 0) + 
      (completedGuides.hasFiltered ? 1 : 0) + 
      (completedGuides.hasUsedParser ? 1 : 0)
    );

    if (isMounted && currentCompletedCount > prevCompletedCount.current && currentCompletedCount < 4) {
      setAcademyToast({ step: currentCompletedCount });
    }
    prevCompletedCount.current = currentCompletedCount;
  }, [giveItems.length, getItems.length, pinnedIds.length, completedGuides.hasFiltered, completedGuides.hasUsedParser, isMounted]);

  useEffect(() => {
    if (!academyToast) return;
    const timer = setTimeout(() => setAcademyToast(null), 3500);
    return () => clearTimeout(timer);
  }, [academyToast]);

  // Global Window Event Listeners
  useEffect(() => {
    const handleSetTab = (e: Event) => setTutorialTab((e as CustomEvent).detail);
    
    const handleAcademyEvent = (e: Event) => {
      if (e.type === "academy-used-parser") setCompletedGuides((p: any) => ({ ...p, hasUsedParser: true }));
      if (e.type === "academy-used-filter") setCompletedGuides((p: any) => ({ ...p, hasFiltered: true }));
    };

    const handleWelcomeClosed = () => {
      if (!completedGuides["main"]) {
        setGuideState({ type: "main", step: 1 });
        if (window.innerWidth < 768) setIsRosterOpen(true);
      }
    };

    const handleTradeAdded = (e: Event) => {
      const customEvent = e as CustomEvent<{ name: string; type: "give" | "get" }>;
      if (!customEvent.detail) return;
      triggerHaptic('medium'); 
      
      const now = Date.now();
      setToast(prev => {
        const isSameType = prev && prev.type === customEvent.detail.type;
        const count = isSameType ? prev.count + 1 : 1;
        const nameToKeep = isSameType ? prev.unitName : customEvent.detail.name;
        
        // Group toasts if within 1000ms to stop flashing
        if (now - lastToastTimeRef.current < 1000 && isSameType) {
           return { id: lastToastIdRef.current, unitName: nameToKeep, count, type: customEvent.detail.type };
        } else {
           lastToastIdRef.current = now;
           return { id: now, unitName: nameToKeep, count, type: customEvent.detail.type };
        }
      });
      
      lastToastTimeRef.current = now;

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 2500);

      setGuideState((prev: any) => (prev.type === "main" && prev.step === 2) ? { ...prev, step: 3 } : prev);
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
      setGuideState((prev: any) => (prev.type === "main" && prev.step === 3) ? { ...prev, step: 4 } : prev);
    };

    window.addEventListener("set-tutorial-tab", handleSetTab);
    window.addEventListener("academy-used-parser", handleAcademyEvent);
    window.addEventListener("academy-used-filter", handleAcademyEvent);
    window.addEventListener("welcome-closed", handleWelcomeClosed);
    window.addEventListener("trade-added", handleTradeAdded);
    window.document.addEventListener("navigate", handleNavigate);
    window.addEventListener("open-analyzer", handleOpenAnalyzer);

    return () => {
      window.removeEventListener("set-tutorial-tab", handleSetTab);
      window.removeEventListener("academy-used-parser", handleAcademyEvent);
      window.removeEventListener("academy-used-filter", handleAcademyEvent);
      window.removeEventListener("welcome-closed", handleWelcomeClosed);
      window.removeEventListener("trade-added", handleTradeAdded);
      window.document.removeEventListener("navigate", handleNavigate);
      window.removeEventListener("open-analyzer", handleOpenAnalyzer);
    };
  }, [setCompletedGuides, setTutorialTab, setActiveChannel, setIsRosterOpen, setIsAnalyzerOpen, setGuideState, completedGuides]);

  return { toast, academyToast };
}