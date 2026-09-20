import { useRef, useCallback } from 'react';

export function useMobileSwipe(isRosterOpen: boolean, setIsRosterOpen: (v: boolean) => void) {
  const touchStartPos = useRef<{x: number, y: number} | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;

    const edgeWidth = 40;
    const isLeftEdge = x <= edgeWidth;
    const isSafeYZone = y > window.innerHeight * 0.2 && y < window.innerHeight * 0.8;

    if ((isLeftEdge && isSafeYZone) || isRosterOpen) {
      touchStartPos.current = { x, y };
    } else {
      touchStartPos.current = null;
    }
  }, [isRosterOpen]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const dx = e.changedTouches[0].clientX - touchStartPos.current.x;
    const dy = e.changedTouches[0].clientY - touchStartPos.current.y;

    if (Math.abs(dy) > Math.abs(dx) * 0.8) {
      touchStartPos.current = null;
      return;
    }

    if (dx > 60 && !isRosterOpen && window.innerWidth < 768) {
      setIsRosterOpen(true);
    } else if (dx < -60 && isRosterOpen) {
      setIsRosterOpen(false);
    }
    touchStartPos.current = null;
  }, [isRosterOpen, setIsRosterOpen]);

  return { handleTouchStart, handleTouchEnd };
}