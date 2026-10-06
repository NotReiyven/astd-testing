import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  ad_id: string | null;
  comment_id: string | null;
  type: "comment" | "reply" | "warning" | "upvote" | "system";
  is_read: boolean;
  created_at: string;
  message?: string | null;
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
let activeUserId: string | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  createNotification: async (notification) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const sessionUserId = session?.user.id ?? null;
    const userId = notification.user_id || sessionUserId;

    if (!userId) return;

    const payload = {
      user_id: userId,
      actor_id: notification.actor_id || sessionUserId || null,
      ad_id: notification.ad_id || null,
      comment_id: notification.comment_id || null,
      type: notification.type || "system",
      message: notification.message || null,
    };

    const { error } = await supabase.from("notifications").insert(payload);

    if (error) {
      console.error("Failed to create notification:", error);
      return;
    }

    // Refresh immediately for self-notifications even if Realtime is unavailable.
    if (sessionUserId === userId) {
      void get().fetchNotifications(userId);
    }
  },

  deleteNotification: async (id) => {
    const previous = get().notifications;
    const target = previous.find((notification) => notification.id === id);

    if (!target) return;

    set((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== id
      ),
      unreadCount: target.is_read
        ? state.unreadCount
        : Math.max(0, state.unreadCount - 1),
    }));

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete notification:", error);
      if (activeUserId) {
        void get().fetchNotifications(activeUserId);
      }
    }
  },

  fetchNotifications: async (userId: string) => {
    if (!userId) return;

    set({ isLoading: true });

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to fetch notifications:", error.message);
      if (activeUserId === userId) {
        set({ isLoading: false });
      }
      return;
    }

    if (activeUserId !== null && activeUserId !== userId) {
      return;
    }

    const rows = (data || []) as AppNotification[];
    const actorIds = [
      ...new Set(
        rows
          .map((notification) => notification.actor_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    let actorsById: Record<
      string,
      { username: string; avatar_url: string }
    > = {};

    if (actorIds.length > 0) {
      const { data: actorRows, error: actorError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", actorIds);

      if (actorError) {
        console.error(
          "Failed to fetch notification actors:",
          actorError.message
        );
      } else if (actorRows) {
        actorsById = Object.fromEntries(
          actorRows.map((actor) => [
            actor.id,
            {
              username: actor.username,
              avatar_url: actor.avatar_url,
            },
          ])
        );
      }
    }

    const notifications = rows.map((notification) => ({
      ...notification,
      actor: notification.actor_id
        ? actorsById[notification.actor_id]
        : undefined,
    }));

    if (activeUserId === null || activeUserId === userId) {
      set({
        notifications,
        unreadCount: notifications.filter(
          (notification) => !notification.is_read
        ).length,
        isLoading: false,
      });
    }
  },

  markAsRead: async (notificationId: string) => {
    const target = get().notifications.find(
      (notification) => notification.id === notificationId
    );

    if (!target || target.is_read) return;

    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error("Failed to mark notification as read:", error.message);
      if (activeUserId) {
        void get().fetchNotifications(activeUserId);
      }
    }
  },

  markAllAsRead: async (userId: string) => {
    if (!userId || get().unreadCount === 0) return;

    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        is_read: true,
      })),
      unreadCount: 0,
    }));

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Failed to mark all notifications as read:", error.message);
      void get().fetchNotifications(userId);
    }
  },

  subscribe: (userId: string) => {
    if (!userId) return;

    if (activeChannel && activeUserId === userId) {
      void get().fetchNotifications(userId);
      return;
    }

    if (activeChannel) {
      void supabase.removeChannel(activeChannel);
      activeChannel = null;
    }

    activeUserId = userId;
    void get().fetchNotifications(userId);

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
          void get().fetchNotifications(userId);
        }
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Notification realtime error:", error);
        }
      });
  },

  unsubscribe: () => {
    if (activeChannel) {
      void supabase.removeChannel(activeChannel);
      activeChannel = null;
    }

    activeUserId = null;

    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
    });
  },
}));
