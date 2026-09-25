import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string;
  ad_id: string;
  comment_id: string;
  type: "comment" | "reply";
  is_read: boolean;
  created_at: string;
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
}

let activeChannel: RealtimeChannel | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

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
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
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
