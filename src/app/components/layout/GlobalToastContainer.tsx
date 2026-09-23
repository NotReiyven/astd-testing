// ================================================
// FILE: src/app/components/layout/GlobalToastContainer.tsx
// ================================================

import { useState, useRef, useEffect } from 'react';
import { useToastStore, ToastType, Toast } from '../../../store/useToastStore';
import { Check, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { triggerHaptic } from '../../../data/helpers';

const getIcon = (type: ToastType) => {
  switch (type) {
    case 'success': return <Check className="w-4 h-4 text-success" />;
    case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
    default: return <Info className="w-4 h-4 text-info" />;
  }
};

const ToastItem = ({ t, index, total, onRemove }: { t: Toast; index: number; total: number; onRemove: (id: string) => void }) => {
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartRef = useRef<number | null>(null);

  // Stack logic: reverse index so index 0 is the newest (bottom-most)
  const isFront = index === 0;
  const translateY = index * -14;
  const scale = 1 - index * 0.05;
  const opacity = index > 3 ? 0 : 1;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isFront) return;
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isFront || touchStartRef.current === null) return;
    const delta = e.touches[0].clientX - touchStartRef.current;
    if (delta > 0) setDragOffset(delta); // Only swipe right
  };

  const handleTouchEnd = () => {
    if (!isFront) return;
    if (dragOffset > 80) {
      triggerHaptic('light');
      onRemove(t.id);
    } else {
      setDragOffset(0);
    }
    touchStartRef.current = null;
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`absolute bottom-0 right-0 w-full md:w-auto min-w-[280px] max-w-[400px] bg-popover border border-border px-4 py-3 rounded-[6px] shadow-2xl flex items-center gap-3 pointer-events-auto select-none`}
      style={{
        zIndex: 300 - index,
        transform: `translate3d(${dragOffset}px, ${translateY}px, 0) scale(${scale})`,
        opacity: opacity,
        transition: touchStartRef.current ? 'none' : 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div className="shrink-0">
        {getIcon(t.type)}
      </div>
      <span className="text-[13px] font-bold text-foreground flex-1 leading-snug">
        {t.message}
      </span>
      {isFront && (
        <button
          onClick={() => onRemove(t.id)}
          aria-label="Close notification"
          className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[4px] p-1 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export function GlobalToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || toasts.length === 0) return null;

  // Reverse so newest is at the end of the array to map to index 0 visually
  const reversedToasts = [...toasts].reverse();

  return (
    <div 
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-[300] flex flex-col items-end pointer-events-none w-[calc(100vw-48px)] md:w-auto h-[60px]"
    >
      {reversedToasts.map((t, i) => (
        <ToastItem key={t.id} t={t} index={i} total={toasts.length} onRemove={removeToast} />
      ))}
    </div>
  );
}