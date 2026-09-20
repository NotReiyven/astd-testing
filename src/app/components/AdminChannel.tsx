// ================================================
// FILE: src/app/components/AdminChannel.tsx
// ================================================

import { 
  Search, ShieldAlert, Shield, Package, 
  Trash2, Ban, X, Copy, Check, Activity, 
  Users, Megaphone, ArrowRight, AlertTriangle, 
  UserCircle2, ArrowUpRight, RefreshCw, Eraser, MessageSquareOff
} from "lucide-react";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useAdminIntel } from "../../hooks/useAdminIntel";
import { triggerHaptic } from "../../data/helpers";

export function AdminChannel() {
  const { setViewingUser } = useInventoryStore();

  const {
    users, selectedUser, setSelectedUser, userIntel, metrics,
    searchQuery, setSearchQuery, isLoading, toast, setToast,
    handleSearch, updateUserRole, handleResetProfile, handlePurgeAds, handlePurgeComments,
    handleWipeInventory, handleWipeWishlist, handleTotalAccountNuke,
    profile, isMaster
  } = useAdminIntel();

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    triggerHaptic('light');
  };

  const handleInspectVault = () => {
    if (!selectedUser) return;
    triggerHaptic('medium');
    // Pass 'admin-panel' as the return channel
    setViewingUser(selectedUser.id, selectedUser.username, "admin-panel");
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
  };

  const getRoleStyle = (role: string) => {
    switch(role) {
      case 'master': return { bg: 'bg-[#ed4245]/10', text: 'text-[#ed4245]', border: 'border-[#ed4245]/30', dot: 'bg-[#ed4245]' };
      case 'admin': return { bg: 'bg-[#FAA61A]/10', text: 'text-[#FAA61A]', border: 'border-[#FAA61A]/30', dot: 'bg-[#FAA61A]' };
      case 'mod': return { bg: 'bg-[#7289da]/10', text: 'text-[#7289da]', border: 'border-[#7289da]/30', dot: 'bg-[#7289da]' };
      case 'banned': return { bg: 'bg-[#1e2124]', text: 'text-[#80848E]', border: 'border-[#424549]', dot: 'bg-[#80848E]' };
      default: return { bg: 'bg-[#23a559]/10', text: 'text-[#23a559]', border: 'border-[#23a559]/30', dot: 'bg-[#23a559]' };
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#36393e] h-full select-none font-sans relative">
      
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-6 py-4 bg-[#282b30] border-b border-[#424549] shadow-sm z-20">
        <h2 className="text-[16px] font-black text-[#ffffff] tracking-tight uppercase flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#ed4245]" /> Moderation Center
        </h2>
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 bg-[#1e2124] border border-[#424549] px-3 py-1.5 rounded-[4px] shrink-0">
            <Users className="w-3.5 h-3.5 text-[#7289da]" />
            <span className="text-[11px] font-bold text-[#b9bbbe] uppercase">Registered Users</span>
            <span className="text-[12px] font-mono font-black text-[#ffffff] ml-1">{metrics.totalUsers.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#1e2124] border border-[#424549] px-3 py-1.5 rounded-[4px] shrink-0">
            <Megaphone className="w-3.5 h-3.5 text-[#23a559]" />
            <span className="text-[11px] font-bold text-[#b9bbbe] uppercase">Active Ads</span>
            <span className="text-[12px] font-mono font-black text-[#ffffff] ml-1">{metrics.activeAds.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#1e2124] border border-[#424549] px-3 py-1.5 rounded-[4px] shrink-0">
            <Ban className="w-3.5 h-3.5 text-[#ed4245]" />
            <span className="text-[11px] font-bold text-[#b9bbbe] uppercase">Banned Accounts</span>
            <span className="text-[12px] font-mono font-black text-[#ffffff] ml-1">{metrics.bannedUsers.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Sorted User List */}
        <div className={`flex flex-col w-full ${selectedUser ? 'hidden md:flex md:w-[350px]' : 'flex'} shrink-0 border-r border-[#424549] bg-[#282b30]`}>
          <div className="p-3 border-b border-[#424549] bg-[#1e2124]">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="w-4 h-4 text-[#72767d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or ID..."
                className="w-full bg-[#282b30] text-[#ffffff] text-[13px] pl-9 pr-3 py-2 rounded-[4px] outline-none border border-[#424549] focus:border-[#7289da] transition-colors shadow-inner font-medium"
              />
            </form>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Activity className="w-6 h-6 text-[#7289da] animate-pulse" />
                <span className="text-[11px] font-bold text-[#72767d] uppercase tracking-widest">Querying...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center text-[#72767d] text-[13px] mt-10">No matching records found.</div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {users.map(u => {
                  const isSelected = selectedUser?.id === u.id;
                  const roleStyle = getRoleStyle(u.role);
                  
                  return (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedUser(u); triggerHaptic('light'); }}
                      className={`flex items-center gap-3 w-full p-2.5 rounded-[4px] transition-colors focus-visible:outline-none text-left ${isSelected ? 'bg-[#7289da]/20 text-white border border-[#7289da]/50' : 'hover:bg-[#1e2124] text-[#b9bbbe] border border-transparent'}`}
                    >
                      <div className="relative shrink-0">
                        <img src={u.avatar_url || "/units/firezio.webp"} className="w-9 h-9 rounded-full bg-[#1e2124] object-cover border border-[#424549]" alt="" />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#282b30] ${roleStyle.dot}`} />
                      </div>
                      
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold truncate leading-tight">{u.username}</span>
                          <span className={`text-[9px] font-black uppercase px-1 rounded-[3px] ${roleStyle.bg} ${roleStyle.text}`}>
                            {u.role}
                          </span>
                        </div>
                        <span className={`text-[11px] font-mono truncate ${isSelected ? 'text-[rgba(255,255,255,0.7)]' : 'text-[#72767d]'}`}>
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
        <div className={`flex-1 flex flex-col bg-[#36393e] relative overflow-hidden ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#36393e]">
              <UserCircle2 className="w-16 h-16 text-[#424549] mb-4 drop-shadow-sm" />
              <h3 className="text-[16px] font-bold text-[#b9bbbe]">No Target Selected</h3>
              <p className="text-[13px] text-[#72767d] mt-1 max-w-xs">Select a user from the list to view their profile, inspect their vault, or take moderation action.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar animate-fade-in pb-10">
              
              <div className="md:hidden p-3 border-b border-[#424549] bg-[#282b30]">
                <button onClick={() => setSelectedUser(null)} className="flex items-center gap-1.5 text-[12px] font-bold text-[#b9bbbe] hover:text-[#ffffff] transition-colors focus-visible:outline-none">
                  <ArrowRight className="w-4 h-4 rotate-180" /> Back to Search
                </button>
              </div>

              <div className={`relative h-[120px] border-b border-[#424549] ${selectedUser.role === 'banned' ? 'bg-[#ed4245]/20' : 'bg-[#1e2124]'}`}>
                <div className="absolute -bottom-12 left-6">
                  <img src={selectedUser.avatar_url || "/units/firezio.webp"} className="w-[100px] h-[100px] rounded-full object-cover border-[6px] border-[#36393e] bg-[#36393e]" alt="" />
                </div>
              </div>

              <div className="mt-14 px-6 flex flex-col">
                <div className="flex items-center gap-3">
                  <h2 className="text-[20px] font-bold text-[#ffffff] tracking-tight">{selectedUser.username}</h2>
                  <span className={`px-2.5 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider ${getRoleStyle(selectedUser.role).bg} ${getRoleStyle(selectedUser.role).text}`}>
                    {selectedUser.role}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 w-fit group">
                  <span className="text-[13px] text-[#b9bbbe]">
                    {selectedUser.discord_id}
                  </span>
                  <button onClick={() => handleCopyId(selectedUser.discord_id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#72767d] hover:text-white focus-visible:outline-none" title="Copy Discord ID">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-8 px-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
                
                <div className="bg-[#282b30] rounded-[8px] p-4 flex flex-col shadow-sm border border-[#424549]">
                  <h3 className="text-[11px] font-bold text-[#72767d] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" /> Info
                  </h3>
                  {userIntel.isLoading ? (
                    <div className="h-[60px] flex items-center gap-3 text-[#72767d] text-[13px] font-medium animate-pulse">
                       <Activity className="w-4 h-4" /> Fetching database records...
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#1e2124] p-3 rounded-[4px] border border-[#424549]">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#b9bbbe] mb-1">Vault Net Worth</span>
                        <span className="text-[16px] font-mono font-black text-[#ffffff]">{userIntel.netWorth.toLocaleString()}</span>
                      </div>
                      <div className="bg-[#1e2124] p-3 rounded-[4px] border border-[#424549]">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#b9bbbe] mb-1">Active Listings</span>
                        <span className="text-[16px] font-mono font-black text-[#ffffff]">{userIntel.adCount}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-[#424549]">
                    <button 
                      onClick={handleInspectVault}
                      className="w-full flex items-center justify-between px-3 py-2 bg-[#1e2124] hover:bg-[#424549] border border-[#424549] text-[#b9bbbe] hover:text-white text-[12px] font-bold rounded-[4px] transition-colors focus-visible:outline-none"
                    >
                      <span className="flex items-center gap-2"><Package className="w-4 h-4 text-[#72767d]" /> Inspect Vault</span>
                      <ArrowUpRight className="w-4 h-4 text-[#72767d]" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-bold text-[#72767d] uppercase tracking-widest">Access Role</h3>
                  <div className="flex flex-wrap gap-2">
                    {['user', 'mod', 'admin'].map((r) => {
                      const disabled = selectedUser.id === profile?.id || (!isMaster && (r === 'admin' || r === 'mod' || selectedUser.role === 'master' || selectedUser.role === 'admin'));
                      const isAssigned = selectedUser.role === r;
                      const style = getRoleStyle(r);

                      return (
                        <button
                          key={r}
                          disabled={disabled}
                          onClick={() => updateUserRole(selectedUser.id, r)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-[4px] border text-[11px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none ${
                            isAssigned 
                              ? `${style.bg} ${style.border}${style.text}` 
                              : `bg-transparent border-[#424549] text-[#72767d] hover:bg-[#1e2124] hover:text-[#b9bbbe] ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`
                          }`}
                        >
                          {isAssigned && <Check className="w-3.5 h-3.5" />} {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedUser.id !== profile?.id && (
                  <div className="flex flex-col gap-4 mt-2">
                    <h3 className="text-[11px] font-bold text-[#ed4245] uppercase tracking-widest flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Moderation Toolkit
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2 bg-[#282b30] p-3 rounded-[8px] border border-[#424549]">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#b9bbbe] mb-1">Content Controls</span>
                        <button 
                          onClick={handlePurgeAds}
                          className="flex items-center gap-2 w-full p-2.5 bg-[#1e2124] border border-[#424549] hover:border-[#ed4245]/50 text-[#b9bbbe] hover:text-[#ed4245] rounded-[4px] transition-colors focus-visible:outline-none"
                        >
                          <Trash2 className="w-4 h-4" /> <span className="text-[12px] font-bold">Purge Active Ads</span>
                        </button>
                        <button 
                          onClick={handleResetProfile}
                          className="flex items-center gap-2 w-full p-2.5 bg-[#1e2124] border border-[#424549] hover:border-[#FAA61A]/50 text-[#b9bbbe] hover:text-[#FAA61A] rounded-[4px] transition-colors focus-visible:outline-none"
                        >
                          <RefreshCw className="w-4 h-4" /> <span className="text-[12px] font-bold">Reset Profile Info</span>
                        </button>
                        <button 
                          onClick={handlePurgeComments}
                          className="flex items-center gap-2 w-full p-2.5 bg-[#1e2124] border border-[#424549] hover:border-[#ed4245]/50 text-[#b9bbbe] hover:text-[#ed4245] rounded-[4px] transition-colors focus-visible:outline-none"
                        >
                          <MessageSquareOff className="w-4 h-4" /> <span className="text-[12px] font-bold">Purge All Comments</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 bg-[#282b30] p-3 rounded-[8px] border border-[#424549]">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#b9bbbe] mb-1">Asset Wipes</span>
                        <button 
                          onClick={handleWipeInventory}
                          className="flex items-center gap-2 w-full p-2.5 bg-[#1e2124] border border-[#424549] hover:border-[#ed4245]/50 text-[#b9bbbe] hover:text-[#ed4245] rounded-[4px] transition-colors focus-visible:outline-none"
                        >
                          <Eraser className="w-4 h-4" /> <span className="text-[12px] font-bold">Wipe Inventory</span>
                        </button>
                        <button 
                          onClick={handleWipeWishlist}
                          className="flex items-center gap-2 w-full p-2.5 bg-[#1e2124] border border-[#424549] hover:border-[#ed4245]/50 text-[#b9bbbe] hover:text-[#ed4245] rounded-[4px] transition-colors focus-visible:outline-none"
                        >
                          <Eraser className="w-4 h-4" /> <span className="text-[12px] font-bold">Wipe Wishlist</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-col gap-2">
                      {selectedUser.role !== 'banned' ? (
                        <button 
                          onClick={handleTotalAccountNuke}
                          className="w-full flex items-center justify-center gap-2 p-3.5 bg-transparent border-2 border-[#ed4245] hover:bg-[#ed4245] text-[#ed4245] hover:text-white rounded-[4px] transition-colors shadow-sm focus-visible:outline-none group"
                        >
                          <Ban className="w-4 h-4" />
                          <span className="text-[13px] font-black uppercase tracking-widest">Nuke & Ban Account</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => updateUserRole(selectedUser.id, 'user')}
                          className="w-full flex items-center justify-center gap-2 p-3.5 bg-[#282b30] border-2 border-[#23a559] hover:bg-[#23a559] text-[#23a559] hover:text-white rounded-[4px] transition-colors shadow-sm focus-visible:outline-none group"
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

      {toast && (
        <div className="absolute bottom-6 right-6 z-[100000] animate-slide-up">
          <div className={`px-4 py-3 rounded-[6px] shadow-2xl flex items-center gap-3 border ${toast.type === 'error' ? 'bg-[#1e2124] border-[#ed4245]/50 text-[#ed4245]' : 'bg-[#1e2124] border-[#23a559]/50 text-[#23a559]'}`}>
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            <span className="text-[13px] font-bold">{toast.text}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-[#72767d] hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

    </div>
  );
}