import { useState, useEffect } from 'react';

export function useTradeGlobalInput() {
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [smartMenuOpen, setSmartMenuOpen] = useState(false);
  const [initialParserText, setInitialParserText] = useState("");

  // Global Drag & Drop Listener
  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("unit")) setIsGlobalDragging(true);
    };
    const handleDragEnd = () => setIsGlobalDragging(false);
    
    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("dragend", handleDragEnd);
    
    return () => {
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("dragend", handleDragEnd);
    };
  }, []);

  // Global Clipboard Paste Listener (Ctrl+V interception)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      // Do not intercept paste if the user is typing in a text field
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;

      const text = e.clipboardData?.getData("text");
      if (text && text.trim().length > 0) {
        window.dispatchEvent(new Event("open-analyzer"));
        setInitialParserText(text);
        setSmartMenuOpen(true);
      }
    };
    
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Global Hotkey Listener for Quick Search
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;

      if (e.key === '/') {
        e.preventDefault();
        window.dispatchEvent(new Event("open-analyzer"));
        // Slight delay to ensure the panel mounts before focusing
        setTimeout(() => window.dispatchEvent(new CustomEvent("focus-trade-search", { detail: "give" })), 50);
      } else if (e.key === '\\') {
        e.preventDefault();
        window.dispatchEvent(new Event("open-analyzer"));
        setTimeout(() => window.dispatchEvent(new CustomEvent("focus-trade-search", { detail: "get" })), 50);
      }
    };

    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  return { 
    isGlobalDragging, 
    smartMenuOpen, 
    setSmartMenuOpen, 
    initialParserText, 
    setInitialParserText 
  };
}