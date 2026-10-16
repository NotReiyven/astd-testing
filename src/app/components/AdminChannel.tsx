import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  GiLockedFortress,
  GiSpikedHalo,
  GiShieldEchoes,
  GiSwordsEmblem,
  GiScrollUnfurled,
  GiBackpack,
  GiTrade,
  GiTrashCan,
  GiPadlock,
  GiKey,
  GiCrown,
  GiHammerDrop,
  GiSparkles,
  GiCheckMark,
  GiCrossMark,
  GiMagnifyingGlass,
  GiCycle,
  GiChest,
  GiChatBubble,
} from "react-icons/gi";
import { useProfileStore } from "../../store/useProfileStore";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useUnits } from "../../context/UnitContext";
import { triggerHaptic } from "../../data/helpers";
import { getAvatarStyle, getInitials } from "./TradeAnalyzer/summaryUtils";
import { UserAvatar } from "./shared/UserAvatar";
import { getProxyImage, handleImageError } from "../../data";
import {
  useAdminIntel,
  CORE_SYSTEM_ROLES,
  RolePermissions,
  RoleItem,
} from "../../hooks/useAdminIntel";
import { SecuritySettingsTab } from "./Admin/SecuritySettingsTab";
import { AuditStreamTab } from "./Admin/AuditStreamTab";
import { CommentsStreamTab } from "./Admin/CommentsStreamTab";
import { DiscordRolePill, getContrastTextColor } from "./shared/DiscordRolePill";

type AdminTab =
  | "users"
  | "roles"
  | "ads"
  | "comments"
  | "audit"
  | "master-lab"
  | "security";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#71717a",
];

const ROLE_FILTERS = [
  { id: "all", label: "All" },
  { id: "staff", label: "Staff" },
  { id: "master", label: "Master" },
  { id: "admin", label: "Admin" },
  { id: "mod", label: "Mod" },
  { id: "banned", label: "Banned" },
];

export function AdminChannel({
  setActiveChannel,
}: {
  setActiveChannel?: (c: string) => void;
} = {}) {
  const navigate = useNavigate();
  const { setViewingUser } = useInventoryStore();
  const { setViewingProfile } = useProfileStore();
  const { units: ALL_UNITS } = useUnits();

  const {
    users,
    allUsers,
    selectedUser,
    setSelectedUser,
    userIntel,
    metrics,
    availableRoles,
    modLogs,
    globalLogs,
    platformAds,
    isLoadingAds,
    fetchPlatformAds,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    isLoading,
    toast,
    showToast,
    setToast,
    showBannedOnly,
    setShowBannedOnly,
    handleSearch,
    fetchUsers,
    loadMetrics,
    updateUserRole,
    createNewRole,
    updateRoleConfig,
    deleteRole,
    deleteSingleAd,
    handleResetProfile,
    handlePurgeAds,
    handlePurgeComments,
    handleWipeInventory,
    handleWipeWishlist,
    handleTotalAccountNuke,
    masterSetReputation,
    masterModifyVaultUnit,
    masterOverrideProfile,
    masterPurgeExpiredAds,
    profile,
    callerRole,
    isMaster,
    isAdmin,
    isMod,
    canModerate,
    canManageUsers,
    canManageRoles,
    canDeleteAds,
    canUseDestructiveTools,
    canUseMasterTools,
    canActOnUser,
    canToggleRole,
    recentComments,
    isLoadingComments,
    fetchRecentComments,
    deleteComment,
    warnUser,
  } = useAdminIntel();

  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [inspectorSubTab, setInspectorSubTab] = useState<
    "overview" | "ads" | "vault" | "logs"
  >("overview");

  // Role Management State
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#a855f7");
  const [newRoleRank, setNewRoleRank] = useState(10);
  const [newRoleTier, setNewRoleTier] = useState<"admin" | "mod" | "custom">(
    "custom"
  );
  const [newRolePermissions, setNewRolePermissions] = useState<RolePermissions>(
    {
      manage_roles: false,
      manage_users: false,
      manage_ads: true,
      manage_comments: true,
      view_audit_logs: true,
      access_master_lab: false,
      override_rep: false,
    }
  );
  const [showPermissionsPanel, setShowPermissionsPanel] = useState(false);
  const [selectedRoleForRoster, setSelectedRoleForRoster] =
    useState<string>("mod");
  const [roleMemberSearch, setRoleMemberSearch] = useState("");
  const [editingRole, setEditingRole] = useState<{
    name: string;
    color: string;
    rank: number;
    permissions?: RolePermissions;
  } | null>(null);

  const permissionConfig: {
    id: keyof RolePermissions;
    label: string;
    desc: string;
    allowedForCaller: boolean;
  }[] = useMemo(
    () => [
      {
        id: "manage_roles",
        label: "Manage Roles",
        desc: "Create & edit roles lower than own rank",
        allowedForCaller: isMaster || isAdmin,
      },
      {
        id: "manage_users",
        label: "Manage Members",
        desc: "Ban accounts and reset profile identities",
        allowedForCaller: isMaster || isAdmin,
      },
      {
        id: "manage_ads",
        label: "Manage Trade Listings",
        desc: "Remove non-compliant trade ads",
        allowedForCaller: true,
      },
      {
        id: "manage_comments",
        label: "Moderate Comments",
        desc: "Delete abusive comments and purge threads",
        allowedForCaller: true,
      },
      {
        id: "view_audit_logs",
        label: "View Audit Stream",
        desc: "Inspect system security and moderation records",
        allowedForCaller: true,
      },
      {
        id: "access_master_lab",
        label: "Master Lab Access",
        desc: "Direct economy and value overrides",
        allowedForCaller: isMaster,
      },
      {
        id: "override_rep",
        label: "Reputation Override",
        desc: "Adjust trader reputation scores manually",
        allowedForCaller: isMaster,
      },
    ],
    [isMaster, isAdmin]
  );

  // Ad Moderation State
  const [adSearchQuery, setAdSearchQuery] = useState("");
  const [showExpiredAdsInFeed, setShowExpiredAdsInFeed] = useState(false);

  // Master Lab State
  const [cheatTargetUserId, setCheatTargetUserId] = useState<string>("");
  const [cheatUnitSearch, setCheatUnitSearch] = useState("");
  const [cheatSelectedUnitId, setCheatSelectedUnitId] = useState<string>("");
  const [cheatUnitQty, setCheatUnitQty] = useState<number>(1);
  const [cheatUnitMode, setCheatUnitMode] = useState<"add" | "set" | "remove">(
    "add"
  );
  const [cheatRepInput, setCheatRepInput] = useState<string>("100");
  const [overrideUsername, setOverrideUsername] = useState("");
  const [overrideRoblox, setOverrideRoblox] = useState("");
  const [overrideBio, setOverrideBio] = useState("");

  // Confirmation Modal State
  const [modActionData, setModActionData] = useState<{
    type:
      | "role"
      | "ban"
      | "warn"
      | "reset_profile"
      | "purge_ads"
      | "purge_comments"
      | "wipe_inv"
      | "wipe_wishlist"
      | "nuke"
      | "delete_single_ad";
    payload?: string;
    extraTargetUserId?: string;
    label: string;
    isDestructive?: boolean;
  } | null>(null);
  const [modReason, setModReason] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (text: string, label = "ID") => {
    navigator.clipboard.writeText(text);
    triggerHaptic("light");
    setCopiedId(text);
    showToast(`Copied ${label}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRoleColor = (roleName: string) => {
    const found = availableRoles.find(
      (r) => r.name.toLowerCase() === roleName?.toLowerCase()
    );
    if (found) return found.color;
    if (roleName === "master") return "#eab308";
    if (roleName === "admin") return "#ef4444";
    if (roleName === "mod") return "#3b82f6";
    if (roleName === "banned") return "#f43f5e";
    return "#888888";
  };

  const executeModAction = async () => {
    if (!modActionData || !modReason.trim()) return;

    const reason = modReason.trim();
    const { type, payload, extraTargetUserId } = modActionData;

    setModActionData(null);
    setModReason("");

    if (type === "delete_single_ad" && payload && extraTargetUserId) {
      await deleteSingleAd(payload, extraTargetUserId, reason);
      return;
    }

    if (!selectedUser) return;

    if (type === "warn") {
      await warnUser(selectedUser.id, selectedUser.username, reason);
    } else if (type === "role" && payload) {
      await updateUserRole(selectedUser.id, payload, reason);
    } else if (type === "ban" && payload) {
      await updateUserRole(selectedUser.id, payload, reason);
    } else if (type === "reset_profile") {
      await handleResetProfile(reason);
    } else if (type === "purge_ads") {
      await handlePurgeAds(reason);
    } else if (type === "purge_comments") {
      await handlePurgeComments(reason);
    } else if (type === "wipe_inv") {
      await handleWipeInventory(reason);
    } else if (type === "wipe_wishlist") {
      await handleWipeWishlist(reason);
    } else if (type === "nuke") {
      await handleTotalAccountNuke(reason);
    }
  };

  const filteredPlatformAds = useMemo(() => {
    const q = adSearchQuery.trim().toLowerCase();
    if (!q) return platformAds;
    return platformAds.filter((ad) => {
      const uname = ad.profiles?.username?.toLowerCase() || "";
      const note = ad.note?.toLowerCase() || "";
      const hasUnit =
        ad.give_items?.some((i) => i.name.toLowerCase().includes(q)) ||
        ad.get_items?.some((i) => i.name.toLowerCase().includes(q));
      return (
        uname.includes(q) ||
        note.includes(q) ||
        ad.id.toLowerCase().includes(q) ||
        hasUnit
      );
    });
  }, [platformAds, adSearchQuery]);

  const matchingCheatUnits = useMemo(() => {
    const q = cheatUnitSearch.trim().toLowerCase();
    if (!q) return ALL_UNITS.slice(0, 24);
    return ALL_UNITS.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.subtitle && u.subtitle.toLowerCase().includes(q))
    ).slice(0, 24);
  }, [ALL_UNITS, cheatUnitSearch]);

  const roleRosterUsers = useMemo(() => {
    const q = roleMemberSearch.trim().toLowerCase();
    return allUsers.filter((u) => {
      const hasRole =
        u.role === selectedRoleForRoster ||
        u.assigned_roles?.includes(selectedRoleForRoster);
      if (!q) return hasRole;
      return (
        u.username.toLowerCase().includes(q) ||
        (u.discord_id && u.discord_id.includes(q))
      );
    });
  }, [allUsers, selectedRoleForRoster, roleMemberSearch]);

  const effectiveCheatTarget = useMemo(() => {
    const id = cheatTargetUserId || selectedUser?.id || profile?.id || "";
    return allUsers.find((u) => u.id === id) || selectedUser || null;
  }, [cheatTargetUserId, selectedUser, profile?.id, allUsers]);

  const roleTone = isMaster ? "#eab308" : isAdmin ? "#ef4444" : "#3b82f6";
  const targetIsProtectedFromCaller = selectedUser
    ? !canActOnUser(selectedUser)
    : false;

  const jumpToChannel = (ch: string) => {
    if (setActiveChannel) setActiveChannel(ch);
    navigate(`/${ch}`);
  };

  if (!canModerate) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-background text-muted-foreground p-6 select-none">
        <div className="bg-card border border-destructive/40 rounded-[8px] p-6 max-w-sm w-full flex flex-col items-center text-center gap-2.5">
          <GiLockedFortress className="w-10 h-10 text-destructive" />
          <h1 className="text-[16px] text-foreground tracking-wide">
            Access Restricted
          </h1>
          <p className="text-[12px] font-mono text-muted-foreground">
            Staff clearance required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background select-none overflow-hidden relative pb-[var(--mobile-nav-h)] lg:pb-0">
      {/* =====================================================================
          COMPACT SINGLE-ROW TOOLBAR
      ===================================================================== */}
      <div className="bg-card border-b border-border px-3 sm:px-5 py-2 shrink-0 z-20 flex flex-wrap items-center justify-between gap-2">
        {/* Navigation Tabs */}
        <div className="flex bg-input rounded-[4px] p-1 border border-border shadow-inner overflow-x-auto no-scrollbar max-w-full items-center">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("users");
            }}
            className={`h-7 px-3 rounded-[3px] text-[12px] flex items-center gap-1.5 transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 cursor-pointer shrink-0 ${
              activeTab === "users"
                ? "bg-foreground text-background shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
            }`}
          >
            <GiSwordsEmblem className="w-3.5 h-3.5" />
            <span>Users</span>
            <span className="text-[10px] font-mono opacity-80">
              {metrics.totalUsers}
            </span>
          </button>

          {canManageRoles && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("roles");
              }}
              className={`h-7 px-3 rounded-[3px] text-[12px] flex items-center gap-1.5 transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 cursor-pointer shrink-0 ${
                activeTab === "roles"
                  ? "bg-foreground text-background shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
              }`}
            >
              <GiSpikedHalo className="w-3.5 h-3.5" />
              <span>Roles</span>
            </button>
          )}

          {canDeleteAds && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("ads");
              }}
              className={`h-7 px-3 rounded-[3px] text-[12px] flex items-center gap-1.5 transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 cursor-pointer shrink-0 ${
                activeTab === "ads"
                  ? "bg-foreground text-background shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
              }`}
            >
              <GiTrade className="w-3.5 h-3.5" />
              <span>Ads</span>
              <span className="text-[10px] font-mono opacity-80">
                {metrics.activeAds}
              </span>
            </button>
          )}

          {canModerate && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("comments");
                fetchRecentComments();
              }}
              className={`h-7 px-3 rounded-[3px] text-[12px] flex items-center gap-1.5 transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 cursor-pointer shrink-0 ${
                activeTab === "comments"
                  ? "bg-foreground text-background shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
              }`}
            >
              <GiChatBubble className="w-3.5 h-3.5" />
              <span>Comments</span>
              <span className="text-[10px] font-mono opacity-80">
                {metrics.totalComments}
              </span>
            </button>
          )}

          {canModerate && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("audit");
              }}
              className={`h-7 px-3 rounded-[3px] text-[12px] flex items-center gap-1.5 transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 cursor-pointer shrink-0 ${
                activeTab === "audit"
                  ? "bg-foreground text-background shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
              }`}
            >
              <GiScrollUnfurled className="w-3.5 h-3.5" />
              <span>Audit Log</span>
              <span className="text-[10px] font-mono opacity-80">
                {globalLogs.length}
              </span>
            </button>
          )}

          {canUseMasterTools && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("master-lab");
              }}
              className={`h-7 px-3 rounded-[3px] text-[12px] flex items-center gap-1.5 transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 cursor-pointer shrink-0 ${
                activeTab === "master-lab"
                  ? "bg-[#eab308] text-black font-bold shadow-sm"
                  : "text-[#eab308] hover:bg-[#eab308]/15 border border-transparent"
              }`}
            >
              <GiSparkles className="w-3.5 h-3.5" />
              <span>Master Lab</span>
            </button>
          )}

          {isMaster && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("security");
              }}
              className={`h-7 px-3 rounded-[3px] text-[12px] flex items-center gap-1.5 transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95 cursor-pointer shrink-0 ${
                activeTab === "security"
                  ? "bg-destructive text-white font-bold shadow-sm"
                  : "text-destructive hover:bg-destructive/15 border border-transparent"
              }`}
            >
              <GiLockedFortress className="w-3.5 h-3.5" />
              <span>Security</span>
            </button>
          )}
        </div>

        {/* Right Status & Sync */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <DiscordRolePill name={callerRole} color={roleTone} size="sm" />
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              loadMetrics();
              fetchUsers(searchQuery, showBannedOnly);
              fetchPlatformAds(showExpiredAdsInFeed);
              showToast("Synced");
            }}
            className="h-7 px-2.5 rounded-[4px] bg-input hover:bg-muted border border-border text-[11px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Sync data"
          >
            <GiCycle className="w-3 h-3" />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {activeTab === "security" && isMaster && <SecuritySettingsTab />}

      {activeTab === "audit" && canModerate && (
        <AuditStreamTab
          logs={globalLogs}
          onInspectUser={(uid) => {
            const u = allUsers.find((x) => x.id === uid);
            if (u) {
              setSelectedUser(u);
            } else {
              fetchUsers(uid);
            }
            setActiveTab("users");
          }}
          onRefresh={loadMetrics}
        />
      )}

      {activeTab === "comments" && canModerate && (
        <CommentsStreamTab
          comments={recentComments}
          isLoading={isLoadingComments}
          onDeleteComment={deleteComment}
          onWarnUser={warnUser}
          onInspectUser={(uid) => {
            const u = allUsers.find((x) => x.id === uid);
            if (u) {
              setSelectedUser(u);
            } else {
              fetchUsers(uid);
            }
            setActiveTab("users");
          }}
          onRefresh={fetchRecentComments}
        />
      )}

      {/* =====================================================================
          TAB 2: ROLE MANAGEMENT
      ===================================================================== */}
      {activeTab === "roles" && canManageRoles && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 animate-fade-in">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left 5 Cols: Role List + Creator */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {canManageRoles && (
                <div className="bg-card border border-border rounded-[6px] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-foreground">
                      New Role Studio
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {isMaster
                        ? "Master (Rank 0–99)"
                        : isAdmin
                        ? "Admin (Rank 2–99)"
                        : "Mod (Rank 3–99)"}
                    </span>
                  </div>

                  {/* Level Hierarchy Buttons */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase">
                      <span>Hierarchy Level</span>
                      <span>Rank #{newRoleRank}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {isMaster && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewRoleTier("admin");
                            setNewRoleRank(1);
                          }}
                          className={`h-7 rounded-[3px] text-[11px] font-bold border transition-colors cursor-pointer ${
                            newRoleTier === "admin"
                              ? "bg-[#3b82f6] text-white border-[#2563eb]"
                              : "bg-input/60 text-muted-foreground hover:text-foreground border-border"
                          }`}
                        >
                          Admin (#1)
                        </button>
                      )}
                      {(isMaster || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewRoleTier("mod");
                            setNewRoleRank(2);
                          }}
                          className={`h-7 rounded-[3px] text-[11px] font-bold border transition-colors cursor-pointer ${
                            newRoleTier === "mod"
                              ? "bg-[#22c55e] text-white border-[#16a34a]"
                              : "bg-input/60 text-muted-foreground hover:text-foreground border-border"
                          }`}
                        >
                          Mod (#2)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setNewRoleTier("custom");
                          setNewRoleRank(Math.max(3, newRoleRank));
                        }}
                        className={`h-7 rounded-[3px] text-[11px] font-bold border transition-colors cursor-pointer ${
                          newRoleTier === "custom"
                            ? "bg-[#a855f7] text-white border-[#9333ea]"
                            : "bg-input/60 text-muted-foreground hover:text-foreground border-border"
                        }`}
                      >
                        Custom (#3+)
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="Role identifier (e.g. trusted-trader)…"
                      className="flex-1 h-8 bg-input border border-border rounded-[4px] px-2.5 text-[12px] font-mono text-foreground focus:border-primary outline-none"
                    />
                    <input
                      type="number"
                      min={isMaster ? 0 : isAdmin ? 2 : 3}
                      max={99}
                      value={newRoleRank}
                      onChange={(e) =>
                        setNewRoleRank(
                          Math.max(
                            isMaster ? 0 : isAdmin ? 2 : 3,
                            parseInt(e.target.value) || 10
                          )
                        )
                      }
                      className="w-16 h-8 bg-input border border-border rounded-[4px] px-2 text-[12px] font-mono text-foreground focus:border-primary outline-none"
                      title="Custom Rank Number"
                    />
                  </div>

                  {/* Color Picker Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <input
                        type="color"
                        value={newRoleColor}
                        onChange={(e) => setNewRoleColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border border-border p-0 shrink-0"
                      />
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewRoleColor(c)}
                          className={`w-5 h-5 rounded-full cursor-pointer ${
                            newRoleColor === c
                              ? "ring-2 ring-white"
                              : "opacity-70 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`Color ${c}`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!newRoleName.trim()) return;
                        createNewRole(
                          newRoleName,
                          newRoleColor,
                          newRoleRank,
                          newRolePermissions
                        );
                        setNewRoleName("");
                      }}
                      disabled={!newRoleName.trim()}
                      className="h-8 px-3.5 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-[11px] font-bold rounded-[4px] cursor-pointer shrink-0"
                    >
                      Create Role
                    </button>
                  </div>

                  {/* Discord-Style Permissions Checklist */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setShowPermissionsPanel(!showPermissionsPanel)}
                      className="flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground cursor-pointer font-mono py-1"
                    >
                      <span>
                        PERMISSIONS ({Object.values(newRolePermissions).filter(Boolean).length} ACTIVE)
                      </span>
                      <span className="text-[10px] font-bold">
                        {showPermissionsPanel ? "▲ HIDE" : "▼ CONFIGURE"}
                      </span>
                    </button>

                    {showPermissionsPanel && (
                      <div className="flex flex-col gap-1.5 p-2 rounded-[4px] bg-[#1e1f22] border border-border">
                        {permissionConfig.map((p) => {
                          const isChecked = Boolean(newRolePermissions[p.id]);
                          const isDisabled = !p.allowedForCaller;

                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-2 p-1.5 rounded-[3px] transition-colors ${
                                isDisabled
                                  ? "opacity-40 cursor-not-allowed"
                                  : "cursor-pointer hover:bg-[#2b2d31]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={(e) => {
                                  setNewRolePermissions({
                                    ...newRolePermissions,
                                    [p.id]: e.target.checked,
                                  });
                                }}
                                className="mt-0.5 rounded border-border accent-primary cursor-pointer disabled:cursor-not-allowed"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-bold text-foreground">
                                  {p.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground leading-tight">
                                  {p.desc}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-[6px] p-3 flex flex-col gap-1.5">
                <div className="text-[11px] font-mono text-muted-foreground px-1 pb-1">
                  ROLES ({availableRoles.length})
                </div>
                {availableRoles.map((r) => {
                  const isCore = CORE_SYSTEM_ROLES.includes(
                    r.name.toLowerCase()
                  );
                  const isSelected = selectedRoleForRoster === r.name;
                  const holderCount = allUsers.filter(
                    (u) =>
                      u.role === r.name || u.assigned_roles?.includes(r.name)
                  ).length;
                  const canEditThisRole =
                    isMaster ||
                    (isAdmin && !isCore && r.rank >= 2) ||
                    (isMod && !isCore && r.rank >= 3);

                  return (
                    <div
                      key={r.name}
                      onClick={() => setSelectedRoleForRoster(r.name)}
                      className={`p-2.5 rounded-[5px] border transition-colors cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? "bg-primary/10 border-primary/50"
                          : "bg-input/50 hover:bg-input border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: r.color }}
                          />
                          <span className="text-[12px] text-foreground font-bold truncate">
                            {r.name}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            #{r.rank}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {holderCount}
                          </span>
                          {canEditThisRole && !isCore && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingRole({
                                    name: r.name,
                                    color: r.color,
                                    rank: r.rank,
                                    permissions: r.permissions || {},
                                  });
                                }}
                                className="px-1.5 py-0.5 rounded bg-card border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteRole(r.name);
                                }}
                                className="p-1 rounded bg-card border border-border text-muted-foreground hover:text-destructive cursor-pointer"
                                title="Delete role"
                              >
                                <GiTrashCan className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {editingRole?.name === r.name && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="pt-2 border-t border-border flex flex-col gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editingRole.color}
                              onChange={(e) =>
                                setEditingRole({
                                  ...editingRole,
                                  color: e.target.value,
                                })
                              }
                              className="w-6 h-6 rounded bg-transparent border border-border cursor-pointer"
                            />
                            <input
                              type="number"
                              min={isMaster ? 0 : isAdmin ? 2 : 3}
                              max={99}
                              value={editingRole.rank}
                              onChange={(e) =>
                                setEditingRole({
                                  ...editingRole,
                                  rank: parseInt(e.target.value) || 10,
                                })
                              }
                              className="w-16 h-6 bg-card border border-border rounded px-1.5 text-[11px] font-mono text-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                updateRoleConfig(
                                  editingRole.name,
                                  editingRole.color,
                                  editingRole.rank,
                                  editingRole.permissions
                                );
                                setEditingRole(null);
                              }}
                              className="h-6 px-2 rounded bg-primary text-primary-foreground text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRole(null)}
                              className="h-6 px-2 rounded bg-muted text-muted-foreground text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>

                          {/* Permissions Editor for Edited Role */}
                          <div className="p-2 rounded bg-[#1e1f22] border border-border flex flex-col gap-1">
                            <span className="text-[10px] font-mono text-muted-foreground uppercase mb-0.5">
                              Configure Role Permissions
                            </span>
                            {permissionConfig.map((p) => {
                              const isChecked = Boolean(
                                editingRole.permissions?.[p.id]
                              );
                              const isDisabled = !p.allowedForCaller;

                              return (
                                <label
                                  key={p.id}
                                  className={`flex items-center gap-2 text-[10.5px] ${
                                    isDisabled
                                      ? "opacity-40 cursor-not-allowed"
                                      : "cursor-pointer"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={(e) => {
                                      setEditingRole({
                                        ...editingRole,
                                        permissions: {
                                          ...(editingRole.permissions || {}),
                                          [p.id]: e.target.checked,
                                        },
                                      });
                                    }}
                                    className="rounded border-border accent-primary cursor-pointer disabled:cursor-not-allowed"
                                  />
                                  <span className="text-foreground font-medium">
                                    {p.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 7 Cols: Role Holders & Assignment */}
            <div className="lg:col-span-7 bg-card border border-border rounded-[6px] p-4 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <DiscordRolePill
                    name={selectedRoleForRoster}
                    color={getRoleColor(selectedRoleForRoster)}
                    size="sm"
                  />
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {roleRosterUsers.length} listed
                  </span>
                </div>

                <input
                  type="text"
                  value={roleMemberSearch}
                  onChange={(e) => setRoleMemberSearch(e.target.value)}
                  placeholder="Search user to assign or revoke…"
                  className="h-8 w-full sm:w-56 bg-input border border-border rounded-[4px] px-2.5 text-[11px] font-mono text-foreground focus:border-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5 max-h-[540px] overflow-y-auto custom-scrollbar pr-1">
                {roleRosterUsers.length === 0 ? (
                  <div className="p-6 text-center text-[11px] font-mono text-muted-foreground bg-input/40 rounded-[5px] border border-border">
                    {roleMemberSearch
                      ? "No matching users."
                      : `No users hold '${selectedRoleForRoster}'. Search above to assign.`}
                  </div>
                ) : (
                  roleRosterUsers.map((u) => {
                    const hasThisRole =
                      u.role === selectedRoleForRoster ||
                      u.assigned_roles?.includes(selectedRoleForRoster);
                    const allowedToToggle = canToggleRole(
                      selectedRoleForRoster,
                      u
                    );

                    return (
                      <div
                        key={u.id}
                        className="p-2.5 rounded-[5px] bg-input/60 border border-border flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar
                            avatarUrl={u.avatar_url}
                            username={u.username}
                            discordId={u.discord_id}
                            className="w-7 h-7 rounded-full shrink-0 border border-border"
                          />
                          <div className="min-w-0">
                            <div className="text-[12px] text-foreground truncate">
                              {u.username}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(u.assigned_roles || [u.role]).map((ar) => (
                                <DiscordRolePill
                                  key={ar}
                                  name={ar}
                                  color={getRoleColor(ar)}
                                  size="xs"
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setActiveTab("users");
                            }}
                            className="h-7 px-2 rounded bg-card hover:bg-muted border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Inspect
                          </button>

                          <button
                            type="button"
                            disabled={!allowedToToggle}
                            onClick={() =>
                              updateUserRole(
                                u.id,
                                selectedRoleForRoster,
                                `Role '${selectedRoleForRoster}' ${
                                  hasThisRole ? "revoked" : "granted"
                                }`
                              )
                            }
                            className={`h-7 px-2.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 transition-colors ${
                              !allowedToToggle
                                ? "opacity-40 cursor-not-allowed bg-muted border-border text-muted-foreground"
                                : hasThisRole
                                ? "bg-[#ef4444] hover:bg-[#dc2626] text-white border-black/20 shadow-xs cursor-pointer"
                                : "bg-[#23a559] hover:bg-[#16a34a] text-white border-black/20 shadow-xs cursor-pointer"
                            }`}
                          >
                            {!allowedToToggle && (
                              <GiPadlock className="w-2.5 h-2.5" />
                            )}
                            {hasThisRole ? "Revoke" : "Grant"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: AD MODERATION FEED
      ===================================================================== */}
      {activeTab === "ads" && canDeleteAds && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 animate-fade-in">
          <div className="max-w-6xl mx-auto flex flex-col gap-4">
            <div className="bg-card border border-border rounded-[6px] p-3 flex flex-wrap items-center justify-between gap-2">
              <input
                type="text"
                value={adSearchQuery}
                onChange={(e) => setAdSearchQuery(e.target.value)}
                placeholder="Filter ads by user, unit, or note…"
                className="h-8 w-full sm:w-64 bg-input border border-border rounded-[4px] px-2.5 text-[11px] font-mono text-foreground focus:border-primary outline-none"
              />

              <div className="flex items-center gap-2">
                {isMaster && (
                  <label className="flex items-center gap-1.5 px-2.5 h-8 rounded-[4px] bg-input border border-border text-[11px] font-mono text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showExpiredAdsInFeed}
                      onChange={(e) => {
                        setShowExpiredAdsInFeed(e.target.checked);
                        fetchPlatformAds(e.target.checked);
                      }}
                      className="accent-primary rounded"
                    />
                    <span>Show Expired</span>
                  </label>
                )}

                {isMaster && metrics.expiredAds > 0 && (
                  <button
                    type="button"
                    onClick={masterPurgeExpiredAds}
                    className="h-8 px-2.5 rounded-[4px] bg-destructive/15 hover:bg-destructive text-destructive hover:text-white border border-destructive/40 text-[11px] font-mono cursor-pointer transition-colors"
                  >
                    Clean Expired ({metrics.expiredAds})
                  </button>
                )}
              </div>
            </div>

            {isLoadingAds ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-28 bg-card border border-border rounded-[6px] animate-pulse"
                  />
                ))}
              </div>
            ) : filteredPlatformAds.length === 0 ? (
              <div className="bg-card border border-border rounded-[6px] p-8 text-center text-[12px] font-mono text-muted-foreground">
                No ads found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPlatformAds.map((ad) => {
                  const isExpired =
                    new Date(ad.expires_at).getTime() <= Date.now();
                  return (
                    <div
                      key={ad.id}
                      className="bg-card border border-border rounded-[6px] p-3.5 flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar
                            avatarUrl={ad.profiles?.avatar_url}
                            username={ad.profiles?.username}
                            discordId={ad.profiles?.discord_id}
                            className="w-7 h-7 rounded-full shrink-0 border border-border"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const owner = allUsers.find(
                                    (u) => u.id === ad.user_id
                                  );
                                  if (owner) {
                                    setSelectedUser(owner);
                                    setActiveTab("users");
                                  }
                                }}
                                className="text-[12px] text-foreground hover:text-primary truncate cursor-pointer font-bold"
                              >
                                {ad.profiles?.username || "Unknown"}
                              </button>
                              <DiscordRolePill
                                name={ad.profiles?.role || "user"}
                                color={getRoleColor(ad.profiles?.role || "user")}
                                size="xs"
                              />
                              <span className="text-[10px] font-mono text-muted-foreground">
                                #{ad.id.slice(0, 6)}
                              </span>
                              {isExpired && (
                                <span className="text-[9px] font-mono uppercase px-1 rounded bg-muted text-muted-foreground">
                                  Exp
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setModActionData({
                              type: "delete_single_ad",
                              payload: ad.id,
                              extraTargetUserId: ad.user_id,
                              label: `Delete Ad #${ad.id.slice(0, 6)}`,
                              isDestructive: true,
                            })
                          }
                          className="h-7 px-2.5 rounded-[4px] bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold font-mono text-[10.5px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer border border-black/20 shadow-xs"
                        >
                          <GiTrashCan className="w-3 h-3" />
                          Delete
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-input/50 p-2 rounded-[4px] border border-border text-[10.5px] font-mono">
                        <div className="truncate">
                          <span className="text-muted-foreground">GIVE: </span>
                          <span className="text-foreground">
                            {(ad.give_items || [])
                              .map((i) => `${i.qty}×${i.name}`)
                              .join(", ") || "—"}
                          </span>
                        </div>
                        <div className="truncate border-l border-border pl-2">
                          <span className="text-muted-foreground">GET: </span>
                          <span className="text-foreground">
                            {(ad.get_items || [])
                              .map((i) => `${i.qty}×${i.name}`)
                              .join(", ") || "Offers"}
                          </span>
                        </div>
                      </div>

                      {ad.note && (
                        <div className="text-[11px] font-mono text-muted-foreground truncate">
                          “{ad.note}”
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: MASTER LAB (STRICTLY MASTER ONLY — CLEAN, DENSE CONTROLS)
      ===================================================================== */}
      {activeTab === "master-lab" && isMaster && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 animate-fade-in">
          <div className="max-w-6xl mx-auto flex flex-col gap-4 pb-8">
            {/* Compact Target Picker Bar */}
            <div className="bg-card border border-border rounded-[6px] p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GiCrown className="w-4 h-4 text-[#eab308]" />
                <span className="text-[12px] text-foreground">
                  Target Account:
                </span>
                <select
                  value={effectiveCheatTarget?.id || ""}
                  onChange={(e) => setCheatTargetUserId(e.target.value)}
                  className="h-8 bg-input border border-border rounded-[4px] px-2.5 text-[11px] font-mono text-foreground focus:border-[#eab308] outline-none"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </select>
                {profile?.id && effectiveCheatTarget?.id !== profile.id && (
                  <button
                    type="button"
                    onClick={() => setCheatTargetUserId(profile.id)}
                    className="h-8 px-2.5 rounded-[4px] bg-[#eab308]/15 hover:bg-[#eab308]/25 border border-[#eab308]/40 text-[#eab308] text-[10.5px] font-mono cursor-pointer"
                  >
                    Target Self
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                <span>
                  Rep:{" "}
                  <strong className="text-[#23a559]">
                    {effectiveCheatTarget?.global_rep ?? 0}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (effectiveCheatTarget) {
                      setSelectedUser(effectiveCheatTarget);
                      setActiveTab("users");
                    }
                  }}
                  className="text-primary hover:underline cursor-pointer"
                >
                  Open in Inspector →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left 7 Cols: Vault Unit Injector */}
              <div className="lg:col-span-7 bg-card border border-border rounded-[6px] p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
                  <span className="text-[12px] text-foreground flex items-center gap-1.5">
                    <GiChest className="w-3.5 h-3.5 text-[#eab308]" />
                    Vault Injector
                  </span>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={cheatUnitMode}
                      onChange={(e) =>
                        setCheatUnitMode(
                          e.target.value as "add" | "set" | "remove"
                        )
                      }
                      className="h-7 bg-input border border-border rounded-[4px] px-2 text-[11px] font-mono text-foreground outline-none"
                    >
                      <option value="add">+ Add</option>
                      <option value="set">= Set</option>
                      <option value="remove">- Remove</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={cheatUnitQty}
                      onChange={(e) =>
                        setCheatUnitQty(
                          Math.max(
                            1,
                            Math.min(9999, parseInt(e.target.value) || 1)
                          )
                        )
                      }
                      className="w-16 h-7 bg-input border border-border rounded-[4px] px-2 text-[11px] font-mono text-foreground outline-none"
                      title="Quantity"
                    />
                    <button
                      type="button"
                      disabled={!effectiveCheatTarget || !cheatSelectedUnitId}
                      onClick={() => {
                        if (!effectiveCheatTarget || !cheatSelectedUnitId)
                          return;
                        masterModifyVaultUnit(
                          effectiveCheatTarget.id,
                          cheatSelectedUnitId,
                          cheatUnitQty,
                          cheatUnitMode
                        );
                      }}
                      className="h-7 px-3 rounded-[4px] bg-[#eab308] hover:bg-[#eab308]/90 disabled:opacity-40 text-black text-[11px] font-mono font-bold cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={cheatUnitSearch}
                  onChange={(e) => setCheatUnitSearch(e.target.value)}
                  placeholder="Search unit to inject…"
                  className="w-full h-8 bg-input border border-border rounded-[4px] px-2.5 text-[11px] font-mono text-foreground outline-none focus:border-[#eab308]"
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                  {matchingCheatUnits.map((u) => {
                    const isSelected = cheatSelectedUnitId === u.id;
                    const proxyUrl = getProxyImage(u.id, u.imageUrl);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setCheatSelectedUnitId(u.id)}
                        className={`p-1.5 rounded-[5px] border text-left flex items-center gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#eab308]/15 border-[#eab308]"
                            : "bg-input/50 hover:bg-input border-border"
                        }`}
                      >
                        <div className="w-7 h-7 rounded bg-card border border-border overflow-hidden shrink-0 flex items-center justify-center text-[9px]">
                          {proxyUrl ? (
                            <img
                              src={proxyUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => handleImageError(e, u.id)}
                            />
                          ) : (
                            getInitials(u.name)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-foreground truncate">
                            {u.name}
                          </div>
                          <div className="text-[9px] font-mono text-muted-foreground truncate">
                            {u.valueDisplay || u.value}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right 5 Cols: Reputation + Identity Override + Cache */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Reputation Control */}
                <div className="bg-card border border-border rounded-[6px] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-[12px] text-foreground">
                      Reputation
                    </span>
                    <span className="text-[11px] font-mono text-[#23a559]">
                      {effectiveCheatTarget?.global_rep ?? 0} Rep
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: "-50", delta: -50 },
                      { label: "+10", delta: 10 },
                      { label: "+100", delta: 100 },
                      { label: "+1K", delta: 1000 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => {
                          if (!effectiveCheatTarget) return;
                          const next =
                            (effectiveCheatTarget.global_rep || 0) + btn.delta;
                          masterSetReputation(
                            effectiveCheatTarget.id,
                            next,
                            `Quick rep ${btn.label}`
                          );
                        }}
                        className="h-7 px-2.5 rounded-[4px] bg-input hover:bg-muted border border-border text-[11px] font-mono text-foreground cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        if (!effectiveCheatTarget) return;
                        masterSetReputation(
                          effectiveCheatTarget.id,
                          0,
                          "Reset rep to 0"
                        );
                      }}
                      className="h-7 px-2.5 rounded-[4px] bg-destructive/15 hover:bg-destructive text-destructive hover:text-white border border-destructive/40 text-[11px] font-mono cursor-pointer"
                    >
                      0
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={cheatRepInput}
                      onChange={(e) => setCheatRepInput(e.target.value)}
                      placeholder="Exact rep…"
                      className="flex-1 h-8 bg-input border border-border rounded-[4px] px-2.5 text-[11px] font-mono text-foreground outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!effectiveCheatTarget) return;
                        masterSetReputation(
                          effectiveCheatTarget.id,
                          parseInt(cheatRepInput) || 0,
                          "Set exact rep"
                        );
                      }}
                      className="h-8 px-3.5 rounded-[4px] bg-primary text-primary-foreground text-[11px] font-mono cursor-pointer"
                    >
                      Set Rep
                    </button>
                  </div>
                </div>

                {/* Profile Override */}
                <div className="bg-card border border-border rounded-[6px] p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-[12px] text-foreground">
                      Profile Override
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!effectiveCheatTarget) return;
                        setOverrideUsername(
                          effectiveCheatTarget.username || ""
                        );
                        setOverrideRoblox(
                          effectiveCheatTarget.roblox_username || ""
                        );
                        setOverrideBio(effectiveCheatTarget.bio || "");
                      }}
                      className="text-[10.5px] font-mono text-primary hover:underline cursor-pointer"
                    >
                      Load Current
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={overrideUsername}
                      onChange={(e) => setOverrideUsername(e.target.value)}
                      placeholder="Username…"
                      className="h-8 bg-input border border-border rounded-[4px] px-2.5 text-[11px] font-mono text-foreground outline-none"
                    />
                    <input
                      type="text"
                      value={overrideRoblox}
                      onChange={(e) => setOverrideRoblox(e.target.value)}
                      placeholder="Roblox handle…"
                      className="h-8 bg-input border border-border rounded-[4px] px-2.5 text-[11px] font-mono text-foreground outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={overrideBio}
                    onChange={(e) => setOverrideBio(e.target.value)}
                    placeholder="Bio…"
                    className="h-8 bg-input border border-border rounded-[4px] px-2.5 text-[11px] font-mono text-foreground outline-none"
                  />
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!effectiveCheatTarget) return;
                        const baseHex =
                          (effectiveCheatTarget.banner_color || "#121214").split(
                            "|"
                          )[0] || "#121214";
                        masterOverrideProfile(
                          effectiveCheatTarget.id,
                          { banner_color: `${baseHex}|ahp=1&wlp=1&hdi=0` },
                          "Unhide privacy flags"
                        );
                      }}
                      className="h-7 px-2.5 rounded bg-input hover:bg-muted border border-border text-[10.5px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Unhide Privacy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!effectiveCheatTarget) return;
                        const patch: Record<string, string> = {};
                        if (overrideUsername.trim())
                          patch.username = overrideUsername.trim();
                        if (overrideRoblox.trim())
                          patch.roblox_username = overrideRoblox.trim();
                        if (overrideBio.trim()) patch.bio = overrideBio.trim();
                        if (Object.keys(patch).length === 0) return;
                        masterOverrideProfile(effectiveCheatTarget.id, patch);
                      }}
                      className="h-7 px-3 rounded bg-[#eab308] text-black text-[10.5px] font-mono font-bold cursor-pointer"
                    >
                      Save Override
                    </button>
                  </div>
                </div>

                {/* System Maintenance */}
                <div className="bg-card border border-border rounded-[6px] p-4 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-mono text-muted-foreground">
                    Units: <strong className="text-foreground">{ALL_UNITS.length}</strong> • Comments: <strong className="text-foreground">{metrics.totalComments}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem("astd_units_cache_v1");
                      showToast("Cache cleared. Reloading…");
                      setTimeout(() => window.location.reload(), 500);
                    }}
                    className="h-7 px-2.5 rounded bg-input hover:bg-muted border border-border text-[10.5px] font-mono text-foreground cursor-pointer shrink-0"
                  >
                    Flush Sheet Cache
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: USER DIRECTORY & INSPECTOR
      ===================================================================== */}
      {activeTab === "users" && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden z-10">
          {/* LEFT DIRECTORY COLUMN */}
          <div className="w-full lg:w-[330px] xl:w-[360px] bg-card border-b lg:border-b-0 lg:border-r border-border flex flex-col shrink-0 h-[36vh] lg:h-full">
            <div className="p-3 border-b border-border flex flex-col gap-2 bg-card">
              <form onSubmit={handleSearch} className="relative">
                <GiMagnifyingGlass className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user, Roblox, or ID…"
                  className="w-full h-8 bg-input text-foreground text-[11px] font-mono pl-8 pr-7 rounded-[5px] border border-border focus:border-primary outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      fetchUsers("", showBannedOnly);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[10px] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </form>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {ROLE_FILTERS.map((rf) => {
                  const active =
                    (rf.id === "banned" && showBannedOnly) ||
                    (!showBannedOnly && roleFilter === rf.id);
                  return (
                    <button
                      key={rf.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        if (rf.id === "banned") {
                          setShowBannedOnly(true);
                          setRoleFilter("all");
                        } else {
                          setShowBannedOnly(false);
                          setRoleFilter(rf.id);
                        }
                      }}
                      className={`px-2 py-0.5 rounded-[4px] text-[10px] font-mono whitespace-nowrap transition-colors cursor-pointer border ${
                        active
                          ? "bg-primary/20 text-primary border-primary/50"
                          : "bg-input/60 text-muted-foreground hover:text-foreground border-border"
                      }`}
                    >
                      {rf.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1">
              {isLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 rounded-[5px] bg-input/60 border border-border animate-pulse"
                  />
                ))
              ) : users.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground text-[11px] font-mono">
                  No matching accounts.
                </div>
              ) : (
                users.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  const isBanned =
                    u.role === "banned" || u.assigned_roles?.includes("banned");
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setSelectedUser(u);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-[5px] border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary/15 border-primary/60"
                          : "bg-input/40 border-border hover:bg-input"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <UserAvatar
                            avatarUrl={u.avatar_url}
                            username={u.username}
                            discordId={u.discord_id}
                            className="w-8 h-8 rounded-full border border-border"
                          />
                          <span
                            className="w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border border-card"
                            style={{
                              backgroundColor:
                                u.effectiveStatus === "online"
                                  ? "#23a559"
                                  : u.effectiveStatus === "dnd"
                                  ? "#ef4444"
                                  : "#71717a",
                            }}
                            title={`Status: ${(u.effectiveStatus || "offline").toUpperCase()}`}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-[12px] truncate ${
                              isBanned
                                ? "text-destructive line-through"
                                : "text-foreground"
                            }`}
                          >
                            {u.username}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground truncate">
                            {u.global_rep ?? 0} Rep
                            {u.roblox_username
                              ? ` • @${u.roblox_username}`
                              : ""}
                          </span>
                        </div>
                      </div>

                      <DiscordRolePill
                        name={u.role || "user"}
                        color={getRoleColor(u.role)}
                        size="xs"
                        className="ml-2"
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT WORKSPACE */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 bg-background">
            {!selectedUser ? (
              <div className="max-w-5xl mx-auto flex flex-col gap-4 animate-fade-in">
                {/* Compact Telemetry Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                  <div className="bg-card border border-border rounded-[6px] p-3">
                    <div className="text-[10px] text-muted-foreground">
                      USERS
                    </div>
                    <div className="text-[18px] font-bold text-foreground mt-0.5">
                      {metrics.totalUsers.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-[6px] p-3">
                    <div className="text-[10px] text-muted-foreground">
                      STAFF
                    </div>
                    <div className="text-[18px] font-bold text-[#eab308] mt-0.5">
                      {metrics.staffCount}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-[6px] p-3">
                    <div className="text-[10px] text-muted-foreground">
                      LIVE ADS
                    </div>
                    <div className="text-[18px] font-bold text-[#23a559] mt-0.5">
                      {metrics.activeAds}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-[6px] p-3">
                    <div className="text-[10px] text-muted-foreground">
                      BANNED
                    </div>
                    <div className="text-[18px] font-bold text-destructive mt-0.5">
                      {metrics.bannedUsers}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* Quick Roster */}
                  <div className="lg:col-span-6 bg-card border border-border rounded-[6px] p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-[12px] text-foreground">
                        Accounts
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Select to inspect
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {users.slice(0, 10).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          className="p-2 rounded-[5px] bg-input/50 hover:bg-input border border-border flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <UserAvatar
                              avatarUrl={u.avatar_url}
                              username={u.username}
                              discordId={u.discord_id}
                              className="w-6 h-6 rounded-full shrink-0"
                            />
                            <span className="text-[11.5px] text-foreground truncate">
                              {u.username}
                            </span>
                          </div>
                          <DiscordRolePill
                            name={u.role}
                            color={getRoleColor(u.role)}
                            size="xs"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audit Log Stream */}
                  <div className="lg:col-span-6 bg-card border border-border rounded-[6px] p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-[12px] text-foreground flex items-center gap-1.5">
                        <GiScrollUnfurled className="w-3.5 h-3.5 text-primary" />
                        Audit Stream
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {globalLogs.length}
                      </span>
                    </div>

                    {globalLogs.length === 0 ? (
                      <div className="p-6 text-center text-[11px] font-mono text-muted-foreground bg-input/40 rounded-[5px] border border-border">
                        No logs recorded.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                        {globalLogs.slice(0, 12).map((log) => (
                          <div
                            key={log.id}
                            className="p-2 rounded-[5px] bg-input/50 border border-border flex flex-col gap-0.5 font-mono"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10.5px] font-bold text-primary truncate">
                                {log.action_type}
                              </span>
                              <span className="text-[9.5px] text-muted-foreground shrink-0">
                                {new Date(log.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-[10.5px] text-foreground truncate">
                              “{log.reason}” —{" "}
                              <span className="text-muted-foreground">
                                {log.profiles?.username || "Staff"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ===============================================================
                 SELECTED USER INSPECTOR
              =============================================================== */
              <div className="max-w-5xl mx-auto flex flex-col gap-4 animate-fade-in">
                <div className="bg-card border border-border rounded-[6px] overflow-hidden">
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        avatarUrl={selectedUser.avatar_url}
                        username={selectedUser.username}
                        discordId={selectedUser.discord_id}
                        className="w-12 h-12 rounded-full shrink-0 border border-border"
                      />

                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h2 className="text-[16px] text-foreground truncate">
                            {selectedUser.username}
                          </h2>
                          {(
                            selectedUser.assigned_roles || [selectedUser.role]
                          ).map((rName) => (
                            <DiscordRolePill
                              key={rName}
                              name={rName}
                              color={getRoleColor(rName)}
                              size="sm"
                            />
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono text-muted-foreground">
                          {selectedUser.discord_id &&
                            (!selectedUser.hide_discord_id || isMaster) && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyText(
                                    selectedUser.discord_id,
                                    "Discord ID"
                                  )
                                }
                                className="hover:text-foreground cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>ID: {selectedUser.discord_id}</span>
                                {copiedId === selectedUser.discord_id ? (
                                  <GiCheckMark className="w-3 h-3 text-[#23a559]" />
                                ) : (
                                  <svg
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    className="w-3 h-3 text-muted-foreground shrink-0"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                  >
                                    <rect x="5" y="5" width="8" height="8" rx="1.5" />
                                    <path d="M3 11V3.5C3 2.95 3.45 2.5 4 2.5H11" />
                                  </svg>
                                )}
                              </button>
                            )}
                          {selectedUser.roblox_username && (
                            <span>@{selectedUser.roblox_username}</span>
                          )}
                          <span>
                            Joined{" "}
                            {new Date(
                              selectedUser.created_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingProfile(selectedUser.id, "admin-panel");
                          setViewingUser(
                            selectedUser.id,
                            selectedUser.username,
                            "admin-panel"
                          );
                          jumpToChannel("profile");
                        }}
                        className="h-8 px-3 bg-input hover:bg-muted text-foreground rounded-[4px] text-[11px] font-mono border border-border cursor-pointer"
                      >
                        Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setViewingProfile(selectedUser.id, "admin-panel");
                          setViewingUser(
                            selectedUser.id,
                            selectedUser.username,
                            "admin-panel"
                          );
                          jumpToChannel("inventory");
                        }}
                        className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[4px] text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
                      >
                        <GiBackpack className="w-3.5 h-3.5" />
                        Vault
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedUser(null)}
                        className="h-8 px-2.5 bg-input hover:bg-muted text-muted-foreground hover:text-foreground rounded-[4px] text-[11px] font-mono border border-border cursor-pointer"
                        title="Close inspector"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* 4 Key Stats */}
                  <div
                    className="grid grid-cols-2 sm:grid-cols-4 border-t border-border bg-input/40 divide-y sm:divide-y-0 sm:divide-x divide-border font-mono"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    <div className="p-2.5 px-3.5 flex flex-col">
                      <span className="text-[9.5px] text-muted-foreground">
                        NET WORTH
                      </span>
                      <span className="text-[14px] font-bold text-[#eab308]">
                        {userIntel.isLoading
                          ? "…"
                          : userIntel.netWorth.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 px-3.5 flex flex-col">
                      <span className="text-[9.5px] text-muted-foreground">
                        VAULT UNITS
                      </span>
                      <span className="text-[14px] font-bold text-foreground">
                        {userIntel.isLoading
                          ? "…"
                          : `${userIntel.unitCount.toLocaleString()} (${
                              userIntel.inventoryItems.length
                            })`}
                      </span>
                    </div>
                    <div className="p-2.5 px-3.5 flex flex-col">
                      <span className="text-[9.5px] text-muted-foreground">
                        ADS
                      </span>
                      <span className="text-[14px] font-bold text-[#23a559]">
                        {userIntel.isLoading
                          ? "…"
                          : `${userIntel.adCount} Live / ${userIntel.totalAdsCount}`}
                      </span>
                    </div>
                    <div className="p-2.5 px-3.5 flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] text-muted-foreground">
                          REPUTATION
                        </span>
                        {isMaster && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                masterSetReputation(
                                  selectedUser.id,
                                  (selectedUser.global_rep || 0) + 10
                                )
                              }
                              className="px-1 rounded bg-card border border-border text-[9px] text-[#23a559] hover:border-[#23a559] cursor-pointer"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                masterSetReputation(
                                  selectedUser.id,
                                  (selectedUser.global_rep || 0) - 10
                                )
                              }
                              className="px-1 rounded bg-card border border-border text-[9px] text-destructive hover:border-destructive cursor-pointer"
                            >
                              -10
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-[14px] font-bold text-foreground">
                        {(selectedUser.global_rep ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {targetIsProtectedFromCaller && (
                  <div className="bg-[#FAA61A]/10 border border-[#FAA61A]/40 rounded-[6px] p-2.5 px-3.5 flex items-center gap-2 text-[#FAA61A] text-[11px] font-mono">
                    <GiPadlock className="w-4 h-4 shrink-0" />
                    <span>
                      Read-only: {selectedUser.username} holds equal/higher rank (
                      {selectedUser.role.toUpperCase()}).
                    </span>
                  </div>
                )}

                {/* Inspector Sub-Navigation */}
                <div className="flex items-center gap-1 border-b border-border pb-1.5 overflow-x-auto no-scrollbar">
                  {(
                    [
                      { id: "overview", label: "Controls" },
                      {
                        id: "ads",
                        label: `Ads (${userIntel.userAds.length})`,
                      },
                      ...(isMaster
                        ? [
                            {
                              id: "vault",
                              label: `Vault (${userIntel.inventoryItems.length})`,
                            },
                          ]
                        : []),
                      { id: "logs", label: `Logs (${modLogs.length})` },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setInspectorSubTab(st.id as any)}
                      className={`px-3 py-1 rounded-[4px] text-[11px] font-mono transition-colors cursor-pointer shrink-0 ${
                        inspectorSubTab === st.id
                          ? "bg-card text-foreground border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* SUB-TAB 1: ROLES & SANCTIONS */}
                {inspectorSubTab === "overview" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Role Assignment */}
                    <div className="lg:col-span-5 bg-card border border-border rounded-[6px] p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-[12px] text-foreground flex items-center gap-1.5">
                          <GiKey className="w-3.5 h-3.5 text-primary" />
                          Roles
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {isMaster
                            ? "All Ranks"
                            : isAdmin
                            ? "Mod & Custom"
                            : "Custom Only"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {availableRoles
                          .filter((r) => r.name !== "banned")
                          .map((r) => {
                            const hasRole =
                              selectedUser.assigned_roles?.includes(r.name) ||
                              selectedUser.role === r.name;
                            const allowed = canToggleRole(r.name, selectedUser);

                            return (
                              <button
                                key={r.name}
                                type="button"
                                disabled={!allowed}
                                onClick={() =>
                                  setModActionData({
                                    type: "role",
                                    payload: r.name,
                                    label: `${
                                      hasRole ? "Revoke" : "Grant"
                                    } ${r.name.toUpperCase()}`,
                                    isDestructive: false,
                                  })
                                }
                                style={{
                                  borderColor: hasRole
                                    ? getContrastTextColor(r.color) === "#000000"
                                      ? "rgba(0, 0, 0, 0.25)"
                                      : "rgba(255, 255, 255, 0.2)"
                                    : "var(--border)",
                                  backgroundColor: hasRole
                                    ? r.color
                                    : "var(--input)",
                                  color: hasRole
                                    ? getContrastTextColor(r.color)
                                    : "var(--muted-foreground)",
                                }}
                                className={`h-7 px-2.5 rounded-[4px] border text-[10.5px] font-mono uppercase flex items-center gap-1 ${
                                  !allowed
                                    ? "opacity-40 cursor-not-allowed"
                                    : "cursor-pointer hover:brightness-110"
                                }`}
                              >
                                {!allowed ? (
                                  <GiPadlock className="w-2.5 h-2.5" />
                                ) : hasRole ? (
                                  <GiCheckMark className="w-2.5 h-2.5" />
                                ) : null}
                                {r.name}
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Actions by Clearance */}
                    <div className="lg:col-span-7 bg-card border border-border rounded-[6px] p-4 flex flex-col gap-3">
                      <span className="text-[12px] text-foreground border-b border-border pb-2 flex items-center gap-1.5">
                        <GiHammerDrop className="w-3.5 h-3.5 text-[#FAA61A]" />
                        Moderation Actions
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Mod+ Action: Issue Warning */}
                        <button
                          type="button"
                          disabled={targetIsProtectedFromCaller}
                          onClick={() =>
                            setModActionData({
                              type: "warn",
                              label: `Issue Formal Warning to @${selectedUser.username}`,
                              isDestructive: false,
                            })
                          }
                          className="h-8 px-3 rounded-[4px] bg-input hover:bg-[#f97316]/15 border border-border hover:border-[#f97316]/50 text-foreground hover:text-[#f97316] text-[11px] font-mono flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span>Issue Warning</span>
                          <span className="text-[9.5px] opacity-70">
                            MOD+
                          </span>
                        </button>

                        {/* Mod+ Action: Purge Ads */}
                        <button
                          type="button"
                          disabled={targetIsProtectedFromCaller}
                          onClick={() =>
                            setModActionData({
                              type: "purge_ads",
                              label: "Purge User Ads",
                              isDestructive: true,
                            })
                          }
                          className="h-8 px-3 rounded-[4px] bg-input hover:bg-destructive/15 border border-border hover:border-destructive/50 text-foreground hover:text-destructive text-[11px] font-mono flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span>Purge Active Ads</span>
                          <span className="text-[9.5px] opacity-70">
                            MOD+ ({userIntel.adCount})
                          </span>
                        </button>

                        {/* Admin+ Action: Reset Profile */}
                        <button
                          type="button"
                          disabled={
                            !canManageUsers || targetIsProtectedFromCaller
                          }
                          onClick={() =>
                            setModActionData({
                              type: "reset_profile",
                              label: "Reset Profile Info",
                              isDestructive: false,
                            })
                          }
                          className="h-8 px-3 rounded-[4px] bg-input hover:bg-[#FAA61A]/15 border border-border hover:border-[#FAA61A]/50 text-foreground hover:text-[#FAA61A] text-[11px] font-mono flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span>Reset Profile Info</span>
                          <span className="text-[9.5px] opacity-70">
                            ADMIN+
                          </span>
                        </button>

                        {/* Admin+ Action: Purge Comments */}
                        <button
                          type="button"
                          disabled={
                            !canManageUsers || targetIsProtectedFromCaller
                          }
                          onClick={() =>
                            setModActionData({
                              type: "purge_comments",
                              label: "Purge Comments",
                              isDestructive: true,
                            })
                          }
                          className="h-8 px-3 rounded-[4px] bg-input hover:bg-destructive/15 border border-border hover:border-destructive/50 text-foreground hover:text-destructive text-[11px] font-mono flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span>Purge Comments</span>
                          <span className="text-[9.5px] opacity-70">
                            ADMIN+ ({userIntel.commentCount})
                          </span>
                        </button>

                        {/* Admin+ Action: Ban / Unban */}
                        {!selectedUser.assigned_roles?.includes("banned") &&
                        selectedUser.role !== "banned" ? (
                          <button
                            type="button"
                            disabled={
                              !canManageUsers || targetIsProtectedFromCaller
                            }
                            onClick={() =>
                              setModActionData({
                                type: "ban",
                                payload: "banned",
                                label: `Ban ${selectedUser.username}`,
                                isDestructive: true,
                              })
                            }
                            className="h-8 px-3 rounded-[4px] bg-[#ef4444] hover:bg-[#dc2626] text-white border border-black/20 shadow-xs text-[11px] font-mono font-bold flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <span>Ban Account</span>
                            <span className="text-[9.5px] opacity-80">
                              ADMIN+
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              !canManageUsers || targetIsProtectedFromCaller
                            }
                            onClick={() =>
                              setModActionData({
                                type: "ban",
                                payload: "user",
                                label: "Revoke Ban",
                                isDestructive: false,
                              })
                            }
                            className="h-8 px-3 rounded-[4px] bg-[#23a559] hover:bg-[#16a34a] text-white border border-black/20 shadow-xs text-[11px] font-mono font-bold flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <span>Unban Account</span>
                            <span className="text-[9.5px] opacity-80">
                              ADMIN+
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Master-Only Destructive Row */}
                      {isMaster && (
                        <div className="pt-2 border-t border-border flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setModActionData({
                                  type: "wipe_inv",
                                  label: "Wipe Vault Inventory",
                                  isDestructive: true,
                                })
                              }
                              className="h-8 px-3 rounded-[4px] bg-input hover:bg-destructive/15 border border-border hover:border-destructive text-muted-foreground hover:text-destructive text-[11px] font-mono cursor-pointer"
                            >
                              Wipe Vault ({userIntel.unitCount})
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setModActionData({
                                  type: "wipe_wishlist",
                                  label: "Wipe Wishlist",
                                  isDestructive: true,
                                })
                              }
                              className="h-8 px-3 rounded-[4px] bg-input hover:bg-destructive/15 border border-border hover:border-destructive text-muted-foreground hover:text-destructive text-[11px] font-mono cursor-pointer"
                            >
                              Wipe Wishlist ({userIntel.wishlistCount})
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={selectedUser.id === profile?.id}
                            onClick={() =>
                              setModActionData({
                                type: "nuke",
                                label: "Total Account Nuke",
                                isDestructive: true,
                              })
                            }
                            className="w-full h-8 rounded-[4px] bg-destructive/15 hover:bg-destructive border border-destructive text-destructive hover:text-white text-[11px] font-mono font-bold uppercase cursor-pointer disabled:opacity-40"
                          >
                            Nuke & Ban Account (Master)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: USER ADS */}
                {inspectorSubTab === "ads" && (
                  <div className="bg-card border border-border rounded-[6px] p-4 flex flex-col gap-2.5">
                    {userIntel.userAds.length === 0 ? (
                      <div className="p-6 text-center text-[11px] font-mono text-muted-foreground">
                        No ads found for this user.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {userIntel.userAds.map((ad) => {
                          const isExpired =
                            new Date(ad.expires_at).getTime() <= Date.now();
                          return (
                            <div
                              key={ad.id}
                              className="p-3 rounded-[5px] bg-input/50 border border-border flex flex-col gap-1.5 font-mono text-[11px]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  #{ad.id.slice(0, 8)}{" "}
                                  {isExpired ? "(Exp)" : "(Live)"}
                                </span>
                                <button
                                  type="button"
                                  disabled={targetIsProtectedFromCaller}
                                  onClick={() =>
                                    setModActionData({
                                      type: "delete_single_ad",
                                      payload: ad.id,
                                      extraTargetUserId: selectedUser.id,
                                      label: `Delete Ad #${ad.id.slice(0, 6)}`,
                                      isDestructive: true,
                                    })
                                  }
                                  className="px-2 py-0.5 rounded bg-destructive/15 hover:bg-destructive text-destructive hover:text-white text-[10px] cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                              <div className="truncate text-foreground">
                                Give:{" "}
                                {(ad.give_items || [])
                                  .map((i) => `${i.qty}×${i.name}`)
                                  .join(", ") || "—"}
                              </div>
                              <div className="truncate text-foreground">
                                Get:{" "}
                                {(ad.get_items || [])
                                  .map((i) => `${i.qty}×${i.name}`)
                                  .join(", ") || "Offers"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-TAB 3: MASTER VAULT EDITOR */}
                {inspectorSubTab === "vault" && isMaster && (
                  <div className="bg-card border border-border rounded-[6px] p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-[12px] text-foreground">
                        Vault Items ({userIntel.inventoryItems.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCheatTargetUserId(selectedUser.id);
                          setActiveTab("master-lab");
                        }}
                        className="h-7 px-2.5 rounded bg-[#eab308] text-black text-[10.5px] font-mono font-bold cursor-pointer"
                      >
                        + Inject Units
                      </button>
                    </div>

                    {userIntel.inventoryItems.length === 0 ? (
                      <div className="p-6 text-center text-[11px] font-mono text-muted-foreground">
                        Vault is empty.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                        {userIntel.inventoryItems.map((item) => {
                          const master = ALL_UNITS.find(
                            (u) => u.id === item.unit_id
                          );
                          return (
                            <div
                              key={item.unit_id}
                              className="p-2 rounded-[5px] bg-input/60 border border-border flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-[11.5px] text-foreground truncate">
                                  {master?.name || item.unit_id}
                                </div>
                                <div className="text-[10px] font-mono text-[#eab308]">
                                  ×{item.quantity}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    masterModifyVaultUnit(
                                      selectedUser.id,
                                      item.unit_id,
                                      1,
                                      "add"
                                    )
                                  }
                                  className="w-6 h-6 rounded bg-card border border-border text-[#23a559] cursor-pointer"
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    masterModifyVaultUnit(
                                      selectedUser.id,
                                      item.unit_id,
                                      1,
                                      "remove"
                                    )
                                  }
                                  className="w-6 h-6 rounded bg-card border border-border text-[#FAA61A] cursor-pointer"
                                >
                                  -1
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    masterModifyVaultUnit(
                                      selectedUser.id,
                                      item.unit_id,
                                      0,
                                      "set"
                                    )
                                  }
                                  className="w-6 h-6 rounded bg-destructive/15 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-TAB 4: AUDIT LOGS */}
                {inspectorSubTab === "logs" && (
                  <div className="bg-card border border-border rounded-[6px] p-4 flex flex-col gap-2">
                    {modLogs.length === 0 ? (
                      <div className="p-6 text-center text-[11px] font-mono text-muted-foreground">
                        No moderation history.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto custom-scrollbar pr-1 font-mono">
                        {modLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-2.5 rounded-[5px] bg-input/60 border border-border flex flex-col gap-0.5"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-destructive">
                                {log.action_type}
                              </span>
                              <span className="text-[9.5px] text-muted-foreground">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-[11px] text-foreground">
                              “{log.reason}” —{" "}
                              <span className="text-muted-foreground">
                                {log.profiles?.username || "Staff"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {modActionData && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="bg-card border border-border rounded-[6px] p-5 max-w-sm w-full shadow-2xl flex flex-col gap-3">
            <h3 className="text-[14px] text-foreground border-b border-border pb-2.5">
              {modActionData.label}
            </h3>

            <textarea
              value={modReason}
              onChange={(e) => setModReason(e.target.value)}
              placeholder="Audit reason…"
              className="bg-input text-foreground text-[12px] font-mono p-2.5 rounded-[4px] border border-border focus:border-primary outline-none resize-none h-20"
              required
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setModActionData(null);
                  setModReason("");
                }}
                className="flex-1 h-9 rounded-[4px] bg-muted hover:bg-muted/80 border border-border text-foreground text-[11px] font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeModAction}
                disabled={!modReason.trim()}
                className={`flex-1 h-9 rounded-[4px] text-white text-[11px] font-mono disabled:opacity-40 cursor-pointer ${
                  modActionData.isDestructive
                    ? "bg-destructive hover:bg-destructive/90"
                    : "bg-[#FAA61A] hover:bg-[#d98b14]"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification — Positioned clear of mobile bottom bar */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[100000] animate-slide-up"
        >
          <div
            className={`px-3.5 py-2.5 rounded-[6px] shadow-xl flex items-center gap-2.5 border font-mono text-[11.5px] ${
              toast.type === "error"
                ? "bg-popover border-destructive/50 text-destructive"
                : "bg-popover border-[#23a559]/50 text-[#23a559]"
            }`}
          >
            {toast.type === "error" ? (
              <GiCrossMark className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <GiCheckMark className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
