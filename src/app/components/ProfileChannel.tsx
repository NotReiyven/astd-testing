// ================================================
// FILE: src/app/components/ProfileChannel.tsx
// ================================================

import { useState, useEffect, useMemo } from "react";
import { 
  UserCircle, Edit2, Check, X, ShieldAlert, Shield, Star, 
  MessageSquare, Package, Megaphone, Activity, 
  Gamepad2, Clock, ArrowRight, BookOpen, AlertTriangle
} from "lucide-react";
import { useProfileStore } from "../../store/useProfileStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradingAdsStore } from "../../store/useTradingAdsStore";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useUnits } from "../../context/UnitContext";
import { getUnitConservativeValue } from "./InventoryChannel/inventoryUtils";
import { getProxyImage, handleImageError, GRID_STATUS_CFG } from "../../data";
import { getAvatarStyle, getInitials } from "./TradeAnalyzer/summaryUtils";
import { triggerHaptic } from "../../data/helpers";
import { StatusIcon } from "./shared/Formatters";
import { TradeCard, MasterUnit } from "../../types";

const ROLE_CONFIG = {
  master: { icon: ShieldAlert, color: "#ed4245", label: "Master" },
  admin: { icon: ShieldAlert, color: "#FAA61A", label: "Admin" },
  mod: { icon: Shield, color: "#5865F2", label: "Moderator" },
  user: { icon: UserCircle, color: "#B5BAC1", label: "Trader" },
  banned: { icon: X, color: "#80848E", label: "Banned" }
};

const getReputationRank = (rep: number) => {
  if (rep < 0) return { label: "Untrusted", color: "#ed4245", border: "border-destructive/30", bg: "bg-destructive/10" };
  if (rep < 10) return { label: "Unranked", color: "#B5BAC1", border: "border-border", bg: "bg-popover" };
  if (rep < 50) return { label: "Apprentice Trader", color: "#cd7f32", border: "border-[#cd7f32]/40", bg: "bg-[#cd7f32]/10" }; // Bronze
  if (rep < 200) return { label: "Trusted Merchant", color: "#c0c0c0", border: "border-[#c0c0c0]/40", bg: "bg-[#c0c0c0]/10" }; // Silver
  if (rep < 500) return { label: "Elite Broker", color: "#ffd700", border: "border-[#ffd700]/50", bg: "bg-[#ffd700]/10" }; // Gold
  return { label: "Market Vanguard", color: "#00ffff", border: "border-[#00ffff]/60", bg: "bg-[#00ffff]/10" }; // Diamond
};

function MiniItemGrid({ items, ALL_UNITS, title, titleColor }: { items: TradeCard[], ALL_UNITS: MasterUnit[], title: string, titleColor: string }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 w-full">
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: titleColor }}>{title}</span>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {items.map((item, idx) => {
          const master = ALL_UNITS.find(u => u.id === item.id);
          const proxyUrl = master ? getProxyImage(master.id, master.imageUrl) : null;
          return (
            <div key={`${item.id}-${idx}`} className="relative aspect-square rounded-[6px] bg-background border border-border flex items-center justify-center overflow-hidden shadow-inner group" title={item.name}>
              <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[12px] z-0" style={getAvatarStyle(item.name)}>
                {getInitials(item.name)}
              </div>
              {proxyUrl && (
                <img src={proxyUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-background transition-transform group-hover:scale-110" onError={(e) => handleImageError(e, item.id)} />
              )}
              {item.qty > 1 && (
                <div className="absolute bottom-0 right-0 bg-popover/90 backdrop-blur-sm text-foreground text-[9px] font-black px-1.5 py-0.5 rounded-tl-[4px] z-20 border-t border-l border-border leading-none">
                  x{item.qty}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ProfileChannel() {
  const { viewingProfileId, fetchProfile, saveProfileUpdates } = useProfileStore();
  const { profile: currentUser } = useAuthStore();
  const setViewingUser = useInventoryStore(s => s.setViewingUser);
  
  const targetId = viewingProfileId || currentUser?.id;
  const isOwner = currentUser?.id === targetId;

  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"board" | "wishlist">("board");

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editBannerColor, setEditBannerColor] = useState("#2B2D31");
  const [editRobloxName, setEditRobloxName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Data
  const { ads, fetchAds } = useTradingAdsStore();
  const { fetchWishlist, viewedWishlist } = useInventoryStore();
  const { units: ALL_UNITS } = useUnits();

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (!targetId) return;
      setIsLoading(true);
      
      const data = await fetchProfile(targetId);
      if (mounted && data) {
        setProfileData(data);
        setEditBio(data.bio || "");
        setEditBannerColor(data.banner_color || "#2B2D31");
        setEditRobloxName(data.roblox_username || "");
        
        fetchAds();
        fetchWishlist(targetId, true);
      }
      if (mounted) setIsLoading(false);
    };

    loadData();
    return () => { mounted = false; };
  }, [targetId, fetchProfile, fetchAds, fetchWishlist]);

  const handleSave = async () => {
    if (!isOwner || !targetId) return;
    setIsSaving(true);
    triggerHaptic('medium');

    const updates = {
      bio: editBio,
      banner_color: editBannerColor,
      roblox_username: editRobloxName
    };

    const { error } = await saveProfileUpdates(targetId, updates);
    if (!error) {
      setProfileData((prev: any) => ({ ...prev, ...updates }));
      setIsEditing(false);
      triggerHaptic('success');
      // Dispatch a global toast event manually if desired, or rely on visual state change
      window.dispatchEvent(new CustomEvent("toast-message", { detail: { message: "Profile saved successfully", type: "success" }}));
    } else {
      alert("Failed to save profile. Ensure you have no more than 190 characters in your bio.");
    }
    setIsSaving(false);
  };

  const handleContact = () => {
    if (!profileData?.discord_id) return;
    triggerHaptic('medium');
    navigator.clipboard.writeText(`Hey! Saw your profile on ASTD Value List. Are you around to trade?`);
    window.open(`https://discord.com/users/${profileData.discord_id}`, '_blank');
  };

  const handleInspectVault = () => {
    if (!targetId || !profileData) return;
    triggerHaptic('medium');
    // The Boomerang Redirect: Routes them to the vault, but sets returnChannel to 'profile'
    setViewingUser(targetId, profileData.username, "profile");
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
  };

  if (!targetId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
        <UserCircle className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-[20px] font-black text-foreground">No Profile Selected</h2>
        <p className="text-[13px] text-muted-foreground mt-2">Login or select a user to view their profile.</p>
      </div>
    );
  }

  if (isLoading || !profileData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background gap-4">
        <Activity className="w-8 h-8 text-primary animate-pulse" />
        <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">Loading Profile...</span>
      </div>
    );
  }

  const activeAds = ads.filter(a => a.user_id === targetId);
  const repRank = getReputationRank(profileData.global_rep || 0);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-background h-full font-sans animate-fade-in relative z-10 pb-12">
      
      {/* Dynamic Banner Header */}
      <div className="h-[200px] md:h-[240px] w-full relative shrink-0 transition-colors duration-500" style={{ backgroundColor: profileData.banner_color }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background pointer-events-none" />
      </div>

      <div className="px-4 md:px-8 max-w-7xl mx-auto w-full -mt-24 relative z-20 flex flex-col md:flex-row gap-6 lg:gap-8">
        
        {/* Left Column: Identity Control */}
        <div className="w-full md:w-[360px] shrink-0 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-[12px] p-5 md:p-6 shadow-2xl flex flex-col relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-[4px]" style={{ backgroundColor: repRank.color }} />
            
            <div className="flex justify-between items-start mb-3">
              <div className="relative">
                <img 
                  src={profileData.avatar_url || "/units/firezio.webp"} 
                  alt={profileData.username}
                  className="w-24 h-24 rounded-full border-[6px] border-card object-cover bg-background -mt-12 shadow-lg"
                />
                {profileData.global_rep >= 500 && (
                  <div className="absolute inset-0 -mt-12 rounded-full ring-4 ring-[#00ffff]/30 animate-pulse pointer-events-none" />
                )}
              </div>
              
              {isOwner && !isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-primary hover:bg-primary/80 text-primary-foreground px-4 py-2 rounded-[6px] text-[12px] font-bold flex items-center gap-1.5 transition-colors shadow-sm focus-visible:outline-none"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-4 mt-2 animate-fade-in">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Banner Color</label>
                  <div className="flex items-center gap-3 bg-input p-2 rounded-[6px] border border-border shadow-inner">
                    <input 
                      type="color" 
                      value={editBannerColor}
                      onChange={(e) => setEditBannerColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
                    />
                    <span className="text-[13px] font-mono text-foreground font-bold">{editBannerColor.toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">About Me</label>
                  <textarea 
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={190}
                    placeholder="Tell traders about yourself..."
                    className="w-full bg-input border border-border rounded-[6px] p-3 text-[13px] text-foreground outline-none resize-none h-24 focus:border-primary transition-colors shadow-inner"
                  />
                  <span className="text-[10px] font-bold text-muted-foreground text-right">{editBio.length}/190</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5" /> Roblox Username
                  </label>
                  <input 
                    type="text"
                    value={editRobloxName}
                    onChange={(e) => setEditRobloxName(e.target.value)}
                    placeholder="Exact Roblox ID..."
                    className="w-full bg-input border border-border rounded-[6px] p-3 text-[13px] text-foreground outline-none focus:border-primary transition-colors shadow-inner"
                  />
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                  <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-popover hover:bg-muted border border-border rounded-[6px] text-[12px] font-bold text-foreground transition-colors focus-visible:outline-none">Cancel</button>
                  <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2.5 bg-[#23a559] hover:bg-[#1f914e] text-white rounded-[6px] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 focus-visible:outline-none">
                    {isSaving ? "Saving..." : <><Check className="w-3.5 h-3.5" /> Save</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col mt-2 animate-fade-in">
                <h1 className="text-[24px] font-black tracking-tight leading-none mb-2 truncate" style={{ color: profileData.global_rep >= 200 ? repRank.color : "var(--foreground)" }}>
                  {profileData.username}
                </h1>
                
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-[11px] font-bold ${repRank.bg} ${repRank.border}`} style={{ color: repRank.color }}>
                    <Star className="w-3.5 h-3.5" style={{ fill: profileData.global_rep >= 50 ? 'currentColor' : 'none' }} />
                    {repRank.label} ({profileData.global_rep > 0 ? '+' : ''}{profileData.global_rep})
                  </div>
                  
                  {profileData.role !== 'user' && (
                    <span className="bg-background border border-border px-2.5 py-1 rounded-[6px] text-[11px] font-bold flex items-center gap-1.5 shadow-sm" style={{ color: ROLE_CONFIG[profileData.role]?.color }}>
                      {(() => {
                        const RoleIcon = ROLE_CONFIG[profileData.role]?.icon || UserCircle;
                        return <><RoleIcon className="w-3.5 h-3.5" /> {ROLE_CONFIG[profileData.role]?.label}</>;
                      })()}
                    </span>
                  )}
                </div>

                <div className="w-full h-px bg-border mb-4" />

                {profileData.bio ? (
                  <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap break-words mb-5">
                    {profileData.bio}
                  </p>
                ) : (
                  <p className="text-[13px] text-muted-foreground italic mb-5">
                    This trader hasn't written a bio yet.
                  </p>
                )}

                {profileData.roblox_username && (
                  <div className="bg-popover p-3 rounded-[6px] border border-border flex items-center justify-between mb-5 shadow-inner">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gamepad2 className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-widest">Roblox</span>
                    </div>
                    <span className="text-[13px] font-bold text-foreground">{profileData.roblox_username}</span>
                  </div>
                )}

                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-5">
                  Member since {new Date(profileData.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  <button 
                    onClick={handleInspectVault}
                    className="w-full py-3 bg-popover hover:bg-muted text-foreground border border-border rounded-[6px] text-[13px] font-bold flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-[0.98] focus-visible:outline-none"
                  >
                    <Package className="w-4 h-4" /> View Public Vault
                  </button>
                  {!isOwner && (
                    <button 
                      onClick={handleContact}
                      className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-[6px] text-[13px] font-bold flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-[0.98] focus-visible:outline-none"
                    >
                      <MessageSquare className="w-4 h-4" /> Message on Discord
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tabbed Data Board */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 bg-card p-1.5 rounded-[8px] border border-border shadow-sm mb-6 overflow-x-auto hide-scrollbar shrink-0">
            <button 
              onClick={() => setActiveTab("board")}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-[6px] text-[12px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none ${activeTab === "board" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-popover"}`}
            >
              <Megaphone className="w-4 h-4" /> Active Ads <span className="bg-black/20 px-1.5 py-0.5 rounded ml-1">{activeAds.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab("wishlist")}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-[6px] text-[12px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none ${activeTab === "wishlist" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-popover"}`}
            >
              <Star className="w-4 h-4" /> Target Wishlist <span className="bg-black/20 px-1.5 py-0.5 rounded ml-1">{viewedWishlist.length}</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-[400px]">
            
            {activeTab === "board" && (
              <div className="animate-fade-in flex flex-col h-full gap-4">
                {activeAds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center opacity-60 bg-card border border-border rounded-[12px] p-12 shadow-sm">
                    <Megaphone className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-[18px] font-black text-foreground">No Active Listings</h3>
                    <p className="text-[13px] text-muted-foreground mt-2 max-w-sm">This user currently has no live trades posted on the board.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {activeAds.map((ad, idx) => {
                      const isTakingOffers = ad.ad_type === "lf_offers" || (ad.ad_type === "standard" && ad.get_items.length === 0);
                      
                      return (
                        <div key={ad.id} className="bg-card border border-border p-5 rounded-[12px] flex flex-col shadow-sm transition-all hover:border-primary/50" style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }} >
                          <div className="flex justify-between items-center mb-4">
                             <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-[4px] border ${ad.ad_type === 'inventory' ? "bg-popover border-border text-foreground" : isTakingOffers ? "bg-popover border-border text-foreground" : "bg-primary text-primary-foreground border-primary shadow-sm"}`}>
                               {ad.ad_type === 'inventory' ? "Showcase" : isTakingOffers ? "Taking Offers" : "Specific Trade"}
                             </span>
                             <div className="flex items-center gap-1.5 text-muted-foreground">
                               <Clock className="w-3.5 h-3.5" />
                               <span className="text-[11px] font-bold uppercase tracking-wider">{getTimeAgo(ad.created_at)}</span>
                             </div>
                          </div>

                          {ad.note && (
                            <div className="bg-popover border border-border rounded-[6px] p-3 mb-4 text-[12.5px] text-foreground font-medium leading-relaxed italic shadow-inner line-clamp-2">
                              "{ad.note}"
                            </div>
                          )}
                          
                          <div className="flex flex-col gap-4 mt-auto">
                             <MiniItemGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} title={ad.ad_type === 'inventory' ? "Showcase Assets" : "Offering"} titleColor={ad.ad_type === 'inventory' ? "var(--muted-foreground)" : "#FAA61A"} />
                             {ad.get_items.length > 0 && (
                               <>
                                 <div className="w-full h-px bg-border" />
                                 <MiniItemGrid items={ad.get_items} ALL_UNITS={ALL_UNITS} title="Requesting" titleColor="var(--primary)" />
                               </>
                             )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "wishlist" && (
              <div className="animate-fade-in flex flex-col h-full">
                {viewedWishlist.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center opacity-60 bg-card border border-border rounded-[12px] p-12 shadow-sm">
                    <Star className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-[18px] font-black text-foreground">Empty Wishlist</h3>
                    <p className="text-[13px] text-muted-foreground mt-2 max-w-sm">This user isn't actively hunting for any specific units right now.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-card border border-border rounded-[12px] p-4 sm:p-6 shadow-sm">
                    {viewedWishlist.map((item, idx) => {
                      const master = ALL_UNITS.find(u => u.id === item.unit_id);
                      if (!master) return null;
                      const proxyUrl = getProxyImage(master.id, master.imageUrl);
                      const cfg = master.status ? GRID_STATUS_CFG[master.status as keyof typeof GRID_STATUS_CFG] : null;

                      return (
                        <div key={item.id} className="bg-popover border border-border rounded-[8px] flex flex-col overflow-hidden shadow-inner hover:border-primary/50 transition-colors animate-[staggerFadeIn_0.3s_ease-out_forwards]" style={{ animationDelay: `${idx * 40}ms`, opacity: 0 }}>
                          <div className="w-full aspect-square bg-background relative flex items-center justify-center border-b border-border">
                            <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[24px] z-0" style={getAvatarStyle(master.name)}>
                              {getInitials(master.name)}
                            </div>
                            {proxyUrl && (
                              <img src={proxyUrl} alt={master.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-background" onError={(e) => handleImageError(e, master.id)} />
                            )}
                            {cfg && (
                              <div className="absolute top-1.5 right-1.5 z-20">
                                <span className="text-[8px] font-bold uppercase px-1.5 py-[1px] rounded-[3px] border shadow-sm inline-flex items-center gap-1" style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                                  <StatusIcon status={master.status} />
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex flex-col">
                            <span className="text-[13px] font-bold text-foreground truncate" title={master.name}>{master.name}</span>
                            <span className="text-[11px] font-black font-mono text-muted-foreground mt-1.5 truncate">
                              {master.value === "owner" ? "O/C" : getUnitConservativeValue(master).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}