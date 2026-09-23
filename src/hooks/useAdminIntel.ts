// ================================================
// FILE: src/hooks/useAdminIntel.ts
// ================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore, UserProfile as AuthUserProfile } from '../store/useAuthStore';
import { useUnits } from '../context/UnitContext';
import { triggerHaptic } from '../data/helpers';

export interface UserProfile extends AuthUserProfile {
  assigned_roles: string[];
}

export interface SystemMetrics {
  totalUsers: number;
  activeAds: number;
  bannedUsers: number;
}

export interface ModLog {
  id: string;
  action_type: string;
  reason: string;
  created_at: string;
  moderator_id: string;
  profiles: { username: string };
}

interface SupabaseProfile extends AuthUserProfile {
  user_roles?: { roles?: { name: string } }[];
}

const ROLE_PRIORITY: Record<string, number> = {
  master: 0, admin: 1, mod: 2, user: 3, banned: 4
};

export function useAdminIntel() {
  const { profile } = useAuthStore();
  const { units: ALL_UNITS } = useUnits();
  
  const isMaster = profile?.role?.toLowerCase() === 'master';
  const canModerate = profile?.role === 'master' || profile?.role === 'admin' || profile?.role === 'mod';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userIntel, setUserIntel] = useState({ netWorth: 0, adCount: 0, isLoading: false });
  const [metrics, setMetrics] = useState<SystemMetrics>({ totalUsers: 0, activeAds: 0, bannedUsers: 0 });
  const [availableRoles, setAvailableRoles] = useState<{name: string, color: string, rank: number}[]>([]);
  const [modLogs, setModLogs] = useState<ModLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showBannedOnly, setShowBannedOnly] = useState(false);
  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadMetrics = useCallback(async () => {
    if (!canModerate) return;
    const now = new Date().toISOString();
    const [usersRes, adsRes, bannedRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('trading_ads').select('id', { count: 'exact', head: true }).gt('expires_at', now),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'banned'),
      supabase.from('roles').select('name, color, rank').order('rank', { ascending: true })
    ]);
    
    setMetrics({
      totalUsers: usersRes.count || 0,
      activeAds: adsRes.count || 0,
      bannedUsers: bannedRes.count || 0
    });

    if (rolesRes.data) {
      setAvailableRoles(rolesRes.data);
    }
  }, [canModerate]);

  const fetchUsers = useCallback(async (query = "", bannedOnly = showBannedOnly) => {
    if (!canModerate) return;
    setIsLoading(true);
    let request = supabase.from('profiles').select('*, user_roles(roles(name))').limit(100);
    
    if (bannedOnly) {
      request = request.eq('role', 'banned');
    }

    if (query) {
      if (/^\d+$/.test(query)) {
        request = request.or(`discord_id.eq.${query},username.ilike.%${query}%`);
      } else {
        request = request.ilike('username', `%${query}%`);
      }
    }

    const { data, error } = await request;
    if (!error && data) {
      const mappedUsers = data.map((u: SupabaseProfile) => {
        const rolesList = u.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) || [];
        if (rolesList.length === 0 && u.role) rolesList.push(u.role);
        return { ...u, assigned_roles: rolesList } as UserProfile;
      });

      const sorted = [...mappedUsers].sort((a, b) => {
        const priorityA = ROLE_PRIORITY[a.role] ?? 99;
        const priorityB = ROLE_PRIORITY[b.role] ?? 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setUsers(sorted);
      if (sorted.length === 1 && query) setSelectedUser(sorted[0]);
    }
    setIsLoading(false);
  }, [showBannedOnly, canModerate]);

  useEffect(() => {
    loadMetrics();
    fetchUsers(searchQuery, showBannedOnly);
  }, [loadMetrics, fetchUsers, showBannedOnly, searchQuery]);

  useEffect(() => {
    if (!selectedUser || !canModerate) return;
    
    const loadUserIntel = async () => {
      setUserIntel(prev => ({ ...prev, isLoading: true }));
      const now = new Date().toISOString();
      
      const [invRes, adsRes, logsRes] = await Promise.all([
        supabase.from('user_inventory').select('unit_id, quantity').eq('user_id', selectedUser.id),
        supabase.from('trading_ads').select('id', { count: 'exact', head: true }).eq('user_id', selectedUser.id).gt('expires_at', now),
        supabase.from('moderation_logs').select('*, profiles!moderation_logs_moderator_id_fkey(username)').eq('target_user_id', selectedUser.id).order('created_at', { ascending: false })
      ]);

      let calculatedNetWorth = 0;
      if (invRes.data) {
        invRes.data.forEach((item: any) => {
          const master = ALL_UNITS.find(u => u.id === item.unit_id);
          if (master) {
            const isOC = master.value === "owner" || master.valueDisplay === "Owner's Choice" || master.valueDisplay === "O/C";
            if (!isOC) {
              const val = typeof master.value === "number" ? master.value : (master.valueMin || 0);
              calculatedNetWorth += val * item.quantity;
            }
          }
        });
      }

      if (logsRes.data) {
        setModLogs(logsRes.data as ModLog[]);
      }

      setUserIntel({
        netWorth: calculatedNetWorth,
        adCount: adsRes.count || 0,
        isLoading: false
      });
    };

    loadUserIntel();
  }, [selectedUser?.id, ALL_UNITS, canModerate]);

  const logModAction = async (targetUserId: string, actionType: string, reason: string) => {
    if (!profile || !canModerate) return;
    
    const optimisticLog: ModLog = {
      id: Math.random().toString(),
      action_type: actionType,
      reason: reason,
      created_at: new Date().toISOString(),
      moderator_id: profile.id,
      profiles: { username: profile.username }
    };
    
    setModLogs(prev => [optimisticLog, ...prev]);

    const { error } = await supabase.from('moderation_logs').insert({
      target_user_id: targetUserId,
      moderator_id: profile.id,
      action_type: actionType,
      reason: reason
    });

    if (error) {
      console.error("🚨 DB Insert Error for Moderation Log:", error.message);
      showToast(`Audit log failed to save: ${error.message}`, "error");
      setModLogs(prev => prev.filter(log => log.id !== optimisticLog.id));
    }
  };

  const updateUserRole = async (targetUserId: string, newRole: string, reason?: string) => {
    if (!canModerate) return false;

    const { error } = await supabase.rpc('admin_assign_role', { target_user_id: targetUserId, role_name: newRole });
    
    if (error) {
      showToast(`Database Error: ${error.message}`, "error");
      return false;
    } else {
      if (reason) await logModAction(targetUserId, `ROLE TOGGLE: ${newRole.toUpperCase()}`, reason);
      
      if (selectedUser?.id === targetUserId) {
        const currentRoles = selectedUser.assigned_roles || [];
        const hasRole = currentRoles.includes(newRole);
        const nextRoles = hasRole ? currentRoles.filter(r => r !== newRole) : [...currentRoles, newRole];
        setSelectedUser({ ...selectedUser, assigned_roles: nextRoles, role: (nextRoles[0] as UserProfile['role']) || 'user' });
      }
      fetchUsers(searchQuery, showBannedOnly);
      showToast(`Toggled role: ${newRole.toUpperCase()}`);
      if (newRole === 'banned') loadMetrics();
      return true;
    }
  };

  const createNewRole = async (name: string, color: string, rank: number) => {
    if (!isMaster) return showToast("Only Master can create roles.", "error");
    
    const cleanName = name.toLowerCase().replace(/\s+/g, '-');
    const { error } = await supabase.from('roles').insert({ 
      name: cleanName, 
      color, 
      rank, 
      permissions: {} 
    });

    if (error) {
      showToast(`Failed to create role: ${error.message}`, "error");
    } else {
      showToast(`Role '${cleanName}' created successfully!`);
      loadMetrics();
    }
  };

  const deleteRole = async (name: string) => {
    if (!isMaster) return showToast("Only Master can delete roles.", "error");
    if (['master', 'admin', 'mod', 'user', 'banned'].includes(name)) {
      return showToast("Cannot delete core system roles.", "error");
    }

    if (!confirm(`Are you absolutely sure you want to delete the role '${name}'? Users with this role will be downgraded to 'user'.`)) return;

    const { error } = await supabase.from('roles').delete().eq('name', name);
    if (error) {
      showToast(`Failed to delete role: ${error.message}`, "error");
    } else {
      showToast(`Role '${name}' deleted.`);
      loadMetrics();
      fetchUsers(searchQuery, showBannedOnly);
    }
  };

  const executeModAction = async (targetUserId: string, actionType: string, reason: string, actionPromise: PromiseLike<any>, onSuccess?: () => void) => {
    if (!canModerate) {
        showToast("Unauthorized: You lack moderation privileges.", "error");
        return;
    }
    await logModAction(targetUserId, actionType, reason);
    
    const { error } = await actionPromise;
    if (error) {
      showToast(`Failed to ${actionType.toLowerCase()}.`, "error");
    } else {
      showToast(`${actionType} successful.`);
      if (onSuccess) onSuccess();
    }
  };

  const handleResetProfile = (reason: string) => {
    if (!selectedUser) return;
    triggerHaptic('heavy');
    executeModAction(selectedUser.id, "Reset Profile Info", reason, 
      supabase.from('profiles').update({ username: 'Moderated User', avatar_url: '', bio: '' }).eq('id', selectedUser.id), 
      () => fetchUsers(searchQuery, showBannedOnly)
    );
  };

  const handlePurgeAds = (reason: string) => {
    if (!selectedUser) return;
    triggerHaptic('heavy');
    executeModAction(selectedUser.id, "Purged Active Ads", reason, 
      supabase.from('trading_ads').delete().eq('user_id', selectedUser.id), 
      () => {
        setUserIntel(prev => ({ ...prev, adCount: 0 }));
        loadMetrics();
      }
    );
  };

  const handlePurgeComments = (reason: string) => {
    if (!selectedUser) return;
    triggerHaptic('heavy');
    executeModAction(selectedUser.id, "Purged All Comments", reason, 
      supabase.from('ad_comments').delete().eq('user_id', selectedUser.id)
    );
  };

  const handleWipeInventory = (reason: string) => {
    if (!selectedUser) return;
    triggerHaptic('heavy');
    executeModAction(selectedUser.id, "Wiped Inventory", reason, 
      supabase.from('user_inventory').delete().eq('user_id', selectedUser.id), 
      () => setUserIntel(prev => ({ ...prev, netWorth: 0 }))
    );
  };

  const handleWipeWishlist = (reason: string) => {
    if (!selectedUser) return;
    triggerHaptic('heavy');
    executeModAction(selectedUser.id, "Wiped Wishlist", reason, 
      supabase.from('user_wishlist').delete().eq('user_id', selectedUser.id)
    );
  };

  const handleTotalAccountNuke = async (reason: string) => {
    if (!selectedUser || !canModerate) return;
    triggerHaptic('heavy');
    
    await logModAction(selectedUser.id, "ACCOUNT NUKED & BANNED", reason);

    const { error } = await supabase.rpc('admin_nuke_account', { target_user_id: selectedUser.id });

    if (error) {
      showToast(`Nuke Failed: ${error.message}`, "error");
      return;
    }

    setUserIntel({ netWorth: 0, adCount: 0, isLoading: false });
    showToast(`ACCOUNT NUKED: ${selectedUser.username} has been eradicated.`);
    
    setSelectedUser(prev => prev ? { ...prev, assigned_roles: ['banned'], role: 'banned' } : null);
    
    fetchUsers(searchQuery, showBannedOnly);
    loadMetrics();
  };

  return {
    users, selectedUser, setSelectedUser, userIntel, metrics, availableRoles, modLogs,
    searchQuery, setSearchQuery, isLoading, toast, showToast, setToast,
    showBannedOnly, setShowBannedOnly,
    handleSearch: (e: React.FormEvent) => { e.preventDefault(); fetchUsers(searchQuery, showBannedOnly); },
    updateUserRole, createNewRole, deleteRole, handleResetProfile, handlePurgeAds, handlePurgeComments,
    handleWipeInventory, handleWipeWishlist, handleTotalAccountNuke,
    profile, isMaster
  };
}