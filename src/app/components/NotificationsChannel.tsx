import { motion } from "framer-motion";
import { useNotificationStore } from "../../store/useNotificationStore";
import { formatDistanceToNow } from "date-fns";
import { BellRing, Check, Trash2 } from "lucide-react";
import { triggerHaptic } from "../../data/helpers";

export function NotificationsChannel() {
  const { notifications, markAllAsRead, markAsRead, deleteNotification } =
    useNotificationStore();

  const handleMarkAll = () => {
    triggerHaptic("medium");
    markAllAsRead(notifications[0]?.user_id || "");
  };

  return (
    <div className="w-full h-full flex flex-col items-center custom-scrollbar overflow-y-auto px-4 md:px-8 py-8 md:py-12 bg-background text-foreground">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <BellRing className="w-6 h-6 text-primary" />
              Notifications
            </h1>
            <p className="text-[13px] text-muted-foreground font-medium">
              Manage your alerts, ad upvotes, and system warnings.
            </p>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-md text-[12px] font-bold transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex flex-col gap-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 border border-border border-dashed rounded-lg bg-muted/20">
              <BellRing className="w-8 h-8 text-muted-foreground opacity-50" />
              <p className="text-[14px] text-muted-foreground font-medium">
                You're all caught up! No new notifications.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                layout
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 100 || info.offset.x < -100) {
                    deleteNotification(n.id);
                  }
                }}
                whileHover={{ scale: 1.01 }}
                whileDrag={{ scale: 0.98, opacity: 0.8 }}
                className={`group relative flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-lg border cursor-grab active:cursor-grabbing ${
                  !n.is_read ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                } transition-all duration-300`}
              >
                <div className="flex-1 flex items-start gap-4 min-w-0 w-full" onClick={() => !n.is_read && markAsRead(n.id)}>
                  <img
                    src={n.actor?.avatar_url || "/units/firezio.webp"}
                    alt=""
                    className="w-10 h-10 rounded-full border border-border object-cover shrink-0 bg-muted"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="text-[13.5px] text-foreground leading-snug">
                      {n.type === "warning" ? (
                        <>
                          <strong className="font-bold text-destructive">System Warning:</strong>{" "}
                          {n.message}
                        </>
                      ) : n.type === "system" ? (
                        <>
                          <strong className="font-bold text-success">System:</strong>{" "}
                          {n.message}
                        </>
                      ) : n.type === "upvote" ? (
                        <>
                          <strong className="font-bold text-white">
                            {n.actor?.username || "Someone"}
                          </strong>{" "}
                          upvoted your trade ad.
                        </>
                      ) : (
                        <>
                          <strong className="font-bold text-white">
                            {n.actor?.username || "Someone"}
                          </strong>{" "}
                          {n.type === "reply"
                            ? "replied to your comment"
                            : "commented on your trade ad"}
                          .
                        </>
                      )}
                    </p>
                    <span className="text-[11px] font-mono text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-[6px] transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      triggerHaptic("light");
                      deleteNotification(n.id);
                    }}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[6px] transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
