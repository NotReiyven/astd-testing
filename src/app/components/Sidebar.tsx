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
  Package
} from "lucide-react";
import { FilterKey } from "../../types";
import { useUnits } from "../../context/UnitContext";
import { getTier } from "../../data";

type ChannelConfig = { id: string; label: string; isLocked: boolean; hasThreads?: boolean; icon?: LucideIcon; };
type CategoryConfig = { id: string; label: string; channels: ChannelConfig[]; };

const CATEGORIES: CategoryConfig[] = [
  {
    id: "important", label: "important",
    channels: [
      { id: "home", label: "home", isLocked: true },
      { id: "tutorial", label: "tutorial", isLocked: true },
      { id: "inventory", label: "my-inventory", isLocked: true, icon: Package },
      { id: "extra-notices", label: "extra-notices", isLocked: true, icon: Megaphone },
    ]
  },
  {
    id: "trading", label: "trading",
    channels: [
      { id: "value-list", label: "value-list", isLocked: false, hasThreads: true },
      { id: "trading-ads", label: "trading-ads", isLocked: false, icon: Megaphone }
    ]
  },
  {
    id: "legal", label: "legal",
    channels: [
      { id: "terms-of-service", label: "terms-of-service", isLocked: true, icon: FileText },
      { id: "privacy-policy", label: "privacy-policy", isLocked: true, icon: Shield }
    ]
  }
];

export function Sidebar({
  activeChannel,
  setActiveChannel,
  onThreadClick,
  guideState
}: {
  activeChannel: string;
  setActiveChannel: (c: string) => void;
  onThreadClick: (tier: FilterKey, sectionId: string) => void;
  guideState?: { type: string | null; step: number };
}) {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const { units } = useUnits();

  const dynamicTierGroups = useMemo(() => {
    const order = ["S", "A", "B", "C", "Pure", "Oddities", "Untiered"];
    const colorMap: Record<string, string> = { S: "#dd7e6b", A: "#a855f7", B: "#3b82f6", C: "#22c55e", Pure: "#9ca3af", Oddities: "#8b5cf6", Untiered: "#52525b" };

    const subCatPriority: Record<string, number> = {
      "top": 1,
      "high": 2,
      "mid": 3,
      "low": 4
    };

    return order.map(tier => {
      const tierUnits = units.filter(u => getTier(u) === tier);
      let subCats = Array.from(new Set(tierUnits.map(u => u.subCategory || "Uncategorized")));

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
        children: subCats.map(sub => ({ 
          id: sub,
          label: sub 
        }))
      };
    }).filter(g => g.children.length > 0);
  }, [units]);

  const toggleCategory = (id: string) => {
    setCollapsedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      className="flex flex-col h-screen select-none border-r border-[rgba(0,0,0,0.22)] md:border-r-0"
      style={{
        width: "100%", 
        background: "#2B2D31",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="h-[48px] flex-shrink-0 px-4 flex items-center justify-between shadow-sm hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors" style={{ borderBottom: "1px solid rgba(0,0,0,0.2)" }}>
        <span className="font-black text-[#F2F3F5] text-[15px] truncate">
          ASTD Value List
        </span>
        <ChevronDown className="w-4 h-4 text-[#F2F3F5] opacity-80 flex-shrink-0" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pt-3">
        <div className="flex flex-col px-2 pb-6">
          {CATEGORIES.map((cat) => {
            const isCollapsed = collapsedCategories[cat.id];

            return (
              <div key={cat.id} className="mt-4 flex flex-col rounded-[8px] transition-all">
                <div 
                  className="flex items-center justify-between px-1 py-2 md:px-0.5 md:py-1 mb-1 group cursor-pointer text-[#949BA4] hover:text-[#DBDEE1]"
                  onClick={() => toggleCategory(cat.id)}
                >
                  <div className="flex items-center gap-0.5">
                    <ChevronDown className={`w-3 h-3 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed ? '-rotate-90' : ''}`} />
                    <span className="text-[12px] font-bold uppercase tracking-wider pl-0.5">{cat.label}</span>
                  </div>
                  <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div 
                  className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}
                  style={{ display: 'grid', gridTemplateRows: isCollapsed ? '0fr' : '1fr' }}
                >
                  <div className="overflow-visible flex flex-col min-h-0">
                    {cat.channels.map((channel) => {
                      const isActive = activeChannel === channel.id;
                      const isTarget = guideState?.type === "main" && guideState.step === 1 && channel.id === "value-list";
                      const Icon = channel.icon || Hash;

                      return (
                        <div key={channel.id} className="flex flex-col relative">
                          <button
                            onClick={() => setActiveChannel(channel.id)}
                            className={`group w-full flex items-center justify-between px-2 py-2.5 md:py-1.5 mb-[2px] rounded-[4px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                              isTarget 
                                ? "bg-[#5865F2] text-white shadow-[0_0_20px_rgba(88,101,242,0.6)] ring-2 ring-[#5865F2] translate-x-1 z-50 relative animate-pulse"
                                : isActive
                                  ? "bg-[rgba(78,80,88,0.6)] text-[#F2F3F5] translate-x-1"
                                  : "text-[#80848E] hover:bg-[rgba(78,80,88,0.3)] hover:text-[#DBDEE1] hover:translate-x-1"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {channel.isLocked ? (
                                <div className="relative flex items-center justify-center w-5 h-5 opacity-70 flex-shrink-0">
                                  <Icon className="w-5 h-5" />
                                  <Lock className={`w-2.5 h-2.5 absolute bottom-0 right-0 rounded-full p-[1px] ${isTarget ? 'bg-[#5865F2]' : 'bg-[#2B2D31]'}`} />
                                </div>
                              ) : (
                                <Icon className="w-5 h-5 opacity-70 flex-shrink-0" />
                              )}
                              <span className="text-[15px] font-medium leading-none pb-[1px] truncate">{channel.label}</span>
                            </div>
                          </button>

                          {channel.hasThreads && isActive && (
                            <div className="relative flex flex-col ml-[26px] mt-0.5 mb-3 animate-fade-in">
                              <div className="absolute left-[-16px] top-0 bottom-[14px] w-[2px] bg-[#3F4147]" />
                              {dynamicTierGroups.map((group) => (
                                <div key={group.tier} className="relative flex flex-col mb-1.5">
                                  <div className="relative flex items-center min-h-[30px] md:min-h-[24px]">
                                    <div className="absolute left-[-16px] top-[-10px] w-[14px] h-[24px] border-l-2 border-b-2 border-[#3F4147] rounded-bl-[6px]" />
                                    <span className="text-[12px] font-bold uppercase tracking-widest pl-1.5" style={{ color: group.color }}>
                                      {group.tier} {["Pure", "Oddities", "Untiered"].includes(group.tier) ? "" : "Tier"}
                                    </span>
                                  </div>
                                  <div className="relative flex flex-col ml-[6px] mt-0.5">
                                    <div className="absolute left-[-10px] top-[-6px] bottom-[12px] w-[2px] bg-[#3F4147]" />
                                    {group.children.map((child, cIdx) => {
                                      const isLastChild = cIdx === group.children.length - 1;
                                      return (
                                        <button
                                          key={`${group.tier}-${child.id}`}
                                          onClick={() => onThreadClick(group.tier as FilterKey, child.id)}
                                          className="relative flex items-center min-h-[36px] md:min-h-[28px] hover:bg-[rgba(78,80,88,0.3)] rounded-[4px] px-2 text-[#80848E] hover:text-[#DBDEE1] text-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 focus-visible:outline-none"
                                        >
                                          {isLastChild ? (
                                            <div className="absolute left-[-10px] top-[-12px] w-[12px] h-[30px] md:h-[26px] border-l-2 border-b-2 border-[#3F4147] rounded-bl-[6px]" />
                                          ) : (
                                            <div className="absolute left-[-10px] top-1/2 w-[12px] h-[2px] bg-[#3F4147]" />
                                          )}
                                          <span className="text-[14px] font-medium leading-none pl-2 truncate">{child.label}</span>
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