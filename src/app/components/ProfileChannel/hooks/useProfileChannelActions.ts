// ================================================
// FILE: src/app/components/ProfileChannel/hooks/useProfileChannelActions.ts
// ================================================

import { useProfileStore, UserProfileData } from "../../../../store/useProfileStore";
import { useInventoryStore } from "../../../../store/useInventoryStore";
import { useTradingAdsStore, TradingAd } from "../../../../store/useTradingAdsStore";
import { useTradeStore } from "../../../../store/useTradeStore";
import { useToastStore } from "../../../../store/useToastStore";
import { safeOpenExternal } from "../../../../store/useExternalLinkStore";
import { triggerHaptic } from "../../../../data/helpers";
import { ProfileChannelState } from "./useProfileChannelState";

export function useProfileChannelActions(state: ProfileChannelState) {
  const {
    targetId,
    isOwner,
    profileData,
    returnChannel,
    setProfileData,
    setIsEditModalOpen,
    setIsSaving,
    setDeletingAdId,
    setRepostingAdId,
    setConfirmDeleteAdId,
    setCopiedProfileLink,
    setCopiedDiscordId,
    setCopiedRoblox,
  } = state;

  const handleCloseProfile = () => {
    triggerHaptic("light");
    const target = returnChannel || "trading-ads";
    useProfileStore.getState().setViewingProfile(null);
    useInventoryStore.getState().setViewingUser(null, null, null);
    window.document.dispatchEvent(
      new CustomEvent("navigate", { detail: target })
    );
  };

  const openEditModal = () => {
    if (!profileData || !isOwner) return;
    triggerHaptic("light");
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (updates: Partial<UserProfileData>) => {
    if (!isOwner || !targetId) return;
    setIsSaving(true);
    triggerHaptic("medium");

    const { error } = await useProfileStore
      .getState()
      .saveProfileUpdates(targetId, updates);
    if (!error) {
      setProfileData((prev) => (prev ? { ...prev, ...updates } : null));
      setIsEditModalOpen(false);
      triggerHaptic("success");
      useToastStore
        .getState()
        .addToast("Profile customization saved!", "success");
    } else {
      useToastStore
        .getState()
        .addToast(
          "Could not save profile. Check your connection and try again.",
          "error"
        );
    }
    setIsSaving(false);
  };

  const handleToggleProfilePrivacy = async (
    field:
      | "ad_history_public"
      | "wishlist_public"
      | "hide_discord_id"
      | "hide_view_count"
  ) => {
    if (!isOwner || !targetId || !profileData) return;
    triggerHaptic("light");

    const currentVal =
      field === "hide_discord_id" || field === "hide_view_count"
        ? Boolean(profileData[field])
        : profileData[field] ?? true;
    const nextVal = !currentVal;

    const optimistic = { ...profileData, [field]: nextVal };
    setProfileData(optimistic);

    const { error } = await useProfileStore
      .getState()
      .saveProfileUpdates(targetId, { [field]: nextVal });
    if (error) {
      setProfileData(profileData);
      useToastStore
        .getState()
        .addToast("Failed to update privacy setting.", "error");
    } else {
      useToastStore
        .getState()
        .addToast("Privacy preference updated.", "success");
    }
  };

  const handleToggleSingleAdPrivacy = async (adId: string) => {
    if (!isOwner || !targetId || !profileData) return;
    triggerHaptic("light");

    const currentHidden = profileData.private_ad_ids || [];
    const isCurrentlyPrivate = currentHidden.includes(adId);
    const nextHidden = isCurrentlyPrivate
      ? currentHidden.filter((id) => id !== adId)
      : [...currentHidden, adId];

    setProfileData({ ...profileData, private_ad_ids: nextHidden });
    const { error } = await useProfileStore
      .getState()
      .saveProfileUpdates(targetId, { private_ad_ids: nextHidden });
    if (error) {
      setProfileData(profileData);
      useToastStore
        .getState()
        .addToast("Failed to update ad visibility.", "error");
    } else {
      useToastStore
        .getState()
        .addToast(
          isCurrentlyPrivate
            ? "Ad is now visible on your public profile."
            : "Ad hidden from visitors (Private).",
          "info"
        );
    }
  };

  const handleDeleteAdFromHistory = async (adId: string) => {
    if (!isOwner) return;
    triggerHaptic("heavy");
    setDeletingAdId(adId);
    try {
      const ok = await useTradingAdsStore.getState().deleteAd(adId);
      setConfirmDeleteAdId(null);
      if (ok) {
        useToastStore
          .getState()
          .addToast("Trade ad permanently deleted.", "success");
      }
    } finally {
      setDeletingAdId(null);
    }
  };

  const handleRepostAd = async (ad: TradingAd) => {
    if (!isOwner) return;
    setRepostingAdId(ad.id);
    triggerHaptic("medium");
    await useTradingAdsStore.getState().repostAd(ad);
    setRepostingAdId(null);
  };

  const handleLoadAdIntoCalculator = (ad: TradingAd) => {
    triggerHaptic("medium");
    useTradeStore.getState().overwrite(ad.give_items, ad.get_items);
    useToastStore
      .getState()
      .addToast("Loaded trade items into the Trade Analyzer!", "success");
  };

  const handleContact = () => {
    if (!profileData?.discord_id) return;
    triggerHaptic("medium");
    navigator.clipboard.writeText(
      `Hey! Saw your profile on ASTD Value List. Are you around to trade?`
    );
    safeOpenExternal(`https://discord.com/users/${profileData.discord_id}`);
  };

  const handleInspectVault = () => {
    if (!targetId || !profileData) return;
    triggerHaptic("medium");
    if (isOwner) {
      useInventoryStore.getState().setViewingUser(null);
    } else {
      const origin = returnChannel || "trading-ads";
      useInventoryStore
        .getState()
        .setViewingUser(targetId, profileData.username, origin);
      useProfileStore.getState().setViewingProfile(targetId, origin);
    }
    window.document.dispatchEvent(
      new CustomEvent("navigate", { detail: "inventory" })
    );
  };

  const handleCopyProfileLink = () => {
    triggerHaptic("light");
    const identifier =
      profileData?.discord_id || targetId || profileData?.username;
    const uniqueUrl = identifier
      ? `${window.location.origin}/profile/${identifier}`
      : window.location.href;
    navigator.clipboard.writeText(uniqueUrl);
    setCopiedProfileLink(true);
    useToastStore.getState().addToast("Profile link copied!", "success");
    setTimeout(() => setCopiedProfileLink(false), 2000);
  };

  const handleCopyDiscordId = () => {
    if (!profileData?.discord_id) return;
    triggerHaptic("light");
    navigator.clipboard.writeText(profileData.discord_id);
    setCopiedDiscordId(true);
    setTimeout(() => setCopiedDiscordId(false), 2000);
  };

  const handleCopyRoblox = () => {
    if (!profileData?.roblox_username) return;
    triggerHaptic("light");
    navigator.clipboard.writeText(profileData.roblox_username);
    setCopiedRoblox(true);
    setTimeout(() => setCopiedRoblox(false), 2000);
  };

  return {
    handleCloseProfile,
    openEditModal,
    handleSaveProfile,
    handleToggleProfilePrivacy,
    handleToggleSingleAdPrivacy,
    handleDeleteAdFromHistory,
    handleRepostAd,
    handleLoadAdIntoCalculator,
    handleContact,
    handleInspectVault,
    handleCopyProfileLink,
    handleCopyDiscordId,
    handleCopyRoblox,
  };
}

export type ProfileChannelActions = ReturnType<typeof useProfileChannelActions>;