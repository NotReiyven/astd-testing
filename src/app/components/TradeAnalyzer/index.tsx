// ================================================
// FILE: src/app/components/TradeAnalyzer/index.tsx
// ================================================

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Calculator, RotateCcw, Share2, Check, ArrowUpDown, Wand2, X, Megaphone, ArrowLeft, Bookmark, Trash2 } from "lucide-react";
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
import { useTradeUndo } from "../../../hooks/useTradeUndo";
import { useTradeGlobalInput } from "../../../hooks/useTradeGlobalInput";
import { RollingNumber } from "../shared/Formatters";

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
    pinnedIds, 
    togglePin, 
    isComposerOpen,
    setComposerOpen,
    presets,
    savePreset,
    deletePreset,
    loadPreset
  } = useTradeStore();

  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const { panelWidth, startResize, panelRef } = usePanelResize(480, 420, 800);

  const { undoCache, confirmClear, saveUndoState, handleSafeClear, handleUndo } = useTradeUndo();
  const { isGlobalDragging, smartMenuOpen, setSmartMenuOpen, initialParserText, setInitialParserText } = useTradeGlobalInput();

  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const lastYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        if (smartMenuOpen) {
          setSmartMenuOpen(false);
          return;
        }
        if (isPresetsOpen) {
          setIsPresetsOpen(false);
          return;
        }
        if (isOpen && onClose && document.activeElement?.tagName !== 'INPUT') {
          closeSheet();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, smartMenuOpen, isPresetsOpen]);

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

  const handleShare = useCallback(() => {
    triggerHaptic('success');
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
    triggerHaptic('medium');
    if (!profile) {
      loginWithDiscord();
      return;
    }
    setComposerOpen(true, getItems.length === 0 ? "lf_offers" : "standard");
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim() || (giveItems.length === 0 && getItems.length === 0)) return;
    triggerHaptic('medium');
    savePreset(newPresetName.trim());
    setNewPresetName("");
  };

  const openSheet = () => {
    triggerHaptic('medium');
    window.dispatchEvent(new Event("open-analyzer")); 
  };

  const closeSheet = () => {
    triggerHaptic('light');
    if (onClose) onClose();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || !isOpen) return;
    touchStartYRef.current = e.touches[0].clientY;
    lastYRef.current = e.touches[0].clientY;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isOpen || touchStartYRef.current === null) return;

    const currentY = e.touches[0].clientY;
    const dy = currentY - touchStartYRef.current;

    const currentTime = Date.now();
    const dt = currentTime - lastTimeRef.current;
    if (dt > 0) {
      velocityRef.current = (currentY - lastYRef.current) / dt;
    }
    lastYRef.current = currentY;
    lastTimeRef.current = currentTime;

    if (dy > 0) {
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${dy}px)`;
      }
    }
  };

  const onTouchEnd = () => {
    if (!isMobile || !isOpen || touchStartYRef.current === null) return;

    const dy = lastYRef.current - touchStartYRef.current;

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

      if (dy > window.innerHeight * 0.25 || velocityRef.current > 0.4) {
        closeSheet();
        sheetRef.current.style.transform = 'translateY(100%)';
      } else {
        sheetRef.current.style.transform = 'translateY(0px)';
      }
    }

    touchStartYRef.current = null;
  };

  const isMainStep3 = guideState?.type === "main" && guideState?.step === 3;
  const isMainStep4 = guideState?.type === "main" && guideState?.step === 4;
  const isWandTarget = guideState?.type === "dictionary" || guideState?.type === "advanced";
  const isClearTarget = guideState?.type === "management";
  const isElevated = isMainStep4 || guideState?.type === "advanced" || guideState?.type === "dictionary" || guideState?.type === "management";

  const renderCalculatorContent = () => (
    <>
      <div className="flex-shrink-0 flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-3 md:py-4 border-b border-border relative z-20 bg-popover overflow-hidden">
        <div className="w-7 h-7 flex-shrink-0 rounded-[4px] flex items-center justify-center bg-card border border-border">
          <Calculator className="w-3.5 h-3.5 text-foreground" />
        </div>

        {isComposerOpen ? (
          <span className="text-[14px] md:text-[15px] font-bold flex-1 text-foreground truncate whitespace-nowrap select-none pr-1">Create Listing</span>
        ) : (
          <div className="flex items-center flex-1 min-w-0 pr-1 md:pr-2">
            <span className="hidden md:block text-[14px] lg:text-[15px] font-bold text-foreground select-none whitespace-nowrap truncate">Trade Analyzer</span>
            <div className="flex-1 md:hidden" />
          </div>
        )}

        {isComposerOpen ? (
          <button 
            onClick={() => { triggerHaptic('light'); setComposerOpen(false); }}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-muted hover:bg-card text-foreground text-[12px] font-bold rounded-[4px] border border-border transition-colors focus-visible:outline-none min-h-[44px] md:min-h-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        ) : (
          <>
            {undoCache && (
               <button 
                 onClick={() => { triggerHaptic('medium'); handleUndo(); }} 
                 className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-bold transition-colors active:scale-95 text-destructive-foreground bg-destructive hover:bg-destructive/80 focus-visible:outline-none relative z-35 pointer-events-auto shadow-sm mr-1 min-h-[44px] md:min-h-0 cursor-pointer"
                 title="Undo Clear"
               >
                 <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Undo Clear</span>
               </button>
            )}

            <button 
              onClick={() => { triggerHaptic('light'); setSmartMenuOpen(!smartMenuOpen); setIsPresetsOpen(false); startGuide("dictionary"); }} 
              className={`flex-shrink-0 w-11 h-11 md:w-8 md:h-8 flex items-center justify-center rounded-[4px] transition-colors active:scale-95 focus-visible:outline-none border relative z-35 pointer-events-auto cursor-pointer ${
                isWandTarget 
                  ? "bg-primary text-primary-foreground border-primary z-[100005] animate-pulse" 
                  : smartMenuOpen 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-muted border-border text-muted-foreground hover:bg-card hover:text-foreground"
              }`} 
              title="Context Recognition"
            >
              <Wand2 className="w-5 h-5 md:w-4 md:h-4" />
            </button>
            
            <button 
              onClick={() => { triggerHaptic('light'); setIsPresetsOpen(!isPresetsOpen); setSmartMenuOpen(false); }} 
              className={`flex-shrink-0 w-11 h-11 md:w-8 md:h-8 flex items-center justify-center rounded-[4px] transition-colors active:scale-95 focus-visible:outline-none border relative z-35 pointer-events-auto cursor-pointer ${
                isPresetsOpen 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-muted border-border text-muted-foreground hover:bg-card hover:text-foreground"
              }`} 
              title="Trade Presets"
            >
              <Bookmark className="w-5 h-5 md:w-4 md:h-4" />
            </button>

            <button 
              onClick={() => { triggerHaptic('medium'); handleSafeClear(); }} 
              className={`flex-shrink-0 w-11 h-11 md:w-8 md:h-8 flex items-center justify-center rounded-[4px] transition-colors active:scale-95 focus-visible:outline-none border relative z-35 pointer-events-auto cursor-pointer ${
                isClearTarget 
                  ? "bg-destructive text-destructive-foreground border-destructive z-[100005] animate-pulse" 
                  : confirmClear
                    ? "bg-destructive text-destructive-foreground border-destructive animate-pulse"
                    : "bg-muted border-border text-muted-foreground hover:bg-card hover:text-foreground"
              }`} 
              title={confirmClear ? "Click again to confirm" : "Clear trade"}
            >
              {confirmClear ? <Check className="w-5 h-5 md:w-4 md:h-4" /> : <X className="w-5 h-5 md:w-4 md:h-4" />}
            </button>
            <button 
              onClick={handleShare} 
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 md:px-2 md:py-1.5 rounded-[4px] text-[12px] font-bold transition-colors active:scale-95 text-foreground focus-visible:outline-none relative z-35 pointer-events-auto min-h-[44px] md:min-h-0 cursor-pointer" 
              style={{ background: copied ? "#23a559" : "var(--muted)", border: "1px solid var(--border)", fontFamily: "var(--font-sans)" }}
              title="Share formatted trade string"
            >
              {copied ? <Check className="w-4 h-4 md:w-3.5 md:h-3.5 text-white" /> : <Share2 className="w-4 h-4 md:w-3.5 md:h-3.5 text-muted-foreground" />}
              <span className="hidden xl:inline">{copied ? "Copied!" : "Share"}</span>
            </button>
            <button 
              onClick={handleAdvertise} 
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 md:px-2.5 md:py-1.5 rounded-[4px] text-[12px] font-bold transition-colors active:scale-95 text-primary-foreground bg-primary hover:bg-primary/90 focus-visible:outline-none border border-primary relative z-35 pointer-events-auto shadow-sm min-h-[44px] md:min-h-0 cursor-pointer" 
              title="Post this trade as an advertisement"
            >
              <Megaphone className="w-4 h-4 md:w-3.5 md:h-3.5" />
              <span className="hidden sm:inline">Advertise</span>
            </button>
          </>
        )}

        {(!isMobile && onClose) && (
          <button 
            onClick={closeSheet} 
            className="flex-shrink-0 w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-[4px] text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors focus-visible:outline-none border border-transparent hover:border-destructive relative z-35 pointer-events-auto cursor-pointer" 
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

          {isPresetsOpen && (
            <div className="relative z-50 mx-3 md:mx-4 mt-3 p-4 bg-card border border-border rounded-[8px] animate-fade-in shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-primary"/> Saved Loadouts
                </span>
                <button onClick={() => setIsPresetsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none rounded-[3px] p-1 -m-1 cursor-pointer">
                   <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex gap-2">
                <input 
                  value={newPresetName} 
                  onChange={e => setNewPresetName(e.target.value)} 
                  onKeyDown={e => e.key === "Enter" && handleSavePreset()}
                  placeholder="Name this loadout..." 
                  className="flex-1 bg-input border border-border rounded-[4px] px-3 py-2 text-[13px] text-foreground outline-none placeholder-muted-foreground focus:ring-1 focus:ring-primary transition-all" 
                  maxLength={30}
                />
                <button 
                  onClick={handleSavePreset} 
                  disabled={!newPresetName.trim() || (giveItems.length === 0 && getItems.length === 0)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-[4px] text-[13px] font-bold transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none shadow-sm"
                >
                  Save
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                 {presets.length === 0 ? (
                   <p className="text-[12px] text-muted-foreground italic text-center py-4 bg-muted rounded-[6px] border border-border">No saved loadouts.</p>
                 ) : (
                   presets.map(p => (
                     <div key={p.id} className="flex items-center justify-between bg-popover p-2.5 rounded-[6px] border border-border group hover:border-primary/50 transition-colors">
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-[13px] font-bold text-foreground truncate">{p.name}</span>
                          <span className="text-[10px] font-medium text-muted-foreground truncate">{p.give.length} Give • {p.get.length} Get</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button 
                            onClick={() => { triggerHaptic('medium'); loadPreset(p.id); setIsPresetsOpen(false); }}
                            className="px-3 py-1.5 bg-muted hover:bg-primary hover:text-primary-foreground text-foreground text-[11px] font-bold rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer border border-border hover:border-primary"
                          >
                            Load
                          </button>
                          <button 
                            onClick={() => { triggerHaptic('light'); deletePreset(p.id); }}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                            title="Delete Preset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                     </div>
                   ))
                 )}
              </div>
            </div>
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
            isCompact={isMobile && isInputFocused}
          />

          <div className="flex-1 overflow-y-auto py-1 custom-scrollbar overscroll-y-contain pb-safe">
            <div className={`relative transition-all duration-300 ${isClearTarget ? "ring-2 ring-primary rounded-[8px] bg-primary/5 shadow-lg z-[100005]" : ""}`}>
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
                onInputFocus={() => setIsInputFocused(true)}
                onInputBlur={() => setIsInputFocused(false)}
              />
            </div>

            <div className="relative mx-3 md:mx-4 flex items-center justify-center my-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <button onClick={() => { triggerHaptic('light'); swap(); }} className="relative flex items-center justify-center w-11 h-11 md:w-8 md:h-8 rounded-full transition-colors z-10 bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-card focus-visible:outline-none cursor-pointer" title="Swap Give and Get">
                <ArrowUpDown className="w-5 h-5 md:w-4 md:h-4" />
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
              onInputFocus={() => setIsInputFocused(true)}
              onInputBlur={() => setIsInputFocused(false)}
            />

            <TradeNotices giveItems={giveItems} getItems={getItems} ALL_UNITS={ALL_UNITS} />
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
            className="fixed inset-0 bg-black/80 z-[90] transition-opacity" 
            onClick={closeSheet}
            aria-hidden="true"
          />
        )}

        <div 
          className={`fixed left-0 right-0 bottom-0 bg-card border-t border-border transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer pb-safe
          ${isOpen ? 'translate-y-[100%] opacity-0 pointer-events-none z-[80]' : 'bottom-0 translate-y-0 opacity-100'} 
          ${isMainStep3 && !isOpen ? '!z-[100005] ring-2 ring-primary shadow-lg' : 'z-[80]'}`}
          onClick={openSheet}
        >
          <div className="flex items-center justify-between px-4 py-3 pb-safe">
            <div className="flex flex-col min-w-0 flex-1 border-r border-border pr-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-[2px] bg-[#FAA61A]" /> Give</span>
              <span className="text-[14px] font-black text-foreground font-mono truncate"><RollingNumber value={giveTotal} /></span>
            </div>

            <div className="flex flex-col min-w-0 flex-1 pl-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-[2px] bg-primary" /> Get</span>
              <span className="text-[14px] font-black text-foreground font-mono truncate"><RollingNumber value={getTotal} /></span>
            </div>
          </div>
        </div>

        <div 
          ref={sheetRef}
          className={`fixed left-0 right-0 bottom-0 bg-card flex flex-col border-t border-border rounded-t-[12px] overflow-hidden transition-transform duration-200 ease-out ${isElevated ? "!z-[100000]" : "z-[100]"}`}
          style={{ 
            height: '92dvh',
            transform: isOpen ? 'translateY(0%)' : 'translateY(100%)'
          }}
        >
          <div 
            className="w-full pt-3 pb-2 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none flex-shrink-0 select-none bg-popover"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="w-12 h-1 bg-border rounded-full pointer-events-none" />
          </div>

          {renderCalculatorContent()}
        </div>
      </>
    );
  }

  return (
    <div 
      className={`hidden md:block relative top-0 bottom-0 right-0 flex-shrink-0 overflow-hidden transition-all duration-200 ease-out will-change-[width,transform] ${isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'} ${analyzerZ}`}
      style={{ opacity: isOpen ? 1 : 0, width: isOpen ? `${panelWidth}px` : '0px' }}
    >
      <div className="w-full h-full">
        <div className="w-full h-full">
          <div 
            ref={panelRef} 
            className="flex flex-col h-full w-full select-none border-l border-border bg-card relative" 
            style={{ width: `${panelWidth}px`, minWidth: "420px", fontFamily: "var(--font-sans)" }}
          >
            <div 
              className="absolute top-0 left-0 w-2 h-full cursor-col-resize hover:bg-primary z-[100000] transition-colors"
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