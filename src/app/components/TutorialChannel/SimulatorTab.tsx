// ================================================
// FILE: src/app/components/TutorialChannel/SimulatorTab.tsx
// ================================================

import React, { useState, useCallback, useEffect } from "react";
import {
  ArrowRight,
  Sparkles,
  Activity,
  RotateCcw,
  BookOpen,
  List,
  Timer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowDown,
} from "lucide-react";
import { StaticStatusBadge } from "./TutorialUI";
import { useUnits } from "../../../context/UnitContext";
import { MasterUnit } from "../../../types";
import { getProxyImage, handleImageError } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";
import { useTradeStore } from "../../../store/useTradeStore";
import { buildScenariosList, Scenario } from "./simulatorEngine";

const SECONDS_PER_SCENARIO = 20;

const ScenarioUnitDisplay = ({
  unit,
  qty,
}: {
  unit: MasterUnit;
  qty: number;
}) => {
  const proxyUrl = getProxyImage(unit.id, unit.imageUrl);
  const totalVal = (unit.value as number) * qty;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 w-full">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="relative w-16 h-16 rounded-[8px] bg-background border border-border flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
          {qty > 1 && (
            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[12px] font-black px-2 py-0.5 rounded-full z-30 border-[3px] border-popover shadow-sm">
              x{qty}
            </div>
          )}
          <div
            className="absolute inset-0 flex items-center justify-center text-white font-bold text-[18px] z-0"
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
          <span className="text-[18px] font-bold text-foreground truncate tracking-tight">
            {unit.name}
          </span>
          <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider truncate mt-1">
            {unit.subtitle || "Official Unit"}
          </span>
        </div>
      </div>

      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 gap-2 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-border sm:border-t-0">
        <span className="text-[24px] font-black font-mono text-foreground leading-none">
          {totalVal.toLocaleString()}
        </span>
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

    if (guess === scenarios[currentScenario].correct) {
      setGuessResult("correct");
      // Bonus points for answering fast
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
        <Sparkles className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="font-bold">Loading live market data...</p>
      </div>
    );
  }

  if (isAssessmentComplete) {
    return (
      <div className="animate-fade-in pb-6 max-w-4xl mx-auto font-sans select-none flex flex-col flex-1 justify-center h-full">
        <div className="bg-card border border-border rounded-[12px] p-8 md:p-12 shadow-xl flex flex-col items-center text-center my-auto">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
            <Activity className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-[24px] md:text-[32px] font-black text-foreground tracking-tight mb-2">
            Assessment Concluded
          </h2>
          <p className="text-muted-foreground text-[14px] uppercase tracking-widest mb-8 font-bold">
            Final Score:{" "}
            <span className="text-primary">{simScore.toLocaleString()}</span>
          </p>

          <div className="w-full h-px bg-border my-2" />

          <p className="text-muted-foreground text-[15px] leading-relaxed mb-10 max-w-lg mt-6">
            Trading algorithms provide pure mathematical statistics, but a human
            trader must adapt to shifting trends. Your score reflects your
            ability to balance raw value metrics against liquidity and market
            manipulation.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <button
              onClick={startSimulator}
              className="w-full sm:w-auto px-8 py-4 rounded-[8px] bg-primary text-primary-foreground font-bold text-[14px] transition-all hover:brightness-110 active:scale-95 shadow-sm flex items-center justify-center gap-2 focus-visible:outline-none"
            >
              <RotateCcw className="w-4 h-4" /> Retake Assessment
            </button>
            <button
              onClick={() => handleNavigate("theory")}
              className="w-full sm:w-auto px-8 py-4 rounded-[8px] bg-muted text-foreground font-bold text-[14px] transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none flex items-center justify-center gap-2 shadow-sm"
            >
              <BookOpen className="w-4 h-4" /> Review Theory
            </button>
            <button
              onClick={() => handleNavigate("value-list")}
              className="w-full sm:w-auto px-8 py-4 rounded-[8px] bg-muted text-foreground font-bold text-[14px] transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none flex items-center justify-center gap-2 shadow-sm"
            >
              <List className="w-4 h-4" /> Return to Market
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-6 max-w-5xl mx-auto font-sans select-none h-full flex flex-col">
      {!isSimulatorRunning && simScore === 0 ? (
        <div className="flex-1 flex flex-col justify-center">
          <div className="bg-card border border-border rounded-[12px] p-8 md:p-10 shadow-lg flex flex-col gap-8 w-full my-auto max-w-2xl mx-auto">
            <div className="flex items-center gap-4 border-b border-border pb-6">
              <div className="relative w-16 h-16 rounded-full border border-border overflow-hidden bg-popover shadow-sm shrink-0">
                <img
                  src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png"
                  className="w-full h-full object-cover object-top"
                  alt="Aqua"
                />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[24px] md:text-[28px] font-black text-foreground tracking-tight leading-none mb-1.5">
                  Certification Assessment
                </h2>
                <span className="text-[12px] font-bold uppercase tracking-widest text-primary mt-0.5">
                  Assessor: Goddess Aqua
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <p className="text-[14px] text-foreground leading-relaxed">
                Think you're a trading prodigy? Prove it. I've magically made a
                way to pull <strong>real units from the live value list</strong>{" "}
                and generate mathematically balanced market baits.
              </p>

              <div className="bg-popover border-l-4 border-l-destructive border-y border-y-border border-r border-r-border rounded-r-[8px] p-4 shadow-inner flex items-start gap-4">
                <img
                  src="/units/firezio.webp"
                  className="w-10 h-10 rounded-full border border-destructive object-cover shrink-0 bg-popover"
                  alt="Fire Zio"
                />
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-destructive">
                    Fire Zio's Observation
                  </span>
                  <p className="text-muted-foreground text-[13px] italic font-medium leading-relaxed">
                    "The trade is automatically loaded into your Calculator on
                    the right. Analyze the math, check the forecast, and tell me
                    if it's a win. Do not fail."
                  </p>
                </div>
              </div>

              <div className="bg-[#FAA61A]/10 border border-[#FAA61A]/20 rounded-[8px] p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#FAA61A] shrink-0 mt-0.5" />
                <p className="text-foreground text-[12.5px] leading-relaxed">
                  <strong className="text-[#FAA61A] block mb-1">
                    Disclaimer
                  </strong>
                  This simulator utilizes rigid mathematical algorithms to
                  determine win/loss states based on current stats. Real market
                  trading requires reading the room, predicting trends, and
                  human intuition. Always prioritize your own market knowledge
                  over pure statistics.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end mt-2">
              <button
                onClick={startSimulator}
                className="bg-primary hover:bg-primary/80 text-primary-foreground px-8 py-3 rounded-[6px] text-[13px] font-bold uppercase tracking-wider transition-all active:scale-95 focus-visible:outline-none shadow-md w-full md:w-auto flex items-center justify-center gap-2 cursor-pointer"
              >
                Commence Live Assessment <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 flex-1">
          <div className="flex items-center justify-between px-6 py-4 bg-card border border-border rounded-[12px] shadow-sm">
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Score
                </span>
                <span className="text-[20px] font-black text-foreground font-mono leading-none">
                  {simScore.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Streak
                </span>
                <span
                  className={`text-[20px] font-black font-mono leading-none transition-colors ${
                    simCombo > 2 ? "text-[#22c55e]" : "text-foreground"
                  }`}
                >
                  x{simCombo}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Question
                </span>
                <span className="text-[16px] font-black text-foreground leading-none">
                  {currentScenario + 1} / {scenarios.length}
                </span>
              </div>
              <div
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[8px] shadow-inner transition-colors ${
                  timeLeft <= 5 && guessResult === "none"
                    ? "bg-[#ef4444] text-white animate-pulse"
                    : "bg-popover border border-border text-foreground"
                }`}
              >
                <Timer className="w-5 h-5" />
                <span className="font-mono font-black text-[16px] tracking-wide">
                  00:{timeLeft.toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-[12px] border border-border relative overflow-hidden shadow-lg flex flex-col flex-1">
            <div className="h-1.5 w-full bg-primary/20">
              <div
                className="h-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / SECONDS_PER_SCENARIO) * 100}%` }}
              />
            </div>

            <div className="p-6 md:p-10 flex flex-col flex-1">
              <div className="flex flex-col gap-2 mb-10">
                <h3 className="text-[24px] md:text-[28px] font-black text-foreground tracking-tight">
                  {scenarios[currentScenario].title}
                </h3>
                <p className="text-[15px] text-muted-foreground leading-relaxed max-w-2xl">
                  {scenarios[currentScenario].desc}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center mb-10">
                <div className="bg-popover border border-border rounded-[8px] p-6 flex flex-col gap-6 shadow-sm min-h-[160px]">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                      You Give
                    </span>
                  </div>
                  <ScenarioUnitDisplay
                    unit={scenarios[currentScenario].give.unit}
                    qty={scenarios[currentScenario].give.qty}
                  />
                </div>

                <div className="flex justify-center items-center text-muted-foreground px-2">
                  <ArrowRight className="w-6 h-6 hidden md:block opacity-50" />
                  <ArrowDown className="w-6 h-6 md:hidden opacity-50" />
                </div>

                <div className="bg-popover border border-border rounded-[8px] p-6 flex flex-col gap-6 shadow-sm min-h-[160px]">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                      You Get
                    </span>
                  </div>
                  <ScenarioUnitDisplay
                    unit={scenarios[currentScenario].get.unit}
                    qty={scenarios[currentScenario].get.qty}
                  />
                </div>
              </div>

              <div className="mt-auto min-h-[140px] flex flex-col justify-end">
                {guessResult === "none" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full animate-fade-in">
                    <button
                      onClick={() => handleGuess("WIN")}
                      className="group flex flex-col items-center justify-center gap-1.5 py-4 sm:py-5 rounded-[8px] bg-[#22c55e] text-white transition-all hover:brightness-110 active:scale-95 shadow-md focus-visible:outline-none cursor-pointer"
                    >
                      <span className="font-black text-[16px] uppercase tracking-wider">
                        Accept
                      </span>
                      <span className="text-[12px] text-white/90 font-medium">
                        Winning Trade
                      </span>
                    </button>
                    <button
                      onClick={() => handleGuess("LOSS")}
                      className="group flex flex-col items-center justify-center gap-1.5 py-4 sm:py-5 rounded-[8px] bg-muted text-foreground transition-all hover:bg-muted/80 active:scale-95 shadow-md focus-visible:outline-none cursor-pointer border border-border"
                    >
                      <span className="font-black text-[16px] uppercase tracking-wider">
                        Decline
                      </span>
                      <span className="text-[12px] text-muted-foreground font-medium">
                        Losing Trade
                      </span>
                    </button>
                    <button
                      onClick={() => handleGuess("SCAM")}
                      className="group flex flex-col items-center justify-center gap-1.5 py-4 sm:py-5 rounded-[8px] bg-[#ef4444] text-white transition-all hover:brightness-110 active:scale-95 shadow-md focus-visible:outline-none cursor-pointer"
                    >
                      <span className="font-black text-[16px] uppercase tracking-wider">
                        Scam
                      </span>
                      <span className="text-[12px] text-white/90 font-medium">
                        Unreasonable Ask
                      </span>
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-[8px] border transition-all animate-slide-up shadow-sm"
                    style={{
                      backgroundColor:
                        guessResult === "correct"
                          ? "rgba(34, 197, 94, 0.05)"
                          : guessResult === "scam"
                          ? "rgba(239, 68, 68, 0.05)"
                          : "var(--muted)",
                      borderColor:
                        guessResult === "correct"
                          ? "rgba(34, 197, 94, 0.2)"
                          : guessResult === "scam"
                          ? "rgba(239, 68, 68, 0.2)"
                          : "var(--border)",
                    }}
                  >
                    <div className="shrink-0">
                      {guessResult === "correct" ? (
                        <CheckCircle2 className="w-14 h-14 text-[#22c55e]" />
                      ) : guessResult === "scam" ? (
                        <AlertTriangle className="w-14 h-14 text-[#ef4444]" />
                      ) : (
                        <XCircle className="w-14 h-14 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col flex-1 text-center md:text-left">
                      <span
                        className="text-[16px] font-black uppercase tracking-wider mb-2"
                        style={{
                          color:
                            guessResult === "correct"
                              ? "#22c55e"
                              : guessResult === "scam"
                              ? "#ef4444"
                              : "var(--foreground)",
                        }}
                      >
                        {guessResult === "correct"
                          ? "Correct Assessment"
                          : guessResult === "scam"
                          ? "Trade Avoided"
                          : guessResult === "timeout"
                          ? "Time Expired"
                          : "Incorrect Assessment"}
                      </span>
                      <p className="text-[14px] text-foreground leading-relaxed mb-6">
                        {guessResult === "scam"
                          ? `You identified this as a heavily manipulated or unreasonable trade. The algorithm calculated it as a ${
                              scenarios[currentScenario].forecast.st >= 0 ||
                              scenarios[currentScenario].forecast.lt >= 0
                                ? "WIN"
                                : "LOSS"
                            }, but real-world market knowledge overrides pure math.`
                          : scenarios[currentScenario].explanation}
                      </p>
                      <button
                        onClick={nextScenario}
                        className="self-center md:self-start px-8 py-3 bg-popover hover:bg-card text-foreground text-[13px] font-black uppercase tracking-wider rounded-[6px] transition-all shadow-sm focus-visible:outline-none active:scale-95 border border-border cursor-pointer"
                      >
                        {currentScenario >= scenarios.length - 1
                          ? "Complete Assessment"
                          : "Next Scenario"}
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
