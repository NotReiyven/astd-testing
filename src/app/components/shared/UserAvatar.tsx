import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";
import { getUnitAssetUrl } from "../../../data/helpers";

export function getDiscordDefaultAvatar(discordId?: string | null): string {
  if (!discordId) return "https://cdn.discordapp.com/embed/avatars/0.png";
  try {
    const idBig = BigInt(discordId);
    const index = Number((idBig >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${Math.abs(index)}.png`;
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

export interface UserAvatarProps {
  avatarUrl?: string | null;
  username?: string | null;
  discordId?: string | null;
  className?: string;
  imageClassName?: string;
  alt?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  title?: string;
  priority?: boolean;
}

export const UserAvatar = memo(function UserAvatar({
  avatarUrl,
  username,
  discordId,
  className = "w-10 h-10 rounded-full",
  imageClassName = "",
  alt,
  onClick,
  title,
  priority = false,
}: UserAvatarProps) {
  // 0: Custom avatarUrl
  // 1: Discord permanent default embed avatar
  // 2: Local firezio asset (/units/firezio.webp)
  // 3: Pure styled initials fallback (zero image loading)
  const [stage, setStage] = useState<number>(() => {
    if (avatarUrl && avatarUrl.trim()) {
      return 0;
    }
    if (discordId) {
      return 1;
    }
    return 2;
  });

  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Check if image is already completed in browser cache on ref attach
  const handleImageRef = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node && node.complete && node.naturalWidth > 0) {
      setImgLoaded(true);
    }
  }, []);

  useEffect(() => {
    setImgLoaded(false);
    if (avatarUrl && avatarUrl.trim()) {
      setStage(0);
    } else if (discordId) {
      setStage(1);
    } else {
      setStage(2);
    }
  }, [avatarUrl, discordId]);

  const currentSrc = (() => {
    switch (stage) {
      case 0:
        return avatarUrl && avatarUrl.trim() ? avatarUrl : null;
      case 1:
        return getDiscordDefaultAvatar(discordId);
      case 2:
        return getUnitAssetUrl("firezio") || "/units/firezio.webp";
      default:
        return null;
    }
  })();

  // Re-check completed state whenever currentSrc changes
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setImgLoaded(true);
    }
  }, [currentSrc]);

  const handleError = () => {
    setImgLoaded(false);
    setStage((prev) => {
      if (prev === 0) {
        return discordId ? 1 : 2;
      }
      if (prev === 1) {
        return 2;
      }
      return 3; // final fallback to CSS initials
    });
  };

  const fallbackStyle = getAvatarStyle(username);
  const initials = getInitials(username);

  return (
    <div
      onClick={onClick}
      title={title}
      className={`relative flex items-center justify-center overflow-hidden shrink-0 select-none ${className}`}
      style={fallbackStyle}
    >
      {/* Background Initials (Always present underneath to prevent white/empty flashes) */}
      <span
        aria-hidden="true"
        className="text-white font-bold select-none text-[11px] uppercase pointer-events-none tracking-tight"
      >
        {initials}
      </span>

      {/* Image Layer: gracefully loaded on top, hidden on error */}
      {currentSrc && stage < 3 && (
        <img
          ref={handleImageRef}
          src={currentSrc}
          alt={alt || username || "User avatar"}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          width={40}
          height={40}
          referrerPolicy="no-referrer"
          onLoad={() => setImgLoaded(true)}
          onError={handleError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          } ${imageClassName}`}
        />
      )}
    </div>
  );
});
