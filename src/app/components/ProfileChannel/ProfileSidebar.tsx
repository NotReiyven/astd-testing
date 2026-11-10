// ================================================
// FILE: src/app/components/ProfileChannel/ProfileSidebar.tsx
// ================================================

import {
  GiChest,
  GiGamepad,
} from "react-icons/gi";
import { DiscordRolePill } from "../shared/DiscordRolePill";
import {
  IconArrowRight,
  IconCheck,
  IconCopy,
  IconLock,
} from "./icons";
import {
  ProfileChannelState,
} from "./hooks/useProfileChannelState";
import { ProfileChannelActions } from "./hooks/useProfileChannelActions";

export function ProfileSidebar({
  state,
  actions,
}: {
  state: ProfileChannelState;
  actions: ProfileChannelActions;
}) {
  const {
    isOwner,
    profileData,
    joinNumber,
    accentColor,
    safeRep,
    repRank,
    repProgressPct,
    activeVaultItems,
    activeWishlistItems,
    totalVaultValue,
    totalWishlistValue,
    liveAdsCount,
    userAdHistory,
    isAdHistoryVisibleToVisitor,
    isWishlistVisibleToVisitor,
    copiedDiscordId,
    copiedRoblox,
  } = state;

  const {
    handleInspectVault,
    handleCopyDiscordId,
    handleCopyRoblox,
  } = actions;

  if (!profileData) return null;

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
      <div
        className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4 shadow-sm"
        style={{ borderTop: `2px solid ${accentColor}` }}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-popover border border-border rounded-[6px] p-3 flex flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">
              Vault Net Worth
            </span>
            <span className="text-[16px] font-mono text-foreground truncate">
              {totalVaultValue.toLocaleString()}
            </span>
            <span className="text-[10.5px] text-muted-foreground font-mono">
              {activeVaultItems.reduce((a, b) => a + b.quantity, 0)} units
            </span>
          </div>

          <div className="bg-popover border border-border rounded-[6px] p-3 flex flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">
              Ad History
            </span>
            <span className="text-[16px] font-mono text-foreground">
              {isAdHistoryVisibleToVisitor ? userAdHistory.length : "Private"}
            </span>
            <span className="text-[10.5px] text-[#23a559] font-mono">
              {isAdHistoryVisibleToVisitor
                ? `${liveAdsCount} live now`
                : "Hidden"}
            </span>
          </div>

          <div className="bg-popover border border-border rounded-[6px] p-3 flex flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">
              Target Wishlist
            </span>
            <span className="text-[16px] font-mono text-foreground truncate">
              {isWishlistVisibleToVisitor
                ? activeWishlistItems.length
                : "Private"}
            </span>
            <span className="text-[10.5px] text-muted-foreground font-mono truncate">
              {isWishlistVisibleToVisitor
                ? `${totalWishlistValue.toLocaleString()} val`
                : "Hidden"}
            </span>
          </div>

          <div className="bg-popover border border-border rounded-[6px] p-3 flex flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">
              Member Since
            </span>
            <span className="text-[15px] font-mono text-foreground">
              {new Date(profileData.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
              })}
            </span>
            {typeof joinNumber === "number" ? (
              <span className="text-[11px] font-mono text-muted-foreground">
                User #{joinNumber}
              </span>
            ) : (
              <span className="text-[10.5px] text-muted-foreground">
                Verified Trader
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-muted-foreground">Reputation Rank</span>
            <span className="font-mono" style={{ color: repRank.color }}>
              {repRank.label} ({safeRep} / {repRank.next})
            </span>
          </div>
          <div className="w-full h-2 bg-popover rounded-full overflow-hidden border border-border">
            <div
              className="h-full transition-[width] duration-300 rounded-full"
              style={{
                width: `${repProgressPct}%`,
                backgroundColor: repRank.color,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
          <span className="text-[12px] text-muted-foreground">About Me</span>
          {profileData.bio ? (
            <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap break-words">
              {profileData.bio}
            </p>
          ) : (
            <p className="text-[12.5px] text-muted-foreground italic">
              No bio added yet.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <span className="text-[12px] text-muted-foreground">
            Trader Identifiers
          </span>

          {!profileData.hide_discord_id || isOwner ? (
            <div className="flex items-center justify-between gap-2 bg-popover px-3 py-2 rounded-[6px] border border-border min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <span className="text-[11.5px] text-muted-foreground">
                  Discord ID
                </span>
                {profileData.hide_discord_id && isOwner && (
                  <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-[4px] bg-[#d97706] border border-[#b45309] text-white leading-none shadow-xs font-mono">
                    Hidden
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCopyDiscordId}
                className="flex items-center gap-1.5 text-[11.5px] font-mono text-foreground hover:text-primary transition-colors cursor-pointer min-w-0 overflow-hidden"
                title={`Copy Discord ID (${profileData.discord_id})`}
              >
                <span className="truncate">{profileData.discord_id}</span>
                {copiedDiscordId ? (
                  <IconCheck className="w-3.5 h-3.5 text-[#23a559] shrink-0" />
                ) : (
                  <IconCopy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 bg-popover px-3 py-2 rounded-[6px] border border-border text-[11.5px] text-muted-foreground whitespace-nowrap">
              <span>Discord ID</span>
              <span className="flex items-center gap-1">
                <IconLock locked className="w-3 h-3" /> Private
              </span>
            </div>
          )}

          {profileData.roblox_username && (
            <div className="flex items-center justify-between gap-2 bg-popover px-3 py-2 rounded-[6px] border border-border min-w-0 overflow-hidden">
              <span className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <GiGamepad className="w-3.5 h-3.5 text-primary shrink-0" />
                Roblox
              </span>
              <button
                type="button"
                onClick={handleCopyRoblox}
                className="flex items-center gap-1.5 text-[12px] font-mono text-foreground hover:text-primary transition-colors cursor-pointer min-w-0 overflow-hidden"
                title={`Copy Roblox Username (${profileData.roblox_username})`}
              >
                <span className="truncate">{profileData.roblox_username}</span>
                {copiedRoblox ? (
                  <IconCheck className="w-3.5 h-3.5 text-[#23a559] shrink-0" />
                ) : (
                  <IconCopy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </button>
            </div>
          )}
        </div>

        {((profileData.role_details && profileData.role_details.length > 0) ||
          (profileData.role && profileData.role !== "user")) && (
          <div className="bg-card border border-border rounded-[6px] p-4 flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Roles ({profileData.role_details?.length || 1})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {profileData.role_details && profileData.role_details.length > 0 ? (
                profileData.role_details.map((r) => (
                  <DiscordRolePill
                    key={r.name}
                    name={r.name}
                    label={r.label}
                    color={r.color}
                    size="md"
                  />
                ))
              ) : (
                <DiscordRolePill name={profileData.role} size="md" />
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleInspectVault}
          className="w-full py-2.5 px-4 bg-popover hover:bg-muted text-foreground rounded-[6px] text-[12.5px] flex items-center justify-between border border-border transition-colors cursor-pointer group focus-visible:outline-none"
        >
          <span className="flex items-center gap-2">
            <GiChest className="w-4 h-4" style={{ color: accentColor }} />
            <span>
              {isOwner ? "Open My Inventory Vault" : "Inspect Public Vault"}
            </span>
          </span>
          <IconArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-[color,transform] duration-150" />
        </button>
      </div>
    </aside>
  );
}