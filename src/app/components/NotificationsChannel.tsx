import { useEffect, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { BellRing, Check, Trash2 } from "lucide-react";
import { useNotificationStore } from "../../store/useNotificationStore";
import { useAuthStore } from "../../store/useAuthStore";
import { getUnitAssetUrl, triggerHaptic } from "../../data/helpers";

export function NotificationsChannel() {
  const { profile } = useAuthStore();
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAllAsRead,
    markAsRead,
    deleteNotification,
  } = useNotificationStore();

  useEffect(() => {
    if (profile?.id) {
      void fetchNotifications(profile.id);
    }
  }, [profile?.id, fetchNotifications]);

  const handleMarkAll = () => {
    if (!profile?.id || unreadCount === 0) return;
    triggerHaptic("medium");
    void markAllAsRead(profile.id);
  };

  const handleNotificationKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    notification: (typeof notifications)[number]
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!notification.is_read) {
        void markAsRead(notification.id);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center custom-scrollbar overflow-y-auto px-4 md:px-8 py-8 md:py-12 bg-background text-foreground">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <BellRing className="w-6 h-6 text-primary" />
              Notifications
            </h1>
            <p className="text-[13px] text-muted-foreground font-medium">
              Manage your alerts, ad activity, and system warnings.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-md text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading notifications">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-[76px] rounded-lg border border-border bg-card animate-pulse"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 border border-border border-dashed rounded-lg bg-muted/20">
            <BellRing className="w-8 h-8 text-muted-foreground opacity-50" />
            <p className="text-[14px] text-muted-foreground font-medium">
              No notifications yet.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="flex flex-col gap-2">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    x: -100,
                    transition: { duration: 0.2 },
                  }}
                  layout
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.3}
                  onDragEnd={(_, info) => {
                    if (Math.abs(info.offset.x) > 100) {
                      triggerHaptic("light");
                      void deleteNotification(notification.id);
                    }
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileDrag={{ scale: 0.98, opacity: 0.8 }}
                  className={`group relative flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-lg border cursor-grab active:cursor-grabbing ${
                    !notification.is_read
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-card"
                  } transition-colors`}
                >
                  <div
                    className="flex-1 flex items-start gap-4 min-w-0 w-full cursor-pointer outline-none"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!notification.is_read) {
                        void markAsRead(notification.id);
                      }
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
                    <img
                      src={
                        notification.actor?.avatar_url ||
                        getUnitAssetUrl("firezio") ||
                        ""
                      }
                      alt=""
                      className="w-10 h-10 rounded-full border border-border object-cover shrink-0 bg-muted"
                    />

                    <div className="flex flex-col flex-1 min-w-0">
                      <p className="text-[13.5px] text-foreground leading-snug">
                        {notification.type === "warning" ? (
                          <>
                            <strong className="font-bold text-destructive">
                              System Warning:
                            </strong>{" "}
                            {notification.message || "A system warning requires your attention."}
                          </>
                        ) : notification.type === "system" ? (
                          <>
                            <strong className="font-bold text-success">
                              System:
                            </strong>{" "}
                            {notification.message || "A system update was recorded."}
                          </>
                        ) : notification.type === "upvote" ? (
                          <>
                            <strong className="font-bold text-white">
                              {notification.actor?.username || "Someone"}
                            </strong>{" "}
                            upvoted your trade ad.
                          </>
                        ) : (
                          <>
                            <strong className="font-bold text-white">
                              {notification.actor?.username || "Someone"}
                            </strong>{" "}
                            {notification.type === "reply"
                              ? "replied to your comment."
                              : "commented on your trade ad."}
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

                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {!notification.is_read && (
                      <button
                        onClick={() => {
                          triggerHaptic("light");
                          void markAsRead(notification.id);
                        }}
                        aria-label="Mark notification as read"
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        triggerHaptic("light");
                        void deleteNotification(notification.id);
                      }}
                      aria-label="Delete notification"
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}


