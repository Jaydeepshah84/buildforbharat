"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

interface LazyRenderProps {
  /** Static children (mounted once near viewport, kept mounted by default). */
  children?: ReactNode;
  /**
   * Render-prop form: receives `active` (currently in view). Use this for heavy
   * visuals (webcam, canvas, charts) that should PAUSE when scrolled away instead
   * of unmounting — keep them mounted but stop their work when `active` is false.
   */
  render?: (active: boolean) => ReactNode;
  /** Preload distance — mount this much before it scrolls into view. */
  rootMargin?: string;
  /** Once mounted, keep it mounted (default). Set false to unmount when far off-screen. */
  keepMounted?: boolean;
  /** Placeholder min-height (px or CSS) to avoid layout shift before mount. */
  minHeight?: number | string;
  /** Element shown while not yet mounted (e.g. a shimmer skeleton). */
  placeholder?: ReactNode;
  className?: string;
}

/**
 * Progressive / lazy rendering gate. Renders its children only once they are within
 * `rootMargin` of the viewport (preloading nearby content), and can pause or unmount
 * heavy visuals when they scroll far away. Prevents rendering everything at once.
 */
export default function LazyRender({
  children,
  render,
  rootMargin = "500px",
  keepMounted = true,
  minHeight = 0,
  placeholder = null,
  className,
}: LazyRenderProps) {
  const { ref, inView, hasBeenInView } = useInView<HTMLDivElement>({ rootMargin });

  // Render-prop form: mount once near view, then toggle `active` with visibility.
  if (render) {
    const mounted = keepMounted ? hasBeenInView : inView || hasBeenInView;
    return (
      <div ref={ref} className={className} style={!mounted ? { minHeight } : undefined}>
        {mounted ? render(inView) : placeholder}
      </div>
    );
  }

  const show = keepMounted ? hasBeenInView : inView;
  return (
    <div ref={ref} className={className} style={!show ? { minHeight } : undefined}>
      {show ? children : placeholder}
    </div>
  );
}
