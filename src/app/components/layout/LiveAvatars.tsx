import { useState } from "react";
import {
  usePresence,
  GuestPresenceAvatar,
  normalizeStatusPreference,
  STATUS_COLORS,
} from "../../../hooks/usePresence";
import { useProfileStore, UserProfileData } from "../../../store/useProfileStore";
import { getUnitAssetUrl } from "../../../data/helpers";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";

function resolveAvatarSrc(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  if (
    avatarUrl.startsWith("http://") ||
    avatarUrl.startsWith("https://") ||
    avatarUrl.startsWith("/")
  ) {
    return avatarUrl;
  }
  return getUnitAssetUrl(avatarUrl);
}

export function LiveAvatars() {
  const { users, guestUsers, guestCount, totalCount } = usePresence();
  const openPopout = useProfileStore((s) => s.openPopout);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  if (totalCount === 0) return null;

  // Google-Docs-style bubble stack:
  // 1. Prioritize signed-in users first
  // 2. Fill remaining visible slots (up to MAX_VISIBLE) with anonymous/guest avatar bubbles
  // 3. Collapse any remaining users beyond MAX_VISIBLE into the +N pill
  const MAX_VISIBLE = 5;
  const visibleLoggedIn = users.slice(0, MAX_VISIBLE);
  const remainingSlots = Math.max(0, MAX_VISIBLE - visibleLoggedIn.length);
  const visibleGuests = guestUsers.slice(0, remainingSlots);
  const shownBubblesCount = visibleLoggedIn.length + visibleGuests.length;
  const extraCount = Math.max(0, totalCount - shownBubblesCount);

  return (
    <div className="flex items-center">
      <div
        className="flex md:hidden items-center gap-1.5 bg-popover border border-border px-2 py-1 rounded-full shadow-inner mr-2"
        title={`${totalCount} online (${users.length} signed in, ${guestCount} anonymous)`}
      >
        <span
          className="w-2 h-2 rounded-full bg-[#23a559] animate-pulse"
          aria-hidden="true"
        />
        <span className="text-[10px] font-bold text-foreground tabular-nums">
          {totalCount}
        </span>
      </div>

      <div className="hidden md:flex items-center mr-3 relative">
        {/* 1. Prioritized signed-in users (clickable -> MiniProfilePopout) */}
        {visibleLoggedIn.map((user: UserProfileData, i: number) => {
          const fallbackStyle = getAvatarStyle(user.username || "Trader");
          const resolvedSrc = resolveAvatarSrc(user.avatar_url);
          const showImg = Boolean(resolvedSrc) && !failedAvatars[user.id];
          const statusPref = normalizeStatusPreference(user.status);
          const statusDotColor =
            statusPref === "dnd" ? STATUS_COLORS.dnd : STATUS_COLORS.online;

          return (
            <button
              key={user.id}
              type="button"
              aria-label={`View ${user.username}'s profile`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                openPopout(user.id, rect.left, rect.bottom);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center border-[2px] border-background text-white shadow-sm relative group cursor-pointer transition-transform hover:-translate-y-1 hover:z-50 focus-visible:z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary overflow-visible"
              style={{
                backgroundColor: user.accent_color || fallbackStyle.background,
                marginLeft: i > 0 ? "-10px" : "0",
                zIndex: 40 - i,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center text-[10px] font-bold z-0 select-none"
              >
                {getInitials(user.username || "TR")}
              </span>

              {showImg && resolvedSrc && (
                <img
                  src={resolvedSrc}
                  alt=""
                  aria-hidden="true"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover rounded-full absolute inset-0 z-10"
                  onError={() =>
                    setFailedAvatars((prev) =>
                      prev[user.id] ? prev : { ...prev, [user.id]: true }
                    )
                  }
                />
              )}

              {/* Online / DND status dot */}
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full border-[1.5px] border-background absolute -bottom-0.5 -right-0.5 z-20"
                style={{ backgroundColor: statusDotColor }}
              />

              {/* Hover tooltip */}
              <div
                aria-hidden="true"
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-popover text-foreground text-[10px] font-bold px-2 py-1 rounded-[4px] border border-border opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-events-none whitespace-nowrap shadow-lg transition-opacity z-50"
              >
                {user.username}
                {statusPref === "dnd" ? " (DND)" : ""}
              </div>
            </button>
          );
        })}

        {/* 2. Anonymous / guest visitors (Google-Docs-style anonymous unit bubbles) */}
        {visibleGuests.map((guest: GuestPresenceAvatar, idx: number) => {
          const stackIndex = visibleLoggedIn.length + idx;
          const showImg = Boolean(guest.avatar_url) && !failedAvatars[guest.id];

          return (
            <div
              key={guest.id}
              role="img"
              aria-label={`${guest.username} (Guest)`}
              className="w-8 h-8 rounded-full flex items-center justify-center border-[2px] border-background text-white shadow-sm relative group select-none transition-transform hover:-translate-y-1 hover:z-50 overflow-visible"
              style={{
                backgroundColor: guest.accent_color,
                marginLeft: stackIndex > 0 ? "-10px" : "0",
                zIndex: 40 - stackIndex,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center text-[10px] font-bold z-0 select-none"
              >
                {getInitials(guest.username)}
              </span>

              {showImg && (
                <img
                  src={guest.avatar_url}
                  alt=""
                  aria-hidden="true"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover rounded-full absolute inset-0 z-10"
                  onError={() =>
                    setFailedAvatars((prev) =>
                      prev[guest.id] ? prev : { ...prev, [guest.id]: true }
                    )
                  }
                />
              )}

              {/* Hover tooltip */}
              <div
                aria-hidden="true"
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-popover text-foreground text-[10px] font-bold px-2 py-1 rounded-[4px] border border-border opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-lg transition-opacity z-50"
              >
                {guest.username} • Guest
              </div>
            </div>
          );
        })}

        {/* 3. Overflow +N bubble when total online exceeds MAX_VISIBLE */}
        {extraCount > 0 && (
          <div
            className="h-8 min-w-[32px] px-2 rounded-full flex items-center justify-center border-[2px] border-background bg-popover text-foreground text-[10px] font-bold shadow-sm z-0 tabular-nums select-none"
            style={{ marginLeft: shownBubblesCount > 0 ? "-10px" : "0" }}
            title={`${totalCount} online (${users.length} signed in, ${guestCount} anonymous)`}
          >
            +{extraCount}
          </div>
        )}
      </div>
    </div>
  );
}
