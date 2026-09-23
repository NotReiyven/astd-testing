// ================================================
// FILE: src/app/components/ProfileChannel.tsx
// ================================================

import { useState, useEffect, memo } from "react";
import { 
  UserCircle, Edit2, Check, X, ShieldAlert, Shield, Star, 
  MessageSquare, Package, Megaphone, Activity, Settings,
  Gamepad2, Clock, ArrowRight, Copy, Share2, ArrowLeft,
  Palette, MousePointer2, Maximize, ArrowRightLeft, LogIn
} from "lucide-react";
import { useProfileStore, UserProfileData } from "../../store/useProfileStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradingAdsStore } from "../../store/useTradingAdsStore";
import { useInventoryStore } from "../../store/useInventoryStore";
import { useLayoutStore, ThemeMode, BootChannel } from "../../store/useLayoutStore";
import { useUnits } from "../../context/UnitContext";
import { getUnitConservativeValue } from "./InventoryChannel/inventoryUtils";
import { getProxyImage, handleImageError, GRID_STATUS_CFG } from "../../data";
import { getAvatarStyle, getInitials } from "./TradeAnalyzer/summaryUtils";
import { triggerHaptic } from "../../data/helpers";
import { StatusIcon } from "./shared/Formatters";
import { TradeCard, MasterUnit } from "../../types";
import { safeOpenExternal } from "../../store/useExternalLinkStore";
import { UnitAvatar } from "./shared/UnitAvatar";

const getRoleConfig = (role: string) => {
  switch (role) {
    case 'master':
    case 'admin':
      return { icon: ShieldAlert, color: 'var(--warning)', bg: 'bg-warning/10 border-warning/30 text-warning', label: role === 'master' ? 'Master' : 'Admin' };
    case 'mod':
      return { icon: Shield, color: 'var(--primary)', bg: 'bg-primary/10 border-primary/30 text-primary', label: 'Moderator' };
    default:
      return { icon: UserCircle, color: 'var(--muted-foreground)', bg: 'bg-muted border-border text-muted-foreground', label: 'Trader' };
  }
};

const getReputationRank = (rep: number) => {
  if (rep < 0) return { label: "Exiled", color: "var(--destructive)", border: "border-destructive/40", bg: "bg-destructive/15", next: 0, min: -100, icon: ShieldAlert };
  if (rep < 10) return { label: "Unranked", color: "var(--muted-foreground)", border: "border-border", bg: "bg-muted", next: 10, min: 0, icon: Star };
  if (rep < 50) return { label: "Apprentice", color: "#cd7f32", border: "border-[#cd7f32]/40", bg: "bg-[#cd7f32]/15", next: 50, min: 10, icon: Star };
  if (rep < 150) return { label: "Recognized", color: "#c0c0c0", border: "border-[#c0c0c0]/40", bg: "bg-[#c0c0c0]/15", next: 150, min: 50, icon: Star };
  if (rep < 300) return { label: "Trusted Merchant", color: "#ffd700", border: "border-[#ffd700]/50", bg: "bg-[#ffd700]/15", next: 300, min: 150, icon: Star };
  if (rep < 500) return { label: "Elite Broker", color: "var(--info)", border: "border-info/60", bg: "bg-info/15", next: 500, min: 300, icon: Star };
  if (rep < 1000) return { label: "Vanguard", color: "#3A7CE6", border: "border-[#3A7CE6]/60", bg: "bg-[#3A7CE6]/15", next: 1000, min: 500, icon: Star };
  return { label: "Legend", color: "#a855f7", border: "border-[#a855f7]/60", bg: "bg-[#a855f7]/15", next: 1000, min: 1000, icon: Star };
};

const AdItemTile = memo(({ item, ALL_UNITS }: { item: TradeCard, ALL_UNITS: MasterUnit[] }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const master = ALL_UNITS.find(u => u.id === item.id);
  const conservativeVal = master ? getUnitConservativeValue(master) * item.qty : item.value * item.qty;
  const rarity = master?.rarity ?? "N/A";

  return (
    <div 
      className="flex flex-col items-center gap-1 group relative cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="relative aspect-square rounded-[4px] bg-muted border border-border flex items-center justify-center overflow-hidden shadow-sm group-hover:border-foreground transition-colors min-w-[56px] w-full">
         <UnitAvatar
           unitId={item.id}
           unitName={item.name}
           imageUrl={master?.imageUrl}
           fallbackClassName="absolute inset-0 flex items-center justify-center text-white font-black text-[12px] z-0"
           imageClassName="absolute inset-0 w-full h-full object-cover z-10 bg-muted transition-transform group-hover:scale-105"
         />
        {item.qty > 1 && (
          <div className="absolute bottom-0 right-0 bg-popover text-foreground text-[10px] font-black px-1.5 py-0.5 rounded-tl-[4px] z-20 border-t border-l border-border leading-none font-mono">
            x{item.qty}
          </div>
        )}
      </div>

      {showTooltip && master && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border text-foreground text-[11px] p-3 rounded-[4px] shadow-2xl pointer-events-none z-50 w-48 animate-fade-in flex flex-col gap-1">
          <div className="font-extrabold text-foreground truncate">{master.name}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{master.subtitle || "Official Unit"}</div>
          <div className="flex justify-between items-center mt-1 pt-1 border-t border-border font-mono">
            <span className="text-[#4DB6AC]">R: {rarity}</span>
            <span className="text-foreground font-bold">{conservativeVal.toLocaleString()}</span>
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
  const { viewingProfileId, fetchProfile, saveProfileUpdates, returnChannel, setViewingProfile } = useProfileStore();
  const { profile: currentUser, loginWithDiscord } = useAuthStore();
  const setViewingUser = useInventoryStore(s => s.setViewingUser);
  const { theme, setTheme, globalCompactMode, setGlobalCompactMode, bootChannel, setBootChannel } = useLayoutStore();

  const targetId = viewingProfileId || currentUser?.id;
  const isOwner = currentUser?.id === targetId;

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"board" | "wishlist" | "settings">("board");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editBannerColor, setEditBannerColor] = useState("#121214");
  const [editRobloxName, setEditRobloxName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [copiedDiscordId, setCopiedDiscordId] = useState(false);

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
        setEditBannerColor(data.banner_color || "#121214");
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

  const handleCloseProfile = () => {
    triggerHaptic('light');
    const target = returnChannel || "trading-ads";
    window.document.dispatchEvent(new CustomEvent('navigate', { detail: target }));
    setTimeout(() => setViewingProfile(null), 150);
  };

  const formatChannelName = (id: string) => id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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
      setProfileData((prev) => prev ? { ...prev, ...updates } : null);
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
    safeOpenExternal(`https://discord.com/users/${profileData.discord_id}`);
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

  // UNAUTHENTICATED LOCAL PREFERENCES FALLBACK
  if (!targetId) {
    return (
      <div className="flex-1 w-full h-full font-sans overflow-y-auto custom-scrollbar p-6 md:p-12 bg-background flex flex-col items-center">
        <div className="max-w-2xl w-full flex flex-col gap-6">
          
          <div className="bg-card border border-border rounded-[8px] p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col text-center sm:text-left">
              <h2 className="text-[18px] font-black text-foreground tracking-tight">Preferences & Personalization</h2>
              <p className="text-[13px] text-muted-foreground mt-1">Configure your local interface settings. Log in with Discord to unlock your public profile and trading board.</p>
            </div>
            <button
              onClick={() => { triggerHaptic('medium'); loginWithDiscord(); }}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[12px] uppercase tracking-wider rounded-[4px] flex items-center gap-2 transition-colors shrink-0 shadow-sm cursor-pointer focus-visible:outline-none border border-primary"
            >
              <LogIn className="w-4 h-4" /> Login with Discord
            </button>
          </div>

          {/* Theme Mode */}
          <div className="bg-card border border-border rounded-[8px] p-6 shadow-sm">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" /> Application Theme
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'dark', label: "Deep Dark", desc: "High contrast data." },
                { id: 'discord', label: "Blurple", desc: "Matches Discord." },
                { id: 'light', label: "Crisp Light", desc: "Daytime traders." },
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => { triggerHaptic('light'); setTheme(t.id as ThemeMode); }}
                  className={`p-4 rounded-[6px] border text-left flex flex-col gap-1.5 focus-visible:outline-none cursor-pointer transition-colors ${theme === t.id ? 'bg-popover border-primary ring-1 ring-primary/30 shadow-md' : 'bg-muted border-border hover:bg-popover'}`}
                >
                  <span className="text-[14px] font-bold text-foreground">{t.label}</span>
                  <span className="text-[12px] text-muted-foreground font-medium">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Boot Channel */}
          <div className="bg-card border border-border rounded-[8px] p-6 shadow-sm">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
              <MousePointer2 className="w-4 h-4 text-primary" /> Default Boot Channel
            </h3>
            <p className="text-[13px] text-muted-foreground mb-4">Choose where the application routes you immediately after the loading screen finishes.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'last-used', label: "Last Used", desc: "Open where you left off" },
                { id: 'home', label: "Home", desc: "Check patch notes" },
                { id: 'value-list', label: "Value List", desc: "Immediate market data" },
                { id: 'trading-ads', label: "Trading Ads", desc: "Live trading board" }
              ].map((opt) => (
                <button 
                  key={opt.id}
                  onClick={() => { triggerHaptic('light'); setBootChannel(opt.id as BootChannel); }}
                  className={`p-3 rounded-[6px] border text-left flex flex-col gap-1 focus-visible:outline-none cursor-pointer transition-colors ${bootChannel === opt.id ? 'bg-popover border-primary shadow-sm' : 'bg-muted border-border hover:bg-popover'}`}
                >
                  <span className="text-[13px] font-bold text-foreground">{opt.label}</span>
                  <span className="text-[11px] text-muted-foreground font-medium truncate">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Global Compact Mode */}
          <div className="bg-card border border-border rounded-[8px] p-6 shadow-sm flex items-center justify-between">
            <div className="flex flex-col pr-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground mb-1.5 flex items-center gap-2">
                <Maximize className="w-4 h-4 text-primary" /> Global Compact Mode
              </h3>
              <p className="text-[13px] text-muted-foreground">Shrinks padding globally to fit more data on screen.</p>
            </div>
            <button 
              onClick={() => { triggerHaptic('medium'); setGlobalCompactMode(!globalCompactMode); }}
              className={`relative w-12 h-6 rounded-full transition-colors focus-visible:outline-none shrink-0 cursor-pointer ${globalCompactMode ? 'bg-primary' : 'bg-muted border border-border'}`}
            >
              <div className={`absolute top-0.5 left-0.5 bg-background w-5 h-5 rounded-full transition-transform shadow-sm ${globalCompactMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

        </div>
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
  const roleCfg = getRoleConfig(profileData.role);
  const RoleIcon = roleCfg.icon;

  const totalVaultValue = viewedItems.reduce((acc, i) => {
    const m = ALL_UNITS.find(u => u.id === i.unit_id);
    return acc + (m ? getUnitConservativeValue(m) * i.quantity : 0);
  }, 0);

  return (
    <div className="flex-1 w-full h-full font-sans relative overflow-hidden flex flex-col overflow-y-auto custom-scrollbar pb-16 z-10 bg-background">

      {viewingProfileId && (
        <div className="w-full bg-card border-b border-border p-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <button 
            onClick={handleCloseProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-card text-muted-foreground hover:text-foreground border border-border rounded-[4px] text-[12px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {returnChannel ? formatChannelName(returnChannel) : "Ads"}
          </button>
        </div>
      )}

      <div className="w-full relative shrink-0">
        <div 
          className={`w-full transition-colors duration-300 relative border-b border-border ${globalCompactMode ? 'h-[60px] md:h-[80px]' : 'h-[140px] md:h-[160px]'}`}
          style={{ backgroundColor: profileData.banner_color || '#121214' }}
        />

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-20 pb-6 border-b border-border bg-card">
          <div className={`flex flex-col md:flex-row md:items-end justify-between ${globalCompactMode ? 'gap-4 -mt-8 md:-mt-10' : 'gap-6 -mt-12 md:-mt-14'}`}>

            <div className="flex flex-col md:flex-row md:items-end gap-5">
              <div className="relative shrink-0">
                <img 
                  src={profileData.avatar_url || "/units/firezio.webp"} 
                  alt={profileData.username}
                  className={`${globalCompactMode ? 'w-[64px] h-[64px] border-[3px]' : 'w-[100px] h-[100px] border-4'} rounded-[6px] border-card object-cover bg-muted shadow-md`}
                />
              </div>

              <div className="flex flex-col gap-2 pb-1">
                <h1 className={`${globalCompactMode ? 'text-[20px] md:text-[24px]' : 'text-[26px] md:text-[30px]'} font-black text-foreground tracking-tight leading-none`}>
                  {profileData.username}
                </h1>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border text-[11px] font-bold ${repRank.bg} ${repRank.border}`} style={{ color: repRank.color }}>
                    <repRank.icon className="w-3.5 h-3.5" style={{ fill: safeRep >= 50 ? 'currentColor' : 'none' }} />
                    {repRank.label} ({safeRep > 0 ? '+' : ''}{safeRep})
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border text-[11px] font-bold shadow-sm" style={{ backgroundColor: roleCfg.bg, color: roleCfg.color, borderColor: roleCfg.color + '40' }}>
                    <RoleIcon className="w-3.5 h-3.5" />
                    {roleCfg.label}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 pb-1">
              <button 
                onClick={handleCopyProfileLink}
                className="px-4 py-2 rounded-[4px] bg-muted hover:bg-card border border-border text-foreground text-[12px] font-bold flex items-center gap-2 transition-colors shadow-sm focus-visible:outline-none cursor-pointer"
              >
                {copiedProfileLink ? <Check className="w-4 h-4 text-success" /> : <Share2 className="w-4 h-4 text-muted-foreground" />}
                <span>Share</span>
              </button>

              {isOwner ? (
                <button 
                  onClick={() => {
                    setEditBio(profileData.bio || "");
                    setEditBannerColor(profileData.banner_color || "#121214");
                    setEditRobloxName(profileData.roblox_username || "");
                    setIsEditModalOpen(true);
                  }}
                  className="px-5 py-2 rounded-[4px] bg-foreground hover:bg-foreground/90 text-background text-[12px] font-bold flex items-center gap-2 transition-colors shadow-sm focus-visible:outline-none cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </button>
              ) : (
                <button 
                  onClick={handleContact}
                  className="px-6 py-2 rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-bold flex items-center gap-2 transition-colors shadow-sm focus-visible:outline-none cursor-pointer border border-primary"
                >
                  <MessageSquare className="w-4 h-4" /> Message
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      <div className={`px-4 md:px-8 max-w-7xl mx-auto w-full pt-6 flex flex-col ${globalCompactMode ? 'gap-3' : 'gap-6'}`}>

        <div className={`grid grid-cols-2 lg:grid-cols-4 ${globalCompactMode ? 'gap-2' : 'gap-4'}`}>
          <div className={`bg-card border border-border rounded-[6px] flex flex-col justify-between shadow-sm ${globalCompactMode ? 'p-2.5' : 'p-4'}`}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reputation</span>
            <span className={`${globalCompactMode ? 'text-[16px]' : 'text-[20px]'} font-black font-mono mt-2`} style={{ color: repRank.color }}>
              {safeRep > 0 ? `+${safeRep}` : safeRep}
            </span>
          </div>
          <div className={`bg-card border border-border rounded-[6px] flex flex-col justify-between shadow-sm ${globalCompactMode ? 'p-2.5' : 'p-4'}`}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Ads</span>
            <span className={`${globalCompactMode ? 'text-[16px]' : 'text-[20px]'} font-black font-mono text-foreground mt-2`}>{activeAds.length}</span>
          </div>
          <div className={`bg-card border border-border rounded-[6px] flex flex-col justify-between shadow-sm ${globalCompactMode ? 'p-2.5' : 'p-4'}`}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vault Net Worth</span>
            <span className={`${globalCompactMode ? 'text-[16px]' : 'text-[20px]'} font-black font-mono text-foreground mt-2`}>{totalVaultValue.toLocaleString()}</span>
          </div>
          <div className={`bg-card border border-border rounded-[6px] flex flex-col justify-between shadow-sm ${globalCompactMode ? 'p-2.5' : 'p-4'}`}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Member Since</span>
            <span className={`${globalCompactMode ? 'text-[14px] md:text-[15px]' : 'text-[16px] md:text-[18px]'} font-black font-mono text-foreground mt-2`}>{new Date(profileData.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>
          </div>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-[340px_1fr] items-start ${globalCompactMode ? 'gap-3' : 'gap-6'}`}>

          <div className={`flex flex-col lg:sticky lg:top-6 ${globalCompactMode ? 'gap-3' : 'gap-6'}`}>

            <div className={`bg-card border border-border rounded-[6px] shadow-sm flex flex-col gap-4 ${globalCompactMode ? 'p-3.5' : 'p-5'}`}>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-3">About Me</h3>
              {profileData.bio ? (
                <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap break-words font-medium">
                  {profileData.bio}
                </p>
              ) : (
                <p className="text-[13px] text-muted-foreground italic font-medium">
                  This trader hasn't written a bio yet.
                </p>
              )}

              <div className="flex flex-col gap-2.5 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Discord ID</span>
                  <button 
                    onClick={handleCopyDiscordId}
                    className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-foreground bg-muted px-2.5 py-1 rounded-[4px] border border-border hover:border-foreground transition-colors cursor-pointer"
                  >
                    <span>{profileData.discord_id}</span>
                    {copiedDiscordId ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </button>
                </div>

                {profileData.roblox_username && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Roblox ID</span>
                    <span className="text-[12px] font-bold text-foreground font-mono">{profileData.roblox_username}</span>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={handleInspectVault}
              className="w-full py-3.5 bg-foreground hover:bg-foreground/90 text-background rounded-[6px] text-[12px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-sm focus-visible:outline-none cursor-pointer group border border-foreground"
            >
              <Package className="w-4 h-4 group-hover:scale-110 transition-transform" /> Access Public Vault <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

          </div>

          <div className="flex-1 flex flex-col min-w-0">

            <div className={`flex items-center gap-8 border-b border-border px-2 overflow-x-auto hide-scrollbar shrink-0 ${globalCompactMode ? 'mb-3' : 'mb-6'}`}>
              <button 
                onClick={() => setActiveTab("board")}
                className={`pb-3 text-[13px] font-bold uppercase tracking-wider transition-colors relative flex items-center gap-2 focus-visible:outline-none cursor-pointer shrink-0 ${activeTab === "board" ? "text-foreground border-b-2 border-foreground -mb-[1px]" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Megaphone className="w-4 h-4" /> Active Ads <span className="bg-muted border border-border px-2 py-0.5 rounded-[2px] text-[11px] font-mono">{activeAds.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab("wishlist")}
                className={`pb-3 text-[13px] font-bold uppercase tracking-wider transition-colors relative flex items-center gap-2 focus-visible:outline-none cursor-pointer shrink-0 ${activeTab === "wishlist" ? "text-foreground border-b-2 border-foreground -mb-[1px]" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Star className="w-4 h-4" /> Target Wishlist <span className="bg-muted border border-border px-2 py-0.5 rounded-[2px] text-[11px] font-mono">{viewedWishlist.length}</span>
              </button>
              
              {isOwner && (
                <button 
                  onClick={() => setActiveTab("settings")}
                  className={`pb-3 text-[13px] font-bold uppercase tracking-wider transition-colors relative flex items-center gap-2 focus-visible:outline-none cursor-pointer shrink-0 ${activeTab === "settings" ? "text-foreground border-b-2 border-foreground -mb-[1px]" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Settings className="w-4 h-4" /> Preferences
                </button>
              )}
            </div>

            <div className="flex-1 min-h-[400px]">

              {activeTab === "settings" && isOwner && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  
                  {/* Theme Mode */}
                  <div className="bg-card border border-border rounded-[8px] p-5 md:p-6 shadow-sm">
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" /> Application Theme
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button 
                        onClick={() => { triggerHaptic('light'); setTheme('dark'); }}
                        className={`p-4 rounded-[6px] border text-left flex flex-col gap-1.5 focus-visible:outline-none cursor-pointer transition-colors ${theme === 'dark' ? 'bg-popover border-primary ring-1 ring-primary/30 shadow-md' : 'bg-muted border-border hover:bg-popover'}`}
                      >
                        <span className="text-[14px] font-bold text-foreground">Deep Dark</span>
                        <span className="text-[12px] text-muted-foreground font-medium">High contrast data.</span>
                      </button>
                      <button 
                        onClick={() => { triggerHaptic('light'); setTheme('discord'); }}
                        className={`p-4 rounded-[6px] border text-left flex flex-col gap-1.5 focus-visible:outline-none cursor-pointer transition-colors ${theme === 'discord' ? 'bg-popover border-[#5865F2] ring-1 ring-[#5865F2]/30 shadow-md' : 'bg-muted border-border hover:bg-popover'}`}
                      >
                        <span className="text-[14px] font-bold text-foreground">Blurple</span>
                        <span className="text-[12px] text-muted-foreground font-medium">Matches Discord's UI.</span>
                      </button>
                      <button 
                        onClick={() => { triggerHaptic('light'); setTheme('light'); }}
                        className={`p-4 rounded-[6px] border text-left flex flex-col gap-1.5 focus-visible:outline-none cursor-pointer transition-colors ${theme === 'light' ? 'bg-popover border-primary ring-1 ring-primary/30 shadow-md' : 'bg-muted border-border hover:bg-popover'}`}
                      >
                        <span className="text-[14px] font-bold text-foreground">Crisp Light</span>
                        <span className="text-[12px] text-muted-foreground font-medium">For daytime traders.</span>
                      </button>
                    </div>
                  </div>

                  {/* Boot Routing */}
                  <div className="bg-card border border-border rounded-[8px] p-5 md:p-6 shadow-sm">
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                      <MousePointer2 className="w-4 h-4 text-primary" /> Default Boot Channel
                    </h3>
                    <p className="text-[13px] text-muted-foreground mb-4">Choose where the application routes you immediately after the loading screen finishes.</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'last-used', label: "Last Used", desc: "Open where you left off" },
                        { id: 'home', label: "Home", desc: "Check patch notes" },
                        { id: 'value-list', label: "Value List", desc: "Immediate market data" },
                        { id: 'trading-ads', label: "Trading Ads", desc: "Live trading board" }
                      ].map((opt) => (
                        <button 
                          key={opt.id}
                          onClick={() => { triggerHaptic('light'); setBootChannel(opt.id as BootChannel); }}
                          className={`p-3 rounded-[6px] border text-left flex flex-col gap-1 focus-visible:outline-none cursor-pointer transition-colors ${bootChannel === opt.id ? 'bg-popover border-primary shadow-sm' : 'bg-muted border-border hover:bg-popover'}`}
                        >
                          <span className="text-[13px] font-bold text-foreground">{opt.label}</span>
                          <span className="text-[11px] text-muted-foreground font-medium truncate">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Global Compact Mode */}
                  <div className="bg-card border border-border rounded-[8px] p-5 md:p-6 shadow-sm flex items-center justify-between">
                    <div className="flex flex-col pr-4">
                      <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground mb-1.5 flex items-center gap-2">
                        <Maximize className="w-4 h-4 text-primary" /> Global Compact Mode
                      </h3>
                      <p className="text-[13px] text-muted-foreground">Shrinks padding globally to fit more data on screen. Great for small monitors.</p>
                    </div>
                    <button 
                      onClick={() => { triggerHaptic('medium'); setGlobalCompactMode(!globalCompactMode); }}
                      className={`relative w-12 h-6 rounded-full transition-colors focus-visible:outline-none shrink-0 cursor-pointer ${globalCompactMode ? 'bg-primary' : 'bg-muted border border-border'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 bg-background w-5 h-5 rounded-full transition-transform shadow-sm ${globalCompactMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                </div>
              )}

              {activeTab === "board" && (
                <div className="animate-fade-in flex flex-col gap-4">
                  {activeAds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center bg-card border border-border rounded-[6px] p-16 shadow-sm min-h-[350px]">
                      <Megaphone className="w-12 h-12 text-muted-foreground mb-4 opacity-40" />
                      <h3 className="text-[18px] font-black text-foreground">No Active Listings</h3>
                      <p className="text-[13px] text-muted-foreground mt-1 max-w-sm">This user currently has no live trades posted on the trading board.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {activeAds.map((ad) => {
                        const isTakingOffers = ad.ad_type === "lf_offers" || (ad.ad_type === "standard" && ad.get_items.length === 0);
                        const isInventory = ad.ad_type === "inventory";

                        let statusLabel = "Specific Trade";
                        let statusColor = "bg-muted border-border text-foreground";
                        if (isInventory) {
                          statusLabel = "Showcase";
                          statusColor = "bg-muted border-border text-foreground";
                        } else if (isTakingOffers) {
                          statusLabel = "Taking Offers";
                          statusColor = "bg-warning/10 border-warning/30 text-warning";
                        }

                        const totalGiveVal = ad.give_items.reduce((acc, i) => {
                          const m = ALL_UNITS.find(u => u.id === i.id);
                          const liveVal = m ? getUnitConservativeValue(m) : i.value;
                          return acc + (liveVal * i.qty);
                        }, 0);

                        return (
                          <div key={ad.id} className="bg-card border border-border rounded-[6px] p-5 shadow-sm flex flex-col gap-4">
                            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-border pb-3">
                              <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[2px] border ${statusColor}`}>
                                  {statusLabel}
                                </span>
                                <span className="text-[12px] font-mono font-bold text-muted-foreground">
                                  Total Value: <strong className="text-foreground">{totalGiveVal.toLocaleString()}</strong>
                                </span>
                              </div>
                            </div>

                            {ad.note && (
                              <blockquote className="border-l-2 border-primary pl-3.5 py-1 italic text-[13px] text-foreground/90 bg-muted rounded-r-[4px] border border-border">
                                "{ad.note}"
                              </blockquote>
                            )}

                            {isInventory ? (
                              <div className="pt-2">
                                <AdItemGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} label="Showcase Assets" labelColor="var(--muted-foreground)" />
                              </div>
                            ) : isTakingOffers ? (
                              <div className="pt-2">
                                <AdItemGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} label="Offering" labelColor="var(--warning)" />
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center pt-2">
                                <AdItemGrid items={ad.give_items} ALL_UNITS={ALL_UNITS} label="Offering" labelColor="var(--warning)" />
                                <div className="flex justify-center text-muted-foreground bg-muted p-2 rounded-[4px] border border-border mx-auto md:mx-0">
                                  <ArrowRightLeft className="w-4 h-4" />
                                </div>
                                <AdItemGrid items={ad.get_items} ALL_UNITS={ALL_UNITS} label="Requesting" labelColor="var(--primary)" />
                              </div>
                            )}
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
                    <div className="flex flex-col items-center justify-center flex-1 text-center bg-card border border-border rounded-[6px] p-16 shadow-sm min-h-[350px]">
                      <Star className="w-12 h-12 text-muted-foreground mb-4 opacity-40" />
                      <h3 className="text-[18px] font-black text-foreground">Empty Wishlist</h3>
                      <p className="text-[13px] text-muted-foreground mt-1 max-w-sm">This user isn't actively hunting for any specific units right now.</p>
                    </div>
                  ) : (
                    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 bg-card border border-border rounded-[6px] shadow-sm ${globalCompactMode ? 'gap-2 p-3' : 'gap-4 p-6'}`}>
                      {viewedWishlist.map((item) => {
                        const master = ALL_UNITS.find(u => u.id === item.unit_id);
                        if (!master) return null;
                        const cfg = master.status ? GRID_STATUS_CFG[master.status as keyof typeof GRID_STATUS_CFG] : null;

                        return (
                          <div key={item.id} className="bg-muted border border-border rounded-[6px] flex flex-col overflow-hidden shadow-inner hover:border-foreground transition-all group">
                            <div className="w-full aspect-square bg-background relative flex items-center justify-center border-b border-border overflow-hidden">
                              <UnitAvatar
                                unitId={master.id}
                                unitName={master.name}
                                imageUrl={master.imageUrl}
                                fallbackClassName="absolute inset-0 flex items-center justify-center text-white font-black text-2xl z-0"
                                imageClassName="absolute inset-0 w-full h-full object-cover z-10 bg-background group-hover:scale-105 transition-transform duration-300"
                              />
                              {cfg && (
                                <div className="absolute top-2 right-2 z-20">
                                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-[2px] border shadow-sm inline-flex items-center gap-1" style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                                    <StatusIcon status={master.status} />
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="p-3 flex flex-col flex-1 justify-between">
                              <span className="text-[13px] font-bold text-foreground truncate" title={master.name}>{master.name}</span>
                              <span className="text-[12px] font-black font-mono text-foreground mt-2">
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

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="bg-card border border-border rounded-[6px] p-6 max-w-md w-full shadow-2xl flex flex-col relative">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
              <h3 className="text-[16px] font-black text-foreground uppercase tracking-wide">Edit Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Banner Color</label>
                <div className="flex items-center gap-3 bg-muted p-2.5 rounded-[4px] border border-border shadow-inner">
                  <input 
                    type="color" 
                    value={editBannerColor}
                    onChange={(e) => setEditBannerColor(e.target.value)}
                    className="w-8 h-8 rounded-[2px] cursor-pointer bg-transparent border-none p-0"
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
                  className="w-full bg-input border border-border rounded-[4px] p-3 text-[13px] text-foreground outline-none resize-none h-24 focus:border-primary transition-colors shadow-inner"
                />
                <span className="text-[10px] font-bold text-muted-foreground text-right font-mono">{editBio.length}/190</span>
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
                  className="w-full bg-input border border-border rounded-[4px] p-3 text-[13px] text-foreground outline-none focus:border-primary transition-colors shadow-inner"
                />
              </div>

              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2.5 bg-muted hover:bg-popover border border-border rounded-[4px] text-[13px] font-bold text-foreground transition-colors focus-visible:outline-none cursor-pointer">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[4px] text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 focus-visible:outline-none cursor-pointer border border-primary">
                  {isSaving ? "Saving..." : <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> Save Changes</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}