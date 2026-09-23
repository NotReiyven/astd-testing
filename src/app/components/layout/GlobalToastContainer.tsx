// ================================================
// FILE: src/app/components/layout/GlobalToastContainer.tsx
// ================================================
import { useToastStore, ToastType } from '../../../store/useToastStore';
import { Check, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const getIcon = (type: ToastType) => {
  switch(type) {
    case 'success': return <Check className="w-4 h-4 text-[#23a559]" />;
    case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-[#FAA61A]" />;
    default: return <Info className="w-4 h-4 text-primary" />;
  }
};

export function GlobalToastContainer() {
  const { toasts, removeToast } = useToastStore();
  
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[1000000] flex flex-col gap-2.5 pointer-events-none items-end">
      {toasts.map(t => (
        <div 
          key={t.id} 
          className="bg-popover border border-border px-4 py-3 rounded-[6px] shadow-2xl flex items-center gap-3 animate-slide-up pointer-events-auto max-w-[400px]"
        >
          <div className="shrink-0">
            {getIcon(t.type)}
          </div>
          <span className="text-[13px] font-bold text-foreground flex-1 leading-snug">
            {t.message}
          </span>
          <button 
            onClick={() => removeToast(t.id)} 
            className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none p-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}