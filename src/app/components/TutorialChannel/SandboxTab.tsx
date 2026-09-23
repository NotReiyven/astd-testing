// ================================================
// FILE: src/app/components/TutorialChannel/SandboxTab.tsx
// ================================================

import React, { useState, useEffect, useMemo } from "react";
import { X, ArrowRight, Calculator, CheckCircle2, Circle, Lock, Wand2, ShieldCheck, Database, Megaphone, Award, Bookmark, BookOpen } from "lucide-react";
import { useTradeStore } from "../../../store/useTradeStore";
import { useInventoryStore } from "../../../store/useInventoryStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { triggerHaptic } from "../../../data/helpers";

interface SandboxTabProps {
  completedGuides: Record<string, boolean>;
}

const FIRE_ZIO_AVATAR = "/units/firezio.webp";

export function SandboxTab({ completedGuides }: SandboxTabProps) {
  const { giveItems, getItems, pinnedIds, presets } = useTradeStore();
  const { items, wishlistItems } = useInventoryStore();
  const { profile, loginWithDiscord } = useAuthStore();

  const [showCertificate, setShowCertificate] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("fundamentals");

  // Derived Task States
  const hasGiveGet = giveItems.length > 0 || getItems.length > 0;
  const hasPinned = pinnedIds.length > 0;
  const hasFiltered = !!completedGuides.hasFiltered;
  const hasUsedParser = !!completedGuides.hasUsedParser;
  const hasPresets = presets.length > 0;
  const hasPassedSim = !!completedGuides.hasPassedSim;

  const hasLogin = !!profile;
  const hasVault = items.length > 0;
  const hasWishlist = wishlistItems.length > 0;
  const hasPostedAd = !!completedGuides.hasPostedAd;

  const handleNavigate = (channel: string) => {
    triggerHaptic('light');
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: channel }));
  };

  const handleOpenCalc = () => {
    triggerHaptic('light');
    window.dispatchEvent(new Event("open-analyzer"));
  };

  const switchToSimulator = () => {
    triggerHaptic('light');
    window.dispatchEvent(new CustomEvent("set-tutorial-tab", { detail: "simulator" }));
  };

  const scrollToSection = (id: string) => {
    triggerHaptic('light');
    setActiveSection(id);
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const phase1Tasks = useMemo(() => [
    {
      id: "filter",
      title: "Market Research",
      desc: "Filter or sort the live Value List.",
      isDone: hasFiltered,
      action: (
        <button onClick={() => handleNavigate("value-list")} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-card border border-border text-foreground rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none">
          Value List <ArrowRight className="w-3 h-3" />
        </button>
      )
    },
    {
      id: "trade",
      title: "Build a Trade",
      desc: "Add any unit to the Calculator.",
      isDone: hasGiveGet,
      action: (
        <button onClick={() => handleNavigate("value-list")} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-card border border-border text-foreground rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none">
          Value List <ArrowRight className="w-3 h-3" />
        </button>
      )
    },
    {
      id: "pin",
      title: "Lock Assets",
      desc: "Pin a unit in the Calculator to prevent clearing.",
      isDone: hasPinned,
      action: (
        <button onClick={handleOpenCalc} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-card border border-border text-foreground rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none">
          <Calculator className="w-3.5 h-3.5" /> Calculator
        </button>
      )
    },
    {
      id: "parser",
      title: "Smart Import",
      desc: "Click the Wand to instantly import text trades.",
      isDone: hasUsedParser,
      action: (
        <button onClick={handleOpenCalc} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-card border border-border text-foreground rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none">
          <Wand2 className="w-3.5 h-3.5" /> Parser
        </button>
      )
    },
    {
      id: "preset",
      title: "Trade Loadouts",
      desc: "Click the Bookmark to save a trade layout.",
      isDone: hasPresets,
      action: (
        <button onClick={handleOpenCalc} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-card border border-border text-foreground rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none">
          <Bookmark className="w-3.5 h-3.5" /> Presets
        </button>
      )
    },
    {
      id: "sim",
      title: "Certification",
      desc: "Score points in the Mock Trade Simulator.",
      isDone: hasPassedSim,
      action: (
        <button onClick={switchToSimulator} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground border border-primary rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none shadow-sm">
          <Award className="w-3.5 h-3.5" /> Simulator
        </button>
      )
    }
  ], [hasFiltered, hasGiveGet, hasPinned, hasUsedParser, hasPresets, hasPassedSim]);

  const phase2Tasks = useMemo(() => [
    {
      id: "auth",
      title: "Authentication",
      desc: "Log in securely using Discord.",
      isDone: hasLogin,
      action: (
        <button onClick={() => { triggerHaptic('medium'); loginWithDiscord(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white border border-[#5865F2] rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none shadow-sm">
          Login
        </button>
      )
    },
    {
      id: "vault",
      title: "Vault Sync",
      desc: "Add an owned unit to your public Inventory.",
      isDone: hasVault,
      action: (
        <button onClick={() => handleNavigate("inventory")} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-card border border-border text-foreground rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none">
          <Database className="w-3.5 h-3.5" /> Inventory
        </button>
      )
    },
    {
      id: "wishlist",
      title: "Target Sourcing",
      desc: "Add a desired unit to your Wishlist.",
      isDone: hasWishlist,
      action: (
        <button onClick={() => handleNavigate("inventory")} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-card border border-border text-foreground rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none">
          <Database className="w-3.5 h-3.5" /> Wishlist
        </button>
      )
    },
    {
      id: "ads",
      title: "Market Maker",
      desc: "Publish a Live Trading Ad to the board.",
      isDone: hasPostedAd,
      action: (
        <button onClick={() => handleNavigate("trading-ads")} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-card border border-border text-foreground rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none">
          <Megaphone className="w-3.5 h-3.5" /> Board
        </button>
      )
    }
  ], [hasLogin, hasVault, hasWishlist, hasPostedAd, loginWithDiscord]);

  const totalTasks = phase1Tasks.length + phase2Tasks.length;
  const completedTasks = phase1Tasks.filter(t => t.isDone).length + phase2Tasks.filter(t => t.isDone).length;
  const progressPct = (completedTasks / totalTasks) * 100;
  
  const phase1Done = phase1Tasks.every(t => t.isDone);
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  useEffect(() => {
    if (phase1Done && !localStorage.getItem("astd_seen_cert_v2")) {
      setShowCertificate(true);
      localStorage.setItem("astd_seen_cert_v2", "true");
    }
  }, [phase1Done]);

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto pb-12 font-sans select-none animate-fade-in w-full">

      {showCertificate && (
         <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-popover border border-card p-8 md:p-12 relative max-w-3xl w-full shadow-2xl flex flex-col items-center text-center animate-slide-up rounded-[8px] overflow-hidden">
               <button 
                 onClick={() => setShowCertificate(false)} 
                 className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer"
               >
                 <X className="w-5 h-5" />
               </button>
               
               <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-destructive pointer-events-none"></div>
               <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-destructive pointer-events-none"></div>
               
               <h1 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-[0.2em] mb-2 font-serif text-shadow-sm">Official Trader License</h1>
               <p className="text-muted-foreground text-[12px] md:text-[14px] uppercase tracking-widest mb-1">ASTD Value List Academy</p>
               <p className="text-destructive text-[10px] md:text-[11px] font-mono tracking-widest mb-8 uppercase">Issued: {issueDate}</p>
               
               <p className="text-foreground/90 text-[14px] md:text-[16px] italic mb-8 max-w-lg leading-relaxed">
                 This certifies that the user has successfully mastered the platform fundamentals, demonstrating an elite understanding of the smart parser, loadouts, and live market valuation.
               </p>
               
               <div className="mt-2 pt-6 border-t border-border w-full flex justify-between items-end relative">
                  <div className="flex items-center gap-3 md:gap-4">
                     <img 
                       src={FIRE_ZIO_AVATAR} 
                       alt="Fire Zio" 
                       className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-border object-cover shadow-sm bg-muted"
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

      {/* DOCUMENTATION SIDEBAR NAVIGATION (Matching TheoryTab Style) */}
      <nav className="hidden md:flex flex-col w-56 shrink-0 sticky top-0 self-start pt-2">
        <div className="flex items-center gap-2.5 mb-6 text-foreground">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-[15px] font-black uppercase tracking-wider">Documentation</h2>
        </div>
        <div className="flex flex-col gap-1 border-l-2 border-border pl-4">
          <button 
            onClick={() => scrollToSection("fundamentals")}
            className={`text-left text-[13px] font-medium py-1.5 transition-colors focus-visible:outline-none cursor-pointer ${activeSection === "fundamentals" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
          >
            Trading Fundamentals
          </button>
          <button 
            onClick={() => scrollToSection("verified")}
            className={`text-left text-[13px] font-medium py-1.5 transition-colors focus-visible:outline-none cursor-pointer ${activeSection === "verified" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
          >
            Verified Trader
          </button>
        </div>
      </nav>

      {/* MAIN CHECKLIST CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">

        {/* Header & Progress */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[24px] font-black tracking-tight text-foreground">Academy Checklist</h2>
            <p className="text-muted-foreground text-[14px]">Complete these structured tasks to master the platform.</p>
          </div>
          
          <div className="flex flex-col gap-2 w-full md:w-64 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Overall Progress</span>
              <span className="font-mono text-foreground">{completedTasks}/{totalTasks}</span>
            </div>
            <div className="w-full h-2.5 bg-card border border-border rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-primary transition-all duration-700 ease-out" 
                style={{ width: `${progressPct}%` }} 
              />
            </div>
          </div>
        </div>

        {phase1Done && (
          <div className="bg-popover border-l-4 border-l-[#23a559] border-y border-y-border border-r border-r-border rounded-r-[8px] p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#23a559]/20 flex items-center justify-center border border-[#23a559]/30">
                <ShieldCheck className="w-4 h-4 text-[#23a559]" />
              </div>
              <span className="text-[14px] font-bold text-foreground">Fundamentals Completed</span>
            </div>
            <button 
              onClick={() => { triggerHaptic('light'); setShowCertificate(true); }}
              className="text-[12px] font-bold text-foreground hover:text-primary transition-colors underline underline-offset-2 cursor-pointer focus-visible:outline-none"
            >
              View Certificate
            </button>
          </div>
        )}

        {/* Phase 1 List (Fundamentals I) */}
        <div id="section-fundamentals" className="flex flex-col gap-3 scroll-mt-6">
          <span className="text-[12px] font-bold uppercase tracking-widest text-foreground pl-1">I. Trading Fundamentals</span>
          <div className="border border-border rounded-[8px] bg-card overflow-hidden shadow-sm flex flex-col">
             {phase1Tasks.map((task, i) => (
               <div key={task.id} className={`p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${i !== phase1Tasks.length - 1 ? 'border-b border-border' : ''} ${task.isDone ? 'bg-muted/30' : ''}`}>
                  <div className="flex-1 flex items-start gap-3.5">
                     {task.isDone ? <CheckCircle2 className="w-5 h-5 text-[#23a559] shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
                     <div className="flex flex-col">
                        <span className={`text-[14px] font-bold ${task.isDone ? 'text-foreground/80 line-through decoration-foreground/30' : 'text-foreground'}`}>{task.title}</span>
                        <span className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">{task.desc}</span>
                     </div>
                  </div>
                  <div className="shrink-0 sm:ml-auto">
                     {!task.isDone && task.action}
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Phase 2 List (Verified Trader / Fundamentals II) */}
        <div id="section-verified" className="flex flex-col gap-3 mt-4 scroll-mt-6">
          <div className="flex items-center gap-2 pl-1">
             <span className="text-[12px] font-bold uppercase tracking-widest text-foreground">II. Verified Trader</span>
             {!profile && <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-[4px] border border-border flex items-center gap-1 shadow-sm"><Lock className="w-3 h-3"/> Login Required</span>}
          </div>
          <div className={`border border-border rounded-[8px] bg-card overflow-hidden shadow-sm flex flex-col transition-opacity ${!profile ? 'opacity-50 pointer-events-none' : ''}`}>
             {phase2Tasks.map((task, i) => (
               <div key={task.id} className={`p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${i !== phase2Tasks.length - 1 ? 'border-b border-border' : ''} ${task.isDone ? 'bg-muted/30' : ''}`}>
                  <div className="flex-1 flex items-start gap-3.5">
                     {task.isDone ? <CheckCircle2 className="w-5 h-5 text-[#23a559] shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
                     <div className="flex flex-col">
                        <span className={`text-[14px] font-bold ${task.isDone ? 'text-foreground/80 line-through decoration-foreground/30' : 'text-foreground'}`}>{task.title}</span>
                        <span className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">{task.desc}</span>
                     </div>
                  </div>
                  <div className="shrink-0 sm:ml-auto pointer-events-auto">
                     {!task.isDone && task.action}
                  </div>
               </div>
             ))}
          </div>
        </div>

      </div>

    </div>
  );
}