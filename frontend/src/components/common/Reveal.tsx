"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Entrance delay in seconds. */
  delay?: number;
  /** Travel distance in px. */
  distance?: number;
  direction?: Direction;
  /** Trigger only once (default) or every time it enters the viewport. */
  once?: boolean;
  /** Fraction visible before triggering. */
  amount?: number;
  duration?: number;
  /** Slight scale-in for extra depth. */
  scale?: boolean;
}

function offset(direction: Direction, distance: number) {
  switch (direction) {
    case "up": return { y: distance };
    case "down": return { y: -distance };
    case "left": return { x: distance };
    case "right": return { x: -distance };
    default: return {};
  }
}

/**
 * Scroll-triggered entrance animation. Fades + slides (+ optional scale) in as the
 * element enters the viewport, with a premium spring-like easing. Respects
 * prefers-reduced-motion (renders statically). Uses framer-motion's whileInView so
 * off-screen content isn't animated until needed.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  distance = 18,
  direction = "up",
  once = true,
  amount = 0.2,
  duration = 0.55,
  scale = false,
}: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  const from = { opacity: 0, ...(scale ? { scale: 0.96 } : {}), ...offset(direction, distance) };
  const to = { opacity: 1, x: 0, y: 0, ...(scale ? { scale: 1 } : {}) };

  return (
    <motion.div
      className={className}
      initial={from}
      whileInView={to}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered container — its <Reveal.Item> / motion children animate in sequence.
 * Use for lists/grids: wrap the list in <RevealStagger> and each item in a motion.div
 * with the itemVariants below (or just wrap items in <Reveal delay={i*0.05}>).
 */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
