import { useState, useMemo, useEffect, type KeyboardEvent } from "react";

function formatDistanceToNow(
  dateInput: Date | number | string,
  options?: { addSuffix?: boolean }
): string {
  const time = typeof dateInput === "number" ? dateInput : new Date(dateInput).getTime();
  if (isNaN(time)) return "recently";
  const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (diffSec < 45) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m${options?.addSuffix ? " ago" : ""}`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h${options?.addSuffix ? " ago" : ""}`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return options?.addSuffix ? "yesterday" : "1d";
  if (diffDays < 30) return `${diffDays}d${options?.addSuffix ? " ago" : ""}`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo${options?.addSuffix ? " ago" : ""}`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y${options?.addSuffix ? " ago" : ""}`;
}
import {
  GiRingingBell,
  GiCharacter,
  GiTrashCan,
  GiCheckMark,
  GiChecklist,
  GiProgression,
  GiShield,
  GiScrollUnfurled,
} from "react-icons/gi";
import {
  useNotificationStore,
  type AppNotification,
} from "../../store/useNotificationStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useToastStore } from "../../store/useToastStore";
import { useAdInteractionStore } from "../../store/useAdInteractionStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useShowDelay } from "../../hooks/useShowDelay";
import { triggerHaptic } from "../../data/helpers";
import { UserAvatar } from "./shared/UserAvatar";
import { EmptyState } from "./ui/EmptyState";

type FilterTab = "all" | "unread" | "trading" | "system";

function NotificationsSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div
      className="flex flex-col gap-2"
      role="status"
      aria-busy="true"
      aria-label="Loading notifications"
    >
      {Array.from({ length: count }).map((_, item) => (
        <div
          key={item}
          className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-[8px] border border-border bg-card animate-pulse"
        >
          <div className="flex-1 flex items-start gap-4 min-w-0 w-full">
            <div className="w-10 h-10 rounded-full border border-border bg-muted shrink-0" />
            <div className="flex flex-col flex-1 min-w-0 gap-2 pt-0.5">
              <div className="h-3.5 w-3/4 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted/70" />
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <div className="w-8 h-8 rounded-[6px] bg-muted border border-border" />
            <div className="w-8 h-8 rounded-[6px] bg-muted border border-border" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationsChannel() {
  const profile = useAuthStore((s) => s.profile);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const deleteAllNotifications = useNotificationStore(
    (s) => s.deleteAllNotifications
  );
  const restoreNotification = useNotificationStore(
    (s) => s.restoreNotification
  );
  const addToast = useToastStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const isNotificationsLoading = isLoading || isAuthLoading;
  const showNotificationsSkeleton = useShowDelay(isNotificationsLoading);

  useEffect(() => {
    void fetchNotifications(profile?.id || null);
  }, [profile?.id, fetchNotifications]);

  const handleMarkAll = () => {
    if (unreadCount === 0) return;
    const count = unreadCount;
    triggerHaptic("medium");
    void markAllAsRead(profile?.id || null);
    addToast(
      `Marked ${count} ${count === 1 ? "notification" : "notifications"} as read.`,
      "success"
    );
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    triggerHaptic("heavy");
    void deleteAllNotifications(profile?.id || null);
    setConfirmClearAll(false);
  };

  const handleDeleteNotification = (
    notification: AppNotification,
    index: number
  ) => {
    const snapshot = { ...notification };
    triggerHaptic("light");
    void deleteNotification(notification.id);
    addToast("Notification removed.", "info", {
      action: {
        label: "Undo",
        onClick: () => {
          void restoreNotification(snapshot, index);
          addToast("Notification restored.", "success");
        },
      },
    });
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.is_read) {
      void markAsRead(notification.id);
    }

    if (notification.type === "value_update" || notification.action_url === "/home") {
      window.document.dispatchEvent(
        new CustomEvent("navigate", { detail: "home" })
      );
      return;
    }

    if (
      notification.ad_id &&
      (notification.type === "comment" ||
        notification.type === "reply" ||
        notification.type === "upvote" ||
        notification.type === "warning" ||
        notification.type === "system")
    ) {
      void useAdInteractionStore
        .getState()
        .openAdContext(notification.ad_id, profile?.id);
    } else if (
      notification.type === "system" &&
      notification.message?.toLowerCase().includes("cooldown")
    ) {
      useTradeStore.getState().setComposerOpen(true);
    }
  };

  const handleNotificationKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    notification: AppNotification
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void handleNotificationClick(notification);
    }
  };

  // Filtered notifications based on tab
  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case "unread":
        return notifications.filter((n) => !n.is_read);
      case "trading":
        return notifications.filter(
          (n) =>
            n.type === "comment" || n.type === "reply" || n.type === "upvote"
        );
      case "system":
        return notifications.filter(
          (n) =>
            n.type === "system" ||
            n.type === "value_update" ||
            n.type === "warning"
        );
      case "all":
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  return (
    <div className="w-full h-full flex flex-col items-center custom-scrollbar overflow-y-auto px-4 md:px-8 py-8 md:py-12 bg-background text-foreground">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* Header with Power Tools */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <GiRingingBell className="w-6 h-6 text-primary shrink-0" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-[#5865F2] text-white border border-[#5865F2]/40 tabular-nums uppercase tracking-wider shadow-xs">
                  {unreadCount} unread
                </span>
              )}
            </h1>
            <p className="text-[12.5px] text-muted-foreground font-medium">
              Review market value updates, trader offers, and trade listing activity.
            </p>
          </div>

          {/* Power Tool Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-popover hover:bg-muted text-foreground border border-border rounded-[6px] text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer shadow-xs"
              >
                <GiChecklist className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Mark all read</span>
              </button>
            )}

            {notifications.length > 0 && (
              confirmClearAll ? (
                <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-[6px] text-[11.5px] font-bold cursor-pointer transition-colors"
                  >
                    Confirm clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2 py-1.5 bg-muted text-muted-foreground hover:text-foreground rounded-[6px] text-[11.5px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-popover hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border rounded-[6px] text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive cursor-pointer shadow-xs"
                >
                  <GiTrashCan className="w-3.5 h-3.5 shrink-0" />
                  <span>Clear all</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Guest Banner if not signed in */}
        {!profile && !isAuthLoading && (
          <div className="p-3.5 bg-card border border-border rounded-[8px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
              <GiCharacter className="w-4 h-4 text-[#5865F2] shrink-0" />
              <span>
                You are browsing in Guest mode. Sign in with Discord to receive alerts when traders comment on or upvote your listings.
              </span>
            </div>
            <button
              type="button"
              onClick={loginWithDiscord}
              className="px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752c4] text-white text-[12px] font-semibold rounded-[5px] transition-colors shrink-0 cursor-pointer"
            >
              Sign In with Discord
            </button>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border rounded-[8px] overflow-x-auto custom-scrollbar">
            {(
              [
                { id: "all", label: "All", count: notifications.length },
                { id: "unread", label: "Unread", count: unreadCount },
                {
                  id: "trading",
                  label: "Trading",
                  count: notifications.filter(
                    (n) =>
                      n.type === "comment" ||
                      n.type === "reply" ||
                      n.type === "upvote"
                  ).length,
                },
                {
                  id: "system",
                  label: "Updates & System",
                  count: notifications.filter(
                    (n) =>
                      n.type === "system" ||
                      n.type === "value_update" ||
                      n.type === "warning"
                  ).length,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTab(tab.id);
                }}
                className={`px-3 py-1.5 rounded-[6px] text-[12px] font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      activeTab === tab.id
                        ? "bg-primary/15 text-primary font-bold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Notifications Feed */}
        {isNotificationsLoading ? (
          showNotificationsSkeleton ? (
            <NotificationsSkeletonList count={4} />
          ) : null
        ) : !profile ? (
          <EmptyState
            icon={<GiCharacter className="w-5 h-5 text-[#5865F2]" />}
            title="Sign in with Discord to view your notifications"
            description="Log in with Discord to receive live alerts when other traders comment on or upvote your listings."
            action={{
              label: "Sign In with Discord",
              onClick: loginWithDiscord,
            }}
          />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={<GiRingingBell className="w-5 h-5" />}
            title={activeTab === "all" ? "No notifications" : `No ${activeTab} notifications`}
            description={
              activeTab === "all"
                ? "You are all caught up. Activity on your listings and value list adjustments will appear here."
                : `There are currently no notifications matching the ${activeTab} filter.`
            }
            action={{
              label: "Browse Live Trading Board",
              onClick: () => {
                window.document.dispatchEvent(
                  new CustomEvent("navigate", { detail: "trading-ads" })
                );
              },
            }}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredNotifications.map((notification, index) => {
              const isValueUpdate = notification.type === "value_update";
              const isWarning = notification.type === "warning";
              const isUpvote = notification.type === "upvote";
              const isReply = notification.type === "reply";
              const isComment = notification.type === "comment";

              return (
                <div
                  key={notification.id}
                  className={`group relative flex flex-col md:flex-row items-start md:items-center gap-3.5 p-4 rounded-[8px] border transition-colors ${
                    isWarning
                      ? !notification.is_read
                        ? "border-[#f97316] bg-[#f97316]/10"
                        : "border-[#f97316]/40 bg-card"
                      : isValueUpdate
                      ? !notification.is_read
                        ? "border-[#23a559] bg-[#23a559]/10"
                        : "border-[#23a559]/30 bg-card"
                      : !notification.is_read
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div
                    className="flex-1 flex items-start gap-3.5 min-w-0 w-full cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-[4px]"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      void handleNotificationClick(notification);
                    }}
                    onKeyDown={(event) =>
                      handleNotificationKeyDown(event, notification)
                    }
                    aria-label={
                      notification.is_read
                        ? "Read notification"
                        : "Mark notification as read"
                    }
                  >
                    {/* Icon / Avatar */}
                    {isValueUpdate ? (
                      <div className="w-10 h-10 rounded-full border border-[#23a559]/40 bg-[#23a559]/15 flex items-center justify-center shrink-0 text-[#23a559]">
                        <GiProgression className="w-5 h-5" />
                      </div>
                    ) : isWarning ? (
                      <div className="w-10 h-10 rounded-full border border-[#f97316]/40 bg-[#f97316]/15 flex items-center justify-center shrink-0 text-[#f97316]">
                        <GiShield className="w-5 h-5" />
                      </div>
                    ) : notification.type === "system" ? (
                      <div className="w-10 h-10 rounded-full border border-border bg-muted flex items-center justify-center shrink-0 text-foreground">
                        <GiScrollUnfurled className="w-5 h-5 text-primary" />
                      </div>
                    ) : (
                      <UserAvatar
                        avatarUrl={notification.actor?.avatar_url}
                        username={notification.actor?.username}
                        discordId={notification.actor?.discord_id}
                        className="w-10 h-10 rounded-full border border-border shrink-0 bg-muted"
                      />
                    )}

                    {/* Content */}
                    <div className="flex flex-col flex-1 min-w-0 gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isValueUpdate && (
                          <span className="px-1.5 py-0.2 rounded-[3px] bg-[#23a559] text-white font-bold text-[10px] font-mono uppercase tracking-wider">
                            Value Update
                          </span>
                        )}
                        {isWarning && (
                          <span className="px-1.5 py-0.2 rounded-[3px] bg-[#f97316] text-[#000000] font-black text-[10px] uppercase tracking-wider font-mono">
                            Staff Notice
                          </span>
                        )}
                        {isReply && (
                          <span className="px-1.5 py-0.2 rounded-[3px] bg-[#5865F2] text-white font-bold text-[10px] font-mono uppercase tracking-wider">
                            Reply
                          </span>
                        )}
                        {isComment && (
                          <span className="px-1.5 py-0.2 rounded-[3px] bg-[#5865F2] text-white font-bold text-[10px] font-mono uppercase tracking-wider">
                            Comment
                          </span>
                        )}
                        {isUpvote && (
                          <span className="px-1.5 py-0.2 rounded-[3px] bg-primary text-primary-foreground font-bold text-[10px] font-mono uppercase tracking-wider">
                            Upvote
                          </span>
                        )}

                        <span className="text-[12.5px] font-bold text-foreground">
                          {isValueUpdate
                            ? "Market values updated"
                            : isWarning
                            ? notification.actor?.username
                              ? `Moderation notice from @${notification.actor.username}`
                              : "Staff moderation notice"
                            : isUpvote
                            ? `${notification.actor?.username || "A trader"} upvoted your ${
                                notification.comment_id ? "comment" : "trade listing"
                              }`
                            : isReply
                            ? `${notification.actor?.username || "A trader"} replied to your comment`
                            : isComment
                            ? `${notification.actor?.username || "A trader"} commented on your trade listing`
                            : notification.title || "System notification"}
                        </span>
                      </div>

                      {notification.message && (
                        <p className="text-[12.5px] text-muted-foreground leading-relaxed line-clamp-3">
                          {notification.message}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground/80 mt-0.5">
                        <span>
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        {notification.ad_id && (
                          <span className="text-primary hover:underline font-semibold">
                            Trade listing #{notification.ad_id.slice(0, 6)}
                          </span>
                        )}
                        {isValueUpdate && (
                          <span className="text-[#23a559] hover:underline font-semibold">
                            Open Update Log →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          void markAsRead(notification.id);
                        }}
                        aria-label="Mark notification as read"
                        title="Mark as read"
                        className="p-2 min-w-[36px] min-h-[36px] md:min-w-[28px] md:min-h-[28px] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted rounded-[5px] transition-colors cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <GiCheckMark className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteNotification(notification, index)
                      }
                      aria-label="Delete notification"
                      title="Remove notification"
                      className="p-2 min-w-[36px] min-h-[36px] md:min-w-[28px] md:min-h-[28px] flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[5px] transition-colors cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                    >
                      <GiTrashCan className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
