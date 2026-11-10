// ================================================
// FILE: src/app/components/ProfileChannel/tabs/WishlistTab.tsx
// ================================================

import { GiSpikedHalo } from "react-icons/gi";
import { useInventoryStore } from "../../../../store/useInventoryStore";
import { useToastStore } from "../../../../store/useToastStore";
import { triggerHaptic } from "../../../../data/helpers";
import { getUnitConservativeValue } from "../../InventoryChannel/inventoryUtils";
import { UnitAvatar } from "../../shared/UnitAvatar";
import { WishlistGridSkeleton } from "../skeletons/WishlistGridSkeleton";
import { WishlistCard } from "./WishlistCard";
import { IconClose, IconLock } from "../icons";
import {
  ProfileChannelState,
} from "../hooks/useProfileChannelState";
import { ProfileChannelActions } from "../hooks/useProfileChannelActions";

export function WishlistTab({
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
    wishlistSearch,
    setWishlistSearch,
    wishlistSearchResults,
    activeWishlistItems,
    isWishlistVisibleToVisitor,
    showWishlistSkeleton,
    totalWishlistValue,
    ALL_UNITS,
  } = state;

  const { handleToggleProfilePrivacy } = actions;
  const toggleWishlist = useInventoryStore((s) => s.toggleWishlist);

  if (!profileData) return null;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="bg-card border border-border rounded-[8px] p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-[14px] text-foreground">Target Wishlist</h3>
            <span className="text-[12px] font-mono text-muted-foreground">
              {isWishlistVisibleToVisitor
                ? `${activeWishlistItems.length} hunted units · Total Value: ${totalWishlistValue.toLocaleString()}`
                : "Wishlist hidden from visitors"}
            </span>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => handleToggleProfilePrivacy("wishlist_public")}
              className={`px-3 py-1.5 rounded-[6px] border text-[12px] flex items-center gap-2 transition-colors cursor-pointer font-bold shadow-xs ${
                profileData.wishlist_public ?? true
                  ? "bg-[#23a559] text-white border-[#1a7a40] hover:bg-[#1f934f]"
                  : "bg-[#d97706] text-white border-[#b45309] hover:bg-[#b45309]"
              }`}
            >
              <IconLock locked={!(profileData.wishlist_public ?? true)} />
              <span>
                {profileData.wishlist_public ?? true
                  ? "Wishlist: Public"
                  : "Wishlist: Private"}
              </span>
            </button>
          )}
        </div>

        {isOwner && currentUser && (
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <div className="relative">
              <input
                id="profile-wishlist-search"
                name="profile_wishlist_search"
                type="text"
                value={wishlistSearch}
                onChange={(e) => setWishlistSearch(e.target.value)}
                placeholder="Search any unit to add to your Target Wishlist…"
                className="w-full bg-popover border border-border rounded-[6px] px-3.5 py-2 text-[12.5px] text-foreground outline-none focus:border-primary transition-colors"
              />
              {wishlistSearch && (
                <button
                  type="button"
                  onClick={() => setWishlistSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                  aria-label="Clear wishlist search"
                >
                  <IconClose className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {wishlistSearchResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {wishlistSearchResults.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      toggleWishlist(currentUser.id, unit.id);
                      setWishlistSearch("");
                      useToastStore
                        .getState()
                        .addToast(
                          `Added ${unit.name} to your Target Wishlist!`,
                          "success"
                        );
                    }}
                    className="flex items-center justify-between gap-2 p-2 rounded-[6px] bg-popover hover:bg-muted border border-border text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-[4px] bg-muted overflow-hidden shrink-0 relative border border-border">
                        <UnitAvatar
                          unitId={unit.id}
                          unitName={unit.name}
                          imageUrl={unit.imageUrl}
                          fallbackClassName="absolute inset-0 flex items-center justify-center text-white text-[10px]"
                          imageClassName="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] text-foreground truncate">
                          {unit.name}
                        </span>
                        <span className="text-[10.5px] font-mono text-muted-foreground">
                          {unit.value === "owner"
                            ? "O/C"
                            : getUnitConservativeValue(unit).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-[4px] bg-[#5865F2] border border-[#4752c4] shrink-0 shadow-xs">
                      + Add
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!isWishlistVisibleToVisitor ? (
        <div className="bg-card border border-border rounded-[8px] p-12 text-center flex flex-col items-center justify-center gap-2 min-h-[280px]">
          <div className="w-10 h-10 rounded-full bg-popover border border-border flex items-center justify-center text-muted-foreground mb-1">
            <IconLock locked className="w-5 h-5" />
          </div>
          <h3 className="text-[16px] text-foreground">
            Target Wishlist is Private
          </h3>
          <p className="text-[13px] text-muted-foreground max-w-sm">
            {profileData.username} has set their Target Wishlist to private.
          </p>
        </div>
      ) : showWishlistSkeleton && activeWishlistItems.length === 0 ? (
        <WishlistGridSkeleton count={6} />
      ) : activeWishlistItems.length === 0 ? (
        <div className="bg-card border border-border rounded-[8px] p-12 text-center flex flex-col items-center justify-center gap-2 min-h-[280px]">
          <GiSpikedHalo className="w-10 h-10 text-muted-foreground opacity-40" />
          <h3 className="text-[16px] text-foreground">
            Empty Target Wishlist
          </h3>
          <p className="text-[13px] text-muted-foreground max-w-sm">
            {isOwner
              ? "Use the search bar above to add units you are actively hunting for."
              : "This trader hasn't listed any target units yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {activeWishlistItems.map((item) => {
            const master = ALL_UNITS.find((u) => u.id === item.unit_id);
            if (!master) return null;
            return (
              <WishlistCard
                key={item.id}
                master={master}
                isOwner={isOwner}
                currentUserId={currentUser?.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}