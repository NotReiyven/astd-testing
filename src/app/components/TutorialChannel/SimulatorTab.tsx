import { useState, useCallback, useEffect } from "react";
import { StaticStatusBadge } from "./TutorialUI";
import { useUnits } from "../../../context/UnitContext";
import { MasterUnit } from "../../../types";
import {
  getProxyImage,
  handleImageError,
} from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";
import { useTradeStore } from "../../../store/useTradeStore";
import { buildScenariosList, Scenario } from "./simulatorEngine";
import { triggerHaptic } from "../../../data/helpers";

const SECONDS_PER_SCENARIO = 20;
const AQUA_AVATAR_URL =
  "https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png";

const IconArrowRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8H13M9 4L13 8L9 12" />
  </svg>
);

const IconTimer = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="8" cy="9" r="5.5" />
    <path d="M8 6.5V9L9.8 10.2M6 1.5H10" />
  </svg>
);

const getLiquidityBadge = (liq?: string) => {
  const l = (liq || "Average").toLowerCase();
  if (l === "high") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#22c55e]/15 border border-[#22c55e]/30 text-[11px] font-mono font-medium text-[#22c55e]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
        High Liquidity
      </span>
    );
  }
  if (l === "low") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#ef4444]/15 border border-[#ef4444]/30 text-[11px] font-mono font-medium text-[#ef4444]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
        Low Liquidity
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[11px] font-mono font-medium text-[#3b82f6]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
      Avg Liquidity
    </span>
  );
};

const getRarityBadge = (rarity?: number) => {
  if (rarity === undefined || rarity === null) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] bg-[#2b2d31] border border-border text-[11px] font-mono text-muted-foreground">
      Rarity #{rarity}
    </span>
  );
};

const TradingTerminalUnitTile = ({
  unit,
  qty,
  label,
}: {
  unit: MasterUnit;
  qty: number;
  label: string;
}) => {
  const proxyUrl = getProxyImage(unit.id, unit.imageUrl);
  const totalVal = (unit.value as number) * qty;

  return (
    <div className="bg-[#1e1f22] border border-border rounded-[8px] p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
      {/* Header Label & Rarity */}
      <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {getRarityBadge(unit.rarity)}
          {getLiquidityBadge(unit.liquidity)}
        </div>
      </div>

      {/* Main Unit Card */}
      <div className="flex items-center gap-3.5">
        <div className="relative w-16 h-16 rounded-[8px] bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
          {qty > 1 && (
            <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[11px] font-bold px-1.5 py-0.2 rounded-full z-30 border-2 border-popover shadow-sm">
              x{qty}
            </div>
          )}
          <div
            className="absolute inset-0 flex items-center justify-center text-white font-bold text-[16px] z-0"
            style={getAvatarStyle(unit.name)}
          >
            {getInitials(unit.name)}
          </div>
          {proxyUrl && (
            <img
              src={proxyUrl}
              alt={unit.name}
              className="absolute inset-0 w-full h-full object-cover z-10 bg-background"
              style={{ objectPosition: "center 15%" }}
              onError={(e) => handleImageError(e, unit.id)}
            />
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[16px] font-bold text-foreground truncate tracking-tight">
            {unit.name}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate mt-0.5">
            {unit.subtitle || "Official Unit"}
          </span>
          <div className="mt-1.5">
            <StaticStatusBadge status={unit.status || "stable"} />
          </div>
        </div>
      </div>

      {/* Numerical Value Breakdown */}
      <div className="bg-[#2b2d31]/70 rounded-[6px] p-3 border border-border/60 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">
            {qty > 1 ? `Unit Value (${qty}x)` : "Unit Value"}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            {qty > 1
              ? `${(unit.value as number).toLocaleString()} each`
              : "Base Market Rate"}
          </span>
        </div>

        <span className="text-[22px] font-black font-mono text-foreground leading-none">
          {totalVal.toLocaleString()}
        </span>
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
  const [guessResult, setGuessResult] = useState<
    "none" | "correct" | "incorrect" | "scam" | "timeout"
  >("none");

  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_SCENARIO);

  const loadScenarioIntoAnalyzer = useCallback(
    (scenario: Scenario) => {
      if (!scenario) return;
      const giveCard = {
        id: scenario.give.unit.id,
        name: scenario.give.unit.name,
        subtitle: scenario.give.unit.subtitle,
        value: scenario.give.unit.value as number,
        qty: scenario.give.qty,
      };
      const getCard = {
        id: scenario.get.unit.id,
        name: scenario.get.unit.name,
        subtitle: scenario.get.unit.subtitle,
        value: scenario.get.unit.value as number,
        qty: scenario.get.qty,
      };
      overwrite([giveCard], [getCard]);
    },
    [overwrite]
  );

  // Timer Logic
  useEffect(() => {
    if (!isSimulatorRunning || isAssessmentComplete || guessResult !== "none")
      return;

    if (timeLeft <= 0) {
      setGuessResult("timeout");
      setSimCombo(0);
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [isSimulatorRunning, isAssessmentComplete, guessResult, timeLeft]);

  // Dispatch event on completion
  useEffect(() => {
    if (isAssessmentComplete && simScore > 0) {
      window.dispatchEvent(new Event("academy-passed-sim"));
    }
  }, [isAssessmentComplete, simScore]);

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
    setTimeLeft(SECONDS_PER_SCENARIO);

    loadScenarioIntoAnalyzer(freshScenarios[0]);
  };

  const handleGuess = (guess: "WIN" | "LOSS" | "SCAM") => {
    if (guessResult !== "none") return;
    triggerHaptic("medium");

    if (guess === scenarios[currentScenario].correct) {
      setGuessResult("correct");
      const timeBonus = timeLeft * 10;
      setSimScore((prev) => prev + 500 + simCombo * 200 + timeBonus);
      setSimCombo((prev) => prev + 1);
    } else if (guess === "SCAM") {
      setGuessResult("scam");
      setSimCombo(0);
    } else {
      setGuessResult("incorrect");
      setSimCombo(0);
    }
  };

  const nextScenario = () => {
    triggerHaptic("light");
    if (currentScenario >= scenarios.length - 1) {
      setIsAssessmentComplete(true);
    } else {
      const nextIndex = currentScenario + 1;
      setGuessResult("none");
      setTimeLeft(SECONDS_PER_SCENARIO);
      setCurrentScenario(nextIndex);
      loadScenarioIntoAnalyzer(scenarios[nextIndex]);
    }
  };

  const handleNavigate = (tab: "theory" | "value-list") => {
    if (tab === "value-list") {
      window.document.dispatchEvent(
        new CustomEvent("navigate", { detail: "value-list" })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("set-tutorial-tab", { detail: tab })
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground h-full flex-1">
        <p className="font-bold">Loading live market data…</p>
      </div>
    );
  }

  if (isAssessmentComplete) {
    return (
      <div className="animate-fade-in pb-6 max-w-4xl mx-auto font-sans select-none flex flex-col flex-1 justify-center h-full">
        <div className="bg-card border border-border rounded-[12px] p-8 md:p-12 shadow-xl flex flex-col items-center text-center my-auto">
          <img
            src={AQUA_AVATAR_URL}
            alt="Goddess Aqua"
            referrerPolicy="no-referrer"
            className="w-24 h-24 rounded-full border border-border shadow-md object-cover object-top mb-4 bg-popover"
          />
          <span className="text-[12px] font-bold uppercase tracking-widest text-primary mb-1">
            Drill Complete
          </span>
          <h2 className="text-[28px] md:text-[34px] font-black text-foreground tracking-tight mb-2">
            Final Score: {simScore.toLocaleString()}
          </h2>
          <p className="text-[14px] text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
            {simScore > 4000
              ? "Impressive! You spotted the traps, accounted for liquidity, and protected your inventory like a true high-tier trader."
              : "Decent run! But you got trapped by a few falling knives or deflated assets. Review the Market Guide tags to refine your judgment."}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={startSimulator}
              className="w-full sm:w-auto px-6 py-2.5 rounded-[6px] bg-primary text-primary-foreground font-bold text-[13px] hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Play Again
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("value-list")}
              className="w-full sm:w-auto px-6 py-2.5 rounded-[6px] bg-[#2b2d31] hover:bg-[#35373c] text-foreground font-bold text-[13px] border border-border transition-colors cursor-pointer"
            >
              Browse Value List
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-game introduction screen
  if (!isSimulatorRunning && simScore === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full p-4">
        <div className="bg-card border border-border rounded-[10px] p-6 sm:p-8 shadow-lg flex flex-col gap-6">
          <div className="flex items-center gap-4 border-b border-border pb-5">
            <div className="w-14 h-14 rounded-full border border-border overflow-hidden bg-[#2b2d31] shrink-0">
              <img
                src={AQUA_AVATAR_URL}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
                alt="Aqua"
              />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
                Mock Trade Simulator
              </h2>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Real-Time Decision Terminal
              </span>
            </div>
          </div>

          <p className="text-[13.5px] text-[#dbdee1] leading-relaxed">
            Put your trading instincts to the test with real ASTD market scenarios. Compare raw values, liquidity spreads, and status tag dynamics before the 20-second timer expires.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-[6px] bg-[#1e1f22] border border-border flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#22c55e] uppercase">
                Accept Trade
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">
                Net value gain or acquiring liquid, rising assets.
              </span>
            </div>
            <div className="p-3 rounded-[6px] bg-[#1e1f22] border border-border flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#dbdee1] uppercase">
                Decline Offer
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">
                Downgrade in value, illiquid swap, or dropping assets.
              </span>
            </div>
            <div className="p-3 rounded-[6px] bg-[#1e1f22] border border-border flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#ef4444] uppercase">
                Call Scam
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">
                Manipulated tags, fake inflated volume, or predatory baits.
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex justify-end">
            <button
              type="button"
              onClick={startSimulator}
              className="w-full sm:w-auto px-7 py-3 rounded-[6px] bg-primary text-primary-foreground font-bold text-[13px] uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Start Drills <IconArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const scenario = scenarios[currentScenario];
  const giveVal = (scenario.give.unit.value as number) * scenario.give.qty;
  const getVal = (scenario.get.unit.value as number) * scenario.get.qty;
  const deltaVal = getVal - giveVal;
  const pctDiff = giveVal > 0 ? ((deltaVal / giveVal) * 100).toFixed(1) : "0.0";
  const isPositiveDelta = deltaVal >= 0;

  // Compute Risk Assessment badge
  let riskBadge = {
    label: "FAIR VALUE EXCHANGE",
    color: "bg-[#3b82f6]/15 border-[#3b82f6]/40 text-[#3b82f6]",
  };

  const getStatus = (scenario.get.unit.status || "").toLowerCase();
  const getLiq = (scenario.get.unit.liquidity || "Average").toLowerCase();
  const giveLiq = (scenario.give.unit.liquidity || "Average").toLowerCase();

  if (getStatus === "manipulated" || scenario.correct === "SCAM") {
    riskBadge = {
      label: "MANIPULATION TRAP",
      color: "bg-[#ef4444]/20 border-[#ef4444]/50 text-[#ef4444]",
    };
  } else if (getStatus === "dropping" || (getLiq === "low" && giveLiq === "high")) {
    riskBadge = {
      label: "FALLING KNIFE / ILLIQUID",
      color: "bg-[#f97316]/20 border-[#f97316]/50 text-[#f97316]",
    };
  } else if (deltaVal > 0 && scenario.forecast.st >= 0) {
    riskBadge = {
      label: "FAVORABLE ARBITRAGE",
      color: "bg-[#22c55e]/20 border-[#22c55e]/50 text-[#22c55e]",
    };
  } else if (deltaVal < 0) {
    riskBadge = {
      label: "VALUE DOWNGRADE",
      color: "bg-[#ef4444]/15 border-[#ef4444]/30 text-[#ef4444]",
    };
  }

  return (
    <div className="animate-fade-in pb-6 max-w-6xl mx-auto font-sans select-none flex flex-col flex-1 gap-4 w-full">
      {/* HUD Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-card border border-border rounded-[8px] shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Score
            </span>
            <span className="text-[18px] font-mono font-black text-foreground">
              {simScore.toLocaleString()}
            </span>
          </div>

          <div className="w-px h-6 bg-border" />

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Streak
            </span>
            <span
              className={`text-[18px] font-mono font-black ${
                simCombo > 2 ? "text-[#22c55e]" : "text-foreground"
              }`}
            >
              x{simCombo}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[12px] font-mono font-bold text-muted-foreground">
            Round {currentScenario + 1} / {scenarios.length}
          </span>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border font-mono font-bold text-[14px] transition-colors ${
              timeLeft <= 5 && guessResult === "none"
                ? "bg-[#ef4444] text-white border-[#dc2626] animate-pulse"
                : "bg-[#1e1f22] border-border text-foreground"
            }`}
          >
            <IconTimer className="w-4 h-4" />
            <span>00:{timeLeft.toString().padStart(2, "0")}</span>
          </div>
        </div>
      </div>

      {/* Main Terminal Frame */}
      <div className="bg-card border border-border rounded-[8px] overflow-hidden shadow-md flex flex-col">
        {/* Progress Line */}
        <div className="h-1 w-full bg-border">
          <div
            className="h-full bg-primary transition-[width] duration-1000 ease-linear"
            style={{ width: `${(timeLeft / SECONDS_PER_SCENARIO) * 100}%` }}
          />
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-5">
          {/* Scenario Context Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
            <div className="flex flex-col">
              <h3 className="text-[18px] font-black text-foreground tracking-tight">
                {scenario.title}
              </h3>
              <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-snug">
                {scenario.desc}
              </p>
            </div>

            <span
              className={`self-start sm:self-auto px-2.5 py-1 rounded-[4px] border text-[11px] font-mono font-bold uppercase ${riskBadge.color}`}
            >
              {riskBadge.label}
            </span>
          </div>

          {/* Side-by-Side Informational Trading Terminal */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            {/* Left: You Give */}
            <TradingTerminalUnitTile
              unit={scenario.give.unit}
              qty={scenario.give.qty}
              label="Your Offer (You Give)"
            />

            {/* Center: Live Spread & Value Delta */}
            <div className="flex flex-col items-center justify-center p-3 rounded-[8px] bg-[#1e1f22] border border-border gap-2 text-center min-w-[170px]">
              <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">
                Net Value Spread
              </span>

              <div
                className={`text-[20px] font-black font-mono leading-none ${
                  isPositiveDelta ? "text-[#22c55e]" : "text-[#ef4444]"
                }`}
              >
                {isPositiveDelta ? `+${deltaVal.toLocaleString()}` : deltaVal.toLocaleString()}
              </div>

              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                  isPositiveDelta
                    ? "bg-[#22c55e]/15 text-[#22c55e]"
                    : "bg-[#ef4444]/15 text-[#ef4444]"
                }`}
              >
                {isPositiveDelta ? `+${pctDiff}%` : `${pctDiff}%`}
              </span>

              <div className="text-[10px] text-muted-foreground font-mono mt-1 pt-1 border-t border-border/60 w-full">
                Liquidity: {giveLiq.toUpperCase()} ➔ {getLiq.toUpperCase()}
              </div>
            </div>

            {/* Right: You Get */}
            <TradingTerminalUnitTile
              unit={scenario.get.unit}
              qty={scenario.get.qty}
              label="Their Offer (You Receive)"
            />
          </div>

          {/* Action Decision Deck / Evaluation Breakdown */}
          {guessResult === "none" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleGuess("WIN")}
                className="h-12 rounded-[6px] bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-[13px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98 shadow-sm"
              >
                Accept Trade
              </button>

              <button
                type="button"
                onClick={() => handleGuess("LOSS")}
                className="h-12 rounded-[6px] bg-[#2b2d31] hover:bg-[#35373c] text-foreground font-bold text-[13px] uppercase tracking-wider border border-border flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98 shadow-sm"
              >
                Decline Offer
              </button>

              <button
                type="button"
                onClick={() => handleGuess("SCAM")}
                className="h-12 rounded-[6px] bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-[13px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98 shadow-sm"
              >
                Call Out Scam / Trap
              </button>
            </div>
          ) : (
            /* Post-Evaluation Educational Breakdown */
            <div
              className={`p-4 sm:p-5 rounded-[8px] border flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-colors ${
                guessResult === "correct"
                  ? "bg-[#22c55e]/10 border-[#22c55e]/40"
                  : guessResult === "scam"
                  ? "bg-[#ef4444]/10 border-[#ef4444]/40"
                  : "bg-[#2b2d31] border-border"
              }`}
            >
              <img
                src={AQUA_AVATAR_URL}
                alt="Goddess Aqua"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full border border-border object-cover object-top shrink-0 bg-popover"
              />

              <div className="flex flex-col flex-1 min-w-0">
                <span
                  className={`text-[14px] font-black uppercase tracking-wider ${
                    guessResult === "correct"
                      ? "text-[#22c55e]"
                      : guessResult === "scam"
                      ? "text-[#ef4444]"
                      : "text-foreground"
                  }`}
                >
                  {guessResult === "correct"
                    ? "Spot On! Aqua Approves!"
                    : guessResult === "scam"
                    ? "Trap Dodged!"
                    : guessResult === "timeout"
                    ? "Time Expired!"
                    : "Wrong Decision!"}
                </span>

                <p className="text-[13px] text-[#dbdee1] leading-relaxed mt-1">
                  {scenario.explanation}
                </p>

                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground">
                  <span>Forecast:</span>
                  <span className={scenario.forecast.st >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
                    Short-Term {scenario.forecast.st >= 0 ? `+${scenario.forecast.st.toFixed(1)}%` : `${scenario.forecast.st.toFixed(1)}%`}
                  </span>
                  <span>|</span>
                  <span className={scenario.forecast.lt >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
                    Long-Term {scenario.forecast.lt >= 0 ? `+${scenario.forecast.lt.toFixed(1)}%` : `${scenario.forecast.lt.toFixed(1)}%`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={nextScenario}
                className="self-stretch sm:self-center px-5 py-2.5 bg-foreground text-background font-bold text-[12px] uppercase tracking-wider rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              >
                {currentScenario >= scenarios.length - 1
                  ? "See Final Score"
                  : "Next Trade"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
