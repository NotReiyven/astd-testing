import { useState, useCallback, useRef, useEffect } from "react";

export function usePanelResize(
  defaultWidth: number,
  minWidth: number,
  maxWidth: number
) {
  // Initialize with localStorage to remember the user's preferred calculator width
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem("astd_analyzer_width");
      return saved
        ? Math.min(Math.max(parseInt(saved, 10), minWidth), maxWidth)
        : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isResizing.current = true;
      startX.current = "touches" in e ? e.touches[0].clientX : e.clientX;
      startWidth.current = panelWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [panelWidth]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isResizing.current) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;

      // FIXED: Since the panel is on the RIGHT side of the screen,
      // moving the mouse LEFT (negative delta) must INCREASE the width.
      const delta = clientX - startX.current;
      let newWidth = startWidth.current - delta;

      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;

      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        try {
          localStorage.setItem("astd_analyzer_width", panelWidth.toString());
        } catch {}
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleMouseMove, { passive: false });
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [minWidth, maxWidth, panelWidth]);

  return { panelWidth, startResize, panelRef };
}
