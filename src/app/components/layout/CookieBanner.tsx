import { useState, useEffect } from "react";
import { PRIVACY_POLICY } from "../../../data/legal";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("astd_cookie_consent");
    if (consent === "granted") {
      window.gtag?.("consent", "update", { analytics_storage: "granted" });
    } else if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("astd_cookie_consent", "granted");
    window.gtag?.("consent", "update", { analytics_storage: "granted" });
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("astd_cookie_consent", "denied");
    window.gtag?.("consent", "update", { analytics_storage: "denied" });
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100000] p-4 md:p-6 pointer-events-none flex justify-center animate-slide-up">
      <div className="bg-popover border border-border p-4 md:p-5 rounded-[12px] shadow-[0_20px_40px_rgba(0,0,0,0.6)] pointer-events-auto w-full max-w-4xl flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 border border-primary/30 text-primary"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="w-5 h-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 2a8 8 0 1 0 8 8 3 3 0 0 1-3-3 3 3 0 0 1-3-3 2 2 0 0 1-2-2Z" />
              <circle cx="7.5" cy="10.5" r="0.8" fill="currentColor" />
              <circle cx="11.5" cy="13" r="0.8" fill="currentColor" />
              <circle cx="9.5" cy="7.5" r="0.8" fill="currentColor" />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-[15px] font-bold tracking-tight">
              We value your privacy
            </h3>
            <p className="text-muted-foreground text-[12px] leading-relaxed">
              We use strictly necessary browser storage to make our site work.
              We&apos;d also like to set optional analytics cookies (Google
              Consent Mode v2) to help us improve it. We won&apos;t enable
              analytics cookies unless you accept. For details, see our{" "}
              <button
                type="button"
                onClick={() =>
                  window.document.dispatchEvent(
                    new CustomEvent("navigate", { detail: "privacy-policy" })
                  )
                }
                className="text-primary hover:underline cursor-pointer font-bold"
              >
                {PRIVACY_POLICY.title}
              </button>{" "}
              (v{PRIVACY_POLICY.version}).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-shrink-0">
          <button
            type="button"
            onClick={handleDecline}
            className="flex-1 md:flex-none px-5 py-2.5 rounded-[6px] text-[13px] font-bold text-foreground bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 md:flex-none px-5 py-2.5 rounded-[6px] text-[13px] font-bold text-primary-foreground bg-primary hover:bg-primary/80 transition-colors shadow-md cursor-pointer"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={handleDecline}
            aria-label="Decline optional cookies and close banner"
            className="hidden md:flex text-muted-foreground hover:text-foreground p-1 ml-1 transition-colors cursor-pointer"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="w-4 h-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 4L12 12M12 4L4 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
