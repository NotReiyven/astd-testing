import React, { useState, useEffect } from "react";
import { GraduationCap, Award, X, Eye } from "lucide-react";
import { GuideType } from "../guides/AquaGuideOverlay";
import { useTradeStore } from "../../../store/useTradeStore";
import { MissionCard } from "./TutorialUI";

interface SandboxTabProps {
  startGuide: (type: GuideType) => void;
  completedGuides: Record<string, boolean>;
}

const FIRE_ZIO_AVATAR = "https://media.discordapp.net/attachments/1538970612947615744/1543320682430074971/image.png?ex=6a9470e4&is=6a931f64&hm=d97c87c7af214b524fdd41b313db6a4d45d5cf435046fc9a8a14fb307d258165&=&format=webp&quality=lossless";

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
  
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  useEffect(() => {
    if (allTasksDone && !hasTriggeredGraduation && !completedGuides["academy_grad"]) {
      setHasTriggeredGraduation(true);
      startGuide("academy_grad");
    }
  }, [allTasksDone, hasTriggeredGraduation, startGuide, completedGuides]);

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
            <div className="bg-[#1E1F22] border border-[#2B2D31] p-8 md:p-12 relative max-w-3xl w-full shadow-2xl flex flex-col items-center text-center animate-slide-up rounded-sm overflow-hidden">
               <button 
                 onClick={() => setShowCertificate(false)} 
                 className="absolute top-4 right-4 text-[#80848E] hover:text-[#F2F3F5] transition-colors focus-visible:outline-none"
               >
                  <X className="w-5 h-5" />
               </button>
               
               {/* Decorative border corners */}
               <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-[#5865F2] pointer-events-none"></div>
               <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-[#5865F2] pointer-events-none"></div>
               
               <GraduationCap className="w-16 h-16 text-[#5865F2] mb-6 drop-shadow-[0_0_15px_rgba(88,101,242,0.4)]" />
               <h1 className="text-2xl md:text-3xl font-black text-[#F2F3F5] uppercase tracking-[0.2em] mb-2 font-serif text-shadow-sm">Certificate of Mastery</h1>
               <p className="text-[#949BA4] text-[12px] md:text-[14px] uppercase tracking-widest mb-1">ASTD Value List Academy</p>
               <p className="text-[#5865F2] text-[10px] md:text-[11px] font-mono tracking-widest mb-8 uppercase">Issued: {issueDate}</p>
               
               <p className="text-[#DBDEE1] text-[14px] md:text-[16px] italic mb-8 max-w-lg leading-relaxed">
                 This certifies that the user has successfully completed the rigorous Trade Simulator and Technical Parsing protocol, demonstrating an elite understanding of market dynamics, liquidity forecasting, and platform UI navigation.
               </p>

               {/* Fire Zio Dialogue Block */}
               <div className="bg-[#111214] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-4 mb-8 w-full max-w-lg shadow-inner flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 text-[#ed4245]">
                    <Eye className="w-4 h-4" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Fire Zio's Observation</span>
                  </div>
                  <p className="text-[#949BA4] text-[13px] italic font-medium">
                    "I have been observing your trades... You are no longer getting completely scammed. Your inventory is finally acceptable. I approve."
                  </p>
               </div>
               
               <div className="mt-2 pt-6 border-t border-[rgba(255,255,255,0.06)] w-full flex justify-between items-end relative">
                  <div className="flex items-center gap-3 md:gap-4">
                     <img 
                       src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" 
                       alt="Aqua" 
                       className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-[rgba(255,255,255,0.1)] object-cover shadow-sm"
                     />
                     <div className="flex flex-col items-start md:items-start">
                        <span className="font-serif text-xl md:text-2xl text-[#F2F3F5] italic tracking-tight">Goddess Aqua</span>
                        <span className="text-[9px] md:text-[10px] text-[#80848E] uppercase tracking-widest mt-1">Lead Instructor</span>
                     </div>
                  </div>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] md:border-4 border-[#FAA61A] flex items-center justify-center text-[#FAA61A] font-black text-[10px] md:text-[12px] rotate-[-15deg] shadow-[0_0_20px_rgba(250,166,26,0.3)] select-none">
                     OFFICIAL
                  </div>
               </div>
            </div>
         </div>
      )}

      <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[12px] p-5 md:p-6 shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[rgba(255,255,255,0.04)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] flex items-center justify-center shadow-inner">
              <GraduationCap className="w-5 h-5 text-[#5865F2]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">Academy</span>
              <h2 className="text-[17px] font-black text-[#F2F3F5] tracking-tight">Graduation Checklist</h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#80848E] block mb-1">Progress</span>
              <span className="text-[13px] font-mono font-black text-[#DBDEE1]">{completedCount}/4 Completed</span>
            </div>
            <div className="w-28 h-2 bg-[#1E1F22] rounded-full overflow-hidden border border-[rgba(255,255,255,0.04)] shadow-inner">
              <div
                className="h-full bg-[#5865F2] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(completedCount / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MissionCard
            title="1. First Trade"
            instruction="Add any unit to Give or Get."
            hint="Go to the Value List, left/right click a unit."
            isDone={hasGiveGet}
            accent="#80848E"
          />
          <MissionCard
            title="2. Vault Lockout"
            instruction="Pin an active card inside the Calculator."
            hint="Click the Pin icon on an active trade card."
            isDone={hasPinned}
            accent="#80848E"
          />
          <MissionCard
            title="3. Market Analyst"
            instruction="Filter the Value List by Tier or Status."
            hint="Use the top dropdowns in the Value List."
            isDone={hasFiltered}
            accent="#80848E"
          />
          <MissionCard
            title="4. Advanced Telecom"
            instruction="Import a trade using the Smart Parser."
            hint="Click the Wand icon in the Calculator."
            isDone={hasUsedParser}
            accent="#80848E"
          />
        </div>

        {allTasksDone && (
          <div className="mt-4 p-4 rounded-[8px] bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3.5">
              <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[#ed4245] object-cover shrink-0 bg-[#1e1f22]" alt="Fire Zio" />
              <div className="flex flex-col">
                <span className="text-[13px] font-black text-[#ed4245] uppercase tracking-wide block">Fire Zio Approved</span>
                <span className="text-[12px] text-[#949BA4] italic">"You survived the academy. Claim your license before I change my mind."</span>
              </div>
            </div>
            <button
              onClick={() => setShowCertificate(true)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-[4px] bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(88,101,242,0.4)] transition-all active:scale-95 shrink-0 border border-[#5865F2]"
            >
              View Honors
            </button>
          </div>
        )}
      </div>
    </div>
  );
}