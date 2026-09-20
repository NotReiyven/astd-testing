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
  role: 'user' | 'mod' | 'admin' | 'master' | 'banned';
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
  const isMaster = profile?.role === 'master';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userIntel, setUserIntel] = useState({ netWorth: 0, adCount: 0, isLoading: false });
  const [metrics, setMetrics] = useState<SystemMetrics>({ totalUsers: 0, activeAds: 0, bannedUsers: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadMetrics = useCallback(async () => {
    const now = new Date().toISOString();
    const [usersRes, adsRes, bannedRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('trading_ads').select('id', { count: 'exact', head: true }).gt('expires_at', now),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'banned')
    ]);
    setMetrics({
      totalUsers: usersRes.count || 0,
      activeAds: adsRes.count || 0,
      bannedUsers: bannedRes.count || 0
    });
  }, []);

  const fetchUsers = useCallback(async (query = "") => {
    setIsLoading(true);
    let request = supabase.from('profiles').select('*').limit(100);
    
    if (query) {
      if (/^\d+$/.test(query)) {
        request = request.or(`discord_id.eq.${query},username.ilike.%${query}%`);
      } else {
        request = request.ilike('username', `%${query}%`);
      }
    }

    const { data, error } = await request;
    if (!error && data) {
      const sorted = [...data].sort((a, b) => {
        const priorityA = ROLE_PRIORITY[a.role] ?? 3;
        const priorityB = ROLE_PRIORITY[b.role] ?? 3;
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

    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', targetUserId);
    if (error) {
      showToast(`Database Error: ${error.message}`, "error");
      return false;
    } else {
      fetchUsers(searchQuery);
      if (selectedUser?.id === targetUserId) {
        setSelectedUser({ ...selectedUser, role: newRole as any });
      }
      showToast(`Updated role to ${newRole.toUpperCase()}`);
      if (newRole === 'banned') loadMetrics();
      return true;
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
    const confirmation = prompt(`Type "NUKE" to permanently ban ${selectedUser.username} and wipe all their data (Ads, Inventory, Wishlist, Comments).`);
    if (confirmation !== "NUKE") {
      showToast("Account wipe cancelled.", "error");
      return;
    }
    
    triggerHaptic('heavy');
    const banSuccess = await updateUserRole(selectedUser.id, 'banned');
    if (!banSuccess) return;

    await Promise.all([
      supabase.from('trading_ads').delete().eq('user_id', selectedUser.id),
      supabase.from('user_inventory').delete().eq('user_id', selectedUser.id),
      supabase.from('user_wishlist').delete().eq('user_id', selectedUser.id),
      supabase.from('ad_comments').delete().eq('user_id', selectedUser.id),
      supabase.from('ad_likes').delete().eq('user_id', selectedUser.id)
    ]);

    setUserIntel({ netWorth: 0, adCount: 0, isLoading: false });
    showToast(`ACCOUNT NUKED: ${selectedUser.username} has been eradicated.`);
    loadMetrics();
  };

  return {
    users, selectedUser, setSelectedUser, userIntel, metrics,
    searchQuery, setSearchQuery, isLoading, toast, showToast, setToast,
    handleSearch: (e: React.FormEvent) => { e.preventDefault(); fetchUsers(searchQuery); },
    updateUserRole, handleResetProfile, handlePurgeAds, handlePurgeComments,
    handleWipeInventory, handleWipeWishlist, handleTotalAccountNuke,
    profile, isMaster
  };
}