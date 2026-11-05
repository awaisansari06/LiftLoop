"use client";

/**
 * DataFolder — a tactile, brand-coloured folder for a *collection of records*
 * (bookings, ride history, verification records, saved routes…). On hover the
 * cover tilts open and up to three real record mini-cards fan out from inside —
 * never stock images. Clicking opens the collection's page. On touch devices it
 * degrades to a static folder with a count badge that navigates on tap.
 */

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type FolderTone = "navy" | "clay" | "sky" | "green" | "gold";

export interface DataFolderItem {
  title: string;
  sub?: string;
}

export interface DataFolderProps {
  title: string;
  count?: number;
  countLabel?: string;
  tone?: FolderTone;
  icon?: React.ReactNode;
  items?: DataFolderItem[];
  emptyLabel?: string;
  onClick?: () => void;
  className?: string;
}

const TONES: Record<FolderTone, { back: string; cover: string; badge: string; badgeInk: string; deco: string }> = {
  navy: { back: "#16223D", cover: "#2C4372", badge: "#B8E568", badgeInk: "#173F35", deco: "rgba(255,255,255,0.85)" },
  clay: { back: "#9A6636", cover: "#B8E568", badge: "#173F35", badgeInk: "#FFFFFF", deco: "rgba(255,255,255,0.9)" },
  sky: { back: "#245C97", cover: "#4A90D9", badge: "#F6F7F2", badgeInk: "#173F35", deco: "rgba(255,255,255,0.9)" },
  green: { back: "#2A6B46", cover: "#3E9C66", badge: "#F6F7F2", badgeInk: "#173F35", deco: "rgba(255,255,255,0.9)" },
  gold: { back: "#9C7220", cover: "#DCAE4E", badge: "#173F35", badgeInk: "#FFFFFF", deco: "rgba(27,43,75,0.85)" },
};

const FOLDER_BACK =
  "M7.5,0C7.4,0,2,0,2,0C0.9,0,0,0.9,0,2l0,12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V4c0-1.1-0.9-2-2-2c0,0-7.5,0-8,0C9,2,9.9,0,7.5,0z";
const FOLDER_COVER = "M2,2h16c1.1,0,2,0.9,2,2v10c0,1.1-0.9,2-2,2H2c-1.1,0-2-0.9-2-2V4C0,2.9,0.9,2,2,2z";

export function DataFolder({
  title,
  count,
  countLabel,
  tone = "navy",
  icon,
  items = [],
  emptyLabel = "Nothing yet",
  onClick,
  className,
}: DataFolderProps) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);
  const c = TONES[tone];
  const cards = items.slice(0, 3);
  const open = hovered && !reduce;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label={`${title}${typeof count === "number" ? `, ${count} ${countLabel ?? "items"}` : ""}`}
      className={cn(
        "group flex w-full flex-col items-center rounded-3xl border border-border bg-card/70 p-4 text-center shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {/* folder + emerging records */}
      <div className="relative w-full max-w-[190px]" style={{ perspective: "900px" }}>
        <div className="relative aspect-[20/16] w-full">
          {/* record mini-cards (emerge on hover) */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center">
            {cards.length === 0 ? (
              <motion.div
                initial={false}
                animate={open ? { opacity: 1, y: "-46%", scale: 1 } : { opacity: 0, y: "10%", scale: 0.85 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-1/2 w-[78%] rounded-xl border border-border bg-card px-3 py-2 text-[11px] font-medium text-muted-foreground shadow-lg"
              >
                {emptyLabel}
              </motion.div>
            ) : (
              cards.map((item, i) => {
                const mid = (cards.length - 1) / 2;
                const spread = (i - mid) * 14;
                const rise = -42 - (cards.length - 1 - i) * 10;
                return (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={
                      open
                        ? { opacity: 1, y: `${rise}%`, x: `${spread}%`, rotate: spread * 0.35, scale: 1 }
                        : { opacity: 0, y: "8%", x: 0, rotate: 0, scale: 0.8 }
                    }
                    transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-1/2 w-[80%] rounded-xl border border-border bg-card px-3 py-2 text-left shadow-lg"
                    style={{ zIndex: 10 + i }}
                  >
                    <p className="truncate text-[11px] font-bold leading-tight text-foreground">{item.title}</p>
                    {item.sub && <p className="truncate text-[10px] text-muted-foreground">{item.sub}</p>}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* folder back */}
          <svg viewBox="0 0 20 16" className="absolute inset-0 h-full w-full" style={{ color: c.back }} aria-hidden>
            <path d={FOLDER_BACK} fill="currentColor" />
          </svg>

          {/* count badge on the tab */}
          {typeof count === "number" && (
            <span
              className="absolute right-[6%] top-[2%] z-30 grid min-w-[22px] place-items-center rounded-full px-1.5 py-0.5 font-mono text-[11px] font-extrabold shadow-md"
              style={{ background: c.badge, color: c.badgeInk }}
            >
              {count}
            </span>
          )}

          {/* folder cover (opens on hover) */}
          <motion.div
            initial={false}
            animate={open ? { rotateX: -32 } : { rotateX: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-20"
            style={{ transformOrigin: "50% 100%", transformStyle: "preserve-3d", color: c.cover }}
          >
            <svg viewBox="0 0 20 16" className="h-full w-full" aria-hidden>
              <path d={FOLDER_COVER} fill="currentColor" />
            </svg>
            {icon && (
              <span
                className="absolute left-1/2 top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center [&>svg]:size-6"
                style={{ color: c.deco }}
                aria-hidden
              >
                {icon}
              </span>
            )}
          </motion.div>
        </div>
      </div>

      {/* label */}
      <div className="mt-4 flex flex-col items-center gap-0.5">
        <span className="font-display text-sm font-bold text-foreground">{title}</span>
        {typeof count === "number" && (
          <span className="text-xs text-muted-foreground">
            {count} {countLabel ?? "items"}
          </span>
        )}
      </div>
    </button>
  );
}

export default DataFolder;
