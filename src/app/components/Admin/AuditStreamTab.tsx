import { useState, useMemo } from "react";
import {
  GiScrollUnfurled,
  GiShieldEchoes,
  GiSpikedHalo,
  GiTrade,
  GiTrashCan,
  GiHammerDrop,
  GiSparkles,
  GiMagnifyingGlass,
  GiCycle,
} from "react-icons/gi";
import { ModLog } from "../../../hooks/useAdminIntel";
import { UserAvatar } from "../shared/UserAvatar";
import { DiscordRolePill } from "../shared/DiscordRolePill";
import { triggerHaptic } from "../../../data/helpers";

interface AuditStreamTabProps {
  logs: ModLog[];
  onInspectUser: (userId: string) => void;
  onRefresh: () => void;
}

type LogCategory = "all" | "roles" | "sanctions" | "ads" | "comments" | "master";

const CATEGORY_FILTERS: { id: LogCategory; label: string }[] = [
  { id: "all", label: "All Logs" },
  { id: "roles", label: "Role Changes" },
  { id: "sanctions", label: "Bans & Sanctions" },
  { id: "ads", label: "Trade Ads" },
  { id: "comments", label: "Comments" },
  { id: "master", label: "Master Overrides" },
];

function getActionCategory(actionType: string): LogCategory {
  const upper = (actionType || "").toUpperCase();
  if (upper.includes("ROLE")) return "roles";
  if (
    upper.includes("BAN") ||
    upper.includes("NUKE") ||
    upper.includes("RESET PROFILE") ||
    upper.includes("WARNED")
  ) {
    return "sanctions";
  }
  if (upper.includes("AD")) return "ads";
  if (upper.includes("COMMENT")) return "comments";
  if (upper.includes("MASTER") || upper.includes("WIPED")) return "master";
  return "all";
}

function getActionIcon(actionType: string) {
  const upper = (actionType || "").toUpperCase();
  if (upper.includes("ROLE")) return <GiSpikedHalo className="w-3.5 h-3.5 text-[#a855f7]" />;
  if (upper.includes("BAN") || upper.includes("NUKE"))
    return <GiHammerDrop className="w-3.5 h-3.5 text-[#ef4444]" />;
  if (upper.includes("AD")) return <GiTrade className="w-3.5 h-3.5 text-[#3b82f6]" />;
  if (upper.includes("COMMENT"))
    return <GiTrashCan className="w-3.5 h-3.5 text-[#f97316]" />;
  if (upper.includes("MASTER"))
    return <GiSparkles className="w-3.5 h-3.5 text-[#eab308]" />;
  return <GiShieldEchoes className="w-3.5 h-3.5 text-muted-foreground" />;
}

export function AuditStreamTab({
  logs,
  onInspectUser,
  onRefresh,
}: AuditStreamTabProps) {
  const [activeCategory, setActiveCategory] = useState<LogCategory>("all");
  const [selectedActor, setSelectedActor] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: logs.length };
    CATEGORY_FILTERS.forEach((c) => {
      if (c.id !== "all") {
        counts[c.id] = logs.filter(
          (log) => getActionCategory(log.action_type) === c.id
        ).length;
      }
    });
    return counts;
  }, [logs]);

  const uniqueActors = useMemo(() => {
    const actorsMap = new Map<string, { username: string; role?: string }>();
    logs.forEach((log) => {
      if (log.moderator_id && log.profiles?.username) {
        actorsMap.set(log.moderator_id, {
          username: log.profiles.username,
          role: log.profiles.role,
        });
      }
    });
    return Array.from(actorsMap.entries()).map(([id, info]) => ({
      id,
      ...info,
    }));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (activeCategory !== "all") {
      result = result.filter(
        (log) => getActionCategory(log.action_type) === activeCategory
      );
    }

    if (selectedActor !== "all") {
      result = result.filter((log) => log.moderator_id === selectedActor);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((log) => {
        const actorName = log.profiles?.username?.toLowerCase() || "";
        const targetName = log.target_profile?.username?.toLowerCase() || "";
        const action = log.action_type?.toLowerCase() || "";
        const reason = log.reason?.toLowerCase() || "";
        return (
          actorName.includes(q) ||
          targetName.includes(q) ||
          action.includes(q) ||
          reason.includes(q)
        );
      });
    }

    return result;
  }, [logs, activeCategory, selectedActor, searchQuery]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 animate-fade-in flex flex-col gap-4 max-w-6xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-[6px] p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-[#2b2d31] border border-border flex items-center justify-center shrink-0 text-primary">
            <GiScrollUnfurled className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-foreground tracking-tight">
                Audit Log Stream
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-[3px] bg-[#2b2d31] border border-border text-muted-foreground">
                {logs.length} entries
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Discord-standard tamper-evident moderation record and clearance trail.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <GiMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              id="admin-audit-search-input"
              name="admin_audit_search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by actor, target, or action…"
              aria-label="Filter audit log by actor, target, or action"
              className="w-full h-8 pl-8 pr-2.5 bg-input border border-border rounded-[4px] text-[12px] font-mono text-foreground focus:border-primary outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onRefresh();
            }}
            className="h-8 px-3 rounded-[4px] bg-[#2b2d31] hover:bg-[#35373c] border border-border text-[11px] font-mono text-foreground flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title="Refresh logs"
          >
            <GiCycle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Category Filter & Control Toolbar */}
      <div className="bg-card border border-border rounded-[6px] p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORY_FILTERS.map((cat) => {
            const count = categoryCounts[cat.id] ?? 0;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setActiveCategory(cat.id);
                }}
                className={`h-8 px-3 rounded-[4px] text-[12px] font-medium transition-colors duration-150 cursor-pointer shrink-0 border flex items-center gap-2 ${
                  isActive
                    ? "bg-[#5865F2] text-white font-bold border-[#4752C4] shadow-sm"
                    : "bg-[#2b2d31] text-[#dbdee1] hover:text-white border-[#383a40] hover:bg-[#35373c]"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                    isActive
                      ? "bg-black/30 text-white"
                      : "bg-[#1e1f22] text-[#949ba4]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {uniqueActors.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
              Filter by User:
            </span>
            <select
              value={selectedActor}
              onChange={(e) => {
                triggerHaptic("light");
                setSelectedActor(e.target.value);
              }}
              className="h-8 px-2.5 rounded-[4px] bg-[#2b2d31] text-[#dbdee1] border border-[#383a40] text-[11px] font-mono outline-none focus:border-[#5865F2] cursor-pointer"
            >
              <option value="all" className="bg-[#1e1f22] text-foreground">
                All Users ({uniqueActors.length})
              </option>
              {uniqueActors.map((actor) => (
                <option
                  key={actor.id}
                  value={actor.id}
                  className="bg-[#1e1f22] text-foreground"
                >
                  @{actor.username} {actor.role ? `(${actor.role.toUpperCase()})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Audit Log Entries List */}
      <div className="bg-card border border-border rounded-[6px] p-3 flex flex-col gap-2">
        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground bg-input/40 rounded-[5px] border border-border">
            <GiScrollUnfurled className="w-8 h-8 opacity-40" />
            <span className="text-[12px] font-mono">
              {searchQuery || selectedActor !== "all" || activeCategory !== "all"
                ? "No audit logs match your active filter criteria."
                : "No audit logs recorded."}
            </span>
            {(searchQuery || selectedActor !== "all" || activeCategory !== "all") && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setActiveCategory("all");
                  setSelectedActor("all");
                  setSearchQuery("");
                }}
                className="mt-2 h-7 px-3 rounded-[3px] bg-[#2b2d31] hover:bg-[#35373c] border border-border text-[11px] font-mono text-[#dbdee1] cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const dateObj = new Date(log.created_at);
            const timeStr = dateObj.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            const dateStr = dateObj.toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            const actorUsername = log.profiles?.username || "Staff Member";
            const actorRole = log.profiles?.role || "staff";
            const targetUsername = log.target_profile?.username;
            const targetRole = log.target_profile?.role;

            return (
              <div
                key={log.id}
                className="p-3 rounded-[5px] bg-[#1e1f22] border border-border flex flex-col gap-2 font-sans hover:border-[#3f4147] transition-colors"
              >
                {/* Top Row: Actor, Action, Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      avatarUrl={log.profiles?.avatar_url}
                      username={actorUsername}
                      className="w-7 h-7 rounded-full shrink-0 border border-border"
                    />

                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="text-[13px] font-bold text-foreground truncate">
                        {actorUsername}
                      </span>

                      <DiscordRolePill name={actorRole} size="sm" />

                      <span className="text-muted-foreground text-[12px]">
                        performed
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#2b2d31] border border-border text-[11px] font-mono font-bold text-primary">
                        {getActionIcon(log.action_type)}
                        <span>{log.action_type}</span>
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-muted-foreground shrink-0 sm:text-right">
                    {dateStr} at {timeStr}
                  </span>
                </div>

                {/* Target & Reason Detail Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pl-9">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {targetUsername && (
                      <div className="flex items-center gap-1.5 bg-[#2b2d31] px-2 py-1 rounded-[4px] border border-border">
                        <UserAvatar
                          avatarUrl={log.target_profile?.avatar_url}
                          username={targetUsername}
                          className="w-4 h-4 rounded-full border border-border"
                        />
                        <span className="text-[11px] text-muted-foreground">
                          Target:
                        </span>
                        <span className="text-[11px] font-bold text-foreground">
                          @{targetUsername}
                        </span>
                        {targetRole && (
                          <DiscordRolePill name={targetRole} size="sm" />
                        )}
                      </div>
                    )}

                    {log.reason && (
                      <div className="text-[11.5px] text-[#dbdee1] italic bg-[#2b2d31]/60 px-2.5 py-1 rounded-[4px] border border-border/80">
                        &ldquo;{log.reason}&rdquo;
                      </div>
                    )}
                  </div>

                  {log.target_user_id && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        onInspectUser(log.target_user_id!);
                      }}
                      className="h-6 px-2.5 rounded-[3px] bg-[#2b2d31] hover:bg-[#35373c] border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      Inspect Member
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
