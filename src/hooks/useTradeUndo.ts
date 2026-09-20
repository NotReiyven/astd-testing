import { useState, useCallback, useRef } from 'react';
import { TradeCard } from '../types';
import { useTradeStore } from '../store/useTradeStore';

export function useTradeUndo() {
  const { giveItems, getItems, clearAllUnpinned, overwrite } = useTradeStore();
  
  const [undoCache, setUndoCache] = useState<{give: TradeCard[], get: TradeCard[]} | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveUndoState = useCallback(() => {
    setUndoCache({ give: [...giveItems], get: [...getItems] });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoCache(null), 4000);
  }, [giveItems, getItems]);

  const handleGlobalClear = useCallback(() => {
    const previousState = clearAllUnpinned();
    setUndoCache(previousState);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoCache(null);
    }, 4000);
  }, [clearAllUnpinned]);

  const handleSafeClear = () => {
    if (giveItems.length === 0 && getItems.length === 0) return;
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    } else {
      handleGlobalClear();
      setConfirmClear(false);
    }
  };

  const handleUndo = useCallback(() => {
    if (undoCache) {
      overwrite(undoCache.give, undoCache.get);
      setUndoCache(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    }
  }, [undoCache, overwrite]);

  return { undoCache, confirmClear, saveUndoState, handleSafeClear, handleUndo };
}