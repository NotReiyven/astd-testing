// ================================================
// FILE: src/app/components/ProfileChannel/tabs/AdHistoryTab.tsx
// ================================================

import {
  GiMegaphone,
  GiPadlock,
  GiWorld,
} from "react-icons/gi";
import { triggerHaptic } from "../../../../data/helpers";
import { AdHistorySkeletonList } from "../skeletons/AdHistorySkeletonList";
import { AdHistoryCard } from "./AdHistoryCard";
import { IconLock } from "../icons";
import { AdFilter } from "../constants";
import {
  ProfileChannelState,
} from "../hooks/useProfileChannelState";
import { ProfileChannelActions } from "../hooks/useProfileChannelActions";

export function AdHistoryTab({
  state,
  actions,
}: {
  state: ProfileChannelState;
  actions: ProfileChannelActions;
}) {
  const {
    profileData,
    isOwner,
    currentUser,
    userAdHistory,
    filteredAdHistory,
    adFilter,
    setAdFilter,
    liveAdsCount,
    expiredAdsCount,
    privateAdsCount,
    privateAdSet,
    confirmDeleteAdId,
    setConfirmDeleteAdId,
    deletingAdId,
    repostingAdId,
    isAdHistoryVisibleToVisitor,
    showHistorySkeleton,
    ALL_UNITS,
  } = state;

  const {
    handleToggleProfilePrivacy,
    handleToggleSingleAdPrivacy,
    handleDeleteAdFromHistory,
    handleRepostAd,
    handleLoadAdIntoCalculator,
  } = actions;

  if (!profileData) return null;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="bg-card border border-border rounded-[8px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: "all", label: "All Posts", count: userAdHistory.length },
              { id: "live", label: "Live", count: liveAdsCount },
              { id: "expired", label: "Expired", count: expiredAdsCount },
              ...(isOwner
                ? [
                    {
                      id: "private",
                      label: "Private",
                      count: privateAdsCount,
                    },
                  ]
                : []),
            ] as const
          ).map((f) => {
            const active = adFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setAdFilter(f.id as AdFilter);
                }}
                className={`px-3 py-1.5 rounded-[5px] text-[12px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-popover text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                <span>{f.label}</span>
                <span className="font-mono text-[11px]">
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={() =>
              handleToggleProfilePrivacy("ad_history_public")
            }
            className={`px-3 py-1.5 rounded-[4px] border text-[12px] font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95 ${
              profileData.ad_history_public ?? true
                ? "bg-[#23a559] hover:bg-[#1f934f] text-white border-[#1a7a40]"
                : "bg-[#d97706] hover:bg-[#b45309] text-white border-[#b45309]"
            }`}
            title="Control whether visitors can view your Ad History"
          >
            {profileData.ad_history_public ?? true ? (
              <GiWorld className="w-3.5 h-3.5 text-white shrink-0" />
            ) : (
              <GiPadlock className="w-3.5 h-3.5 text-white shrink-0" />
            )}
            <span>
              {profileData.ad_history_public ?? true
                ? "History: Public"
                : "History: Private (Only You)"}
            </span>
          </button>
        )}
      </div>

      {!isAdHistoryVisibleToVisitor ? (
        <div className="bg-card border border-border rounded-[8px] p-12 text-center flex flex-col items-center justify-center gap-2 min-h-[280px]">
          <div className="w-10 h-10 rounded-full bg-popover border border-border flex items-center justify-center text-muted-foreground mb-1">
            <IconLock locked className="w-5 h-5" />
          </div>
          <h3 className="text-[16px] text-foreground">
            Ad History is Private
          </h3>
          <p className="text-[13px] text-muted-foreground max-w-sm">
            {profileData.username} has chosen to keep their trading ad
            history private.
          </p>
        </div>
      ) : showHistorySkeleton ? (
        <AdHistorySkeletonList count={2} />
      ) : filteredAdHistory.length === 0 ? (
        <div className="bg-card border border-border rounded-[8px] p-12 text-center flex flex-col items-center justify-center gap-2 min-h-[280px]">
          <GiMegaphone className="w-10 h-10 text-muted-foreground opacity-40" />
          <h3 className="text-[16px] text-foreground">No Trade Ads Found</h3>
          <p className="text-[13px] text-muted-foreground max-w-sm">
            {adFilter === "all"
              ? "No trade listings have been posted yet."
              : `No ${adFilter} trade ads in history.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredAdHistory.map((ad) => (
            <AdHistoryCard
              key={ad.id}
              ad={ad}
              ALL_UNITS={ALL_UNITS}
              isOwner={isOwner}
              isPrivateAd={privateAdSet.has(ad.id)}
              confirmDeleteAdId={confirmDeleteAdId}
              deletingAdId={deletingAdId}
              repostingAdId={repostingAdId}
              setConfirmDeleteAdId={setConfirmDeleteAdId}
              currentUserId={currentUser?.id}
              onTogglePrivacy={handleToggleSingleAdPrivacy}
              onDelete={handleDeleteAdFromHistory}
              onRepost={handleRepostAd}
              onLoadIntoCalculator={handleLoadAdIntoCalculator}
            />
          ))}
        </div>
      )}
    </div>
  );
}