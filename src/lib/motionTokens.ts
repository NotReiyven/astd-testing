import { useEffect, useState } from "react";

/**
 * Shared motion durations (in milliseconds) used across all feedback primitives.
 * Complies with AGENTS.md:
 * - Show delay: ~150–300ms (180ms)
 * - Minimum visible duration: ~300–500ms (350ms)
 * - Compositor-friendly: only animate transform and opacity
 */
export const MOTION_DURATION_MS = {
  instant: 0,
  fast: 150,
  normal: 220,
  slow: 300,
  showDelay: 180,
  minVisible: 350,
  statusReset: 1800,
  toast: {
    info: 4000,
    success: 4000,
    warning: 5000,
    error: 6000,
    loading: 0, // Persistent until updated or manually dismissed
  },
} as const;

export const MOTION_DURATION_SEC = {
  instant: 0,
  fast: 0.15,
  normal: 0.22,
  slow: 0.3,
} as const;

export const MOTION_EASING = {
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  springPress: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

/**
 * Explicit CSS transitions restricted strictly to compositor-friendly properties
 * (`transform` and `opacity`). Never use `transition: all`.
 */
export const MOTION_TRANSITION = {
  toastTransformOpacity: `transform ${MOTION_DURATION_MS.normal}ms ${MOTION_EASING.easeOut}, opacity ${MOTION_DURATION_MS.normal}ms ${MOTION_EASING.easeOut}`,
  toastReducedMotion: `opacity ${MOTION_DURATION_MS.fast}ms linear`,
  buttonPress: `transform ${MOTION_DURATION_MS.fast}ms ${MOTION_EASING.springPress}, opacity ${MOTION_DURATION_MS.fast}ms ${MOTION_EASING.springPress}`,
  fadeOnly: `opacity ${MOTION_DURATION_MS.fast}ms ${MOTION_EASING.easeOut}`,
} as const;

export const MOTION_SCALE = {
  press: 0.97,
  rest: 1,
} as const;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Hydration-safe hook that tracks the user's `prefers-reduced-motion` OS/browser setting.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}
