import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string;
  ad_id: string;
  comment_id: string;
  type: "comment" | "reply" | "warning" | "upvote" | "system";
  is_read: boolean;
  created_at: string;
  message?: string;
  actor?: {
    username: string;
    avatar_url: string;
  };
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  subscribe: (userId: string) => void;
  unsubscribe: () => void;
  createNotification: (notification: Partial<AppNotification>) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

let activeChannel: RealtimeChannel | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  createNotification: async (notification) => {
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
  },

  fetchNotifications: async (userId: string) => {
    set({ isLoading: true });

    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
        *,
        actor:actor_id (username, avatar_url)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      // Supabase joins sometimes return arrays for single foreign keys depending on setup. Handle both.
      const formattedData = data.map((n: any) => ({
        ...n,
        actor: Array.isArray(n.actor) ? n.actor[0] : n.actor,
      }));

      set({
        notifications: formattedData as AppNotification[],
        unreadCount: formattedData.filter((n: AppNotification) => !n.is_read)
          .length,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    const { notifications } = get();
    set({
      notifications: notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, get().unreadCount - 1),
    });

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
  },

  markAllAsRead: async (userId: string) => {
    const { notifications } = get();
    set({
      notifications: notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    });

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
  },

  subscribe: (userId: string) => {
    if (activeChannel) return;

    get().fetchNotifications(userId);

    activeChannel = supabase
      .channel(`notifications-\${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.\${userId}`,
        },
        () => {
          // Re-fetch to get the joined actor data easily
          get().fetchNotifications(userId);
        }
      )
      .subscribe();
  },

  unsubscribe: () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
    set({ notifications: [], unreadCount: 0 });
  },
}));
