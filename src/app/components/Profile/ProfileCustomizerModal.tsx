import React, { useState, useRef, useCallback, useMemo, memo } from "react";
import { triggerHaptic } from "../../../data/helpers";
import {
  UserProfileData,
  BannerStyleType,
  TradingStanceType,
  getBannerCssStyle,
} from "../../../store/useProfileStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { useToastStore } from "../../../store/useToastStore";
import { supabase } from "../../../lib/supabase";
import { UserAvatar } from "../shared/UserAvatar";

// Clean Discord-style SVG Icons
const IconClose = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCheck = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconRefresh = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
);

const IconUpload = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconTrash = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// Curated solid swatches
export const BANNER_COLOR_SWATCHES = [
  { label: "Obsidian", hex: "#121214" },
  { label: "Discord Dark", hex: "#1e1f22" },
  { label: "Midnight Navy", hex: "#0f172a" },
  { label: "Dark Slate", hex: "#1e293b" },
  { label: "Charcoal", hex: "#18181b" },
  { label: "Deep Forest", hex: "#064e3b" },
  { label: "Royal Indigo", hex: "#1e1b4b" },
  { label: "Crimson Dark", hex: "#450a0a" },
];

export const ACCENT_COLOR_SWATCHES = [
  { label: "Blurple", hex: "#5865F2" },
  { label: "Emerald", hex: "#23a559" },
  { label: "Amber", hex: "#f59e0b" },
  { label: "Crimson", hex: "#ef4444" },
  { label: "Cyan", hex: "#06b6d4" },
  { label: "Violet", hex: "#a855f7" },
  { label: "Pink", hex: "#ec4899" },
  { label: "Sky Blue", hex: "#38bdf8" },
];

export const BANNER_STYLE_OPTIONS: { id: BannerStyleType; label: string }[] = [
  { id: "solid", label: "Flat Solid" },
  { id: "gradient", label: "Smooth Gradient" },
  { id: "carbon", label: "Carbon Fiber" },
  { id: "mesh", label: "Geometric Mesh" },
  { id: "waves", label: "Digital Waves" },
  { id: "circuit", label: "Circuit Board" },
  { id: "aurora", label: "Aurora Glow" },
  { id: "grid", label: "Tactical Grid" },
  { id: "stripes", label: "Diagonal Stripes" },
  { id: "dots", label: "Starfield Dots" },
  { id: "obsidian", label: "Obsidian Geo" },
  { id: "topography", label: "Topography" },
  { id: "cyber", label: "Cyber Matrix" },
  { id: "constellation", label: "Constellation" },
];

export const TRADING_STANCE_OPTIONS: {
  id: TradingStanceType;
  label: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    id: "open",
    label: "Open to Offers",
    desc: "Actively accepting all fair trade offers",
    color: "#4ade80",
    bg: "#122317",
    border: "#23a559",
  },
  {
    id: "upgrading",
    label: "Upgrading Only",
    desc: "Trading multiple units up into higher tiers",
    color: "#fbbf24",
    bg: "#281b0a",
    border: "#f59e0b",
  },
  {
    id: "downgrading",
    label: "Downgrading",
    desc: "Breaking down high-tier units for adds",
    color: "#7dd3fc",
    bg: "#0c1d2e",
    border: "#38bdf8",
  },
  {
    id: "wishlist",
    label: "Hunting Wishlist",
    desc: "Primarily looking for Target Wishlist units",
    color: "#d8b4fe",
    bg: "#211133",
    border: "#c084fc",
  },
  {
    id: "afk",
    label: "AFK / Break",
    desc: "Slow responses or temporarily away",
    color: "#cbd5e1",
    bg: "#1c1f24",
    border: "#64748b",
  },
];

async function uploadBannerImage(dataUrl: string): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const res = await fetch("/api/uploadBanner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ imageBase64: dataUrl }),
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.publicUrl === "string") {
        return data.publicUrl;
      }
    }
  } catch (err) {
    console.warn("[uploadBannerImage] API upload failed, falling back to data URL:", err);
  }
  return null;
}

// ============================================================================
// MEMOIZED SUB-COMPONENTS (Eliminate parent re-render lag)
// ============================================================================

interface LivePreviewCardProps {
  bannerColor: string;
  accentColor: string;
  bannerStyle: BannerStyleType;
  bannerImageUrl?: string;
  username: string;
  avatarUrl: string;
  discordId: string;
  robloxName: string;
  tradingStance: TradingStanceType;
  bio: string;
  isSyncingAvatar: boolean;
  onSyncAvatar: () => void;
}

const LivePreviewCard = memo(function LivePreviewCard({
  bannerColor,
  accentColor,
  bannerStyle,
  bannerImageUrl,
  username,
  avatarUrl,
  discordId,
  robloxName,
  tradingStance,
  bio,
  isSyncingAvatar,
  onSyncAvatar,
}: LivePreviewCardProps) {
  const bannerStyleCss = useMemo(
    () => getBannerCssStyle(bannerColor, accentColor, bannerStyle, bannerImageUrl),
    [bannerColor, accentColor, bannerStyle, bannerImageUrl]
  );

  const previewStance = useMemo(
    () => TRADING_STANCE_OPTIONS.find((s) => s.id === tradingStance) || TRADING_STANCE_OPTIONS[0],
    [tradingStance]
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-semibold text-[#949ba4] uppercase tracking-wider">
          Live Profile Preview
        </span>
        <span className="text-[10px] text-[#23a559] font-mono">
          ● Real-Time
        </span>
      </div>
      <div
        className="rounded-[8px] border border-[#35373c] bg-[#2b2d31] overflow-hidden shadow-md"
        style={{ borderTop: `3px solid ${accentColor}` }}
      >
        {/* Banner Area (No transition-all: stops laggy background gradient reflows) */}
        <div
          className="h-[84px] w-full relative border-b border-[#35373c]"
          style={{
            ...bannerStyleCss,
            contain: "paint",
            willChange: "transform",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {bannerImageUrl && (
            <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-black/75 text-white border border-white/20 select-none">
              Custom Banner
            </span>
          )}
        </div>

        {/* Profile Bar Area */}
        <div className="px-4 pb-4 relative flex flex-col gap-2.5">
          <div className="flex items-end justify-between gap-3 -mt-8">
            <div className="flex items-end gap-3 min-w-0">
              <UserAvatar
                avatarUrl={avatarUrl}
                username={username}
                discordId={discordId}
                className="w-14 h-14 rounded-[8px] border-4 border-[#2b2d31] bg-[#1e1f22] shadow-md shrink-0"
                alt={username}
              />
              <div className="flex flex-col pb-0.5 min-w-0">
                <span className="text-[15px] font-bold text-white truncate leading-tight">
                  {username}
                </span>
                <span className="text-[11px] text-[#949ba4] truncate">
                  {robloxName ? `Roblox: ${robloxName}` : "Verified Trader"}
                </span>
              </div>
            </div>

            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-[4px] border shrink-0 select-none"
              style={{
                backgroundColor: previewStance.bg,
                color: previewStance.color,
                borderColor: previewStance.border,
              }}
            >
              {previewStance.label}
            </span>
          </div>

          {bio && (
            <p className="text-[12px] text-[#dbdee1] pt-1.5 border-t border-[#35373c] line-clamp-2 leading-relaxed">
              {bio}
            </p>
          )}

          {/* Avatar Refresh Row */}
          <div className="pt-2 border-t border-[#35373c] flex items-center justify-between">
            <span className="text-[11px] text-[#949ba4]">
              Discord Avatar
            </span>
            <button
              type="button"
              onClick={onSyncAvatar}
              disabled={isSyncingAvatar}
              className="text-[11.5px] font-semibold text-[#5865F2] hover:text-[#7983f5] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <IconRefresh
                className={`w-3 h-3 ${isSyncingAvatar ? "animate-spin" : ""}`}
              />
              <span>
                {isSyncingAvatar ? "Syncing…" : "Re-sync Discord Avatar"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

interface BannerArtworkStudioProps {
  bannerColor: string;
  accentColor: string;
  bannerStyle: BannerStyleType;
  bannerImageUrl?: string;
  isProcessingBanner: boolean;
  onBannerColorChange: (hex: string) => void;
  onAccentColorChange: (hex: string) => void;
  onBannerStyleChange: (style: BannerStyleType) => void;
  onUploadClick: () => void;
  onRemoveCustomBanner: () => void;
}

const BannerArtworkStudio = memo(function BannerArtworkStudio({
  bannerColor,
  accentColor,
  bannerStyle,
  bannerImageUrl,
  isProcessingBanner,
  onBannerColorChange,
  onAccentColorChange,
  onBannerStyleChange,
  onUploadClick,
  onRemoveCustomBanner,
}: BannerArtworkStudioProps) {
  return (
    <div className="flex flex-col gap-3 p-3.5 bg-[#232428] rounded-[8px] border border-[#35373c]">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-white">
          Banner Artwork & Upload
        </span>
        {bannerImageUrl && (
          <button
            type="button"
            onClick={onRemoveCustomBanner}
            className="text-[11px] font-semibold text-[#ef4444] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <IconTrash className="w-3 h-3" />
            <span>Remove Custom Banner</span>
          </button>
        )}
      </div>

      {/* Custom Image Upload Zone */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onUploadClick}
          disabled={isProcessingBanner}
          className="w-full sm:w-auto px-4 py-2 rounded-[6px] bg-[#5865F2] hover:bg-[#4752c4] text-white text-[12px] font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
        >
          <IconUpload className="w-3.5 h-3.5" />
          <span>
            {isProcessingBanner
              ? "Processing Banner…"
              : bannerImageUrl
              ? "Replace Custom Banner"
              : "Upload Custom Banner (PNG, JPG, WebP)"}
          </span>
        </button>
        <span className="text-[11px] text-[#949ba4] text-center sm:text-left">
          Max 4 MB. Auto-scaled & optimized to 960×240.
        </span>
      </div>

      {/* Banner Solid Color Swatches */}
      <div className="flex flex-col gap-1.5 mt-1">
        <span className="text-[11.5px] font-semibold text-[#949ba4]">
          Banner Base Color
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {BANNER_COLOR_SWATCHES.map((sw) => {
            const active = bannerColor.toLowerCase() === sw.hex.toLowerCase();
            return (
              <button
                key={sw.hex}
                type="button"
                onClick={() => onBannerColorChange(sw.hex)}
                title={sw.label}
                className={`w-7 h-7 rounded-[6px] border transition-transform duration-100 cursor-pointer ${
                  active
                    ? "ring-2 ring-white border-white scale-110"
                    : "border-[#35373c] hover:scale-105"
                }`}
                style={{ backgroundColor: sw.hex }}
              />
            );
          })}
        </div>
      </div>

      {/* Profile Accent Color Swatches */}
      <div className="flex flex-col gap-1.5 mt-1">
        <span className="text-[11.5px] font-semibold text-[#949ba4]">
          Profile Accent Trim
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_COLOR_SWATCHES.map((sw) => {
            const active = accentColor.toLowerCase() === sw.hex.toLowerCase();
            return (
              <button
                key={sw.hex}
                type="button"
                onClick={() => onAccentColorChange(sw.hex)}
                title={sw.label}
                className={`w-7 h-7 rounded-[6px] border transition-transform duration-100 cursor-pointer ${
                  active
                    ? "ring-2 ring-white border-white scale-110"
                    : "border-[#35373c] hover:scale-105"
                }`}
                style={{ backgroundColor: sw.hex }}
              />
            );
          })}
        </div>
      </div>

      {/* Banner Pattern Styles */}
      <div className="flex flex-col gap-1.5 mt-1">
        <span className="text-[11.5px] font-semibold text-[#949ba4]">
          Banner Pattern Texture
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
          {BANNER_STYLE_OPTIONS.map((st) => {
            const active = bannerStyle === st.id && !bannerImageUrl;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onBannerStyleChange(st.id)}
                className={`px-2.5 py-1.5 rounded-[5px] text-[11px] font-semibold text-center border transition-colors cursor-pointer truncate ${
                  active
                    ? "bg-[#5865F2] text-white border-[#5865F2]"
                    : "bg-[#1e1f22] border-[#35373c] text-[#dbdee1] hover:bg-[#2b2d31]"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

interface TradingStanceSelectorProps {
  tradingStance: TradingStanceType;
  onStanceChange: (stance: TradingStanceType) => void;
}

const TradingStanceSelector = memo(function TradingStanceSelector({
  tradingStance,
  onStanceChange,
}: TradingStanceSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[12px] font-bold text-white">
        Trading Stance Badge
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TRADING_STANCE_OPTIONS.map((st) => {
          const active = tradingStance === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onStanceChange(st.id)}
              className={`p-2.5 rounded-[6px] border text-left flex flex-col gap-0.5 transition-colors cursor-pointer ${
                active
                  ? "bg-[#2b2d31] border-[#5865F2]"
                  : "bg-[#232428] border-[#35373c] hover:bg-[#2b2d31]"
              }`}
            >
              <span
                className="text-[12px] font-bold"
                style={{ color: st.color }}
              >
                {st.label}
              </span>
              <span className="text-[11px] text-[#949ba4]">
                {st.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ============================================================================
// MAIN MODAL
// ============================================================================

interface ProfileCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: UserProfileData;
  onSave: (updates: {
    bio: string;
    roblox_username: string;
    banner_color: string;
    accent_color: string;
    banner_style: BannerStyleType;
    banner_image_url?: string;
    trading_stance: TradingStanceType;
  }) => Promise<void>;
  isSaving: boolean;
}

export const ProfileCustomizerModal = memo(function ProfileCustomizerModal({
  isOpen,
  onClose,
  profileData,
  onSave,
  isSaving,
}: ProfileCustomizerModalProps) {
  if (!isOpen) return null;

  // Local, isolated component state
  const [bio, setBio] = useState(profileData.bio || "");
  const [robloxName, setRobloxName] = useState(profileData.roblox_username || "");
  const [bannerColor, setBannerColor] = useState(profileData.banner_color || "#121214");
  const [accentColor, setAccentColor] = useState(profileData.accent_color || "#5865F2");
  const [bannerStyle, setBannerStyle] = useState<BannerStyleType>(
    profileData.banner_style || "gradient"
  );
  const [bannerImageUrl, setBannerImageUrl] = useState<string | undefined>(
    profileData.banner_image_url
  );
  const [tradingStance, setTradingStance] = useState<TradingStanceType>(
    profileData.trading_stance || "open"
  );
  const [isSyncingAvatar, setIsSyncingAvatar] = useState(false);
  const [isProcessingBanner, setIsProcessingBanner] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side Canvas Sanitization for Custom Banner Upload
  const handleBannerFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        useToastStore.getState().addToast(
          "Invalid file type. Please upload a PNG, JPG, or WebP image.",
          "error"
        );
        return;
      }

      if (file.size > 4 * 1024 * 1024) {
        useToastStore.getState().addToast(
          "Image is too large. Maximum upload size is 4 MB.",
          "error"
        );
        return;
      }

      setIsProcessingBanner(true);
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement("canvas");
            const targetWidth = 960;
            const targetHeight = 240;

            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              throw new Error("Could not initialize 2D canvas context.");
            }

            ctx.fillStyle = bannerColor || "#121214";
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            const imgAspect = img.width / img.height;
            const targetAspect = targetWidth / targetHeight;
            let renderW = targetWidth;
            let renderH = targetHeight;
            let offsetX = 0;
            let offsetY = 0;

            if (imgAspect > targetAspect) {
              renderW = targetHeight * imgAspect;
              offsetX = (targetWidth - renderW) / 2;
            } else {
              renderH = targetWidth / imgAspect;
              offsetY = (targetHeight - renderH) / 2;
            }

            ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

            let dataUrl = canvas.toDataURL("image/webp", 0.84);
            if (!dataUrl.startsWith("data:image/webp")) {
              dataUrl = canvas.toDataURL("image/jpeg", 0.84);
            }

            // Immediately apply to live preview for 0ms lag
            setBannerImageUrl(dataUrl);
            triggerHaptic("success");
            useToastStore.getState().addToast(
              "Banner processed & applied to live preview!",
              "success"
            );

            // Upload in background to Supabase Storage
            const cdnUrl = await uploadBannerImage(dataUrl);
            if (cdnUrl) {
              setBannerImageUrl(cdnUrl);
            }
          } catch {
            useToastStore.getState().addToast(
              "Could not process banner image. Please try another image.",
              "error"
            );
          } finally {
            setIsProcessingBanner(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        };

        img.onerror = () => {
          setIsProcessingBanner(false);
          useToastStore.getState().addToast(
            "Failed to decode image file. Please try another.",
            "error"
          );
        };

        if (typeof event.target?.result === "string") {
          img.src = event.target.result;
        }
      };

      reader.onerror = () => {
        setIsProcessingBanner(false);
        useToastStore.getState().addToast("Could not read file.", "error");
      };

      reader.readAsDataURL(file);
    },
    [bannerColor]
  );

  const handleRemoveCustomBanner = useCallback(() => {
    triggerHaptic("light");
    setBannerImageUrl(undefined);
  }, []);

  const handleBannerColorChange = useCallback((hex: string) => {
    triggerHaptic("light");
    setBannerColor(hex);
  }, []);

  const handleAccentColorChange = useCallback((hex: string) => {
    triggerHaptic("light");
    setAccentColor(hex);
  }, []);

  const handleBannerStyleChange = useCallback((st: BannerStyleType) => {
    triggerHaptic("light");
    setBannerStyle(st);
    setBannerImageUrl(undefined);
  }, []);

  const handleStanceChange = useCallback((stance: TradingStanceType) => {
    triggerHaptic("light");
    setTradingStance(stance);
  }, []);

  const handleSyncDiscordAvatar = useCallback(async () => {
    triggerHaptic("medium");
    setIsSyncingAvatar(true);
    try {
      await useAuthStore.getState().syncDiscordAvatar();
    } finally {
      setIsSyncingAvatar(false);
    }
  }, []);

  const handleSave = async () => {
    triggerHaptic("medium");
    let finalBannerUrl = bannerImageUrl;

    // If still in data URL format, attempt storage upload
    if (finalBannerUrl && finalBannerUrl.startsWith("data:image/")) {
      const cdnUrl = await uploadBannerImage(finalBannerUrl);
      if (cdnUrl) {
        finalBannerUrl = cdnUrl;
      }
    }

    await onSave({
      bio: bio.trim(),
      roblox_username: robloxName.trim(),
      banner_color: bannerColor,
      accent_color: accentColor,
      banner_style: bannerStyle,
      banner_image_url: finalBannerUrl,
      trading_stance: tradingStance,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-4 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-profile-title"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="bg-[#1e1f22] border border-[#35373c] rounded-[10px] max-w-2xl w-full max-h-[92vh] flex flex-col relative shadow-2xl overflow-hidden z-10">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#35373c] bg-[#18191c] flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <h3
              id="customize-profile-title"
              className="text-[15px] text-white font-bold tracking-tight"
            >
              Customize Trader Profile
            </h3>
            <span className="text-[11.5px] text-[#949ba4]">
              Personalize banner, accent trim, custom upload, stance, and bio.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#949ba4] hover:text-white p-1.5 rounded-[6px] hover:bg-[#2b2d31] transition-colors cursor-pointer"
            aria-label="Close customizer"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={handleBannerFileSelect}
            className="hidden"
          />

          {/* LIVE PROFILE PREVIEW CARD */}
          <LivePreviewCard
            bannerColor={bannerColor}
            accentColor={accentColor}
            bannerStyle={bannerStyle}
            bannerImageUrl={bannerImageUrl}
            username={profileData.username}
            avatarUrl={profileData.avatar_url}
            discordId={profileData.discord_id}
            robloxName={robloxName}
            tradingStance={tradingStance}
            bio={bio}
            isSyncingAvatar={isSyncingAvatar}
            onSyncAvatar={handleSyncDiscordAvatar}
          />

          {/* BANNER CUSTOMIZATION STUDIO */}
          <BannerArtworkStudio
            bannerColor={bannerColor}
            accentColor={accentColor}
            bannerStyle={bannerStyle}
            bannerImageUrl={bannerImageUrl}
            isProcessingBanner={isProcessingBanner}
            onBannerColorChange={handleBannerColorChange}
            onAccentColorChange={handleAccentColorChange}
            onBannerStyleChange={handleBannerStyleChange}
            onUploadClick={() => fileInputRef.current?.click()}
            onRemoveCustomBanner={handleRemoveCustomBanner}
          />

          {/* TRADING STANCE SELECTOR */}
          <TradingStanceSelector
            tradingStance={tradingStance}
            onStanceChange={handleStanceChange}
          />

          {/* ABOUT ME & ROBLOX USERNAME */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-white">
                  About Me (Bio)
                </label>
                <span className="text-[11px] font-mono text-[#949ba4]">
                  {bio.length} / 190
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={190}
                placeholder="Share your trading goals, time zone, or preferred offers…"
                className="w-full bg-[#1e1f22] border border-[#35373c] rounded-[6px] p-3 text-[13px] text-white outline-none resize-none h-20 focus:border-[#5865F2] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-white">
                Roblox Username
              </label>
              <input
                type="text"
                value={robloxName}
                onChange={(e) => setRobloxName(e.target.value)}
                placeholder="Your Roblox username (optional)…"
                className="w-full bg-[#1e1f22] border border-[#35373c] rounded-[6px] px-3.5 py-2 text-[13px] text-white outline-none focus:border-[#5865F2] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-[#35373c] bg-[#18191c] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-white rounded-[6px] text-[12px] font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-[6px] text-[12px] font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span>Saving…</span>
            ) : (
              <>
                <IconCheck className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
