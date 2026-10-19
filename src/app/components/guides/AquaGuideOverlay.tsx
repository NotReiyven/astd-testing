import React, { useState, useEffect, useRef } from "react";
import { GuideType } from "../../../hooks/useGuideSystem";
import { triggerHaptic } from "../../../data/helpers";

export type { GuideType };

const AQUA_AVATAR_URL =
  "https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png";

const IconClose = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4L12 12M12 4L4 12" />
  </svg>
);

const IconChevronLeft = ({
  className = "w-3.5 h-3.5",
}: {
  className?: string;
}) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 12L6 8L10 4" />
  </svg>
);

const IconChevronRight = ({
  className = "w-3.5 h-3.5",
}: {
  className?: string;
}) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 12L10 8L6 4" />
  </svg>
);

const IconArrowUpRight = ({
  className = "w-3.5 h-3.5",
}: {
  className?: string;
}) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 11L11 5M6 5H11V10" />
  </svg>
);

interface BanterOption {
  label: string;
  reply: string;
}

interface GuideStep {
  title: string;
  body: string;
  actionLabel?: string;
  actionChannel?: string;
  actionEvent?: string;
  banter?: BanterOption[];
}

const GUEST_STEPS: GuideStep[] = [
  {
    title: "Market Tags & Traps",
    body: "Listen up, you shut-in NEET! Don't just stare at big numbers like Kazuma staring at a tavern menu! Look at the status tags first. A 100k unit marked !!Dropping!! or !!Inflated!! is a total trap. Check the tag before you trade!",
    actionLabel: "View Value List",
    actionChannel: "value-list",
    banter: [
      {
        label: '"What does Inflated mean?"',
        reply:
          "Aha! Glad you asked! !!Inflated!! means greedy hoarders pumped the price way past what normal players want to pay. When they dump their stock, that price crashes hard!",
      },
      {
        label: '"Didn\'t you get scammed buying a pebble?"',
        reply:
          "!!WAAAAAH!! That merchant in Axel swore it was a holy relic! How was I supposed to know it had zero demand?! That is WHY I am teaching you to check tags first!",
      },
    ],
  },
  {
    title: "The Magical Translator",
    body: "Don't search for every single unit by hand like a peasant! Open the Calculator and click the ^^Wand^^ button (or press ^^Ctrl+V^^ anywhere) to paste messy Discord trade text. It builds the whole offer for you automatically!",
    actionLabel: "Open Calculator",
    actionEvent: "open-analyzer",
    banter: [
      {
        label: '"Wait, did you code that yourself?"',
        reply:
          "Well, I blessed the servers with Sacred Create Water! Okay fine, Fire Zio fixed the math after my water shorted out the rack, but the divine inspiration was all mine!",
      },
      {
        label: '"What if they offer 8 tiny units?"',
        reply:
          "Hmph! That is called downgrading into trash! Never trade one S-Tier god unit for eight benchwarmers nobody wants unless they give you a big ^^Overpay^^!",
      },
    ],
  },
  {
    title: "Short-Term vs. Long-Term",
    body: "Inside the Calculator, check the ^^Short-Term^^ and ^^Long-Term^^ scores. Short-Term tells you if you can flip it fast today. Long-Term tells you if it will age like my favorite expensive bubbly wine! Watch out for !!Low Liquidity!! traps!",
    actionLabel: "Open Calculator",
    actionEvent: "open-analyzer",
    banter: [
      {
        label: '"Eris said her calculator is better."',
        reply:
          "!!WHAT?!!! Do not listen to that chest-padding impostor goddess! Eris pads her trade numbers just like she pads her armor! Stick with Lady Aqua!",
      },
      {
        label: '"Why are Capsules rated so high?"',
        reply:
          "Because everyone takes ^^Capsules^^ like cold hard Eris coins! You can trade them away in five minutes instead of waiting three weeks for a collector!",
      },
    ],
  },
  {
    title: "Academy & Mock Trades",
    body: "Want to test your trade instincts without risking your actual inventory? Head over to the ^^Academy^^ to play Mock Trades and earn your certification! And don't come crying to me for a Resurrection spell if you skip training!",
    actionLabel: "Go to Academy",
    actionChannel: "tutorial",
    banter: [
      {
        label: '"Thanks Lady Aqua, you actually helped!"',
        reply:
          "Hehehe, say it louder so Kazuma can hear! As reward for your devotion, I officially bless your future trades with ^^massive overpays^^! Go make the Axis Order proud!",
      },
    ],
  },
];

const AUTH_STEPS: GuideStep[] = [
  {
    title: "Your Vault & Wishlist",
    body: "Ooh, look who logged in! Head over to ^^My Inventory^^ to track your units and net worth. You can also pin high-value units in the calculator so you never clear them by mistake!",
    actionLabel: "Open My Inventory",
    actionChannel: "inventory",
    banter: [
      {
        label: '"Can people steal my units here?"',
        reply:
          "Of course not, silly! This tracks your portfolio and wishlist so other traders can see what you own and what adds you want!",
      },
    ],
  },
  {
    title: "Post Live Trading Ads",
    body: "Hit ^^Create Ad^^ on the Trading Board to post your offer to the live feed! Your past ads are saved in your Profile where you can keep them public, make them private, or delete them anytime.",
    actionLabel: "Go to Trading Board",
    actionChannel: "trading-ads",
  },
  {
    title: "Trader Profile & Rep",
    body: "Your profile tracks your public reputation and wishlist. Trade fairly so people vouch for you. If you act like a scammer, I will personally exile you! ^^Praise Aqua!^^",
    actionLabel: "View My Profile",
    actionChannel: "profile",
  },
];

export function AquaGuideOverlay({
  guideState,
  onNext,
  onPrev,
  onEndGuide,
  isAnalyzerOpen = false,
}: {
  guideState: { type: GuideType; step: number };
  onNext: (maxSteps: number) => void;
  onPrev: () => void;
  onEndGuide: () => void;
  isAnalyzerOpen?: boolean;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [boxShake, setBoxShake] = useState(false);
  const [activeBanterIdx, setActiveBanterIdx] = useState<number | null>(null);

  const fullTextRef = useRef("");
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTypewriter = (text: string) => {
    fullTextRef.current = text;
    setDisplayedText("");
    setIsTyping(true);
    setBoxShake(true);
    setTimeout(() => setBoxShake(false), 380);

    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

    let i = 0;
    typingIntervalRef.current = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i >= text.length) {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        setIsTyping(false);
      }
    }, 18);
  };

  useEffect(() => {
    setIsMinimized(false);
    setActiveBanterIdx(null);
  }, [guideState.type, guideState.step]);

  useEffect(() => {
    if (!guideState.type || guideState.step === 0) return;

    const steps = guideState.type === "guest_tour" ? GUEST_STEPS : AUTH_STEPS;
    const stepObj = steps[guideState.step - 1] || steps[0];
    const textToType =
      activeBanterIdx !== null && stepObj.banter?.[activeBanterIdx]
        ? stepObj.banter[activeBanterIdx].reply
        : stepObj.body || "";

    startTypewriter(textToType);

    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, [guideState.type, guideState.step, activeBanterIdx]);

  useEffect(() => {
    if (!guideState.type || guideState.step === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEndGuide();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [guideState.type, guideState.step, onEndGuide]);

  if (
    !guideState.type ||
    (guideState.type !== "guest_tour" && guideState.type !== "auth_tour")
  ) {
    return null;
  }

  const steps = guideState.type === "guest_tour" ? GUEST_STEPS : AUTH_STEPS;
  const currentStepData = steps[guideState.step - 1] || steps[0];
  const totalSteps = steps.length;
  const isLastStep = guideState.step >= totalSteps;

  const handleSkipTyping = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTyping) {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      setDisplayedText(fullTextRef.current);
      setIsTyping(false);
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    if (currentStepData.actionChannel) {
      window.document.dispatchEvent(
        new CustomEvent("navigate", { detail: currentStepData.actionChannel })
      );
    } else if (currentStepData.actionEvent) {
      window.dispatchEvent(new Event(currentStepData.actionEvent));
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    onNext(totalSteps);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    onPrev();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    onEndGuide();
  };

  const renderDialogue = (text?: string) => {
    const parts = (text || "").split(
      /(!!.*?!!|\^\^.*?\^\^|\*\*.*?\*\*|\*.*?\*)/g
    );
    return parts.map((part, idx) => {
      if (part.startsWith("!!") && part.endsWith("!!")) {
        return (
          <strong
            key={idx}
            className="text-destructive font-black tracking-wide animate-text-shake"
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("^^") && part.endsWith("^^")) {
        return (
          <strong key={idx} className="text-[#FAA61A] font-black tracking-wide">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong
            key={idx}
            className="text-foreground font-black tracking-wide"
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={idx} className="text-foreground/80 font-bold not-italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const mobilePosClass = isAnalyzerOpen ? "bottom-[100px]" : "bottom-[90px]";

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

        @keyframes boxShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-box-shake { animation: boxShake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>

      <aside
        aria-label="Aqua Companion Guide"
        className={`fixed ${mobilePosClass} md:bottom-6 right-3 md:right-6 z-[100010] max-w-[420px] w-[calc(100vw-24px)] md:w-[420px] transition-[transform,opacity] duration-300 ease-out animate-slide-up pointer-events-auto font-sans`}
      >
        {isMinimized ? (
          <div className="bg-card border border-border p-3 rounded-[8px] flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-full border border-border overflow-hidden bg-popover shadow-sm shrink-0">
                <img
                  src={AQUA_AVATAR_URL}
                  alt="Aqua"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-foreground leading-none">
                  Goddess Aqua
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  Step {guideState.step} of {totalSteps}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold rounded-[4px] transition-colors cursor-pointer"
              >
                Expand
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[4px] transition-colors cursor-pointer"
                title="Close Tour"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`bg-card border border-border rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden ${
              boxShake ? "animate-box-shake ring-1 ring-primary" : ""
            }`}
            onClick={handleSkipTyping}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-popover border-b border-border flex items-center justify-between relative z-20">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full border border-border overflow-hidden bg-popover shadow-sm shrink-0">
                  <img
                    src={AQUA_AVATAR_URL}
                    alt="Aqua"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top"
                  />
                  <span className="w-2.5 h-2.5 bg-[#23a559] border border-popover rounded-full absolute bottom-0 right-0 z-10" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-black text-foreground leading-tight">
                    Goddess Aqua
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Step {guideState.step} of {totalSteps}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(true);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground rounded-[4px] hover:bg-muted transition-colors cursor-pointer"
                >
                  Minimize
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[4px] transition-colors cursor-pointer"
                  title="End Tour"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 md:p-5 flex flex-col gap-3 bg-card relative z-10">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[14px] font-black text-foreground tracking-tight">
                    {currentStepData.title}
                  </h4>
                  {activeBanterIdx !== null && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBanterIdx(null);
                      }}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Back to tip
                    </button>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed font-medium pt-0.5 min-h-[60px]">
                  {renderDialogue(displayedText)}
                  {isTyping && (
                    <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse ml-1 align-middle" />
                  )}
                </p>
              </div>

              {/* Interactive Banter Replies */}
              {!isTyping &&
                currentStepData.banter &&
                currentStepData.banter.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentStepData.banter.map((b, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic("light");
                          setActiveBanterIdx(
                            activeBanterIdx === idx ? null : idx
                          );
                        }}
                        className={`px-2.5 py-1 rounded-[4px] text-[11px] font-bold border transition-colors cursor-pointer ${
                          activeBanterIdx === idx
                            ? "bg-primary/15 border-primary text-foreground"
                            : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-popover"
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                )}

              {/* Quick Action Button */}
              <div className="w-full mt-0.5">
                {currentStepData.actionLabel && !isTyping && (
                  <button
                    type="button"
                    onClick={handleAction}
                    className="w-full py-2.5 px-3 rounded-[6px] bg-muted hover:bg-popover border border-border text-foreground text-[11px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors cursor-pointer shadow-sm"
                  >
                    <span>{currentStepData.actionLabel}</span>
                    <IconArrowUpRight className="w-3.5 h-3.5 text-primary" />
                  </button>
                )}
                {isTyping && (
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 animate-pulse cursor-pointer h-[34px]">
                    Click anywhere to finish typing...
                  </span>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={guideState.step <= 1}
                  className="px-3 py-1.5 rounded-[4px] text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer flex items-center gap-1"
                >
                  <IconChevronLeft className="w-3.5 h-3.5" /> Back
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-1.5 rounded-[4px] bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer active:scale-95"
                >
                  <span>{isLastStep ? "Finish" : "Next"}</span>
                  <IconChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
