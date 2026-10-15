import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface ActiveTooltip {
  text: string;
  subtext?: string;
  shortcut?: string;
  rect: DOMRect;
  side: "top" | "bottom" | "left" | "right";
}

let lastTooltipHideTime = 0;

export function GlobalTooltip() {
  const [active, setActive] = useState<ActiveTooltip | null>(null);
  const timerRef = useRef<number | null>(null);
  const activeElRef = useRef<Element | null>(null);

  useEffect(() => {
    // Only enable on hover-capable pointer devices
    if (!window.matchMedia("(hover: hover)").matches) return;

    const findTooltipTarget = (target: EventTarget | null): HTMLElement | null => {
      let el = target as HTMLElement | null;
      while (el && el !== document.body) {
        if (el.hasAttribute("data-tooltip")) return el;
        el = el.parentElement;
      }
      return null;
    };

    const handlePointerOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const target = findTooltipTarget(e.target);
      if (!target) {
        if (activeElRef.current) {
          clearHoverTimer();
          setActive(null);
          activeElRef.current = null;
          lastTooltipHideTime = Date.now();
        }
        return;
      }

      if (target === activeElRef.current) return;
      activeElRef.current = target;

      const text = target.getAttribute("data-tooltip");
      if (!text) {
        setActive(null);
        return;
      }

      const subtext = target.getAttribute("data-tooltip-sub") || undefined;
      const shortcut = target.getAttribute("data-tooltip-shortcut") || undefined;
      const side = (target.getAttribute("data-tooltip-side") as ActiveTooltip["side"]) || "top";

      clearHoverTimer();

      // Tooltip timing: Delay the first tooltip in a group (~180ms);
      // subsequent peers within 320ms have 0ms delay.
      const timeSinceLast = Date.now() - lastTooltipHideTime;
      const delay = timeSinceLast < 320 ? 0 : 180;

      if (delay === 0) {
        setActive({
          text,
          subtext,
          shortcut,
          rect: target.getBoundingClientRect(),
          side,
        });
      } else {
        timerRef.current = window.setTimeout(() => {
          if (activeElRef.current === target) {
            setActive({
              text,
              subtext,
              shortcut,
              rect: target.getBoundingClientRect(),
              side,
            });
          }
        }, delay);
      }
    };

    const handlePointerOut = (e: PointerEvent) => {
      const target = findTooltipTarget(e.target);
      if (target && target === activeElRef.current) {
        clearHoverTimer();
        setActive(null);
        activeElRef.current = null;
        lastTooltipHideTime = Date.now();
      }
    };

    const clearHoverTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleScrollOrResize = () => {
      clearHoverTimer();
      setActive(null);
      activeElRef.current = null;
    };

    window.addEventListener("pointerover", handlePointerOver, { passive: true });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("scroll", handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      clearHoverTimer();
      window.removeEventListener("pointerover", handlePointerOver);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, []);

  if (!active || !active.text) return null;

  // Calculate coordinates with boundary clamping
  const { rect, side, text, subtext, shortcut } = active;
  let top = 0;
  let left = 0;
  const GAP = 8;

  if (side === "top") {
    top = rect.top - GAP;
    left = rect.left + rect.width / 2;
  } else if (side === "bottom") {
    top = rect.bottom + GAP;
    left = rect.left + rect.width / 2;
  } else if (side === "left") {
    top = rect.top + rect.height / 2;
    left = rect.left - GAP;
  } else if (side === "right") {
    top = rect.top + rect.height / 2;
    left = rect.right + GAP;
  }

  const transform =
    side === "top"
      ? "translate(-50%, -100%)"
      : side === "bottom"
      ? "translate(-50%, 0)"
      : side === "left"
      ? "translate(-100%, -50%)"
      : "translate(0, -50%)";

  return createPortal(
    <div
      role="tooltip"
      aria-hidden="true"
      className="fixed z-[999999] pointer-events-none animate-tooltip-pop select-none"
      style={{
        top: Math.max(8, Math.min(window.innerHeight - 8, top)),
        left: Math.max(16, Math.min(window.innerWidth - 16, left)),
        transform,
      }}
    >
      <div className="bg-popover text-foreground border border-border shadow-[0_6px_20px_rgba(0,0,0,0.5)] px-2.5 py-1.5 rounded-[5px] flex items-center gap-2 max-w-xs text-xs font-medium backdrop-blur-md">
        <span className="leading-snug whitespace-nowrap">{text}</span>
        {shortcut && (
          <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground border border-border">
            {shortcut}
          </kbd>
        )}
        {subtext && (
          <span className="text-[11px] text-muted-foreground">{subtext}</span>
        )}
      </div>
    </div>,
    document.body
  );
}
