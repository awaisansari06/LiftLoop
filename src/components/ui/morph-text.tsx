"use client";

/**
 * MorphText — cycles through words with a gooey blur-morph (SVG threshold filter).
 * Adapted from the provided MorphText. Self-contained (its own keyframes).
 */

import { useId } from "react";

import { cn } from "@/lib/utils";

export function MorphText({
  words = ["students", "staff", "faculty"],
  interval = 2600,
  className,
  textClassName,
}: {
  words?: string[];
  interval?: number;
  className?: string;
  textClassName?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const filterId = `morph-${uid}`;
  const total = (interval / 1000) * words.length;
  const each = interval / 1000;

  return (
    <span className={cn("relative inline-flex", className)}>
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
        <defs>
          <filter id={filterId}>
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -8" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      <span
        className={cn("relative inline-block text-accent", textClassName)}
        style={{ filter: `url(#${filterId})`, minWidth: "8ch" }}
      >
        {words.map((w, i) => (
          <span
            key={w + i}
            className="morph-word absolute left-0 top-0 whitespace-nowrap"
            style={{
              opacity: 0,
              animation: `morph-word ${total}s ease-in-out ${i * each}s infinite`,
            }}
          >
            {w}
          </span>
        ))}
        {/* reserve height */}
        <span className="invisible" aria-hidden>{words[0]}</span>
      </span>
      <style>{`
        @keyframes morph-word {
          0% { opacity: 0; filter: blur(14px); transform: scale(0.82); }
          6% { opacity: 1; filter: blur(0); transform: scale(1); }
          ${Math.round((each / total) * 100)}% { opacity: 1; filter: blur(0); transform: scale(1); }
          ${Math.round((each / total) * 100) + 6}% { opacity: 0; filter: blur(14px); transform: scale(1.14); }
          100% { opacity: 0; filter: blur(14px); }
        }
      `}</style>
    </span>
  );
}

export default MorphText;
