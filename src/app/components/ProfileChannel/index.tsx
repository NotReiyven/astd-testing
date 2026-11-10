// ================================================
// FILE: src/app/components/ProfileChannel/index.tsx
// ================================================

import { useMemo } from "react";
import { GiMegaphone, GiSpikedHalo, GiTrophyCup } from "react-icons/gi";
import { triggerHaptic } from "../../../data/helpers";
import { useProfileStore } from "../../../store/useProfileStore";
import { ProfileCustomizerModal } from "../Profile/ProfileCustomizerModal";
import { DeleteAccountModal } from "../Profile/DeleteAccountModal";
import { ViewingUserBar } from "../shared/ViewingUserBar";
import { IconSliders } from "./icons";
import { ActiveTab } from "./constants";
import { useProfileChannelState } from "./hooks/useProfileChannelState";
import { useProfileChannelActions } from "./hooks/useProfileChannelActions";
import { ProfileChannelSkeleton } from "./skeletons/ProfileChannelSkeleton";
import { ProfileNotFoundView } from "./ProfileNotFoundView";
import { GuestPreferencesView } from "./GuestPreferencesView";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileSidebar } from "./ProfileSidebar";
import { AdHistoryTab } from "./tabs/AdHistoryTab";
import { WishlistTab } from "./tabs/WishlistTab";
import { JournalTab } from "./tabs/JournalTab";
import { SettingsTab } from "./tabs/SettingsTab";

export function ProfileChannel() {
  const state = useProfileChannelState();
  const actions = useProfileChannelActions(state);

  const {
    targetId,
    isOwner,
    isInspectingOtherUser,
    profileData,
    safeDisplayName,
    isAuthLoading,
    isProfileLoading,
    showProfileSkeleton,
    activeTab,
    setActiveTab,
    globalCompactMode,
    returnChannel,
    currentUser,
    accentColor,
    tradeJournal,
    isAdHistoryVisibleToVisitor,
    isWishlistVisibleToVisitor,
    activeWishlistItems,
    userAdHistory,
    isEditModalOpen,
    setIsEditModalOpen,
    isSaving,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
  } = state;

  const {
    handleCloseProfile,
    handleInspectVault,
    handleSaveProfile,
  } = actions;

  const tabs = useMemo(
    () => [
      {
        id: "board" as const,
        label: "Ad History",
        icon: GiMegaphone,
        count: userAdHistory.length,
        showCount: isAdHistoryVisibleToVisitor,
      },
      {
        id: "wishlist" as const,
        label: "Target Wishlist",
        icon: GiSpikedHalo,
        count: activeWishlistItems.length,
        showCount: isWishlistVisibleToVisitor,
      },
      {
        id: "journal" as const,
        label: "Trade Journal",
        icon: GiTrophyCup,
        count: tradeJournal.length,
        showCount: isOwner,
      },
    ],
    [
      userAdHistory.length,
      activeWishlistItems.length,
      tradeJournal.length,
      isAdHistoryVisibleToVisitor,
      isWishlistVisibleToVisitor,
      isOwner,
    ]
  );

  if (isAuthLoading && !targetId) {
    return <ProfileChannelSkeleton compact={globalCompactMode} />;
  }

  if (!targetId) {
    return <GuestPreferencesView />;
  }

  if (isProfileLoading || showProfileSkeleton) {
    return <ProfileChannelSkeleton compact={globalCompactMode} />;
  }

  if (!profileData) {
    return (
      <ProfileNotFoundView
        targetId={targetId}
        onRetry={() => {
          useProfileStore.getState().fetchProfile(targetId, true);
        }}
      />
    );
  }

  return (
    <div className="flex-1 w-full h-full font-sans relative overflow-y-auto custom-scrollbar pb-16 z-10 bg-background">
      {isInspectingOtherUser && (
        <ViewingUserBar
          targetUserId={targetId!}
          targetUsername={safeDisplayName}
          activeTab="profile"
          returnChannel={returnChannel}
          onSwitchTab={(tab) => {
            if (tab === "vault") handleInspectVault();
          }}
          onClose={handleCloseProfile}
        />
      )}

      <ProfileHeader state={state} actions={actions} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          <ProfileSidebar state={state} actions={actions} />

          <div className="flex-1 flex flex-col min-w-0 gap-5">
            <div
              className="flex bg-input rounded-[4px] p-1 border border-border shadow-inner w-full sm:w-auto overflow-x-auto hide-scrollbar shrink-0 mb-2"
              role="tablist"
              aria-label="Profile sections"
            >
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      triggerHaptic("light");
                      setActiveTab(tab.id as ActiveTab);
                    }}
                    className={`px-4 py-2 rounded-[3px] text-[13px] font-medium transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 flex items-center gap-2 cursor-pointer focus-visible:outline-none ${
                      active
                        ? "bg-foreground text-background shadow-sm font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
                    }`}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: active ? "inherit" : accentColor }}
                    />
                    <span>{tab.label}</span>
                    {tab.showCount && (
                      <span
                        className={`px-2 py-0.5 rounded-[3px] text-[11px] font-mono ${
                          active
                            ? "bg-background text-background"
                            : "bg-popover border border-border"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}

              {isOwner && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "settings"}
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveTab("settings");
                  }}
                  className={`px-4 py-2 rounded-[3px] text-[13px] font-medium transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 flex items-center gap-2 cursor-pointer focus-visible:outline-none ${
                    activeTab === "settings"
                      ? "bg-foreground text-background shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
                  }`}
                >
                  <IconSliders className="w-4 h-4" />
                  <span>Preferences & Privacy</span>
                </button>
              )}
            </div>

            {activeTab === "board" && (
              <AdHistoryTab state={state} actions={actions} />
            )}
            {activeTab === "wishlist" && (
              <WishlistTab state={state} actions={actions} />
            )}
            {activeTab === "journal" && <JournalTab state={state} />}
            {activeTab === "settings" && isOwner && (
              <SettingsTab state={state} actions={actions} />
            )}
          </div>
        </div>
      </div>

      {profileData && isOwner && (
        <ProfileCustomizerModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profileData={profileData}
          onSave={handleSaveProfile}
          isSaving={isSaving}
        />
      )}

      {isOwner && (
        <DeleteAccountModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          username={
            profileData?.username ||
            currentUser?.username ||
            "your account"
          }
        />
      )}
    </div>
  );
}