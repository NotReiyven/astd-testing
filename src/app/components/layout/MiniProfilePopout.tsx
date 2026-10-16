import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  GiCharacter,
  GiSpikedHalo,
  GiChatBubble,
  GiTornado,
  GiGamepad,
} from "react-icons/gi";
import {
  useProfileStore,
  getBannerCssStyle,
  TradingStanceType,
  getEarlyUserRole,
} from "../../../store/useProfileStore";
import { useInventoryStore } from "../../../store/useInventoryStore";
import {
  getUnitAssetUrl,
  triggerHaptic,
  copyTextWithFallback,
} from "../../../data/helpers";
import { safeOpenExternal } from "../../../store/useExternalLinkStore";
import { useToastStore } from "../../../store/useToastStore";
import { ErrorState } from "../ui/ErrorState";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";
import { STATUS_COLORS, useEffectiveStatus } from "../../../hooks/usePresence";
import { UserAvatar } from "../shared/UserAvatar";
import { DiscordRolePill } from "../shared/DiscordRolePill";

const ROLE_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; label: string }
> = {
  master: {
    color: "#fbbf24",
    bg: "#2b1f0b",
    border: "#f59e0b",
    label: "Master",
  },
  admin: {
    color: "#f87171",
    bg: "#261417",
    border: "#ef4444",
    label: "Admin",
  },
  mod: {
    color: "#8ea1e1",
    bg: "#161a33",
    border: "#5865F2",
    label: "Moderator",
  },
  user: {
    color: "#cbd5e1",
    bg: "#1e1f22",
    border: "#35373c",
    label: "Trader",
  },
  banned: {
    color: "#94a3b8",
    bg: "#1e1f22",
    border: "#475569",
    label: "Banned",
  },
};

const STANCE_LABELS: Record<
  TradingStanceType,
  { label: string; color: string; bg: string; border: string }
> = {
  open: {
    label: "Open to Offers",
    color: "#ffffff",
    bg: "#23a559",
    border: "rgba(255, 255, 255, 0.2)",
  },
  upgrading: {
    label: "Upgrading Only",
    color: "#ffffff",
    bg: "#d97706",
    border: "rgba(255, 255, 255, 0.2)",
  },
  downgrading: {
    label: "Downgrading",
    color: "#ffffff",
    bg: "#0284c7",
    border: "rgba(255, 255, 255, 0.2)",
  },
  wishlist: {
    label: "Hunting Wishlist",
    color: "#ffffff",
    bg: "#8b5cf6",
    border: "rgba(255, 255, 255, 0.2)",
  },
  afk: {
    label: "AFK / Break",
    color: "#ffffff",
    bg: "#475569",
    border: "rgba(255, 255, 255, 0.2)",
  },
};

export function MiniProfilePopout() {
  const popoutUserId = useProfileStore((s) => s.popoutUserId);
  const popoutPosition = useProfileStore((s) => s.popoutPosition);
  const profile = useProfileStore((s) =>
    s.popoutUserId ? s.cache[s.popoutUserId]?.data ?? null : null
  );
  const closePopout = useProfileStore((s) => s.closePopout);
  const setViewingProfile = useProfileStore((s) => s.setViewingProfile);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const addToast = useToastStore((s) => s.addToast);
  const effectiveStatus = useEffectiveStatus(popoutUserId, profile?.status);

  const [copied, setCopied] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [bounds, setBounds] = useState({ top: 0, left: 0 });
  const popoutRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!popoutUserId) {
      setFetchError(false);
      setIsRetrying(false);
      return;
    }
    if (profile) {
      setFetchError(false);
      return;
    }

    let cancelled = false;
    setFetchError(false);

    fetchProfile(popoutUserId).then((res) => {
      if (!cancelled && !res) {
        setFetchError(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [popoutUserId, profile, fetchProfile]);

  useEffect(() => {
    if (!popoutUserId) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePopout();
        return;
      }

      if (e.key === "Tab" && popoutRef.current) {
        const focusable = Array.from(
          popoutRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            !popoutRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !popoutRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [popoutUserId, closePopout]);

  useEffect(() => {
    if (!popoutUserId || !popoutRef.current) return;
    if (
      popoutRef.current &&
      !popoutRef.current.contains(document.activeElement)
    ) {
      const firstFocusable = popoutRef.current.querySelector<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [popoutUserId, profile, fetchError]);

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
  }, [popoutPosition, profile, fetchError]);

  if (!popoutUserId || !popoutPosition) return null;

  const handleRetryFetch = async () => {
    setIsRetrying(true);
    setFetchError(false);
    const res = await fetchProfile(popoutUserId, true);
    if (!res) {
      setFetchError(true);
    }
    setIsRetrying(false);
  };

  const handleCopyDiscord = async () => {
    if (!profile?.discord_id || profile.hide_discord_id) return;
    triggerHaptic("light");
    const ok = await copyTextWithFallback(profile.discord_id);
    if (ok) {
      setCopied(true);
      addToast("Copied Discord ID to clipboard.", "success");
      setTimeout(() => setCopied(false), 2000);
    } else {
      addToast(
        `Clipboard blocked by browser. Copy manually: ${profile.discord_id}`,
        "error"
      );
    }
  };

  const handleContact = async () => {
    if (!profile?.discord_id) return;
    triggerHaptic("medium");
    const greeting =
      "Hey! Saw your profile on ASTD Value List. Are you around to trade?";
    const ok = await copyTextWithFallback(greeting);
    if (ok) {
      addToast("Copied greeting message. Opening Discord…", "info");
    } else {
      addToast(
        "Could not copy greeting to clipboard. Opening Discord profile…",
        "warning"
      );
    }
    safeOpenExternal(`https://discord.com/users/${profile.discord_id}`);
    closePopout();
  };

  const handleViewFullProfile = () => {
    if (!profile) return;
    triggerHaptic("medium");

    let activeChannel = "trading-ads";
    try {
      const stored = localStorage.getItem("astd_channel");
      if (stored) activeChannel = JSON.parse(stored);
    } catch {
      // Ignore parse error
    }

    setViewingProfile(profile.id, activeChannel);
    useInventoryStore
      .getState()
      .setViewingUser(profile.id, profile.username, activeChannel);
    window.document.dispatchEvent(
      new CustomEvent("navigate", { detail: "profile" })
    );
    closePopout();
  };

  const stanceCfg =
    STANCE_LABELS[profile?.trading_stance || "open"] || STANCE_LABELS.open;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100015]" onClick={closePopout} />

      <div
        ref={popoutRef}
        role="dialog"
        aria-label={profile ? `${profile.username} profile card` : "Trader profile card"}
        className="fixed z-[100020] w-[320px] bg-popover rounded-[8px] shadow-2xl border border-border flex flex-col overflow-hidden animate-fade-in"
        style={{
          left: bounds.left,
          top: bounds.top,
          borderColor: profile?.accent_color
            ? `${profile.accent_color}55`
            : undefined,
        }}
      >
        {!profile ? (
          fetchError ? (
            <ErrorState
              compact
              title="Profile Unavailable"
              description="We couldn't load this trader's profile right now. Check your connection and try again."
              isRetrying={isRetrying}
              onRetry={handleRetryFetch}
              secondaryAction={{ label: "Close", onClick: closePopout }}
              className="border-none bg-transparent py-6"
            />
          ) : (
            <div
              role="status"
              aria-live="polite"
              className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-3"
            >
              <GiTornado className="w-6 h-6 animate-pulse text-primary" />
              <span className="text-[12px] tracking-widest">
                Fetching Profile…
              </span>
            </div>
          )
        ) : (
          <>
            {/* Customized Banner */}
            <div
              className="h-[68px] w-full relative border-b border-border"
              style={{
                ...getBannerCssStyle(
                  profile.banner_color,
                  profile.accent_color,
                  profile.banner_style,
                  profile.banner_image_url
                ),
                contain: "paint",
              }}
            >
              <div className="absolute inset-0 bg-black/20 pointer-events-none" />
            </div>

            <div className="px-4 pb-4 relative">
              <div
                className="absolute -top-8 left-4 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleViewFullProfile}
                title="View Full Profile"
              >
                <div className="relative">
                  <UserAvatar
                    avatarUrl={profile.avatar_url}
                    username={profile.username}
                    discordId={profile.discord_id}
                    className="w-16 h-16 rounded-[8px] border-4 border-popover shadow-md"
                    alt={profile.username}
                  />
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[3px] border-popover z-10"
                    style={{
                      backgroundColor: STATUS_COLORS[effectiveStatus],
                    }}
                    title={`Status: ${effectiveStatus.toUpperCase()}`}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 pl-[84px] gap-1.5 min-h-[34px] items-center flex-wrap overflow-hidden">
                {typeof profile.join_number === "number" && (
                  <span
                    className="inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] bg-[#475569] text-white border border-white/20 shrink-0 select-none shadow-xs"
                    title={`User #${profile.join_number}`}
                  >
                    #{profile.join_number}
                  </span>
                )}

                {(() => {
                  const earlyRole = getEarlyUserRole(profile.join_number);
                  if (!earlyRole) return null;
                  return (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] border shrink-0 shadow-xs"
                      style={{
                        backgroundColor: earlyRole.bg,
                        color: earlyRole.color,
                        borderColor: earlyRole.border,
                      }}
                      title={`${earlyRole.label} Community Member`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: earlyRole.dotColor }}
                      />
                      {earlyRole.label}
                    </span>
                  );
                })()}

                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] border shrink-0 shadow-xs"
                  style={{
                    backgroundColor: stanceCfg.bg,
                    color: stanceCfg.color,
                    borderColor: stanceCfg.border,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: stanceCfg.color }}
                  />
                  {stanceCfg.label}
                </span>
              </div>

              {/* Profile Info Box */}
              <div className="mt-2 flex flex-col bg-card p-3.5 rounded-[6px] border border-border shadow-inner gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className="text-[16px] text-foreground leading-none truncate cursor-pointer hover:underline font-bold"
                    onClick={handleViewFullProfile}
                  >
                    {profile.username}
                  </h2>
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] border text-[11px] font-bold shrink-0 text-white shadow-xs font-mono"
                    style={{
                      backgroundColor:
                        profile.global_rep > 0
                          ? "#23a559"
                          : profile.global_rep < 0
                          ? "#ef4444"
                          : "#475569",
                      borderColor:
                        profile.global_rep > 0
                          ? "rgba(35, 165, 89, 0.4)"
                          : profile.global_rep < 0
                          ? "rgba(239, 68, 68, 0.4)"
                          : "rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <GiSpikedHalo className="w-3 h-3 text-white" />
                    <span>
                      {profile.global_rep > 0 ? "+" : ""}
                      {profile.global_rep} Rep
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!profile.hide_discord_id && (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-foreground bg-muted px-2.5 py-1 rounded-[4px] border border-border cursor-pointer hover:bg-card transition-colors group"
                      onClick={handleCopyDiscord}
                      title="Copy Discord ID"
                    >
                      <span className="text-[11px] font-mono truncate max-w-[130px] text-foreground">
                        {profile.discord_id}
                      </span>
                      {copied ? (
                        <span className="text-[10px] text-[#23a559] font-bold">
                          Copied
                        </span>
                      ) : (
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          className="w-3 h-3 text-muted-foreground group-hover:text-foreground"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        >
                          <rect x="5" y="5" width="8" height="8" rx="1.5" />
                          <path d="M3 11V3.5C3 2.95 3.45 2.5 4 2.5H11" />
                        </svg>
                      )}
                    </button>
                  )}

                  {profile.roblox_username && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-foreground bg-[#1e1f22] px-2 py-1 rounded-[4px] border border-[#35373c]">
                      <GiGamepad className="w-3.5 h-3.5 text-primary" />
                      {profile.roblox_username}
                    </span>
                  )}
                </div>

                {profile.bio && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[12px] text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {/* Dedicated Discord Roles Section */}
                {((profile.role_details && profile.role_details.length > 0) || (profile.role && profile.role !== "user")) && (
                  <div className="pt-2.5 border-t border-border flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Roles
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {profile.role_details && profile.role_details.length > 0 ? (
                        <>
                          {profile.role_details.slice(0, 3).map((r) => (
                            <DiscordRolePill
                              key={r.name}
                              name={r.name}
                              label={r.label}
                              color={r.color}
                              size="sm"
                            />
                          ))}
                          {profile.role_details.length > 3 && (
                            <span
                              onClick={handleViewFullProfile}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-[#2b2d31] hover:bg-[#35373c] border border-[#35373c] text-[10.5px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                              title={`+${profile.role_details.length - 3} more roles (View Full Profile)`}
                            >
                              +{profile.role_details.length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <DiscordRolePill
                          name={profile.role}
                          size="sm"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleViewFullProfile}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[5px] bg-muted hover:bg-card border border-border text-foreground text-[12px] transition-colors focus-visible:outline-none cursor-pointer font-medium"
                >
                  <GiCharacter className="w-4 h-4" /> Full Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    navigator.clipboard.writeText(
                      `${window.location.origin}/profile/${profile.id}`
                    );
                    addToast("Unique profile link copied!", "success");
                  }}
                  className="p-2 rounded-[5px] bg-[#1e1f22] hover:bg-[#2b2d31] border border-[#35373c] text-foreground transition-colors cursor-pointer shrink-0"
                  title="Share Unique Profile Link"
                  aria-label="Share Unique Profile Link"
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="w-4 h-4"
                  >
                    <path d="M6 9a3 3 0 0 0 4.24 0l2-2a3 3 0 0 0-4.24-4.24L7 3.76" />
                    <path d="M10 7a3 3 0 0 0-4.24 0l-2 2a3 3 0 0 0 4.24 4.24L9 12.24" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleContact}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[5px] bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] transition-colors shadow-sm focus-visible:outline-none cursor-pointer font-medium"
                >
                  <GiChatBubble className="w-4 h-4" /> Message
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
