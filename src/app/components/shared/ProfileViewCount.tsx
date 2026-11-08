import { GiEyeTarget, GiArchiveRegister, GiThermometerHot } from "react-icons/gi";
import { UserProfileData } from "../../../store/useProfileStore";

function formatRelativeTime(dateString?: string) {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ProfileViewCount({ profile, isOwner }: { profile: UserProfileData; isOwner: boolean }) {
  if (profile.hide_view_count && !isOwner) return null;

  const views = profile.view_count || 0;
  const vaultViews = profile.vault_view_count || 0;
  const lastSeen = formatRelativeTime(profile.last_viewed_at);

  const isRecent = profile.last_viewed_at && (Date.now() - new Date(profile.last_viewed_at).getTime()) < 86400000;
  const isTrending = isRecent && views > 50;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Profile Views */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-muted border border-border text-[11px] font-mono font-bold text-muted-foreground shadow-xs select-none">
        <GiEyeTarget className="w-3.5 h-3.5" />
        <span>{views.toLocaleString()} views</span>
        {lastSeen && (
          <>
            <span className="text-border">|</span>
            <span className="text-muted-foreground/70">Last seen {lastSeen}</span>
          </>
        )}
      </div>

      {/* Vault Views */}
      {vaultViews > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-muted border border-border text-[11px] font-mono font-bold text-muted-foreground shadow-xs select-none">
          <GiArchiveRegister className="w-3.5 h-3.5" />
          <span>{vaultViews.toLocaleString()} vault checks</span>
        </div>
      )}

      {/* Trending Badge */}
      {isTrending && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#d97706] border border-[#b45309] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm select-none">
          <GiThermometerHot className="w-3.5 h-3.5" />
          <span>Trending</span>
        </div>
      )}
    </div>
  );
}