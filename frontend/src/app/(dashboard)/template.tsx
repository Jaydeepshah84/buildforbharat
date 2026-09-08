"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Route-change transition for every dashboard page. Next.js re-mounts template.tsx
 * on each navigation, so this fires a smooth enter animation per route.
 *
 * Opacity-only (no transform) on purpose: a transformed ancestor would become the
 * containing block for any `position: fixed` descendant (e.g. the classroom's
 * fullscreen video/overlays), so we keep it transform-free to never break layout.
 */
export default function Template({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
