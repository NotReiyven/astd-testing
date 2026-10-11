import { useState, useEffect, useRef } from "react";
import { MOTION_DURATION_MS } from "../lib/motionTokens";

export interface ShowDelayOptions {
  delayMs?: number;
  minVisibleMs?: number;
}

/**
 * Delays showing a loading indicator/skeleton by `delayMs` (~180ms) to avoid flashing on
 * fast responses, and once shown, keeps it visible for at least `minVisibleMs` (~350ms)
 * to prevent layout flicker (per AGENTS.md).
 *
 * Supports two signatures:
 * 1. `useShowDelay(isLoading: boolean, options?: ShowDelayOptions)` (preferred)
 * 2. `useShowDelay(delayMs?: number)` (legacy mount-only delay)
 */
export function useShowDelay(
  activeOrDelayMs: boolean | number = MOTION_DURATION_MS.showDelay,
  options?: ShowDelayOptions
): boolean {
  const isLegacyNumberMode = typeof activeOrDelayMs === "number";
  const isActive = isLegacyNumberMode ? true : activeOrDelayMs;
  const delayMs = isLegacyNumberMode
    ? activeOrDelayMs
    : (options?.delayMs ?? MOTION_DURATION_MS.showDelay);
  const minVisibleMs = options?.minVisibleMs ?? MOTION_DURATION_MS.minVisible;

  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (isActive) {
      if (!visible) {
        timer = setTimeout(() => {
          shownAtRef.current = Date.now();
          setVisible(true);
        }, delayMs);
      }
    } else if (visible) {
      const elapsed =
        shownAtRef.current !== null ? Date.now() - shownAtRef.current : minVisibleMs;
      const remaining = Math.max(0, minVisibleMs - elapsed);

      if (remaining === 0) {
        shownAtRef.current = null;
        setVisible(false);
      } else {
        timer = setTimeout(() => {
          shownAtRef.current = null;
          setVisible(false);
        }, remaining);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isActive, visible, delayMs, minVisibleMs]);

  return visible;
}

