import { useState, useEffect, useRef, ReactNode, startTransition } from "react";

export function LazyRender({
  children,
  placeholderHeight = "600px",
  forceRender = false,
}: {
  children: ReactNode;
  placeholderHeight?: string;
  forceRender?: boolean;
}) {
  const [isRendered, setIsRendered] = useState(false);
  const [actualHeight, setActualHeight] = useState<string | number>(
    placeholderHeight
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Instantly force-render if targeted by sidebar navigation
    if (forceRender) {
      startTransition(() => setIsRendered(true));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startTransition(() => setIsRendered(true));
        } else {
          // Capture exact height before unmounting to prevent scrollbar jumping
          if (ref.current && ref.current.getBoundingClientRect().height > 0) {
            setActualHeight(ref.current.getBoundingClientRect().height);
          }
          // Unmount the heavy DOM nodes when 1.5 screens away
          startTransition(() => setIsRendered(false));
        }
      },
      { rootMargin: "1500px 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [forceRender]);

  return (
    <div ref={ref} style={{ minHeight: isRendered ? "auto" : actualHeight }}>
      {isRendered ? children : null}
    </div>
  );
}
