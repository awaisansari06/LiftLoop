"use client";

/**
 * PopButton — a tactile 3D "push" button (adapted from the provided PopButton),
 * re-skinned to the LiftLoop palette. Presses down on hover/active with a
 * stacked shadow. This is the canonical button animation across the site.
 *
 * variants:
 *   primary   → navy face, clay/gold stacked shadow (main CTA)
 *   secondary → card face, navy text, navy stacked shadow (paired action)
 *   accent    → clay/gold face (used inside dark sections)
 * Works as <button> or as a link (pass `href`).
 */

import React from "react";

import { cn } from "@/lib/utils";

export type PopVariant = "primary" | "secondary" | "accent";
export type PopSize = "sm" | "md" | "lg";

type PopButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  download?: boolean;
  variant?: PopVariant;
  size?: PopSize;
};

const SIZES: Record<PopSize, string> = {
  sm: "px-4 py-2 text-xs rounded-xl gap-1.5",
  md: "px-6 py-3 text-sm rounded-2xl gap-2",
  lg: "px-8 py-4 text-base rounded-2xl gap-2.5",
};

/* stacked-shadow "depth" per variant: [rest, hover, active] */
const VARIANTS: Record<PopVariant, string> = {
  primary: cn(
    "bg-navy border-2 border-navy text-white",
    "shadow-[0_9px_0_-2px_#C8956C,0_9px_0_0_#8A5A2B]",
    "hover:-translate-y-0.5 hover:bg-navy-light hover:shadow-[0_11px_0_-2px_#C8956C,0_11px_0_0_#8A5A2B]",
    "active:translate-y-2 active:shadow-[0_0_0_-2px_#C8956C,0_0_0_0_#8A5A2B]",
  ),
  secondary: cn(
    "bg-card border-2 border-navy text-navy",
    "shadow-[0_9px_0_-2px_#1B2B4B,0_9px_0_0_#0F1A33]",
    "hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_11px_0_-2px_#1B2B4B,0_11px_0_0_#0F1A33]",
    "active:translate-y-2 active:shadow-[0_0_0_-2px_#1B2B4B,0_0_0_0_#0F1A33]",
  ),
  accent: cn(
    "bg-accent border-2 border-accent-strong text-navy",
    "shadow-[0_9px_0_-2px_#8A5A2B,0_9px_0_0_#5c3c1d]",
    "hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_11px_0_-2px_#8A5A2B,0_11px_0_0_#5c3c1d]",
    "active:translate-y-2 active:shadow-[0_0_0_-2px_#8A5A2B,0_0_0_0_#5c3c1d]",
  ),
};

const base = cn(
  "group relative inline-flex items-center justify-center",
  "font-sans font-bold uppercase tracking-wide",
  "transition-all duration-150 ease-[cubic-bezier(0,0,0.58,1)] select-none",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
);

export function PopButton({
  className,
  children,
  href,
  download,
  variant = "primary",
  size = "md",
  ...props
}: PopButtonProps) {
  const classes = cn(base, SIZES[size], VARIANTS[variant], className);
  if (href) {
    return (
      <a href={href} download={download} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export default PopButton;
