import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Calculator, RotateCcw, Share2, Check, ArrowUpDown, Wand2, X, Info } from "lucide-react";
import { TradeCard } from "../../../types";
import { TradeSectionPanel } from "./TradeSectionPanel";
import { TradeNotices } from "./TradeNotices";
import { SmartParserMenu } from "./SmartParserMenu";
import { TradeSummaryBox } from "./TradeSummaryBox";
import { usePanelResize } from "../../../hooks/usePanelResize";
import { getShareText } from "./summaryUtils";
import { useUnits } from "../../../context/UnitContext";
import { GuideType } from "../guides/AquaGuideOverlay";
import { useTradeStore } from "../../../store/useTradeStore";

export function TradeAnalyzerPanel({
  isOpen = true,
  onClose,
  guideState,
  startGuide
}: {
  isOpen?: boolean;
  onClose?: () => void;
  guideState?: { type: string | null; step: number };
  startGuide: (type: GuideType) => void;
}) {
  const { units: ALL_UNITS } = useUnits();
  
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
    clearAllUnpinned 
  } = useTradeStore();

  const [copied, setCopied] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [smartMenuOpen, setSmartMenuOpen] = useState(false);
  const [initialParserText, setInitialParserText] = useState("");

  const [isMobile, setIsMobile] = useState(false);
  const { panelWidth, startResize, panelRef } = usePanelResize(400, 400, 800);

  const [undoCache, setUndoCache] = useState<{give: TradeCard[], get: TradeCard[]} | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (panelRef.current) {
      const parent1 = panelRef.current.parentElement;
      const parent2 = parent1?.parentElement;

      if (parent1 && parent2) {
        if (isOpen && !isMobile) {
          parent1.style.width = `${panelWidth}px`;
          parent1.style.maxWidth = 'none';
          parent2.style.width = `${panelWidth}px`;
          parent2.style.maxWidth = 'none';
        } else {
          parent1.style.width = '';
          parent1.style.maxWidth = '';
          parent2.style.width = '';
          parent2.style.maxWidth = '';
        }
      }
    }
  }, [isOpen, panelWidth, isMobile, panelRef]);

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

  // Global Paste Listener for instantly evaluating trades via Smart Parser
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

  const { giveTotal, getTotal, givePercent, getPercent } = useMemo(() => {
    const gTotal = giveItems.reduce((s, c) => s + c.value * c.qty, 0);
    const tTotal  = getItems.reduce((s, c) => s + c.value * c.qty, 0);
    const totalTradeValue = gTotal + tTotal;
    return {
      giveTotal: gTotal,
      getTotal: tTotal,
      givePercent: totalTradeValue === 0 ? 50 : (gTotal / totalTradeValue) * 100,
      getPercent: totalTradeValue === 0 ? 50 : (tTotal / totalTradeValue) * 100
    };
  }, [giveItems, getItems]);

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

  const isMainStep4 = guideState?.type === "main" && guideState?.step === 4;
  const isWandTarget = guideState?.type === "dictionary" || guideState?.type === "advanced";
  const isClearTarget = guideState?.type === "management";

  return (
    <div 
      ref={panelRef} 
      className="flex flex-col h-full w-full select-none border-l border-[rgba(0,0,0,0.32)] shadow-[-12px_0_40px_rgba(0,0,0,0.5)]" 
      style={{ width: isMobile ? "100%" : `${panelWidth}px`, minWidth: isMobile ? "100%" : "400px", background: "#2B2D31", fontFamily: "'Inter', sans-serif" }}
    >
      {!isMobile && (
        <div 
          className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-[#5865F2] z-[100000] transition-colors"
          onMouseDown={startResize}
          title="Drag to resize panel"
        />
      )}

      <div className="flex-shrink-0 flex items-center gap-2 px-3 md:px-4 py-3 md:py-4 border-b border-[rgba(0,0,0,0.28)]">
        <div className="w-7 h-7 flex-shrink-0 rounded-[6px] flex items-center justify-center bg-[#1E1F22] border border-[rgba(255,255,255,0.04)]">
          <Calculator className="w-3.5 h-3.5 text-[#DBDEE1]" />
        </div>
        <span className="text-[14px] md:text-[15px] font-bold flex-1 text-[#F2F3F5] truncate">Trade Analyzer</span>

        <button 
          onClick={() => { setSmartMenuOpen(!smartMenuOpen); startGuide("dictionary"); }} 
          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-[4px] transition-all duration-300 ease-out hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            isWandTarget 
              ? "bg-[#5865F2] text-white shadow-[0_0_20px_rgba(88,101,242,0.8)] ring-2 ring-[#5865F2] z-[100005] relative animate-pulse" 
              : smartMenuOpen 
                ? "bg-[rgba(88,101,242,0.15)] text-[#5865F2]" 
                : "text-[#B5BAC1] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F2F3F5]"
          }`} 
          title="Context Recognition"
        >
          <Wand2 className="w-4 h-4" />
        </button>
        <button 
          onClick={handleGlobalClear} 
          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-[4px] transition-all duration-300 ease-out hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            isClearTarget 
              ? "bg-[#ed4245] text-white shadow-[0_0_20px_rgba(237,66,69,0.8)] ring-2 ring-[#ed4245] z-[100005] relative animate-pulse" 
              : "text-[#B5BAC1] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F2F3F5]"
          }`} 
          title="Clear trade"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleShare} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-bold transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg active:scale-95 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" style={{ background: copied ? "#23a559" : "#5865F2", fontFamily: "'Inter', sans-serif" }}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Share"}
        </button>

        {onClose && (
          <button 
            onClick={onClose} 
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-[4px] text-[#B5BAC1] hover:bg-[rgba(237,66,69,0.1)] hover:text-[#ed4245] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ed4245]" 
            title="Close Analyzer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

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

      <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
        <div className={`relative transition-all duration-300 ${isClearTarget ? "ring-2 ring-[#5865F2] rounded-[8px] bg-[rgba(88,101,242,0.05)] shadow-[0_0_20px_rgba(88,101,242,0.2)] z-[100005]" : ""}`}>
          <TradeSectionPanel 
            label="You Give" 
            type="give" 
            items={giveItems} 
            isDraggingGlobal={isGlobalDragging} 
            onQtyChange={(id, qty) => changeQty("give", id, qty)} 
            onRemove={(id) => removeCard("give", id)} 
            onClear={() => clearSection("give")} 
            onAdd={(card) => addCard("give", card)} 
            pinnedIds={new Set(pinnedIds)}
            onTogglePin={(id) => { togglePin("give", id); startGuide("management"); }}
          />
        </div>

        <div className="relative mx-3 md:mx-4 flex items-center justify-center my-1">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[rgba(255,255,255,0.04)]" /></div>
          <button onClick={swap} className="relative flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ease-out hover:scale-110 z-10 bg-[#1E1F22] border border-[rgba(255,255,255,0.08)] text-[#80848E] hover:text-[#DBDEE1] hover:bg-[#2B2D31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]" title="Swap Give and Get">
            <ArrowUpDown className="w-3 h-3 md:w-3.5 md:h-3.5" />
          </button>
        </div>
        
        <TradeSectionPanel 
          label="You Get" 
          type="get" 
          items={getItems} 
          isDraggingGlobal={isGlobalDragging} 
          onQtyChange={(id, qty) => changeQty("get", id, qty)} 
          onRemove={(id) => removeCard("get", id)} 
          onClear={() => clearSection("get")} 
          onAdd={(card) => addCard("get", card)} 
          pinnedIds={new Set(pinnedIds)}
          onTogglePin={(id) => { togglePin("get", id); startGuide("management"); }}
        />
        
        <TradeNotices giveItems={giveItems} getItems={getItems} ALL_UNITS={ALL_UNITS} />

        {/* --- HOW IT WORKS EXPLANATION BLOCK --- */}
        <div className="mx-3 md:mx-4 mt-1 mb-4 bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-3 md:p-4 shadow-sm">
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

      {undoCache && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-[#111214] border border-[rgba(255,255,255,0.08)] px-4 py-2.5 rounded-[8px] shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex items-center gap-4 animate-fade-in">
          <span className="text-[13px] font-medium text-[#DBDEE1]">Trade cleared.</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleUndo} 
              className="text-[13px] font-bold text-[#5865F2] hover:text-[#4752C4] hover:underline transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] rounded-[3px] px-1"
            >
              Undo
            </button>
            <div className="w-[1px] h-3 bg-[rgba(255,255,255,0.1)]"></div>
            <button 
              onClick={() => { setUndoCache(null); if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }}
              className="text-[#80848E] hover:text-[#DBDEE1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] rounded-[3px]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}