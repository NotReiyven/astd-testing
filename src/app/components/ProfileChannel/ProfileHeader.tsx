// ================================================
// FILE: src/app/components/ProfileChannel/ProfileHeader.tsx
// ================================================

import { GiChatBubble, GiSpikedHalo } from "react-icons/gi";
import {
  getBannerCssStyle,
  getEarlyUserRole,
} from "../../../store/useProfileStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { triggerHaptic } from "../../../data/helpers";
import { useToastStore } from "../../../store/useToastStore";
import { UserAvatar } from "../shared/UserAvatar";
import { DiscordRolePill } from "../shared/DiscordRolePill";
import { ProfileViewCount } from "../shared/ProfileViewCount";
import { PRESENCE_OPTIONS } from "./constants";
import { IconCheck, IconCopy, IconEdit, IconShare } from "./icons";
import { ProfileChannelState } from "./hooks/useProfileChannelState";
import { ProfileChannelActions } from "./hooks/useProfileChannelActions";

export function ProfileHeader({
  state,
  actions,
}: {
  state: ProfileChannelState;
  actions: ProfileChannelActions;
}) {
  const {
    targetId,
    isOwner,
    profileData,
    safeDisplayName,
    joinNumber,
    accentColor,
    repRank,
    safeRep,
    stanceCfg,
    liveStatus,
    statusDotColor,
    ownerStatusPreference,
    globalCompactMode,
    copiedProfileLink,
    setProfileData,
  } = state;

  const { handleCopyProfileLink, handleContact, openEditModal } = actions;

  if (!profileData) return null;

  const updateStatus = useAuthStore.getState().updateStatus;

  return (
    <div className="w-full relative shrink-0 border-b border-border bg-card">
      <div
        className={`w-full relative overflow-hidden border-b border-border transition-[height] duration-200 ease-out ${
          globalCompactMode
            ? "h-[96px] md:h-[116px]"
            : "h-[136px] md:h-[168px]"
        }`}
        style={{
          ...getBannerCssStyle(
            profileData.banner_color,
            accentColor,
            profileData.banner_style || "gradient",
            profileData.banner_image_url
          ),
          contain: "paint",
        }}
      >
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-5 relative z-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-10 md:-mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0 flex-1">
            <div className="relative shrink-0 self-start">
              <UserAvatar
                avatarUrl={profileData.avatar_url}
                username={safeDisplayName}
                discordId={profileData.discord_id}
                className="w-[84px] h-[84px] md:w-[96px] md:h-[96px] rounded-[10px] border-4 border-card bg-muted shadow-xl"
                alt={safeDisplayName}
                priority={true}
              />
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-card z-10"
                style={{ backgroundColor: statusDotColor }}
                title={`Status: ${liveStatus.toUpperCase()}`}
              />
            </div>

            <div className="flex flex-col gap-2 min-w-0 flex-1 pb-0.5">
              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                <h1 className="text-[22px] sm:text-[26px] text-foreground leading-tight truncate">
                  {safeDisplayName}
                </h1>

                {typeof joinNumber === "number" && (
                  <span
                    className="inline-flex items-center text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-[#475569] text-white border border-[#334155] shrink-0 select-none shadow-xs"
                    title={`User #${joinNumber}`}
                  >
                    User #{joinNumber}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {(() => {
                  const earlyRole = getEarlyUserRole(
                    joinNumber ?? profileData.join_number
                  );
                  if (!earlyRole) return null;
                  return (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[11px] font-bold border shrink-0 select-none shadow-xs"
                      style={{
                        backgroundColor: earlyRole.bg,
                        color: earlyRole.color,
                        borderColor: earlyRole.border,
                      }}
                      title={earlyRole.tooltip}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: earlyRole.dotColor }}
                      />
                      {earlyRole.label}
                    </span>
                  );
                })()}

                {targetId && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      navigator.clipboard.writeText(targetId);
                      useToastStore
                        .getState()
                        .addToast(`User ID copied: ${targetId}`, "info");
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-[#475569] hover:bg-[#334155] text-white border border-[#334155] shrink-0 cursor-pointer transition-colors shadow-xs active:scale-95"
                    title={`Click to copy User ID: ${targetId}`}
                  >
                    <span>ID: {targetId.slice(0, 8)}…</span>
                    <IconCopy className="w-3 h-3 text-white" />
                  </button>
                )}

                {profileData.role_details &&
                profileData.role_details.length > 0 ? (
                  profileData.role_details.map((r) => (
                    <DiscordRolePill
                      key={r.name}
                      name={r.name}
                      label={r.label}
                      color={r.color}
                      size="sm"
                    />
                  ))
                ) : profileData.role && profileData.role !== "user" ? (
                  <DiscordRolePill name={profileData.role} size="sm" />
                ) : null}

                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] border text-[11.5px] font-semibold shadow-xs"
                  style={{
                    backgroundColor: repRank.bg,
                    color: repRank.color,
                    borderColor: repRank.border,
                  }}
                >
                  <GiSpikedHalo className="w-3.5 h-3.5" />
                  {repRank.label} ({safeRep > 0 ? `+${safeRep}` : safeRep})
                </span>

                <ProfileViewCount profile={profileData} isOwner={isOwner} />

                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] border text-[11.5px] font-semibold shadow-xs"
                  style={{
                    backgroundColor: stanceCfg.bg,
                    color: stanceCfg.color,
                    borderColor: stanceCfg.border,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: stanceCfg.color }}
                  />
                  {stanceCfg.label}
                </span>
              </div>

              {isOwner && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[11.5px] text-muted-foreground mr-1">
                    Presence:
                  </span>
                  {PRESENCE_OPTIONS.map((p) => {
                    const active = ownerStatusPreference === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          updateStatus(p.id);
                          setProfileData((prev) =>
                            prev ? { ...prev, status: p.id } : null
                          );
                        }}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] border transition-colors cursor-pointer ${
                          active
                            ? "bg-popover border-foreground text-foreground"
                            : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-popover"
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyProfileLink}
              className="px-3.5 py-2 rounded-[6px] bg-popover hover:bg-muted border border-border text-foreground text-[12px] flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none"
            >
              {copiedProfileLink ? (
                <>
                  <IconCheck className="w-3.5 h-3.5 text-[#23a559]" />
                  <span className="text-[#23a559]">Link Copied</span>
                </>
              ) : (
                <>
                  <IconShare className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Share Profile</span>
                </>
              )}
            </button>

            {isOwner ? (
              <button
                type="button"
                onClick={openEditModal}
                className="px-4 py-2 rounded-[6px] text-white text-[12px] flex items-center gap-2 transition-opacity hover:opacity-95 shadow-sm cursor-pointer focus-visible:outline-none"
                style={{ backgroundColor: accentColor }}
              >
                <IconEdit className="w-3.5 h-3.5" />
                <span>Customize Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleContact}
                className="px-4 py-2 rounded-[6px] bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] flex items-center gap-2 transition-colors shadow-sm cursor-pointer focus-visible:outline-none"
              >
                <GiChatBubble className="w-4 h-4" />
                <span>Message on Discord</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}