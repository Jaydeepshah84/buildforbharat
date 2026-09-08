"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { useInView } from "@/hooks/useInView";

interface AnimatedNumberProps {
  value: number;
  /** Count-up duration in seconds. */
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Count-up number that animates from 0 → value when it scrolls into view.
 * Respects prefers-reduced-motion (shows the final value instantly).
 */
export default function AnimatedNumber({
  value,
  duration = 1.1,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: AnimatedNumberProps) {
  const { ref, hasBeenInView } = useInView<HTMLSpanElement>({ once: true, threshold: 0.3 });
  const [display, setDisplay] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!hasBeenInView) return;
    if (reduce || !Number.isFinite(value)) {
      setDisplay(value || 0);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [hasBeenInView, value, duration, reduce]);

  const shown = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return (
    <span ref={ref} className={className}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}
