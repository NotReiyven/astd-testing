import { useState, useEffect } from "react";

export function useShowDelay(delayMs: number = 200) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return show;
}
