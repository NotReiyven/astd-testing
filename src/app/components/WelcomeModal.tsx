import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useLayoutStore,
  ThemeMode,
  BootChannel,
} from "../../store/useLayoutStore";
import { triggerHaptic } from "../../data/helpers";

const AQUA_AVATAR_URL =
  "https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png";

const IconCheck = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
  </svg>
);

const IconArrowRight = ({
  className = "w-4 h-4",
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
    <path d="M3 8H13M9 4L13 8L9 12" />
  </svg>
);

const IconArrowLeft = ({
  className = "w-4 h-4",
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
    <path d="M13 8H3M7 4L3 8L7 12" />
  </svg>
);

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

const THEME_DETAILS: {
  id: ThemeMode;
  label: string;
  shortDesc: string;
  whatChanges: string;
  previewBg: string;
  previewCard: string;
  previewBorder: string;
  previewText: string;
  previewMuted: string;
}[] = [
  {
    id: "dark",
    label: "Deep Dark",
    shortDesc: "High contrast",
    whatChanges:
      "Pitch-black background with dark charcoal cards. Makes unit rarity colors stand out clearly.",
    previewBg: "#0b0c10",
    previewCard: "#14161d",
    previewBorder: "#262936",
    previewText: "#f2f3f5",
    previewMuted: "#949ba4",
  },
  {
    id: "discord",
    label: "Blurple",
    shortDesc: "Discord gray",
    whatChanges:
      "Softer Discord-style slate gray surfaces with blurple accents. Easier on the eyes in dim rooms.",
    previewBg: "#1e1f22",
    previewCard: "#2b2d31",
    previewBorder: "#3f4147",
    previewText: "#f2f3f5",
    previewMuted: "#b5bac1",
  },
  {
    id: "light",
    label: "Crisp Light",
    shortDesc: "Daylight",
    whatChanges:
      "Clean white cards with dark text. Best if you trade in a bright room or prefer light mode.",
    previewBg: "#f2f3f5",
    previewCard: "#ffffff",
    previewBorder: "#dcdfe4",
    previewText: "#060607",
    previewMuted: "#4e5058",
  },
];

const BOOT_CHANNELS: {
  id: BootChannel;
  label: string;
  shortDesc: string;
  whatChanges: string;
}[] = [
  {
    id: "value-list",
    label: "Value List",
    shortDesc: "Unit prices & tags",
    whatChanges:
      "Opens straight to the unit database so you can search prices, demand, and status tags right away.",
  },
  {
    id: "trading-ads",
    label: "Trading Ads",
    shortDesc: "Community trade board",
    whatChanges:
      "Opens to live trade posts from other players where you can browse deals or post your own offer.",
  },
  {
    id: "home",
    label: "Home",
    shortDesc: "Update logs & news",
    whatChanges:
      "Opens to the latest value changes, announcements, and community notices first.",
  },
  {
    id: "last-used",
    label: "Last Used",
    shortDesc: "Remember my tab",
    whatChanges:
      "Automatically reopens whichever page you were looking at the last time you visited.",
  },
];

export function WelcomeModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState<"legal" | "personalization" | "crossroads">(
    "legal"
  );
  const [legalView, setLegalView] = useState<"tos" | "pp" | null>(null);
  const [hasConsented, setHasConsented] = useState(false);
  const [aquaReply, setAquaReply] = useState<"default" | "praise" | "tease">(
    "default"
  );

  const navigate = useNavigate();

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
      setAquaReply("default");
      setHasConsented(
        localStorage.getItem("astd_welcome_acknowledged") === "true"
      );
      document.body.style.overflow = "hidden";
    };

    window.addEventListener("open-welcome-modal", handleOpen);
    window.addEventListener("trigger-welcome-modal", handleOpen);
    return () => {
      window.removeEventListener("open-welcome-modal", handleOpen);
      window.removeEventListener("trigger-welcome-modal", handleOpen);
    };
  }, []);

  const handleFinishOnboarding = (startTutorial: boolean) => {
    triggerHaptic("success");
    localStorage.setItem("astd_welcome_acknowledged", "true");
    localStorage.setItem("astd_welcome_completed", "true");
    localStorage.setItem("astd_cookie_consent", "granted");

    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: "granted",
      });
    }

    setIsVisible(false);
    document.body.style.overflow = "auto";
    window.dispatchEvent(new Event("welcome-closed"));

    if (startTutorial) {
      window.dispatchEvent(new CustomEvent("start-guest-tour"));
    } else if (bootChannel !== "last-used") {
      navigate(`/${bootChannel}`);
    }
  };

  useEffect(() => {
    if (!isVisible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleFinishOnboarding(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isVisible, bootChannel]);

  if (!isVisible) return null;

  const activeThemeInfo =
    THEME_DETAILS.find((t) => t.id === theme) || THEME_DETAILS[0];
  const activeBootInfo =
    BOOT_CHANNELS.find((b) => b.id === bootChannel) || BOOT_CHANNELS[0];

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 select-none font-sans overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card w-full max-w-[560px] rounded-[10px] flex flex-col border border-border shadow-2xl overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-popover border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              {legalView === "tos" && "Terms of Service"}
              {legalView === "pp" && "Privacy Policy"}
              {!legalView && step === "legal" && "Step 1 of 3: Before You Trade"}
              {!legalView &&
                step === "personalization" &&
                "Step 2 of 3: Interface Setup"}
              {!legalView &&
                step === "crossroads" &&
                "Step 3 of 3: Quick Tour"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!legalView && (
              <span className="text-[11px] font-bold text-muted-foreground">
                {step === "legal"
                  ? "1/3"
                  : step === "personalization"
                  ? "2/3"
                  : "3/3"}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleFinishOnboarding(false)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-[4px] hover:bg-muted transition-colors cursor-pointer"
              title="Close setup"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* INLINE LEGAL VIEWER */}
        {legalView && (
          <div className="flex flex-col h-[60vh] max-h-[480px]">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-card text-[13px] text-muted-foreground leading-relaxed flex flex-col gap-4">
              {legalView === "tos" ? (
                <>
                  <h3 className="text-[18px] font-black text-foreground mb-1">
                    Terms of Service
                  </h3>
                  <p>
                    <strong className="text-foreground">
                      1. Fan-Made Site:
                    </strong>{" "}
                    ASTD Value List is a community project. We are not
                    affiliated with Roblox Corporation or the developers of All
                    Star Tower Defense.
                  </p>
                  <p>
                    <strong className="text-foreground">
                      2. Market Estimates:
                    </strong>{" "}
                    All unit values, demand scores, and status tags are
                    community estimates based on observed trades. You are
                    responsible for your own trades in-game.
                  </p>
                  <p>
                    <strong className="text-foreground">3. Fair Use:</strong>{" "}
                    Do not use automated bots or scrapers to spam our endpoints.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-[18px] font-black text-foreground mb-1">
                    Privacy Policy
                  </h3>
                  <p>
                    <strong className="text-foreground">
                      1. No Passwords:
                    </strong>{" "}
                    You do not need an account to use the value list or
                    calculator, and we never ask for your Roblox password.
                  </p>
                  <p>
                    <strong className="text-foreground">
                      2. Local Preferences:
                    </strong>{" "}
                    Your theme, compact mode, calculator settings, and custom
                    slang are saved directly in your browser.
                  </p>
                  <p>
                    <strong className="text-foreground">3. Analytics:</strong>{" "}
                    We use basic page analytics to see which tools are used most
                    and keep the site running smoothly.
                  </p>
                </>
              )}
            </div>
            <div className="p-4 border-t border-border bg-popover shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setLegalView(null);
                }}
                className="w-full py-2.5 rounded-[6px] bg-muted hover:bg-card border border-border text-foreground text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <IconArrowLeft className="w-4 h-4" /> Back
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: GROUND RULES */}
        {!legalView && step === "legal" && (
          <div className="p-5 md:p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-[20px] md:text-[22px] font-black text-foreground tracking-tight">
                Welcome to ASTD Value List
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                Before you jump into the value list and trade calculator, please
                keep these three things in mind:
              </p>
            </div>

            <div className="bg-popover rounded-[8px] p-4 border border-border flex flex-col gap-3 text-[12.5px] text-muted-foreground leading-relaxed">
              <div>
                <span className="text-foreground font-bold block">
                  1. Community-Run Numbers
                </span>
                We are not the official game devs. Prices come from real trades
                tracked by active traders in the community.
              </div>
              <div className="border-t border-border pt-2.5">
                <span className="text-foreground font-bold block">
                  2. Check Demand, Not Just Value
                </span>
                Values shift whenever a new update drops. A unit with high paper
                value but terrible demand or a Dropping tag is hard to trade
                away.
              </div>
              <div className="border-t border-border pt-2.5">
                <span className="text-foreground font-bold block">
                  3. Your Trades Are Your Call
                </span>
                Our tools help you spot bad deals, but once you click Accept in
                Roblox, that trade is final. Read our{" "}
                <button
                  type="button"
                  onClick={() => setLegalView("tos")}
                  className="text-primary hover:underline font-bold cursor-pointer"
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => setLegalView("pp")}
                  className="text-primary hover:underline font-bold cursor-pointer"
                >
                  Privacy Policy
                </button>
                .
              </div>
            </div>

            {/* Consent Checkbox */}
            <label
              onClick={() => {
                triggerHaptic("light");
                setHasConsented(!hasConsented);
              }}
              className={`flex items-center gap-3 p-3.5 rounded-[6px] border transition-colors cursor-pointer ${
                hasConsented
                  ? "bg-primary/10 border-primary/40"
                  : "bg-muted border-border hover:bg-popover"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-[4px] flex items-center justify-center border transition-colors shrink-0 ${
                  hasConsented
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-card border-border"
                }`}
              >
                {hasConsented && <IconCheck className="w-3.5 h-3.5" />}
              </div>
              <span className="text-[12.5px] font-bold text-foreground leading-snug">
                I understand that values are community estimates and I agree to
                the Terms of Service.
              </span>
            </label>

            <button
              type="button"
              onClick={() => {
                if (!hasConsented) return;
                triggerHaptic("light");
                setStep("personalization");
              }}
              disabled={!hasConsented}
              className="w-full py-3 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none text-[13px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              Continue to Setup <IconArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: COMMUNICATIVE INTERFACE SETUP */}
        {!legalView && step === "personalization" && (
          <div className="p-5 md:p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-[19px] md:text-[21px] font-black text-foreground tracking-tight">
                Customize Your Workspace
              </h2>
              <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-relaxed">
                Pick how the site looks and which page opens first. You can
                change any of these later in your Profile settings.
              </p>
            </div>

            {/* CLEAR, UNCLIPPED LIVE PREVIEW */}
            <div className="rounded-[8px] border border-border overflow-hidden shrink-0">
              <div className="px-3.5 py-2 bg-popover border-b border-border flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Live Preview ({activeThemeInfo.label} •{" "}
                  {globalCompactMode ? "Compact" : "Standard"})
                </span>
                <span className="text-[10px] font-bold text-primary">
                  Starts on: {activeBootInfo.label}
                </span>
              </div>

              <div
                style={{
                  backgroundColor: activeThemeInfo.previewBg,
                  color: activeThemeInfo.previewText,
                }}
                className="p-3.5 transition-colors"
              >
                <div
                  style={{
                    backgroundColor: activeThemeInfo.previewCard,
                    borderColor: activeThemeInfo.previewBorder,
                  }}
                  className={`rounded-[6px] border flex items-center justify-between transition-all ${
                    globalCompactMode ? "px-3 py-2" : "px-4 py-3"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`rounded-[6px] bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] font-black flex items-center justify-center shrink-0 ${
                        globalCompactMode
                          ? "w-8 h-8 text-[11px]"
                          : "w-10 h-10 text-[13px]"
                      }`}
                    >
                      S
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`font-black truncate ${
                          globalCompactMode ? "text-[13px]" : "text-[15px]"
                        }`}
                      >
                        Fire Zio
                      </div>
                      <div
                        style={{ color: activeThemeInfo.previewMuted }}
                        className="text-[11px] truncate"
                      >
                        {globalCompactMode
                          ? "Compact row: fits more units on screen"
                          : "Standard card: larger unit spacing"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <div
                      className={`font-black text-[#23a559] ${
                        globalCompactMode ? "text-[13px]" : "text-[15px]"
                      }`}
                    >
                      2,450 Val
                    </div>
                    <span className="inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[4px] bg-[#23a559]/15 text-[#23a559]">
                      Rising
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. Theme Selector */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  1. Color Theme
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {activeThemeInfo.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {THEME_DETAILS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setTheme(t.id);
                    }}
                    className={`p-2.5 rounded-[6px] border text-left flex flex-col transition-all cursor-pointer ${
                      theme === t.id
                        ? "bg-popover border-primary ring-1 ring-primary/40 shadow-sm"
                        : "bg-muted border-border hover:bg-popover"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[12px] font-bold text-foreground leading-tight">
                        {t.label}
                      </span>
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: t.previewBg }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {t.shortDesc}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11.5px] text-muted-foreground leading-snug pt-0.5">
                {activeThemeInfo.whatChanges}
              </p>
            </div>

            {/* 2. Start On Channel */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  2. Default Startup Page
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {activeBootInfo.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {BOOT_CHANNELS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setBootChannel(b.id);
                    }}
                    className={`p-2.5 rounded-[6px] border text-left flex flex-col transition-all cursor-pointer ${
                      bootChannel === b.id
                        ? "bg-popover border-primary ring-1 ring-primary/40 shadow-sm"
                        : "bg-muted border-border hover:bg-popover"
                    }`}
                  >
                    <span className="text-[12px] font-bold text-foreground leading-tight">
                      {b.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {b.shortDesc}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11.5px] text-muted-foreground leading-snug pt-0.5">
                {activeBootInfo.whatChanges}
              </p>
            </div>

            {/* 3. Compact Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-[6px] bg-muted border border-border">
              <div className="flex flex-col pr-3">
                <span className="text-[12px] font-bold text-foreground">
                  3. Compact UI Mode
                </span>
                <span className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                  {globalCompactMode
                    ? "Active: Smaller card padding so you can scan more units at once."
                    : "Off: Standard card spacing with larger unit rows."}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  setGlobalCompactMode(!globalCompactMode);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
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

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setStep("legal")}
                className="px-4 py-3 rounded-[6px] bg-muted hover:bg-popover border border-border text-muted-foreground hover:text-foreground text-[12px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setStep("crossroads");
                }}
                className="flex-1 py-3 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                Confirm Setup <IconArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: AQUA OPT-IN */}
        {!legalView && step === "crossroads" && (
          <div className="p-5 md:p-6 flex flex-col gap-5">
            <div className="flex items-start gap-4 bg-popover p-4 rounded-[8px] border border-border">
              <img
                src={AQUA_AVATAR_URL}
                alt="Goddess Aqua"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full border border-border object-cover object-top shrink-0 bg-muted shadow-sm"
              />
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-black text-foreground">
                    Goddess Aqua
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] bg-primary/15 text-primary border border-primary/30">
                    Water Goddess
                  </span>
                </div>

                {aquaReply === "default" && (
                  <p className="text-[13px] text-foreground/90 mt-2 leading-relaxed">
                    &ldquo;Hey! Look who finally finished setting up their
                    screen! Listen up, shut-in NEET: before you go trading your
                    best units for magic cabbages like Kazuma, do you want my
                    divine guidance on how this site works, or are you going to
                    arrogantly wing it?&rdquo;
                  </p>
                )}

                {aquaReply === "praise" && (
                  <p className="text-[13px] text-foreground/90 mt-2 leading-relaxed">
                    &ldquo;Hehehe, say it louder! Finally someone around here
                    shows proper respect for the Goddess of Water! Stick with me
                    and you&apos;ll never fall for an inflated trap unit again.
                    Come on, let&apos;s start the tour!&rdquo;
                  </p>
                )}

                {aquaReply === "tease" && (
                  <p className="text-[13px] text-foreground/90 mt-2 leading-relaxed">
                    &ldquo;WAAAAAH! Who told you my Intelligence stat is low?!
                    Did Kazuma spread rumors about me again?! I&apos;ll have you
                    know I am an elite Archpriest! If you skip my tour and get
                    scammed in five minutes, don&apos;t come crying to me!&rdquo;
                  </p>
                )}

                {/* Quick banter replies */}
                <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setAquaReply("praise");
                    }}
                    className={`px-2.5 py-1 rounded-[4px] text-[11px] font-bold border transition-colors cursor-pointer ${
                      aquaReply === "praise"
                        ? "bg-primary/15 border-primary text-foreground"
                        : "bg-muted border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    &ldquo;Praise Lady Aqua! Lead the way!&rdquo;
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setAquaReply("tease");
                    }}
                    className={`px-2.5 py-1 rounded-[4px] text-[11px] font-bold border transition-colors cursor-pointer ${
                      aquaReply === "tease"
                        ? "bg-destructive/15 border-destructive text-foreground"
                        : "bg-muted border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    &ldquo;Wait, aren&apos;t you the useless goddess?&rdquo;
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleFinishOnboarding(true)}
                className="w-full py-3.5 px-4 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] font-black uppercase tracking-wider transition-all flex items-center justify-between cursor-pointer shadow-sm group"
              >
                <span>Show Me Around (Quick Tour)</span>
                <IconArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("personalization")}
                  className="px-4 py-3 rounded-[6px] bg-muted hover:bg-popover text-muted-foreground hover:text-foreground border border-border text-[12px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleFinishOnboarding(false)}
                  className="flex-1 py-3 px-4 rounded-[6px] bg-muted hover:bg-popover text-muted-foreground hover:text-foreground border border-border text-[12px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  I Know What I&apos;m Doing (Skip to App)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
