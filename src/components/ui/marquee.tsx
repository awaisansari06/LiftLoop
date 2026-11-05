"use client";

/**
 * Marquee — full-bleed, edge-to-edge scrolling strip (the FORMA-style ticker).
 * Duplicates its items so the loop is seamless; pauses on hover; honors
 * prefers-reduced-motion (falls back to a static, wrapped row).
 */

import React from "react";

import { cn } from "@/lib/utils";

type MarqueeProps = {
  items: React.ReactNode[];
  /** seconds for one full loop; larger = slower */
  speed?: number;
  reverse?: boolean;
  className?: string;
  /** separator between items */
  separator?: React.ReactNode;
};

export function Marquee({
  items,
  speed = 32,
  reverse = false,
  className,
  separator = <span aria-hidden className="mx-6 text-accent">✦</span>,
}: MarqueeProps) {
  const row = (
    <div className="flex shrink-0 items-center" aria-hidden>
      {items.map((it, i) => (
        <span key={i} className="flex items-center whitespace-nowrap">
          {it}
          {separator}
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={cn(
        "group relative flex w-full overflow-hidden",
        "[--marquee-gap:0px]",
        className,
      )}
    >
      <div
        className="flex min-w-full shrink-0 animate-[marquee_var(--dur)_linear_infinite] items-center motion-reduce:animate-none group-hover:[animation-play-state:paused]"
        style={
          {
            "--dur": `${speed}s`,
            animationDirection: reverse ? "reverse" : "normal",
          } as React.CSSProperties
        }
      >
        {row}
        {row}
      </div>
      {/* soft edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[var(--marquee-fade,transparent)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[var(--marquee-fade,transparent)] to-transparent" />
    </div>
  );
}

export default Marquee;
