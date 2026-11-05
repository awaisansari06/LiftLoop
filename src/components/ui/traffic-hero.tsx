"use client";

/**
 * TrafficHero — the landing hero's visual metaphor: everyone stuck waiting in
 * road traffic / the crowd, and LiftLoop as the pooled way out.
 *
 * (Intended to be Skiper 39 from https://skiper-ui.com/registry/skiper39.json,
 * but that host is blocked by this environment's network egress policy, so this
 * is an original, on-brand build of the same metaphor — re-skinned to
 * design-system/MASTER.md, prefers-reduced-motion safe, responsive.)
 *
 * Composition: a content column (eyebrow / title / subtitle / actions passed in)
 * beside an animated traffic scene — congested single-occupant lanes crawl in
 * stop-and-go, while one gold LiftLoop car glides through carrying several
 * riders.
 */

import { motion, useReducedMotion } from "framer-motion";
import React from "react";

import { cn } from "@/lib/utils";

/* A small stylized car glyph. */
function Car({ className, riders = 0 }: { className?: string; riders?: number }) {
  return (
    <svg viewBox="0 0 64 34" className={className} aria-hidden>
      <rect x="1" y="12" width="62" height="16" rx="6" fill="currentColor" />
      <path
        d="M12 12l6-8h28l6 8"
        fill="currentColor"
        opacity="0.9"
        stroke="currentColor"
        strokeWidth="1"
      />
      <rect x="18" y="5" width="12" height="7" rx="2" fill="#ffffff" opacity="0.35" />
      <rect x="34" y="5" width="12" height="7" rx="2" fill="#ffffff" opacity="0.35" />
      <circle cx="18" cy="29" r="4" fill="#102D25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="46" cy="29" r="4" fill="#102D25" stroke="currentColor" strokeWidth="1.5" />
      {Array.from({ length: riders }).map((_, i) => (
        <circle key={i} cx={20 + i * 9} cy={19} r={2.6} fill="#102D25" opacity="0.55" />
      ))}
    </svg>
  );
}

function TrafficScene() {
  const reduce = useReducedMotion();

  // Stop-and-go: a repeating inch-forward with long stalls.
  const jam = (delay: number) =>
    reduce
      ? {}
      : {
          animate: { x: [0, 10, 10, 0] },
          transition: {
            duration: 4,
            times: [0, 0.2, 0.85, 1],
            repeat: Infinity,
            ease: "easeInOut" as const,
            delay,
          },
        };

  const glide = reduce
    ? {}
    : {
        animate: { x: ["-12%", "112%"] },
        transition: { duration: 6.5, repeat: Infinity, ease: "linear" as const },
      };

  const congestedLane = (y: string, count: number, base: number) => (
    <div
      className="absolute left-0 right-0 flex items-center gap-3 px-6"
      style={{ top: y }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} className="text-muted-foreground/70" {...jam(base + i * 0.18)}>
          <Car className="h-7 w-14 md:h-8 md:w-16" />
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-navy to-navy-light shadow-lg sm:aspect-[5/4]">
      {/* lane dividers */}
      <div className="pointer-events-none absolute inset-0">
        {[28, 52, 76].map((t) => (
          <div
            key={t}
            className="absolute left-0 right-0 border-t border-dashed border-white/15"
            style={{ top: `${t}%` }}
          />
        ))}
      </div>

      {/* congested single-occupant lanes */}
      {congestedLane("14%", 6, 0)}
      {congestedLane("38%", 6, 0.6)}

      {/* clear priority lane — the LiftLoop pooled car glides through */}
      <div className="absolute left-0 right-0" style={{ top: "64%" }}>
        <motion.div className="w-fit text-accent drop-shadow-[0_4px_10px_rgba(200,149,108,0.5)]" {...glide}>
          <Car className="h-9 w-20 md:h-11 md:w-24" riders={3} />
        </motion.div>
      </div>

      {/* label chip */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur">
        <span className="size-2 rounded-full bg-accent" />
        <span className="font-mono text-[11px] uppercase tracking-widest text-white/80">
          1 car · 4 riders
        </span>
      </div>
      <div className="absolute right-4 top-4 rounded-full bg-black/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/60 backdrop-blur">
        the daily wait
      </div>
    </div>
  );
}

export function TrafficHero({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const rise = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 0.94] as const },
      };

  return (
    <section
      className={cn(
        "relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:py-24",
        className,
      )}
    >
      <motion.div className="order-2 lg:order-1" {...rise}>
        {eyebrow && (
          <p className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[clamp(2.5rem,6.5vw,4.75rem)] font-extrabold leading-[1.04] tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
        {actions && <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>}
      </motion.div>

      <motion.div
        className="order-1 lg:order-2"
        initial={reduce ? undefined : { opacity: 0, scale: 0.96 }}
        animate={reduce ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 0.94] }}
      >
        <TrafficScene />
      </motion.div>
    </section>
  );
}

export default TrafficHero;
