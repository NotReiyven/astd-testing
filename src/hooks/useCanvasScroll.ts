import { useEffect, useRef, useState } from "react";

export function useCanvasScroll(isMobile: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const scrollTopBtnRef = useRef<HTMLButtonElement>(null);

  const headerVisibleRef = useRef(true);
  const scrollTopVisibleRef = useRef(false);
  const lastScrollY = useRef(0);
  const scrollDeltaRef = useRef(0);
  const lastToggleTimeRef = useRef(0);

  // React state so consumers can react (e.g. collapse paddingTop when hidden)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleNativeScroll = () => {
      const currentScroll = el.scrollTop;

      // Top Button Logic
      if (currentScroll > 400 && !scrollTopVisibleRef.current) {
        scrollTopVisibleRef.current = true;
        if (scrollTopBtnRef.current) {
          scrollTopBtnRef.current.classList.remove(
            "opacity-0",
            "translate-y-8",
            "pointer-events-none"
          );
          scrollTopBtnRef.current.classList.add("opacity-100", "translate-y-0");
        }
      } else if (currentScroll <= 400 && scrollTopVisibleRef.current) {
        scrollTopVisibleRef.current = false;
        if (scrollTopBtnRef.current) {
          scrollTopBtnRef.current.classList.remove(
            "opacity-100",
            "translate-y-0"
          );
          scrollTopBtnRef.current.classList.add(
            "opacity-0",
            "translate-y-8",
            "pointer-events-none"
          );
        }
      }

      // Mobile Header Hide/Show Logic
      if (isMobile) {
        const now = Date.now();
        if (now - lastToggleTimeRef.current < 400) {
          lastScrollY.current = currentScroll;
          return;
        }

        const delta = currentScroll - lastScrollY.current;
        lastScrollY.current = currentScroll;

        if (currentScroll < 40) {
          if (!headerVisibleRef.current) {
            headerVisibleRef.current = true;
            setIsHeaderVisible(true);
            if (headerRef.current) {
              headerRef.current.classList.remove("-translate-y-full");
              headerRef.current.classList.add("translate-y-0");
            }
            lastToggleTimeRef.current = now;
          }
          scrollDeltaRef.current = 0;
          return;
        }

        if (
          (delta > 0 && scrollDeltaRef.current < 0) ||
          (delta < 0 && scrollDeltaRef.current > 0)
        ) {
          scrollDeltaRef.current = 0;
        }
        scrollDeltaRef.current += delta;

        if (scrollDeltaRef.current > 40 && headerVisibleRef.current) {
          headerVisibleRef.current = false;
          setIsHeaderVisible(false);
          if (headerRef.current) {
            headerRef.current.classList.remove("translate-y-0");
            headerRef.current.classList.add("-translate-y-full");
          }
          lastToggleTimeRef.current = now;
          scrollDeltaRef.current = 0;
        } else if (scrollDeltaRef.current < -40 && !headerVisibleRef.current) {
          headerVisibleRef.current = true;
          setIsHeaderVisible(true);
          if (headerRef.current) {
            headerRef.current.classList.remove("-translate-y-full");
            headerRef.current.classList.add("translate-y-0");
          }
          lastToggleTimeRef.current = now;
          scrollDeltaRef.current = 0;
        }
      }
    };

    el.addEventListener("scroll", handleNativeScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleNativeScroll);
  }, [isMobile]);

  const scrollToTop = () => {
    lastToggleTimeRef.current = Date.now();
    headerVisibleRef.current = true;
    setIsHeaderVisible(true);
    if (headerRef.current) {
      headerRef.current.classList.remove("-translate-y-full");
      headerRef.current.classList.add("translate-y-0");
    }
    lastScrollY.current = 0;
    scrollDeltaRef.current = 0;
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return {
    scrollRef,
    headerRef,
    scrollTopBtnRef,
    scrollToTop,
    headerVisibleRef,
    isHeaderVisible,
    skipNextResetRef: useRef(false),
  };
}