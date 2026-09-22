import { useState, useEffect } from "react";
import { Check, Maximize2 } from "lucide-react";

export function WelcomeModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setIsVisible(true);
      setIsMinimized(false);
      document.body.style.overflow = "hidden";
    };

    window.addEventListener("open-welcome-modal", handleOpen);
    return () => window.removeEventListener("open-welcome-modal", handleOpen);
  }, []);

  const handleAccept = () => {
    if (!hasConsented) return;

    localStorage.setItem("astd_welcome_acknowledged", "true");
    localStorage.setItem("astd_cookie_consent", "granted");
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag('consent', 'update', { 'analytics_storage': 'granted' });
    }

    setIsVisible(false);
    document.body.style.overflow = "auto";
    window.dispatchEvent(new Event("welcome-closed"));
  };

  const handleNavigate = (channel: string) => {
    setIsMinimized(true);
    document.body.style.overflow = "auto"; 
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: channel }));
  };

  if (!isVisible) return null;

  return (
    <div className={
      isMinimized 
        ? "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[100000] w-[calc(100vw-32px)] max-w-[380px] transition-all duration-300 ease-out"
        : "fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in transition-all duration-300"
    }>
      <div className={`bg-card w-full rounded-[8px] flex flex-col overflow-hidden border border-border transition-all duration-300 ${isMinimized ? 'shadow-[0_20px_60px_rgba(0,0,0,0.8)]' : 'max-w-[500px] shadow-2xl animate-slide-up'}`}>

        {!isMinimized && (
          <>
            <div className="pt-6 px-6 pb-5 bg-muted border-b border-border">
              <h2 className="text-[18px] font-bold text-foreground tracking-tight">
                Stop Getting Scammed.
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                Here is how you read the data, lock in your units, and use the Analyzer to check if an offer is actual garbage.
              </p>
            </div>

            <div className="flex flex-col gap-3 px-6 py-5 overflow-y-auto max-h-[60vh] custom-scrollbar bg-card">
              <div className="bg-popover p-4 rounded-[6px] border border-border">
                <span className="block text-[14px] font-bold text-foreground mb-1.5">1. Navigation</span>
                <span className="block text-[13px] text-muted-foreground leading-relaxed">
                  Use the left sidebar to access the <strong className="text-foreground font-semibold">Value List</strong>, <strong className="text-foreground font-semibold">Trading Ads</strong>, and <strong className="text-foreground font-semibold">Your Inventory</strong>. On mobile, swipe right to open the menu.
                </span>
              </div>
              <div className="bg-popover p-4 rounded-[6px] border border-border">
                <span className="block text-[14px] font-bold text-foreground mb-1.5">2. Read the Market Tags</span>
                <span className="block text-[13px] text-muted-foreground leading-relaxed">
                  Raw value is useless without context. Always check a unit's status tag (e.g., <strong className="text-foreground font-semibold">Rising</strong>, <strong className="text-[#ef4444] font-semibold">Dropping</strong>, or <strong className="text-[#38bdf8] font-semibold">Highballed</strong>) to understand its trajectory before accepting a trade.
                </span>
              </div>
              <div className="bg-popover p-4 rounded-[6px] border border-border">
                <span className="block text-[14px] font-bold text-foreground mb-1.5">3. The Trade Analyzer</span>
                <span className="block text-[13px] text-muted-foreground leading-relaxed">
                  Click any unit card to throw it into your "Give" or "Get" columns. The Analyzer breaks down the mathematical difference and projects long-term momentum. 
                </span>
              </div>
            </div>
          </>
        )}

        {isMinimized && (
          <div className="px-5 py-3 bg-muted border-b border-border flex justify-between items-center">
            <span className="text-[13px] font-bold text-foreground uppercase tracking-wide">Legal Agreement</span>
            <button 
              onClick={() => { setIsMinimized(false); document.body.style.overflow = "hidden"; }}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-[11px] font-bold uppercase transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Read Overview
            </button>
          </div>
        )}

        <div className={`p-4 bg-muted flex flex-col sm:flex-row items-center justify-between gap-4 ${!isMinimized ? 'border-t border-border' : ''}`}>
          <label className="flex items-start gap-2.5 cursor-pointer group select-none w-full sm:w-auto">
            <div className="relative flex items-center justify-center w-5 h-5 mt-0.5 rounded-[4px] border border-border bg-card group-hover:border-primary transition-colors flex-shrink-0">
              <input
                type="checkbox"
                className="peer absolute opacity-0 w-full h-full cursor-pointer"
                checked={hasConsented}
                onChange={(e) => setHasConsented(e.target.checked)}
              />
              {hasConsented && <Check className="w-3.5 h-3.5 text-primary pointer-events-none" />}
            </div>
            <span className="text-[12px] text-muted-foreground leading-relaxed">
              I accept the{" "}
              <button type="button" onClick={() => handleNavigate('terms-of-service')} className="text-primary hover:underline focus:outline-none font-medium">Terms of Service</button>
              ,{" "}
              <button type="button" onClick={() => handleNavigate('privacy-policy')} className="text-primary hover:underline focus:outline-none font-medium">Privacy Policy</button>
              , and cookies.
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!hasConsented}
            className={`px-6 py-2 rounded-[4px] text-[13px] font-bold transition-all flex-shrink-0 w-full sm:w-auto active:scale-[0.98] ${
              hasConsented 
                ? "bg-primary hover:bg-primary/90 text-primary-foreground border border-primary shadow-sm" 
                : "bg-popover text-muted-foreground border border-border cursor-not-allowed"
            }`}
          >
            Continue{isMinimized ? "" : " to App"}
          </button>
        </div>

      </div>
    </div>
  );
}