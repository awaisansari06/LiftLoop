"use client";

/**
 * SocialFlipButton — a row of social tiles. The brand icon is visible by default;
 * on hover the tile flips to an accent-filled face (Skiper flip morphism) and
 * shows a tooltip. Dark-footer skin.
 */

import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
import {
  FaInstagram,
  FaWhatsapp,
  FaXTwitter,
  FaLinkedinIn,
  FaEnvelope,
  FaGithub,
} from "react-icons/fa6";

import { cn } from "@/lib/utils";

export type SocialItem = { icon: React.ReactNode; label: string; href: string };

const DEFAULT: SocialItem[] = [];

export function SocialFlipButton({ items = DEFAULT, className }: { items?: SocialItem[]; className?: string }) {
  const [tip, setTip] = useState<number | null>(null);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {items.map((it, i) => (
        <a
          key={i}
          href={it.href}
          target={it.href.startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          aria-label={it.label}
          onMouseEnter={() => setTip(i)}
          onMouseLeave={() => setTip(null)}
          className="group relative h-10 w-10 shrink-0"
          style={{ perspective: "800px" }}
        >
          <AnimatePresence>
            {tip === i && (
              <motion.span
                initial={{ opacity: 0, y: 6, x: "-50%" }}
                animate={{ opacity: 1, y: -36, x: "-50%" }}
                exit={{ opacity: 0, y: 6, x: "-50%" }}
                className="absolute left-1/2 z-20 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-navy shadow"
              >
                {it.label}
              </motion.span>
            )}
          </AnimatePresence>
          <motion.span
            className="relative block h-full w-full"
            animate={{ rotateY: tip === i ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 16 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* front: brand icon, always visible */}
            <span
              className="absolute inset-0 grid place-items-center rounded-xl border border-white/15 bg-white/10 text-[17px] text-white [&>svg]:size-[17px]"
              style={{ backfaceVisibility: "hidden" }}
            >
              {it.icon}
            </span>
            {/* back: accent-filled */}
            <span
              className="absolute inset-0 grid place-items-center rounded-xl bg-accent text-navy [&>svg]:size-[17px]"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              {it.icon}
            </span>
          </motion.span>
        </a>
      ))}
    </div>
  );
}

export default SocialFlipButton;
