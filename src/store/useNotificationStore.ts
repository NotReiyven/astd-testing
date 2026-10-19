import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { get as getIdb, set as setIdb, del as delIdb } from "idb-keyval";
import { useToastStore } from "./useToastStore";
import { resolveSafeUsername } from "../data/helpers";
import { logger } from "../lib/logger";

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string;
  ad_id: string | null;
  comment_id: string | null;
  type: "comment" | "reply" | "warning" | "upvote" | "system" | "value_update";
  is_read: boolean;
  created_at: string;
  title?: string | null;
  message?: string | null;
  action_url?: string | null;
  action_label?: string | null;
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
  fetchNotifications: (userId?: string | null) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId?: string | null) => Promise<void>;
  deleteAllNotifications: (userId?: string | null) => Promise<void>;
  createNotification: (
    notification: Partial<AppNotification>
  ) => Promise<void>;
  addLocalNotification: (
    notification: Partial<AppNotification>
  ) => void;
  deleteNotification: (id: string) => Promise<void>;
  restoreNotification: (
    notification: AppNotification,
    index: number
  ) => Promise<void>;
  subscribe: (userId?: string | null) => void;
  unsubscribe: () => void;
}

let activeChannel: RealtimeChannel | null = null;
let activeUserId: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let subscriptionToken = 0;

const MAX_RECONNECT_DELAY = 30000;
const DUPLICATE_WINDOW_MS = 2000;
const recentNotifications = new Map<string, number>();

const getCacheKey = (userId?: string | null) =>
  `astd_notifications_cache_${userId || "guest"}`;

const saveToOfflineCache = (userId: string | null, list: AppNotification[]) => {
  void setIdb(getCacheKey(userId), list).catch((err) => {
    logger.warn("ASTD-NOTIF-014", "Failed to write notifications to offline cache", {
      scope: "useNotificationStore",
      action: "saveToOfflineCache",
      metadata: { userId },
      error: err,
    });
  });
};

const loadFromOfflineCache = async (
  userId: string | null
): Promise<AppNotification[]> => {
  try {
    const cached = await getIdb<AppNotification[]>(getCacheKey(userId));
    return Array.isArray(cached) ? cached : [];
  } catch (err) {
    logger.warn("ASTD-NOTIF-015", "Failed to read notifications from offline cache", {
      scope: "useNotificationStore",
      action: "loadFromOfflineCache",
      metadata: { userId },
      error: err,
    });
    return [];
  }
};

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
    const channelToClean = activeChannel;
    activeChannel = null;
    void supabase.removeChannel(channelToClean);
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    const state = useNotificationStore.getState();
    if (activeUserId) {
      void state.fetchNotifications(activeUserId);
      state.subscribe(activeUserId);
    }
  });
}

export const useNotificationStore = create<NotificationState>(
  (set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    fetchNotifications: async (userId) => {
      const targetUserId = userId || null;

      // 1. Instant offline cache load
      const cached = await loadFromOfflineCache(targetUserId);
      if (get().notifications.length === 0 && cached.length > 0) {
        set({
          notifications: cached,
          unreadCount: cached.filter((n) => !n.is_read).length,
        });
      }

      if (!targetUserId) {
        set({ isLoading: false });
        return;
      }

      set({ isLoading: true });

      // If offline, keep showing cached notifications
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        set({ isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", {
          ascending: false,
        })
        .limit(50);

      if (activeUserId !== targetUserId) {
        set({ isLoading: false });
        return;
      }

      if (error) {
        logger.error("ASTD-NOTIF-001", "Failed to fetch notifications from database", {
          scope: "useNotificationStore",
          action: "fetchNotifications",
          metadata: { targetUserId },
          error,
        });
        set({ isLoading: false });
        return;
      }

      const rows = data ?? [];
      const actorIds = Array.from(
        new Set(
          rows
            .map((n: any) => n.actor_id)
            .filter((id): id is string => Boolean(id && id !== "system" && id !== targetUserId))
        )
      );

      const actorMap = new Map<string, { username: string; avatar_url: string; discord_id?: string }>();
      if (actorIds.length > 0) {
        const { data: actorProfiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, discord_id")
          .in("id", actorIds);

        if (actorProfiles) {
          for (const ap of actorProfiles) {
            actorMap.set(ap.id, {
              username: ap.username,
              avatar_url: ap.avatar_url,
              discord_id: ap.discord_id,
            });
          }
        }
      }

      const dbNotifications = rows.map((notification: any) => {
        const rawActor = notification.actor_id ? actorMap.get(notification.actor_id) : null;
        return {
          ...notification,
          actor: rawActor
            ? {
                ...rawActor,
                username: resolveSafeUsername(rawActor.username, {
                  discordId: rawActor.discord_id,
                  userId: notification.actor_id,
                }),
              }
            : null,
        };
      }) as AppNotification[];

      // Preserve local-only notifications (e.g. value updates) that aren't in Supabase
      const localOnly = cached.filter((c) => c.id.startsWith("local-"));
      const combined = [...localOnly, ...dbNotifications.filter((n) => !localOnly.some((l) => l.id === n.id))];

      combined.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const unread = combined.filter((n) => !n.is_read).length;

      set({
        notifications: combined,
        unreadCount: unread,
        isLoading: false,
      });

      saveToOfflineCache(targetUserId, combined);
    },

    addLocalNotification: (notification) => {
      const id = notification.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date().toISOString();

      const newNotif: AppNotification = {
        id,
        user_id: notification.user_id || activeUserId || "guest",
        actor_id: notification.actor_id || "system",
        ad_id: notification.ad_id || null,
        comment_id: notification.comment_id || null,
        type: notification.type || "system",
        title: notification.title || null,
        message: notification.message || null,
        action_url: notification.action_url || null,
        action_label: notification.action_label || null,
        is_read: false,
        created_at: notification.created_at || now,
        actor: notification.actor || null,
      };

      set((state) => {
        // Prevent duplicate local notification if ID matches
        if (state.notifications.some((n) => n.id === id)) {
          return state;
        }
        const updated = [newNotif, ...state.notifications];
        saveToOfflineCache(activeUserId, updated);
        return {
          notifications: updated,
          unreadCount: state.unreadCount + 1,
        };
      });
    },

    createNotification: async (notification) => {
      let userId = notification.user_id ?? null;

      if (!userId) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        userId = session?.user?.id ?? null;
      }

      if (!userId) {
        get().addLocalNotification(notification);
        return;
      }

      const dedupeKey = [
        userId,
        notification.type ?? "system",
        notification.message ?? "",
        notification.ad_id ?? "",
        notification.comment_id ?? "",
      ].join("|");

      const now = Date.now();
      const previous = recentNotifications.get(dedupeKey);

      if (previous && now - previous < DUPLICATE_WINDOW_MS) {
        return;
      }

      recentNotifications.set(dedupeKey, now);

      for (const [key, timestamp] of recentNotifications) {
        if (now - timestamp > DUPLICATE_WINDOW_MS) {
          recentNotifications.delete(key);
        }
      }

      // Permanent store-level deduplication: If a notification for the same ad / event
      // already exists in the user's notification list, do not create a duplicate in the database.
      const currentNotifications = get().notifications;
      const isDuplicateInStore = currentNotifications.some((existing) => {
        if (existing.user_id !== userId) return false;
        if (notification.ad_id && existing.ad_id === notification.ad_id) {
          if ((notification.type ?? "system") === "system" && existing.type === "system") {
            return true;
          }
          if (existing.message === notification.message) {
            return true;
          }
        }
        return (
          existing.type === (notification.type ?? "system") &&
          existing.message === notification.message &&
          (existing.ad_id ?? null) === (notification.ad_id ?? null) &&
          (existing.comment_id ?? null) === (notification.comment_id ?? null)
        );
      });

      if (isDuplicateInStore) {
        return;
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
        logger.error("ASTD-NOTIF-002", "Failed to create database notification, falling back to local", {
          scope: "useNotificationStore",
          action: "createNotification",
          metadata: { userId, type: notification.type, dedupeKey },
          error,
        });
        recentNotifications.delete(dedupeKey);
        // Fallback to local notification if network/db insert fails
        get().addLocalNotification(notification);
        return;
      }

      if (activeUserId && activeUserId === userId) {
        await get().fetchNotifications(userId);
      }
    },

    deleteNotification: async (id) => {
      const notification = get().notifications.find((n) => n.id === id);

      set((state) => {
        const nextList = state.notifications.filter((n) => n.id !== id);
        saveToOfflineCache(activeUserId, nextList);
        return {
          notifications: nextList,
          unreadCount: notification?.is_read
            ? state.unreadCount
            : Math.max(0, state.unreadCount - 1),
        };
      });

      if (id.startsWith("local-")) {
        return;
      }

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("ASTD-NOTIF-003", "Failed to delete notification from database", {
          scope: "useNotificationStore",
          action: "deleteNotification",
          metadata: { id },
          error,
        });
        useToastStore
          .getState()
          .addToast("Could not delete notification. Please try again.", "error", {
            action: {
              label: "Retry",
              onClick: () => {
                void get().deleteNotification(id);
              },
            },
          });

        if (notification) {
          await get().fetchNotifications(activeUserId ?? notification.user_id);
        }
      }
    },

    deleteAllNotifications: async (userId) => {
      const targetUserId = userId || activeUserId || null;
      const snapshot = [...get().notifications];

      if (snapshot.length === 0) return;

      set({
        notifications: [],
        unreadCount: 0,
      });

      void delIdb(getCacheKey(targetUserId)).catch((err) => {
        logger.warn("ASTD-NOTIF-016", "Failed to clear notifications cache in IndexedDB", {
          scope: "useNotificationStore",
          action: "deleteAllNotifications",
          metadata: { targetUserId },
          error: err,
        });
      });

      useToastStore.getState().addToast(
        "Cleared all notifications.",
        "info",
        {
          action: {
            label: "Undo",
            onClick: () => {
              set({
                notifications: snapshot,
                unreadCount: snapshot.filter((n) => !n.is_read).length,
              });
              saveToOfflineCache(targetUserId, snapshot);
            },
          },
        }
      );

      if (targetUserId && targetUserId !== "guest" && navigator.onLine) {
        const { error } = await supabase
          .from("notifications")
          .delete()
          .eq("user_id", targetUserId);

        if (error) {
          logger.error("ASTD-NOTIF-004", "Failed to delete all notifications from database", {
            scope: "useNotificationStore",
            action: "deleteAllNotifications",
            metadata: { targetUserId },
            error,
          });
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
        saveToOfflineCache(activeUserId, nextList);
        return {
          notifications: nextList,
          unreadCount: notification.is_read
            ? state.unreadCount
            : state.unreadCount + 1,
        };
      });

      if (notification.id.startsWith("local-")) {
        return;
      }

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
        logger.error("ASTD-NOTIF-005", "Failed to restore notification in database", {
          scope: "useNotificationStore",
          action: "restoreNotification",
          metadata: { notificationId: notification.id },
          error,
        });
      }
    },

    markAsRead: async (notificationId) => {
      const notification = get().notifications.find(
        (n) => n.id === notificationId
      );

      if (!notification || notification.is_read) {
        return;
      }

      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        saveToOfflineCache(activeUserId, updated);
        return {
          notifications: updated,
          unreadCount: Math.max(0, state.unreadCount - 1),
        };
      });

      if (notificationId.startsWith("local-")) {
        return;
      }

      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("id", notificationId);

      if (error) {
        logger.error("ASTD-NOTIF-006", "Failed to mark notification as read in database", {
          scope: "useNotificationStore",
          action: "markAsRead",
          metadata: { notificationId },
          error,
        });
        await get().fetchNotifications(activeUserId ?? notification.user_id);
      }
    },

    markAllAsRead: async (userId) => {
      const targetUserId = userId || activeUserId || null;

      set((state) => {
        const updated = state.notifications.map((n) => ({
          ...n,
          is_read: true,
        }));
        saveToOfflineCache(targetUserId, updated);
        return {
          notifications: updated,
          unreadCount: 0,
        };
      });

      if (!targetUserId || targetUserId === "guest" || !navigator.onLine) {
        return;
      }

      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("user_id", targetUserId)
        .eq("is_read", false);

      if (error) {
        logger.error("ASTD-NOTIF-007", "Failed to mark all notifications as read in database", {
          scope: "useNotificationStore",
          action: "markAllAsRead",
          metadata: { targetUserId },
          error,
        });
        await get().fetchNotifications(targetUserId);
      }
    },

    subscribe: (userId) => {
      const targetUserId = userId || null;

      if (!targetUserId) {
        cleanupChannel();
        activeUserId = null;
        void get().fetchNotifications(null);
        return;
      }

      if (activeUserId === targetUserId && activeChannel) {
        return;
      }

      cleanupChannel();

      activeUserId = targetUserId;
      reconnectAttempt = 0;
      subscriptionToken += 1;

      const token = subscriptionToken;
      const channelName = `notifications-${targetUserId}-${token}`;

      void get().fetchNotifications(targetUserId);

      // Clean up any existing channels with this topic prefix to avoid collision
      try {
        const existingChannels = supabase.getChannels();
        for (const ch of existingChannels) {
          if (ch.topic.startsWith(`realtime:notifications-${targetUserId}`)) {
            void supabase.removeChannel(ch);
          }
        }
      } catch (err) {
        logger.warn("ASTD-NOTIF-019", "Failed to prune previous realtime channels", {
          scope: "useNotificationStore",
          action: "subscribe.prune",
          error: err,
        });
      }

      try {
        const channel = supabase
          .channel(channelName)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${targetUserId}`,
            },
            async (payload: any) => {
              if (activeUserId === targetUserId && subscriptionToken === token) {
                void get().fetchNotifications(targetUserId);

                if (payload?.eventType === "INSERT" && payload?.new) {
                  const newNotif = payload.new;
                  if (
                    (newNotif.actor_id && newNotif.actor_id !== targetUserId) ||
                    newNotif.type === "system" ||
                    newNotif.type === "value_update"
                  ) {
                    let actorName = "A trader";
                    if (newNotif.actor_id && newNotif.actor_id !== "system") {
                      const { data: actorProfile } = await supabase
                        .from("profiles")
                        .select("username, discord_id")
                        .eq("id", newNotif.actor_id)
                        .maybeSingle();
                      if (actorProfile) {
                        const cleanActor = resolveSafeUsername(actorProfile.username, {
                          discordId: actorProfile.discord_id,
                          userId: newNotif.actor_id,
                        });
                        actorName = `@${cleanActor}`;
                      }
                    }

                    let toastText = "";
                    if (newNotif.type === "reply") {
                      toastText = `${actorName} replied to your trade discussion comment.`;
                    } else if (newNotif.type === "comment") {
                      toastText = `${actorName} commented on your trade listing.`;
                    } else if (newNotif.type === "upvote") {
                      toastText = `${actorName} upvoted your ${
                        newNotif.comment_id ? "comment" : "trade listing"
                      }.`;
                    } else if (newNotif.type === "warning") {
                      toastText = `Staff moderation notice: ${
                        newNotif.message || "A notice was issued regarding your account."
                      }`;
                    } else if (newNotif.type === "value_update") {
                      toastText = "Market values and tiers were updated.";
                    } else {
                      toastText = newNotif.message || "New activity on your trade listing.";
                    }

                    useToastStore.getState().addToast(
                      toastText,
                      newNotif.type === "warning" ? "error" : "info",
                      newNotif.ad_id
                        ? {
                            action: {
                              label: "View",
                              onClick: () => {
                                window.document.dispatchEvent(
                                  new CustomEvent("navigate", {
                                    detail: "notifications",
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

          // Ignore status events for stale or already replaced subscriptions
          if (
            activeChannel !== channel ||
            subscriptionToken !== token ||
            activeUserId !== targetUserId
          ) {
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            logger.warn(
              "ASTD-NOTIF-017",
              `Realtime notification channel failed with status: ${status}`,
              {
                scope: "useNotificationStore",
                action: "channel.subscribe",
                metadata: { targetUserId, status, reconnectAttempt },
              }
            );

            // Disconnect activeChannel reference first so any sync callbacks emitted by removeChannel
            // are immediately ignored and cannot recurse
            activeChannel = null;
            void supabase.removeChannel(channel);

            scheduleReconnect(targetUserId, token);
          }
        });
      } catch (subErr) {
        logger.warn(
          "ASTD-NOTIF-018",
          "Failed to establish realtime notification channel",
          {
            scope: "useNotificationStore",
            action: "subscribe",
            metadata: { targetUserId, token },
            error: subErr,
          }
        );
      }
    },

    unsubscribe: () => {
      subscriptionToken += 1;
      activeUserId = null;
      reconnectAttempt = 0;

      cleanupChannel();
      // Keep cached notifications instead of zeroing them out
    },
  })
);