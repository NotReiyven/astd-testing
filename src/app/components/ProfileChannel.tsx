// ================================================
// FILE: src/app/components/ProfileChannel.tsx
// ================================================

import { useState, useEffect, memo } from "react";
import { 
  UserCircle, Edit2, Check, X, ShieldAlert, Shield, Star, 
  MessageSquare, Package, Megaphone, Activity, 
  Gamepad2, Clock, AlertTriangle, ArrowRight, Copy, ExternalLink, Sparkles, 
  Crown, ShieldCheck, Award, Trophy, Zap, ArrowRightLeft, Share2, Eye
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

const getRoleConfig = (role: string) => {
  switch (role) {
    case 'master':
    case 'admin':
      return { icon: Crown, color: '#f59e0b', bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', label: role === 'master' ? 'Master' : 'Admin' };
    case 'mod':
      return { icon: ShieldCheck, color: '#5865F2', bg: 'bg-primary/10 border-primary/30 text-primary', label: 'Moderator' };
    default:
      return { icon: UserCircle, color: '#949ba4', bg: 'bg-popover border-border text-muted-foreground', label: 'Trader' };
  }
};

const getReputationRank = (rep: number) => {
  if (rep < 0) return { label: "Exiled", color: "#ed4245", border: "border-destructive/40", bg: "bg-destructive/15", next: 0, min: -100, icon: AlertTriangle };
  if (rep < 10) return { label: "Unranked", color: "#949ba4", border: "border-border", bg: "bg-popover", next: 10, min: 0, icon: Star };
  if (rep < 50) return { label: "Apprentice", color: "#cd7f32", border: "border-[#cd7f32]/40", bg: "bg-[#cd7f32]/15", next: 50, min: 10, icon: Award };
  if (rep < 150) return { label: "Recognized", color: "#c0c0c0", border: "border-[#c0c0c0]/40", bg: "bg-[#c0c0c0]/15", next: 150, min: 50, icon: Award };
  if (rep < 300) return { label: "Trusted Merchant", color: "#ffd700", border: "border-[#ffd700]/50", bg: "bg-[#ffd700]/15", next: 300, min: 150, icon: Trophy };
  if (rep < 500) return { label: "Elite Broker", color: "#00ffff", border: "border-[#00ffff]/60", bg: "bg-[#00ffff]/15", next: 500, min: 300, icon: Trophy };
  if (rep < 1000) return { label: "Vanguard", color: "#3A7CE6", border: "border-[#3A7CE6]/60", bg: "bg-[#3A7CE6]/15", next: 1000, min: 500, icon: Zap };
  return { label: "Legend", color: "#a855f7", border: "border-[#a855f7]/60", bg: "bg-[#a855f7]/15", next: 1000, min: 1000, icon: Sparkles };
};

const AdItemTile = memo(({ item, ALL_UNITS }: { item: TradeCard, ALL_UNITS: MasterUnit[] }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const master = ALL_UNITS.find(u => u.id === item.id);
  const proxyUrl = master ? getProxyImage(master.id, master.imageUrl) : null;
  const conservativeVal = master ? getUnitConservativeValue(master) * item.qty : item.value * item.qty;
  const rarity = master?.rarity ?? "N/A";

  return (
    <div 
      className="relative aspect-square rounded-[8px] bg-background border border-border flex items-center justify-center overflow-hidden shadow-sm group cursor-pointer hover:border-primary transition-all min-w-[56px]"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[12px] z-0" style={getAvatarStyle(item.name)}>
        {getInitials(item.name)}
      </div>
      {proxyUrl && (
        <img src={proxyUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-background transition-transform group-hover:scale-110" onError={(e) => handleImageError(e, item.id)} />
      )}
      {item.qty > 1 && (
        <div className="absolute bottom-0 right-0 bg-popover/95 text-foreground text-[10px] font-black px-1.5 py-0.5 rounded-tl-[4px] z-20 border-t border-l border-border leading-none">
          x{item.qty}
        </div>
      )}

      {showTooltip && master && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#111214] border border-border text-foreground text-[11px] p-3 rounded-[8px] shadow-2xl pointer-events-none z-50 w-48 animate-fade-in flex flex-col gap-1">
          <div className="font-extrabold text-foreground truncate">{master.name}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{master.subtitle || "Official Unit"}</div>
          <div className="flex justify-between items-center mt-1 pt-1 border-t border-border font-mono">
            <span className="text-[#4DB6AC]">R: {rarity}</span>
            <span className="text-primary font-bold">{conservativeVal.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
});

function AdItemGrid({ items, ALL_UNITS, label, labelColor }: { items: TradeCard[], ALL_UNITS: MasterUnit[], label: string, labelColor: string }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: labelColor }}>{label}</span>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))' }}>
        {items.map((item, idx) => (
          <AdItemTile key={`${item.id}-${idx}`} item={item} ALL_UNITS={ALL_UNITS} />
        ))}
      </div>
    </div>
  );
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

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editBannerColor, setEditBannerColor] = useState("#2B2D31");
  const [editRobloxName, setEditRobloxName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [copiedDiscordId, setCopiedDiscordId] = useState(false);

  // Data
  const { ads, fetchAds } = useTradingAdsStore();
  const { fetchWishlist, viewedWishlist, viewedItems, fetchInventory } = useInventoryStore();
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
        fetchInventory(targetId, true);
        fetchWishlist(targetId, true);
      }
      if (mounted) setIsLoading(false);
    };

    loadData();
    return () => { mounted = false; };
  }, [targetId, fetchProfile, fetchAds, fetchInventory, fetchWishlist]);

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
      setIsEditModalOpen(false);
      triggerHaptic('success');
      window.dispatchEvent(new CustomEvent("toast-message", { detail: { message: "Profile saved successfully", type: "success" }}));
    } else {
      alert("Failed to save profile. Ensure your bio is under 190 characters.");
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
    setViewingUser(targetId, profileData.username, "profile");
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
  };

  const handleCopyProfileLink = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(window.location.href);
    setCopiedProfileLink(true);
    setTimeout(() => setCopiedProfileLink(false), 2000);
  };

  const handleCopyDiscordId = () => {
    if (!profileData?.discord_id) return;
    triggerHaptic('light');
    navigator.clipboard.writeText(profileData.discord_id);
    setCopiedDiscordId(true);
    setTimeout(() => setCopiedDiscordId(false), 2000);
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
  const safeRep = profileData.global_rep ?? 0;
  const repRank = getReputationRank(safeRep);
  const repProgress = repRank.next > repRank.min ? Math.min(100, Math.max(0, ((safeRep - repRank.min) / (repRank.next - repRank.min)) * 100)) : 100;
  const roleCfg = getRoleConfig(profileData.role);
  const RoleIcon = roleCfg.icon;

  const totalVaultValue = viewedItems.reduce((acc, i) => {
    const m = ALL_UNITS.find(u => u.id === i.unit_id);
    return acc + (m ? getUnitConservativeValue(m) * i.quantity : 0);
  }, 0);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-background h-full font-sans relative z-10 pb-16">
      
      {/* 1. HERO HEADER (Full content width, no clipping) */}
      <div className="w-full relative shrink-0">
        {/* Banner Strip ~160px tall with gradient blend */}
        <div 
          className="w-full h-[160px] md:h-[180px] transition-colors duration-500 relative"
          style={{ 
            backgroundColor: profileData.banner_color,
            backgroundImage: `linear-gradient(to bottom, ${profileData.banner_color}, var(--card))`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-80" />
        </div>

        {/* Hero Content Bar */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-20 pb-6 border-b border-border bg-card">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-14 md:-mt-16">
            
            {/* Avatar & Title Row */}
            <div className="flex flex-col md:flex-row md:items-end gap-5">
              <div className="relative shrink-0">
                <img 
                  src={profileData.avatar_url || "/units/firezio.webp"} 
                  alt={profileData.username}
                  className="w-[112px] h-[112px] rounded-full border-4 border-card object-cover bg-background shadow-2xl"
                />
                {safeRep >= 500 && (
                  <div className="absolute inset-0 rounded-full ring-4 ring-[#00ffff]/30 animate-pulse pointer-events-none" />
                )}
              </div>

              <div className="flex flex-col gap-2 pb-1">
                <h1 className="text-[28px] md:text-[32px] font-black text-foreground tracking-tight leading-none">
                  {profileData.username}
                </h1>
                
                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-[6px] border text-[12px] font-bold ${repRank.bg} ${repRank.border}`} style={{ color: repRank.color }}>
                    <repRank.icon className="w-4 h-4" style={{ fill: safeRep >= 50 ? 'currentColor' : 'none' }} />
                    {repRank.label} ({safeRep > 0 ? '+' : ''}{safeRep})
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-[6px] border text-[12px] font-bold shadow-sm" style={{ backgroundColor: roleCfg.bg, color: roleCfg.color, borderColor: roleCfg.color + '40' }}>
                    <RoleIcon className="w-4 h-4" />
                    {roleCfg.label}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons Right Side */}
            <div className="flex items-center gap-3 shrink-0 pb-1">
              <button 
                onClick={handleCopyProfileLink}
                className="px-4 py-2.5 rounded-[8px] bg-popover hover:bg-muted border border-border text-foreground text-[13px] font-bold flex items-center gap-2 transition-colors shadow-sm focus-visible:outline-none"
              >
                {copiedProfileLink ? <Check className="w-4 h-4 text-[#23a559]" /> : <Share2 className="w-4 h-4 text-muted-foreground" />}
                <span>Share</span>
              </button>

              {isOwner ? (
                <button 
                  onClick={() => {
                    setEditBio(profileData.bio || "");
                    setEditBannerColor(profileData.banner_color || "#2B2D31");
                    setEditRobloxName(profileData.roblox_username || "");
                    setIsEditModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-[8px] bg-primary hover:bg-primary/80 text-primary-foreground text-[13px] font-bold flex items-center gap-2 transition-colors shadow-md focus-visible:outline-none"
                >
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </button>
              ) : (
                <button 
                  onClick={handleContact}
                  className="px-6 py-2.5 rounded-[8px] bg-[#5865F2] hover:bg-[#4752C4] text-white text-[13px] font-bold flex items-center gap-2 transition-colors shadow-md focus-visible:outline-none"
                >
                  <MessageSquare className="w-4 h-4" /> Message on Discord
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 max-w-7xl mx-auto w-full pt-6 flex flex-col gap-6">
        
        {/* 3. STATS ROW (4 tiles under hero) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <div className="bg-card border border-border rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Reputation</span>
            <span className="text-[22px] font-black font-mono text-foreground mt-2" style={{ color: repRank.color }}>
              {safeRep > 0 ? `+${safeRep}` : safeRep}
            </span>
          </div>
          <div className="bg-card border border-border rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Active Ads</span>
            <span className="text-[22px] font-black font-mono text-foreground mt-2">{activeAds.length}</span>
          </div>
          <div className="bg-card border border-border rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Vault Net Worth</span>
            <span className="text-[22px] font-black font-mono text-primary mt-2">{totalVaultValue.toLocaleString()}</span>
          </div>
          <div className="bg-card border border-border rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Member Since</span>
            <span className="text-[18px] md:text-[20px] font-black font-mono text-foreground mt-2">{new Date(profileData.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>
          </div>
        </div>

        {/* 4. BODY: Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
          
          {/* Left Sidebar (Sticky on desktop) */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-6">
            
            {/* About Card */}
            <div className="bg-card border border-border rounded-[12px] p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-[12px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-3">About Me</h3>
              {profileData.bio ? (
                <p className="text-[13.5px] text-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {profileData.bio}
                </p>
              ) : (
                <p className="text-[13px] text-muted-foreground italic">
                  This trader hasn't written a bio yet.
                </p>
              )}

              <div className="flex flex-col gap-2.5 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Discord ID</span>
                  <button 
                    onClick={handleCopyDiscordId}
                    className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-foreground bg-popover px-2.5 py-1 rounded-[4px] border border-border hover:border-primary transition-colors cursor-pointer"
                  >
                    <span>{profileData.discord_id}</span>
                    {copiedDiscordId ? <Check className="w-3 h-3 text-[#23a559]" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </button>
                </div>

                {profileData.roblox_username && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Roblox ID</span>
                    <span className="text-[12px] font-bold text-foreground font-mono">{profileData.roblox_username}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Public Vault CTA */}
            <button 
              onClick={handleInspectVault}
              className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[12px] text-[13px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-lg active:scale-[0.98] focus-visible:outline-none group"
            >
              <Package className="w-4 h-4 group-hover:scale-110 transition-transform" /> Access Public Vault <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Redesigned Rank Progression Card */}
            {repRank.next > 0 && (
              <div className="bg-card border border-border rounded-[12px] p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-[12px] font-black uppercase tracking-widest text-muted-foreground">Rank Progression</span>
                  <span className="text-[11px] font-mono font-bold" style={{ color: repRank.color }}>{repRank.label}</span>
                </div>
                
                <div className="flex items-center justify-between text-[12px] font-bold text-foreground pt-1">
                  <span className="flex items-center gap-1" style={{ color: repRank.color }}><repRank.icon className="w-4 h-4" /> {repRank.label}</span>
                  <span className="text-muted-foreground font-mono">{safeRep} Rep</span>
                </div>

                <div className="w-full h-3 bg-popover rounded-full overflow-hidden border border-border relative my-1">
                  <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${repProgress}%`, backgroundColor: repRank.color }} />
                </div>

                <div className="flex justify-between items-center text-[11px] font-medium text-muted-foreground">
                  <span>{repRank.next - safeRep} rep to next rank</span>
                  <span className="font-mono">Milestone: {repRank.next}</span>
                </div>
              </div>
            )}

          </div>

          {/* Right Main Area: Tabs & Content */}
          <div className="flex-1 flex flex-col min-w-0">
            
            {/* Tabs Header */}
            <div className="flex items-center gap-8 border-b border-border mb-6 px-2">
              <button 
                onClick={() => setActiveTab("board")}
                className={`pb-3 text-[13px] font-extrabold uppercase tracking-wider transition-colors relative flex items-center gap-2 focus-visible:outline-none cursor-pointer ${activeTab === "board" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Megaphone className="w-4 h-4" /> Active Ads <span className="bg-popover border border-border px-2 py-0.5 rounded-[4px] text-[11px] font-mono">{activeAds.length}</span>
                {activeTab === "board" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />}
              </button>
              <button 
                onClick={() => setActiveTab("wishlist")}
                className={`pb-3 text-[13px] font-extrabold uppercase tracking-wider transition-colors relative flex items-center gap-2 focus-visible:outline-none cursor-pointer ${activeTab === "wishlist" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Star className="w-4 h-4" /> Target Wishlist <span className="bg-popover border border-border px-2 py-0.5 rounded-[4px] text-[11px] font-mono">{viewedWishlist.length}</span>
                {activeTab === "wishlist" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />}
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 min-h-[400px]">
              
              {activeTab === "board" && (
                <div className="animate-fade-in flex flex-col gap-4">
                  {activeAds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center bg-card border border-border rounded-[12px] p-16 shadow-sm min-h-[350px]">
                      <Megaphone className="w-12 h-12 text-muted-foreground mb-4 opacity-40" />
                      <h3 className="text-[18px] font-black text-foreground">No Active Listings</h3>
                      <p className="text-[13px] text-muted-foreground mt-1 max-w-sm">This user currently has no live trades posted on the trading board.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {activeAds.map((ad, idx) => {
                        const isTakingOffers = ad.ad_type === "lf_offers" || (ad.ad_type === "standard" && ad.get_items.length === 0);
                        const isInventory = ad.ad_type === "inventory";
                        
                        let statusLabel = "Specific Trade";
                        let statusColor = "bg-[#FAA61A]/10 border-[#FAA61A]/30 text-[#FAA61A]";
                        if (isInventory) {
                          statusLabel = "Showcase";
                          statusColor = "bg-popover border-border text-foreground";
                        } else if (isTakingOffers) {
                          statusLabel = "Taking Offers";
                          statusColor = "bg-primary/10 border-primary/30 text-primary";
                        }

                        // Compute total value live using current unit master definitions with fallback to ad snapshot value
                        const totalGiveVal = ad.give_items.reduce((acc, i) => {
                          const m = ALL_UNITS.find(u => u.id === i.id);
                          const liveVal = m ? getUnitConservativeValue(m) : i.value;
                          return acc + (liveVal * i.qty);
                        }, 0);

                        return (
                          <div key={ad.id} className="bg-card border border-border rounded-[12px] p-6 shadow-sm flex flex-col gap-4 hover:border-primary/50 transition-colors animate-fade-in" style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}>
                            
                            {/* Ad Header Row */}
                            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-border pb-4">
                              <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-[6px] border ${statusColor}`}>
                                  {statusLabel}
                                </span>
                                <span className="text-[12px] font-mono font-bold text-muted-foreground">
                                  Total Value: <strong className="text-foreground">{totalGiveVal.toLocaleString()}</strong>
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground text-[12px] font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{getTimeAgo(ad.created_at)}</span>
                              </div>
                            </div>

                            {/* Note / Quote Block */}
                            {ad.note && (
                              <blockquote className="border-l-2 border-primary pl-3.5 py-1 italic text-[13px] text-foreground/90 bg-popover/40 rounded-r-[6px]">
                                "{ad.note}"
                              </blockquote>
                            )}

                            {/* Item Grids Side-by-Side for Trades */}
                            {isInventory ? (
                              <div className="pt-2">
                                <AdItemGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} label="Showcase Assets" labelColor="var(--muted-foreground)" />
                              </div>
                            ) : isTakingOffers ? (
                              <div className="pt-2">
                                <AdItemGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} label="Offering" labelColor="#FAA61A" />
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center pt-2">
                                <AdItemGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} label="Offering" labelColor="#FAA61A" />
                                <div className="flex justify-center text-muted-foreground bg-popover p-2 rounded-full border border-border mx-auto md:mx-0">
                                  <ArrowRightLeft className="w-4 h-4" />
                                </div>
                                <AdItemGrid items={ad.get_items} ALL_UNITS={ALL_UNITS} label="Requesting" labelColor="var(--primary)" />
                              </div>
                            )}

                            {/* Footer Action Row */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-2">
                              <button 
                                onClick={handleContact}
                                className="px-4 py-2 bg-popover hover:bg-muted border border-border rounded-[6px] text-[12px] font-bold text-foreground transition-colors flex items-center gap-1.5 focus-visible:outline-none"
                              >
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" /> Copy Discord
                              </button>
                              <button 
                                onClick={handleContact}
                                className="px-5 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-[6px] text-[12px] font-bold transition-colors flex items-center gap-1.5 shadow-sm focus-visible:outline-none"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> Make Offer
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "wishlist" && (
                <div className="animate-fade-in flex flex-col h-full">
                  {viewedWishlist.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center bg-card border border-border rounded-[12px] p-16 shadow-sm min-h-[350px]">
                      <Star className="w-12 h-12 text-muted-foreground mb-4 opacity-40" />
                      <h3 className="text-[18px] font-black text-foreground">Empty Wishlist</h3>
                      <p className="text-[13px] text-muted-foreground mt-1 max-w-sm">This user isn't actively hunting for any specific units right now.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 bg-card border border-border rounded-[12px] p-6 shadow-sm">
                      {viewedWishlist.map((item, idx) => {
                        const master = ALL_UNITS.find(u => u.id === item.unit_id);
                        if (!master) return null;
                        const proxyUrl = getProxyImage(master.id, master.imageUrl);
                        const cfg = master.status ? GRID_STATUS_CFG[master.status as keyof typeof GRID_STATUS_CFG] : null;

                        return (
                          <div key={item.id} className="bg-popover border border-border rounded-[10px] flex flex-col overflow-hidden shadow-inner hover:border-primary hover:-translate-y-1 transition-all animate-fade-in group" style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}>
                            <div className="w-full aspect-square bg-background relative flex items-center justify-center border-b border-border overflow-hidden">
                              <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[28px] z-0" style={getAvatarStyle(master.name)}>
                                {getInitials(master.name)}
                              </div>
                              {proxyUrl && (
                                <img src={proxyUrl} alt={master.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-background group-hover:scale-105 transition-transform duration-500" onError={(e) => handleImageError(e, master.id)} />
                              )}
                              {cfg && (
                                <div className="absolute top-2 right-2 z-20">
                                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-[4px] border shadow-sm inline-flex items-center gap-1" style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                                    <StatusIcon status={master.status} />
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="p-3.5 flex flex-col flex-1 justify-between">
                              <span className="text-[13.5px] font-bold text-foreground truncate" title={master.name}>{master.name}</span>
                              <span className="text-[12px] font-black font-mono text-primary mt-2">
                                {master.value === "owner" ? "Owner's Choice" : getUnitConservativeValue(master).toLocaleString()}
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

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-[12px] p-6 max-w-md w-full shadow-2xl flex flex-col relative animate-slide-up">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
              <h3 className="text-[16px] font-black text-foreground uppercase tracking-wide">Edit Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Banner Color</label>
                <div className="flex items-center gap-3 bg-popover p-2.5 rounded-[6px] border border-border shadow-inner">
                  <input 
                    type="color" 
                    value={editBannerColor}
                    onChange={(e) => setEditBannerColor(e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer bg-transparent border-none p-0"
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
                  className="w-full bg-popover border border-border rounded-[6px] p-3 text-[13px] text-foreground outline-none resize-none h-24 focus:border-primary transition-colors shadow-inner"
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
                  className="w-full bg-popover border border-border rounded-[6px] p-3 text-[13px] text-foreground outline-none focus:border-primary transition-colors shadow-inner"
                />
              </div>

              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-popover hover:bg-muted border border-border rounded-[6px] text-[13px] font-bold text-foreground transition-colors focus-visible:outline-none">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 bg-[#23a559] hover:bg-[#1f914e] text-white rounded-[6px] text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 focus-visible:outline-none">
                  {isSaving ? "Saving..." : <><Check className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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