"use client";

/**
 * TextRoll — letters roll from bottom→top on hover (and optionally when the
 * heading scrolls into view). Ported from Skiper 58 (Skiper UI) and extended
 * with an `animateOnView` scroll trigger + polymorphic `as`. Replaces the old
 * per-character "scatter/assemble" heading which read as glitchy.
 *
 * Two stacked copies of the text: the top copy rolls up out of view while the
 * bottom copy rolls up into place, staggered from the centre outward.
 *
 * Honors prefers-reduced-motion (renders plain, no transform).
 *
 * Skiper UI — free tier requires attribution. https://skiper-ui.com
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import React from "react";

import { cn } from "@/lib/utils";

const STAGGER = 0.03;

type TextRollProps = {
  children: string;
  className?: string;
  /** Stagger outward from the centre character (default) vs left→right. */
  center?: boolean;
  /** Roll in once when scrolled into view (in addition to hover). */
  animateOnView?: boolean;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
};

export const TextRoll: React.FC<TextRollProps> = ({
  children,
  className,
  center = false,
  animateOnView = false,
  as = "span",
}) => {
  const reduce = useReducedMotion();
  const chars = [...children];
  const Tag = motion[as] as typeof motion.span;

  if (reduce) {
    const Plain = as as string;
    return React.createElement(Plain, { className }, children);
  }

  const delayFor = (i: number) =>
    center ? STAGGER * Math.abs(i - (chars.length - 1) / 2) : STAGGER * i;

  const topVariants: Variants = {
    initial: { y: 0 },
    hovered: { y: "-100%" },
    inview: { y: "-100%" },
  };
  const bottomVariants: Variants = {
    initial: { y: "100%" },
    hovered: { y: 0 },
    inview: { y: 0 },
  };

  return (
    <Tag
      initial="initial"
      whileHover="hovered"
      {...(animateOnView
        ? { whileInView: "inview", viewport: { once: true, margin: "-15% 0px" } }
        : {})}
      className={cn(
        "relative inline-block overflow-hidden whitespace-nowrap align-top",
        className,
      )}
      style={{ lineHeight: 0.95 }}
      aria-label={children}
    >
      <span aria-hidden>
        {chars.map((l, i) => (
          <motion.span
            key={`t-${i}`}
            variants={topVariants}
            transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.5, delay: delayFor(i) }}
            className="inline-block"
          >
            {l === " " ? " " : l}
          </motion.span>
        ))}
      </span>
      <span aria-hidden className="absolute inset-0">
        {chars.map((l, i) => (
          <motion.span
            key={`b-${i}`}
            variants={bottomVariants}
            transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.5, delay: delayFor(i) }}
            className="inline-block"
          >
            {l === " " ? " " : l}
          </motion.span>
        ))}
      </span>
    </Tag>
  );
};

export default TextRoll;
