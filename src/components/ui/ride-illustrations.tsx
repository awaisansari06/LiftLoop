"use client";

/**
 * Ride illustrations — original flat SVG vehicles + a reusable colored poster.
 * One cohesive illustrated language (no stock photos), used across the hero,
 * the ride-type carousel and the parallax gallery so the site reads as designed
 * rather than assembled. All shapes are original vector art on brand tokens.
 */

import React from "react";

import { cn } from "@/lib/utils";

type GlyphProps = { className?: string };

/* ── Vehicles ──────────────────────────────────────────────────────────
   Drawn on a 120×80 viewBox, feet on the ground line at y≈66.
   `currentColor` = body; wheels/windows use fixed ink so they read on any tone. */

export function CarGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" aria-hidden>
      <path d="M14 52c-4 0-6-3-5-7l3-11c1-3 4-5 7-5h14l12-9c3-2 6-3 10-3h20c4 0 7 2 9 5l7 12h9c5 0 9 3 10 8l1 8c0 2-2 4-4 4H14Z" fill="currentColor"/>
      <path d="M44 20h18c3 0 5 1 7 3l6 9H44V20Z" fill="#102D25" opacity="0.28"/>
      <path d="M33 22h8v10H24l4-7c1-2 3-3 5-3Z" fill="#102D25" opacity="0.28"/>
      <circle cx="34" cy="58" r="12" fill="#101826"/>
      <circle cx="34" cy="58" r="5" fill="#fff" opacity="0.85"/>
      <circle cx="90" cy="58" r="12" fill="#101826"/>
      <circle cx="90" cy="58" r="5" fill="#fff" opacity="0.85"/>
      <rect x="104" y="40" width="8" height="6" rx="2" fill="#F4C56B"/>
    </svg>
  );
}

export function SuvGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" aria-hidden>
      <path d="M12 54c-3 0-5-2-5-5V37c0-3 2-6 6-7l14-3 10-9c2-2 5-3 8-3h30c3 0 6 1 8 4l9 11 8 2c5 1 8 5 8 10v8c0 3-2 4-4 4H12Z" fill="currentColor"/>
      <path d="M46 15h20c2 0 4 1 6 3l7 9H46V15Z" fill="#102D25" opacity="0.28"/>
      <path d="M32 18h10v12H22l3-9c1-2 4-3 7-3Z" fill="#102D25" opacity="0.28"/>
      <rect x="20" y="34" width="82" height="4" rx="2" fill="#102D25" opacity="0.18"/>
      <circle cx="36" cy="60" r="12.5" fill="#101826"/>
      <circle cx="36" cy="60" r="5" fill="#fff" opacity="0.85"/>
      <circle cx="92" cy="60" r="12.5" fill="#101826"/>
      <circle cx="92" cy="60" r="5" fill="#fff" opacity="0.85"/>
    </svg>
  );
}

export function ScooterGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" aria-hidden>
      {/* deck + body */}
      <path d="M30 60h34l6-26c1-4 4-6 8-6h6c3 0 5 2 5 5s-2 5-5 5h-4l-6 22 6 0" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M83 34c6 0 11 4 13 10l3 12" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
      <circle cx="30" cy="62" r="13" fill="#101826"/>
      <circle cx="30" cy="62" r="5" fill="#fff" opacity="0.85"/>
      <circle cx="96" cy="62" r="13" fill="#101826"/>
      <circle cx="96" cy="62" r="5" fill="#fff" opacity="0.85"/>
      <rect x="70" y="30" width="16" height="7" rx="3.5" fill="currentColor"/>
    </svg>
  );
}

export function BikeGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" aria-hidden>
      <circle cx="28" cy="56" r="15" stroke="#101826" strokeWidth="5"/>
      <circle cx="92" cy="56" r="15" stroke="#101826" strokeWidth="5"/>
      <path d="M28 56l20-26h26l14 26" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M48 30l-8 26M74 30c6 0 10 4 12 10" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
      <rect x="40" y="24" width="20" height="6" rx="3" fill="currentColor"/>
      <path d="M74 24h12" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
    </svg>
  );
}

export const RIDE_GLYPHS = {
  car: CarGlyph,
  suv: SuvGlyph,
  scooter: ScooterGlyph,
  bike: BikeGlyph,
} as const;

export type RideKind = keyof typeof RIDE_GLYPHS;

/* ── Colored poster ────────────────────────────────────────────────────
   A full-height panel: brand-tinted ground, big vehicle, label + caption.
   Distinct tone per item (no monotone-blue cards). */

export type PosterTone = "navy" | "clay" | "sage" | "plum" | "sky" | "gold";

const TONE: Record<PosterTone, { bg: string; ink: string; sub: string; vehicle: string }> = {
  navy: { bg: "bg-[#173F35]", ink: "text-white", sub: "text-white/60", vehicle: "text-white/90" },
  clay: { bg: "bg-[#B8E568]", ink: "text-[#2A1A0E]", sub: "text-[#2A1A0E]/60", vehicle: "text-[#3A2412]" },
  sage: { bg: "bg-[#3E6E5A]", ink: "text-white", sub: "text-white/65", vehicle: "text-white/90" },
  plum: { bg: "bg-[#5B4B6E]", ink: "text-white", sub: "text-white/65", vehicle: "text-white/90" },
  sky: { bg: "bg-[#285D4B]", ink: "text-white", sub: "text-white/65", vehicle: "text-white/90" },
  gold: { bg: "bg-[#E9C46A]", ink: "text-[#2A1A0E]", sub: "text-[#2A1A0E]/60", vehicle: "text-[#3A2412]" },
};

export function RidePoster({
  tone = "navy",
  kind = "car",
  eyebrow,
  title,
  caption,
  className,
}: {
  tone?: PosterTone;
  kind?: RideKind;
  eyebrow?: string;
  title: string;
  caption?: string;
  className?: string;
}) {
  const t = TONE[tone];
  const Glyph = RIDE_GLYPHS[kind];
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[1.75rem] p-6",
        t.bg,
        className,
      )}
    >
      {/* soft ground arc */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-black/10" style={{ clipPath: "ellipse(120% 100% at 50% 130%)" }} />
      <div className="relative z-10">
        {eyebrow && (
          <p className={cn("font-sans text-[11px] font-bold uppercase tracking-[0.18em]", t.sub)}>{eyebrow}</p>
        )}
        <h3 className={cn("mt-1 font-display text-2xl font-extrabold leading-tight tracking-tight", t.ink)}>
          {title}
        </h3>
      </div>
      <Glyph className={cn("relative z-10 mx-auto my-2 w-3/4 max-w-[240px]", t.vehicle)} />
      {caption && (
        <p className={cn("relative z-10 text-sm font-medium leading-snug", t.sub)}>{caption}</p>
      )}
    </div>
  );
}

export default RidePoster;
