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
  dnd: "#ef4444",
  invisible: "#888888",
  offline: "#888888"
};

const ROLE_CONFIG = {
  master: { icon: ShieldAlert, color: "#ed4245", label: "Master" },
  admin: { icon: ShieldAlert, color: "#FAA61A", label: "Admin" },
  mod: { icon: Shield, color: "#5865F2", label: "Moderator" },
  user: { icon: User, color: "#a1a1aa", label: "Trader" },
  banned: { icon: X, color: "#888888", label: "Banned" }
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

    let activeChannel = "trading-ads";
    try {
      const stored = localStorage.getItem("astd_channel");
      if (stored) activeChannel = JSON.parse(stored);
    } catch (e) {}

    setViewingProfile(profile.id, activeChannel);
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'profile' }));
    closePopout();
  };

  return createPortal(
    <>
      {/* Bulletproof transparent backdrop overlay handles outside clicks without event race conditions */}
      <div className="fixed inset-0 z-[999999]" onClick={closePopout} />

      <div 
        ref={popoutRef}
        className="fixed z-[1000000] w-[320px] bg-popover rounded-[6px] shadow-2xl border border-border flex flex-col overflow-hidden animate-fade-in"
        style={{ left: bounds.left, top: bounds.top }}
      >
        {!profile ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Activity className="w-6 h-6 animate-pulse text-primary" />
            <span className="text-[12px] font-bold uppercase tracking-widest">Fetching...</span>
          </div>
        ) : (
          <>
            {/* Banner */}
            <div className="h-[60px] w-full relative border-b border-border" style={{ backgroundColor: profile.banner_color || '#121214' }}>
              <div className="absolute inset-0 bg-black/30 pointer-events-none" />
            </div>

            <div className="px-4 pb-4 relative">
              <div className="absolute -top-8 left-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleViewFullProfile} title="View Full Profile">
                <div className="relative">
                  <img 
                    src={profile.avatar_url || "/units/firezio.webp"} 
                    alt={profile.username}
                    className="w-16 h-16 rounded-[4px] border-4 border-popover object-cover bg-muted shadow-sm"
                  />
                  <div 
                    className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-popover z-10"
                    style={{ backgroundColor: STATUS_COLORS[profile.status] || STATUS_COLORS.offline }}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 gap-1.5 h-8">
                {profile.role !== 'user' && (
                  <div 
                    className="flex items-center justify-center px-2 py-0.5 rounded-[4px] bg-muted border border-border cursor-help"
                    title={ROLE_CONFIG[profile.role]?.label}
                  >
                    {(() => {
                      const RoleIcon = ROLE_CONFIG[profile.role]?.icon || User;
                      return <RoleIcon className="w-3.5 h-3.5" style={{ color: ROLE_CONFIG[profile.role]?.color }} />;
                    })()}
                  </div>
                )}
              </div>

              {/* Profile Info Box with High-Contrast Text */}
              <div className="mt-2 flex flex-col bg-card p-3.5 rounded-[4px] border border-border shadow-inner gap-2.5">
                <h2 
                  className="text-[16px] font-black text-foreground tracking-tight leading-none truncate cursor-pointer hover:underline"
                  onClick={handleViewFullProfile}
                >
                  {profile.username}
                </h2>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-foreground bg-muted px-2.5 py-1 rounded-[3px] border border-border cursor-pointer hover:bg-card transition-colors group" onClick={handleCopyDiscord} title="Copy Discord ID">
                    <span className="text-[11.5px] font-mono font-bold truncate max-w-[130px] text-foreground">{profile.discord_id}</span>
                    {copied ? <Check className="w-3 h-3 text-[#23a559]" /> : <Copy className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />}
                  </div>

                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border text-[11px] font-bold ${profile.global_rep > 0 ? 'bg-[#23a559]/10 border-[#23a559]/30 text-[#23a559]' : profile.global_rep < 0 ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-muted border-border text-foreground'}`}>
                    <Star className="w-3 h-3" style={{ fill: profile.global_rep !== 0 ? 'currentColor' : 'none' }} />
                    {profile.global_rep > 0 ? '+' : ''}{profile.global_rep} Rep
                  </div>
                </div>

                {profile.bio && (
                  <div className="pt-2.5 border-t border-border">
                    <p className="text-[12.5px] font-medium text-foreground leading-relaxed break-words whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleViewFullProfile}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[4px] bg-muted hover:bg-card border border-border text-foreground text-[12px] font-bold transition-colors focus-visible:outline-none cursor-pointer"
                >
                  <UserCircle className="w-4 h-4" /> Full Profile
                </button>
                <button
                  onClick={handleContact}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[4px] bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-bold transition-colors shadow-sm focus-visible:outline-none cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" /> Message
                </button>
              </div>

            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}