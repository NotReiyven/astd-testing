import { useState, memo } from "react";
import { getProxyImage, handleImageError } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";

interface UnitAvatarProps {
  unitId: string;
  unitName: string;
  imageUrl?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  isOpaqueFallback?: boolean;
}

export const UnitAvatar = memo(
  ({
    unitId,
    unitName,
    imageUrl,
    imageClassName = "absolute inset-0 w-full h-full object-cover z-10 bg-transparent",
    fallbackClassName = "absolute inset-0 flex items-center justify-center text-white font-black z-0",
    isOpaqueFallback = false,
  }: UnitAvatarProps) => {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const proxyUrl = getProxyImage(unitId, imageUrl);

    return (
      <>
        {!imgLoaded && !imgError && proxyUrl && (
          <div className="absolute inset-0 z-[5] bg-muted/40 animate-pulse" />
        )}
        {(!proxyUrl || imgError) && <div
          className={`${fallbackClassName} ${
            !isOpaqueFallback
              ? "opacity-20 select-none pointer-events-none"
              : ""
          }`}
          style={getAvatarStyle(unitName)}
        >
          {getInitials(unitName)}
        </div>}
        {proxyUrl && (
          <img
            src={proxyUrl}
            alt={unitName}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              setImgError(true);
              handleImageError(e, unitId);
            }}
            className={`${imageClassName} transition-opacity duration-300 ease-out ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            style={{ objectPosition: "center 15%" }}
          />
        )}
      </>
    );
  }
);


