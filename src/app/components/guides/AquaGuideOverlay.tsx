import { useState, useEffect, useRef } from "react";
import { Sparkles, ChevronRight, Zap, MousePointer2 } from "lucide-react";

export type GuideType = "main" | "channels" | "advanced" | "developer" | "filters" | "dictionary" | "stats" | "management" | "annoyed" | "academy_grad" | null;

export const AQUA_DIALOGUES: Record<string, string[]> = {
  main: [
    "",
    "Listen up, you shut-in NEET! I, the beautiful and wise Goddess Aqua, have descended to save you from getting !!completely scammed!!! First, click the ^^Value List^^ channel in the sidebar so we can begin!",
    "Hmph, even someone with your pitiful intelligence stat can do this part. Let's build a mock trade. If you're on a PC, ^^Left-click^^ a unit for your *Give* side, or ^^Right-click^^ for your *Get* side! On mobile? Just ^^tap^^ the card! !!Don't mess this up!!!",
    "!!W-Wait! Don't just accept a trade blindly!!! Are you trying to lose all your value?! Use the divine tool I've graciously bestowed upon you! Click that glowing ^^Calculator^^ button right now to open the Analyzer!",
    "See?! It instantly breaks down the value differences and market momentum! But wait—you're not done! I've enrolled you in the Academy to finish your training. Go complete your Graduation Checklist!"
  ],
  channels: [
    "",
    "Lost, are we? Typical. Pay attention to the sidebar on the left! ^^Home^^ has patch notes, ^^Tutorial^^ is where you learn how to trade, and ^^Extra Notices^^ has crucial market rules you probably ignored!"
  ],
  advanced: [
    "",
    "Want to be a pro? The Academy Sandbox tracks your progress. Go finish your Graduation Checklist before you bother me again!"
  ],
  developer: [
    "",
    "Oh, you want to know who built this shrine to my greatness? It was my loyal head developer, ^^Reiyven!^^ He spent way too much time coding this instead of going outside."
  ],
  filters: [
    "",
    "Don't just blindly scroll! Open the ^^Status Dropdown^^ and filter out the trash! Holding onto !!Dropping!! units is a one-way ticket to being as broke as I am! Read the Market Theory tab if you're confused!"
  ],
  dictionary: [
    "",
    "I'm a Goddess, not a mind reader! Click the ^^Wand^^ icon in the Calculator to open the Smart Parser. It uses the exact Dictionary logic you can test in the Academy! Teach me your weird abbreviations!"
  ],
  stats: [
    "",
    "Stop staring at the raw value like an idiot! Read the ^^Market Theory^^ tab to understand Rarity, Supply, and Demand. High value means nothing if the unit has terrible Demand!"
  ],
  management: [
    "",
    "Listen closely! When testing offers, click the ^^Pin^^ icon on your 'Give' units. That way, when you clear the board, your core inventory stays put! The Academy tracks this, so go do it!"
  ],
  annoyed: [
    "",
    "!!Stop poking me!!! Figure it out yourself or go bother ^^Reiyven^^ with a support ticket! I have Goddess things to do!"
  ],
  academy_grad: [
    "",
    "Oh ho? You actually completed the Graduation Checklist?! I didn't think a NEET like you had the attention span!",
    "I guess my divine guidance is just *that* good! You're officially a certified trader now. Don't go losing all your value, or I'll laugh at you! ^^Praise Aqua!^^"
  ]
};

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

    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(fullText.substring(0, i + 1));
      i++;
      if (i >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 22);

    return () => clearInterval(interval);
  }, [guideState]);

  const handleSkipOrFastForward = () => {
    if (isTyping) {
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
        return <strong key={idx} className="text-[#ed4245] font-black tracking-wide animate-text-shake">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('^^') && part.endsWith('^^')) {
        return <strong key={idx} className="text-[#5865F2] font-black tracking-wide">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="text-white font-black tracking-wide">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx} className="text-[#DBDEE1] font-bold not-italic">{part.slice(1, -1)}</em>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  if (!guideState.type) return null;

  const isMainStep4 = guideState.type === "main" && guideState.step === 4;

  // Event-Driven Progression check
  let actionPrompt = "";
  if (!isTyping && guideState.type === "main") {
    if (guideState.step === 1) actionPrompt = "Click 'Value List' in the sidebar";
    if (guideState.step === 2) actionPrompt = "Add any unit to your trade";
    if (guideState.step === 3) actionPrompt = "Click the Calculator button";
  }
  const needsInteraction = !!actionPrompt;

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

      {/* Dynamic Spotlight Backdrop */}
      <div 
        className={`fixed inset-0 z-[99998] transition-all duration-500 ${
          needsInteraction 
            ? 'pointer-events-none bg-black/60 backdrop-blur-[2px]' // Let clicks pass to elevated App components
            : 'pointer-events-auto bg-black/80 backdrop-blur-[4px]' // Block clicks
        }`} 
        onClick={handleSkipOrFastForward} 
      />

      <div className="fixed inset-0 z-[100005] pointer-events-none flex items-end justify-center pb-8 md:pb-12 px-4">
        <div className={`relative w-full max-w-[800px] flex items-end drop-shadow-2xl animate-slide-up ${needsInteraction ? 'pointer-events-none' : 'pointer-events-auto'}`} onClick={handleSkipOrFastForward}>

           {/* Integrated Aqua Sprite with CSS Mask Gradient */}
           <div className="hidden md:block w-[240px] shrink-0 relative z-20 pointer-events-none animate-aqua-float">
              <img 
                 src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" 
                 className="absolute bottom-[-10px] right-[-20px] w-[300px] max-w-none object-contain drop-shadow-2xl"
                 style={{ 
                   WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 95%)', 
                   maskImage: 'linear-gradient(to bottom, black 65%, transparent 95%)' 
                 }}
                 alt="Aqua"
              />
           </div>

           {/* Discord-Themed Dialog Box */}
           <div 
             className={`bg-[#2B2D31] border border-[rgba(255,255,255,0.06)] p-6 md:p-8 rounded-[12px] flex-1 relative z-10 min-h-[160px] flex flex-col transition-all duration-300 pointer-events-auto shadow-[0_20px_60px_rgba(0,0,0,0.6)] ${boxShake ? 'animate-box-shake ring-2 ring-[#ed4245]/50' : ''}`}
           >

             {/* Integrated Nameplate */}
             <div className="absolute -top-3.5 left-6 bg-[#1E1F22] border border-[rgba(255,255,255,0.08)] px-3 py-1 rounded-[6px] shadow-lg flex items-center gap-2 z-20">
               <span className={`font-bold text-[14px] tracking-wide ${boxShake ? 'text-[#ed4245]' : 'text-[#F2F3F5]'}`}>
                 Goddess Aqua
               </span>
               <span className="bg-[#5865F2] text-white text-[9px] px-1.5 py-0.5 rounded-[4px] font-black uppercase tracking-wider flex items-center gap-1">
                 <Sparkles className="w-2.5 h-2.5" /> SYSTEM
               </span>
             </div>

             {/* Mobile Avatar Fallback */}
             <div className="flex items-center gap-3 mb-3 md:hidden pt-2">
               <img 
                 src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" 
                 className="w-10 h-10 rounded-full border border-[rgba(255,255,255,0.1)] object-cover bg-[#1E1F22] shadow-md"
                 alt="Aqua"
               />
               <span className="text-xs font-bold text-[#F2F3F5] uppercase tracking-widest">Goddess Aqua</span>
             </div>

             {/* Dialogue Text */}
             <p className="text-[#B5BAC1] text-[15px] md:text-[16px] leading-[1.7] min-h-[70px] pt-2 select-none">
               {renderDialogue(displayedText)}
               {isTyping && <span className="inline-block w-1.5 h-4 bg-[#5865F2] animate-pulse ml-1 align-middle" />}
             </p>

             {/* Footer Actions */}
             <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between">
               <div className="flex-1 flex items-center gap-3">

                 {/* State 1: Typing Indicator */}
                 {isTyping && (
                   <span className="text-[12px] font-medium text-[#80848E] flex items-center gap-1.5 animate-pulse cursor-pointer">
                     <Zap className="w-3.5 h-3.5 text-[#5865F2]" /> Click anywhere to skip text...
                   </span>
                 )}

                 {/* State 2: Requires UI Interaction (Event-Driven) */}
                 {needsInteraction && !isTyping && (
                   <div className="flex items-center gap-2 text-[#FAA61A] text-[12.5px] font-bold tracking-wide animate-pulse">
                     <MousePointer2 className="w-4 h-4" />
                     {actionPrompt}...
                   </div>
                 )}

                 {/* State 3: Free to Advance */}
                 {!needsInteraction && !isTyping && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleEndMainGuide(); }} 
                     className="group flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-2 px-5 rounded-[6px] transition-all duration-300 active:scale-95 shadow-md focus-visible:outline-none animate-fade-in"
                   >
                     <span>{isMainStep4 ? "Go to Academy" : guideState.type === "academy_grad" ? "Praise Aqua! (Finish)" : "Got it!"}</span>
                     <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </button>
                 )}
               </div>

               {/* Optional Skip Button */}
               <button 
                 onClick={(e) => { e.stopPropagation(); onEndGuide(); }} 
                 className="text-[#80848E] hover:text-[#DBDEE1] text-[11.5px] font-bold uppercase tracking-wider transition-colors px-3 py-1.5 rounded-[4px] hover:bg-[rgba(255,255,255,0.05)] focus-visible:outline-none"
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