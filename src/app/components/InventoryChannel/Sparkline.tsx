import React from "react";

export const Sparkline = () => (
  <svg className="absolute bottom-0 left-0 w-full h-[65%] opacity-[0.15] pointer-events-none z-0" preserveAspectRatio="none" viewBox="0 0 100 100">
    <path d="M0,100 C15,80 25,95 40,65 C60,25 80,45 100,10 L100,100 Z" fill="url(#sparkGradient)" />
    <path d="M0,100 C15,80 25,95 40,65 C60,25 80,45 100,10" fill="none" stroke="var(--primary)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    <defs>
      <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--primary)" stopOpacity="1" />
        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);