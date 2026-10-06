const fs = require('fs');
let c = fs.readFileSync('src/store/useNotificationStore.ts', 'utf8');

c = c.replace(/  addLocalNotification: \(notification\) => \{[\s\S]*?\}\)\);\n  \},/, `  createNotification: async (notification) => {
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
  },`);

fs.writeFileSync('src/store/useNotificationStore.ts', c);
console.log('Fixed useNotificationStore.ts methods');
