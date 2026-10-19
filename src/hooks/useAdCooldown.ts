import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useTradingAdsStore, TradingAd } from "../store/useTradingAdsStore";
import { useTradeStore } from "../store/useTradeStore";
import { useNotificationStore } from "../store/useNotificationStore";
import { useAdInteractionStore } from "../store/useAdInteractionStore";
import { useToastStore } from "../store/useToastStore";
import { logger } from "../lib/logger";

export const AD_POST_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_ACTIVE_ADS_REGULAR = 3;

export const isStaffRole = (role?: string | null): boolean => {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return ["mod", "admin", "master"].includes(normalized);
};

export const formatCooldownTimer = (ms: number): string => {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export function useAdCooldown() {
  const profile = useAuthStore((s) => s.profile);
  const ads = useTradingAdsStore((s) => s.ads);
  const userAdHistory = useTradingAdsStore((s) => s.userAdHistory);
  const setComposerOpen = useTradeStore((s) => s.setComposerOpen);
  const addToast = useToastStore((s) => s.addToast);
  const openAdContext = useAdInteractionStore((s) => s.openAdContext);

  const isStaff = useMemo(() => isStaffRole(profile?.role), [profile?.role]);

  // Compute active ads count for this user
  const activeUserAds = useMemo(() => {
    if (!profile?.id) return [];
    const now = Date.now();
    // Gather from both active ads and userAdHistory to be fully consistent
    const combinedMap = new Map<string, TradingAd>();
    ads.forEach((ad) => {
      if (ad.user_id === profile.id && new Date(ad.expires_at).getTime() > now) {
        combinedMap.set(ad.id, ad);
      }
    });
    userAdHistory.forEach((ad) => {
      if (ad.user_id === profile.id && new Date(ad.expires_at).getTime() > now) {
        combinedMap.set(ad.id, ad);
      }
    });
    return Array.from(combinedMap.values());
  }, [ads, userAdHistory, profile?.id]);

  const activeAdsCount = activeUserAds.length;
  const isAtMaxActiveAds = !isStaff && activeAdsCount >= MAX_ACTIVE_ADS_REGULAR;

  // Find the most recent ad post timestamp
  const getMostRecentPostTime = useCallback((): number => {
    if (!profile?.id) return 0;
    let mostRecent = 0;

    // Check localStorage timestamp
    try {
      const stored = localStorage.getItem(`astd_last_ad_posted_${profile.id}`);
      if (stored) {
        const parsed = Number(stored);
        if (!isNaN(parsed) && parsed > mostRecent) {
          mostRecent = parsed;
        }
      }
    } catch (err) {
      logger.warn("ASTD-ADS-012", "Failed to read ad cooldown from localStorage", {
        scope: "useAdCooldown",
        action: "getMostRecentPostTime",
        metadata: { userId: profile.id },
        error: err,
      });
    }

    // Check memory ads and user history
    [...ads, ...userAdHistory].forEach((ad) => {
      if (ad.user_id === profile.id) {
        const createdMs = new Date(ad.created_at).getTime();
        if (createdMs > mostRecent) {
          mostRecent = createdMs;
        }
      }
    });

    return mostRecent;
  }, [profile?.id, ads, userAdHistory]);

  const [cooldownRemainingMs, setCooldownRemainingMs] = useState<number>(0);

  // Ticking cooldown timer
  useEffect(() => {
    if (!profile?.id || isStaff) {
      setCooldownRemainingMs(0);
      return;
    }

    const updateCooldown = () => {
      const lastPost = getMostRecentPostTime();
      if (!lastPost) {
        setCooldownRemainingMs(0);
        return;
      }
      const elapsed = Date.now() - lastPost;
      const remaining = Math.max(0, AD_POST_COOLDOWN_MS - elapsed);
      setCooldownRemainingMs(remaining);

      // Check if cooldown just finished
      if (remaining === 0 && lastPost > 0) {
        const notifKey = `astd_cooldown_notified_${profile.id}_${lastPost}`;
        try {
          if (!localStorage.getItem(notifKey)) {
            localStorage.setItem(notifKey, "1");

            // Dispatch in-app notification & toast
            void useNotificationStore.getState().createNotification({
              user_id: profile.id,
              type: "system",
              message:
                "Your trade listing cooldown has ended. You can now post a new listing to the board.",
            });

            addToast(
              "Trading ad cooldown ended. You can now post a new listing.",
              "success",
              {
                action: {
                  label: "Post Listing",
                  onClick: () => setComposerOpen(true),
                },
              }
            );
          }
        } catch (err) {
          logger.warn("ASTD-ADS-013", "Failed to access localStorage for cooldown notification flag", {
            scope: "useAdCooldown",
            action: "updateCooldown",
            metadata: { notifKey },
            error: err,
          });
        }
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [profile?.id, isStaff, getMostRecentPostTime, addToast, setComposerOpen]);

  const sessionStartTime = useMemo(() => Date.now(), []);

  // Monitor ad expiration and dispatch notification for expired ads
  useEffect(() => {
    if (!profile?.id) return;

    const checkExpiredAds = () => {
      const now = Date.now();
      const userAds = userAdHistory.filter((a) => a.user_id === profile.id);
      const existingNotifications = useNotificationStore.getState().notifications;

      userAds.forEach((ad) => {
        const expiresMs = new Date(ad.expires_at).getTime();
        // If not expired yet, skip
        if (expiresMs > now) return;

        const expiredKey = `astd_expired_notif_${ad.id}`;
        let hasLocalStorageFlag = false;
        try {
          hasLocalStorageFlag = Boolean(localStorage.getItem(expiredKey));
        } catch {}

        const hasExistingNotification = existingNotifications.some(
          (n) =>
            n.ad_id === ad.id &&
            (n.type === "system" || n.message?.toLowerCase().includes("expired"))
        );

        // If already flagged in localStorage or already present in notifications database/store, record flag and skip
        if (hasLocalStorageFlag || hasExistingNotification) {
          if (!hasLocalStorageFlag) {
            try {
              localStorage.setItem(expiredKey, "1");
            } catch {}
          }
          return;
        }

        // Ad expired in the past while user was offline or historical (> 2 minutes ago):
        // Mark localStorage so it won't be checked again, but NEVER spam live toasts or duplicate rows on mount.
        try {
          localStorage.setItem(expiredKey, "1");
        } catch {}

        const expiredDuringActiveSession = expiresMs >= sessionStartTime - 120000;
        if (!expiredDuringActiveSession) {
          return;
        }

        void useNotificationStore.getState().createNotification({
          user_id: profile.id,
          ad_id: ad.id,
          type: "system",
          message:
            "Your trade listing has expired and was moved to your archive.",
        });

        addToast(
          "Trade listing expired and moved to archive.",
          "info",
          {
            action: {
              label: "View Listing",
              onClick: () => {
                void openAdContext(ad.id, profile.id);
              },
            },
          }
        );
      });
    };

    checkExpiredAds();
    const interval = setInterval(checkExpiredAds, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [profile?.id, userAdHistory, addToast, openAdContext, sessionStartTime]);

  const isOnCooldown = !isStaff && cooldownRemainingMs > 0;
  const canPostAd = Boolean(profile) && !isOnCooldown && !isAtMaxActiveAds;

  return {
    isStaff,
    activeAdsCount,
    maxActiveAds: isStaff ? Infinity : MAX_ACTIVE_ADS_REGULAR,
    isAtMaxActiveAds,
    cooldownRemainingMs,
    isOnCooldown,
    canPostAd,
    formattedCooldown: formatCooldownTimer(cooldownRemainingMs),
  };
}
