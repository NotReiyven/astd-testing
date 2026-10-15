import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import {
  useAuthStore,
  UserProfile as AuthUserProfile,
} from "../store/useAuthStore";
import {
  unpackProfileRow,
  packBannerConfig,
  useProfileStore,
  UserProfileData,
} from "../store/useProfileStore";
import { TradingAd } from "../store/useTradingAdsStore";
import { useUnits } from "../context/UnitContext";
import { logger } from "../lib/logger";
import { triggerHaptic } from "../data/helpers";
import {
  EffectiveStatus,
  getEffectiveStatus,
  usePresenceStore,
} from "./usePresence";

export interface UserProfile
  extends AuthUserProfile,
    Omit<Partial<UserProfileData>, keyof AuthUserProfile> {
  assigned_roles: string[];
  effectiveStatus?: EffectiveStatus;
}

export interface SystemMetrics {
  totalUsers: number;
  activeAds: number;
  expiredAds: number;
  bannedUsers: number;
  staffCount: number;
  totalComments: number;
}

export interface RolePermissions {
  manage_roles?: boolean;
  manage_users?: boolean;
  manage_ads?: boolean;
  manage_comments?: boolean;
  view_audit_logs?: boolean;
  access_master_lab?: boolean;
  override_rep?: boolean;
}

export interface RoleItem {
  name: string;
  color: string;
  rank: number;
  permissions?: RolePermissions;
}

export interface AdminComment {
  id: string;
  ad_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
    role?: string;
    discord_id?: string;
  };
}

export interface ModLog {
  id: string;
  target_user_id?: string;
  action_type: string;
  reason: string;
  created_at: string;
  moderator_id: string;
  profiles?: {
    username: string;
    avatar_url?: string;
    role?: string;
  };
  target_profile?: {
    username: string;
    avatar_url?: string;
    role?: string;
  };
}

export interface UserVaultItem {
  unit_id: string;
  quantity: number;
}

export interface UserWishlistItem {
  unit_id: string;
  priority?: string;
}

export interface DetailedUserIntel {
  netWorth: number;
  unitCount: number;
  adCount: number;
  totalAdsCount: number;
  wishlistCount: number;
  commentCount: number;
  inventoryItems: UserVaultItem[];
  wishlistItems: UserWishlistItem[];
  userAds: TradingAd[];
  isLoading: boolean;
}

interface SupabaseProfile extends AuthUserProfile {
  bio?: string;
  banner_color?: string;
  roblox_username?: string;
  global_rep?: number;
  user_roles?: { roles?: { name: string } }[];
}

export const CORE_SYSTEM_ROLES = ["master", "admin", "mod", "user", "banned"];

export const ROLE_PRIORITY: Record<string, number> = {
  master: 0,
  admin: 1,
  mod: 2,
  user: 3,
  banned: 99,
};

export const DEFAULT_ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  master: {
    manage_roles: true,
    manage_users: true,
    manage_ads: true,
    manage_comments: true,
    view_audit_logs: true,
    access_master_lab: true,
    override_rep: true,
  },
  admin: {
    manage_roles: true,
    manage_users: true,
    manage_ads: true,
    manage_comments: true,
    view_audit_logs: true,
    access_master_lab: false,
    override_rep: false,
  },
  mod: {
    manage_roles: true,
    manage_users: false,
    manage_ads: true,
    manage_comments: true,
    view_audit_logs: true,
    access_master_lab: false,
    override_rep: false,
  },
  user: {
    manage_roles: false,
    manage_users: false,
    manage_ads: false,
    manage_comments: false,
    view_audit_logs: false,
    access_master_lab: false,
    override_rep: false,
  },
};

export function computeUserPermissions(
  userRole: string,
  assignedRoles: string[] = [],
  availableRoles: RoleItem[] = []
): RolePermissions {
  if (userRole === "master" || assignedRoles.includes("master")) {
    return {
      manage_roles: true,
      manage_users: true,
      manage_ads: true,
      manage_comments: true,
      view_audit_logs: true,
      access_master_lab: true,
      override_rep: true,
    };
  }

  const result: RolePermissions = {
    manage_roles: false,
    manage_users: false,
    manage_ads: false,
    manage_comments: false,
    view_audit_logs: false,
    access_master_lab: false,
    override_rep: false,
  };

  const allRoleNames = [userRole, ...assignedRoles];
  for (const rName of allRoleNames) {
    const lower = rName.toLowerCase();
    const defaults = DEFAULT_ROLE_PERMISSIONS[lower];
    if (defaults) {
      for (const [k, v] of Object.entries(defaults)) {
        if (v) (result as any)[k] = true;
      }
    }
    const found = availableRoles.find((r) => r.name.toLowerCase() === lower);
    if (found?.permissions) {
      for (const [k, v] of Object.entries(found.permissions)) {
        if (v) (result as any)[k] = true;
      }
    }
  }
  return result;
}

export function getEffectiveRoleRank(
  roleName: string,
  availableRoles?: RoleItem[]
): number {
  const lower = (roleName || "user").toLowerCase();
  if (lower in ROLE_PRIORITY) return ROLE_PRIORITY[lower];
  const found = availableRoles?.find((r) => r.name.toLowerCase() === lower);
  return found ? Math.max(3, found.rank) : 10;
}

export function getUserHighestRank(
  user: Pick<UserProfile, "role" | "assigned_roles"> | null | undefined,
  availableRoles?: RoleItem[]
): number {
  if (!user) return 99;
  const roles = new Set<string>([
    (user.role || "user").toLowerCase(),
    ...(user.assigned_roles || []).map((r) => r.toLowerCase()),
  ]);
  if (roles.has("master")) return 0;
  if (roles.has("admin")) return 1;
  if (roles.has("mod")) return 2;
  if (roles.has("banned")) return 99;
  let best = 3;
  roles.forEach((r) => {
    const rank = getEffectiveRoleRank(r, availableRoles);
    if (rank < best) best = rank;
  });
  return best;
}

export function useAdminIntel() {
  const { profile } = useAuthStore();
  const { units: ALL_UNITS } = useUnits();

  const callerRole = (profile?.role || "user").toLowerCase() as
    | "master"
    | "admin"
    | "mod"
    | "user"
    | "banned";

  const isMaster = callerRole === "master";
  const isAdmin = callerRole === "admin";
  const isMod = callerRole === "mod";
  const canModerate = isMaster || isAdmin || isMod;

  // Strict capability flags matching the staff hierarchy:
  // Master: Everything + Debug/Cheats + Security + Destructive Vault/Account Nuke
  // Admin: Delete Ads + Manage Roles (non-master/non-admin) + Manage Users (Ban/Unban, Reset Profile, Purge Comments)
  // Mod: Manage Roles (community roles only) + Delete Ads
  const canManageUsers = isMaster || isAdmin;
  const canManageRoles = isMaster || isAdmin || isMod;
  const canDeleteAds = isMaster || isAdmin || isMod;
  const canUseDestructiveTools = isMaster;
  const canUseMasterTools = isMaster;

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userIntel, setUserIntel] = useState<DetailedUserIntel>({
    netWorth: 0,
    unitCount: 0,
    adCount: 0,
    totalAdsCount: 0,
    wishlistCount: 0,
    commentCount: 0,
    inventoryItems: [],
    wishlistItems: [],
    userAds: [],
    isLoading: false,
  });
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    activeAds: 0,
    expiredAds: 0,
    bannedUsers: 0,
    staffCount: 0,
    totalComments: 0,
  });
  const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([]);
  const [modLogs, setModLogs] = useState<ModLog[]>([]);
  const [globalLogs, setGlobalLogs] = useState<ModLog[]>([]);
  const [recentComments, setRecentComments] = useState<AdminComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [platformAds, setPlatformAds] = useState<TradingAd[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [showBannedOnly, setShowBannedOnly] = useState(false);
  const [toast, setToast] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = useCallback(
    (text: string, type: "success" | "error" = "success") => {
      setToast({ text, type });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  // Live server-side clearance check to prevent DevTools state spoofing
  const verifyLiveClearance = useCallback(
    async (
      allowedRoles: ("master" | "admin" | "mod")[],
      targetUser?: UserProfile | null
    ): Promise<{ ok: boolean; liveRole?: string }> => {
      if (!profile || !allowedRoles.includes(callerRole as any)) {
        showToast("Access denied: insufficient staff clearance.", "error");
        return { ok: false };
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        showToast("Session expired. Please sign in again.", "error");
        return { ok: false };
      }

      const { data: liveProfile, error } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .single();

      const liveRole = (liveProfile?.role || "user").toLowerCase();
      if (error || !allowedRoles.includes(liveRole as any)) {
        showToast(
          "Security Alert: Live role verification failed. Action blocked.",
          "error"
        );
        return { ok: false };
      }

      if (targetUser) {
        const targetHighest = getUserHighestRank(targetUser, availableRoles);
        const callerRank = ROLE_PRIORITY[liveRole] ?? 99;

        // Nobody except master can act on master; admin cannot act on master/admin; mod cannot act on master/admin/mod
        if (liveRole !== "master" && targetHighest <= callerRank) {
          showToast(
            `Hierarchy Violation: ${liveRole.toUpperCase()} cannot modify a user of equal or higher rank.`,
            "error"
          );
          return { ok: false };
        }
      }

      return { ok: true, liveRole };
    },
    [profile, callerRole, availableRoles, showToast]
  );

  // Check if current staff member is allowed to modify a target user in the UI
  const canActOnUser = useCallback(
    (target: UserProfile | null | undefined): boolean => {
      if (!target || !canModerate) return false;
      if (isMaster) return true;
      const targetRank = getUserHighestRank(target, availableRoles);
      const myRank = ROLE_PRIORITY[callerRole] ?? 99;
      return targetRank > myRank;
    },
    [canModerate, isMaster, availableRoles, callerRole]
  );

  // Check if current staff member can toggle a specific role on a target user
  const canToggleRole = useCallback(
    (roleName: string, target: UserProfile | null | undefined): boolean => {
      if (!target || !canManageRoles) return false;
      const normalized = roleName.toLowerCase();

      // Prevent stripping master or banning oneself
      if (
        target.id === profile?.id &&
        (normalized === "master" || normalized === "banned")
      ) {
        return false;
      }

      if (isMaster) return true;

      // Non-master staff cannot modify equal/higher rank users
      if (!canActOnUser(target)) return false;

      if (isAdmin) {
        // Admin can toggle mod, user, banned, and custom roles, but NEVER master or admin
        return normalized !== "master" && normalized !== "admin";
      }

      if (isMod) {
        // Mod can ONLY toggle custom community roles (cannot toggle master, admin, mod, user, or banned)
        return !CORE_SYSTEM_ROLES.includes(normalized);
      }

      return false;
    },
    [canManageRoles, profile?.id, isMaster, isAdmin, isMod, canActOnUser]
  );

  const loadMetrics = useCallback(async () => {
    if (!canModerate) return;
    const now = new Date().toISOString();
    const [
      usersRes,
      adsRes,
      expiredAdsRes,
      bannedRes,
      staffRes,
      commentsRes,
      rolesRes,
      globalLogsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("trading_ads")
        .select("id", { count: "exact", head: true })
        .gt("expires_at", now),
      supabase
        .from("trading_ads")
        .select("id", { count: "exact", head: true })
        .lte("expires_at", now),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "banned"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("role", ["master", "admin", "mod"]),
      supabase.from("ad_comments").select("id", { count: "exact", head: true }),
      supabase
        .from("roles")
        .select("name, color, rank, permissions")
        .order("rank", { ascending: true }),
      supabase
        .from("moderation_logs")
        .select(
          "*, profiles!moderation_logs_moderator_id_fkey(username, avatar_url, role)"
        )
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    setMetrics({
      totalUsers: usersRes.count || 0,
      activeAds: adsRes.count || 0,
      expiredAds: expiredAdsRes.count || 0,
      bannedUsers: bannedRes.count || 0,
      staffCount: staffRes.count || 0,
      totalComments: commentsRes.count || 0,
    });

    if (rolesRes.data) {
      setAvailableRoles(rolesRes.data as RoleItem[]);
    }

    if (globalLogsRes.data) {
      const logs = globalLogsRes.data as ModLog[];
      const targetIds = Array.from(
        new Set(logs.map((l) => l.target_user_id).filter(Boolean))
      ) as string[];

      if (targetIds.length > 0) {
        const { data: targetProfiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, role")
          .in("id", targetIds);

        const targetMap = new Map(targetProfiles?.map((p) => [p.id, p]));
        const enriched = logs.map((l) => ({
          ...l,
          target_profile: l.target_user_id
            ? targetMap.get(l.target_user_id)
            : undefined,
        }));
        setGlobalLogs(enriched);
      } else {
        setGlobalLogs(logs);
      }
    }
  }, [canModerate]);

  const fetchPlatformAds = useCallback(
    async (includeExpired = false) => {
      if (!canDeleteAds) return;
      setIsLoadingAds(true);
      const now = new Date().toISOString();
      let req = supabase
        .from("trading_ads")
        .select(
          `*, profiles!trading_ads_user_id_fkey(username, avatar_url, role, discord_id, status)`
        )
        .order("created_at", { ascending: false })
        .limit(80);

      if (!includeExpired || !isMaster) {
        req = req.gt("expires_at", now);
      }

      const { data, error } = await req;
      if (!error && data) {
        setPlatformAds(data as TradingAd[]);
      }
      setIsLoadingAds(false);
    },
    [canDeleteAds, isMaster]
  );

  const fetchUsers = useCallback(
    async (query = "", bannedOnly = showBannedOnly) => {
      if (!canModerate) return;
      setIsLoading(true);
      let request = supabase
        .from("profiles")
        .select("*, user_roles(roles(name))")
        .limit(150);

      if (bannedOnly) {
        request = request.eq("role", "banned");
      }

      if (query) {
        if (/^\d+$/.test(query)) {
          request = request.or(
            `discord_id.eq.${query},username.ilike.%${query}%`
          );
        } else {
          request = request.or(
            `username.ilike.%${query}%,roblox_username.ilike.%${query}%`
          );
        }
      }

      const [{ data, error }, { data: repLogs }] = await Promise.all([
        request,
        supabase
          .from("moderation_logs")
          .select("target_user_id, action_type, created_at")
          .ilike("action_type", "MASTER REP OVERRIDE:%")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const repOverrideMap = new Map<string, number>();
      (repLogs || []).forEach((log: any) => {
        if (!log.target_user_id || repOverrideMap.has(log.target_user_id)) return;
        const m = String(log.action_type || "").match(
          /MASTER REP OVERRIDE:\s*([+-]?\d+)/i
        );
        if (m) {
          const val = parseInt(m[1], 10);
          if (!Number.isNaN(val)) repOverrideMap.set(log.target_user_id, val);
        }
      });

      if (!error && data) {
        const mappedUsers = data.map((u: SupabaseProfile) => {
          const unpacked = unpackProfileRow(u);
          const logRep = repOverrideMap.get(u.id);
          const effectiveRep =
            logRep !== undefined
              ? logRep
              : unpacked.master_rep_override !== null
                ? unpacked.master_rep_override
                : unpacked.global_rep;
          const rolesList =
            u.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) ||
            [];
          if (rolesList.length === 0 && u.role) rolesList.push(u.role);
          return {
            ...u,
            ...unpacked,
            global_rep: effectiveRep,
            assigned_roles: Array.from(new Set(rolesList)),
          } as UserProfile;
        });

        const sorted = [...mappedUsers].sort((a, b) => {
          const priorityA = ROLE_PRIORITY[a.role] ?? 99;
          const priorityB = ROLE_PRIORITY[b.role] ?? 99;
          if (priorityA !== priorityB) return priorityA - priorityB;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

        setUsers(sorted);
        setSelectedUser((prev) => {
          if (prev) {
            const refreshed = sorted.find((u) => u.id === prev.id);
            if (refreshed) return refreshed;
          }
          if (sorted.length === 1 && query) return sorted[0];
          return prev;
        });
      }
      setIsLoading(false);
    },
    [showBannedOnly, canModerate]
  );

  const presentUserIds = usePresenceStore((s) => s.presentUserIds);

  const filteredUsers = useMemo(() => {
    const withEffectiveStatus = users.map((u) => ({
      ...u,
      effectiveStatus: getEffectiveStatus({
        userId: u.id,
        preferredStatus: u.status,
        presentUserIds,
      }),
    }));

    if (roleFilter === "all") return withEffectiveStatus;
    if (roleFilter === "staff") {
      return withEffectiveStatus.filter(
        (u) =>
          u.role === "master" ||
          u.role === "admin" ||
          u.role === "mod" ||
          u.assigned_roles?.some((r) => ["master", "admin", "mod"].includes(r))
      );
    }
    return withEffectiveStatus.filter(
      (u) => u.role === roleFilter || u.assigned_roles?.includes(roleFilter)
    );
  }, [users, roleFilter, presentUserIds]);

  useEffect(() => {
    loadMetrics();
    fetchUsers(searchQuery, showBannedOnly);
    fetchPlatformAds(false);
  }, [loadMetrics, fetchUsers, fetchPlatformAds, showBannedOnly, searchQuery]);

  const refreshSelectedUserIntel = useCallback(
    async (targetUser: UserProfile) => {
      if (!canModerate) return;
      setUserIntel((prev) => ({ ...prev, isLoading: true }));
      const now = new Date().toISOString();

      const [invRes, wishlistRes, adsRes, commentsRes, logsRes] =
        await Promise.all([
          supabase
            .from("user_inventory")
            .select("unit_id, quantity")
            .eq("user_id", targetUser.id),
          supabase
            .from("user_wishlist")
            .select("unit_id, priority")
            .eq("user_id", targetUser.id),
          supabase
            .from("trading_ads")
            .select(
              "*, profiles!trading_ads_user_id_fkey(username, avatar_url, role, discord_id, status)"
            )
            .eq("user_id", targetUser.id)
            .order("created_at", { ascending: false })
            .limit(40),
          supabase
            .from("ad_comments")
            .select("id", { count: "exact", head: true })
            .eq("user_id", targetUser.id),
          supabase
            .from("moderation_logs")
            .select("*, profiles!moderation_logs_moderator_id_fkey(username)")
            .eq("target_user_id", targetUser.id)
            .order("created_at", { ascending: false }),
        ]);

      let calculatedNetWorth = 0;
      let totalUnits = 0;
      const inventoryItems: UserVaultItem[] = (invRes.data || []) as UserVaultItem[];

      inventoryItems.forEach((item) => {
        totalUnits += Number(item.quantity || 0);
        const master = ALL_UNITS.find((u) => u.id === item.unit_id);
        if (master) {
          const isOC =
            master.value === "owner" ||
            master.valueDisplay === "Owner's Choice" ||
            master.valueDisplay === "O/C";
          if (!isOC) {
            const val =
              typeof master.value === "number"
                ? master.value
                : master.valueMin || 0;
            calculatedNetWorth += val * item.quantity;
          }
        }
      });

      const allUserAds = (adsRes.data || []) as TradingAd[];
      const activeUserAds = allUserAds.filter((a) => a.expires_at > now);

      // Privacy enforcement: Master sees all ads (including private/expired); Admin/Mod see active ads or public history
      const visibleAds = isMaster
        ? allUserAds
        : allUserAds.filter((ad) => {
            const isLive = ad.expires_at > now;
            if (isLive) return true; // Staff can always moderate live ads
            if (targetUser.ad_history_public === false) return false;
            if (targetUser.private_ad_ids?.includes(ad.id)) return false;
            return true;
          });

      if (logsRes.data) {
        setModLogs(logsRes.data as ModLog[]);
      }

      setUserIntel({
        netWorth: calculatedNetWorth,
        unitCount: totalUnits,
        adCount: activeUserAds.length,
        totalAdsCount: allUserAds.length,
        wishlistCount: wishlistRes.data?.length || 0,
        commentCount: commentsRes.count || 0,
        inventoryItems,
        wishlistItems: (wishlistRes.data || []) as UserWishlistItem[],
        userAds: visibleAds,
        isLoading: false,
      });
    },
    [ALL_UNITS, canModerate, isMaster]
  );

  useEffect(() => {
    if (!selectedUser || !canModerate) return;
    refreshSelectedUserIntel(selectedUser);
  }, [selectedUser?.id, canModerate, refreshSelectedUserIntel]);

  const logModAction = async (
    targetUserId: string,
    actionType: string,
    reason: string
  ) => {
    if (!profile || !canModerate) return;

    const targetUserObj =
      users.find((u) => u.id === targetUserId) ||
      (selectedUser?.id === targetUserId ? selectedUser : null);

    const optimisticLog: ModLog = {
      id: Math.random().toString(),
      target_user_id: targetUserId,
      action_type: actionType,
      reason: reason,
      created_at: new Date().toISOString(),
      moderator_id: profile.id,
      profiles: {
        username: profile.username,
        avatar_url: profile.avatar_url,
        role: profile.role,
      },
      target_profile: targetUserObj
        ? {
            username: targetUserObj.username,
            avatar_url: targetUserObj.avatar_url,
            role: targetUserObj.role,
          }
        : undefined,
    };

    setModLogs((prev) => [optimisticLog, ...prev]);
    setGlobalLogs((prev) => [optimisticLog, ...prev]);

    const { error } = await supabase.from("moderation_logs").insert({
      target_user_id: targetUserId,
      moderator_id: profile.id,
      action_type: actionType,
      reason: reason,
    });

    if (error) {
      console.error("🚨 DB Insert Error for Moderation Log:", error.message);
      showToast("Audit log failed to save. Please try again.", "error");
      setModLogs((prev) => prev.filter((log) => log.id !== optimisticLog.id));
      setGlobalLogs((prev) => prev.filter((log) => log.id !== optimisticLog.id));
    }
  };

  // ============================================================================
  // ROLE MANAGEMENT (Master, Admin, Mod — scoped by rank hierarchy)
  // ============================================================================
  const updateUserRole = async (
    targetUserId: string,
    newRole: string,
    reason?: string
  ) => {
    const target =
      users.find((u) => u.id === targetUserId) ||
      (selectedUser?.id === targetUserId ? selectedUser : null);

    if (!canToggleRole(newRole, target)) {
      showToast(
        `Clearance Denied: Your role (${callerRole.toUpperCase()}) cannot assign or revoke '${newRole.toUpperCase()}' on this user.`,
        "error"
      );
      return false;
    }

    // Banning via role toggle requires Admin or Master
    if (newRole.toLowerCase() === "banned" && !canManageUsers) {
      showToast("Only Admins and Master can ban or unban accounts.", "error");
      return false;
    }

    const clearance = await verifyLiveClearance(
      ["master", "admin", "mod"],
      target
    );
    if (!clearance.ok) return false;

    const { error } = await supabase.rpc("admin_assign_role", {
      target_user_id: targetUserId,
      role_name: newRole,
    });

    if (error) {
      showToast("Could not update role—check database permissions.", "error");
      return false;
    }

    await logModAction(
      targetUserId,
      `ROLE TOGGLE: ${newRole.toUpperCase()}`,
      reason || `Role '${newRole}' toggled by ${profile?.username || "Staff"}`
    );

    if (selectedUser?.id === targetUserId) {
      const currentRoles = selectedUser.assigned_roles || [];
      const hasRole = currentRoles.includes(newRole);
      const nextRoles = hasRole
        ? currentRoles.filter((r) => r !== newRole)
        : [...currentRoles, newRole];
      setSelectedUser({
        ...selectedUser,
        assigned_roles: nextRoles,
        role: (nextRoles[0] as UserProfile["role"]) || "user",
      });
    }
    fetchUsers(searchQuery, showBannedOnly);
    showToast(`Toggled role: ${newRole.toUpperCase()}`);
    if (newRole === "banned") loadMetrics();
    return true;
  };

  const createNewRole = async (
    name: string,
    color: string,
    rank: number,
    permissions: RolePermissions = {}
  ) => {
    const clearance = await verifyLiveClearance(["master", "admin", "mod"]);
    if (!clearance.ok) return;

    const cleanName = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-");
    if (!cleanName) {
      showToast("Enter a valid role identifier.", "error");
      return;
    }

    // Hierarchy rank boundary:
    // Users of the same rank CANNOT create another role of equal or higher rank.
    // Master (0) can create Admin (1), Mod (2), Custom (>= 3), or any rank >= 0.
    // Admin (1) can create Mod (2) or Custom (>= 3). Cannot create rank 0 or 1.
    // Mod (2) can only create Custom (>= 3). Cannot create rank 0, 1, or 2.
    let minAllowedRank = 3;
    if (isMaster) {
      minAllowedRank = 0;
    } else if (isAdmin) {
      minAllowedRank = 2;
    } else if (isMod) {
      minAllowedRank = 3;
    }

    const safeRank = Math.max(minAllowedRank, rank);

    // Permissions boundary:
    // Staff cannot grant permissions higher than their own clearance.
    const safePerms: RolePermissions = { ...permissions };
    if (!isMaster) {
      safePerms.access_master_lab = false;
      safePerms.override_rep = false;
    }
    if (isMod) {
      safePerms.manage_roles = false;
      safePerms.manage_users = false;
    }

    const { error } = await supabase.from("roles").insert({
      name: cleanName,
      color,
      rank: safeRank,
      permissions: safePerms,
    });

    if (error) {
      showToast(
        "Failed to create role. Ensure the role name is unique.",
        "error"
      );
    } else {
      await logModAction(
        profile?.id || "",
        `CREATED ROLE: @${cleanName}`,
        `Rank #${safeRank} created by ${profile?.username || "Staff"}`
      );
      showToast(`Role '${cleanName}' created at Rank #${safeRank}.`);
      loadMetrics();
    }
  };

  const updateRoleConfig = async (
    name: string,
    color: string,
    rank: number,
    permissions?: RolePermissions
  ) => {
    const clearance = await verifyLiveClearance(["master", "admin", "mod"]);
    if (!clearance.ok) return;

    if (CORE_SYSTEM_ROLES.includes(name.toLowerCase()) && !isMaster) {
      showToast("Only Master can modify core system roles.", "error");
      return;
    }

    const targetRoleObj = availableRoles.find((r) => r.name === name);
    const targetRank = targetRoleObj ? targetRoleObj.rank : 99;
    const callerRank = isMaster ? 0 : isAdmin ? 1 : isMod ? 2 : 99;

    // Hierarchy rule: Cannot edit role of equal or higher rank (except Master)
    if (!isMaster && targetRank <= callerRank) {
      showToast(
        `Hierarchy Violation: Cannot modify role '${name}' of equal or higher rank.`,
        "error"
      );
      return;
    }

    let minAllowedRank = 3;
    if (isMaster) minAllowedRank = 0;
    else if (isAdmin) minAllowedRank = 2;
    else if (isMod) minAllowedRank = 3;

    const safeRank = Math.max(minAllowedRank, rank);

    const updatePayload: Record<string, any> = { color, rank: safeRank };
    if (permissions) {
      const safePerms: RolePermissions = { ...permissions };
      if (!isMaster) {
        safePerms.access_master_lab = false;
        safePerms.override_rep = false;
      }
      if (isMod) {
        safePerms.manage_roles = false;
        safePerms.manage_users = false;
      }
      updatePayload.permissions = safePerms;
    }

    const { error } = await supabase
      .from("roles")
      .update(updatePayload)
      .eq("name", name);

    if (error) {
      showToast("Failed to update role settings.", "error");
    } else {
      await logModAction(
        profile?.id || "",
        `UPDATED ROLE: @${name}`,
        `Rank #${safeRank} updated by ${profile?.username || "Staff"}`
      );
      showToast(`Updated role '${name}'.`);
      loadMetrics();
    }
  };

  const deleteRole = async (name: string) => {
    const clearance = await verifyLiveClearance(["master", "admin", "mod"]);
    if (!clearance.ok) return;

    if (CORE_SYSTEM_ROLES.includes(name.toLowerCase())) {
      showToast("Core system roles cannot be deleted.", "error");
      return;
    }

    const targetRoleObj = availableRoles.find((r) => r.name === name);
    const targetRank = targetRoleObj ? targetRoleObj.rank : 99;
    const callerRank = isMaster ? 0 : isAdmin ? 1 : isMod ? 2 : 99;

    // Hierarchy rule: Cannot delete role of equal or higher rank (except Master)
    if (!isMaster && targetRank <= callerRank) {
      showToast(
        `Hierarchy Violation: Cannot delete role '${name}' of equal or higher rank.`,
        "error"
      );
      return;
    }

    const { error } = await supabase.from("roles").delete().eq("name", name);
    if (error) {
      showToast("Failed to delete role. Please try again.", "error");
    } else {
      await logModAction(
        profile?.id || "",
        `DELETED ROLE: @${name}`,
        `Deleted by ${profile?.username || "Staff"}`
      );
      showToast(`Role '${name}' deleted.`);
      loadMetrics();
      fetchUsers(searchQuery, showBannedOnly);
    }
  };

  // ============================================================================
  // COMMENTS MODERATION (Master, Admin, Mod)
  // ============================================================================
  const fetchRecentComments = useCallback(async () => {
    if (!canModerate) return;
    setIsLoadingComments(true);
    const { data, error } = await supabase
      .from("ad_comments")
      .select(
        `id, ad_id, user_id, content, created_at,
         profiles!ad_comments_user_id_fkey(username, avatar_url, role, discord_id)`
      )
      .order("created_at", { ascending: false })
      .limit(60);

    if (!error && data) {
      setRecentComments(data as any as AdminComment[]);
    }
    setIsLoadingComments(false);
  }, [canModerate]);

  const deleteComment = async (
    commentId: string,
    authorId: string,
    authorUsername: string,
    reason = "Comment rule violation / moderation removal"
  ) => {
    const clearance = await verifyLiveClearance(["master", "admin", "mod"]);
    if (!clearance.ok) return false;

    triggerHaptic("heavy");
    await logModAction(
      authorId,
      `DELETED COMMENT: @${authorUsername || "User"}`,
      reason
    );

    const { error } = await supabase
      .from("ad_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      showToast("Failed to delete comment.", "error");
      return false;
    }

    setRecentComments((prev) => prev.filter((c) => c.id !== commentId));
    loadMetrics();
    showToast("Comment removed and logged.");
    return true;
  };

  const warnUser = async (
    targetUserId: string,
    targetUsername: string,
    reason: string
  ) => {
    const clearance = await verifyLiveClearance(["master", "admin", "mod"]);
    if (!clearance.ok) return false;

    triggerHaptic("medium");
    await logModAction(
      targetUserId,
      `WARNED USER: @${targetUsername || "User"}`,
      reason
    );

    showToast(`Formal warning logged for @${targetUsername}.`);
    return true;
  };

  // ============================================================================
  // AD MODERATION (Master, Admin, Mod)
  // ============================================================================
  const deleteSingleAd = async (
    adId: string,
    adOwnerId: string,
    reason = "Rule violation / Staff removal"
  ) => {
    const clearance = await verifyLiveClearance(["master", "admin", "mod"]);
    if (!clearance.ok) return false;

    triggerHaptic("heavy");
    await logModAction(
      adOwnerId,
      `DELETED AD (${adId.slice(0, 8)})`,
      reason
    );

    const { error } = await supabase
      .from("trading_ads")
      .delete()
      .eq("id", adId);

    if (error) {
      showToast("Failed to delete trading ad.", "error");
      return false;
    }

    setPlatformAds((prev) => prev.filter((a) => a.id !== adId));
    setUserIntel((prev) => ({
      ...prev,
      userAds: prev.userAds.filter((a) => a.id !== adId),
      adCount: Math.max(0, prev.adCount - 1),
    }));
    loadMetrics();
    showToast("Trading ad removed and logged.");
    return true;
  };

  const handlePurgeAds = async (reason: string) => {
    if (!selectedUser) return;
    const clearance = await verifyLiveClearance(
      ["master", "admin", "mod"],
      selectedUser
    );
    if (!clearance.ok) return;

    triggerHaptic("heavy");
    await logModAction(selectedUser.id, "Purged Active Ads", reason);

    const { error } = await supabase
      .from("trading_ads")
      .delete()
      .eq("user_id", selectedUser.id);

    if (error) {
      showToast("Failed to purge user ads.", "error");
    } else {
      showToast("Purged all trading ads for user.");
      setUserIntel((prev) => ({ ...prev, adCount: 0, userAds: [] }));
      setPlatformAds((prev) =>
        prev.filter((a) => a.user_id !== selectedUser.id)
      );
      loadMetrics();
    }
  };

  // ============================================================================
  // USER MANAGEMENT SANCTIONS (Master & Admin ONLY — Mods blocked)
  // ============================================================================
  const handleResetProfile = async (reason: string) => {
    if (!selectedUser) return;
    const clearance = await verifyLiveClearance(
      ["master", "admin"],
      selectedUser
    );
    if (!clearance.ok) return;

    triggerHaptic("heavy");
    await logModAction(selectedUser.id, "Reset Profile Info", reason);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: "Moderated User",
        avatar_url: "",
        bio: "",
        roblox_username: "",
      })
      .eq("id", selectedUser.id);

    if (error) {
      showToast("Failed to reset profile info.", "error");
    } else {
      showToast("Profile identity reset.");
      fetchUsers(searchQuery, showBannedOnly);
    }
  };

  const handlePurgeComments = async (reason: string) => {
    if (!selectedUser) return;
    const clearance = await verifyLiveClearance(
      ["master", "admin"],
      selectedUser
    );
    if (!clearance.ok) return;

    triggerHaptic("heavy");
    await logModAction(selectedUser.id, "Purged All Comments", reason);

    const { error } = await supabase
      .from("ad_comments")
      .delete()
      .eq("user_id", selectedUser.id);

    if (error) {
      showToast("Failed to purge user comments.", "error");
    } else {
      showToast("All user comments purged.");
      setUserIntel((prev) => ({ ...prev, commentCount: 0 }));
      loadMetrics();
    }
  };

  // ============================================================================
  // DESTRUCTIVE VAULT & ACCOUNT NUKE (Master ONLY)
  // ============================================================================
  const handleWipeInventory = async (reason: string) => {
    if (!selectedUser) return;
    const clearance = await verifyLiveClearance(["master"], selectedUser);
    if (!clearance.ok) return;

    triggerHaptic("heavy");
    await logModAction(selectedUser.id, "Wiped Inventory", reason);

    const { error } = await supabase
      .from("user_inventory")
      .delete()
      .eq("user_id", selectedUser.id);

    if (error) {
      showToast("Failed to wipe user inventory.", "error");
    } else {
      showToast("User inventory wiped clean.");
      setUserIntel((prev) => ({
        ...prev,
        netWorth: 0,
        unitCount: 0,
        inventoryItems: [],
      }));
    }
  };

  const handleWipeWishlist = async (reason: string) => {
    if (!selectedUser) return;
    const clearance = await verifyLiveClearance(["master"], selectedUser);
    if (!clearance.ok) return;

    triggerHaptic("heavy");
    await logModAction(selectedUser.id, "Wiped Wishlist", reason);

    const { error } = await supabase
      .from("user_wishlist")
      .delete()
      .eq("user_id", selectedUser.id);

    if (error) {
      showToast("Failed to wipe user wishlist.", "error");
    } else {
      showToast("User wishlist wiped clean.");
      setUserIntel((prev) => ({
        ...prev,
        wishlistCount: 0,
        wishlistItems: [],
      }));
    }
  };

  const handleTotalAccountNuke = async (reason: string) => {
    if (!selectedUser) return;
    if (selectedUser.id === profile?.id) {
      showToast("You cannot nuke your own Master account.", "error");
      return;
    }

    const clearance = await verifyLiveClearance(["master"], selectedUser);
    if (!clearance.ok) return;

    triggerHaptic("heavy");
    await logModAction(selectedUser.id, "ACCOUNT NUKED & BANNED", reason);

    const { error } = await supabase.rpc("admin_nuke_account", {
      target_user_id: selectedUser.id,
    });

    if (error) {
      showToast("Account nuke RPC failed. Check database permissions.", "error");
      return;
    }

    setUserIntel({
      netWorth: 0,
      unitCount: 0,
      adCount: 0,
      totalAdsCount: 0,
      wishlistCount: 0,
      commentCount: 0,
      inventoryItems: [],
      wishlistItems: [],
      userAds: [],
      isLoading: false,
    });
    showToast(`ACCOUNT NUKED: ${selectedUser.username} has been eradicated.`);

    setSelectedUser((prev) =>
      prev ? { ...prev, assigned_roles: ["banned"], role: "banned" } : null
    );

    fetchUsers(searchQuery, showBannedOnly);
    loadMetrics();
  };

  // ============================================================================
  // MASTER SOVEREIGN CHEATS, DEBUG & OVERRIDE TOOLS (Strictly Master ONLY)
  // ============================================================================
  const masterSetReputation = async (
    targetUserId: string,
    newRep: number,
    reason = "Master Reputation Override"
  ) => {
    const clearance = await verifyLiveClearance(["master"]);
    if (!clearance.ok) return false;

    const clampedRep = Math.max(-999999, Math.min(999999, Math.round(newRep)));

    if (targetUserId === profile?.id) {
      const { data: rawRow } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .maybeSingle();

      const unpacked = unpackProfileRow(rawRow || {});
      const packedBanner = packBannerConfig({
        ...unpacked,
        master_rep_override: clampedRep,
      });

      await supabase
        .from("profiles")
        .update({ banner_color: packedBanner })
        .eq("id", targetUserId);
    }

    await logModAction(
      targetUserId,
      `MASTER REP OVERRIDE: ${clampedRep >= 0 ? `+${clampedRep}` : clampedRep}`,
      reason
    );

    useProfileStore.getState().updateLocalProfile(targetUserId, {
      global_rep: clampedRep,
      master_rep_override: clampedRep,
    });

    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUserId
          ? { ...u, global_rep: clampedRep, master_rep_override: clampedRep }
          : u
      )
    );
    setSelectedUser((prev) =>
      prev && prev.id === targetUserId
        ? { ...prev, global_rep: clampedRep, master_rep_override: clampedRep }
        : prev
    );
    showToast(`Reputation updated to ${clampedRep.toLocaleString()} Rep.`);
    return true;
  };

  const masterModifyVaultUnit = async (
    targetUserId: string,
    unitId: string,
    quantity: number,
    mode: "set" | "add" | "remove" = "add",
    reason = "Master Vault Unit Injection"
  ) => {
    const clearance = await verifyLiveClearance(["master"]);
    if (!clearance.ok) return false;

    const unitObj = ALL_UNITS.find((u) => u.id === unitId);
    if (!unitObj) {
      showToast("Invalid unit ID selected.", "error");
      return false;
    }

    // Check current quantity
    const { data: existing } = await supabase
      .from("user_inventory")
      .select("quantity")
      .eq("user_id", targetUserId)
      .eq("unit_id", unitId)
      .maybeSingle();

    const currentQty = existing?.quantity || 0;
    let nextQty = quantity;
    if (mode === "add") nextQty = currentQty + quantity;
    if (mode === "remove") nextQty = Math.max(0, currentQty - quantity);

    if (nextQty <= 0) {
      const { error } = await supabase
        .from("user_inventory")
        .delete()
        .eq("user_id", targetUserId)
        .eq("unit_id", unitId);

      if (error) {
        showToast("Failed to remove unit from vault.", "error");
        return false;
      }
    } else {
      const { error } = await supabase.from("user_inventory").upsert(
        {
          user_id: targetUserId,
          unit_id: unitId,
          quantity: Math.min(9999, nextQty),
        },
        { onConflict: "user_id,unit_id" }
      );

      if (error) {
        showToast("Failed to inject unit into vault.", "error");
        return false;
      }
    }

    await logModAction(
      targetUserId,
      `MASTER VAULT ${mode.toUpperCase()}: ${unitObj.name} (x${Math.max(0, nextQty)})`,
      reason
    );

    if (selectedUser && selectedUser.id === targetUserId) {
      await refreshSelectedUserIntel(selectedUser);
    }
    showToast(
      `Vault updated: ${unitObj.name} → ×${Math.max(0, nextQty)}`
    );
    return true;
  };

  const masterOverrideProfile = async (
    targetUserId: string,
    patch: Partial<{
      username: string;
      roblox_username: string;
      bio: string;
      status: "online" | "dnd" | "invisible" | "offline";
      banner_color: string;
    }>,
    reason = "Master Direct Profile Override"
  ) => {
    const clearance = await verifyLiveClearance(["master"]);
    if (!clearance.ok) return false;

    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", targetUserId);

    if (error) {
      showToast("Failed to apply Master profile override.", "error");
      return false;
    }

    await logModAction(
      targetUserId,
      `MASTER PROFILE OVERRIDE (${Object.keys(patch).join(", ")})`,
      reason
    );

    await fetchUsers(searchQuery, showBannedOnly);
    showToast("Master profile override applied.");
    return true;
  };

  const masterPurgeExpiredAds = async () => {
    const clearance = await verifyLiveClearance(["master"]);
    if (!clearance.ok) return;

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("trading_ads")
      .delete()
      .lte("expires_at", now);

    if (error) {
      showToast("Failed to purge expired ads.", "error");
    } else {
      showToast("All expired trading ads purged from database.");
      loadMetrics();
      fetchPlatformAds(false);
    }
  };

  return {
    users: filteredUsers,
    allUsers: users,
    selectedUser,
    setSelectedUser,
    userIntel,
    refreshSelectedUserIntel,
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
    handleSearch: (e: React.FormEvent) => {
      e.preventDefault();
      fetchUsers(searchQuery, showBannedOnly);
    },
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
  };
}
