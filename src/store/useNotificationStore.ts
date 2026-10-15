import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useToastStore } from "./useToastStore";

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string;
  ad_id: string | null;
  comment_id: string | null;
  type: "comment" | "reply" | "warning" | "upvote" | "system";
  is_read: boolean;
  created_at: string;
  message?: string | null;
  actor?: {
    username: string;
    avatar_url: string;
    discord_id?: string;
  } | null;
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
  createNotification: (
    notification: Partial<AppNotification>
  ) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  restoreNotification: (
    notification: AppNotification,
    index: number
  ) => Promise<void>;
}

let activeChannel: RealtimeChannel | null = null;
let activeUserId: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let subscriptionToken = 0;

const MAX_RECONNECT_DELAY = 30000;
const DUPLICATE_WINDOW_MS = 2000;
const recentNotifications = new Map<string, number>();

const scheduleReconnect = (userId: string, token: number) => {
  if (
    reconnectTimer ||
    activeUserId !== userId ||
    subscriptionToken !== token
  ) {
    return;
  }

  const delay = Math.min(
    1000 * 2 ** reconnectAttempt,
    MAX_RECONNECT_DELAY
  );

  reconnectAttempt += 1;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    if (
      activeUserId !== userId ||
      subscriptionToken !== token
    ) {
      return;
    }

    const state = useNotificationStore.getState();
    state.subscribe(userId);
  }, delay);
};

const cleanupChannel = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (activeChannel) {
    void supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
};

export const useNotificationStore = create<NotificationState>(
  (set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    createNotification: async (notification) => {
      let userId = notification.user_id ?? null;

      if (!userId) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        userId = session?.user?.id ?? null;
      }

      if (!userId) return;

      const dedupeKey = [
        userId,
        notification.type ?? "system",
        notification.message ?? "",
        notification.ad_id ?? "",
        notification.comment_id ?? "",
      ].join("|");

      const now = Date.now();
      const previous = recentNotifications.get(dedupeKey);

      if (
        previous &&
        now - previous < DUPLICATE_WINDOW_MS
      ) {
        return;
      }

      recentNotifications.set(dedupeKey, now);

      for (const [key, timestamp] of recentNotifications) {
        if (now - timestamp > DUPLICATE_WINDOW_MS) {
          recentNotifications.delete(key);
        }
      }

      const payload = {
        user_id: userId,
        actor_id: notification.actor_id ?? userId,
        ad_id: notification.ad_id ?? null,
        comment_id: notification.comment_id ?? null,
        type: notification.type ?? "system",
        message: notification.message ?? null,
      };

      const { error } = await supabase
        .from("notifications")
        .insert(payload);

      if (error) {
        console.error(
          "Failed to create notification:",
          error
        );

        recentNotifications.delete(dedupeKey);
        return;
      }

      // Refresh immediately so notifications still appear
      // even when the realtime WebSocket is unavailable.
      if (activeUserId && activeUserId === userId) {
        await get().fetchNotifications(userId);
      }
    },

    deleteNotification: async (id) => {
      const notification = get().notifications.find(
        (n) => n.id === id
      );

      set((state) => ({
        notifications: state.notifications.filter(
          (n) => n.id !== id
        ),
        unreadCount: notification?.is_read
          ? state.unreadCount
          : Math.max(0, state.unreadCount - 1),
      }));

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) {
        console.error(
          "Failed to delete notification:",
          error
        );

        useToastStore
          .getState()
          .addToast("Could not delete notification—try again.", "error", {
            action: {
              label: "Retry",
              onClick: () => {
                void get().deleteNotification(id);
              },
            },
          });

        if (notification) {
          await get().fetchNotifications(
            activeUserId ?? notification.user_id
          );
        }
      }
    },

    restoreNotification: async (notification, index) => {
      set((state) => {
        if (state.notifications.some((n) => n.id === notification.id)) {
          return state;
        }
        const nextList = [...state.notifications];
        const clampedIndex = Math.max(0, Math.min(index, nextList.length));
        nextList.splice(clampedIndex, 0, notification);
        return {
          notifications: nextList,
          unreadCount: notification.is_read
            ? state.unreadCount
            : state.unreadCount + 1,
        };
      });

      const { error } = await supabase
        .from("notifications")
        .insert({
          id: notification.id,
          user_id: notification.user_id,
          actor_id: notification.actor_id,
          ad_id: notification.ad_id,
          comment_id: notification.comment_id,
          type: notification.type,
          is_read: notification.is_read,
          created_at: notification.created_at,
          message: notification.message ?? null,
        });

      if (error && error.code !== "23505") {
        console.error("Failed to restore notification:", error);
      }
    },

    fetchNotifications: async (userId) => {
      if (!userId) {
        set({
          notifications: [],
          unreadCount: 0,
          isLoading: false,
        });
        return;
      }

      set({ isLoading: true });

      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          *,
          actor:actor_id (username, avatar_url, discord_id)
        `
        )
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        })
        .limit(50);

      if (activeUserId !== userId) {
        set({ isLoading: false });
        return;
      }

      if (error) {
        console.error(
          "Failed to fetch notifications:",
          error
        );

        set({ isLoading: false });
        return;
      }

      const formattedData = (data ?? []).map(
        (notification: any) => ({
          ...notification,
          actor: Array.isArray(notification.actor)
            ? notification.actor[0] ?? null
            : notification.actor ?? null,
        })
      ) as AppNotification[];

      set({
        notifications: formattedData,
        unreadCount: formattedData.filter(
          (n) => !n.is_read
        ).length,
        isLoading: false,
      });
    },

    markAsRead: async (notificationId) => {
      const notification = get().notifications.find(
        (n) => n.id === notificationId
      );

      if (!notification || notification.is_read) {
        return;
      }

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                is_read: true,
              }
            : n
        ),
        unreadCount: Math.max(
          0,
          state.unreadCount - 1
        ),
      }));

      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("id", notificationId);

      if (error) {
        console.error(
          "Failed to mark notification as read:",
          error
        );

        await get().fetchNotifications(
          activeUserId ?? notification.user_id
        );
      }
    },

    markAllAsRead: async (userId) => {
      if (!userId) return;

      set((state) => ({
        notifications: state.notifications.map(
          (n) => ({
            ...n,
            is_read: true,
          })
        ),
        unreadCount: 0,
      }));

      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error(
          "Failed to mark all notifications as read:",
          error
        );

        await get().fetchNotifications(userId);
      }
    },

    subscribe: (userId) => {
      if (!userId) return;

      if (
        activeUserId === userId &&
        activeChannel
      ) {
        return;
      }

      cleanupChannel();

      activeUserId = userId;
      reconnectAttempt = 0;
      subscriptionToken += 1;

      const token = subscriptionToken;
      const channelName = `notifications-${userId}`;

      void get().fetchNotifications(userId);

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          async (payload: any) => {
            if (
              activeUserId === userId &&
              subscriptionToken === token
            ) {
              void get().fetchNotifications(userId);

              if (payload?.eventType === "INSERT" && payload?.new) {
                const newNotif = payload.new;
                if (
                  (newNotif.actor_id && newNotif.actor_id !== userId) ||
                  newNotif.type === "system"
                ) {
                  let actorName = "Someone";
                  if (newNotif.actor_id) {
                    const { data: actorProfile } = await supabase
                      .from("profiles")
                      .select("username")
                      .eq("id", newNotif.actor_id)
                      .maybeSingle();
                    if (actorProfile?.username) {
                      actorName = actorProfile.username;
                    }
                  }

                  let toastText = "";
                  if (newNotif.type === "reply") {
                    toastText = `${actorName} replied: ${
                      newNotif.message
                        ? `"${newNotif.message}"`
                        : "to your comment"
                    }`;
                  } else if (newNotif.type === "comment") {
                    toastText = `${actorName} commented: ${
                      newNotif.message
                        ? `"${newNotif.message}"`
                        : "on your trade listing"
                    }`;
                  } else if (newNotif.type === "upvote") {
                    toastText = `${actorName} upvoted your ${
                      newNotif.comment_id ? "comment" : "trade listing"
                    }`;
                  } else if (newNotif.type === "warning") {
                    toastText = `Staff Warning: ${
                      newNotif.message || "A formal staff warning was issued."
                    }`;
                  } else {
                    toastText = `${newNotif.message || "New notification"}`;
                  }

                  useToastStore.getState().addToast(
                    toastText,
                    newNotif.type === "warning" ? "error" : "info",
                    newNotif.ad_id
                      ? {
                          action: {
                            label: "View",
                            onClick: async () => {
                              const { useAdInteractionStore } = await import(
                                "./useAdInteractionStore"
                              );
                              void useAdInteractionStore
                                .getState()
                                .openAdContext(newNotif.ad_id, userId);
                              window.document.dispatchEvent(
                                new CustomEvent("navigate", {
                                  detail: "trading-ads",
                                })
                              );
                            },
                          },
                        }
                      : undefined
                  );
                }
              }
            }
          }
        );

      activeChannel = channel;

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          reconnectAttempt = 0;
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          console.warn(
            `Notification realtime status: ${status}`
          );

          if (activeChannel === channel) {
            void supabase.removeChannel(channel);
            activeChannel = null;
          }

          scheduleReconnect(userId, token);
        }
      });
    },

    unsubscribe: () => {
      subscriptionToken += 1;
      activeUserId = null;
      reconnectAttempt = 0;

      cleanupChannel();

      set({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
      });
    },
  })
);