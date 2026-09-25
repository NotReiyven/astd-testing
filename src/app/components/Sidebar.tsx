import { useState, useMemo } from "react";
import {
  Hash,
  ChevronDown,
  Plus,
  Lock,
  Megaphone,
  LucideIcon,
  Shield,
  FileText,
  Package,
  ShieldAlert,
  User,
} from "lucide-react";
import { FilterKey } from "../../types";
import { useUnits } from "../../context/UnitContext";
import { getTier } from "../../data";
import { useAuthStore } from "../../store/useAuthStore";
import { useProfileStore } from "../../store/useProfileStore";
import { triggerHaptic } from "../../data/helpers";

type ChannelConfig = {
  id: string;
  label: string;
  isLocked: boolean;
  hasThreads?: boolean;
  icon?: LucideIcon;
};
type CategoryConfig = { id: string; label: string; channels: ChannelConfig[] };

const BASE_CATEGORIES: CategoryConfig[] = [
  {
    id: "important",
    label: "important",
    channels: [
      { id: "home", label: "home", isLocked: true },
      { id: "tutorial", label: "tutorial", isLocked: true },
      {
        id: "extra-notices",
        label: "extra-notices",
        isLocked: true,
        icon: Megaphone,
      },
    ],
  },
  {
    id: "trading",
    label: "trading",
    channels: [
      { id: "profile", label: "my-profile", isLocked: true, icon: User },
      { id: "inventory", label: "my-inventory", isLocked: true, icon: Package },
      {
        id: "trading-ads",
        label: "trading-ads",
        isLocked: false,
        icon: Megaphone,
      },
      {
        id: "value-list",
        label: "value-list",
        isLocked: false,
        hasThreads: true,
      },
    ],
  },
  {
    id: "legal",
    label: "legal",
    channels: [
      {
        id: "terms-of-service",
        label: "terms-of-service",
        isLocked: true,
        icon: FileText,
      },
      {
        id: "privacy-policy",
        label: "privacy-policy",
        isLocked: true,
        icon: Shield,
      },
    ],
  },
];

export function Sidebar({
  activeChannel,
  setActiveChannel,
  onThreadClick,
  guideState,
}: {
  activeChannel: string;
  setActiveChannel: (c: string) => void;
  onThreadClick: (tier: FilterKey, sectionId: string) => void;
  guideState?: { type: string | null; step: number };
}) {
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const { units } = useUnits();
  const { profile } = useAuthStore();
  const setViewingProfile = useProfileStore((s) => s.setViewingProfile);

  const role = profile?.role;
  const canModerate = role === "master" || role === "admin" || role === "mod";

  const CATEGORIES = useMemo(() => {
    const cats = [...BASE_CATEGORIES];
    if (canModerate) {
      cats.push({
        id: "administration",
        label: "administration",
        channels: [
          {
            id: "admin-panel",
            label: "admin-panel",
            isLocked: true,
            icon: ShieldAlert,
          },
        ],
      });
    }
    return cats;
  }, [canModerate]);

  const dynamicTierGroups = useMemo(() => {
    const order = ["S", "A", "B", "C", "Pure", "Oddities", "Untiered"];
    const colorMap: Record<string, string> = {
      S: "#dd7e6b",
      A: "#a855f7",
      B: "#3b82f6",
      C: "#22c55e",
      Pure: "#9ca3af",
      Oddities: "#8b5cf6",
      Untiered: "#52525b",
    };

    const subCatPriority: Record<string, number> = {
      top: 1,
      high: 2,
      mid: 3,
      low: 4,
    };

    return order
      .map((tier) => {
        const tierUnits = units.filter((u) => getTier(u) === tier);
        let subCats = Array.from(
          new Set(tierUnits.map((u) => u.subCategory || "Uncategorized"))
        );

        if (["S", "A", "B", "C"].includes(tier)) {
          subCats.sort((a, b) => {
            const getRank = (name: string) => {
              const lower = name.toLowerCase();
              for (const key of Object.keys(subCatPriority)) {
                if (lower.includes(key)) return subCatPriority[key];
              }
              return 99;
            };
            return getRank(a) - getRank(b);
          });
        }

        return {
          tier,
          color: colorMap[tier] || "#52525b",
          children: subCats.map((sub) => ({
            id: sub,
            label: sub,
          })),
        };
      })
      .filter((g) => g.children.length > 0);
  }, [units]);

  const toggleCategory = (id: string) => {
    triggerHaptic("light");
    setCollapsedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleChannelClick = (channelId: string) => {
    triggerHaptic("light");
    if (channelId === "profile") {
      setViewingProfile(null);
    }
    setActiveChannel(channelId);
  };

  return (
    <div className="flex flex-col h-screen select-none border-r border-border md:border-r-0 bg-card w-full">
      {/* Locked explicit height h-[57px] to perfectly align with top navigation bar */}
      <div className="h-[57px] flex-shrink-0 px-4 flex items-center justify-between border-b border-border bg-card">
        <span className="font-black text-foreground text-[14px] truncate">
          ASTD Value List
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pt-3">
        <div className="flex flex-col px-2 pb-6">
          {CATEGORIES.map((cat) => {
            const isCollapsed = collapsedCategories[cat.id];

            return (
              <div key={cat.id} className="mt-4 flex flex-col">
                <div
                  className="flex items-center justify-between px-1 py-1 mb-1 group cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => toggleCategory(cat.id)}
                >
                  <div className="flex items-center gap-1">
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {cat.label}
                    </span>
                  </div>
                  <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                </div>

                <div
                  className={`overflow-hidden ${
                    isCollapsed ? "hidden" : "block"
                  }`}
                >
                  <div className="flex flex-col">
                    {cat.channels.map((channel) => {
                      const isActive = activeChannel === channel.id;
                      const isTarget =
                        guideState?.type === "main" &&
                        guideState.step === 1 &&
                        channel.id === "value-list";
                      const Icon = channel.icon || Hash;

                      return (
                        <div
                          key={channel.id}
                          className="flex flex-col relative"
                        >
                          <button
                            onClick={() => handleChannelClick(channel.id)}
                            className={`group w-full flex items-center justify-between px-2.5 py-1.5 mb-[2px] rounded-[4px] focus-visible:outline-none cursor-pointer ${
                              isTarget
                                ? "bg-primary text-primary-foreground border border-primary z-50 relative animate-pulse"
                                : isActive
                                ? "bg-muted text-foreground font-bold border border-border"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {channel.isLocked ? (
                                <div className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
                                  <Icon className="w-4 h-4" />
                                  <Lock
                                    className={`w-2.5 h-2.5 absolute -bottom-1 -right-1 rounded-full p-[1px] ${
                                      isTarget ? "bg-primary" : "bg-card"
                                    }`}
                                  />
                                </div>
                              ) : (
                                <Icon className="w-4 h-4 flex-shrink-0" />
                              )}
                              <span className="text-[13px] leading-none pb-[1px] truncate">
                                {channel.label}
                              </span>
                            </div>
                          </button>

                          {channel.hasThreads && isActive && (
                            <div className="relative flex flex-col ml-[22px] mt-1 mb-3">
                              <div className="absolute left-[-12px] top-0 bottom-[14px] w-[1px] bg-border" />
                              {dynamicTierGroups.map((group) => (
                                <div
                                  key={group.tier}
                                  className="relative flex flex-col mb-2"
                                >
                                  <div className="relative flex items-center min-h-[26px]">
                                    <div className="absolute left-[-12px] top-[-8px] w-[10px] h-[20px] border-l border-b border-border rounded-bl-[4px]" />
                                    <span
                                      className="text-[10px] font-bold uppercase tracking-widest pl-2"
                                      style={{ color: group.color }}
                                    >
                                      {group.tier}{" "}
                                      {[
                                        "Pure",
                                        "Oddities",
                                        "Untiered",
                                      ].includes(group.tier)
                                        ? ""
                                        : "Tier"}
                                    </span>
                                  </div>
                                  <div className="relative flex flex-col ml-[6px] mt-0.5">
                                    <div className="absolute left-[-8px] top-[-4px] bottom-[10px] w-[1px] bg-border" />
                                    {group.children.map((child, cIdx) => {
                                      const isLastChild =
                                        cIdx === group.children.length - 1;
                                      return (
                                        <button
                                          key={`${group.tier}-${child.id}`}
                                          onClick={() => {
                                            triggerHaptic("light");
                                            onThreadClick(
                                              group.tier as FilterKey,
                                              child.id
                                            );
                                          }}
                                          className="relative flex items-center min-h-[26px] rounded-[4px] px-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground text-left focus-visible:outline-none cursor-pointer"
                                        >
                                          {isLastChild ? (
                                            <div className="absolute left-[-8px] top-[-10px] w-[8px] h-[22px] border-l border-b border-border rounded-bl-[4px]" />
                                          ) : (
                                            <div className="absolute left-[-8px] top-1/2 w-[8px] h-[1px] bg-border" />
                                          )}
                                          <span className="text-[12px] font-medium leading-none pl-2 truncate">
                                            {child.label}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
