import { usePresence, PresenceState } from "../../../hooks/usePresence";
import { handleImageError } from "../../../data";

const getInitials = (name: string) => {
  const parts = name.split(" ");
  return parts.length > 1 ? parts[0][0] + parts[1][0] : name.substring(0, 2).toUpperCase();
};

export function LiveAvatars() {
  const users = usePresence();
  
  if (users.length === 0) return null;

  const MAX_VISIBLE = 4;
  const visibleUsers = users.slice(0, MAX_VISIBLE);
  const extraCount = Math.max(0, users.length - MAX_VISIBLE);

  return (
    <div className="flex items-center">
      <div className="flex md:hidden items-center gap-1.5 bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] px-2 py-1 rounded-full shadow-inner mr-2">
        <span className="w-2 h-2 rounded-full bg-[#23a559] animate-pulse"></span>
        <span className="text-[10px] font-bold text-[#F2F3F5]">{users.length}</span>
      </div>

      <div className="hidden md:flex items-center mr-3 relative">
        {visibleUsers.map((user: PresenceState, i: number) => (
          <div
            key={user.id}
            className="w-8 h-8 rounded-full flex items-center justify-center border-[2px] border-[#313338] text-white shadow-sm relative group cursor-default transition-transform hover:-translate-y-1 hover:z-50 overflow-visible"
            style={{ 
              backgroundColor: user.color,
              marginLeft: i > 0 ? "-10px" : "0",
              zIndex: 40 - i
            }}
          >
            {/* Fallback Initials under the image */}
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold z-0">
              {getInitials(user.name)}
            </span>
            
            {/* Unit Image */}
            <img 
              src={`/units/${user.unitId}.webp`} 
              alt={user.name}
              className="w-full h-full object-cover rounded-full absolute inset-0 z-10"
              onError={(e) => handleImageError(e, user.unitId)}
            />
            
            {/* Hover Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-[#111214] text-[#F2F3F5] text-[10px] font-bold px-2 py-1 rounded-[4px] border border-[rgba(255,255,255,0.08)] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-lg transition-opacity z-50">
              {user.name}
            </div>
          </div>
        ))}

        {extraCount > 0 && (
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center border-[2px] border-[#313338] bg-[#1E1F22] text-[#DBDEE1] text-[10px] font-bold shadow-sm z-0"
            style={{ marginLeft: "-10px" }}
          >
            +{extraCount}
          </div>
        )}
      </div>
    </div>
  );
}