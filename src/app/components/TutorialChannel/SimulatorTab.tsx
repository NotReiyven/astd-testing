import React, { useState, useCallback } from "react";
import { ArrowRight, HelpCircle, Sparkles, Activity, AlertTriangle, RotateCcw, BookOpen, List } from "lucide-react";
import { StaticStatusBadge } from "./TutorialUI";
import { useUnits } from "../../../context/UnitContext";
import { MasterUnit } from "../../../types";
import { getProxyImage } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";
import { useTradeStore } from "../../../store/useTradeStore";
import { buildScenariosList, Scenario } from "./simulatorEngine";

const FIRE_ZIO_AVATAR = "/units/firezio.webp";

const ScenarioUnitDisplay = ({ unit, qty }: { unit: MasterUnit; qty: number }) => {
  const proxyUrl = getProxyImage(unit.id);
  const totalVal = (unit.value as number) * qty;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10 rounded-[6px] bg-[#1e2124] border border-[#424549] flex items-center justify-center shrink-0">
        {qty > 1 && (
          <div className="absolute -top-2 -right-2 bg-[#7289da] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full z-20 border-2 border-[#1e2124] shadow-sm">
            x{qty}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[12px] z-0" style={getAvatarStyle(unit.name)}>
          {getInitials(unit.name)}
        </div>
        {proxyUrl && (
          <img 
            src={proxyUrl} 
            alt={unit.name} 
            className="absolute inset-0 w-full h-full object-cover z-10 bg-[#1e2124]" 
            onError={(e) => { e.currentTarget.style.opacity = '0'; }}
          />
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
         <span className="text-[13.5px] font-bold text-[#ffffff] truncate">{unit.name}</span>
         <span className="text-[10px] font-medium text-[#b9bbbe] uppercase tracking-wider truncate">{unit.subtitle || "Official Unit"}</span>
      </div>
      <div className="flex flex-col items-end shrink-0 gap-1">
         <span className="text-[13px] font-mono font-bold text-[#ffffff]">{totalVal.toLocaleString()}</span>
         <StaticStatusBadge status={unit.status || "stable"} />
      </div>
    </div>
  );
};

export function SimulatorTab() {
  const { units: ALL_UNITS, isLoading } = useUnits();
  const { overwrite } = useTradeStore();
  
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(false);
  const [isAssessmentComplete, setIsAssessmentComplete] = useState(false);
  
  const [simScore, setSimScore] = useState(0);
  const [simCombo, setSimCombo] = useState(0);
  const [currentScenario, setCurrentScenario] = useState(0);
  const [guessResult, setGuessResult] = useState<"none" | "correct" | "incorrect" | "unreasonable">("none");
  const [aquaHint, setAquaHint] = useState<boolean>(false);

  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const loadScenarioIntoAnalyzer = useCallback((scenario: Scenario) => {
    if (!scenario) return;
    const giveCard = { id: scenario.give.unit.id, name: scenario.give.unit.name, subtitle: scenario.give.unit.subtitle, value: scenario.give.unit.value as number, qty: scenario.give.qty };
    const getCard = { id: scenario.get.unit.id, name: scenario.get.unit.name, subtitle: scenario.get.unit.subtitle, value: scenario.get.unit.value as number, qty: scenario.get.qty };
    overwrite([giveCard], [getCard]);
  }, [overwrite]);

  const startSimulator = () => {
    const freshScenarios = buildScenariosList(ALL_UNITS);
    if (freshScenarios.length === 0) return;

    setScenarios(freshScenarios);
    setIsSimulatorRunning(true);
    setIsAssessmentComplete(false);
    setSimScore(0);
    setSimCombo(0);
    setCurrentScenario(0);
    setGuessResult("none");
    setAquaHint(false);
    
    loadScenarioIntoAnalyzer(freshScenarios[0]);
  };

  const handleGuess = (guess: "WIN" | "LOSS" | "UNREASONABLE") => {
    if (guess === scenarios[currentScenario].correct) {
      setGuessResult("correct");
      setSimScore(prev => prev + 500 + (simCombo * 200));
      setSimCombo(prev => prev + 1);
    } else if (guess === "UNREASONABLE") {
      setGuessResult("unreasonable");
    } else {
      setGuessResult("incorrect");
      setSimCombo(0);
    }
  };

  const nextScenario = () => {
    if (currentScenario >= scenarios.length - 1) {
      setIsAssessmentComplete(true);
    } else {
      const nextIndex = currentScenario + 1;
      setGuessResult("none");
      setAquaHint(false);
      setCurrentScenario(nextIndex);
      loadScenarioIntoAnalyzer(scenarios[nextIndex]);
    }
  };

  const handleNavigate = (tab: "theory" | "value-list") => {
    if (tab === "value-list") {
      window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'value-list' }));
    } else {
      window.dispatchEvent(new CustomEvent("set-tutorial-tab", { detail: tab }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#b9bbbe]">
        <Sparkles className="w-8 h-8 animate-spin text-[#7289da] mb-4" />
        <p className="font-bold">Loading live market data...</p>
      </div>
    );
  }

  if (isAssessmentComplete) {
    return (
      <div className="animate-fade-in pb-6 max-w-4xl mx-auto font-sans select-none">
        <div className="bg-[#282b30] border border-[#424549] rounded-[12px] p-8 md:p-12 shadow-xl flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-[rgba(114,137,218,0.1)] rounded-full flex items-center justify-center mb-6 border border-[#7289da]/20">
               <Activity className="w-10 h-10 text-[#7289da]" />
            </div>
            <h2 className="text-[24px] md:text-[28px] font-black text-[#ffffff] uppercase tracking-wide mb-2">Assessment Concluded</h2>
            <p className="text-[#b9bbbe] text-[14px] uppercase tracking-widest mb-6 font-bold">Final Score: <span className="text-[#7289da]">{simScore.toLocaleString()}</span></p>
            
            <p className="text-[#ffffff] text-[14px] leading-relaxed mb-8 max-w-lg">
              Trading algorithms provide pure mathematical statistics, but a human trader must adapt to shifting trends. Remember, your own intuition and market knowledge should always take priority over raw numbers.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
              <button 
                onClick={startSimulator} 
                className="w-full sm:w-auto px-6 py-3.5 rounded-[6px] bg-[#7289da] hover:bg-[#5b6eae] text-white font-bold text-[13px] uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 border border-[#7289da] focus-visible:outline-none"
              >
                <RotateCcw className="w-4 h-4" /> Retry Simulator
              </button>
              <button 
                onClick={() => handleNavigate("theory")} 
                className="w-full sm:w-auto px-6 py-3.5 rounded-[6px] bg-[#1e2124] hover:bg-[#36393e] text-[#ffffff] font-bold text-[13px] uppercase tracking-wider transition-colors border border-[#424549] focus-visible:outline-none flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-[#b9bbbe]" /> Market Theory
              </button>
              <button 
                onClick={() => handleNavigate("value-list")} 
                className="w-full sm:w-auto px-6 py-3.5 rounded-[6px] bg-[#1e2124] hover:bg-[#36393e] text-[#ffffff] font-bold text-[13px] uppercase tracking-wider transition-colors border border-[#424549] focus-visible:outline-none flex items-center justify-center gap-2"
              >
                <List className="w-4 h-4 text-[#b9bbbe]" /> Value List
              </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-6 max-w-4xl mx-auto font-sans select-none">
      {!isSimulatorRunning && simScore === 0 ? (
        <div className="bg-[#1e2124] border border-[#424549] rounded-[12px] p-6 md:p-8 shadow-md flex flex-col gap-6">
          <div className="flex items-start justify-between border-b border-[#424549] pb-6">
             <div className="flex items-center gap-4">
                <img src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-[#424549] object-cover" alt="Aqua"/>
                <div className="flex flex-col">
                   <span className="text-[15px] md:text-[16px] font-bold text-[#ffffff]">Goddess Aqua</span>
                   <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#7289da] mt-0.5">Lead Assessor</span>
                </div>
             </div>
             <div className="text-right">
                <span className="block text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#b9bbbe] mb-0.5">Date</span>
                <span className="block text-[11px] md:text-[12px] font-mono text-[#ffffff]">{issueDate}</span>
             </div>
          </div>

          <div className="flex flex-col gap-4">
             <p className="text-[13px] md:text-[13.5px] text-[#ffffff] leading-relaxed">
               Think you're a trading prodigy? Prove it. I've programmed a dynamic engine to pull <strong>real units from the live database</strong> and generate mathematically balanced market baits. 
             </p>

             <div className="bg-[#1e2124] border-l-4 border-l-[#ed4245] border-y border-y-[#424549] border-r border-r-[#424549] rounded-r-[8px] p-4 shadow-inner flex items-start gap-4">
                 <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[#ed4245] object-cover shrink-0 bg-[#1e2124]" alt="Fire Zio" />
                 <div className="flex flex-col gap-1">
                   <span className="text-[11px] font-black uppercase tracking-widest text-[#ed4245]">Fire Zio's Observation</span>
                   <p className="text-[#b9bbbe] text-[13px] italic font-medium leading-relaxed">
                     "There's no timer anymore. The trade is automatically loaded into your Calculator on the right. Analyze the math, check the forecast, and tell me if it's a win. Do not fail."
                   </p>
                 </div>
             </div>
             
             <div className="bg-[rgba(250,166,26,0.05)] border border-[rgba(250,166,26,0.2)] rounded-[8px] p-4 flex items-start gap-3">
               <AlertTriangle className="w-5 h-5 text-[#FAA61A] shrink-0 mt-0.5" />
               <p className="text-[#ffffff] text-[12.5px] leading-relaxed">
                 <strong className="text-[#FAA61A] block mb-1">Disclaimer</strong>
                 This simulator utilizes rigid mathematical algorithms to determine win/loss states based on current stats. Real market trading requires reading the room, predicting trends, and human intuition. Always prioritize your own market knowledge over pure statistics.
               </p>
             </div>
          </div>

          <div className="pt-4 border-t border-[#424549] flex justify-end mt-2">
            <button 
              onClick={startSimulator}
              className="bg-[#7289da] hover:bg-[#5b6eae] text-white px-8 py-2.5 rounded-[4px] text-[12px] md:text-[13px] font-bold uppercase tracking-wider transition-all active:scale-95 focus-visible:outline-none shadow-md w-full md:w-auto flex items-center justify-center gap-2"
            >
              Commence Live Assessment <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          <div className="flex items-center justify-between px-2 text-[#b9bbbe] text-[12px] font-medium">
            <div className="flex items-center gap-6">
              <span>Score: <span className="text-[#ffffff] font-mono font-bold tracking-tight ml-1">{simScore.toLocaleString()}</span></span>
              <span className="flex items-center gap-1">
                Combo: 
                <span key={simCombo} className={`font-mono font-bold tracking-tight ml-1 transition-transform ${simCombo > 0 ? 'text-[#ffffff] scale-110' : 'text-[#b9bbbe] scale-100'}`}>
                  x{simCombo}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
               <Activity className="w-3.5 h-3.5 text-[#7289da] animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-[#7289da]">Live Evaluation</span>
            </div>
          </div>

          <div className="bg-[#282b30] rounded-[8px] border border-[#7289da]/30 relative overflow-hidden shadow-md flex flex-col">
            <div className="h-1 w-full bg-[#7289da]/50" />

            <div className="p-6 md:p-8 flex flex-col">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[#b9bbbe] uppercase tracking-wider">
                    Scenario {currentScenario + 1} / {scenarios.length}
                  </span>
                  <h3 className="text-[16px] font-bold text-[#ffffff]">{scenarios[currentScenario].title}</h3>
                  <p className="text-[13px] text-[#b9bbbe] max-w-lg leading-relaxed">{scenarios[currentScenario].desc}</p>
                </div>
                
                {guessResult === "none" && !aquaHint && (
                  <div className="flex items-center gap-3 shrink-0">
                    <button 
                      onClick={() => setAquaHint(true)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-[#b9bbbe] hover:text-[#ffffff] transition-colors focus-visible:outline-none"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> View Hint
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center mb-8">
                
                {/* Give Box */}
                <div className="bg-[#1e2124] border border-[#424549] rounded-[8px] p-4 flex flex-col gap-3 shadow-inner">
                  <div className="flex items-center gap-2 mb-1">
                     <div className="w-2 h-2 rounded-full bg-[#FAA61A]" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-[#FAA61A]">You Give</span>
                  </div>
                  <ScenarioUnitDisplay unit={scenarios[currentScenario].give.unit} qty={scenarios[currentScenario].give.qty} />
                </div>

                <div className="flex justify-center text-[#b9bbbe] bg-[#1e2124] p-1.5 rounded-full border border-[#424549] w-fit mx-auto md:mx-0">
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Get Box */}
                <div className="bg-[#1e2124] border border-[#424549] rounded-[8px] p-4 flex flex-col gap-3 shadow-inner">
                  <div className="flex items-center gap-2 mb-1">
                     <div className="w-2 h-2 rounded-full bg-[#7289da]" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-[#7289da]">You Get</span>
                  </div>
                  <ScenarioUnitDisplay unit={scenarios[currentScenario].get.unit} qty={scenarios[currentScenario].get.qty} />
                </div>

              </div>

              <div className="min-h-[120px] flex flex-col justify-end">
                {guessResult === "none" ? (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    {aquaHint && (
                      <p className="text-[12.5px] text-[#ffffff] bg-[#1e2124] p-3 rounded-[6px] border border-[#424549] shadow-inner flex items-center gap-3">
                        <strong className="text-[#b9bbbe] font-medium shrink-0">Aqua's Hint:</strong>
                        <span>I've already loaded the units into your Calculator. Open it up and check the Market Forecast!</span>
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                      <button 
                        onClick={() => handleGuess("WIN")} 
                        className="group flex items-center justify-center gap-2 py-3.5 rounded-[4px] bg-[#1e2124] text-[#ffffff] border border-[#424549] hover:border-[#43b581]/50 hover:bg-[rgba(67,181,129,0.05)] hover:text-[#43b581] font-bold text-[13px] transition-all focus-visible:outline-none active:scale-[0.98]"
                      >
                        Winning Trade
                      </button>
                      <button 
                        onClick={() => handleGuess("LOSS")} 
                        className="group flex items-center justify-center gap-2 py-3.5 rounded-[4px] bg-[#1e2124] text-[#ffffff] border border-[#424549] hover:border-[#ed4245]/50 hover:bg-[rgba(237,66,69,0.05)] hover:text-[#ed4245] font-bold text-[13px] transition-all focus-visible:outline-none active:scale-[0.98]"
                      >
                        Losing Trade
                      </button>
                      <button 
                        onClick={() => handleGuess("UNREASONABLE")} 
                        className="group flex items-center justify-center gap-2 py-3.5 rounded-[4px] bg-[#1e2124] text-[#ffffff] border border-[#424549] hover:border-[#FAA61A]/50 hover:bg-[rgba(250,166,26,0.05)] hover:text-[#FAA61A] font-bold text-[13px] transition-all focus-visible:outline-none active:scale-[0.98]"
                      >
                        Unreasonable
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="flex flex-col md:flex-row gap-4 p-5 rounded-[8px] border transition-all animate-slide-up"
                    style={{ 
                      backgroundColor: guessResult === "correct" ? "rgba(67, 181, 129, 0.05)" : guessResult === "unreasonable" ? "rgba(250, 166, 26, 0.05)" : "rgba(237, 66, 69, 0.05)",
                      borderColor: guessResult === "correct" ? "rgba(67, 181, 129, 0.2)" : guessResult === "unreasonable" ? "rgba(250, 166, 26, 0.2)" : "rgba(237, 66, 69, 0.2)" 
                    }}
                  >
                    <img 
                      src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" 
                      className="w-10 h-10 rounded-full border border-[#424549] object-cover shrink-0 hidden md:block mt-1" 
                      alt="Aqua" 
                    />
                    <div className="flex flex-col flex-1">
                      <span className="text-[13px] font-bold mb-1.5" style={{ color: guessResult === "correct" ? "#43b581" : guessResult === "unreasonable" ? "#FAA61A" : "#ed4245" }}>
                        {guessResult === "correct" ? "Correct Assessment" : guessResult === "unreasonable" ? "Trade Skipped (Intuition Overruled Math)" : "Incorrect Assessment"}
                      </span>
                      <p className="text-[13px] text-[#ffffff] leading-relaxed mb-4">
                        {guessResult === "unreasonable" 
                           ? `You deemed this trade unreasonable based on your market knowledge. The algorithm calculated it as a ${scenarios[currentScenario].forecast.st >= 0 || scenarios[currentScenario].forecast.lt >= 0 ? "WIN" : "LOSS"}, but real-world factors like active circulation and hoarder preferences always take priority over pure math. Your combo is safe.` 
                           : scenarios[currentScenario].explanation}
                      </p>
                      <button 
                        onClick={nextScenario} 
                        className="self-start px-6 py-2.5 bg-[#282b30] hover:bg-[#36393e] text-[#ffffff] text-[12px] font-bold rounded-[4px] transition-colors shadow-sm focus-visible:outline-none active:scale-95 border border-[#424549]"
                      >
                        {currentScenario >= scenarios.length - 1 ? "Complete Assessment" : "Next Scenario"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}