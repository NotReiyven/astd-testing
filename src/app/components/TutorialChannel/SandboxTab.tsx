import React, { useState, useEffect } from "react";
import { GraduationCap, X, ArrowRight, Calculator } from "lucide-react";
import { GuideType } from "../guides/AquaGuideOverlay";
import { useTradeStore } from "../../../store/useTradeStore";
import { MissionCard } from "./TutorialUI";

interface SandboxTabProps {
  startGuide: (type: GuideType) => void;
  completedGuides: Record<string, boolean>;
}

const FIRE_ZIO_AVATAR = "/units/firezio.webp";

export function SandboxTab({
  startGuide,
  completedGuides
}: SandboxTabProps) {
  const { giveItems, getItems, pinnedIds } = useTradeStore();
  const [hasTriggeredGraduation, setHasTriggeredGraduation] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  const hasGiveGet = giveItems.length > 0 || getItems.length > 0;
  const hasPinned = pinnedIds.length > 0;
  const hasFiltered = !!completedGuides.hasFiltered;
  const hasUsedParser = !!completedGuides.hasUsedParser;

  const completedCount = (hasGiveGet ? 1 : 0) + (hasPinned ? 1 : 0) + (hasFiltered ? 1 : 0) + (hasUsedParser ? 1 : 0);
  const allTasksDone = completedCount === 4;
  const isGraduated = !!completedGuides["academy_grad"];
  
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  useEffect(() => {
    if (allTasksDone && !hasTriggeredGraduation && !isGraduated) {
      setHasTriggeredGraduation(true);
      startGuide("academy_grad");
    }
  }, [allTasksDone, hasTriggeredGraduation, startGuide, isGraduated]);

  useEffect(() => {
    if (isGraduated && !localStorage.getItem("astd_seen_cert")) {
      setShowCertificate(true);
      localStorage.setItem("astd_seen_cert", "true");
    }
  }, [isGraduated]);

  const handleNavigate = (channel: string) => {
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: channel }));
  };

  const handleOpenCalc = () => {
    window.dispatchEvent(new Event("open-analyzer"));
  };

  const switchToSimulator = () => {
    window.dispatchEvent(new CustomEvent("set-tutorial-tab", { detail: "simulator" }));
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-8 font-sans select-none">
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {showCertificate && (
         <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-popover border border-card p-8 md:p-12 relative max-w-3xl w-full shadow-2xl flex flex-col items-center text-center animate-slide-up rounded-sm overflow-hidden">
               <button 
                 onClick={() => setShowCertificate(false)} 
                 className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
               >
                  <X className="w-5 h-5" />
               </button>
               
               <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-destructive pointer-events-none"></div>
               <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-destructive pointer-events-none"></div>
               
               <h1 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-[0.2em] mb-2 font-serif text-shadow-sm">Official Trader License</h1>
               <p className="text-muted-foreground text-[12px] md:text-[14px] uppercase tracking-widest mb-1">ASTD Value List Academy</p>
               <p className="text-destructive text-[10px] md:text-[11px] font-mono tracking-widest mb-8 uppercase">Issued: {issueDate}</p>
               
               <p className="text-foreground/90 text-[14px] md:text-[16px] italic mb-8 max-w-lg leading-relaxed">
                 This certifies that the user has successfully completed the rigorous Trade Simulator and Technical Parsing protocol, demonstrating an elite understanding of market dynamics, liquidity forecasting, and platform UI navigation.
               </p>
               
               <div className="mt-2 pt-6 border-t border-border w-full flex justify-between items-end relative">
                  <div className="flex items-center gap-3 md:gap-4">
                     <img 
                       src={FIRE_ZIO_AVATAR} 
                       alt="Fire Zio" 
                       className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-border object-cover shadow-sm"
                     />
                     <div className="flex flex-col items-start md:items-start">
                        <span className="font-serif text-xl md:text-2xl text-destructive italic tracking-tight">Fire Zio</span>
                        <span className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Chief Market Analyst</span>
                     </div>
                  </div>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] md:border-4 border-destructive flex items-center justify-center text-destructive font-black text-[10px] md:text-[12px] rotate-[-15deg] shadow-[0_0_20px_rgba(237,66,69,0.3)] select-none">
                     VERIFIED
                  </div>
               </div>
            </div>
         </div>
      )}

      {isGraduated ? (
        <div className="bg-popover border-l-4 border-l-destructive border-y border-y-border border-r border-r-border rounded-r-[8px] p-6 shadow-xl flex flex-col items-start gap-4 max-w-3xl mx-auto mt-6">
           <div className="flex items-center gap-3 w-full border-b border-border pb-4">
             <img src={FIRE_ZIO_AVATAR} className="w-12 h-12 rounded-full border-2 border-destructive object-cover shrink-0 bg-card" alt="Fire Zio" />
             <div className="flex flex-col">
               <h2 className="text-[18px] font-black text-foreground uppercase tracking-wide">Academy Completed</h2>
               <span className="text-[11px] font-bold text-destructive uppercase tracking-widest">Clearance Granted</span>
             </div>
           </div>
           <p className="text-muted-foreground text-[13px] italic font-medium leading-relaxed mb-2">
             "You've mastered the interface and the parser. Now it's time to put your market knowledge to the test. Will you survive my real-world trading scenarios?"
           </p>
           
           <div className="flex flex-col sm:flex-row items-center gap-4 w-full pt-4 border-t border-border">
             <button 
               onClick={() => setShowCertificate(true)} 
               className="w-full sm:w-auto px-6 py-2.5 rounded-[4px] bg-card hover:bg-card/80 text-foreground/90 font-bold text-[12px] uppercase tracking-wider transition-colors border border-border focus-visible:outline-none"
             >
               View Honors
             </button>
             <button 
               onClick={switchToSimulator} 
               className="w-full sm:w-auto px-6 py-2.5 rounded-[4px] bg-card hover:bg-card/80 text-foreground font-bold text-[12px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-border focus-visible:outline-none"
             >
               Start Simulator <ArrowRight className="w-4 h-4" />
             </button>
           </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-[8px] p-5 md:p-6 shadow-sm relative overflow-hidden animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[6px] bg-popover border border-border flex items-center justify-center shadow-inner">
                <GraduationCap className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Academy</span>
                <h2 className="text-[17px] font-black text-foreground tracking-tight">Chud Trader Graduation Checklist</h2>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Progress</span>
                <span className="text-[13px] font-mono font-black text-foreground/90">{completedCount}/4 Completed</span>
              </div>
              <div className="w-28 h-2 bg-popover rounded-full overflow-hidden border border-border shadow-inner">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(completedCount / 4) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MissionCard
              title="1. First Trade"
              instruction="Add any unit to Give or Get."
              hint="Click or tap any unit card to open its menu."
              isDone={hasGiveGet}
              accent="var(--muted-foreground)"
              action={
                <button onClick={() => handleNavigate("value-list")} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-popover border border-border text-foreground/90 hover:text-foreground rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors">
                  Value List <ArrowRight className="w-3.5 h-3.5" />
                </button>
              }
            />
            <MissionCard
              title="2. Vault Lockout"
              instruction="Pin an active card inside the Calculator."
              hint="Click the Pin icon on an active trade card."
              isDone={hasPinned}
              accent="var(--muted-foreground)"
              action={
                <button onClick={handleOpenCalc} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-popover border border-border text-foreground/90 hover:text-foreground rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors">
                  <Calculator className="w-3.5 h-3.5" /> Open Calc
                </button>
              }
            />
            <MissionCard
              title="3. Market Analyst"
              instruction="Filter the Value List by Tier or Status."
              hint="Use the dropdowns/buttons at the top of the Value List."
              isDone={hasFiltered}
              accent="var(--muted-foreground)"
              action={
                <button onClick={() => handleNavigate("value-list")} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-popover border border-border text-foreground/90 hover:text-foreground rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors">
                  Value List <ArrowRight className="w-3.5 h-3.5" />
                </button>
              }
            />
            <MissionCard
              title="4. Advanced Telecom"
              instruction="Import a trade using the Smart Parser."
              hint="Click the Wand icon in the Calculator."
              isDone={hasUsedParser}
              accent="var(--muted-foreground)"
              action={
                <button onClick={handleOpenCalc} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-popover border border-border text-foreground/90 hover:text-foreground rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors">
                  <Calculator className="w-3.5 h-3.5" /> Open Calc
                </button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}