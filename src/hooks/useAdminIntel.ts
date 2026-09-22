// ================================================
// FILE: src/hooks/useAdminIntel.ts
// ================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useUnits } from '../context/UnitContext';
import { triggerHaptic } from '../data/helpers';

export interface UserProfile {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string;
  role: string;
  assigned_roles: string[]; // NEW: Supports multiple roles
  created_at: string;
}

export interface SystemMetrics {
  totalUsers: number;
  activeAds: number;
  bannedUsers: number;
}

const ROLE_PRIORITY: Record<string, number> = {
  master: 0, admin: 1, mod: 2, user: 3, banned: 4
};

export function useAdminIntel() {
  const { profile } = useAuthStore();
  const { units: ALL_UNITS } = useUnits();
  
  const isMaster = profile?.role?.toLowerCase() === 'master';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userIntel, setUserIntel] = useState({ netWorth: 0, adCount: 0, isLoading: false });
  const [metrics, setMetrics] = useState<SystemMetrics>({ totalUsers: 0, activeAds: 0, bannedUsers: 0 });
  const [availableRoles, setAvailableRoles] = useState<{name: string, color: string, rank: number}[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadMetrics = useCallback(async () => {
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
  }, []);

  const fetchUsers = useCallback(async (query = "") => {
    setIsLoading(true);
    // Fetch users AND join their multiple roles from the junction table
    let request = supabase.from('profiles').select('*, user_roles(roles(name))').limit(100);
    
    if (query) {
      if (/^\d+$/.test(query)) {
        request = request.or(`discord_id.eq.${query},username.ilike.%${query}%`);
      } else {
        request = request.ilike('username', `%${query}%`);
      }
    }

    const { data, error } = await request;
    if (!error && data) {
      const mappedUsers = data.map((u: any) => {
        // Flatten the nested join structure into a simple string array
        const rolesList = u.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) || [];
        if (rolesList.length === 0 && u.role) rolesList.push(u.role); // Fallback
        return { ...u, assigned_roles: rolesList };
      });

      const sorted = [...mappedUsers].sort((a, b) => {
        const priorityA = ROLE_PRIORITY[a.role] ?? 99;
        const priorityB = ROLE_PRIORITY[b.role] ?? 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setUsers(sorted as UserProfile[]);
      if (sorted.length === 1 && query) setSelectedUser(sorted[0] as UserProfile);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadMetrics();
    fetchUsers();
  }, [loadMetrics, fetchUsers]);

  useEffect(() => {
    if (!selectedUser) return;
    
    const loadUserIntel = async () => {
      setUserIntel(prev => ({ ...prev, isLoading: true }));
      const now = new Date().toISOString();
      
      const [invRes, adsRes] = await Promise.all([
        supabase.from('user_inventory').select('unit_id, quantity').eq('user_id', selectedUser.id),
        supabase.from('trading_ads').select('id', { count: 'exact', head: true }).eq('user_id', selectedUser.id).gt('expires_at', now)
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

      setUserIntel({
        netWorth: calculatedNetWorth,
        adCount: adsRes.count || 0,
        isLoading: false
      });
    };

    loadUserIntel();
  }, [selectedUser?.id, ALL_UNITS]);

  const updateUserRole = async (targetUserId: string, newRole: string) => {
    if (!profile) return false;
    if ((newRole === 'master' || newRole === 'admin') && !isMaster) {
      showToast("Only the Master account can assign Admin privileges.", "error");
      return false;
    }

    const { error } = await supabase.rpc('admin_assign_role', { target_user_id: targetUserId, role_name: newRole });
    
    if (error) {
      showToast(`Database Error: ${error.message}`, "error");
      return false;
    } else {
      // Optimistic UI update for toggling multiple roles
      if (selectedUser?.id === targetUserId) {
        const currentRoles = selectedUser.assigned_roles || [];
        const hasRole = currentRoles.includes(newRole);
        const nextRoles = hasRole ? currentRoles.filter(r => r !== newRole) : [...currentRoles, newRole];
        setSelectedUser({ ...selectedUser, assigned_roles: nextRoles, role: nextRoles[0] || 'user' });
      }
      fetchUsers(searchQuery); // Refetch in background to sync
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
      loadMetrics(); // Refresh the available roles
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
      fetchUsers(searchQuery);
    }
  };

  const executeAction = async (actionDesc: string, supabaseCall: PromiseLike<any>, onSuccess?: () => void) => {
    const { error } = await supabaseCall;
    if (error) showToast(`Failed to ${actionDesc.toLowerCase()}.`, "error");
    else {
      showToast(`${actionDesc} successfully.`);
      if (onSuccess) onSuccess();
    }
  };

  const handleResetProfile = () => {
    if (selectedUser && confirm(`Reset profile for ${selectedUser.username}? This will replace their username and avatar.`)) {
      triggerHaptic('heavy');
      executeAction("Reset profile", supabase.from('profiles').update({ username: 'Moderated User', avatar_url: '' }).eq('id', selectedUser.id), () => fetchUsers(searchQuery));
    }
  };

  const handlePurgeAds = () => {
    if (selectedUser && confirm(`Are you sure you want to delete ALL active ads for ${selectedUser.username}?`)) {
      triggerHaptic('heavy');
      executeAction("Purged all active ads", supabase.from('trading_ads').delete().eq('user_id', selectedUser.id), () => {
        setUserIntel(prev => ({ ...prev, adCount: 0 }));
        loadMetrics();
      });
    }
  };

  const handlePurgeComments = () => {
    if (selectedUser && confirm(`Are you sure you want to delete ALL comments made by ${selectedUser.username}?`)) {
      triggerHaptic('heavy');
      executeAction("Purged all comments", supabase.from('ad_comments').delete().eq('user_id', selectedUser.id));
    }
  };

  const handleWipeInventory = () => {
    if (selectedUser && confirm(`WARNING: Are you sure you want to permanently WIPE the inventory of ${selectedUser.username}?`)) {
      triggerHaptic('heavy');
      executeAction("Wiped inventory", supabase.from('user_inventory').delete().eq('user_id', selectedUser.id), () => {
        setUserIntel(prev => ({ ...prev, netWorth: 0 }));
      });
    }
  };

  const handleWipeWishlist = () => {
    if (selectedUser && confirm(`Are you sure you want to WIPE the wishlist of ${selectedUser.username}?`)) {
      triggerHaptic('heavy');
      executeAction("Wiped wishlist", supabase.from('user_wishlist').delete().eq('user_id', selectedUser.id));
    }
  };

  const handleTotalAccountNuke = async () => {
    if (!selectedUser) return;
    const confirmation = prompt(`Type "NUKE" to permanently ban ${selectedUser.username} and wipe all their data.`);
    if (confirmation !== "NUKE") {
      showToast("Account wipe cancelled.", "error");
      return;
    }
    
    triggerHaptic('heavy');
    const { error } = await supabase.rpc('admin_nuke_account', { target_user_id: selectedUser.id });

    if (error) {
      showToast(`Nuke Failed: ${error.message}`, "error");
      return;
    }

    setUserIntel({ netWorth: 0, adCount: 0, isLoading: false });
    showToast(`ACCOUNT NUKED: ${selectedUser.username} has been eradicated.`);
    fetchUsers(searchQuery);
    loadMetrics();
  };

  return {
    users, selectedUser, setSelectedUser, userIntel, metrics, availableRoles,
    searchQuery, setSearchQuery, isLoading, toast, showToast, setToast,
    handleSearch: (e: React.FormEvent) => { e.preventDefault(); fetchUsers(searchQuery); },
    updateUserRole, createNewRole, deleteRole, handleResetProfile, handlePurgeAds, handlePurgeComments,
    handleWipeInventory, handleWipeWishlist, handleTotalAccountNuke,
    profile, isMaster
  };
}