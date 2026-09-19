// FILE: src/app/components/AdminChannel.tsx

import { useState, useEffect } from "react";
import { ShieldAlert, Search, UserX, UserCheck, Shield } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/useAuthStore";

interface UserProfile {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string;
  role: 'user' | 'mod' | 'admin' | 'master' | 'banned';
  created_at: string;
}

export function AdminChannel() {
  const { profile } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const isMaster = profile?.role === 'master';

  useEffect(() => {
    // Initial load of recent users
    fetchUsers();
  }, []);

  const fetchUsers = async (query = "") => {
    setIsLoading(true);
    let request = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
    
    if (query) {
      request = request.ilike('username', `%${query}%`);
    }

    const { data, error } = await request;
    if (!error && data) {
      setUsers(data as UserProfile[]);
    }
    setIsLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchQuery);
  };

  const updateUserRole = async (targetUserId: string, newRole: string) => {
    if (!profile) return;
    
    // Safety check: Only masters can make other admins/masters
    if ((newRole === 'master' || newRole === 'admin') && !isMaster) {
      setActionMessage({ text: "Only the Master account can assign Admin privileges.", type: "error" });
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (error) {
      setActionMessage({ text: "Failed to update user role.", type: "error" });
    } else {
      setUsers(users.map(u => u.id === targetUserId ? { ...u, role: newRole as any } : u));
      setActionMessage({ text: `Successfully updated user role to ${newRole.toUpperCase()}`, type: "success" });
    }
    setTimeout(() => setActionMessage(null), 3000);
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'master': return 'text-[#ed4245] bg-[#ed4245]/10 border-[#ed4245]/30';
      case 'admin': return 'text-[#FAA61A] bg-[#FAA61A]/10 border-[#FAA61A]/30';
      case 'mod': return 'text-[#5865F2] bg-[#5865F2]/10 border-[#5865F2]/30';
      case 'banned': return 'text-[#80848E] bg-[#1E1F22] border-[#80848E]/30 line-through';
      default: return 'text-[#23a559] bg-[#23a559]/10 border-[#23a559]/30';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#313338] h-full select-none font-sans relative">
      <div className="flex-shrink-0 px-4 md:px-6 py-4 bg-[#2B2D31] border-b border-[rgba(0,0,0,0.22)] shadow-sm">
        <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
          <Search className="w-4 h-4 text-[#80848E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by exact username..."
            className="w-full bg-[#1E1F22] text-[#F2F3F5] text-[13px] pl-9 pr-3 py-2.5 rounded-[6px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#ed4245] transition-colors shadow-inner"
          />
          <button type="submit" className="hidden" />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
        {actionMessage && (
          <div className={`mb-4 p-3 rounded-[6px] text-[13px] font-bold border ${actionMessage.type === 'success' ? 'bg-[#23a559]/10 text-[#23a559] border-[#23a559]/30' : 'bg-[#ed4245]/10 text-[#ed4245] border-[#ed4245]/30'}`}>
            {actionMessage.text}
          </div>
        )}

        <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[8px] shadow-sm overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3 border-b border-[rgba(255,255,255,0.04)] bg-[#2B2D31]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#80848E]">User</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#80848E]">Discord ID</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#80848E] text-right">Access Level</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-[#80848E] text-[13px] font-medium">Loading database records...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-[#80848E] text-[13px] font-medium">No users found.</div>
          ) : (
            <div className="flex flex-col">
              {users.map((u) => (
                <div key={u.id} className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-4 border-b border-[rgba(255,255,255,0.02)] items-center hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar_url || "/units/firezio.webp"} className="w-8 h-8 rounded-full bg-[#111214] object-cover border border-[rgba(255,255,255,0.08)]" alt="" />
                    <span className="text-[14px] font-bold text-[#F2F3F5]">{u.username}</span>
                  </div>
                  
                  <span className="text-[12px] font-mono text-[#949BA4]">{u.discord_id}</span>
                  
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${getRoleColor(u.role)}`}>
                      {u.role}
                    </span>
                    
                    {u.id !== profile?.id && (
                      <select
                        value={u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                        className="bg-[#111214] text-[#DBDEE1] text-[11px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-[4px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#ed4245] shadow-inner cursor-pointer"
                      >
                        <option value="user">User</option>
                        <option value="banned">Banned</option>
                        {isMaster && (
                          <>
                            <option value="mod">Moderator</option>
                            <option value="admin">Admin</option>
                          </>
                        )}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}