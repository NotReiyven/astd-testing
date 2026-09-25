import { useState, useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import { useExternalLinkStore } from "../../../store/useExternalLinkStore";
import { triggerHaptic } from "../../../data/helpers";

export function ExternalLinkModal() {
  const { isOpen, targetUrl, closeModal } = useExternalLinkStore();
  const [trustDomain, setTrustDomain] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => cancelBtnRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        triggerHaptic("light");
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen || !targetUrl) return null;

  let domain = targetUrl;
  try {
    domain = new URL(targetUrl).hostname;
  } catch (e) {}

  const handleContinue = () => {
    triggerHaptic("medium");
    if (trustDomain && domain) {
      try {
        const trustedCache = JSON.parse(
          localStorage.getItem("astd_trusted_domains") || "{}"
        );
        trustedCache[domain] = true;
        localStorage.setItem(
          "astd_trusted_domains",
          JSON.stringify(trustedCache)
        );
      } catch (e) {}
    }
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    closeModal();
    setTrustDomain(false);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="external-link-title"
      aria-describedby="external-link-desc"
    >
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl flex flex-col relative animate-slide-up">
        <button
          onClick={() => {
            triggerHaptic("light");
            closeModal();
          }}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <ExternalLink className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3
              id="external-link-title"
              className="text-[15px] font-bold text-foreground tracking-tight"
            >
              Leaving application
            </h3>
            <p className="text-[12px] text-muted-foreground font-mono">
              {domain}
            </p>
          </div>
        </div>

        <p
          id="external-link-desc"
          className="text-[13px] text-muted-foreground leading-relaxed mb-4"
        >
          You are being redirected to an external website. We are not
          responsible for the content, privacy policies, or security of external
          links.
        </p>

        <div className="bg-muted/50 border border-border rounded-lg p-3 mb-5 font-mono text-[11px] text-foreground/80 break-all shadow-inner">
          {targetUrl}
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer group mb-6 select-none w-fit">
          <input
            type="checkbox"
            checked={trustDomain}
            onChange={(e) => setTrustDomain(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-primary focus:ring-offset-background cursor-pointer"
          />
          <span className="text-[12px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Don't ask me again for{" "}
            <strong className="text-foreground">{domain}</strong>
          </span>
        </label>

        <div className="flex items-center justify-end gap-2.5">
          <button
            ref={cancelBtnRef}
            onClick={() => {
              triggerHaptic("light");
              closeModal();
              setTrustDomain(false);
            }}
            className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer flex items-center gap-1.5"
          >
            Continue to site
          </button>
        </div>
      </div>
    </div>
  );
}
