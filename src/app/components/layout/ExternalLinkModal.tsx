// ================================================
// FILE: src/app/components/layout/ExternalLinkModal.tsx
// ================================================

import { useState } from "react";
import { ExternalLink, ShieldAlert, Check, X } from "lucide-react";
import { useExternalLinkStore } from "../../../store/useExternalLinkStore";
import { triggerHaptic } from "../../../data/helpers";

export function ExternalLinkModal() {
  const { isOpen, targetUrl, closeModal } = useExternalLinkStore();
  const [trustDomain, setTrustDomain] = useState(false);

  if (!isOpen || !targetUrl) return null;

  let domain = targetUrl;
  try {
    domain = new URL(targetUrl).hostname;
  } catch (e) {}

  const handleContinue = () => {
    triggerHaptic('medium');
    if (trustDomain && domain) {
      try {
        const trustedCache = JSON.parse(localStorage.getItem('astd_trusted_domains') || '{}');
        trustedCache[domain] = true;
        localStorage.setItem('astd_trusted_domains', JSON.stringify(trustedCache));
      } catch (e) {}
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    closeModal();
    setTrustDomain(false);
  };

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none font-sans">
      <div className="bg-card border border-border rounded-[8px] p-6 max-w-md w-full shadow-2xl flex flex-col animate-slide-up relative">
        
        <button 
          onClick={() => { triggerHaptic('light'); closeModal(); }}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-[4px] hover:bg-muted focus-visible:outline-none cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-[8px] bg-[#FAA61A]/15 border border-[#FAA61A]/30 flex items-center justify-center shrink-0 shadow-sm">
            <ShieldAlert className="w-6 h-6 text-[#FAA61A]" />
          </div>
          <div className="flex flex-col min-w-0 pr-6">
            <h3 className="text-[16px] font-black text-foreground uppercase tracking-tight">Leaving Platform</h3>
            <span className="text-[11px] font-mono text-muted-foreground truncate">External Link Warning</span>
          </div>
        </div>

        <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
          You are about to be redirected to a third-party website. We are not responsible for the content or security of external platforms.
        </p>

        <div className="bg-popover border border-border rounded-[6px] p-3 mb-5 font-mono text-[12px] text-foreground flex items-center gap-2.5 shadow-inner overflow-hidden">
          <ExternalLink className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">{targetUrl}</span>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer group mb-6 select-none">
          <div className="relative flex items-center justify-center w-4 h-4 rounded-[3px] border border-border bg-input group-hover:border-primary transition-colors shrink-0">
            <input 
              type="checkbox" 
              checked={trustDomain} 
              onChange={(e) => setTrustDomain(e.target.checked)} 
              className="absolute opacity-0 w-full h-full cursor-pointer"
            />
            {trustDomain && <Check className="w-3 h-3 text-primary pointer-events-none" />}
          </div>
          <span className="text-[12px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Remember my choice for <strong className="text-foreground">{domain}</strong>
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => { triggerHaptic('light'); closeModal(); setTrustDomain(false); }}
            className="flex-1 py-2.5 rounded-[4px] bg-muted hover:bg-card border border-border text-foreground text-[13px] font-bold transition-colors cursor-pointer focus-visible:outline-none"
          >
            Cancel
          </button>
          <button 
            onClick={handleContinue}
            className="flex-1 py-2.5 rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-black uppercase tracking-wider transition-colors shadow-sm focus-visible:outline-none cursor-pointer border border-primary flex items-center justify-center gap-1.5"
          >
            Continue <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}