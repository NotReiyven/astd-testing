// ================================================
// FILE: src/app/components/AdminChannel.tsx
// ================================================

import { useState } from "react";
import { 
  Search, ShieldAlert, Shield, Package, 
  Trash2, Ban, X, Copy, Check, Activity, 
  Users, Megaphone, ArrowRight, AlertTriangle, 
  UserCircle2, ArrowUpRight, RefreshCw, Eraser, MessageSquareOff, Plus, Settings2, UsersRound
} from "lucide-react";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useAdminIntel } from "../../hooks/useAdminIntel";
import { triggerHaptic } from "../../data/helpers";

export function AdminChannel() {
  const { setViewingUser } = useInventoryStore();

  const {
    users, selectedUser, setSelectedUser, userIntel, metrics, availableRoles,
    searchQuery, setSearchQuery, isLoading, toast, setToast,
    handleSearch, updateUserRole, createNewRole, deleteRole, handleResetProfile, handlePurgeAds, handlePurgeComments,
    handleWipeInventory, handleWipeWishlist, handleTotalAccountNuke,
    profile, isMaster
  } = useAdminIntel();

  // Navigation State
  const [adminTab, setAdminTab] = useState<"users" | "roles">("users");

  // Role Management State
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#10B981");
  const [newRoleRank, setNewRoleRank] = useState(10);

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

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    triggerHaptic('medium');
    createNewRole(newRoleName, newRoleColor, newRoleRank);
    setNewRoleName("");
  };

  const getPrimaryRoleDot = (assignedRoles: string[]) => {
    if (!assignedRoles || assignedRoles.length === 0) return '#23a559';
    // Sort roles by rank to find the primary color dot
    const matched = assignedRoles
      .map(r => availableRoles?.find(ar => ar.name === r))
      .filter(Boolean)
      .sort((a, b) => (a!.rank) - (b!.rank));
    
    return matched.length > 0 ? matched[0]!.color : '#23a559';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background h-full select-none font-sans relative">
      
      {/* TOP HEADER */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6 py-4 bg-card border-b border-border shadow-sm z-20">
        <h2 className="text-[16px] font-black text-foreground tracking-tight uppercase flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-destructive" /> Tel Aviv Center
        </h2>
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 bg-popover border border-border px-3 py-1.5 rounded-[4px] shrink-0">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Registered Users</span>
            <span className="text-[12px] font-mono font-black text-foreground ml-1">{metrics.totalUsers.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 bg-popover border border-border px-3 py-1.5 rounded-[4px] shrink-0">
            <Megaphone className="w-3.5 h-3.5 text-[#23a559]" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Active Ads</span>
            <span className="text-[12px] font-mono font-black text-foreground ml-1">{metrics.activeAds.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 bg-popover border border-border px-3 py-1.5 rounded-[4px] shrink-0">
            <Ban className="w-3.5 h-3.5 text-destructive" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Banned</span>
            <span className="text-[12px] font-mono font-black text-foreground ml-1">{metrics.bannedUsers.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ADMIN TABS (Only visible to Master) */}
      {isMaster && (
        <div className="flex-shrink-0 bg-card border-b border-border px-4 md:px-6 py-2 flex gap-2 shadow-sm z-10">
          <button 
            onClick={() => setAdminTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-[12px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none ${adminTab === "users" ? "bg-primary text-primary-foreground shadow-sm" : "bg-popover text-muted-foreground hover:text-foreground hover:bg-muted border border-border"}`}
          >
            <UsersRound className="w-4 h-4" /> User Management
          </button>
          <button 
            onClick={() => setAdminTab("roles")}
            className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-[12px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none ${adminTab === "roles" ? "bg-primary text-primary-foreground shadow-sm" : "bg-popover text-muted-foreground hover:text-foreground hover:bg-muted border border-border"}`}
          >
            <Settings2 className="w-4 h-4" /> Role Management
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {adminTab === "roles" && isMaster ? (
        // ==========================================
        // ROLE MANAGEMENT DASHBOARD
        // ==========================================
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

            {/* Create Role Form */}
            <form onSubmit={handleCreateRole} className="bg-card border border-border rounded-[8px] p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">Create New Role</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Role Name</label>
                  <input 
                    type="text" 
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. contributor"
                    className="bg-input border border-border rounded-[4px] px-3 py-2 text-[13px] text-foreground focus:border-primary outline-none transition-colors w-full"
                    maxLength={20}
                    required
                  />
                </div>
                <div className="w-full sm:w-[120px] flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Color (Hex)</label>
                  <div className="flex items-center gap-2 bg-input border border-border rounded-[4px] p-1.5 h-[38px]">
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
                    className="bg-input border border-border rounded-[4px] px-3 py-2 text-[13px] text-foreground font-mono focus:border-primary outline-none transition-colors w-full h-[38px]"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="bg-[#23a559] hover:bg-[#1f914e] text-white px-5 py-2 rounded-[4px] text-[12px] font-bold flex items-center gap-1.5 transition-colors shadow-sm focus-visible:outline-none">
                  <Plus className="w-4 h-4" /> Add Role
                </button>
              </div>
            </form>

            {/* Existing Roles List */}
            <div className="bg-card border border-border rounded-[8px] flex flex-col shadow-sm overflow-hidden">
              <div className="bg-popover px-5 py-3 border-b border-border">
                <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">Active Roles</h3>
              </div>
              <div className="flex flex-col p-2 gap-1.5">
                {availableRoles?.map(role => {
                  const isCore = ['master', 'admin', 'mod', 'user', 'banned'].includes(role.name);
                  return (
                    <div key={role.name} className="flex items-center justify-between p-3 bg-popover border border-border rounded-[6px] hover:border-muted-foreground transition-colors">
                      <div className="flex items-center gap-4">
                        <span 
                          className="px-2.5 py-1 rounded-[4px] text-[11px] font-black uppercase tracking-wider min-w-[80px] text-center"
                          style={{ backgroundColor: `${role.color}20`, color: role.color }}
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
        // ==========================================
        // USER MANAGEMENT DASHBOARD
        // ==========================================
        <div className="flex-1 flex overflow-hidden animate-fade-in">
          {/* Left Column: Sorted User List */}
          <div className={`flex flex-col w-full ${selectedUser ? 'hidden md:flex md:w-[350px]' : 'flex'} shrink-0 border-r border-border bg-card`}>
            <div className="p-3 border-b border-border bg-popover">
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or ID..."
                  className="w-full bg-card text-foreground text-[13px] pl-9 pr-3 py-2 rounded-[4px] outline-none border border-border focus:border-primary transition-colors shadow-inner font-medium"
                />
              </form>
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
                    
                    return (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedUser(u); triggerHaptic('light'); }}
                        className={`flex items-start gap-3 w-full p-2.5 rounded-[4px] transition-colors focus-visible:outline-none text-left ${isSelected ? 'bg-primary/20 text-white border border-primary/50' : 'hover:bg-popover text-muted-foreground border border-transparent'}`}
                      >
                        <div className="relative shrink-0">
                          <img src={u.avatar_url || "/units/firezio.webp"} className="w-9 h-9 rounded-full bg-popover object-cover border border-border" alt="" />
                          <div 
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card" 
                            style={{ backgroundColor: primaryColor }}
                          />
                        </div>
                        
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-[14px] font-bold truncate leading-tight text-foreground">{u.username}</span>
                            {/* RENDER ALL ASSIGNED ROLES */}
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

          {/* Right Column: Profile Sheet */}
          <div className={`flex-1 flex flex-col bg-background relative overflow-hidden ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
            {!selectedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-background">
                <UserCircle2 className="w-16 h-16 text-muted-foreground mb-4 drop-shadow-sm" />
                <h3 className="text-[16px] font-bold text-muted-foreground">No Target Selected</h3>
                <p className="text-[13px] text-muted-foreground/80 mt-1 max-w-xs">Select a user from the list to view their profile, inspect their vault, or take moderation action.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar animate-fade-in pb-10">
                
                <div className="md:hidden p-3 border-b border-border bg-card">
                  <button onClick={() => setSelectedUser(null)} className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer">
                    <ArrowRight className="w-4 h-4 rotate-180" /> Back to Search
                  </button>
                </div>

                <div className={`relative h-[120px] border-b border-border ${selectedUser.assigned_roles?.includes('banned') ? 'bg-destructive/20' : 'bg-popover'}`}>
                  <div className="absolute -bottom-12 left-6">
                    <img src={selectedUser.avatar_url || "/units/firezio.webp"} className="w-[100px] h-[100px] rounded-full object-cover border-[6px] border-background bg-background" alt="" />
                  </div>
                </div>

                <div className="mt-14 px-6 flex flex-col">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[20px] font-bold text-foreground tracking-tight">{selectedUser.username}</h2>
                    {/* RENDER ALL ASSIGNED ROLES ON PROFILE HEADER */}
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
                    <span className="text-[13px] text-muted-foreground">
                      {selectedUser.discord_id}
                    </span>
                    <button onClick={() => handleCopyId(selectedUser.discord_id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground focus-visible:outline-none cursor-pointer" title="Copy Discord ID">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-8 px-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
                  
                  <div className="bg-card rounded-[8px] p-4 flex flex-col shadow-sm border border-border">
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5" /> Info
                    </h3>
                    {userIntel.isLoading ? (
                      <div className="h-[60px] flex items-center gap-3 text-muted-foreground text-[13px] font-medium animate-pulse">
                         <Activity className="w-4 h-4" /> Fetching database records...
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-popover p-3 rounded-[4px] border border-border">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Vault Net Worth</span>
                          <span className="text-[16px] font-mono font-black text-foreground">{userIntel.netWorth.toLocaleString()}</span>
                        </div>
                        <div className="bg-popover p-3 rounded-[4px] border border-border">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Active Listings</span>
                          <span className="text-[16px] font-mono font-black text-foreground">{userIntel.adCount}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-border">
                      <button 
                        onClick={handleInspectVault}
                        className="w-full flex items-center justify-between px-3 py-2 bg-popover hover:bg-border border border-border text-muted-foreground hover:text-foreground text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                      >
                        <span className="flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground" /> Inspect Vault</span>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Toggle Access Roles</h3>
                    <div className="flex flex-wrap gap-2">
                      {/* Show all roles except 'banned' and 'master' for toggling */}
                      {availableRoles?.filter(role => role.name !== 'banned' && role.name !== 'master').map((r) => {
                        const disabled = selectedUser.id === profile?.id || (!isMaster && (r.name === 'admin' || r.name === 'mod' || selectedUser.assigned_roles?.includes('master') || selectedUser.assigned_roles?.includes('admin')));
                        const isAssigned = selectedUser.assigned_roles?.includes(r.name);

                        const dynamicStyle = {
                          backgroundColor: isAssigned ? `${r.color}20` : 'transparent',
                          borderColor: isAssigned ? `${r.color}50` : 'var(--border)',
                          color: isAssigned ? r.color : 'var(--muted-foreground)'
                        };

                        return (
                          <button
                            key={r.name}
                            disabled={disabled}
                            onClick={() => updateUserRole(selectedUser.id, r.name)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-[4px] border text-[11px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-popover cursor-pointer'}`}
                            style={dynamicStyle}
                            title={isAssigned ? "Click to remove role" : "Click to assign role"}
                          >
                            {isAssigned && <Check className="w-3.5 h-3.5" />} {r.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedUser.id !== profile?.id && (
                    <div className="flex flex-col gap-4 mt-2">
                      <h3 className="text-[11px] font-bold text-destructive uppercase tracking-widest flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Moderation Toolkit
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2 bg-card p-3 rounded-[8px] border border-border">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Content Controls</span>
                          <button 
                            onClick={handlePurgeAds}
                            className="flex items-center gap-2 w-full p-2.5 bg-popover border border-border hover:border-destructive/50 text-muted-foreground hover:text-destructive rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" /> <span className="text-[12px] font-bold">Purge Active Ads</span>
                          </button>
                          <button 
                            onClick={handleResetProfile}
                            className="flex items-center gap-2 w-full p-2.5 bg-popover border border-border hover:border-[#FAA61A]/50 text-muted-foreground hover:text-[#FAA61A] rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4" /> <span className="text-[12px] font-bold">Reset Profile Info</span>
                          </button>
                          <button 
                            onClick={handlePurgeComments}
                            className="flex items-center gap-2 w-full p-2.5 bg-popover border border-border hover:border-destructive/50 text-muted-foreground hover:text-destructive rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                          >
                            <MessageSquareOff className="w-4 h-4" /> <span className="text-[12px] font-bold">Purge All Comments</span>
                          </button>
                        </div>

                        <div className="flex flex-col gap-2 bg-card p-3 rounded-[8px] border border-border">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Asset Wipes</span>
                          <button 
                            onClick={handleWipeInventory}
                            className="flex items-center gap-2 w-full p-2.5 bg-popover border border-border hover:border-destructive/50 text-muted-foreground hover:text-destructive rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                          >
                            <Eraser className="w-4 h-4" /> <span className="text-[12px] font-bold">Wipe Inventory</span>
                          </button>
                          <button 
                            onClick={handleWipeWishlist}
                            className="flex items-center gap-2 w-full p-2.5 bg-popover border border-border hover:border-destructive/50 text-muted-foreground hover:text-destructive rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer"
                          >
                            <Eraser className="w-4 h-4" /> <span className="text-[12px] font-bold">Wipe Wishlist</span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-col gap-2">
                        {!selectedUser.assigned_roles?.includes('banned') ? (
                          <button 
                            onClick={handleTotalAccountNuke}
                            className="w-full flex items-center justify-center gap-2 p-3.5 bg-transparent border-2 border-destructive hover:bg-destructive text-destructive hover:text-destructive-foreground rounded-[4px] transition-colors shadow-sm focus-visible:outline-none group cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                            <span className="text-[13px] font-black uppercase tracking-widest">Nuke & Ban Account</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => updateUserRole(selectedUser.id, 'user')} // Toggle 'user' will reset ban because of the toggle logic
                            className="w-full flex items-center justify-center gap-2 p-3.5 bg-card border-2 border-[#23a559] hover:bg-[#23a559] text-[#23a559] hover:text-white rounded-[4px] transition-colors shadow-sm focus-visible:outline-none group cursor-pointer"
                          >
                            <Shield className="w-4 h-4" />
                            <span className="text-[13px] font-black uppercase tracking-widest">Revoke Ban & Restore Access</span>
                          </button>
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

      {toast && (
        <div className="absolute bottom-6 right-6 z-[100000] animate-slide-up">
          <div className={`px-4 py-3 rounded-[6px] shadow-2xl flex items-center gap-3 border ${toast.type === 'error' ? 'bg-popover border-destructive/50 text-destructive' : 'bg-popover border-[#23a559]/50 text-[#23a559]'}`}>
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            <span className="text-[13px] font-bold">{toast.text}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

    </div>
  );
}