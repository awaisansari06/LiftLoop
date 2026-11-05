"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * SmoothScroll — the single Lenis instance for scroll-linked motion.
 *
 * Wrap a *long, marketing* route (Landing) in this — never the whole app, or it
 * fights Leaflet scroll-zoom, chat scroll, and modal scroll. ScrollReveal and any
 * scroll-linked component rely on this ambient instance; do not nest another
 * <ReactLenis root>.
 *
 * Honors prefers-reduced-motion: when set, we render children with NO Lenis so
 * the browser's native (instant) scroll is used and scroll-linked transforms
 * resolve to their static end state. (design-system/MASTER.md §6)
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.1,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
      }}
    >
      {children}
    </ReactLenis>
  );
}

export default SmoothScroll;
