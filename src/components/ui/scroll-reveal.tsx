"use client";

/**
 * ScrollReveal — scroll-linked reveals adapted from Skiper 31 (ScrollAnimation_002,
 * Skiper UI). Two exports:
 *
 *  • <ScrollReveal text> — a headline whose characters assemble toward the centre
 *    as the element scrolls into view (the signature marketing-heading effect).
 *  • <Reveal> / <RevealGroup> + <RevealItem> — general "content appears on scroll"
 *    fade-and-rise used for section copy, feature blocks, list items, etc.
 *
 * Buttery with the ambient Lenis instance (SmoothScroll) but works with native
 * scroll too. Never nests its own <ReactLenis>. Fully prefers-reduced-motion safe:
 * transforms collapse to the final, readable state — no motion, no layout shift.
 *
 * Skiper UI — free tier requires attribution. https://skiper-ui.com
 */

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import React, { useRef } from "react";

import { cn } from "@/lib/utils";

/* ── Character-level headline reveal ───────────────────────────── */

type CharCell = { char: string; accent: boolean; space: boolean };

function RevealChar({
  cell,
  index,
  centerIndex,
  progress,
}: {
  cell: CharCell;
  index: number;
  centerIndex: number;
  progress: MotionValue<number>;
}) {
  const distance = index - centerIndex;
  const x = useTransform(progress, [0, 0.6], [distance * 34, 0]);
  const rotateX = useTransform(progress, [0, 0.6], [distance * 20, 0]);
  const opacity = useTransform(progress, [0, 0.5], [0.4, 1]);

  return (
    <motion.span
      aria-hidden
      className={cn("inline-block", cell.space && "w-[0.3em]", cell.accent && "text-accent")}
      style={{ x, rotateX, opacity }}
    >
      {cell.char === " " ? " " : cell.char}
    </motion.span>
  );
}

export function ScrollReveal({
  text,
  accent,
  as = "h2",
  className,
}: {
  text: string;
  /** Word or words to render in the accent color. */
  accent?: string | string[];
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
}) {
  const targetRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start 0.9", "start 0.35"],
  });

  const accentSet = new Set(
    (Array.isArray(accent) ? accent : accent ? [accent] : []).map((w) => w.toLowerCase()),
  );

  const words = text.split(" ");
  // Group characters by word (each word is a non-breaking inline-block) so the
  // per-character animation never splits a word across two lines.
  let gi = 0;
  const wordGroups = words.map((word) => {
    const isAccent = accentSet.has(word.toLowerCase());
    return [...word].map((ch) => ({ char: ch, accent: isAccent, space: false, index: gi++ }));
  });
  const totalChars = gi;
  const centerIndex = Math.floor(totalChars / 2);

  const Tag = motion[as];

  // Reduced motion / SSR-less fallback: static, fully readable heading.
  if (prefersReducedMotion) {
    return (
      <Tag className={cn("font-display", className)}>
        {words.map((word, i) => (
          <React.Fragment key={i}>
            <span className={accentSet.has(word.toLowerCase()) ? "text-accent" : undefined}>
              {word}
            </span>
            {i < words.length - 1 ? " " : null}
          </React.Fragment>
        ))}
      </Tag>
    );
  }

  return (
    <div ref={targetRef} style={{ perspective: "600px" }}>
      <Tag
        className={cn("font-display", className)}
        aria-label={text}
        style={{ transformStyle: "preserve-3d" }}
      >
        {wordGroups.map((chars, wi) => (
          <React.Fragment key={wi}>
            <span className="inline-block whitespace-nowrap">
              {chars.map((cell) => (
                <RevealChar
                  key={cell.index}
                  cell={cell}
                  index={cell.index}
                  centerIndex={centerIndex}
                  progress={scrollYProgress}
                />
              ))}
            </span>
            {wi < wordGroups.length - 1 && <span className="inline-block w-[0.3em]"> </span>}
          </React.Fragment>
        ))}
      </Tag>
    </div>
  );
}

/* ── General block reveal (fade + rise on view) ────────────────── */

const EASE_OUT = [0.22, 1, 0.36, 0.94] as const;

export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: keyof typeof motion;
}) {
  const prefersReducedMotion = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;

  if (prefersReducedMotion) {
    const Plain = (as as string) || "div";
    return React.createElement(Plain, { className }, children);
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
    >
      {children}
    </Tag>
  );
}

/** Staggered container — direct <RevealItem> children rise in sequence. */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  as?: keyof typeof motion;
}) {
  const prefersReducedMotion = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;

  if (prefersReducedMotion) {
    const Plain = (as as string) || "div";
    return React.createElement(Plain, { className }, children);
  }

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10% 0px" }}
      variants={{ show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </Tag>
  );
}

export function RevealItem({
  children,
  className,
  y = 20,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
  as?: keyof typeof motion;
}) {
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
      }}
    >
      {children}
    </Tag>
  );
}

export default ScrollReveal;
