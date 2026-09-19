import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Calculator, RotateCcw, Share2, Check, ArrowUpDown, Wand2, X, Info, ChevronUp, Megaphone, ArrowLeft } from "lucide-react";
import { TradeCard } from "../../../types";
import { TradeSectionPanel } from "./TradeSectionPanel";
import { TradeNotices } from "./TradeNotices";
import { SmartParserMenu } from "./SmartParserMenu";
import { TradeSummaryBox } from "./TradeSummaryBox";
import { AdComposer } from "./AdComposer";
import { usePanelResize } from "../../../hooks/usePanelResize";
import { getShareText, getTradeForecast } from "./summaryUtils";
import { useUnits } from "../../../context/UnitContext";
import { GuideType } from "../guides/AquaGuideOverlay";
import { useTradeStore } from "../../../store/useTradeStore";
import { triggerHaptic } from "../../../data/helpers";
import { useAuthStore } from "../../../store/useAuthStore";

export function TradeAnalyzerPanel({
  isOpen = true,
  onClose,
  guideState,
  startGuide,
  analyzerZ = "z-50"
}: {
  isOpen?: boolean;
  onClose?: () => void;
  guideState?: { type: string | null; step: number };
  startGuide: (type: GuideType) => void;
  analyzerZ?: string;
}) {
  const { units: ALL_UNITS } = useUnits();
  const { profile, loginWithDiscord } = useAuthStore();

  const { 
    giveItems, 
    getItems, 
    changeQty, 
    removeCard, 
    clearSection, 
    addCard, 
    swap, 
    overwrite, 
    pinnedIds, 
    togglePin, 
    clearAllUnpinned,
    isComposerOpen,
    setComposerOpen
  } = useTradeStore();

  const [copied, setCopied] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [smartMenuOpen, setSmartMenuOpen] = useState(false);
  const [initialParserText, setInitialParserText] = useState("");
  
  const [confirmClear, setConfirmClear] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { panelWidth, startResize, panelRef } = usePanelResize(480, 420, 800);

  const [undoCache, setUndoCache] = useState<{give: TradeCard[], get: TradeCard[]} | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const currentYRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("unit")) setIsGlobalDragging(true);
    };
    const handleDragEnd = () => setIsGlobalDragging(false);
    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("dragend", handleDragEnd);
    return () => {
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("dragend", handleDragEnd);
    };
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;

      const text = e.clipboardData?.getData("text");
      if (text && text.trim().length > 0) {
        window.dispatchEvent(new Event("open-analyzer"));
        setInitialParserText(text);
        setSmartMenuOpen(true);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const { giveTotal, getTotal, givePercent, getPercent, forecastData } = useMemo(() => {
    const gTotal = giveItems.reduce((s, c) => s + c.value * c.qty, 0);
    const tTotal  = getItems.reduce((s, c) => s + c.value * c.qty, 0);
    const totalTradeValue = gTotal + tTotal;
    const forecast = getTradeForecast(giveItems, getItems, ALL_UNITS);
    return {
      giveTotal: gTotal,
      getTotal: tTotal,
      givePercent: totalTradeValue === 0 ? 50 : (gTotal / totalTradeValue) * 100,
      getPercent: totalTradeValue === 0 ? 50 : (tTotal / totalTradeValue) * 100,
      forecastData: forecast
    };
  }, [giveItems, getItems, ALL_UNITS]);

  const saveUndoState = useCallback(() => {
    setUndoCache({ give: [...giveItems], get: [...getItems] });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoCache(null), 4000);
  }, [giveItems, getItems]);

  const handleGlobalClear = useCallback(() => {
    const previousState = clearAllUnpinned();
    setUndoCache(previousState);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoCache(null);
    }, 4000);
  }, [clearAllUnpinned]);

  const handleSafeClear = () => {
    if (giveItems.length === 0 && getItems.length === 0) return;
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    } else {
      handleGlobalClear();
      setConfirmClear(false);
    }
  };

  const handleUndo = useCallback(() => {
    if (undoCache) {
      overwrite(undoCache.give, undoCache.get);
      setUndoCache(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    }
  }, [undoCache, overwrite]);

  const handleShare = useCallback(() => {
    const text = getShareText(giveItems, getItems, giveTotal, getTotal, ALL_UNITS);
    const tryWrite = async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
        document.body.appendChild(ta);
        ta.focus(); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    tryWrite();
  }, [giveItems, getItems, giveTotal, getTotal, ALL_UNITS]);

  const handleAdvertise = () => {
    if (!profile) {
      loginWithDiscord();
      return;
    }
    setComposerOpen(true, getItems.length === 0 ? "lf_offers" : "standard");
  };

  const openSheet = () => {
    triggerHaptic('light');
    window.dispatchEvent(new Event("open-analyzer")); 
  };

  const closeSheet = () => {
    triggerHaptic('light');
    if (onClose) onClose();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || !isOpen) return;
    if ((e.target as HTMLElement).closest('.custom-scrollbar, button, input, textarea, a, select')) return;
    
    touchStartYRef.current = e.touches[0].clientY;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isOpen || touchStartYRef.current === null) return;
    const dy = e.touches[0].clientY - touchStartYRef.current;
    
    if (dy > 0) {
      currentYRef.current = dy;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${dy}px)`;
      }
    }
  };

  const onTouchEnd = () => {
    if (!isMobile || !isOpen || touchStartYRef.current === null) return;
    
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      if (currentYRef.current > 120) {
        closeSheet();
        sheetRef.current.style.transform = 'translateY(100%)';
      } else {
        sheetRef.current.style.transform = 'translateY(0px)';
      }
    }
    
    touchStartYRef.current = null;
    currentYRef.current = 0;
  };

  const isMainStep3 = guideState?.type === "main" && guideState?.step === 3;
  const isMainStep4 = guideState?.type === "main" && guideState?.step === 4;
  const isWandTarget = guideState?.type === "dictionary" || guideState?.type === "advanced";
  const isClearTarget = guideState?.type === "management";
  const isElevated = isMainStep4 || guideState?.type === "advanced" || guideState?.type === "dictionary" || guideState?.type === "management";

  const renderCalculatorContent = () => (
    <>
      <div 
        className="flex-shrink-0 flex items-center gap-2 px-3 md:px-4 py-3 md:py-4 border-b border-[rgba(0,0,0,0.28)] relative z-20"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="w-7 h-7 flex-shrink-0 rounded-[6px] flex items-center justify-center bg-[#1E1F22] border border-[rgba(255,255,255,0.04)]">
          <Calculator className="w-3.5 h-3.5 text-[#DBDEE1]" />
        </div>
        <span className="text-[14px] md:text-[15px] font-bold flex-1 text-[#F2F3F5] truncate select-none">
          {isComposerOpen ? "Create Listing" : "Trade Analyzer"}
        </span>

        {isComposerOpen ? (
          <button 
            onClick={() => setComposerOpen(false)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-[#1E1F22] hover:bg-[#35373C] text-[#DBDEE1] text-[12px] font-bold rounded-[4px] border border-[rgba(255,255,255,0.04)] transition-colors focus-visible:outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        ) : (
          <>
            <button 
              onClick={() => { setSmartMenuOpen(!smartMenuOpen); startGuide("dictionary"); }} 
              className={`flex-shrink-0 w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-[4px] transition-all duration-300 ease-out hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white relative z-35 pointer-events-auto ${
                isWandTarget 
                  ? "bg-[#5865F2] text-white shadow-[0_0_20px_rgba(88,101,242,0.8)] ring-2 ring-[#5865F2] z-[100005] animate-pulse" 
                  : smartMenuOpen 
                    ? "bg-[rgba(88,101,242,0.15)] text-[#5865F2]" 
                    : "text-[#B5BAC1] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F2F3F5]"
              }`} 
              title="Context Recognition"
            >
              <Wand2 className="w-4 h-4 md:w-4 md:h-4" />
            </button>
            <button 
              onClick={handleSafeClear} 
              className={`flex-shrink-0 w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-[4px] transition-all duration-300 ease-out hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white relative z-35 pointer-events-auto ${
                isClearTarget 
                  ? "bg-[#ed4245] text-white shadow-[0_0_20px_rgba(237,66,69,0.8)] ring-2 ring-[#ed4245] z-[100005] animate-pulse" 
                  : confirmClear
                    ? "bg-[#ed4245] text-white shadow-md animate-pulse"
                    : "text-[#B5BAC1] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F2F3F5]"
              }`} 
              title={confirmClear ? "Click again to confirm" : "Clear trade"}
            >
              {confirmClear ? <Check className="w-4 h-4 md:w-4 md:h-4" /> : <RotateCcw className="w-4 h-4 md:w-3.5 md:h-3.5" />}
            </button>
            <button 
              onClick={handleShare} 
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 md:px-2.5 md:py-1.5 rounded-[4px] text-[12px] font-bold transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg active:scale-95 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white relative z-35 pointer-events-auto" 
              style={{ background: copied ? "#23a559" : "#1E1F22", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'Inter', sans-serif" }}
              title="Share formatted trade string"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5 text-[#80848E]" />}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
            </button>
            <button 
              onClick={handleAdvertise} 
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 md:px-3 md:py-1.5 rounded-[4px] text-[12px] font-bold transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg active:scale-95 text-white bg-[#5865F2] hover:bg-[#4752C4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white relative z-35 pointer-events-auto shadow-sm" 
              title="Post this trade as an advertisement"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Advertise</span>
            </button>
          </>
        )}

        {(!isMobile && onClose) && (
          <button 
            onClick={closeSheet} 
            className="flex-shrink-0 w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-[4px] text-[#B5BAC1] hover:bg-[rgba(237,66,69,0.1)] hover:text-[#ed4245] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ed4245] relative z-35 pointer-events-auto" 
            title="Close Analyzer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isComposerOpen ? (
        <AdComposer />
      ) : (
        <>
          {smartMenuOpen && (
            <SmartParserMenu 
              ALL_UNITS={ALL_UNITS} 
              onClose={() => { setSmartMenuOpen(false); setInitialParserText(""); }} 
              onSaveUndo={saveUndoState}
              initialText={initialParserText}
            />
          )}

          <TradeSummaryBox 
            isMainStep4={isMainStep4}
            giveTotal={giveTotal}
            getTotal={getTotal}
            givePercent={givePercent}
            getPercent={getPercent}
            giveItems={giveItems}
            getItems={getItems}
            ALL_UNITS={ALL_UNITS}
          />

          <div className="flex-1 overflow-y-auto py-1 custom-scrollbar overscroll-y-contain">
            <div className={`relative transition-all duration-300 ${isClearTarget ? "ring-2 ring-[#5865F2] rounded-[8px] bg-[rgba(88,101,242,0.05)] shadow-[0_0_20px_rgba(88,101,242,0.2)] z-[100005]" : ""}`}>
              <TradeSectionPanel 
                label="You Give" 
                type="give" 
                items={giveItems} 
                isDraggingGlobal={isGlobalDragging} 
                onQtyChange={(id, qty) => {
                  const item = giveItems.find(i => i.id === id);
                  if (item && qty > item.qty) {
                    window.dispatchEvent(new CustomEvent("trade-added", { detail: { name: item.name, type: "give" } }));
                  }
                  changeQty("give", id, qty);
                }} 
                onRemove={(id) => removeCard("give", id)} 
                onClear={() => clearSection("give")} 
                onAdd={(card) => {
                  addCard("give", card);
                  window.dispatchEvent(new CustomEvent("trade-added", { detail: { name: card.name, type: "give" } }));
                }} 
                pinnedIds={new Set(pinnedIds)}
                onTogglePin={(id) => { togglePin("give", id); startGuide("management"); }}
              />
            </div>

            <div className="relative mx-3 md:mx-4 flex items-center justify-center my-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[rgba(255,255,255,0.04)]" /></div>
              <button onClick={swap} className="relative flex items-center justify-center w-10 h-10 md:w-7 md:h-7 rounded-full transition-all duration-300 ease-out hover:scale-110 z-10 bg-[#1E1F22] border border-[rgba(255,255,255,0.08)] text-[#80848E] hover:text-[#DBDEE1] hover:bg-[#2B2D31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]" title="Swap Give and Get">
                <ArrowUpDown className="w-4 h-4 md:w-3.5 md:h-3.5" />
              </button>
            </div>

            <TradeSectionPanel 
              label="You Get" 
              type="get" 
              items={getItems} 
              isDraggingGlobal={isGlobalDragging} 
              onQtyChange={(id, qty) => {
                const item = getItems.find(i => i.id === id);
                if (item && qty > item.qty) {
                  window.dispatchEvent(new CustomEvent("trade-added", { detail: { name: item.name, type: "get" } }));
                }
                changeQty("get", id, qty);
              }} 
              onRemove={(id) => removeCard("get", id)} 
              onClear={() => clearSection("get")} 
              onAdd={(card) => {
                addCard("get", card);
                window.dispatchEvent(new CustomEvent("trade-added", { detail: { name: card.name, type: "get" } }));
              }} 
              pinnedIds={new Set(pinnedIds)}
              onTogglePin={(id) => { togglePin("get", id); startGuide("management"); }}
            />

            <TradeNotices giveItems={giveItems} getItems={getItems} ALL_UNITS={ALL_UNITS} />

            <div className="mx-3 md:mx-4 mt-1 mb-4 bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-3 md:p-4 shadow-sm pb-10">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-[#5865F2]" />
                <h4 className="text-[11px] font-bold text-[#F2F3F5] uppercase tracking-wider">How the Forecast Works</h4>
              </div>
              <p className="text-[11.5px] text-[#949BA4] leading-relaxed">
                The <strong>Market Forecast</strong> system goes beyond raw value. It uses an advanced algorithm to predict the success of a trade. <strong className="text-[#DBDEE1]">Scores &gt; 0</strong> indicate a mathematical win, while <strong className="text-[#DBDEE1]">Scores &lt; 0</strong> indicate a loss.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FAA61A] mt-1.5 shrink-0" />
                  <p className="text-[11px] text-[#B5BAC1] leading-snug"><strong className="text-[#DBDEE1]">Short-Term Flip</strong> prioritizes immediate liquidity (Demand ÷ Supply) and hyped momentum tags.</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5865F2] mt-1.5 shrink-0" />
                  <p className="text-[11px] text-[#B5BAC1] leading-snug"><strong className="text-[#DBDEE1]">Long-Term Hold</strong> severely punishes unstable/hyped units and rewards high-rarity assets that retain value.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-[90] animate-fade-in" 
            onClick={closeSheet}
            aria-hidden="true"
          />
        )}

        {/* Mobile Resting State (Bottom Bar) */}
        <div 
          className={`fixed left-0 right-0 bottom-0 bg-[#2B2D31] border-t border-[rgba(255,255,255,0.08)] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer 
          ${isOpen ? 'translate-y-[100%] opacity-0 pointer-events-none z-[80]' : 'bottom-0 translate-y-0 opacity-100'} 
          ${isMainStep3 && !isOpen ? '!z-[100005] ring-4 ring-[#5865F2] shadow-[0_0_30px_rgba(88,101,242,0.8)] animate-pulse' : 'z-[80]'}`}
          onClick={openSheet}
        >
          <div className="flex items-center justify-between px-4 py-3 pb-safe">
            <div className="flex flex-col min-w-0 flex-1 border-r border-[rgba(255,255,255,0.06)] pr-3">
              <span className="text-[10px] font-bold text-[#949BA4] uppercase tracking-wider mb-0.5 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#FAA61A]" /> You Give</span>
              <span className="text-[14px] font-black text-[#F2F3F5] font-mono truncate">{giveTotal.toLocaleString()}</span>
            </div>

            <div className="flex flex-col min-w-0 flex-1 pl-3">
              <span className="text-[10px] font-bold text-[#949BA4] uppercase tracking-wider mb-0.5 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#5865F2]" /> You Get</span>
              <span className="text-[14px] font-black text-[#F2F3F5] font-mono truncate">{getTotal.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2 pl-3">
               {forecastData.calculable ? (
                 <div className={`px-2 py-1 rounded-[4px] font-black font-mono text-[12px] border ${forecastData.st > 0 ? 'bg-[#23a559]/10 text-[#23a559] border-[#23a559]/30' : forecastData.st < 0 ? 'bg-[#ed4245]/10 text-[#ed4245] border-[#ed4245]/30' : 'bg-[#1E1F22] text-[#80848E] border-[rgba(255,255,255,0.06)]'}`}>
                   {forecastData.st > 0 ? '+' : ''}{forecastData.st.toFixed(0)}
                 </div>
               ) : (
                 <Calculator className="w-5 h-5 text-[#80848E]" />
               )}
               <ChevronUp className="w-5 h-5 text-[#80848E] ml-1 animate-bounce" />
            </div>
          </div>
        </div>

        {/* Mobile Full Expanded Sheet */}
        <div 
          ref={sheetRef}
          className={`fixed left-0 right-0 bottom-0 bg-[#2B2D31] flex flex-col shadow-[0_-12px_40px_rgba(0,0,0,0.8)] rounded-t-[16px] overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isElevated ? "!z-[100000]" : "z-[100]"}`}
          style={{ 
            height: '92vh',
            transform: isOpen ? 'translateY(0%)' : 'translateY(100%)'
          }}
        >
          {/* Dedicated Grab Bar */}
          <div 
            className="w-full pt-3 pb-1 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none flex-shrink-0 select-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="w-16 h-1.5 bg-[rgba(255,255,255,0.2)] rounded-full pointer-events-none" />
          </div>

          {renderCalculatorContent()}
        </div>
      </>
    );
  }

  // Desktop Side Panel View
  return (
    <div 
      className={`hidden md:block relative top-0 bottom-0 right-0 flex-shrink-0 overflow-hidden transition-all duration-300 ease-out will-change-[width,transform] ${isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'} ${analyzerZ}`}
      style={{ opacity: isOpen ? 1 : 0, width: isOpen ? `${panelWidth}px` : '0px' }}
    >
      <div className="w-full h-full">
        <div className="w-full h-full">
          <div 
            ref={panelRef} 
            className="flex flex-col h-full w-full select-none border-l border-[rgba(0,0,0,0.32)] shadow-[-12px_0_40px_rgba(0,0,0,0.5)] bg-[#2B2D31] relative" 
            style={{ width: `${panelWidth}px`, minWidth: "420px", fontFamily: "'Inter', sans-serif" }}
          >
            <div 
              className="absolute top-0 left-0 w-2 h-full cursor-col-resize hover:bg-[#5865F2] z-[100000] transition-colors"
              onMouseDown={startResize}
              title="Drag to resize panel"
            />
            {renderCalculatorContent()}
          </div>
        </div>
      </div>
    </div>
  );
}