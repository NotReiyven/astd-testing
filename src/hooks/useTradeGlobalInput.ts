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

  return { 
    isGlobalDragging, 
    smartMenuOpen, 
    setSmartMenuOpen, 
    initialParserText, 
    setInitialParserText 
  };
}