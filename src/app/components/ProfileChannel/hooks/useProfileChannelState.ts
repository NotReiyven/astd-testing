// ================================================
// FILE: src/app/components/ProfileChannel/hooks/useProfileChannelState.ts
// ================================================

import { useState, useEffect, useMemo, Dispatch, SetStateAction } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import {
  useProfileStore,
  UserProfileData,
  getJoinNumber,
} from "../../../../store/useProfileStore";
import { useAuthStore, UserProfile } from "../../../../store/useAuthStore";
import {
  useInventoryStore,
  InventoryItem,
  WishlistItem,
} from "../../../../store/useInventoryStore";
import {
  useLayoutStore,
  ThemeMode,
  BootChannel,
  FontFamily,
} from "../../../../store/useLayoutStore";
import {
  useTradeStore,
  AnalyzerSettings,
  TradeJournalEntry,
} from "../../../../store/useTradeStore";
import {
  useTradingAdsStore,
  TradingAd,
} from "../../../../store/useTradingAdsStore";
import { resolveSafeUsername } from "../../../../data/helpers";
import { useUnits } from "../../../../context/UnitContext";
import { getUnitConservativeValue } from "../../InventoryChannel/inventoryUtils";
import { useShowDelay } from "../../../../hooks/useShowDelay";
import { MasterUnit } from "../../../../types";
import {
  useEffectiveStatus,
  useStatusPreference,
  StatusPreference,
  EffectiveStatus,
  STATUS_COLORS,
} from "../../../../hooks/usePresence";
import { getReputationRank } from "../formatters";
import { TRADING_STANCES, ActiveTab, AdFilter } from "../constants";

export interface ProfileChannelState {
  // Route
  targetId: string | undefined;
  isOwner: boolean;
  isInspectingOtherUser: boolean;

  // Data
  profileData: UserProfileData | null;
  setProfileData: Dispatch<SetStateAction<UserProfileData | null>>;
  isLoading: boolean;
  joinNumber: number | null;
  safeDisplayName: string;

  // Auth
  currentUser: UserProfile | null;
  session: Session | null;
  isAuthLoading: boolean;
  ownerStatusPreference: StatusPreference;
  effectiveStatus: EffectiveStatus;
  liveStatus: EffectiveStatus;
  statusDotColor: string;

  // Store
  returnChannel: string | null;

  // UI state
  activeTab: ActiveTab;
  setActiveTab: Dispatch<SetStateAction<ActiveTab>>;
  adFilter: AdFilter;
  setAdFilter: Dispatch<SetStateAction<AdFilter>>;
  confirmDeleteAdId: string | null;
  setConfirmDeleteAdId: Dispatch<SetStateAction<string | null>>;
  deletingAdId: string | null;
  setDeletingAdId: Dispatch<SetStateAction<string | null>>;
  repostingAdId: string | null;
  setRepostingAdId: Dispatch<SetStateAction<string | null>>;
  wishlistSearch: string;
  setWishlistSearch: Dispatch<SetStateAction<string>>;
  isEditModalOpen: boolean;
  setIsEditModalOpen: Dispatch<SetStateAction<boolean>>;
  isSaving: boolean;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: Dispatch<SetStateAction<boolean>>;
  copiedProfileLink: boolean;
  setCopiedProfileLink: Dispatch<SetStateAction<boolean>>;
  copiedDiscordId: boolean;
  setCopiedDiscordId: Dispatch<SetStateAction<boolean>>;
  copiedRoblox: boolean;
  setCopiedRoblox: Dispatch<SetStateAction<boolean>>;

  // Layout
  theme: ThemeMode;
  globalCompactMode: boolean;
  bootChannel: BootChannel;
  fontFamily: FontFamily;

  // Trade
  analyzerSettings: AnalyzerSettings;
  tradeJournal: TradeJournalEntry[];
  journalPublic: boolean;

  // Data
  userAdHistory: TradingAd[];
  isLoadingHistory: boolean;
  activeVaultItems: InventoryItem[];
  activeWishlistItems: WishlistItem[];
  isInventoryLoading: boolean;
  ALL_UNITS: MasterUnit[];

  // Derived
  isProfileLoading: boolean;
  safeRep: number;
  repRank: ReturnType<typeof getReputationRank>;
  accentColor: string;
  stanceCfg: (typeof TRADING_STANCES)[number];
  privateAdSet: Set<string>;
  liveAdsCount: number;
  expiredAdsCount: number;
  privateAdsCount: number;
  filteredAdHistory: TradingAd[];
  totalVaultValue: number;
  totalWishlistValue: number;
  repProgressPct: number;
  isAdHistoryVisibleToVisitor: boolean;
  isWishlistVisibleToVisitor: boolean;
  wishlistSearchResults: MasterUnit[];
  showProfileSkeleton: boolean;
  showHistorySkeleton: boolean;
  showWishlistSkeleton: boolean;
}

export function useProfileChannelState(): ProfileChannelState {
  const {
    viewingProfileId,
    fetchProfile,
    returnChannel,
    recordView,
  } = useProfileStore();
  const {
    session,
    profile: currentUser,
    isLoading: isAuthLoading,
  } = useAuthStore();
  const { theme, globalCompactMode, bootChannel, fontFamily } = useLayoutStore();
  const { analyzerSettings, tradeJournal, journalPublic } = useTradeStore();

  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const [searchParams] = useSearchParams();
  const queryUserId =
    searchParams.get("u") ||
    searchParams.get("id") ||
    searchParams.get("userId");

  const targetId =
    routeUserId ||
    queryUserId ||
    viewingProfileId ||
    currentUser?.id ||
    session?.user?.id;
  const isOwner = Boolean(
    (currentUser?.id && currentUser.id === targetId) ||
      (session?.user?.id && session.user.id === targetId)
  );
  const isInspectingOtherUser = Boolean(!isOwner && targetId);

  const [profileData, setProfileData] = useState<UserProfileData | null>(
    () => {
      if (targetId && useProfileStore.getState().cache[targetId]?.data) {
        return useProfileStore.getState().cache[targetId].data;
      }
      if (isOwner && currentUser) {
        return {
          ...currentUser,
          global_rep: (currentUser as any).global_rep ?? 0,
          bio: (currentUser as any).bio ?? "",
          banner_color: (currentUser as any).banner_color ?? "#121214",
          roblox_username: (currentUser as any).roblox_username ?? "",
        };
      }
      return null;
    }
  );
  const effectiveStatus = useEffectiveStatus(targetId, profileData?.status, {
    includeInvisibleForSelf: isOwner,
  });
  const ownerStatusPreference = useStatusPreference();

  const [isLoading, setIsLoading] = useState(() => {
    if (!targetId) return false;
    if (useProfileStore.getState().cache[targetId]?.data) return false;
    if (isOwner && currentUser) return false;
    return true;
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>("board");
  const [joinNumber, setJoinNumber] = useState<number | null>(null);
  const [adFilter, setAdFilter] = useState<AdFilter>("all");
  const [confirmDeleteAdId, setConfirmDeleteAdId] = useState<string | null>(
    null
  );
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);
  const [repostingAdId, setRepostingAdId] = useState<string | null>(null);
  const [wishlistSearch, setWishlistSearch] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [copiedDiscordId, setCopiedDiscordId] = useState(false);
  const [copiedRoblox, setCopiedRoblox] = useState(false);

  const { userAdHistory, isLoadingHistory, fetchUserAdHistory } =
    useTradingAdsStore();
  const {
    fetchWishlist,
    viewedWishlist,
    wishlistItems,
    viewedItems,
    items: ownInventoryItems,
    isLoading: isInventoryLoading,
    fetchInventory,
  } = useInventoryStore();
  const { units: ALL_UNITS } = useUnits();

  const showProfileSkeleton = useShowDelay(
    Boolean(targetId ? isLoading || isAuthLoading : isAuthLoading)
  );
  const showHistorySkeleton = useShowDelay(isLoadingHistory);
  const showWishlistSkeleton = useShowDelay(isInventoryLoading);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (!targetId) {
        if (mounted) {
          setIsLoading(false);
          setProfileData(null);
        }
        return;
      }
      if (!profileData && !useProfileStore.getState().cache[targetId]?.data) {
        setIsLoading(true);
      }

      const data = await fetchProfile(targetId, true);
      if (mounted && data) {
        setProfileData(data);

        const ownerMatch = Boolean(
          currentUser?.id && currentUser.id === targetId
        );

        const [joinNum] = await Promise.all([
          data.created_at
            ? getJoinNumber(data.created_at)
            : Promise.resolve(null),
          fetchUserAdHistory(targetId, {
            isOwner: ownerMatch,
            adHistoryPublic: data.ad_history_public ?? true,
            privateAdIds: data.private_ad_ids ?? [],
          }),
          fetchInventory(targetId, !ownerMatch),
          fetchWishlist(targetId, !ownerMatch),
        ]);

        if (mounted) {
          setJoinNumber(joinNum ?? data.join_number ?? null);
        }
      }
      if (mounted) setIsLoading(false);
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [
    targetId,
    currentUser?.id,
    fetchProfile,
    fetchUserAdHistory,
    fetchInventory,
    fetchWishlist,
  ]);

  useEffect(() => {
    if (targetId && !isOwner) {
      void recordView(targetId, "profile");
    }
  }, [targetId, isOwner, recordView]);

  const activeVaultItems = isOwner ? ownInventoryItems : viewedItems;
  const activeWishlistItems = isOwner ? wishlistItems : viewedWishlist;

  const wishlistSearchResults = useMemo(() => {
    const q = wishlistSearch.trim().toLowerCase();
    if (!q) return [];
    const existingSet = new Set(activeWishlistItems.map((w) => w.unit_id));
    return ALL_UNITS.filter(
      (u) =>
        !existingSet.has(u.id) &&
        (u.name.toLowerCase().includes(q) ||
          (u.subtitle && u.subtitle.toLowerCase().includes(q)))
    ).slice(0, 6);
  }, [wishlistSearch, ALL_UNITS, activeWishlistItems]);

  const isProfileLoading = Boolean(
    targetId ? isLoading || isAuthLoading : isAuthLoading
  );

  const safeRep = profileData?.global_rep ?? 0;
  const repRank = getReputationRank(safeRep);
  const accentColor = profileData?.accent_color || "#7289da";
  const stanceCfg =
    TRADING_STANCES.find(
      (s) => s.id === (profileData?.trading_stance || "open")
    ) || TRADING_STANCES[0];

  const privateAdSet = new Set(profileData?.private_ad_ids || []);
  const nowMs = Date.now();

  const liveAdsCount = userAdHistory.filter(
    (a) => new Date(a.expires_at).getTime() > nowMs
  ).length;
  const expiredAdsCount = userAdHistory.filter(
    (a) => new Date(a.expires_at).getTime() <= nowMs
  ).length;
  const privateAdsCount = userAdHistory.filter((a) =>
    privateAdSet.has(a.id)
  ).length;

  const filteredAdHistory = userAdHistory.filter((ad) => {
    const isLive = new Date(ad.expires_at).getTime() > nowMs;
    const isPriv = privateAdSet.has(ad.id);
    if (adFilter === "live") return isLive;
    if (adFilter === "expired") return !isLive;
    if (adFilter === "private") return isPriv;
    return true;
  });

  const totalVaultValue = activeVaultItems.reduce((acc, i) => {
    const m = ALL_UNITS.find((u) => u.id === i.unit_id);
    return acc + (m ? getUnitConservativeValue(m) * i.quantity : 0);
  }, 0);

  const totalWishlistValue = activeWishlistItems.reduce((acc, i) => {
    const m = ALL_UNITS.find((u) => u.id === i.unit_id);
    return acc + (m ? getUnitConservativeValue(m) : 0);
  }, 0);

  const repProgressPct =
    safeRep >= 1000
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            ((safeRep - repRank.min) /
              Math.max(1, repRank.next - repRank.min)) *
              100
          )
        );

  const liveStatus = effectiveStatus;
  const statusDotColor = STATUS_COLORS[liveStatus];

  const isAdHistoryVisibleToVisitor =
    isOwner || (profileData?.ad_history_public ?? true);
  const isWishlistVisibleToVisitor =
    isOwner || (profileData?.wishlist_public ?? true);

  const safeDisplayName = profileData
    ? resolveSafeUsername(profileData.username, {
        joinNumber,
        discordId: profileData.discord_id,
        userId: profileData.id,
      })
    : "Trader";

  return {
    targetId,
    isOwner,
    isInspectingOtherUser,
    profileData,
    setProfileData,
    isLoading,
    joinNumber,
    safeDisplayName,
    currentUser,
    session,
    isAuthLoading,
    ownerStatusPreference,
    effectiveStatus,
    liveStatus,
    statusDotColor,
    returnChannel,
    activeTab,
    setActiveTab,
    adFilter,
    setAdFilter,
    confirmDeleteAdId,
    setConfirmDeleteAdId,
    deletingAdId,
    setDeletingAdId,
    repostingAdId,
    setRepostingAdId,
    wishlistSearch,
    setWishlistSearch,
    isEditModalOpen,
    setIsEditModalOpen,
    isSaving,
    setIsSaving,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    copiedProfileLink,
    setCopiedProfileLink,
    copiedDiscordId,
    setCopiedDiscordId,
    copiedRoblox,
    setCopiedRoblox,
    theme,
    globalCompactMode,
    bootChannel,
    fontFamily,
    analyzerSettings,
    tradeJournal,
    journalPublic,
    userAdHistory,
    isLoadingHistory,
    activeVaultItems,
    activeWishlistItems,
    isInventoryLoading,
    ALL_UNITS,
    isProfileLoading,
    safeRep,
    repRank,
    accentColor,
    stanceCfg,
    privateAdSet,
    liveAdsCount,
    expiredAdsCount,
    privateAdsCount,
    filteredAdHistory,
    totalVaultValue,
    totalWishlistValue,
    repProgressPct,
    isAdHistoryVisibleToVisitor,
    isWishlistVisibleToVisitor,
    wishlistSearchResults,
    showProfileSkeleton,
    showHistorySkeleton,
    showWishlistSkeleton,
  };
}