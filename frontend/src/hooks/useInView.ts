"use client";

import { useEffect, useRef, useState } from "react";

interface Options {
  /** How far outside the viewport to consider "in view" — e.g. "500px" preloads before it scrolls in. */
  rootMargin?: string;
  /** Fraction of the element that must be visible to trigger (0–1). */
  threshold?: number | number[];
  /** Stop observing after the first time it enters view (for one-shot reveals). */
  once?: boolean;
}

/**
 * Lightweight IntersectionObserver hook.
 * Returns a ref to attach, plus `inView` (currently visible) and `hasBeenInView`
 * (was ever visible — useful for lazy mounting that shouldn't unmount on scroll-out).
 * Degrades gracefully to visible when IntersectionObserver is unavailable (SSR/old browsers).
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(options: Options = {}) {
  const { rootMargin = "0px", threshold = 0, once = false } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);

  const thresholdKey = Array.isArray(threshold) ? threshold.join(",") : String(threshold);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      setHasBeenInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const isIn = entry.isIntersecting;
        setInView(isIn);
        if (isIn) {
          setHasBeenInView(true);
          if (once) observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootMargin, thresholdKey, once]);

  return { ref, inView, hasBeenInView };
}
