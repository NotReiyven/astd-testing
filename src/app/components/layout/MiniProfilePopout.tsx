// ================================================
// FILE: src/app/components/layout/MiniProfilePopout.tsx
// ================================================

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, Copy, Check, ShieldAlert, Shield, Activity, User, Star, X, UserCircle } from "lucide-react";
import { useProfileStore } from "../../../store/useProfileStore";
import { triggerHaptic } from "../../../data/helpers";

const STATUS_COLORS = {
  online: "#23a559",
  dnd: "#f23f43",
  invisible: "#80848e",
  offline: "#80848e"
};

const ROLE_CONFIG = {
  master: { icon: ShieldAlert, color: "#ed4245", label: "Master" },
  admin: { icon: ShieldAlert, color: "#FAA61A", label: "Admin" },
  mod: { icon: Shield, color: "#5865F2", label: "Moderator" },
  user: { icon: User, color: "#B5BAC1", label: "Trader" },
  banned: { icon: X, color: "#80848E", label: "Banned" }
};

export function MiniProfilePopout() {
  const { popoutUserId, popoutPosition, cache, closePopout, setViewingProfile } = useProfileStore();
  
  const [copied, setCopied] = useState(false);
  const [bounds, setBounds] = useState({ top: 0, left: 0 });
  const popoutRef = useRef<HTMLDivElement>(null);

  const profileCache = popoutUserId ? cache[popoutUserId] : null;
  const profile = profileCache?.data;

  useEffect(() => {
    if (!popoutPosition || !popoutRef.current) return;
    
    const rect = popoutRef.current.getBoundingClientRect();
    const padding = 16;
    
    let { x, y } = popoutPosition;
    
    if (x + rect.width + padding > window.innerWidth) {
      x = x - rect.width;
    }
    
    if (y + rect.height + padding > window.innerHeight) {
      y = y - rect.height - 40; 
    }
    
    x = Math.max(padding, x);
    y = Math.max(padding, y);

    setBounds({ left: x, top: y });
  }, [popoutPosition, profile]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (popoutRef.current && !popoutRef.current.contains(e.target as Node)) {
        closePopout();
      }
    };
    
    if (popoutUserId) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [popoutUserId, closePopout]);

  if (!popoutUserId || !popoutPosition) return null;

  const handleCopyDiscord = () => {
    if (!profile?.discord_id) return;
    navigator.clipboard.writeText(profile.discord_id);
    setCopied(true);
    triggerHaptic('light');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContact = () => {
    if (!profile?.discord_id) return;
    triggerHaptic('medium');
    navigator.clipboard.writeText(`Hey! Saw your profile on ASTD Value List. Are you around to trade?`);
    window.open(`https://discord.com/users/${profile.discord_id}`, '_blank');
    closePopout();
  };

  const handleViewFullProfile = () => {
    if (!profile) return;
    triggerHaptic('medium');
    setViewingProfile(profile.id);
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'profile' }));
    closePopout();
  };

  return createPortal(
    <div 
      ref={popoutRef}
      className="fixed z-[1000000] w-[320px] bg-popover rounded-[8px] shadow-[0_8px_30px_rgba(0,0,0,0.8)] border border-border flex flex-col overflow-hidden animate-fade-in"
      style={{ left: bounds.left, top: bounds.top }}
    >
      {!profile ? (
        <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Activity className="w-6 h-6 animate-pulse text-primary" />
          <span className="text-[12px] font-bold uppercase tracking-widest">Fetching...</span>
        </div>
      ) : (
        <>
          <div className="h-[60px] w-full relative" style={{ backgroundColor: profile.banner_color || '#2B2D31' }}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30 pointer-events-none" />
          </div>

          <div className="px-4 pb-4 relative">
            <div className="absolute -top-10 left-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleViewFullProfile} title="View Full Profile">
              <div className="relative">
                <img 
                  src={profile.avatar_url || "/units/firezio.webp"} 
                  alt={profile.username}
                  className="w-20 h-20 rounded-full border-[6px] border-popover object-cover bg-background"
                />
                <div 
                  className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-[3px] border-popover z-10"
                  style={{ backgroundColor: STATUS_COLORS[profile.status] || STATUS_COLORS.offline }}
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 gap-1.5 h-10">
              {profile.role !== 'user' && (
                <div 
                  className="flex items-center justify-center w-6 h-6 rounded-[4px] bg-background border border-border cursor-help"
                  title={ROLE_CONFIG[profile.role]?.label}
                >
                  {(() => {
                    const RoleIcon = ROLE_CONFIG[profile.role]?.icon || User;
                    return <RoleIcon className="w-3.5 h-3.5" style={{ color: ROLE_CONFIG[profile.role]?.color }} />;
                  })()}
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-col bg-background p-3 rounded-[8px] border border-border shadow-inner">
              <h2 
                className="text-[18px] font-black text-foreground tracking-tight leading-none mb-1 truncate cursor-pointer hover:underline"
                onClick={handleViewFullProfile}
              >
                {profile.username}
              </h2>
              
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1.5 text-muted-foreground bg-popover px-2 py-0.5 rounded-[4px] border border-border cursor-pointer hover:text-foreground transition-colors group" onClick={handleCopyDiscord}>
                  <span className="text-[11px] font-mono font-bold truncate max-w-[120px]">{profile.discord_id}</span>
                  {copied ? <Check className="w-3 h-3 text-[#23a559]" /> : <Copy className="w-3 h-3 group-hover:text-primary" />}
                </div>

                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-[4px] border text-[11px] font-bold ${profile.global_rep > 0 ? 'bg-[#23a559]/10 border-[#23a559]/30 text-[#23a559]' : profile.global_rep < 0 ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-popover border-border text-muted-foreground'}`}>
                  <Star className="w-3 h-3" style={{ fill: profile.global_rep !== 0 ? 'currentColor' : 'none' }} />
                  {profile.global_rep > 0 ? '+' : ''}{profile.global_rep} Rep
                </div>
              </div>

              {profile.bio && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[12px] font-medium text-foreground leading-relaxed break-words whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleViewFullProfile}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[4px] bg-background hover:bg-muted border border-border text-foreground text-[12px] font-bold transition-colors focus-visible:outline-none shadow-sm"
              >
                <UserCircle className="w-4 h-4" /> Full Profile
              </button>
              <button
                onClick={handleContact}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[4px] bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-bold transition-colors shadow-sm focus-visible:outline-none"
              >
                <MessageSquare className="w-4 h-4" /> Message
              </button>
            </div>

          </div>
        </>
      )}
    </div>,
    document.body
  );
}