"use client";

/**
 * ParallaxGallery — full-bleed masonry of colored ride posters that drift at
 * different speeds as the section scrolls (Skiper 30 spirit) AND lean toward the
 * cursor. Content-sized (no fixed viewport height), so it fills with cards and
 * never leaves a blank tail. Uses the ambient Lenis via useScroll — no nested
 * instance. Reduced-motion → a calm static grid.
 *
 * Skiper UI — free tier requires attribution. https://skiper-ui.com
 */

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import React, { useRef } from "react";

import { RidePoster, type PosterTone, type RideKind } from "@/components/ui/ride-illustrations";
import { cn } from "@/lib/utils";

export type ParallaxItem = { tone: PosterTone; kind: RideKind; title: string; eyebrow?: string };

function Column({
  items,
  y,
  className,
}: {
  items: ParallaxItem[];
  y: MotionValue<number>;
  className?: string;
}) {
  return (
    <motion.div style={{ y }} className={cn("flex flex-1 flex-col gap-4", className)}>
      {items.map((it, i) => (
        <div key={i} className="relative h-[19rem] w-full shrink-0 sm:h-[21rem]">
          <RidePoster tone={it.tone} kind={it.kind} title={it.title} eyebrow={it.eyebrow} />
        </div>
      ))}
    </motion.div>
  );
}

export function ParallaxGallery({ items }: { items: ParallaxItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  // gentle scroll drift per column (px)
  const s1 = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const s2 = useTransform(scrollYProgress, [0, 1], [-30, 60]);
  const s3 = useTransform(scrollYProgress, [0, 1], [60, -20]);
  const s4 = useTransform(scrollYProgress, [0, 1], [-10, 50]);
  const zero = useTransform(scrollYProgress, [0, 1], [0, 0]);

  // cursor lean for the whole gallery
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tx = useSpring(mx, { stiffness: 120, damping: 20 });
  const ty = useSpring(my, { stiffness: 120, damping: 20 });
  const onMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 24);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 16);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  // 4 balanced columns
  const cols: ParallaxItem[][] = [[], [], [], []];
  items.forEach((it, i) => cols[i % 4].push(it));

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={reduce ? undefined : { x: tx, y: ty }}
      className="mx-auto flex w-full max-w-[1600px] items-start gap-4 px-4 sm:px-6"
    >
      <Column items={cols[0]} y={reduce ? zero : s1} className="mt-0" />
      <Column items={cols[1]} y={reduce ? zero : s2} className="mt-10 sm:mt-16" />
      <Column items={cols[2]} y={reduce ? zero : s3} className="hidden mt-4 md:flex" />
      <Column items={cols[3]} y={reduce ? zero : s4} className="hidden mt-14 md:flex sm:mt-20" />
    </motion.div>
  );
}

export default ParallaxGallery;
