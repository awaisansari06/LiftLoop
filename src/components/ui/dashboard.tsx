"use client";

/** Shared dashboard primitives (tone tiles, count-up, sparkbars, score ring). */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { BadgeTone } from "./primitives";

export const TONE_TILE: Record<BadgeTone, string> = {
  neutral: "bg-muted text-foreground",
  accent: "bg-accent-soft text-accent-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function toneTile(tone: BadgeTone, extra?: string) {
  return cn("grid place-items-center rounded-2xl", TONE_TILE[tone], extra);
}

export function CountUp({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [n, setN] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      setN(value);
      return;
    }
    let frame: number;
    const dur = 700;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setN(Math.round(t * value));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);
  return (
    <>
      {prefix}
      {n}
    </>
  );
}

export function ScoreRing({ value, size = 96 }: { value: number; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} className="-rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--rm-muted)" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--rm-accent)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
      />
      <text
        x="50"
        y="50"
        transform="rotate(90 50 50)"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-mono"
        style={{ fontSize: 22, fontWeight: 700 }}
      >
        {value}
      </text>
    </svg>
  );
}

/**
 * Interactive, cursor-reactive bar chart. Bars grow in on mount, the bar under
 * the cursor lifts + glows and shows a value tooltip, and an optional label
 * appears under each column. Token-driven, responsive, reduced-motion aware.
 */
export function Sparkbars({
  values,
  labels,
  format = (n) => String(Math.round(n)),
  className,
}: {
  values: number[];
  labels?: string[];
  format?: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...values, 1);

  return (
    <div
      className={cn("relative flex h-32 items-end gap-1.5 sm:gap-2", labels && "pb-5", className)}
      onMouseLeave={() => setActive(null)}
    >
      {values.map((v, i) => {
        const pct = Math.max((v / max) * 100, 3);
        const isActive = active === i;
        return (
          <div
            key={i}
            className="group relative flex h-full flex-1 cursor-pointer items-end"
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            tabIndex={0}
            role="img"
            aria-label={`${format(v)}${labels?.[i] ? ` · ${labels[i]}` : ""}`}
          >
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.9 }}
                  transition={{ duration: 0.18 }}
                  className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-navy px-2.5 py-1 text-xs font-bold text-white shadow-lg"
                >
                  {format(v)}
                  {labels?.[i] && <span className="ml-1 font-normal text-white/60">{labels[i]}</span>}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              initial={reduce ? false : { height: 0 }}
              animate={{ height: `${pct}%` }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "w-full origin-bottom rounded-t-lg transition-[transform,box-shadow,background-color] duration-200",
                isActive
                  ? "scale-y-[1.03] bg-gradient-to-t from-accent-strong to-accent shadow-[0_0_20px_rgba(200,149,108,0.45)]"
                  : "bg-gradient-to-t from-accent/25 to-accent/70",
              )}
            />
            {labels?.[i] && (
              <span
                className={cn(
                  "absolute -bottom-5 left-1/2 -translate-x-1/2 truncate text-[10px] font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {labels[i]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
