"use client";

/**
 * LiftLoop design-system primitives (design-system/MASTER.md §7).
 * Token-driven building blocks that replace the legacy inline-style card+text
 * sprawl. Import these everywhere instead of hand-rolling styled divs.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import React, { forwardRef } from "react";

import { cn } from "@/lib/utils";

/* ── Container ─────────────────────────────────────────────── */
export function Container({
  className,
  children,
  size = "6xl",
}: {
  className?: string;
  children: React.ReactNode;
  size?: "4xl" | "5xl" | "6xl" | "7xl" | "wide" | "full";
}) {
  const max = {
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    // near edge-to-edge — fills wide monitors with comfortable side gutters
    wide: "max-w-[1800px]",
    full: "max-w-none",
  }[size];
  const gutter = size === "wide" || size === "full" ? "px-4 sm:px-6 lg:px-10" : "px-4 sm:px-6";
  return <div className={cn("mx-auto w-full", gutter, max, className)}>{children}</div>;
}

/* ── Button ────────────────────────────────────────────────── */
export type ButtonVariant =
  | "primary"
  | "accent"
  | "secondary"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  // primary/accent carry the tactile 3D "pop" press (stacked shadow) so every
  // primary CTA across the app matches the PopButton language.
  primary:
    "bg-primary text-primary-foreground hover:bg-navy-light shadow-[0_4px_0_0_#0F1A33] hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_#0F1A33] active:translate-y-1 active:shadow-none",
  accent:
    "bg-accent text-accent-foreground hover:bg-accent-strong shadow-[0_4px_0_0_#8A5A2B] hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_#8A5A2B] active:translate-y-1 active:shadow-none",
  secondary:
    "bg-transparent text-foreground border border-border hover:border-accent hover:text-accent active:scale-[0.97]",
  ghost: "bg-transparent text-foreground hover:bg-muted active:scale-[0.97]",
  danger:
    "bg-danger text-white hover:brightness-95 shadow-[0_4px_0_0_#8f2f2a] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
}: { variant?: ButtonVariant; size?: ButtonSize } = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-sans font-semibold",
    "transition-all duration-200 outline-none whitespace-nowrap select-none",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
  );
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        icon && <span className="flex [&>svg]:size-[1.1em]" aria-hidden>{icon}</span>
      )}
      {children}
    </button>
  );
});

/* ── Panel / Card ──────────────────────────────────────────── */
export type PanelProps = React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  inset?: "none" | "sm" | "md" | "lg";
  as?: React.ElementType;
};

export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { hover, inset = "md", className, children, as: Tag = "div", ...props },
  ref,
) {
  const pad = { none: "", sm: "p-4", md: "p-6", lg: "p-8" }[inset];
  return (
    <Tag
      ref={ref}
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-sm backdrop-blur-md",
        hover && "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-2xl hover:border-accent/40 active:scale-[0.98]",
        pad,
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
});

/* ── Eyebrow / SectionHeading ──────────────────────────────── */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "mx-auto max-w-2xl text-center", className)}>
      {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
      <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/* ── Badge ─────────────────────────────────────────────────── */
export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent-soft text-accent-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        BADGE_TONES[tone],
        className,
      )}
    >
      {icon && <span className="flex [&>svg]:size-3.5" aria-hidden>{icon}</span>}
      {children}
    </span>
  );
}

/* ── Stat (mono, tabular data) ─────────────────────────────── */
export function Stat({
  value,
  label,
  className,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="font-mono text-3xl font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

/* ── Spinner ───────────────────────────────────────────────── */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-accent", className)} aria-hidden />;
}

/* ── PageShell — consistent authenticated-page top padding ──── */
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  // translucent (not bg-background) so the app-wide animated grid shows through
  // the gaps; the extra frost keeps dense pages readable over the motion.
  return (
    <motion.main
      initial={reduce ? undefined : { opacity: 0 }}
      animate={reduce ? undefined : { opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("min-h-dvh bg-white/45 pb-24 pt-20 backdrop-blur-sm md:pb-16", className)}
    >
      {children}
    </motion.main>
  );
}
