// ================================================
// FILE: src/app/components/layout/LoginRecommendationModal.tsx
// ================================================

import { X, LogIn } from "lucide-react";
import { useAuthStore } from "../../../store/useAuthStore";
import { triggerHaptic } from "../../../data/helpers";

export function LoginRecommendationModal({ 
  isOpen, 
  onClose, 
  channelName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  channelName: string 
}) {
  const loginWithDiscord = useAuthStore(s => s.loginWithDiscord);

  if (!isOpen) return null;

  const title = channelName === "inventory" ? "Inventory & Vault Access" : "Live Trading Board";
  const desc = channelName === "inventory" 
    ? "Logging in with Discord allows you to sync your personal unit collection, track your net worth, and manage your wishlist securely."
    : "You can browse active community listings while logged out, but logging in lets you post trades, comment in discussions, and message traders directly.";

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none font-sans">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl flex flex-col relative animate-slide-up">
        
        <button 
          onClick={() => { triggerHaptic('light'); onClose(); }}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted focus-visible:outline-none cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <LogIn className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-foreground tracking-tight">Login Recommended</h3>
            <p className="text-[12px] text-muted-foreground font-mono">{title}</p>
          </div>
        </div>

        <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
          {desc}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button 
            onClick={() => { triggerHaptic('light'); onClose(); }}
            className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-none"
          >
            Continue as Guest
          </button>
          <button 
            onClick={() => { triggerHaptic('medium'); loginWithDiscord(); }}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-semibold transition-colors shadow-sm focus-visible:outline-none cursor-pointer flex items-center gap-1.5 border border-primary"
          >
            <LogIn className="w-4 h-4" /> Login with Discord
          </button>
        </div>

      </div>
    </div>
  );
}