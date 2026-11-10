// ================================================
// FILE: src/app/components/ProfileChannel/icons.tsx
// ================================================

export const IconCheck = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
  </svg>
);

export const IconClose = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M4 4L12 12M12 4L4 12" />
  </svg>
);

export const IconEdit = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11.5 2.5L13.5 4.5L5.5 12.5H3.5V10.5L11.5 2.5Z" />
  </svg>
);

export const IconCopy = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M3 10.5V3.5C3 2.95 3.45 2.5 4 2.5H10.5" />
  </svg>
);

export const IconShare = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="3.5" r="2" />
    <circle cx="4" cy="8" r="2" />
    <circle cx="12" cy="12.5" r="2" />
    <path d="M5.8 7L10.2 4.5M5.8 9L10.2 11.5" />
  </svg>
);

export const IconLock = ({
  locked,
  className = "w-3.5 h-3.5",
}: {
  locked: boolean;
  className?: string;
}) =>
  locked ? (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="7.5" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7.5V5C5.5 3.62 6.62 2.5 8 2.5C9.38 2.5 10.5 3.62 10.5 5V7.5" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8H14M8 2C9.7 3.8 10.5 5.8 10.5 8C10.5 10.2 9.7 12.2 8 14C6.3 12.2 5.5 10.2 5.5 8C5.5 5.8 6.3 3.8 8 2Z" />
    </svg>
  );

export const IconSwap = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 5.5H13L10 2.5M13 10.5H3L6 13.5" />
  </svg>
);

export const IconSliders = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
  >
    <path d="M2.5 4.5H13.5M2.5 8H13.5M2.5 11.5H13.5" />
    <circle cx="5.5" cy="4.5" r="1.5" fill="var(--card)" />
    <circle cx="10.5" cy="8" r="1.5" fill="var(--card)" />
    <circle cx="6.5" cy="11.5" r="1.5" fill="var(--card)" />
  </svg>
);

export const IconArrowRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 8H12.5M9 4.5L12.5 8L9 11.5" />
  </svg>
);

export const IconRefresh = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13.5 3.5V7H10" />
    <path d="M13.1 10C12.3 12.1 10.3 13.5 8 13.5C5 13.5 2.5 11 2.5 8C2.5 5 5 2.5 8 2.5C10.1 2.5 11.9 3.6 12.8 5.3L13.5 7" />
  </svg>
);