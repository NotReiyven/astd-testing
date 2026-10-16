import { useState, useRef, useEffect } from "react";
import { PanelLeft, Hash, Search, X, LogIn, LogOut, User, Check, Calculator } from "lucide-react";
import { GiAbacus, GiMagicPortal, GiSparkles, GiRingingBell, GiChatBubble } from "react-icons/gi";
import { LiveAvatars } from "./LiveAvatars";
import {
  STATUS_COLORS,
  useEffectiveStatus,
  useStatusPreference,
} from "../../../hooks/usePresence";
import { useAuthStore } from "../../../store/useAuthStore";
import { useLayoutStore } from "../../../store/useLayoutStore";
import { Link } from "react-router-dom";
import { useNotificationStore } from "../../../store/useNotificationStore";
import { useAdInteractionStore } from "../../../store/useAdInteractionStore";
import { CommandPalette } from "./CommandPalette";
import { getUnitAssetUrl, triggerHaptic } from "../../../data/helpers";
import { UserAvatar } from "../shared/UserAvatar";
import { useToastStore } from "../../../store/useToastStore";
import {
  MOTION_TRANSITION,
  usePrefersReducedMotion,
} from "../../../lib/motionTokens";

interface TopBarProps {
  calcHeaderZ: string;
  isRosterOpen: boolean;
  setIsRosterOpen: (val: boolean) => void;
  currentChannelInfo: { title: string; subtitle: string };
  startGuide: (type: any) => void;
  handleToggleAnalyzer: () => void;
  isAnalyzerOpen: boolean;
  isMainStep3: boolean;
  activeItemsCount: number;
  isDictionaryActive: boolean;
}

export function TopBar({
  calcHeaderZ,
  isRosterOpen,
  setIsRosterOpen,
  currentChannelInfo,
  handleToggleAnalyzer,
  isAnalyzerOpen,
  isMainStep3,
  activeItemsCount,
  isDictionaryActive,
}: TopBarProps) {
  const globalSearchQuery = useLayoutStore((s) => s.globalSearchQuery);
  const setGlobalSearchQuery = useLayoutStore((s) => s.setGlobalSearchQuery);
  const commandPaletteOpen = useLayoutStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useLayoutStore((s) => s.setCommandPaletteOpen);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [badgeBump, setBadgeBump] = useState(false);
  const prevItemsCountRef = useRef(activeItemsCount);
  const reducedMotion = usePrefersReducedMotion();

  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const profile = useAuthStore((s) => s.profile);
  const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);
  const logout = useAuthStore((s) => s.logout);
  const updateStatus = useAuthStore((s) => s.updateStatus);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const statusPreference = useStatusPreference();
  const selfEffectiveStatus = useEffectiveStatus(profile?.id, profile?.status, {
    includeInvisibleForSelf: true,
  });

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const deleteAllNotifications = useNotificationStore((s) => s.deleteAllNotifications);
  const openAdContext = useAdInteractionStore((s) => s.openAdContext);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (activeItemsCount > prevItemsCountRef.current && !reducedMotion) {
      setBadgeBump(true);
      const timer = setTimeout(() => setBadgeBump(false), 220);
      prevItemsCountRef.current = activeItemsCount;
      return () => clearTimeout(timer);
    }
    prevItemsCountRef.current = activeItemsCount;
  }, [activeItemsCount, reducedMotion]);

  const [dismissedTips, setDismissedTips] = useState<Record<string, boolean>>(
    () => {
      try {
        return JSON.parse(localStorage.getItem("astd_tips") || "{}");
      } catch {
        return {};
      }
    }
  );

  const dismissTip = (channel: string) => {
    const next = { ...dismissedTips, [channel]: true };
    setDismissedTips(next);
    localStorage.setItem("astd_tips", JSON.stringify(next));
  };

  const getTipForChannel = (channelTitle: string) => {
    if (channelTitle === "trading-ads")
      return "Tip: Click any unit in an ad to view its market history, or drag it into your calculator.";
    if (channelTitle === "home")
      return "Tip: Keep an eye on the Patch Notes. The meta shifts quickly.";
    if (channelTitle === "extra-notices")
      return "Tip: Pin important notices to keep them at the top of your feed.";
    return null;
  };

  const currentTip = getTipForChannel(currentChannelInfo.title);
  const showTip = currentTip && !dismissedTips[currentChannelInfo.title];

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === "f" && (e.ctrlKey || e.metaKey)) {
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          desktopSearchRef.current?.focus();
        }
      }
      if (e.key === "Escape" || e.key === "Esc") {
        setGlobalSearchQuery("");
        setMobileSearchOpen(false);
        setIsProfileMenuOpen(false);
        setIsNotifMenuOpen(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [setCommandPaletteOpen, setGlobalSearchQuery]);

  useEffect(() => {
    if (mobileSearchOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
      if (
        notifMenuRef.current &&
        !notifMenuRef.current.contains(e.target as Node)
      ) {
        setIsNotifMenuOpen(false);
      }
    };
    if (isProfileMenuOpen || isNotifMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isProfileMenuOpen, isNotifMenuOpen]);

  const handleNotificationClick = (notif: any) => {
    if (!notif.is_read) void markAsRead(notif.id);
    setIsNotifMenuOpen(false);

    if (notif.type === "value_update" || notif.action_url === "/home") {
      window.document.dispatchEvent(
        new CustomEvent("navigate", { detail: "home" })
      );
      return;
    }

    if (
      notif.ad_id &&
      (notif.type === "comment" ||
        notif.type === "reply" ||
        notif.type === "upvote" ||
        notif.type === "warning")
    ) {
      void openAdContext(notif.ad_id, profile?.id);
      window.document.dispatchEvent(
        new CustomEvent("navigate", { detail: "trading-ads" })
      );
      return;
    }

    window.document.dispatchEvent(
      new CustomEvent("navigate", { detail: "notifications" })
    );
  };

  const showCalcPulse = isDictionaryActive && !isAnalyzerOpen;

  return (
    <div className="flex flex-col w-full relative z-[99999]">
      <div
        className={`flex-shrink-0 flex items-center justify-between px-3 md:px-4 py-2.5 min-h-[48px] relative border-b border-border bg-background ${calcHeaderZ}`}
      >
        {mobileSearchOpen && (
          <div className="absolute inset-0 z-[100] bg-background px-3 flex items-center gap-2 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
            <input
              ref={mobileInputRef}
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder="Search all units..."
              className="flex-1 bg-transparent outline-none text-foreground text-base px-2 h-full"
            />
            <button
              type="button"
              aria-label="Close search"
              onClick={() => {
                setMobileSearchOpen(false);
                setGlobalSearchQuery("");
              }}
              className="p-3 text-muted-foreground hover:text-foreground focus-visible:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 pr-2 flex-1 min-w-0">
          <button
            onClick={() => setIsRosterOpen(!isRosterOpen)} aria-label="Toggle sidebar"
            className={`p-2 transition-colors flex-shrink-0 focus-visible:outline-none rounded-[4px] border border-transparent hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center ${
              isRosterOpen
                ? "text-foreground border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PanelLeft className="w-5 h-5 md:w-[18px] md:h-[18px]" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center min-w-0 overflow-hidden w-full gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Hash className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-base font-bold text-foreground whitespace-nowrap truncate">
                {currentChannelInfo.title}
              </span>
            </div>

            <div className="hidden md:flex items-center min-w-0 flex-1">
              {currentChannelInfo.subtitle && (
                <>
                  <span className="text-muted-foreground px-1.5">/</span>
                  <span className="text-[13px] font-medium text-muted-foreground truncate w-full">
                    {currentChannelInfo.subtitle}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 md:gap-3 shrink min-w-0">
          <LiveAvatars />

          {!isAuthLoading && (
            <div className="relative" ref={notifMenuRef}>
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => {
                  triggerHaptic("light");
                  setIsNotifMenuOpen(!isNotifMenuOpen);
                }}
                className="flex items-center justify-center p-1 bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground rounded-[4px] transition-[transform,background-color,color] duration-150 active:scale-95 shrink-0 cursor-pointer focus-visible:outline-none min-h-[44px] min-w-[44px] relative"
                data-tooltip="Notifications"
                data-tooltip-side="bottom"
              >
                <GiRingingBell className={`w-5 h-5 transition-colors ${unreadCount > 0 ? "text-primary" : ""}`} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-background animate-badge-pulse" />
                )}
              </button>

              {isNotifMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-[340px] bg-card border border-border rounded-[8px] shadow-2xl z-[99999] flex flex-col animate-slide-up">
                  <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between bg-popover rounded-t-[8px]">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-foreground">
                      Notifications
                    </span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            void markAllAsRead(profile?.id || null);
                            addToast("Marked all notifications as read.", "success");
                          }}
                          className="text-[11px] font-semibold text-primary hover:underline cursor-pointer focus-visible:outline-none"
                        >
                          Mark all read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            void deleteAllNotifications(profile?.id || null);
                          }}
                          className="text-[11px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer focus-visible:outline-none"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col max-h-[350px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center flex flex-col items-center gap-2">
                        <GiRingingBell className="w-8 h-8 text-muted-foreground opacity-50" />
                        <span className="text-[12.5px] font-medium text-muted-foreground">
                          You have no new notifications.
                        </span>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full text-left flex items-start gap-3 p-3 border-b border-border hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none ${
                            !n.is_read ? "bg-primary/5" : ""
                          }`}
                        >
                          {n.type === "value_update" ? (
                            <div className="w-8 h-8 rounded-full border border-[#23a559]/40 bg-[#23a559]/15 flex items-center justify-center shrink-0 text-[#23a559]">
                              <GiRingingBell className="w-4 h-4" />
                            </div>
                          ) : (
                            <UserAvatar
                              avatarUrl={n.actor?.avatar_url}
                              username={n.actor?.username}
                              discordId={n.actor?.discord_id}
                              className="w-8 h-8 rounded-full border border-border bg-muted shrink-0"
                            />
                          )}
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="text-[12.5px] text-foreground leading-snug">
                              {n.type === "value_update" ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="px-1.5 py-0.2 rounded-[3px] bg-[#23a559] text-white font-bold text-[9px] uppercase tracking-wider font-mono self-start">
                                    Value Update
                                  </span>
                                  <span className="text-[12px] font-bold text-foreground">
                                    Market values updated
                                  </span>
                                  <span className="text-[11px] text-muted-foreground line-clamp-2">
                                    {n.message || "Values and tiers have been updated."}
                                  </span>
                                </div>
                              ) : n.type === "warning" ? (
                                <div className="flex flex-col gap-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-1.5 py-0.2 rounded-[3px] bg-[#f97316] text-[#000000] font-black text-[9px] uppercase tracking-wider font-mono shrink-0">
                                      Warning
                                    </span>
                                    {n.actor?.username && (
                                      <span className="text-[10.5px] text-muted-foreground truncate">
                                        from @{n.actor.username}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[12px] text-foreground font-medium line-clamp-2">
                                    {n.message || "A formal staff warning was issued."}
                                  </span>
                                </div>
                              ) : n.type === "system" ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[12px] font-bold text-foreground">
                                    {n.title || "System Notice"}
                                  </span>
                                  <span className="text-[11.5px] text-muted-foreground line-clamp-2">
                                    {n.message || "A system update was recorded."}
                                  </span>
                                </div>
                              ) : n.type === "upvote" ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[12px] font-bold text-foreground">
                                    {n.actor?.username || "A trader"} upvoted your {n.comment_id ? "comment" : "trade listing"}
                                  </span>
                                  {n.message && (
                                    <span className="text-[11px] text-muted-foreground truncate">
                                      "{n.message}"
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[12px] font-bold text-foreground">
                                    {n.actor?.username || "A trader"} {n.type === "reply" ? "replied to your comment" : "commented on your trade ad"}
                                  </span>
                                  {n.message && (
                                    <span className="text-[11px] text-muted-foreground truncate">
                                      "{n.message}"
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono mt-1">
                              {new Date(n.created_at).toLocaleDateString()} at{" "}
                              {new Date(n.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {!n.is_read && (
                            <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  <div className="p-2 border-t border-border bg-popover rounded-b-[8px]">
                    <Link
                      to="/notifications"
                      onClick={() => setIsNotifMenuOpen(false)}
                      className="block w-full text-center text-[12px] font-bold text-white transition-colors p-2 bg-[#5865F2] hover:bg-[#4752c4] rounded-md shadow-xs"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isAuthLoading &&
            (profile ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  aria-label="Account settings"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center justify-center p-1 bg-popover hover:bg-muted border border-border rounded-[4px] transition-[transform,background-color] duration-150 active:scale-95 shrink-0 cursor-pointer focus-visible:outline-none min-h-[44px] min-w-[44px]"
                  data-tooltip="Account Settings"
                  data-tooltip-side="bottom"
                >
                  <div className="relative">
                    <UserAvatar
                      avatarUrl={profile.avatar_url}
                      username={profile.username}
                      discordId={profile.discord_id}
                      className="w-7 h-7 rounded-[2px] bg-background"
                      alt="Avatar"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-popover"
                      style={{
                        backgroundColor: STATUS_COLORS[selfEffectiveStatus],
                      }}
                    />
                  </div>
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-[6px] shadow-xl z-[99999] p-1.5 flex flex-col">
                    <div className="px-2 py-1.5 mb-1 border-b border-border">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block">
                        Status
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        void updateStatus("online");
                        setIsProfileMenuOpen(false);
                      }}
                      className="flex items-center justify-between w-full px-2 py-2 rounded-[4px] hover:bg-muted transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="w-2 h-2 rounded-full bg-[#23a559]"
                        />
                        <span className="text-[13px] font-semibold text-foreground">
                          Online
                        </span>
                      </div>
                      {statusPreference === "online" && (
                        <Check className="w-4 h-4 text-foreground" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void updateStatus("dnd");
                        setIsProfileMenuOpen(false);
                      }}
                      className="flex items-center justify-between w-full px-2 py-2 rounded-[4px] hover:bg-muted transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="w-2 h-2 rounded-full bg-[#ef4444]"
                        />
                        <span className="text-[13px] font-semibold text-foreground">
                          Do Not Disturb
                        </span>
                      </div>
                      {statusPreference === "dnd" && (
                        <Check className="w-4 h-4 text-foreground" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void updateStatus("invisible");
                        setIsProfileMenuOpen(false);
                      }}
                      className="flex items-center justify-between w-full px-2 py-2 rounded-[4px] hover:bg-muted transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="w-2 h-2 rounded-full bg-[#888888]"
                        />
                        <span className="text-[13px] font-semibold text-foreground">
                          Invisible
                        </span>
                      </div>
                      {statusPreference === "invisible" && (
                        <Check className="w-4 h-4 text-foreground" />
                      )}
                    </button>

                    <div className="w-full h-px bg-border my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        window.document.dispatchEvent(
                          new CustomEvent("navigate", { detail: "profile" })
                        );
                      }}
                      className="flex items-center gap-2 w-full px-2 py-2 rounded-[4px] hover:bg-muted transition-colors group cursor-pointer"
                    >
                      <User className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                      <span className="text-[13px] font-semibold text-foreground">
                        Profile Settings
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void logout();
                        setIsProfileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-2 py-2 rounded-[4px] hover:bg-destructive/10 hover:text-destructive transition-colors group cursor-pointer mt-0.5"
                    >
                      <LogOut className="w-4 h-4 text-destructive" />
                      <span className="text-[13px] font-semibold text-destructive">
                        Log Out
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                aria-label="Login with Discord"
                onClick={() => void loginWithDiscord()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-[4px] text-[12px] font-bold transition-colors border border-transparent shrink-0 cursor-pointer min-h-[44px]"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </button>
            ))}

          <button
            type="button"
            aria-label="Open Command Palette"
            onClick={() => {
              triggerHaptic("light");
              setCommandPaletteOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-3 py-2 md:px-2.5 rounded-[4px] bg-input border border-border hover:border-muted-foreground text-muted-foreground hover:text-foreground transition-[transform,background-color,border-color,color] duration-150 active:scale-95 text-[12px] font-bold focus-visible:outline-none shrink-0 cursor-pointer min-h-[44px]"
            data-tooltip="Quick Search & Actions"
            data-tooltip-shortcut="⌘K"
            data-tooltip-side="bottom"
          >
            <GiMagicPortal className="w-4 h-4 sm:hidden flex-shrink-0" />
            <span className="hidden sm:flex items-center gap-2 text-[12px] font-mono tracking-wider">
              Search…{" "}
              <span
                translate="no"
                className="bg-popover border border-border rounded px-1 text-[10px]"
              >
                ⌘K
              </span>
            </span>
          </button>

          <button
            type="button"
            aria-label="Search units"
            onClick={() => setMobileSearchOpen(true)}
            className="md:hidden flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-[4px] border border-border bg-input text-muted-foreground hover:text-foreground transition-[transform,background-color] duration-150 active:scale-95 focus-visible:outline-none cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          <div
            className="hidden md:flex items-center bg-input rounded-[4px] px-2.5 h-[28px] w-[180px] lg:w-64 shrink min-w-[80px] border border-border cursor-text focus-within:border-primary transition-colors"
            onClick={() => desktopSearchRef.current?.focus()}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground mr-2" />
            <input
              ref={desktopSearchRef}
              type="text"
              placeholder="Filter units…"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              className="bg-transparent text-[13px] text-foreground w-full h-full outline-none placeholder-muted-foreground font-medium"
            />
            {globalSearchQuery && (
              <button
                type="button"
                aria-label="Clear search filter"
                onClick={(e) => {
                  e.stopPropagation();
                  setGlobalSearchQuery("");
                }}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer min-w-[24px] min-h-[24px] flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            aria-label="Toggle Trade Analyzer"
            onClick={handleToggleAnalyzer}
            className={`hidden md:flex relative items-center gap-2 px-3 py-1.5 rounded-[4px] transition-[transform,background-color,border-color,color] duration-150 active:scale-95 font-bold text-[12px] focus-visible:outline-none cursor-pointer border shrink-0 ${
              isAnalyzerOpen
                ? "bg-popover text-foreground border-border shadow-inner"
                : "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm"
            } ${
              isMainStep3 || showCalcPulse
                ? "animate-pulse border-primary !z-[100005]"
                : ""
            }`}
            data-tooltip="Trade Calculator & Analyzer"
            data-tooltip-shortcut="⌘J"
            data-tooltip-side="bottom"
          >
            <Calculator className="w-4 h-4 flex-shrink-0" />
            <span>Analyzer</span>
            {activeItemsCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 bg-foreground text-background font-mono font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center tabular-nums"
                style={{
                  transform: badgeBump ? "scale(1.28)" : "scale(1)",
                  transition: MOTION_TRANSITION.buttonPress,
                }}
              >
                {activeItemsCount > 9 ? "9+" : activeItemsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showTip && (
        <div className="bg-popover border-b border-border px-4 py-2 flex items-center justify-between relative z-40">
          <span className="text-[12px] font-medium text-foreground flex items-center gap-2">
            <GiSparkles className="w-4 h-4 shrink-0 text-primary" /> {currentTip}
          </span>
          <button
            type="button"
            aria-label="Dismiss tip"
            onClick={() => dismissTip(currentChannelInfo.title)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted shrink-0 ml-4 min-w-[24px] min-h-[24px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {commandPaletteOpen && <CommandPalette />}
    </div>
  );
}

