import { useState, useEffect, memo } from "react";
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
    isOpaqueFallback: _isOpaqueFallback = false,
  }: UnitAvatarProps) => {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const proxyUrl = getProxyImage(unitId, imageUrl);

    useEffect(() => {
      setImgLoaded(false);
      setImgError(false);
    }, [unitId, proxyUrl]);

    return (
      <>
        {/* Background Fallback Initials (ALWAYS rendered with crisp solid contrast so it NEVER shows a black box) */}
        <div
          className={`${fallbackClassName} select-none pointer-events-none font-bold`}
          style={getAvatarStyle(unitName)}
        >
          {getInitials(unitName)}
        </div>

        {/* Loading subtle pulse indicator */}
        {!imgLoaded && !imgError && proxyUrl && (
          <div className="absolute inset-0 z-[5] bg-black/20 animate-pulse pointer-events-none" />
        )}

        {/* Real unit image */}
        {proxyUrl && !imgError && (
          <img
            src={proxyUrl}
            alt={unitName}
            loading="lazy"
            decoding="async"
            width={128}
            height={128}
            onLoad={() => {
              setImgLoaded(true);
              setImgError(false);
            }}
            onError={(e) => {
              const retrying = handleImageError(e, unitId);
              if (!retrying) {
                setImgError(true);
              }
            }}
            className={`${imageClassName} transition-opacity duration-200 ease-out ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            style={{ objectPosition: "center 15%" }}
          />
        )}
      </>
    );
  }
);


