const fs = require('fs');
let c = fs.readFileSync('src/store/useNotificationStore.ts', 'utf8');

c = c.replace(
  'addLocalNotification: (notification: Partial<AppNotification>) => void;',
  'createNotification: (notification: Partial<AppNotification>) => Promise<void>;\n  deleteNotification: (id: string) => Promise<void>;'
);

const oldImpl = `  addLocalNotification: (notification) => {
    const newNotif: AppNotification = {
      id: notification.id || Math.random().toString(36).substring(2, 9),
      user_id: notification.user_id || "",
      actor_id: notification.actor_id || "",
      ad_id: notification.ad_id || "",
      comment_id: notification.comment_id || "",
      type: notification.type || "warning",
      is_read: false,
      created_at: new Date().toISOString(),
      message: notification.message,
      actor: notification.actor,
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },`;

const newImpl = `  createNotification: async (notification) => {
    // If user_id is missing, assume it's a self-notification (e.g. system warnings)
    let uid = notification.user_id;
    if (!uid) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        uid = data.session.user.id;
      } else {
        return;
      }
    }

    const { error } = await supabase.from("notifications").insert({
      user_id: uid,
      actor_id: notification.actor_id || uid,
      ad_id: notification.ad_id || null,
      comment_id: notification.comment_id || null,
      type: notification.type || "system",
      message: notification.message || null,
    });
    
    if (error) {
      console.error("Failed to insert notification:", error);
    }
  },

  deleteNotification: async (id) => {
    set((state) => {
      const isUnread = state.notifications.find(n => n.id === id && !n.is_read);
      return {
        notifications: state.notifications.filter(n => n.id !== id),
        unreadCount: isUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
      };
    });
    await supabase.from("notifications").delete().eq("id", id);
  },`;

c = c.replace(oldImpl, newImpl);
fs.writeFileSync('src/store/useNotificationStore.ts', c);
console.log('Fixed useNotificationStore.ts');
