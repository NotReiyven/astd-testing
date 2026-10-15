import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useTradingAdsStore, TradingAd } from "../store/useTradingAdsStore";
import { useTradeStore } from "../store/useTradeStore";
import { useNotificationStore } from "../store/useNotificationStore";
import { useAdInteractionStore } from "../store/useAdInteractionStore";
import { useToastStore } from "../store/useToastStore";

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
    } catch {
      // ignore localStorage errors
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
                "Your trade listing cooldown has ended. You can now post a new listing to the board!",
            });

            addToast(
              "Your trade ad cooldown has ended! You can now post another listing.",
              "success",
              {
                action: {
                  label: "Post Ad",
                  onClick: () => setComposerOpen(true),
                },
              }
            );
          }
        } catch {
          // ignore
        }
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [profile?.id, isStaff, getMostRecentPostTime, addToast, setComposerOpen]);

  // Monitor ad expiration and dispatch notification for expired ads
  useEffect(() => {
    if (!profile?.id) return;

    const checkExpiredAds = () => {
      const now = Date.now();
      const userAds = userAdHistory.filter((a) => a.user_id === profile.id);

      userAds.forEach((ad) => {
        const expiresMs = new Date(ad.expires_at).getTime();
        // If expired in the past 7 days
        if (expiresMs <= now && now - expiresMs < 7 * 24 * 60 * 60 * 1000) {
          const expiredKey = `astd_expired_notif_${ad.id}`;
          try {
            if (!localStorage.getItem(expiredKey)) {
              localStorage.setItem(expiredKey, "1");

              void useNotificationStore.getState().createNotification({
                user_id: profile.id,
                ad_id: ad.id,
                type: "system",
                message:
                  "Your trade ad has expired. You can view its archived comments and history.",
              });

              addToast(
                "Your trade listing has expired. Discussion and comments are now archived.",
                "info",
                {
                  action: {
                    label: "View History",
                    onClick: () => {
                      void openAdContext(ad.id, profile.id);
                    },
                  },
                }
              );
            }
          } catch {
            // ignore
          }
        }
      });
    };

    checkExpiredAds();
    const interval = setInterval(checkExpiredAds, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [profile?.id, userAdHistory, addToast, openAdContext]);

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
