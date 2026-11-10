// ================================================
// FILE: src/app/components/ProfileChannel/tabs/settings/PrivacySection.tsx
// ================================================

import { ToggleSwitch } from "../../ToggleSwitch";
import {
  ProfileChannelState,
} from "../../hooks/useProfileChannelState";
import { ProfileChannelActions } from "../../hooks/useProfileChannelActions";

export function PrivacySection({
  state,
  actions,
}: {
  state: ProfileChannelState;
  actions: ProfileChannelActions;
}) {
  const { profileData } = state;
  const { handleToggleProfilePrivacy } = actions;

  if (!profileData) return null;

  return (
    <div className="bg-card border border-border rounded-[8px] p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-0.5 border-b border-border pb-3">
        <h3 className="text-[14px] text-foreground">
          Privacy & Data Security
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Control what other traders can see when visiting your profile or
          mini-popout.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border">
        <div className="py-3 first:pt-0 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] text-foreground">
              Public Ad History
            </span>
            <span className="text-[12px] text-muted-foreground">
              Allow visitors to view your posted trade history on your
              profile. Individual ads marked Private remain hidden.
            </span>
          </div>
          <ToggleSwitch
            checked={profileData.ad_history_public ?? true}
            onChange={() =>
              handleToggleProfilePrivacy("ad_history_public")
            }
            activeClassName="bg-[#23a559]"
          />
        </div>

        <div className="py-3 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] text-foreground">
              Public Target Wishlist
            </span>
            <span className="text-[12px] text-muted-foreground">
              Show the units you are actively hunting for on your public
              profile.
            </span>
          </div>
          <ToggleSwitch
            checked={profileData.wishlist_public ?? true}
            onChange={() => handleToggleProfilePrivacy("wishlist_public")}
            activeClassName="bg-[#23a559]"
          />
        </div>

        <div className="py-3 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] text-foreground">
              Mask Raw Discord ID on Profile
            </span>
            <span className="text-[12px] text-muted-foreground">
              Hide your numeric Discord ID badge from your profile card and
              mini-popout.
            </span>
          </div>
          <ToggleSwitch
            checked={Boolean(profileData.hide_discord_id)}
            onChange={() => handleToggleProfilePrivacy("hide_discord_id")}
          />
        </div>

        <div className="py-3 last:pb-0 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] text-foreground">
              Hide Profile View Counter
            </span>
            <span className="text-[12px] text-muted-foreground">
              Only you will be able to see your view count and vault stats.
            </span>
          </div>
          <ToggleSwitch
            checked={Boolean(profileData.hide_view_count)}
            onChange={() => handleToggleProfilePrivacy("hide_view_count")}
          />
        </div>
      </div>
    </div>
  );
}