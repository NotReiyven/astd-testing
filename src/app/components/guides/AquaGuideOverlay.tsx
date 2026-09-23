// ================================================
// FILE: src/app/components/guides/AquaGuideOverlay.tsx
// ================================================

import { useState, useEffect, useRef } from "react";
import { Sparkles, ChevronRight, ChevronLeft, X, ArrowUpRight, Zap } from "lucide-react";
import { GuideType } from "../../../hooks/useGuideSystem";
import { triggerHaptic } from "../../../data/helpers";

export type { GuideType };

interface GuideStep {
  title: string;
  body: string;
  actionLabel?: string;
  actionChannel?: string;
  actionEvent?: string;
}

const GUEST_STEPS: GuideStep[] = [
  {
    title: "Market Tags & Momentum",
    body: "Listen up, you shut-in NEET! Raw numbers don't tell the whole story. Look at the status tags. A 100k unit marked with !!Dropping!! or !!Black Market!! is a trap. Always check trajectory before offering!",
    actionLabel: "View Value List",
    actionChannel: "value-list"
  },
  {
    title: "The Smart Parser",
    body: "Don't manually search for every single unit like a peasant. Open the Analyzer and click the ^^Wand^^ (or press Ctrl+V anywhere) to paste raw Discord trade text. The parser builds the offer for you!",
    actionLabel: "Open Calculator",
    actionEvent: "open-analyzer"
  },
  {
    title: "Algorithmic Forecasting",
    body: "Inside the Analyzer, check the Short-Term and Long-Term flip scores. It mathematically weights unit demand and liquidity so you know if you are winning or getting completely scammed!",
    actionLabel: "Open Calculator",
    actionEvent: "open-analyzer"
  },
  {
    title: "Academy & Mock Simulator",
    body: "Want to test your trade judgment without risking real units? Go to the Academy to practice against real market scenarios! Don't come crying to me when you make a bad trade!",
    actionLabel: "Go to Academy",
    actionChannel: "tutorial"
  }
];

const AUTH_STEPS: GuideStep[] = [
  {
    title: "Your Vault & Wishlist",
    body: "You're officially registered! Head over to ^^My Inventory^^ to record your collection. Use the Pin icon to lock high-value units so you don't accidentally clear them in trades.",
    actionLabel: "Open My Inventory",
    actionChannel: "inventory"
  },
  {
    title: "Post Live Trading Ads",
    body: "Hit ^^Create Ad^^ on the Trading Board. You can list specific trades, take open offers, or showcase your entire public vault. Ads auto-expire so dead trades don't clutter the board.",
    actionLabel: "Go to Trading Board",
    actionChannel: "trading-ads"
  },
  {
    title: "Trader Reputation & Rank",
    body: "Your profile tracks your public reputation. Traders can upvote or downvote your listings based on fair pricing and communication. Don't be a scammer, or you'll get exiled! ^^Praise Aqua!^^",
    actionLabel: "View My Profile",
    actionChannel: "profile"
  }
];

export function AquaGuideOverlay({ 
  guideState, 
  onNext, 
  onPrev, 
  onEndGuide,
  isAnalyzerOpen = false
}: { 
  guideState: { type: GuideType; step: number }; 
  onNext: (maxSteps: number) => void;
  onPrev: () => void;
  onEndGuide: () => void;
  isAnalyzerOpen?: boolean;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [boxShake, setBoxShake] = useState(false);

  const fullTextRef = useRef("");
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIsMinimized(false);
  }, [guideState.type, guideState.step]);

  useEffect(() => {
    if (!guideState.type || guideState.step === 0) return;

    const steps = guideState.type === "guest_tour" ? GUEST_STEPS : AUTH_STEPS;
    const fullText = steps[guideState.step - 1]?.body || "";
    
    fullTextRef.current = fullText;
    setDisplayedText("");
    setIsTyping(true);
    setBoxShake(true);
    setTimeout(() => setBoxShake(false), 400);

    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

    let i = 0;
    typingIntervalRef.current = setInterval(() => {
      setDisplayedText(fullText.substring(0, i + 1));
      i++;
      if (i >= fullText.length) {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        setIsTyping(false);
      }
    }, 22);

    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, [guideState]);

  if (!guideState.type || (guideState.type !== "guest_tour" && guideState.type !== "auth_tour")) {
    return null;
  }

  const steps = guideState.type === "guest_tour" ? GUEST_STEPS : AUTH_STEPS;
  const currentStepData = steps[guideState.step - 1] || steps[0];
  const totalSteps = steps.length;
  const isLastStep = guideState.step >= totalSteps;

  const handleSkipTyping = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTyping) {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      setDisplayedText(fullTextRef.current);
      setIsTyping(false);
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    if (currentStepData.actionChannel) {
      window.document.dispatchEvent(new CustomEvent('navigate', { detail: currentStepData.actionChannel }));
    } else if (currentStepData.actionEvent) {
      window.dispatchEvent(new Event(currentStepData.actionEvent));
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    onNext(totalSteps);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    onPrev();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    onEndGuide();
  };

  const renderDialogue = (text: string) => {
    const parts = text.split(/(!!.*?!!|\^\^.*?\^\^|\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('!!') && part.endsWith('!!')) {
        return <strong key={idx} className="text-destructive font-black tracking-wide animate-text-shake">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('^^') && part.endsWith('^^')) {
        return <strong key={idx} className="text-[#FAA61A] font-black tracking-wide">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="text-foreground font-black tracking-wide">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx} className="text-foreground/80 font-bold not-italic">{part.slice(1, -1)}</em>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Keep widget above bottom nav on mobile, move it higher if analyzer is open
  const mobilePosClass = isAnalyzerOpen ? "bottom-[100px]" : "bottom-[90px]";

  return (
    <>
      <style>{`
        @keyframes textShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1px) translateY(-1px); }
          50% { transform: translateX(1px) translateY(1px); }
          75% { transform: translateX(-1px) translateY(1px); }
        }
        .animate-text-shake { display: inline-block; animation: textShake 0.15s infinite; }

        @keyframes boxShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-box-shake { animation: boxShake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>

      {/* Floating Corner Widget */}
      <aside 
        aria-label="Aqua Companion Guide"
        className={`fixed ${mobilePosClass} md:bottom-6 right-3 md:right-6 z-[100010] max-w-[420px] w-[calc(100vw-24px)] md:w-[420px] transition-all duration-300 ease-out animate-slide-up pointer-events-auto`}
      >
        {isMinimized ? (
          /* Minimized State */
          <div className="bg-card border border-border p-3 rounded-[8px] flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3">
              <img 
                src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" 
                alt="Aqua"
                className="w-8 h-8 rounded-full border border-border object-cover bg-popover shadow-sm shrink-0" 
              />
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-foreground leading-none">Goddess Aqua</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Step {guideState.step} of {totalSteps}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setIsMinimized(false)} className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer">
                Expand
              </button>
              <button onClick={handleDismiss} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Expanded State */
          <div className={`bg-card border border-border rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden ${boxShake ? 'animate-box-shake ring-1 ring-primary' : ''}`} onClick={handleSkipTyping}>
            
            {/* Header */}
            <div className="px-4 py-3 bg-popover border-b border-border flex items-center justify-between relative z-20">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img 
                    src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" 
                    alt="Aqua"
                    className="w-8 h-8 rounded-full border border-border object-cover bg-card shadow-sm shrink-0" 
                  />
                  <span className="w-2.5 h-2.5 bg-[#23a559] border border-popover rounded-full absolute bottom-0 right-0" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-black text-foreground leading-tight">Goddess Aqua</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Step {guideState.step} / {totalSteps}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                  className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground rounded-[4px] hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none"
                >
                  Collapse
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[4px] transition-colors cursor-pointer focus-visible:outline-none"
                  title="End Tour"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex flex-col md:flex-row items-stretch relative z-10 bg-card">
              {/* Character Art (Left side, hidden on small mobile) */}
              <div className="hidden md:flex w-[120px] shrink-0 border-r border-border/50 items-end justify-center bg-popover/30 relative">
                <img 
                   src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" 
                   className="w-[140px] max-w-none object-contain absolute bottom-0 -left-4 pointer-events-none drop-shadow-md"
                   alt="Aqua"
                />
              </div>

              {/* Text & Controls (Right side) */}
              <div className="flex-1 p-4 md:p-5 flex flex-col gap-3 min-w-0">
                <div className="flex flex-col gap-1">
                  <h4 className="text-[14px] font-black text-foreground tracking-tight flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> {currentStepData.title}
                  </h4>
                  <p className="text-[13px] text-muted-foreground leading-relaxed font-medium pt-0.5 min-h-[60px]">
                    {renderDialogue(displayedText)}
                    {isTyping && <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse ml-1 align-middle" />}
                  </p>
                </div>

                {/* Quick Action Button */}
                <div className="w-full mt-1">
                  {currentStepData.actionLabel && !isTyping && (
                    <button
                      onClick={handleAction}
                      className="w-full py-2.5 px-3 rounded-[6px] bg-muted hover:bg-popover border border-border text-foreground text-[11px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors cursor-pointer shadow-sm focus-visible:outline-none"
                    >
                      <span>{currentStepData.actionLabel}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                    </button>
                  )}
                  {isTyping && (
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 animate-pulse cursor-pointer h-[38px]">
                      <Zap className="w-3.5 h-3.5 text-primary" /> Click anywhere to skip typing...
                    </span>
                  )}
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
                  <button
                    onClick={handlePrev}
                    disabled={guideState.step <= 1}
                    className="px-3 py-1.5 rounded-[4px] text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer focus-visible:outline-none flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </button>

                  <button
                    onClick={handleNext}
                    className="px-4 py-1.5 rounded-[4px] bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm transition-colors cursor-pointer focus-visible:outline-none active:scale-95"
                  >
                    <span>{isLastStep ? "Finish" : "Next"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </aside>
    </>
  );
}