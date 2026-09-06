import React, { useState, useEffect } from "react";
import { Timer, ArrowRight, HelpCircle, Eye } from "lucide-react";
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
  },
  {
    id: 5,
    title: "The Inflated Bait",
    desc: "Someone is overpaying with a unit that spiked 50k overnight.",
    give: { name: "High-Demand Meta", value: "80,000", status: "stable" },
    get: { name: "Random Old Unit", value: "120,000", status: "inflated" },
    correct: "LOSS" as const,
    hint: "Check the status tag. Why did it suddenly spike? Market manipulation.",
    explanation: "Inflated units are artificially pumped by hoarders. No actual trader will pay that 120k value. It's fake."
  },
  {
    id: 6,
    title: "The Liquidity Flip",
    desc: "Taking a small raw value hit to get rid of a hard-to-trade unit.",
    give: { name: "Gatekept S-Tier", value: "300,000", status: "gatekept" },
    get: { name: "2x High-Demand A-Tiers", value: "285,000", status: "rising" },
    correct: "WIN" as const,
    hint: "Gatekept units are hoarded and incredibly hard to trade off. Liquid assets are king.",
    explanation: "You lost 15k raw value, but gained massive liquidity. Those A-tiers will easily trade for overpays tomorrow."
  },
  {
    id: 7,
    title: "The Update Hype",
    desc: "A unit is confirmed to get an evolution tomorrow.",
    give: { name: "Stable B-Tier", value: "25,000", status: "stable" },
    get: { name: "Evo-Confirmed Unit", value: "22,000", status: "hyped" },
    correct: "WIN" as const,
    hint: "Value always spikes on update day. Raw value today means nothing.",
    explanation: "Hyped units are guaranteed to rise when the update drops. Buy low before the value list officially updates."
  },
  {
    id: 8,
    title: "The Gatekeeper Trap",
    desc: "A wealthy trader is offering you an incredibly rare, but unwanted unit.",
    give: { name: "Rising Meta Core", value: "400,000", status: "rising" },
    get: { name: "Forgotten Oddity", value: "450,000", status: "gatekept" },
    correct: "LOSS" as const,
    hint: "Why is a rich trader giving away a 50k overpay so easily?",
    explanation: "Oddities and gatekept units have near-zero demand. You just traded a highly liquid core unit for a permanent brick."
  },
  {
    id: 9,
    title: "The Downgrade for Demand",
    desc: "Taking a raw value hit to escape a dead unit.",
    give: { name: "Gatekept S-Tier", value: "300,000", status: "gatekept" },
    get: { name: "3x High-Demand A-Tiers", value: "285,000", status: "rising" },
    correct: "WIN" as const,
    hint: "Gatekept units have zero buyers. Liquid assets are king.",
    explanation: "You lost 15k raw value, but gained massive liquidity. Those A-tiers will easily trade for overpays tomorrow."
  },
  {
    id: 10,
    title: "The Black Market Trap",
    desc: "Trading a highly liquid meta unit for identical value.",
    give: { name: "Rising Meta Core", value: "150,000", status: "rising" },
    get: { name: "Dupe Suspect", value: "150,000", status: "black-marketed" },
    correct: "LOSS" as const,
    hint: "Check the tags. Do you want to hold stolen goods?",
    explanation: "Black-marketed units are heavily duped and actively avoided by the community. Their value will inevitably crash."
  },
  {
    id: 11,
    title: "The Hype Cash-Out",
    desc: "Someone is offering a massive overpay right before the update drops.",
    give: { name: "Hyped Update Unit", value: "80,000", status: "hyped" },
    get: { name: "Stable S-Tier Core", value: "120,000", status: "stable" },
    correct: "WIN" as const,
    hint: "Hype is temporary. S-Tiers are forever.",
    explanation: "Always cash out on hype before the update actually drops. Once the unit is available, the hype dies and the value plummets."
  },
  {
    id: 12,
    title: "The False Stable",
    desc: "Trading for a unit that looks fine on paper, but has a glaring warning.",
    give: { name: "Solid A-Tier", value: "60,000", status: "rising" },
    get: { name: "Outdated Meta", value: "65,000", status: "stable" },
    correct: "LOSS" as const,
    hint: "Always read the notices. 'Stable' doesn't mean safe if the devs announced a nerf.",
    explanation: "If a unit is slated to drop next list or has a warning notice, its 'Stable' tag is a trap. Read the fine print."
  }
];

const FIRE_ZIO_AVATAR = "https://media.discordapp.net/attachments/1538970612947615744/1543320682430074971/image.png?ex=6a9470e4&is=6a931f64&hm=d97c87c7af214b524fdd41b313db6a4d45d5cf435046fc9a8a14fb307d258165&=&format=webp&quality=lossless";

export function SimulatorTab() {
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(false);
  const [simScore, setSimScore] = useState(0);
  const [simCombo, setSimCombo] = useState(0);
  const [simTimeLeft, setSimTimeLeft] = useState(100);
  const [aquaHint, setAquaHint] = useState<string | null>(null);
  const [currentScenario, setCurrentScenario] = useState(0);
  const [guessResult, setGuessResult] = useState<"none" | "correct" | "incorrect">("none");
  const [selectedGuess, setSelectedGuess] = useState<"WIN" | "LOSS" | "TIME_OUT" | null>(null);

  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

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

  const handleGuess = (guess: "WIN" | "LOSS" | "TIME_OUT") => {
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
    <div className="animate-fade-in pb-6 max-w-4xl mx-auto font-sans select-none">
      {!isSimulatorRunning && simScore === 0 ? (
        <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-6 md:p-8 shadow-md flex flex-col gap-6">
          <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.04)] pb-6">
             <div className="flex items-center gap-4">
                <img src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-[rgba(255,255,255,0.1)] object-cover" alt="Aqua"/>
                <div className="flex flex-col">
                   <span className="text-[15px] md:text-[16px] font-bold text-[#F2F3F5]">Goddess Aqua</span>
                   <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#5865F2] mt-0.5">Lead Assessor</span>
                </div>
             </div>
             <div className="text-right">
                <span className="block text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#80848E] mb-0.5">Date</span>
                <span className="block text-[11px] md:text-[12px] font-mono text-[#DBDEE1]">{issueDate}</span>
             </div>
          </div>

          <div className="flex flex-col gap-3">
             <p className="text-[13px] md:text-[13.5px] text-[#DBDEE1] leading-relaxed">
                Think you're a trading prodigy? Prove it. I've compiled {SCENARIOS.length} real-world market scenarios that actively ruin people's inventories. Evaluate them quickly, or I'm revoking your calculator privileges.
             </p>
             <div className="bg-[#111214] border-l-4 border-l-[#ed4245] border-y border-y-[rgba(255,255,255,0.04)] border-r border-r-[rgba(255,255,255,0.04)] rounded-r-[8px] p-4 shadow-inner flex items-start gap-4">
                 <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[#ed4245] object-cover shrink-0 bg-[#1e1f22]" alt="Fire Zio" />
                 <div className="flex flex-col gap-1">
                   <span className="text-[11px] font-black uppercase tracking-widest text-[#ed4245]">Fire Zio's Observation</span>
                   <p className="text-[#949BA4] text-[13px] italic font-medium leading-relaxed">
                     "If you fail this simulator, I will personally mock you in the trading channels. Don't waste my time with rookie mistakes."
                   </p>
                 </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
             <div className="bg-[#2B2D31] p-4 rounded-[6px] border border-[rgba(255,255,255,0.03)] flex flex-col gap-2 shadow-inner">
                <span className="text-[11.5px] md:text-[12px] font-bold text-[#F2F3F5] uppercase tracking-wider">Time is Value</span>
                <span className="text-[11px] md:text-[11.5px] text-[#949BA4] leading-snug">Faster assessments yield higher score bonuses. Don't hesitate.</span>
             </div>
             <div className="bg-[#2B2D31] p-4 rounded-[6px] border border-[rgba(255,255,255,0.03)] flex flex-col gap-2 shadow-inner">
                <span className="text-[11.5px] md:text-[12px] font-bold text-[#F2F3F5] uppercase tracking-wider">Momentum Multiplier</span>
                <span className="text-[11px] md:text-[11.5px] text-[#949BA4] leading-snug">Consecutive correct answers build your combo for massive points.</span>
             </div>
             <div className="bg-[#2B2D31] p-4 rounded-[6px] border border-[rgba(255,255,255,0.03)] flex flex-col gap-2 shadow-inner">
                <span className="text-[11.5px] md:text-[12px] font-bold text-[#F2F3F5] uppercase tracking-wider">Real Market Traps</span>
                <span className="text-[11px] md:text-[11.5px] text-[#949BA4] leading-snug">Watch out for manipulated values, dead demand, and fake stability.</span>
             </div>
          </div>

          <div className="pt-4 border-t border-[rgba(255,255,255,0.04)] flex justify-end">
            <button 
              onClick={startSimulator}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-8 py-2.5 rounded-[4px] text-[12px] md:text-[13px] font-bold uppercase tracking-wider transition-all active:scale-95 focus-visible:outline-none shadow-md w-full md:w-auto"
            >
              Commence Assessment
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          <div className="flex items-center justify-between px-2 text-[#80848E] text-[12px] font-medium">
            <div className="flex items-center gap-6">
              <span>Score: <span className="text-[#DBDEE1] font-mono font-bold tracking-tight ml-1">{simScore.toLocaleString()}</span></span>
              <span className="flex items-center gap-1">
                Combo: 
                <span key={simCombo} className={`font-mono font-bold tracking-tight ml-1 transition-transform ${simCombo > 0 ? 'text-[#DBDEE1] scale-110' : 'text-[#80848E] scale-100'}`}>
                  x{simCombo}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" />
              <span className="font-mono w-[30px] text-right">{Math.ceil(simTimeLeft / 10)}s</span>
            </div>
          </div>

          <div className="bg-[#2B2D31] rounded-[8px] border border-[rgba(255,255,255,0.04)] relative overflow-hidden shadow-md flex flex-col">
            
            <div className="h-[3px] w-full bg-[rgba(255,255,255,0.04)]">
              <div 
                className="h-full transition-all duration-100 ease-linear shadow-[0_0_8px_currentColor]"
                style={{ 
                  width: `${simTimeLeft}%`,
                  backgroundColor: simTimeLeft < 30 ? '#ed4245' : '#5865F2',
                  color: simTimeLeft < 30 ? 'rgba(237,66,69,0.5)' : 'rgba(88,101,242,0.5)'
                }}
              />
            </div>

            <div className="p-6 md:p-8 flex flex-col">
              <div className="flex items-start justify-between gap-4 mb-8">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[#80848E] uppercase tracking-wider">
                    Scenario {currentScenario + 1} / {SCENARIOS.length}
                  </span>
                  <h3 className="text-[16px] font-bold text-[#F2F3F5]">{SCENARIOS[currentScenario].title}</h3>
                  <p className="text-[13px] text-[#949BA4] max-w-lg leading-relaxed">{SCENARIOS[currentScenario].desc}</p>
                </div>
                
                {guessResult === "none" && !aquaHint && (
                  <button 
                    onClick={() => setAquaHint(SCENARIOS[currentScenario].hint)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-[#80848E] hover:text-[#DBDEE1] transition-colors shrink-0 pt-1 focus-visible:outline-none"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> View Hint
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center mb-8">
                
                <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] rounded-[6px] p-4 flex flex-col gap-3 shadow-inner">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#80848E]">You Give</span>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[14px] font-bold text-[#F2F3F5] truncate">{SCENARIOS[currentScenario].give.name}</span>
                    <div className="flex items-center justify-between mt-1 border-t border-[rgba(255,255,255,0.04)] pt-2">
                      <span className="text-[13px] font-mono font-bold text-[#DBDEE1]">{SCENARIOS[currentScenario].give.value}</span>
                      <StaticStatusBadge status={SCENARIOS[currentScenario].give.status} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center text-[#4e5058] bg-[#1E1F22] p-1.5 rounded-full border border-[rgba(255,255,255,0.04)] w-fit mx-auto md:mx-0">
                  <ArrowRight className="w-4 h-4" />
                </div>

                <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] rounded-[6px] p-4 flex flex-col gap-3 shadow-inner">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#80848E]">You Get</span>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[14px] font-bold text-[#F2F3F5] truncate">{SCENARIOS[currentScenario].get.name}</span>
                    <div className="flex items-center justify-between mt-1 border-t border-[rgba(255,255,255,0.04)] pt-2">
                      <span className="text-[13px] font-mono font-bold text-[#DBDEE1]">{SCENARIOS[currentScenario].get.value}</span>
                      <StaticStatusBadge status={SCENARIOS[currentScenario].get.status} />
                    </div>
                  </div>
                </div>

              </div>

              <div className="min-h-[120px] flex flex-col justify-end">
                {guessResult === "none" ? (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    {aquaHint && (
                      <p className="text-[12.5px] text-[#DBDEE1] bg-[#1E1F22] p-3 rounded-[6px] border border-[rgba(255,255,255,0.04)] shadow-inner">
                        <strong className="text-[#80848E] font-medium mr-2">Aqua's Hint:</strong>{aquaHint}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button 
                        onClick={() => handleGuess("WIN")} 
                        className="group flex items-center justify-center gap-2 py-3.5 rounded-[4px] bg-[#1E1F22] text-[#B5BAC1] border border-[rgba(255,255,255,0.04)] hover:border-[#43b581]/50 hover:bg-[rgba(67,181,129,0.05)] hover:text-[#43b581] font-bold text-[13px] transition-all focus-visible:outline-none active:scale-[0.98]"
                      >
                        Winning Trade
                      </button>
                      <button 
                        onClick={() => handleGuess("LOSS")} 
                        className="group flex items-center justify-center gap-2 py-3.5 rounded-[4px] bg-[#1E1F22] text-[#B5BAC1] border border-[rgba(255,255,255,0.04)] hover:border-[#ed4245]/50 hover:bg-[rgba(237,66,69,0.05)] hover:text-[#ed4245] font-bold text-[13px] transition-all focus-visible:outline-none active:scale-[0.98]"
                      >
                        Losing Trade
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="flex flex-col md:flex-row gap-4 p-5 rounded-[8px] border transition-all animate-slide-up"
                    style={{ 
                      backgroundColor: guessResult === "correct" ? "rgba(67, 181, 129, 0.05)" : "rgba(237, 66, 69, 0.05)",
                      borderColor: guessResult === "correct" ? "rgba(67, 181, 129, 0.2)" : "rgba(237, 66, 69, 0.2)" 
                    }}
                  >
                    <img 
                      src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" 
                      className="w-10 h-10 rounded-full border border-[rgba(255,255,255,0.06)] object-cover shrink-0 hidden md:block mt-1" 
                      alt="Aqua" 
                    />
                    <div className="flex flex-col flex-1">
                      <span className="text-[13px] font-bold mb-1.5" style={{ color: guessResult === "correct" ? "#43b581" : "#ed4245" }}>
                        {guessResult === "correct" ? "Correct Assessment" : selectedGuess === "TIME_OUT" ? "Time Expired" : "Incorrect Assessment"}
                      </span>
                      <p className="text-[13px] text-[#DBDEE1] leading-relaxed mb-4">
                        {SCENARIOS[currentScenario].explanation}
                      </p>
                      <button 
                        onClick={nextScenario} 
                        className="self-start px-6 py-2.5 bg-[#2B2D31] hover:bg-[#3F4147] text-[#F2F3F5] text-[12px] font-bold rounded-[4px] transition-colors shadow-sm focus-visible:outline-none active:scale-95 border border-[rgba(255,255,255,0.04)]"
                      >
                        {currentScenario >= SCENARIOS.length - 1 ? "Complete Training" : "Next Scenario"}
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