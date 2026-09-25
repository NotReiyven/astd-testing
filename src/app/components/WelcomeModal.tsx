import { useState, useEffect } from "react";
import {
  Check,
  Palette,
  MousePointer2,
  Maximize,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import {
  useLayoutStore,
  ThemeMode,
  BootChannel,
} from "../../store/useLayoutStore";
import { triggerHaptic } from "../../data/helpers";

export function WelcomeModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState<"legal" | "personalization" | "crossroads">(
    "legal"
  );
  const [legalView, setLegalView] = useState<"tos" | "pp" | null>(null);
  const [hasConsented, setHasConsented] = useState(false);

  const {
    theme,
    setTheme,
    globalCompactMode,
    setGlobalCompactMode,
    bootChannel,
    setBootChannel,
  } = useLayoutStore();

  useEffect(() => {
    const handleOpen = () => {
      setIsVisible(true);
      setStep("legal");
      setLegalView(null);
      document.body.style.overflow = "hidden";
    };

    window.addEventListener("open-welcome-modal", handleOpen);
    return () => window.removeEventListener("open-welcome-modal", handleOpen);
  }, []);

  const handleFinishOnboarding = (startTutorial: boolean) => {
    triggerHaptic("success");
    localStorage.setItem("astd_welcome_acknowledged", "true");
    localStorage.setItem("astd_cookie_consent", "granted");

    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: "granted",
      });
    }

    setIsVisible(false);
    document.body.style.overflow = "auto";

    if (startTutorial) {
      window.dispatchEvent(new CustomEvent("start-guest-tour"));
    }
  };

  const handleLegalNext = () => {
    if (!hasConsented) return;
    triggerHaptic("light");
    setStep("personalization");
  };

  const handlePersonalizationNext = () => {
    triggerHaptic("light");
    setStep("crossroads");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md select-none font-sans animate-fade-in">
      <div className="bg-card w-full max-w-[540px] rounded-[10px] flex flex-col border border-border shadow-2xl overflow-hidden animate-slide-up">
        {/* Header Indicator */}
        <div className="px-5 py-3.5 bg-popover border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              {legalView === "tos" && "Terms of Service"}
              {legalView === "pp" && "Privacy Policy"}
              {!legalView &&
                step === "legal" &&
                "Step 1 of 3: Terms & Compliance"}
              {!legalView &&
                step === "personalization" &&
                "Step 2 of 3: Interface Setup"}
              {!legalView &&
                step === "crossroads" &&
                "Step 3 of 3: Experience Choice"}
            </span>
          </div>
          {!legalView && (
            <span className="text-[11px] font-mono font-bold text-muted-foreground">
              {step === "legal"
                ? "1/3"
                : step === "personalization"
                ? "2/3"
                : "3/3"}
            </span>
          )}
        </div>

        {/* INLINE LEGAL VIEWER */}
        {legalView && (
          <div className="flex flex-col h-[60vh] max-h-[500px]">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-card text-[13px] text-muted-foreground leading-relaxed flex flex-col gap-4">
              {legalView === "tos" ? (
                <>
                  <h3 className="text-[18px] font-black text-foreground mb-2">
                    Terms of Service
                  </h3>
                  <p>
                    <strong className="text-foreground">
                      1. Non-Affiliation:
                    </strong>{" "}
                    ASTD Value List is a community-driven resource. We are not
                    affiliated, associated, authorized, endorsed by, or in any
                    way officially connected with Roblox Corporation or the
                    creators of All Star Tower Defense.
                  </p>
                  <p>
                    <strong className="text-foreground">
                      2. Estimates Only:
                    </strong>{" "}
                    All unit values, demand ratings, and status tags are
                    community estimates and are provided for informational
                    purposes only. We are not responsible for any "bad trades."
                  </p>
                  <p>
                    <strong className="text-foreground">3. API Usage:</strong>{" "}
                    You agree not to use automated scripts, bots, or scrapers to
                    continuously ping our API endpoints. Excessive requests will
                    result in a ban.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-[18px] font-black text-foreground mb-2">
                    Privacy Policy
                  </h3>
                  <p>
                    <strong className="text-foreground">
                      1. No PII Collection:
                    </strong>{" "}
                    We do not require account creation for core features. We do
                    not ask for your Roblox password or any sensitive personal
                    data.
                  </p>
                  <p>
                    <strong className="text-foreground">
                      2. Local Storage:
                    </strong>{" "}
                    Your active trade configurations, custom dictionary slang,
                    and UI preferences are stored locally on your device using
                    localStorage and IndexedDB.
                  </p>
                  <p>
                    <strong className="text-foreground">3. Analytics:</strong>{" "}
                    We use Google Analytics with Consent Mode v2. By accepting
                    these terms, you allow tracking cookies to monitor page
                    views and engagement time.
                  </p>
                </>
              )}
            </div>
            <div className="p-4 border-t border-border bg-popover shrink-0">
              <button
                onClick={() => {
                  triggerHaptic("light");
                  setLegalView(null);
                }}
                className="w-full py-2.5 rounded-[6px] bg-muted hover:bg-card border border-border text-foreground text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Setup
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: LEGAL COMPLIANCE */}
        {!legalView && step === "legal" && (
          <div className="p-5 md:p-7 flex flex-col gap-5">
            <div>
              <h2 className="text-[20px] md:text-[22px] font-black text-foreground tracking-tight">
                Welcome to ASTD Value List
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                Before utilizing our live market values, trade calculator, and
                automated parsing tools, please verify your consent.
              </p>
            </div>

            <div className="bg-popover rounded-[6px] p-4 border border-border flex flex-col gap-2.5 text-[12px] text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-2 text-foreground font-bold">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Disclaimer & Community Notice</span>
              </div>
              <p>
                All values and ratings are real-time community-driven market
                estimates. We are not officially affiliated with Roblox
                Corporation or All Star Tower Defense.
              </p>
              <p>
                We use strict client-side encryption and caching. Your active
                trade configurations and custom slang are stored locally on your
                device.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group select-none pt-1">
              <div className="relative flex items-center justify-center w-5 h-5 mt-0.5 rounded-[4px] border border-border bg-input group-hover:border-primary transition-colors flex-shrink-0">
                <input
                  type="checkbox"
                  className="peer absolute opacity-0 w-full h-full cursor-pointer"
                  checked={hasConsented}
                  onChange={(e) => setHasConsented(e.target.checked)}
                />
                {hasConsented && (
                  <Check className="w-3.5 h-3.5 text-primary pointer-events-none" />
                )}
              </div>
              <span className="text-[12px] text-muted-foreground leading-relaxed">
                I accept the{" "}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setLegalView("tos");
                  }}
                  className="text-primary hover:underline font-bold"
                >
                  Terms of Service
                </button>
                ,{" "}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setLegalView("pp");
                  }}
                  className="text-primary hover:underline font-bold"
                >
                  Privacy Policy
                </button>
                , and operational analytics.
              </span>
            </label>

            <button
              onClick={handleLegalNext}
              disabled={!hasConsented}
              className={`w-full py-3 rounded-[6px] text-[13px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-sm ${
                hasConsented
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-50"
              }`}
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: PERSONALIZATION PREFERENCES */}
        {!legalView && step === "personalization" && (
          <div className="p-5 md:p-7 flex flex-col gap-5">
            <div>
              <h2 className="text-[20px] md:text-[22px] font-black text-foreground tracking-tight">
                Configure Your Setup
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                Pick your aesthetic and default workflow. You can modify these
                anytime in Profile Preferences.
              </p>
            </div>

            {/* Theme selector */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-primary" /> Palette
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "dark", label: "Deep Dark", desc: "Default" },
                  { id: "discord", label: "Blurple", desc: "Discord" },
                  { id: "light", label: "Crisp Light", desc: "Clean" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      triggerHaptic("light");
                      setTheme(t.id as ThemeMode);
                    }}
                    className={`p-2.5 rounded-[6px] border text-left flex flex-col transition-all cursor-pointer focus-visible:outline-none ${
                      theme === t.id
                        ? "bg-popover border-primary ring-1 ring-primary/40 shadow-sm"
                        : "bg-muted border-border hover:bg-popover"
                    }`}
                  >
                    <span className="text-[12px] font-bold text-foreground leading-tight">
                      {t.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {t.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Boot Channel */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <MousePointer2 className="w-3.5 h-3.5 text-primary" /> Start On
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: "value-list",
                    label: "Value List",
                    desc: "Immediate data",
                  },
                  {
                    id: "trading-ads",
                    label: "Trading Ads",
                    desc: "Live trades",
                  },
                  { id: "home", label: "Home", desc: "Patch notes" },
                  {
                    id: "last-used",
                    label: "Last Used",
                    desc: "Remember state",
                  },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      triggerHaptic("light");
                      setBootChannel(b.id as BootChannel);
                    }}
                    className={`p-2.5 rounded-[6px] border text-left flex flex-col transition-all cursor-pointer focus-visible:outline-none ${
                      bootChannel === b.id
                        ? "bg-popover border-primary ring-1 ring-primary/40 shadow-sm"
                        : "bg-muted border-border hover:bg-popover"
                    }`}
                  >
                    <span className="text-[12px] font-bold text-foreground leading-tight">
                      {b.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {b.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Compact mode toggle */}
            <div className="flex items-center justify-between p-3 rounded-[6px] bg-muted border border-border">
              <div className="flex flex-col pr-2">
                <span className="text-[12px] font-bold text-foreground flex items-center gap-1.5">
                  <Maximize className="w-3.5 h-3.5 text-primary" /> Compact UI
                  Mode
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Tighter padding across tables and listings
                </span>
              </div>
              <button
                onClick={() => {
                  triggerHaptic("medium");
                  setGlobalCompactMode(!globalCompactMode);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer focus-visible:outline-none ${
                  globalCompactMode
                    ? "bg-primary"
                    : "bg-popover border border-border"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 bg-background w-5 h-5 rounded-full transition-transform shadow-sm ${
                    globalCompactMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handlePersonalizationNext}
              className="w-full py-3 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-1"
            >
              Confirm Setup <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 3: CROSSROADS (AQUA OPT-IN) */}
        {!legalView && step === "crossroads" && (
          <div className="p-5 md:p-7 flex flex-col gap-6">
            <div className="flex items-start gap-4 bg-muted/60 p-4 rounded-[8px] border border-border">
              <img
                src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png"
                alt="Goddess Aqua"
                className="w-14 h-14 rounded-full border border-border object-cover shrink-0 bg-popover shadow-sm"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-foreground">
                    Goddess Aqua
                  </span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-[2px] bg-primary/20 text-primary border border-primary/30">
                    Guide
                  </span>
                </div>
                <p className="text-[12.5px] text-muted-foreground italic mt-1.5 leading-relaxed font-medium">
                  "Look at you, finally making it through the legal disclaimer.
                  Before you go throwing your inventory away on terrible trades:
                  do you want my divine guidance on how this platform works, or
                  are you going to arrogantly wing it?"
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => handleFinishOnboarding(true)}
                className="w-full py-3.5 px-4 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] font-black uppercase tracking-wider transition-all flex items-center justify-between cursor-pointer shadow-sm group"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Show Me Around (Quick Tour)
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => handleFinishOnboarding(false)}
                className="w-full py-3 px-4 rounded-[6px] bg-muted hover:bg-popover text-muted-foreground hover:text-foreground border border-border text-[12px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" /> I Know What I'm Doing (Skip
                to App)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
