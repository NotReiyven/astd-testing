// ================================================
// FILE: src/app/components/AdminChannel.tsx
// ================================================

import { useState } from "react";
import { 
  Search, ShieldAlert, Shield, Package, 
  Trash2, Ban, X, Copy, Check, Activity, 
  Users, Megaphone, ArrowRight, AlertTriangle, 
  UserCircle2, ArrowUpRight, RefreshCw, Eraser, MessageSquareOff, Plus, Settings2, UsersRound, History
} from "lucide-react";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useAdminIntel } from "../../hooks/useAdminIntel";
import { triggerHaptic } from "../../data/helpers";

export function AdminChannel() {
  const { setViewingUser } = useInventoryStore();
  const setViewingProfile = useProfileStore(s => s.setViewingProfile);

  const {
    users, selectedUser, setSelectedUser, userIntel, metrics, availableRoles, modLogs,
    searchQuery, setSearchQuery, isLoading, toast, setToast, showBannedOnly, setShowBannedOnly,
    handleSearch, updateUserRole, createNewRole, deleteRole, handleResetProfile, handlePurgeAds, handlePurgeComments,
    handleWipeInventory, handleWipeWishlist, handleTotalAccountNuke,
    profile, isMaster
  } = useAdminIntel();

  const [adminTab, setAdminTab] = useState<"users" | "roles">("users");

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#10B981");
  const [newRoleRank, setNewRoleRank] = useState(10);

  const [modActionData, setModActionData] = useState<{ type: string, label: string, isDestructive: boolean, payload?: string } | null>(null);
  const [modReason, setModReason] = useState("");

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    triggerHaptic('light');
  };

  const handleInspectVault = () => {
    if (!selectedUser) return;
    triggerHaptic('medium');
    setViewingUser(selectedUser.id, selectedUser.username, "admin-panel");
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
  };

  const handleInspectProfile = () => {
    if (!selectedUser) return;
    triggerHaptic('medium');
    setViewingProfile(selectedUser.id);
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'profile' }));
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    triggerHaptic('medium');
    createNewRole(newRoleName, newRoleColor, newRoleRank);
    setNewRoleName("");
  };

  const getPrimaryRoleDot = (assignedRoles: string[]) => {
    if (!assignedRoles || assignedRoles.length === 0) return '#23a559';
    const matched = assignedRoles
      .map(r => availableRoles?.find(ar => ar.name === r))
      .filter(Boolean)
      .sort((a, b) => (a!.rank) - (b!.rank));
    return matched.length > 0 ? matched[0]!.color : '#23a559';
  };

  const executeModAction = () => {
    if (!modActionData || !modReason.trim() || !selectedUser) return;
    
    switch (modActionData.type) {
      case "purge_ads": handlePurgeAds(modReason); break;
      case "reset_profile": handleResetProfile(modReason); break;
      case "purge_comments": handlePurgeComments(modReason); break;
      case "wipe_inv": handleWipeInventory(modReason); break;
      case "wipe_wishlist": handleWipeWishlist(modReason); break;
      case "nuke": handleTotalAccountNuke(modReason); break;
      case "ban": updateUserRole(selectedUser.id, "banned", modReason); break;
      case "role": 
        if (modActionData.payload) updateUserRole(selectedUser.id, modActionData.payload, modReason); 
        break;
    }
    
    setModActionData(null);
    setModReason("");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background h-full select-none font-sans relative">
      
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6 py-4 bg-[#111214] border-b border-border shadow-sm z-20">
        <h2 className="text-[16px] font-black text-foreground tracking-tight uppercase flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-destructive" /> Tel Aviv Center
        </h2>
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 bg-[#1E1F22] border border-border px-3 py-1.5 rounded-[4px] shrink-0">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Registered Users</span>
            <span className="text-[12px] font-mono font-black text-foreground ml-1">{metrics.totalUsers.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#1E1F22] border border-border px-3 py-1.5 rounded-[4px] shrink-0">
            <Megaphone className="w-3.5 h-3.5 text-[#23a559]" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Active Ads</span>
            <span className="text-[12px] font-mono font-black text-foreground ml-1">{metrics.activeAds.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#1E1F22] border border-border px-3 py-1.5 rounded-[4px] shrink-0">
            <Ban className="w-3.5 h-3.5 text-destructive" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Banned</span>
            <span className="text-[12px] font-mono font-black text-foreground ml-1">{metrics.bannedUsers.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {isMaster && (
        <div className="flex-shrink-0 bg-[#1E1F22] border-b border-border px-4 md:px-6 py-2 flex gap-2 shadow-sm z-10">
          <button 
            onClick={() => setAdminTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-[12px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none ${adminTab === "users" ? "bg-primary text-primary-foreground" : "bg-[#111214] text-muted-foreground hover:text-foreground border border-border"}`}
          >
            <UsersRound className="w-4 h-4" /> User Management
          </button>
          <button 
            onClick={() => setAdminTab("roles")}
            className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-[12px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none ${adminTab === "roles" ? "bg-primary text-primary-foreground" : "bg-[#111214] text-muted-foreground hover:text-foreground border border-border"}`}
          >
            <Settings2 className="w-4 h-4" /> Role Management
          </button>
        </div>
      )}

      {adminTab === "roles" && isMaster ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 animate-fade-in bg-background">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-[8px] bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Settings2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-[20px] font-black text-foreground uppercase tracking-tight">Role Management</h2>
                <p className="text-[13px] text-muted-foreground">Create and manage custom community roles.</p>
              </div>
            </div>

            <form onSubmit={handleCreateRole} className="bg-[#1E1F22] border border-border rounded-[8px] p-5 flex flex-col gap-4">
              <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">Create New Role</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Role Name</label>
                  <input 
                    type="text" 
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. contributor"
                    className="bg-[#111214] border border-border rounded-[4px] px-3 py-2 text-[13px] text-foreground focus:border-primary outline-none transition-colors w-full"
                    maxLength={20}
                    required
                  />
                </div>
                <div className="w-full sm:w-[120px] flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Color (Hex)</label>
                  <div className="flex items-center gap-2 bg-[#111214] border border-border rounded-[4px] p-1.5 h-[38px]">
                    <input 
                      type="color" 
                      value={newRoleColor}
                      onChange={(e) => setNewRoleColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-none bg-transparent p-0"
                    />
                    <span className="text-[12px] font-mono font-bold text-foreground">{newRoleColor.toUpperCase()}</span>
                  </div>
                </div>
                <div className="w-full sm:w-[100px] flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rank (3-98)</label>
                  <input 
                    type="number" 
                    value={newRoleRank}
                    onChange={(e) => setNewRoleRank(parseInt(e.target.value) || 10)}
                    min={3} max={98}
                    className="bg-[#111214] border border-border rounded-[4px] px-3 py-2 text-[13px] text-foreground font-mono focus:border-primary outline-none transition-colors w-full h-[38px]"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="bg-[#23a559] hover:bg-[#1f914e] text-white px-5 py-2 rounded-[4px] text-[12px] font-bold flex items-center gap-1.5 transition-colors focus-visible:outline-none">
                  <Plus className="w-4 h-4" /> Add Role
                </button>
              </div>
            </form>

            <div className="bg-[#1E1F22] border border-border rounded-[8px] flex flex-col overflow-hidden">
              <div className="bg-[#111214] px-5 py-3 border-b border-border">
                <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">Active Roles</h3>
              </div>
              <div className="flex flex-col p-2 gap-1.5">
                {availableRoles?.map(role => {
                  const isCore = ['master', 'admin', 'mod', 'user', 'banned'].includes(role.name);
                  return (
                    <div key={role.name} className="flex items-center justify-between p-3 bg-[#111214] border border-border rounded-[6px] hover:border-muted-foreground transition-colors">
                      <div className="flex items-center gap-4">
                        <span 
                          className="px-2.5 py-1 rounded-[4px] text-[11px] font-black uppercase tracking-wider min-w-[80px] text-center border"
                          style={{ backgroundColor: `${role.color}15`, borderColor: `${role.color}40`, color: role.color }}
                        >
                          {role.name}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-mono text-muted-foreground">Rank: {role.rank}</span>
                          {isCore && <span className="text-[9px] font-bold uppercase tracking-widest text-[#FAA61A]">Core System Role</span>}
                        </div>
                      </div>
                      {!isCore && (
                        <button 
                          onClick={() => deleteRole(role.name)}
                          className="w-8 h-8 rounded-[4px] flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none cursor-pointer"
                          title={`Delete ${role.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden animate-fade-in">
          <div className={`flex flex-col w-full ${selectedUser ? 'hidden md:flex md:w-[350px]' : 'flex'} shrink-0 border-r border-border bg-[#1E1F22]`}>
            <div className="p-3 border-b border-border bg-[#111214] flex flex-col gap-2">
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or ID..."
                  className="w-full bg-[#1E1F22] text-foreground text-[13px] pl-9 pr-3 py-2 rounded-[4px] outline-none border border-border focus:border-primary transition-colors font-medium"
                />
              </form>
              <button 
                onClick={() => setShowBannedOnly(!showBannedOnly)}
                className={`w-full py-1.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors border ${showBannedOnly ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-[#1E1F22] text-muted-foreground border-border hover:bg-[#2B2D31]'}`}
              >
                {showBannedOnly ? "Showing Banned Users Only" : "Filter: Banned Users"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Activity className="w-6 h-6 text-primary animate-pulse" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Querying...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center text-muted-foreground text-[13px] mt-10">No matching records found.</div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {users.map(u => {
                    const isSelected = selectedUser?.id === u.id;
                    const primaryColor = getPrimaryRoleDot(u.assigned_roles);
                    const isBanned = u.assigned_roles?.includes('banned');
                    
                    return (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedUser(u); triggerHaptic('light'); }}
                        className={`flex items-start gap-3 w-full p-2.5 rounded-[4px] transition-colors focus-visible:outline-none text-left border ${isSelected ? 'bg-primary/20 text-white border-primary/50' : 'hover:bg-[#2B2D31] text-muted-foreground border-transparent'} ${isBanned && !isSelected ? 'opacity-60' : ''}`}
                      >
                        <div className="relative shrink-0">
                          <img src={u.avatar_url || "/units/firezio.webp"} className="w-9 h-9 rounded-full bg-[#111214] object-cover border border-border" alt="" />
                          <div 
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1E1F22]" 
                            style={{ backgroundColor: primaryColor }}
                          />
                        </div>
                        
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className={`text-[14px] font-bold truncate leading-tight ${isBanned ? 'text-destructive line-through' : 'text-foreground'}`}>{u.username}</span>
                            {u.assigned_roles?.map(roleName => {
                              const matchedRole = availableRoles?.find(r => r.name === roleName);
                              return (
                                <span 
                                  key={roleName}
                                  className="text-[9px] font-black uppercase px-1 rounded-[3px] border"
                                  style={{ 
                                    backgroundColor: matchedRole ? `${matchedRole.color}15` : 'transparent', 
                                    borderColor: matchedRole ? `${matchedRole.color}40` : 'transparent',
                                    color: matchedRole ? matchedRole.color : 'inherit' 
                                  }}
                                >
                                  {roleName}
                                </span>
                              );
                            })}
                          </div>
                          <span className={`text-[11px] font-mono truncate ${isSelected ? 'text-foreground/70' : 'text-muted-foreground'}`}>
                            {u.discord_id}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className={`flex-1 flex flex-col bg-background relative overflow-hidden ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
            {!selectedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-background">
                <UserCircle2 className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-[16px] font-bold text-muted-foreground">No Target Selected</h3>
                <p className="text-[13px] text-muted-foreground/80 mt-1 max-w-xs">Select a user from the list to view their profile, inspect their vault, or take moderation action.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar animate-fade-in pb-10">
                
                <div className="md:hidden p-3 border-b border-border bg-[#1E1F22]">
                  <button onClick={() => setSelectedUser(null)} className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer">
                    <ArrowRight className="w-4 h-4 rotate-180" /> Back to Search
                  </button>
                </div>

                <div className={`relative h-[120px] border-b border-border ${selectedUser.assigned_roles?.includes('banned') ? 'bg-destructive/20' : 'bg-[#111214]'}`}>
                  <div className="absolute -bottom-12 left-6">
                    <img src={selectedUser.avatar_url || "/units/firezio.webp"} className="w-[100px] h-[100px] rounded-full object-cover border-[6px] border-background bg-background" alt="" />
                  </div>
                </div>

                <div className="mt-14 px-6 flex flex-col">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className={`text-[20px] font-bold tracking-tight ${selectedUser.assigned_roles?.includes('banned') ? 'text-destructive line-through' : 'text-foreground'}`}>{selectedUser.username}</h2>
                    {selectedUser.assigned_roles?.map(roleName => {
                      const rStyle = availableRoles?.find(r => r.name === roleName);
                      return (
                        <span 
                          key={roleName}
                          className="px-2.5 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider border"
                          style={{
                            backgroundColor: rStyle ? `${rStyle.color}15` : 'transparent',
                            borderColor: rStyle ? `${rStyle.color}40` : 'transparent',
                            color: rStyle ? rStyle.color : 'inherit'
                          }}
                        >
                          {roleName}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 w-fit group">
                    <span className="text-[13px] font-mono text-muted-foreground">
                      {selectedUser.discord_id}
                    </span>
                    <button onClick={() => handleCopyId(selectedUser.discord_id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground focus-visible:outline-none cursor-pointer" title="Copy Discord ID">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-8 px-6 max-w-4xl mx-auto w-full flex flex-col xl:flex-row gap-6 items-start">
                  
                  <div className="flex flex-col gap-6 w-full xl:w-[320px] shrink-0">
                    <div className="bg-[#1E1F22] rounded-[8px] p-4 flex flex-col border border-border">
                      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> Info
                      </h3>
                      {userIntel.isLoading ? (
                        <div className="h-[60px] flex items-center gap-3 text-muted-foreground text-[13px] font-medium animate-pulse">
                           <Activity className="w-4 h-4" /> Fetching records...
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#111214] p-3 rounded-[4px] border border-border">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Vault Value</span>
                            <span className="text-[15px] font-mono font-black text-foreground">{userIntel.netWorth.toLocaleString()}</span>
                          </div>
                          <div className="bg-[#111214] p-3 rounded-[4px] border border-border">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Active Ads</span>
                            <span className="text-[15px] font-mono font-black text-foreground">{userIntel.adCount}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                        <button 
                          onClick={handleInspectProfile}
                          className="w-full flex items-center justify-between px-3 py-2 bg-[#111214] hover:bg-[#2B2D31] border border-border text-muted-foreground hover:text-foreground text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                        >
                          <span className="flex items-center gap-2"><UserCircle2 className="w-4 h-4 text-muted-foreground" /> Inspect Profile</span>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button 
                          onClick={handleInspectVault}
                          className="w-full flex items-center justify-between px-3 py-2 bg-[#111214] hover:bg-[#2B2D31] border border-border text-muted-foreground hover:text-foreground text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                        >
                          <span className="flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground" /> Inspect Vault</span>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Toggle Access Roles</h3>
                      <div className="flex flex-wrap gap-2">
                        {availableRoles?.filter(role => role.name !== 'banned' && role.name !== 'master').map((r) => {
                          const isBanned = selectedUser.assigned_roles?.includes('banned');
                          const disabled = isBanned || 
                            selectedUser.id === profile?.id || 
                            (profile?.role !== 'master' && (r.name === 'master' || r.name === 'admin')) || 
                            (profile?.role !== 'master' && selectedUser.assigned_roles?.includes('master'));
                          
                          const isAssigned = selectedUser.assigned_roles?.includes(r.name);

                          return (
                            <button
                              key={r.name}
                              disabled={disabled}
                              onClick={() => setModActionData({ type: "role", payload: r.name, label: `${isAssigned ? 'Revoke' : 'Assign'} ${r.name.toUpperCase()} role`, isDestructive: isAssigned })}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-[4px] border text-[11px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#111214] cursor-pointer'}`}
                              style={{
                                backgroundColor: isAssigned ? `${r.color}20` : 'transparent',
                                borderColor: isAssigned ? `${r.color}50` : 'var(--border)',
                                color: isAssigned ? r.color : 'var(--muted-foreground)'
                              }}
                              title={isBanned ? "Cannot modify roles of a banned user. Revoke ban first." : ""}
                            >
                              {isAssigned && <Check className="w-3.5 h-3.5" />} {r.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {selectedUser.id !== profile?.id && (
                    <div className="flex flex-col gap-6 w-full">
                      <div className="flex flex-col gap-4">
                        <h3 className="text-[11px] font-bold text-destructive uppercase tracking-widest flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Moderation Toolkit
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-2 bg-[#1E1F22] p-3 rounded-[8px] border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Content Controls</span>
                            <button 
                              onClick={() => setModActionData({ type: "purge_ads", label: "Purge Active Ads", isDestructive: true })}
                              className="flex items-center gap-2 w-full p-2.5 bg-[#111214] border border-border hover:border-destructive/50 text-muted-foreground hover:text-destructive rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" /> <span className="text-[12px] font-bold">Purge Active Ads</span>
                            </button>
                            <button 
                              onClick={() => setModActionData({ type: "reset_profile", label: "Reset Profile Info", isDestructive: false })}
                              className="flex items-center gap-2 w-full p-2.5 bg-[#111214] border border-border hover:border-[#FAA61A]/50 text-muted-foreground hover:text-[#FAA61A] rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                            >
                              <RefreshCw className="w-4 h-4" /> <span className="text-[12px] font-bold">Reset Profile Info</span>
                            </button>
                            <button 
                              onClick={() => setModActionData({ type: "purge_comments", label: "Purge All Comments", isDestructive: true })}
                              className="flex items-center gap-2 w-full p-2.5 bg-[#111214] border border-border hover:border-destructive/50 text-muted-foreground hover:text-destructive rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                            >
                              <MessageSquareOff className="w-4 h-4" /> <span className="text-[12px] font-bold">Purge All Comments</span>
                            </button>
                          </div>

                          <div className="flex flex-col gap-2 bg-[#1E1F22] p-3 rounded-[8px] border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Asset Wipes</span>
                            <button 
                              onClick={() => setModActionData({ type: "wipe_inv", label: "Wipe Inventory", isDestructive: true })}
                              className="flex items-center gap-2 w-full p-2.5 bg-[#111214] border border-border hover:border-destructive/50 text-muted-foreground hover:text-destructive rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                            >
                              <Eraser className="w-4 h-4" /> <span className="text-[12px] font-bold">Wipe Inventory</span>
                            </button>
                            <button 
                              onClick={() => setModActionData({ type: "wipe_wishlist", label: "Wipe Wishlist", isDestructive: true })}
                              className="flex items-center gap-2 w-full p-2.5 bg-[#111214] border border-border hover:border-destructive/50 text-muted-foreground hover:text-destructive rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                            >
                              <Eraser className="w-4 h-4" /> <span className="text-[12px] font-bold">Wipe Wishlist</span>
                            </button>
                          </div>
                        </div>

                        <div className="mt-1 flex flex-col gap-2">
                          {!selectedUser.assigned_roles?.includes('banned') ? (
                            <button 
                              onClick={() => setModActionData({ type: "nuke", label: "Nuke & Ban Account", isDestructive: true })}
                              className="w-full flex items-center justify-center gap-2 p-3.5 bg-transparent border-2 border-destructive hover:bg-destructive text-destructive hover:text-white rounded-[4px] transition-colors focus-visible:outline-none group cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
                              <span className="text-[13px] font-black uppercase tracking-widest">Nuke & Ban Account</span>
                            </button>
                          ) : (
                            <button 
                              onClick={() => setModActionData({ type: "ban", payload: "user", label: "Revoke Ban & Restore Access", isDestructive: false })}
                              className="w-full flex items-center justify-center gap-2 p-3.5 bg-transparent border-2 border-[#23a559] hover:bg-[#23a559] text-[#23a559] hover:text-white rounded-[4px] transition-colors focus-visible:outline-none group cursor-pointer"
                            >
                              <Shield className="w-4 h-4" />
                              <span className="text-[13px] font-black uppercase tracking-widest">Revoke Ban & Restore Access</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 mt-4 border-t border-border pt-6">
                        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" /> Moderation History
                        </h3>
                        {modLogs.length === 0 ? (
                          <div className="text-[12px] text-muted-foreground italic p-4 bg-[#1E1F22] rounded-[6px] border border-border">
                            No moderation actions have been recorded for this user.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {modLogs.map(log => (
                              <div key={log.id} className="bg-[#1E1F22] p-3 rounded-[6px] border border-border flex flex-col gap-1.5 animate-fade-in">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">{log.action_type}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-[12px] text-foreground leading-snug">"{log.reason}"</p>
                                <span className="text-[10px] text-muted-foreground mt-1 text-right italic">- by {log.profiles?.username || "Unknown"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modActionData && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-[#111214]/95 animate-fade-in">
          <div className="bg-[#1E1F22] border border-border rounded-[8px] p-6 max-w-md w-full shadow-2xl flex flex-col animate-slide-up">
            <h3 className="text-[16px] font-black text-foreground uppercase tracking-wide border-b border-border pb-3 mb-4 flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${modActionData.isDestructive ? 'text-destructive' : 'text-[#FAA61A]'}`} />
              Confirm: {modActionData.label}
            </h3>
            
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Reason for action <span className="text-destructive">*</span>
            </label>
            <textarea 
              value={modReason}
              onChange={(e) => setModReason(e.target.value)}
              placeholder="Provide a mandatory reason for the audit logs..."
              className="bg-[#111214] text-foreground text-[13px] p-3 rounded-[4px] border border-border focus:border-primary outline-none resize-none h-24 mb-5"
              required
            />
            
            <div className="flex gap-3">
              <button 
                onClick={() => { setModActionData(null); setModReason(""); }}
                className="flex-1 py-2.5 rounded-[4px] bg-[#111214] hover:bg-[#2B2D31] border border-border text-foreground text-[13px] font-bold transition-colors cursor-pointer focus-visible:outline-none"
              >
                Cancel
              </button>
              <button 
                onClick={executeModAction}
                disabled={!modReason.trim()}
                className={`flex-1 py-2.5 rounded-[4px] text-white text-[13px] font-bold transition-colors shadow-sm focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${modActionData.isDestructive ? 'bg-destructive hover:bg-destructive/80' : 'bg-[#FAA61A] hover:bg-[#d98b14]'}`}
              >
                Execute Action
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="absolute bottom-6 right-6 z-[100000] animate-slide-up">
          <div className={`px-4 py-3 rounded-[6px] shadow-2xl flex items-center gap-3 border ${toast.type === 'error' ? 'bg-[#1E1F22] border-destructive/50 text-destructive' : 'bg-[#1E1F22] border-[#23a559]/50 text-[#23a559]'}`}>
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            <span className="text-[13px] font-bold">{toast.text}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

    </div>
  );
}