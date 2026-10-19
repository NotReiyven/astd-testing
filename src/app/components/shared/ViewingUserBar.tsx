import { GiCharacter, GiChest } from "react-icons/gi";

export interface ViewingUserBarProps {
  targetUserId: string;
  targetUsername: string;
  activeTab: "profile" | "vault";
  returnChannel?: string | null;
  onSwitchTab: (tab: "profile" | "vault") => void;
  onClose: () => void;
}

export function formatViewingReturnChannel(channel?: string | null): string {
  if (!channel) return "Trading Ads";
  if (channel === "trading-ads") return "Trading Ads";
  if (channel === "value-list") return "Value List";
  if (channel === "admin-panel") return "Admin Panel";
  if (channel === "home") return "Home";
  if (channel === "notifications") return "Notifications";
  if (channel === "inventory") return "My Vault";
  return channel
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function ViewingUserBar({
  targetUserId: _targetUserId,
  targetUsername,
  activeTab,
  returnChannel,
  onSwitchTab,
  onClose,
}: ViewingUserBarProps) {
  const returnLabel = formatViewingReturnChannel(returnChannel);

  return (
    <div className="w-full bg-popover/95 backdrop-blur-md border-b border-border px-3 sm:px-4 py-2 flex items-center justify-between sticky top-0 z-50 shrink-0 shadow-sm transition-colors min-h-[49px] overflow-x-clip">
      {/* Left: Back to Origin Channel Button */}
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border rounded-[6px] text-[12px] font-semibold transition-[background-color,border-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer active:scale-95 shrink-0"
        title={`Back to ${returnLabel}`}
        aria-label={`Back to ${returnLabel}`}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="w-3.5 h-3.5 text-muted-foreground shrink-0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.5 8H3.5M7 4.5L3.5 8L7 11.5" />
        </svg>
        <span className="hidden sm:inline">Back to {returnLabel}</span>
        <span className="sm:hidden">Back</span>
      </button>

      {/* Middle: Trader Identity Context */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 mx-1 sm:mx-2 overflow-hidden">
        <span className="bg-[#5865F2] text-white border border-[#5865F2]/40 text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] shrink-0 font-mono shadow-xs">
          Viewing
        </span>
        <span
          className="text-[12px] sm:text-[13px] font-bold text-foreground truncate max-w-[85px] xs:max-w-[140px] sm:max-w-[280px] md:max-w-[400px]"
          title={targetUsername}
        >
          {targetUsername}
        </span>
      </div>

      {/* Right: Continuous Clicking Tab Switcher */}
      <div
        className="flex bg-muted/90 p-0.5 rounded-[6px] border border-border shrink-0 shadow-inner"
        role="tablist"
        aria-label="Trader inspection sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "profile"}
          onClick={() => onSwitchTab("profile")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-semibold transition-[background-color,color,box-shadow,transform] active:scale-95 focus-visible:outline-none cursor-pointer ${
            activeTab === "profile"
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
          title={`View ${targetUsername}’s Profile`}
        >
          <GiCharacter className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline">Profile</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "vault"}
          onClick={() => onSwitchTab("vault")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-semibold transition-[background-color,color,box-shadow,transform] active:scale-95 focus-visible:outline-none cursor-pointer ${
            activeTab === "vault"
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
          title={`View ${targetUsername}’s Vault`}
        >
          <GiChest className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline">Vault</span>
        </button>
      </div>
    </div>
  );
}
