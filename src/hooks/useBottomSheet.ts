// ================================================
// FILE: src/hooks/useBottomSheet.ts
// ================================================

import { useRef, useState } from 'react';

export function useBottomSheet(isOpen: boolean, onClose: () => void, isMobile: boolean) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const lastYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const [backdropOpacity, setBackdropOpacity] = useState(1);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || !isOpen) return;
    touchStartYRef.current = e.touches[0].clientY;
    lastYRef.current = e.touches[0].clientY;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isOpen || touchStartYRef.current === null) return;
    
    const currentY = e.touches[0].clientY;
    const dy = Math.max(0, currentY - touchStartYRef.current); // Prevent dragging up past origin

    const currentTime = Date.now();
    const dt = currentTime - lastTimeRef.current;
    if (dt > 0) velocityRef.current = (currentY - lastYRef.current) / dt;
    
    lastYRef.current = currentY;
    lastTimeRef.current = currentTime;

    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
    
    // Dynamic fade calculation based on screen height
    const fadeRatio = Math.max(0, 1 - dy / (window.innerHeight * 0.4));
    setBackdropOpacity(fadeRatio);
  };

  const onTouchEnd = () => {
    if (!isMobile || !isOpen || touchStartYRef.current === null) return;
    
    const dy = Math.max(0, lastYRef.current - touchStartYRef.current);

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      
      // If swiped down > 25% of screen OR swiped fast enough, close it
      if (dy > window.innerHeight * 0.25 || velocityRef.current > 0.4) {
        onClose();
        sheetRef.current.style.transform = 'translateY(100%)';
      } else {
        // Snap back to top
        sheetRef.current.style.transform = 'translateY(0px)';
      }
    }
    
    touchStartYRef.current = null;
    
    // Reset backdrop opacity after animation finishes
    setTimeout(() => setBackdropOpacity(1), 300);
  };

  return { sheetRef, onTouchStart, onTouchMove, onTouchEnd, backdropOpacity };
}