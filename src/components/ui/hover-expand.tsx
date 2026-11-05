"use client";

/**
 * HoverExpandGallery — one responsive gallery combining Skiper 52 (desktop,
 * horizontal expand) and Skiper 53 (mobile, vertical accordion) from Skiper UI.
 *
 * Desktop (md+): panels sit in a row; the active panel widens under the pointer.
 * Mobile (<md): panels stack; the active panel grows in height (press/tap).
 *
 * Data-driven: pass real items. Items may be image-backed or token-styled
 * (icon + title) so the same gallery serves vehicle types, "how it works"
 * steps, and route showcases. Keyboard-accessible and prefers-reduced-motion
 * safe (transforms collapse to instant; content stays readable).
 *
 * Skiper UI — free tier requires attribution. https://skiper-ui.com
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import React, { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type GalleryItem = {
  /** Optional background image. */
  src?: string;
  alt?: string;
  /** Optional leading SVG icon (used when there is no image). */
  icon?: React.ReactNode;
  title: string;
  /** Short supporting line shown when expanded. */
  caption?: string;
  /** Tiny index/eyebrow shown in the corner (e.g. step number). */
  tag?: string;
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setIsDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return isDesktop;
}

type PanelProps = {
  item: GalleryItem;
  index: number;
  active: boolean;
  isDesktop: boolean;
  reduce: boolean;
  onActivate: (i: number) => void;
};

function Panel({ item, index, active, isDesktop, reduce, onActivate }: PanelProps) {
  const transition = reduce
    ? { duration: 0 }
    : { duration: 0.3, ease: "easeInOut" as const };

  const animate = isDesktop
    ? { width: active ? "24rem" : "5rem", height: "24rem" }
    : { height: active ? "22rem" : "3.5rem", width: "100%" };

  const initial = isDesktop
    ? { width: "5rem", height: "24rem" }
    : { height: "3.5rem", width: "100%" };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-expanded={active}
      aria-label={item.title}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-3xl outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        !item.src && "bg-muted",
      )}
      initial={initial}
      animate={animate}
      transition={transition}
      onClick={() => onActivate(index)}
      onHoverStart={() => isDesktop && onActivate(index)}
      onFocus={() => onActivate(index)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate(index);
        }
      }}
    >
      {item.src && (
        <img
          src={item.src}
          alt={item.alt ?? item.title}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      )}

      {/* token-styled backdrop when there is no image */}
      {!item.src && (
        <div className="absolute inset-0 bg-gradient-to-br from-navy to-navy-light" />
      )}

      {/* scrim on the active panel for legible overlay text */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
          />
        )}
      </AnimatePresence>

      {/* collapsed state: icon / tag, vertically centered */}
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center p-3 text-white">
          {item.icon ? (
            <span className="[&>svg]:size-6 opacity-90">{item.icon}</span>
          ) : (
            <span className="font-mono text-xs tracking-widest opacity-70">
              {item.tag ?? String(index + 1).padStart(2, "0")}
            </span>
          )}
        </div>
      )}

      {/* expanded content */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={reduce ? { duration: 0 } : { duration: 0.28, delay: 0.05 }}
            className="absolute inset-0 flex flex-col justify-end gap-1 p-5 text-white"
          >
            {item.tag && (
              <span className="font-mono text-xs tracking-widest text-white/60">
                {item.tag}
              </span>
            )}
            {item.icon && <span className="mb-1 [&>svg]:size-7">{item.icon}</span>}
            <h3 className="font-display text-xl font-bold leading-tight">
              {item.title}
            </h3>
            {item.caption && (
              <p className="max-w-[22rem] text-sm text-white/80">{item.caption}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function HoverExpandGallery({
  items,
  className,
  defaultActive = 0,
}: {
  items: GalleryItem[];
  className?: string;
  defaultActive?: number;
}) {
  const [active, setActive] = useState<number>(defaultActive);
  const isDesktop = useIsDesktop();
  const reduce = useReducedMotion() ?? false;

  return (
    <div className={cn("relative mx-auto w-full max-w-6xl px-4", className)}>
      <div
        className={cn(
          "flex w-full items-stretch justify-center gap-2",
          isDesktop ? "flex-row" : "flex-col",
        )}
      >
        {items.map((item, index) => (
          <Panel
            key={index}
            item={item}
            index={index}
            active={active === index}
            isDesktop={isDesktop}
            reduce={reduce}
            onActivate={setActive}
          />
        ))}
      </div>
    </div>
  );
}

export default HoverExpandGallery;
