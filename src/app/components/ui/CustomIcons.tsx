import React from "react";

interface CustomIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

// 1. A Glowing Gem (Used for Value/Gems/Currency)
export const ValueGem = ({ size = 24, className = "", ...props }: CustomIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="gemGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ADE80" />
        <stop offset="100%" stopColor="#16A34A" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path
      d="M12 2L2 9l4 13h12l4-13L12 2z"
      fill="url(#gemGradient)"
      stroke="#14532D"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#glow)"
    />
    <path
      d="M12 2v20M2 9h20M7 9l5 13M17 9l-5 13"
      stroke="#86EFAC"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.6"
    />
    <path
      d="M12 2l-5 7m5-7l5 7"
      stroke="#86EFAC"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.6"
    />
  </svg>
);

// 2. A Fiery Flame (Used for Demand/Hype)
export const DemandFire = ({ size = 24, className = "", ...props }: CustomIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="fireGradient" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#DC2626" />
        <stop offset="50%" stopColor="#EA580C" />
        <stop offset="100%" stopColor="#FACC15" />
      </linearGradient>
    </defs>
    <path
      d="M12 22C12 22 4 17 4 10.5C4 7 6.5 4 8 2C7.5 4 8 6 9 7.5C10.5 5 12.5 3 14 3C13.5 5.5 15 7.5 16.5 9C18 10.5 20 12 20 15C20 19.5 16 22 12 22Z"
      fill="url(#fireGradient)"
      stroke="#7F1D1D"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M12 20C12 20 8 17 8 13C8 10.5 10 9 11 8C10.5 9.5 11.5 11 12.5 12C13.5 13 14.5 13.5 14.5 15C14.5 17.5 12.5 20 12 20Z"
      fill="#FEF08A"
      opacity="0.8"
    />
  </svg>
);

// 3. Crossed Swords (Used for Trade/Battles/Units)
export const TradeSwords = ({ size = 24, className = "", ...props }: CustomIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    <path
      d="M6 18L3 21M3 21L5.5 23.5L8.5 20.5M3 21V18L5.5 15.5L8.5 18.5M8.5 18.5L20 7C20.5 6.5 21 5 21 3C19 3 17.5 3.5 17 4L5.5 15.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 18L21 21M21 21L18.5 23.5L15.5 20.5M21 21V18L18.5 15.5L15.5 18.5M15.5 18.5L4 7C3.5 6.5 3 5 3 3C5 3 6.5 3.5 7 4L18.5 15.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 4. Stardust / Anime Sparkle (Used for Evolution/Traits)
export const AnimeSparkle = ({ size = 24, className = "", ...props }: CustomIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="sparkleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
    <path
      d="M12 1C12 7 15 11 22 12C15 13 12 17 12 23C12 17 9 13 2 12C9 11 12 7 12 1Z"
      fill="url(#sparkleGradient)"
      stroke="#1E3A8A"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" fill="#E0E7FF" />
  </svg>
);

// 5. Elite Crown (Used for S-Tier / Special)
export const EliteCrown = ({ size = 24, className = "", ...props }: CustomIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="crownGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#EAB308" />
      </linearGradient>
    </defs>
    <path
      d="M2 20H22L19 7L15.5 12L12 4L8.5 12L5 7L2 20Z"
      fill="url(#crownGradient)"
      stroke="#854D0E"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="3" r="1.5" fill="#EF4444" />
    <circle cx="4" cy="5" r="1.5" fill="#3B82F6" />
    <circle cx="20" cy="5" r="1.5" fill="#3B82F6" />
  </svg>
);
