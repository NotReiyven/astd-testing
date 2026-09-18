import { useState, useMemo } from "react";
import { Package, Search, Trash2, Plus, Minus, Pin } from "lucide-react";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useUnits } from "../../context/UnitContext";
import { getProxyImage, handleImageError, TIER_CONFIG, getTier } from "../../data";
import { getAvatarStyle, getInitials } from "./TradeAnalyzer/summaryUtils";

export function InventoryChannel() {
  const { units: ALL_UNITS } = useUnits();
  const { items, addOrUpdateUnit, removeUnit, togglePin } = useInventoryStore();
  const { profile } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");

  const userUnits = useMemo(() => {
    return items.map(invItem => {
      const master = ALL_UNITS.find(u => u.id === invItem.unit_id);
      return { ...invItem, master };
    }).filter(i => {
      if (!i.master) return false;
      const q = searchQuery.toLowerCase();
      return i.master.name.toLowerCase().includes(q) || (i.master.subtitle && i.master.subtitle.toLowerCase().includes(q));
    }).sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return 0;
    });
  }, [items, ALL_UNITS, searchQuery]);

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#313338] p-6 text-center">
        <Package className="w-12 h-12 text-[#80848E] mb-3" />
        <h2 className="text-[18px] font-bold text-[#F2F3F5] mb-1">Authentication Required</h2>
        <p className="text-[#949BA4] text-[13px] max-w-sm">Please log in with Discord using the top navigation bar to access your personal unit inventory.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#313338] h-full select-none font-sans">
      <div className="flex-shrink-0 px-5 py-4 bg-[#2B2D31] border-b border-[rgba(0,0,0,0.2)] shadow-sm z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] flex items-center justify-center shadow-inner shrink-0">
            <Package className="w-5 h-5 text-[#5865F2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">Personal Collection</span>
            <h2 className="text-[17px] font-black text-[#F2F3F5] tracking-tight">My Inventory ({items.reduce((s, i) => s + i.quantity, 0)})</h2>
          </div>
        </div>

        <div className="relative w-full sm:w-[260px] shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#80848E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inventory..."
            className="w-full bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-full pl-9 pr-4 py-2 text-[13px] text-[#F2F3F5] outline-none placeholder-[#80848E] focus:ring-1 focus:ring-[#5865F2] transition-all shadow-inner"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6">
        {userUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-60 mt-10">
            <Package className="w-16 h-16 text-[#4e5058] mb-4" />
            <p className="text-[#F2F3F5] text-[15px] font-bold">Your inventory is empty</p>
            <p className="text-[#949BA4] text-[13px] mt-1 text-center max-w-sm">Go to the Value List channel and click units to add them to your collection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {userUnits.map(({ unit_id, quantity, is_pinned, master }) => {
              if (!master) return null;
              const tierKey = getTier(master);
              const tierColor = TIER_CONFIG[tierKey]?.badgeColor || "#5865F2";
              const proxyUrl = getProxyImage(master.id, master.imageUrl);

              return (
                <div key={unit_id} className={`bg-[#1E1F22] border rounded-[8px] p-4 flex items-center gap-4 relative overflow-hidden transition-all ${is_pinned ? 'border-[#5865F2] shadow-[0_0_12px_rgba(88,101,242,0.2)]' : 'border-[rgba(255,255,255,0.04)]'}`}>
                  <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: tierColor }} />
                  
                  <div className="w-14 h-14 rounded-[6px] bg-[#111214] overflow-hidden shrink-0 relative border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[12px] z-0" style={getAvatarStyle(master.name)}>
                      {getInitials(master.name)}
                    </div>
                    {proxyUrl && (
                      <img src={proxyUrl} alt={master.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-[#111214]" onError={(e) => handleImageError(e, master.id)} />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <h4 className="text-[14px] font-extrabold text-[#F2F3F5] truncate">{master.name}</h4>
                    <span className="text-[10px] font-bold text-[#80848E] uppercase tracking-wider truncate">{master.subtitle || "Unit"}</span>
                    <span className="text-[12px] font-mono font-bold text-[#DBDEE1] mt-1">Qty: {quantity}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => addOrUpdateUnit(profile.id, unit_id, -1)} className="p-1.5 bg-[#2B2D31] hover:bg-[#3F4147] text-[#DBDEE1] rounded-[4px] transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                    <button onClick={() => addOrUpdateUnit(profile.id, unit_id, 1)} className="p-1.5 bg-[#2B2D31] hover:bg-[#3F4147] text-[#DBDEE1] rounded-[4px] transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                    <button onClick={() => togglePin(profile.id, unit_id, is_pinned)} className={`p-1.5 rounded-[4px] transition-colors ${is_pinned ? 'bg-[#5865F2] text-white' : 'bg-[#2B2D31] text-[#80848E] hover:text-[#DBDEE1]'}`}><Pin className="w-3.5 h-3.5" style={{ fill: is_pinned ? "currentColor" : "none" }} /></button>
                    <button onClick={() => removeUnit(profile.id, unit_id)} className="p-1.5 bg-[#2B2D31] hover:bg-[#ed4245]/20 text-[#80848E] hover:text-[#ed4245] rounded-[4px] transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}