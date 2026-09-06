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
    // Instantly unlock the scroll wheel so they can read the legal text
    document.body.style.overflow = "auto"; 
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: channel }));
  };

  if (!isVisible) return null;

  return (
    <div className={
      isMinimized 
        ? "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[100000] w-[calc(100vw-32px)] max-w-[380px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        : "fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 animate-fade-in transition-all duration-500"
    }>
      <div className={`bg-[#313338] w-full rounded-[8px] flex flex-col overflow-hidden border border-[rgba(255,255,255,0.05)] transition-all duration-500 ${isMinimized ? 'shadow-[0_20px_60px_rgba(0,0,0,0.8)]' : 'max-w-[500px] shadow-2xl animate-slide-up'}`}>

        {!isMinimized && (
          <>
            <div className="pt-6 px-6 pb-5 bg-[#2B2D31] border-b border-[rgba(255,255,255,0.04)]">
              <h2 className="text-[18px] font-bold text-[#F2F3F5] tracking-tight">
                ASTD Value List Overview
              </h2>
              <p className="text-[13px] text-[#B5BAC1] mt-1.5 leading-relaxed">
                A quick guide on how to navigate the platform, interpret unit values, and use the built-in trading tools.
              </p>
            </div>

            <div className="flex flex-col gap-3 px-6 py-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="bg-[#2B2D31] p-4 rounded-[6px] border border-[rgba(255,255,255,0.03)]">
                <span className="block text-[14px] font-semibold text-[#DBDEE1] mb-1.5">1. Navigation</span>
                <span className="block text-[13px] text-[#949BA4] leading-relaxed">
                  Use the left sidebar to switch between the <strong className="text-[#F2F3F5] font-medium">Main Value List</strong>, <strong className="text-[#F2F3F5] font-medium">Patch Notes</strong>, and <strong className="text-[#F2F3F5] font-medium">Extra Notices</strong>. On mobile devices, swipe right to open the channel menu.
                </span>
              </div>
              <div className="bg-[#2B2D31] p-4 rounded-[6px] border border-[rgba(255,255,255,0.03)]">
                <span className="block text-[14px] font-semibold text-[#DBDEE1] mb-1.5">2. Values & Market Tags</span>
                <span className="block text-[13px] text-[#949BA4] leading-relaxed">
                  Unit values are estimations based on active community trades. Always check a unit's status tag (e.g., <strong className="text-[#F2F3F5] font-medium">Rising</strong>, <strong className="text-[#F2F3F5] font-medium">Dropping</strong>, or <strong className="text-[#F2F3F5] font-medium">Unstable</strong>) to understand its current market trajectory before evaluating a trade.
                </span>
              </div>
              <div className="bg-[#2B2D31] p-4 rounded-[6px] border border-[rgba(255,255,255,0.03)]">
                <span className="block text-[14px] font-semibold text-[#DBDEE1] mb-1.5">3. Using the Calculator</span>
                <span className="block text-[13px] text-[#949BA4] leading-relaxed">
                  Open the Trade Analyzer panel to compare offers. <strong className="text-[#F2F3F5] font-medium">Left-Click</strong> any unit on the list to add it to your "Give" section, or <strong className="text-[#F2F3F5] font-medium">Right-Click</strong> to add it to your "Get" section. You can also drag and drop units directly into the panel.
                </span>
              </div>
            </div>
          </>
        )}

        {isMinimized && (
          <div className="px-5 py-3 bg-[#2B2D31] border-b border-[rgba(255,255,255,0.04)] flex justify-between items-center">
            <span className="text-[13px] font-bold text-[#F2F3F5] uppercase tracking-wide">Legal Agreement</span>
            <button 
              onClick={() => { setIsMinimized(false); document.body.style.overflow = "hidden"; }}
              className="flex items-center gap-1.5 text-[#949BA4] hover:text-[#DBDEE1] text-[11px] font-bold uppercase transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Read Overview
            </button>
          </div>
        )}

        <div className={`p-4 bg-[#2B2D31] flex flex-col sm:flex-row items-center justify-between gap-4 ${!isMinimized ? 'border-t border-[rgba(255,255,255,0.04)]' : ''}`}>
          <label className="flex items-start gap-2.5 cursor-pointer group select-none w-full sm:w-auto">
            <div className="relative flex items-center justify-center w-5 h-5 mt-0.5 rounded-[4px] border border-[rgba(255,255,255,0.2)] bg-[rgba(0,0,0,0.2)] group-hover:border-[#5865F2] transition-colors flex-shrink-0">
              <input
                type="checkbox"
                className="peer absolute opacity-0 w-full h-full cursor-pointer"
                checked={hasConsented}
                onChange={(e) => setHasConsented(e.target.checked)}
              />
              {hasConsented && <Check className="w-3.5 h-3.5 text-[#5865F2] pointer-events-none" />}
            </div>
            <span className="text-[12px] text-[#949BA4] leading-relaxed">
              I accept the{" "}
              <button type="button" onClick={() => handleNavigate('terms-of-service')} className="text-[#5865F2] hover:underline focus:outline-none">Terms of Service</button>
              ,{" "}
              <button type="button" onClick={() => handleNavigate('privacy-policy')} className="text-[#5865F2] hover:underline focus:outline-none">Privacy Policy</button>
              , and cookies.
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!hasConsented}
            className={`px-6 py-2 rounded-[4px] text-[13px] font-medium transition-all flex-shrink-0 w-full sm:w-auto ${
              hasConsented 
                ? "bg-[#5865F2] hover:bg-[#4752C4] text-white active:scale-[0.98]" 
                : "bg-[rgba(255,255,255,0.05)] text-[#80848E] cursor-not-allowed"
            }`}
          >
            Continue{isMinimized ? "" : " to Website"}
          </button>
        </div>

      </div>
    </div>
  );
}