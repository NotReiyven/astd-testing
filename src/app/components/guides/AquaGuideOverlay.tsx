import { useState, useEffect, useRef } from "react";
import { Sparkles, ChevronRight, Zap, MousePointer2 } from "lucide-react";
import { AQUA_DIALOGUES } from "../../../data";

export type GuideType = "main" | "channels" | "advanced" | "developer" | "filters" | "dictionary" | "stats" | "management" | "annoyed" | "academy_grad" | null;

export function AquaGuideOverlay({ 
  guideState, 
  onEndGuide 
}: { 
  guideState: { type: GuideType; step: number }; 
  onEndGuide: () => void 
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [boxShake, setBoxShake] = useState(false);
  
  const fullTextRef = useRef("");
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!guideState.type || guideState.step === 0) return;

    if ((guideState.type === "main" && guideState.step === 3) || guideState.type === "annoyed") {
      setBoxShake(true);
      setTimeout(() => setBoxShake(false), 500);
    }

    const fullText = AQUA_DIALOGUES[guideState.type]?.[guideState.step] || "";
    fullTextRef.current = fullText;
    setDisplayedText("");
    setIsTyping(true);

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

  const handleSkipOrFastForward = () => {
    if (isTyping) {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      setDisplayedText(fullTextRef.current);
      setIsTyping(false);
    }
  };

  const handleEndMainGuide = () => {
    if (guideState.type === "main" && guideState.step === 4) {
      window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'tutorial' }));
      window.dispatchEvent(new CustomEvent("set-tutorial-tab", { detail: "sandbox" }));
    }
    onEndGuide();
  };

  const renderDialogue = (text: string) => {
    const parts = text.split(/(!!.*?!!|\^\^.*?\^\^|\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('!!') && part.endsWith('!!')) {
        return <strong key={idx} className="text-destructive font-black tracking-wide animate-text-shake">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('^^') && part.endsWith('^^')) {
        return <strong key={idx} className="text-primary font-black tracking-wide">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="text-foreground font-black tracking-wide">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx} className="text-card-foreground font-bold not-italic">{part.slice(1, -1)}</em>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  if (!guideState.type) return null;

  const isMainStep4 = guideState.type === "main" && guideState.step === 4;

  let actionPrompt = "";
  if (!isTyping && guideState.type === "main") {
    if (guideState.step === 1) actionPrompt = "Click 'Value List' in the sidebar";
    if (guideState.step === 2) actionPrompt = "Click a unit card to add it";
    if (guideState.step === 3) actionPrompt = "Open the Analyzer";
  }
  const needsInteraction = !!actionPrompt;

  let dynamicAlignment = "items-center md:items-end pb-0 md:pb-12";
  if (guideState.type === "main") {
    if (guideState.step === 1) {
      dynamicAlignment = "items-start pt-14 md:items-end md:pb-12";
    } else if (guideState.step === 2) {
      dynamicAlignment = "items-end pb-[90px] md:pb-12";
    } else {
      dynamicAlignment = "items-center md:items-end md:pb-12";
    }
  } else if (guideState.type === "filters" || guideState.type === "stats" || guideState.type === "channels") {
    dynamicAlignment = "items-end pb-[90px] md:pb-12";
  } else if (guideState.type === "dictionary" || guideState.type === "management" || guideState.type === "advanced") {
    dynamicAlignment = "items-start pt-[110px] md:pt-0 md:items-end md:pb-12";
  }

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

        @keyframes aquaFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(1deg); }
        }
        .animate-aqua-float { animation: aquaFloat 4s ease-in-out infinite; }

        @keyframes boxShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-box-shake { animation: boxShake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>

      <div 
        className={`fixed inset-0 z-[99998] transition-all duration-500 ${
          needsInteraction 
            ? 'pointer-events-none bg-black/60 backdrop-blur-[2px]' 
            : 'pointer-events-auto bg-black/80 backdrop-blur-[4px]'
        }`} 
        onClick={handleSkipOrFastForward} 
      />

      <div className={`fixed inset-0 z-[100005] pointer-events-none flex justify-center px-3 sm:px-4 md:px-8 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${dynamicAlignment}`}>
        <div className={`relative w-full max-w-[700px] flex items-center md:items-end drop-shadow-2xl animate-slide-up ${needsInteraction ? 'pointer-events-none' : 'pointer-events-auto'}`} onClick={handleSkipOrFastForward}>

           <div className="hidden md:block relative z-20 pointer-events-none animate-aqua-float shrink-0 -mr-6 -mb-2">
              <img 
                 src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" 
                 className="w-[220px] object-contain drop-shadow-[10px_10px_20px_rgba(0,0,0,0.5)]"
                 alt="Aqua"
              />
           </div>

           <div 
             className={`bg-card border border-border p-4 sm:p-5 md:p-8 rounded-[12px] flex-1 relative z-10 w-full min-h-[140px] flex flex-col transition-all duration-300 pointer-events-auto shadow-[0_20px_60px_rgba(0,0,0,0.6)] ${boxShake ? 'animate-box-shake ring-2 ring-destructive/50' : ''}`}
           >

              <div className="absolute -top-3.5 left-5 md:left-6 bg-popover border border-border px-3 py-1 rounded-[6px] shadow-lg flex items-center gap-2 z-20">
                <span className={`font-bold text-[13px] md:text-[14px] tracking-wide ${boxShake ? 'text-destructive' : 'text-foreground'}`}>
                  Goddess Aqua
                </span>
                <span className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded-[4px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-2.5 h-2.5" /> SYSTEM
                </span>
              </div>

              <div className="flex items-center gap-2.5 mb-2 md:hidden pt-1">
                <img 
                  src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" 
                  className="w-8 h-8 rounded-full border border-border object-cover bg-popover shadow-sm"
                  alt="Aqua"
                />
                <span className="text-[11px] font-bold text-foreground uppercase tracking-widest">Goddess Aqua</span>
              </div>

              <p className="text-muted-foreground text-[13px] sm:text-[14px] md:text-[16px] leading-[1.6] md:leading-[1.7] min-h-[60px] pt-1 select-none font-medium">
                {renderDialogue(displayedText)}
                {isTyping && <span className="inline-block w-1.5 h-3.5 md:h-4 bg-primary animate-pulse ml-1 align-middle" />}
              </p>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                <div className="flex-1 flex items-center gap-2 min-w-0">

                  {isTyping && (
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 animate-pulse cursor-pointer truncate">
                      <Zap className="w-3.5 h-3.5 text-primary shrink-0" /> 
                      <span className="truncate">Click to skip...</span>
                    </span>
                  )}

                  {needsInteraction && !isTyping && (
                    <div className="flex items-center gap-1.5 text-[#FAA61A] text-[11px] sm:text-[12.5px] font-bold tracking-wide animate-pulse truncate">
                      <MousePointer2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{actionPrompt}...</span>
                    </div>
                  )}

                  {!needsInteraction && !isTyping && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEndMainGuide(); }} 
                      className="group flex items-center gap-1.5 bg-primary hover:bg-primary/80 text-primary-foreground font-bold py-2 px-4 rounded-[6px] transition-all duration-300 active:scale-95 shadow-sm border border-border focus-visible:outline-none animate-fade-in shrink-0"
                    >
                      <span className="text-[12.5px] sm:text-[14px]">{isMainStep4 ? "Go to Academy" : guideState.type === "academy_grad" ? "Praise Aqua!" : "Got it!"}</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); onEndGuide(); }} 
                  className="text-muted-foreground hover:text-foreground text-[10px] sm:text-[11.5px] font-bold uppercase tracking-wider transition-colors px-2.5 py-1 rounded-[4px] hover:bg-white/5 focus-visible:outline-none shrink-0"
                >
                  Skip
                </button>
              </div>

           </div>
        </div>
      </div>
    </>
  );
}