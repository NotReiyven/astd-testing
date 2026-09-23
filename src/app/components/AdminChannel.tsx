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
  const [newRoleColor, setNewRoleColor] = useState("#7289da");
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
    <div className="flex-1 flex flex-col overflow-hidden h-full select-none font-sans relative text-foreground bg-background">
      
      {/* Top Header */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-card/60 backdrop-blur-md border-b border-border shadow-sm z-20">
        <h2 className="text-[16px] font-black text-foreground tracking-tight uppercase flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-primary" /> Tel Aviv Center
        </h2>
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 bg-muted border border-border px-3.5 py-2 rounded-md shrink-0 shadow-inner">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Registered</span>
            <span className="text-[12px] font-mono font-black text-foreground ml-1">{metrics.totalUsers.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 bg-muted border border-border px-3.5 py-2 rounded-md shrink-0 shadow-inner">
            <Megaphone className="w-3.5 h-3.5 text-[#23a559]" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Ads</span>
            <span className="text-[12px] font-mono font-black text-foreground ml-1">{metrics.activeAds.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 bg-muted border border-border px-3.5 py-2 rounded-md shrink-0 shadow-inner">
            <Ban className="w-3.5 h-3.5 text-destructive" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Banned</span>
            <span className="text-[12px] font-mono font-black text-foreground ml-1">{metrics.bannedUsers.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Master Tabs */}
      {isMaster && (
        <div className="flex-shrink-0 bg-muted/30 backdrop-blur-sm border-b border-border px-6 py-2.5 flex gap-2 shadow-sm z-10">
          <button 
            onClick={() => setAdminTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[12px] font-bold uppercase tracking-wider transition-all cursor-pointer focus-visible:outline-none ${adminTab === "users" ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}
          >
            <UsersRound className="w-4 h-4" /> User Management
          </button>
          <button 
            onClick={() => setAdminTab("roles")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[12px] font-bold uppercase tracking-wider transition-all cursor-pointer focus-visible:outline-none ${adminTab === "roles" ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}
          >
            <Settings2 className="w-4 h-4" /> Role Management
          </button>
        </div>
      )}

      {/* Tab Content: Roles */}
      {adminTab === "roles" && isMaster ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 animate-fade-in bg-transparent z-10">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-12 h-12 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shadow-sm">
                <Settings2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-[20px] font-black text-foreground uppercase tracking-tight">Role Management</h2>
                <p className="text-[13px] text-muted-foreground">Create and manage custom community roles and permissions.</p>
              </div>
            </div>

            <form onSubmit={handleCreateRole} className="bg-card backdrop-blur-sm border border-border rounded-lg p-5 flex flex-col gap-4 shadow-md">
              <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider border-b border-border pb-2.5">Create New Role</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Role Name</label>
                  <input 
                    type="text" 
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. contributor"
                    className="bg-input border border-border rounded-md px-3.5 py-2.5 text-[13px] text-foreground focus:border-primary outline-none transition-colors w-full shadow-inner"
                    maxLength={20}
                    required
                  />
                </div>
                <div className="w-full sm:w-[130px] flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Color (Hex)</label>
                  <div className="flex items-center gap-2 bg-input border border-border rounded-md p-1.5 h-[42px] shadow-inner">
                    <input 
                      type="color" 
                      value={newRoleColor}
                      onChange={(e) => setNewRoleColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border-none bg-transparent p-0"
                    />
                    <span className="text-[12px] font-mono font-bold text-foreground">{newRoleColor.toUpperCase()}</span>
                  </div>
                </div>
                <div className="w-full sm:w-[110px] flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rank (3-98)</label>
                  <input 
                    type="number" 
                    value={newRoleRank}
                    onChange={(e) => setNewRoleRank(parseInt(e.target.value) || 10)}
                    min={3} max={98}
                    className="bg-input border border-border rounded-md px-3 py-2.5 text-[13px] text-foreground font-mono focus:border-primary outline-none transition-colors w-full h-[42px] shadow-inner"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="bg-[#23a559] hover:bg-[#1f914e] text-white px-5 py-2.5 rounded-md text-[12px] font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm focus-visible:outline-none">
                  <Plus className="w-4 h-4" /> Add Role
                </button>
              </div>
            </form>

            <div className="bg-card backdrop-blur-sm border border-border rounded-lg flex flex-col overflow-hidden shadow-md">
              <div className="bg-muted px-5 py-3.5 border-b border-border">
                <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">Active Roles</h3>
              </div>
              <div className="flex flex-col p-3 gap-2">
                {availableRoles?.map(role => {
                  const isCore = ['master', 'admin', 'mod', 'user', 'banned'].includes(role.name);
                  return (
                    <div key={role.name} className="flex items-center justify-between p-3.5 bg-muted/50 border border-border rounded-md hover:border-primary/50 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <span 
                          className="px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider min-w-[90px] text-center border shadow-sm"
                          style={{ backgroundColor: `${role.color}15`, borderColor: `${role.color}40`, color: role.color }}
                        >
                          {role.name}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-mono text-muted-foreground">Rank: <strong className="text-foreground">{role.rank}</strong></span>
                          {isCore && <span className="text-[9px] font-bold uppercase tracking-widest text-[#FAA61A]">Core System Role</span>}
                        </div>
                      </div>
                      {!isCore && (
                        <button 
                          onClick={() => deleteRole(role.name)}
                          className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/15 transition-colors focus-visible:outline-none cursor-pointer"
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
        /* Tab Content: Users */
        <div className="flex-1 flex overflow-hidden animate-fade-in bg-transparent z-10">
          
          {/* User List Sidebar */}
          <div className={`flex flex-col w-full ${selectedUser ? 'hidden md:flex md:w-[360px]' : 'flex'} shrink-0 border-r border-border bg-card/60 backdrop-blur-sm shadow-md z-10`}>
            <div className="p-3.5 border-b border-border bg-muted/30 flex flex-col gap-2.5">
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or ID..."
                  className="w-full bg-input text-foreground text-[13px] pl-9 pr-3.5 py-2.5 rounded-md outline-none border border-border focus:border-primary transition-colors font-medium shadow-inner"
                />
              </form>
              <button 
                onClick={() => setShowBannedOnly(!showBannedOnly)}
                className={`w-full py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${showBannedOnly ? 'bg-destructive/20 text-destructive border-destructive/50 shadow-sm' : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'}`}
              >
                {showBannedOnly ? "Showing Banned Users Only" : "Filter: Banned Users"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Activity className="w-6 h-6 text-primary animate-pulse" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Querying records...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center text-muted-foreground text-[13px] mt-12 px-4">No matching user records found.</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {users.map(u => {
                    const isSelected = selectedUser?.id === u.id;
                    const primaryColor = getPrimaryRoleDot(u.assigned_roles);
                    const isBanned = u.assigned_roles?.includes('banned');
                    
                    return (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedUser(u); triggerHaptic('light'); }}
                        className={`flex items-center gap-3 w-full p-3 rounded-md transition-all cursor-pointer focus-visible:outline-none text-left border ${isSelected ? 'bg-primary/20 text-foreground border-primary/60 shadow-sm' : 'hover:bg-muted text-muted-foreground border-transparent'} ${isBanned && !isSelected ? 'opacity-60' : ''}`}
                      >
                        <div className="relative shrink-0">
                          <img src={u.avatar_url || "/units/firezio.webp"} className="w-10 h-10 rounded-full bg-muted object-cover border border-border shadow-inner" alt="" />
                          <div 
                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card shadow-sm" 
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
                                  className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm border shadow-2xs"
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
                          <span className={`text-[11px] font-mono truncate ${isSelected ? 'text-foreground/80' : 'text-muted-foreground'}`}>
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

          {/* User Details & Mod Panel */}
          <div className={`flex-1 flex flex-col bg-transparent relative overflow-hidden ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
            {!selectedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <UserCircle2 className="w-16 h-16 text-muted-foreground mb-4 opacity-40" />
                <h3 className="text-[16px] font-bold text-muted-foreground">No Target Selected</h3>
                <p className="text-[13px] text-muted-foreground/70 mt-1 max-w-xs">Select a user from the directory to review profiles, inspect vaults, or execute moderation tools.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar animate-fade-in pb-12">
                
                {/* Mobile Back Button */}
                <div className="md:hidden p-3 border-b border-border bg-card/40">
                  <button onClick={() => setSelectedUser(null)} className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none">
                    <ArrowRight className="w-4 h-4 rotate-180" /> Back to Directory
                  </button>
                </div>

                {/* Banner & Avatar Header */}
                <div className={`relative h-[130px] border-b border-border ${selectedUser.assigned_roles?.includes('banned') ? 'bg-destructive/20' : 'bg-muted'}`}>
                  <div className="absolute -bottom-10 left-6">
                    <img src={selectedUser.avatar_url || "/units/firezio.webp"} className="w-[96px] h-[96px] rounded-full object-cover border-[5px] border-background bg-card shadow-md" alt="" />
                  </div>
                </div>

                <div className="mt-12 px-6 flex flex-col">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className={`text-[22px] font-black tracking-tight ${selectedUser.assigned_roles?.includes('banned') ? 'text-destructive line-through' : 'text-foreground'}`}>{selectedUser.username}</h2>
                    {selectedUser.assigned_roles?.map(roleName => {
                      const rStyle = availableRoles?.find(r => r.name === roleName);
                      return (
                        <span 
                          key={roleName}
                          className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-2xs"
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
                  <div className="flex items-center gap-2 mt-1 w-fit group">
                    <span className="text-[13px] font-mono text-muted-foreground">
                      {selectedUser.discord_id}
                    </span>
                    <button onClick={() => handleCopyId(selectedUser.discord_id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none" title="Copy Discord ID">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="mt-8 px-6 max-w-4xl mx-auto w-full flex flex-col xl:flex-row gap-6 items-start">
                  
                  {/* Left Column: Intel & Roles */}
                  <div className="flex flex-col gap-6 w-full xl:w-[320px] shrink-0">
                    <div className="bg-card backdrop-blur-sm rounded-lg p-4.5 flex flex-col border border-border shadow-md">
                      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3.5 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-primary" /> Account Intel
                      </h3>
                      {userIntel.isLoading ? (
                        <div className="h-[60px] flex items-center gap-3 text-muted-foreground text-[13px] font-medium animate-pulse">
                           <Activity className="w-4 h-4 text-primary" /> Fetching vault records...
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-input p-3 rounded-md border border-border shadow-inner">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Vault Value</span>
                            <span className="text-[15px] font-mono font-black text-foreground">{userIntel.netWorth.toLocaleString()}</span>
                          </div>
                          <div className="bg-input p-3 rounded-md border border-border shadow-inner">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Active Ads</span>
                            <span className="text-[15px] font-mono font-black text-foreground">{userIntel.adCount}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                        <button 
                          onClick={handleInspectProfile}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground text-[12px] font-bold rounded-md transition-all cursor-pointer focus-visible:outline-none shadow-sm"
                        >
                          <span className="flex items-center gap-2.5"><UserCircle2 className="w-4 h-4 text-primary" /> Inspect Profile</span>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button 
                          onClick={handleInspectVault}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground text-[12px] font-bold rounded-md transition-all cursor-pointer focus-visible:outline-none shadow-sm"
                        >
                          <span className="flex items-center gap-2.5"><Package className="w-4 h-4 text-primary" /> Inspect Vault</span>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-card backdrop-blur-sm rounded-lg p-4.5 flex flex-col border border-border shadow-md gap-3">
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
                              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer focus-visible:outline-none shadow-2xs ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'}`}
                              style={{
                                backgroundColor: isAssigned ? `${r.color}20` : 'var(--muted)',
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

                  {/* Right Column: Moderation Toolkit & History */}
                  {selectedUser.id !== profile?.id && (
                    <div className="flex flex-col gap-6 w-full flex-1">
                      <div className="bg-card backdrop-blur-sm rounded-lg p-5 border border-border shadow-md flex flex-col gap-4">
                        <h3 className="text-[11px] font-bold text-destructive uppercase tracking-widest flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> Moderation Toolkit
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="flex flex-col gap-2.5 bg-muted p-3.5 rounded-md border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Content Controls</span>
                            <button 
                              onClick={() => setModActionData({ type: "purge_ads", label: "Purge Active Ads", isDestructive: true })}
                              className="flex items-center gap-2.5 w-full p-2.5 bg-card border border-border hover:border-destructive/60 text-muted-foreground hover:text-destructive rounded-md transition-all cursor-pointer focus-visible:outline-none shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" /> <span className="text-[12px] font-bold">Purge Active Ads</span>
                            </button>
                            <button 
                              onClick={() => setModActionData({ type: "reset_profile", label: "Reset Profile Info", isDestructive: false })}
                              className="flex items-center gap-2.5 w-full p-2.5 bg-card border border-border hover:border-[#FAA61A]/60 text-muted-foreground hover:text-[#FAA61A] rounded-md transition-all cursor-pointer focus-visible:outline-none shadow-sm"
                            >
                              <RefreshCw className="w-4 h-4" /> <span className="text-[12px] font-bold">Reset Profile Info</span>
                            </button>
                            <button 
                              onClick={() => setModActionData({ type: "purge_comments", label: "Purge All Comments", isDestructive: true })}
                              className="flex items-center gap-2.5 w-full p-2.5 bg-card border border-border hover:border-destructive/60 text-muted-foreground hover:text-destructive rounded-md transition-all cursor-pointer focus-visible:outline-none shadow-sm"
                            >
                              <MessageSquareOff className="w-4 h-4" /> <span className="text-[12px] font-bold">Purge All Comments</span>
                            </button>
                          </div>

                          <div className="flex flex-col gap-2.5 bg-muted p-3.5 rounded-md border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Asset Wipes</span>
                            <button 
                              onClick={() => setModActionData({ type: "wipe_inv", label: "Wipe Inventory", isDestructive: true })}
                              className="flex items-center gap-2.5 w-full p-2.5 bg-card border border-border hover:border-destructive/60 text-muted-foreground hover:text-destructive rounded-md transition-all cursor-pointer focus-visible:outline-none shadow-sm"
                            >
                              <Eraser className="w-4 h-4" /> <span className="text-[12px] font-bold">Wipe Inventory</span>
                            </button>
                            <button 
                              onClick={() => setModActionData({ type: "wipe_wishlist", label: "Wipe Wishlist", isDestructive: true })}
                              className="flex items-center gap-2.5 w-full p-2.5 bg-card border border-border hover:border-destructive/60 text-muted-foreground hover:text-destructive rounded-md transition-all cursor-pointer focus-visible:outline-none shadow-sm"
                            >
                              <Eraser className="w-4 h-4" /> <span className="text-[12px] font-bold">Wipe Wishlist</span>
                            </button>
                          </div>
                        </div>

                        <div className="mt-1 flex flex-col gap-2">
                          {!selectedUser.assigned_roles?.includes('banned') ? (
                            <button 
                              onClick={() => setModActionData({ type: "nuke", label: "Nuke & Ban Account", isDestructive: true })}
                              className="w-full flex items-center justify-center gap-2.5 p-3.5 bg-transparent border-2 border-destructive hover:bg-destructive text-destructive hover:text-destructive-foreground rounded-md transition-all cursor-pointer focus-visible:outline-none shadow-sm font-black uppercase tracking-wider"
                            >
                              <Ban className="w-4 h-4" />
                              <span className="text-[13px]">Nuke & Ban Account</span>
                            </button>
                          ) : (
                            <button 
                              onClick={() => setModActionData({ type: "ban", payload: "user", label: "Revoke Ban & Restore Access", isDestructive: false })}
                              className="w-full flex items-center justify-center gap-2.5 p-3.5 bg-transparent border-2 border-[#23a559] hover:bg-[#23a559] text-[#23a559] hover:text-white rounded-md transition-all cursor-pointer focus-visible:outline-none shadow-sm font-black uppercase tracking-wider"
                            >
                              <Shield className="w-4 h-4" />
                              <span className="text-[13px]">Revoke Ban & Restore Access</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="bg-card backdrop-blur-sm rounded-lg p-5 border border-border shadow-md flex flex-col gap-3">
                        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-primary" /> Moderation History
                        </h3>
                        {modLogs.length === 0 ? (
                          <div className="text-[12px] text-muted-foreground italic p-4 bg-muted rounded-md border border-border">
                            No moderation actions have been recorded for this user.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                            {modLogs.map(log => (
                              <div key={log.id} className="bg-input p-3.5 rounded-md border border-border flex flex-col gap-1.5 shadow-2xs animate-fade-in">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">{log.action_type}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-[12px] text-foreground leading-snug">"{log.reason}"</p>
                                <span className="text-[10px] text-muted-foreground mt-0.5 text-right italic">- by {log.profiles?.username || "Unknown"}</span>
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

      {/* Confirmation Modal */}
      {modActionData && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full shadow-2xl flex flex-col animate-slide-up">
            <h3 className="text-[16px] font-black text-foreground uppercase tracking-wide border-b border-border pb-3.5 mb-4 flex items-center gap-2.5">
              <AlertTriangle className={`w-5 h-5 ${modActionData.isDestructive ? 'text-destructive' : 'text-[#FAA61A]'}`} />
              Confirm: {modActionData.label}
            </h3>
            
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Reason for action <span className="text-destructive">*</span>
            </label>
            <textarea 
              value={modReason}
              onChange={(e) => setModReason(e.target.value)}
              placeholder="Provide a mandatory audit log reason..."
              className="bg-input text-foreground text-[13px] p-3.5 rounded-md border border-border focus:border-primary outline-none resize-none h-24 mb-5 shadow-inner"
              required
            />
            
            <div className="flex gap-3">
              <button 
                onClick={() => { setModActionData(null); setModReason(""); }}
                className="flex-1 py-2.5 rounded-md bg-muted hover:bg-muted/80 border border-border text-foreground text-[13px] font-bold transition-colors cursor-pointer focus-visible:outline-none shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={executeModAction}
                disabled={!modReason.trim()}
                className={`flex-1 py-2.5 rounded-md text-white text-[13px] font-bold transition-colors shadow-sm focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${modActionData.isDestructive ? 'bg-destructive hover:bg-destructive/80' : 'bg-[#FAA61A] hover:bg-[#d98b14]'}`}
              >
                Execute Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="absolute bottom-6 right-6 z-[100000] animate-slide-up">
          <div className={`px-4.5 py-3 rounded-lg shadow-2xl flex items-center gap-3 border ${toast.type === 'error' ? 'bg-popover border-destructive/50 text-destructive' : 'bg-popover border-[#23a559]/50 text-[#23a559]'}`}>
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span className="text-[13px] font-bold">{toast.text}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

    </div>
  );
}