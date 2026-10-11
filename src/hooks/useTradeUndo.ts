import { useState, useCallback, useRef } from "react";
import { TradeCard } from "../types";
import { useTradeStore } from "../store/useTradeStore";
import { useToastStore } from "../store/useToastStore";

export function useTradeUndo() {
  const giveItems = useTradeStore((s) => s.giveItems);
  const getItems = useTradeStore((s) => s.getItems);
  const clearAllUnpinned = useTradeStore((s) => s.clearAllUnpinned);
  const overwrite = useTradeStore((s) => s.overwrite);
  const addToast = useToastStore((s) => s.addToast);

  const [undoCache, setUndoCache] = useState<{
    give: TradeCard[];
    get: TradeCard[];
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveUndoState = useCallback(() => {
    setUndoCache({ give: [...giveItems], get: [...getItems] });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoCache(null), 5000);
  }, [giveItems, getItems]);

  const handleGlobalClear = useCallback(() => {
    const previousState = clearAllUnpinned();
    setUndoCache(previousState);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoCache(null);
    }, 5000);

    addToast("Cleared unpinned trade items.", "info", {
      dedupeKey: "trade-cleared-undo",
      action: {
        label: "Undo",
        onClick: () => {
          overwrite(previousState.give, previousState.get);
          setUndoCache(null);
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
          addToast("Restored trade items.", "info");
        },
      },
    });
  }, [clearAllUnpinned, addToast, overwrite]);

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
      addToast("Restored trade items.", "info");
    }
  }, [undoCache, overwrite, addToast]);

  return {
    undoCache,
    confirmClear,
    saveUndoState,
    handleSafeClear,
    handleUndo,
  };
}
