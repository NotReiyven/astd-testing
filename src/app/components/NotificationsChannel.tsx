import { useEffect, type KeyboardEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { BellRing, Check, Trash2 } from "lucide-react";
import {
  useNotificationStore,
  type AppNotification,
} from "../../store/useNotificationStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useToastStore } from "../../store/useToastStore";
import { useShowDelay } from "../../hooks/useShowDelay";
import { getUnitAssetUrl, triggerHaptic } from "../../data/helpers";
import { UserAvatar } from "./shared/UserAvatar";
import { EmptyState } from "./ui/EmptyState";

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
          className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-lg border border-border bg-card animate-pulse"
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
  const restoreNotification = useNotificationStore(
    (s) => s.restoreNotification
  );
  const addToast = useToastStore((s) => s.addToast);

  const isNotificationsLoading = isLoading || isAuthLoading;
  const showNotificationsSkeleton = useShowDelay(isNotificationsLoading);

  useEffect(() => {
    if (profile?.id) {
      void fetchNotifications(profile.id);
    }
  }, [profile?.id, fetchNotifications]);

  const handleMarkAll = () => {
    if (!profile?.id || unreadCount === 0) return;
    const count = unreadCount;
    triggerHaptic("medium");
    void markAllAsRead(profile.id);
    addToast(
      `Marked ${count} ${
        count === 1 ? "notification" : "notifications"
      } as read.`,
      "success"
    );
  };

  const handleDeleteNotification = (
    notification: AppNotification,
    index: number
  ) => {
    const snapshot = { ...notification };
    triggerHaptic("light");
    void deleteNotification(notification.id);
    addToast("Deleted notification.", "info", {
      action: {
        label: "Undo",
        onClick: () => {
          void restoreNotification(snapshot, index);
          addToast("Restored notification.", "success");
        },
      },
    });
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.is_read) {
      void markAsRead(notification.id);
    }
    if (
      notification.ad_id &&
      (notification.type === "comment" ||
        notification.type === "reply" ||
        notification.type === "upvote")
    ) {
      const { useAdInteractionStore } = await import(
        "../../store/useAdInteractionStore"
      );
      void useAdInteractionStore
        .getState()
        .openAdContext(notification.ad_id, profile?.id);
      window.document.dispatchEvent(
        new CustomEvent("navigate", { detail: "trading-ads" })
      );
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

  if (!profile && !isAuthLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center px-4 md:px-8 py-8 bg-background text-foreground">
        <div className="w-full max-w-md">
          <EmptyState
            icon={<BellRing className="w-5 h-5" />}
            title="Sign In to View Notifications"
            description="Connect your Discord account to receive alerts when traders upvote, comment on, or reply to your trade listings."
            action={{
              label: "Sign In with Discord",
              onClick: loginWithDiscord,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center custom-scrollbar overflow-y-auto px-4 md:px-8 py-8 md:py-12 bg-background text-foreground">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <BellRing className="w-6 h-6 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-[12px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-primary/15 text-primary border border-primary/30 tabular-nums">
                  {unreadCount} unread
                </span>
              )}
            </h1>
            <p className="text-[13px] text-muted-foreground font-medium">
              Manage your alerts, ad activity, and system warnings.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-md text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Mark All as Read
            </button>
          )}
        </div>

        {isNotificationsLoading ? (
          showNotificationsSkeleton ? (
            <NotificationsSkeletonList count={4} />
          ) : null
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<BellRing className="w-5 h-5" />}
            title="All Caught Up"
            description="You have no notifications yet. Activity on your trade listings and comments will appear here."
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
          <div className="flex flex-col gap-2">
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                className={`group relative flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-lg border transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-in ${
                  !notification.is_read
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : "border-border bg-card"
                }`}
              >
                <div
                  className="flex-1 flex items-start gap-4 min-w-0 w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[4px]"
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
                  <UserAvatar
                    avatarUrl={notification.actor?.avatar_url}
                    username={notification.actor?.username}
                    discordId={notification.actor?.discord_id}
                    className="w-10 h-10 rounded-full border border-border shrink-0 bg-muted"
                  />

                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="text-[13.5px] text-foreground leading-snug">
                      {notification.type === "warning" ? (
                        <>
                          <strong className="font-bold text-destructive">
                            System Warning:
                          </strong>{" "}
                          {notification.message ||
                            "A system warning requires your attention."}
                        </>
                      ) : notification.type === "system" ? (
                        <>
                          <strong className="font-bold text-[#23a559]">
                            System:
                          </strong>{" "}
                          {notification.message ||
                            "A system update was recorded."}
                        </>
                      ) : notification.type === "upvote" ? (
                        <>
                          <strong className="font-bold text-foreground">
                            {notification.actor?.username || "Someone"}
                          </strong>{" "}
                          {notification.comment_id
                            ? "upvoted your comment in a trade discussion."
                            : "upvoted your trade ad."}
                          {notification.message && (
                            <span className="block text-[12px] text-muted-foreground italic bg-muted/40 px-2.5 py-1 rounded-md mt-1 border-l-2 border-primary/50 font-sans break-words">
                              "{notification.message}"
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <strong className="font-bold text-foreground">
                            {notification.actor?.username || "Someone"}
                          </strong>{" "}
                          {notification.type === "reply"
                            ? "replied to your comment:"
                            : "commented on your trade ad:"}
                          {notification.message && (
                            <span className="block text-[12px] text-muted-foreground/90 italic bg-muted/40 px-2.5 py-1.5 rounded-md mt-1.5 border-l-2 border-primary/60 font-sans break-words">
                              "{notification.message}"
                            </span>
                          )}
                        </>
                      )}
                    </p>

                    <span className="text-[11px] font-mono text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        void markAsRead(notification.id);
                      }}
                      aria-label="Mark notification as read"
                      data-tooltip="Mark as read"
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-[6px] transition-[transform,background-color,color] duration-150 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteNotification(notification, index)
                    }
                    aria-label="Delete notification"
                    data-tooltip="Delete notification"
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[6px] transition-[transform,background-color,color] duration-150 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
