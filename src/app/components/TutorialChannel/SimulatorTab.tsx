import React, { useState, useEffect } from "react";
import { Target, Zap, Timer, Sparkles, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { StaticStatusBadge } from "./TutorialUI";

const SCENARIOS = [
  {
    id: 1,
    title: "The Multi-Trash Offer",
    desc: "A desperate player offers quantity over quality.",
    give: { name: "S-Tier Legend", value: "150,000", status: "stable" },
    get: { name: "8x C-Tier Trash", value: "180,000", status: "dropping" },
    correct: "LOSS" as const,
    hint: "Raw value isn't everything. 8 dropping units will be worth nothing tomorrow.",
    explanation: "Never trade a stable S-tier for a pile of dropping, low-demand units. You will never be able to trade them away."
  },
  {
    id: 2,
    title: "The Shiny Tax",
    desc: "Trading a highly sought-after normal unit for a shiny variant.",
    give: { name: "High-Demand Meta", value: "40,000", status: "stable" },
    get: { name: "Low-Demand Shiny", value: "45,000", status: "varies" },
    correct: "LOSS" as const,
    hint: "Shinies look cool, but check the demand. Who is going to buy it from you?",
    explanation: "Shinies of bad units have terrible demand. You are trading a liquid asset for a complete brick."
  },
  {
    id: 3,
    title: "The Panic Sell",
    desc: "An update just nerfed a hyped unit. The owner is panic selling.",
    give: { name: "Classic Pure", value: "75,000", status: "stable" },
    get: { name: "Nerfed Meta Unit", value: "90,000", status: "dropping" },
    correct: "LOSS" as const,
    hint: "Catching a falling knife is dangerous. Why are they selling so cheap?",
    explanation: "The value hasn't updated yet to reflect the nerf. It's crashing. Hold onto your stable pure."
  },
  {
    id: 4,
    title: "The Long-Term Play",
    desc: "Trading slightly down in raw value for extreme scarcity.",
    give: { name: "Common S-Tier", value: "220,000", status: "unstable" },
    get: { name: "20-Copy Legend", value: "200,000", status: "stable" },
    correct: "WIN" as const,
    hint: "Supply is practically 0. Raw value might be lower, but it will never drop.",
    explanation: "Extremely low supply units have infinite leverage. You can essentially name your price later."
  }
];

export function SimulatorTab() {
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(false);
  const [simScore, setSimScore] = useState(0);
  const [simCombo, setSimCombo] = useState(0);
  const [simTimeLeft, setSimTimeLeft] = useState(100);
  const [aquaHint, setAquaHint] = useState<string | null>(null);
  const [currentScenario, setCurrentScenario] = useState(0);
  const [guessResult, setGuessResult] = useState<"none" | "correct" | "incorrect">("none");
  const [selectedGuess, setSelectedGuess] = useState<"WIN" | "FAIR" | "LOSS" | "TIME_OUT" | null>(null);

  useEffect(() => {
    if (!isSimulatorRunning || guessResult !== "none") return;
    const timer = setInterval(() => {
      setSimTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGuess("TIME_OUT");
          return 0;
        }
        return prev - 1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [isSimulatorRunning, guessResult]);

  const startSimulator = () => {
    setIsSimulatorRunning(true);
    setSimScore(0);
    setSimCombo(0);
    setSimTimeLeft(100);
    setCurrentScenario(0);
    setGuessResult("none");
    setSelectedGuess(null);
    setAquaHint(null);
  };

  const handleGuess = (guess: "WIN" | "FAIR" | "LOSS" | "TIME_OUT") => {
    setSelectedGuess(guess);
    if (guess === SCENARIOS[currentScenario].correct) {
      setGuessResult("correct");
      const timeBonus = Math.floor(1000 * (simTimeLeft / 100));
      const comboBonus = simCombo * 200;
      setSimScore(prev => prev + 500 + timeBonus + comboBonus);
      setSimCombo(prev => prev + 1);
    } else {
      setGuessResult("incorrect");
      setSimCombo(0);
    }
  };

  const nextScenario = () => {
    if (currentScenario >= SCENARIOS.length - 1) {
      setIsSimulatorRunning(false);
    } else {
      setGuessResult("none");
      setSelectedGuess(null);
      setAquaHint(null);
      setSimTimeLeft(100);
      setCurrentScenario(prev => prev + 1);
    }
  };

  return (
    <div className="animate-fade-in pb-4 max-w-4xl mx-auto">

      {!isSimulatorRunning && simScore === 0 ? (
        <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.06)] rounded-[14px] shadow-2xl p-8 md:p-12 text-center flex flex-col items-center">
          <div className="flex items-center gap-4 mb-6">
            <img src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" className="w-16 h-16 rounded-full border-2 border-[#5865F2] object-cover shadow-[0_0_20px_rgba(88,101,242,0.3)]" alt="Aqua" />
            <h2 className="text-[28px] font-black text-[#F2F3F5] uppercase tracking-tight">Goddess Aqua's Trade Simulator</h2>
          </div>
          <p className="text-[14px] text-[#B5BAC1] max-w-lg leading-relaxed mb-8">
            Test your trading intuition against realistic, high-stakes market scenarios. 
            Evaluate the trades as a <strong className="text-[#23a559]">Win</strong>, <strong className="text-[#F1C40F]">Fair</strong>, or <strong className="text-[#ed4245]">Loss</strong> before the timer runs out. 
            Don't fail, or I'll laugh at you!
          </p>
          <button 
            onClick={startSimulator}
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-10 py-4 rounded-[8px] text-[16px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-[0_8px_20px_rgba(88,101,242,0.4)] hover:shadow-[0_8px_30px_rgba(88,101,242,0.6)] flex items-center gap-3"
          >
            <Zap className="w-5 h-5" /> Start Training
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[10px] p-4 shadow-sm">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#80848E] block">Score</span>
                <span className="text-[20px] font-black font-mono text-[#F2F3F5] leading-none">{simScore.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#80848E] block">Combo</span>
                <span className={`text-[20px] font-black font-mono leading-none ${simCombo > 1 ? 'text-[#FAA61A]' : 'text-[#DBDEE1]'}`}>x{simCombo}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 w-1/3">
              <Timer className={`w-5 h-5 ${simTimeLeft < 30 ? 'text-[#ed4245] animate-pulse' : 'text-[#949BA4]'}`} />
              <div className="flex-1 h-2.5 bg-[#111214] rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)] shadow-inner">
                <div 
                  className={`h-full transition-all duration-100 ease-linear rounded-full ${simTimeLeft < 30 ? 'bg-[#ed4245]' : 'bg-[#5865F2]'}`}
                  style={{ width: `${simTimeLeft}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-[#2B2D31] p-5 md:p-8 rounded-[12px] border border-[rgba(255,255,255,0.06)] relative overflow-hidden shadow-md">
            {guessResult === "none" && (
              <button 
                onClick={() => setAquaHint(SCENARIOS[currentScenario].hint)} 
                className="absolute top-4 right-4 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-colors z-20"
              >
                <Sparkles className="w-3.5 h-3.5" /> Ask Aqua
              </button>
            )}

            <div className="mb-6 relative z-10">
              <span className="text-[11px] font-bold text-[#80848E] uppercase tracking-widest block mb-1">Scenario {currentScenario + 1} / {SCENARIOS.length}</span>
              <h3 className="text-[20px] font-black text-[#F2F3F5] uppercase tracking-wide">{SCENARIOS[currentScenario].title}</h3>
              <p className="text-[13px] text-[#949BA4] mt-1">{SCENARIOS[currentScenario].desc}</p>
            </div>

            {/* Sleek Ledger View */}
            <div className="flex flex-col gap-2 mb-8">
               <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-4 flex items-center justify-between border-l-4 border-l-[#FAA61A]">
                  <div>
                     <span className="text-[10px] font-bold uppercase tracking-widest text-[#80848E] block mb-1">You Give</span>
                     <div className="flex items-center gap-2">
                        <span className="text-[#F2F3F5] font-black text-[16px] tracking-tight">{SCENARIOS[currentScenario].give.name}</span>
                        <StaticStatusBadge status={SCENARIOS[currentScenario].give.status} />
                     </div>
                  </div>
                  <span className="text-[#DBDEE1] font-mono font-bold text-[16px]">{SCENARIOS[currentScenario].give.value}</span>
               </div>
               
               <div className="flex justify-center -my-3 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-[#111214] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
                     <ArrowRight className="w-3.5 h-3.5 text-[#80848E]" />
                  </div>
               </div>

               <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-4 flex items-center justify-between border-l-4 border-l-[#5865F2]">
                  <div>
                     <span className="text-[10px] font-bold uppercase tracking-widest text-[#80848E] block mb-1">You Get</span>
                     <div className="flex items-center gap-2">
                        <span className="text-[#F2F3F5] font-black text-[16px] tracking-tight">{SCENARIOS[currentScenario].get.name}</span>
                        <StaticStatusBadge status={SCENARIOS[currentScenario].get.status} />
                     </div>
                  </div>
                  <span className="text-[#DBDEE1] font-mono font-bold text-[16px]">{SCENARIOS[currentScenario].get.value}</span>
               </div>
            </div>

            {guessResult === "none" ? (
              <div className="flex flex-col items-center relative z-10 animate-fade-in">
                {aquaHint && (
                  <div className="mb-4 bg-[rgba(88,101,242,0.1)] border border-[rgba(88,101,242,0.3)] text-[#DBDEE1] text-[12.5px] px-4 py-2.5 rounded-[8px] w-full text-center italic">
                    "{aquaHint}"
                  </div>
                )}
                
                <h4 className="text-[12px] font-bold text-[#949BA4] mb-3 uppercase tracking-wider">Is this trade a Win, Fair, or Loss?</h4>
                <div className="flex bg-[#1E1F22] rounded-[8px] p-1 border border-[rgba(255,255,255,0.04)] w-full max-w-sm shadow-inner">
                   <button onClick={() => handleGuess("WIN")} className="flex-1 py-3 rounded-[6px] text-[#23a559] font-bold text-[14px] uppercase tracking-wider hover:bg-[rgba(35,165,89,0.1)] transition-colors focus-visible:outline-none">WIN</button>
                   <button onClick={() => handleGuess("FAIR")} className="flex-1 py-3 rounded-[6px] text-[#F1C40F] font-bold text-[14px] uppercase tracking-wider hover:bg-[rgba(241,196,15,0.1)] transition-colors focus-visible:outline-none">FAIR</button>
                   <button onClick={() => handleGuess("LOSS")} className="flex-1 py-3 rounded-[6px] text-[#ed4245] font-bold text-[14px] uppercase tracking-wider hover:bg-[rgba(237,66,69,0.1)] transition-colors focus-visible:outline-none">LOSS</button>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in">
                 <div className={`border-l-4 p-5 bg-[#1E1F22] rounded-r-[8px] text-left shadow-sm ${guessResult === "correct" ? 'border-[#23a559]' : 'border-[#ed4245]'}`}>
                    <div className="flex items-center gap-2 mb-2">
                       {guessResult === "correct" ? <CheckCircle2 className="w-5 h-5 text-[#23a559]" /> : <XCircle className="w-5 h-5 text-[#ed4245]" />}
                       <h4 className={`font-black text-[15px] uppercase tracking-wide ${guessResult === "correct" ? 'text-[#23a559]' : 'text-[#ed4245]'}`}>
                          {guessResult === "correct" ? "Correct Diagnosis" : selectedGuess === "TIME_OUT" ? "Time Expired" : "Critical Error"}
                       </h4>
                    </div>
                    
                    <p className="text-[#DBDEE1] text-[13px] leading-relaxed mb-4 pl-7">
                       {guessResult === "incorrect" && <strong className="text-[#ed4245] font-semibold">Goddess Aqua says: </strong>}
                       {SCENARIOS[currentScenario].explanation}
                    </p>
                    
                    <div className="pl-7">
                       <button onClick={nextScenario} className="px-5 py-2.5 bg-[#2B2D31] hover:bg-[#3F4147] text-[#F2F3F5] text-[12px] font-bold uppercase tracking-wider rounded-[6px] transition-colors shadow-sm focus-visible:outline-none">
                          {currentScenario >= SCENARIOS.length - 1 ? "Finish Training" : "Proceed to Next Scenario"}
                       </button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}