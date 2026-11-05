"use client";

/**
 * VideoReveal — the canonical "open a video from its source" transition, adapted
 * from Skiper 67 (Skiper UI). A trigger (thumbnail, logo, poster) expands into a
 * full-screen player via a clip-path zoom; controls are media-chrome.
 *
 * Two modes:
 *  • Uncontrolled — renders `children` as the trigger with a magnetic "Play" hint;
 *    click opens the player. (site-wide "see it in motion")
 *  • Controlled — pass `open` + `onOpenChange` to drive it externally, e.g. the
 *    Landing logo → intro-film reveal.
 *
 * prefers-reduced-motion: the clip-path zoom is replaced by a plain fade; nothing
 * depends on motion.
 *
 * Skiper UI — free tier requires attribution. https://skiper-ui.com
 */

import { AnimatePresence, motion, useReducedMotion, useSpring } from "framer-motion";
import { Play, X } from "lucide-react";
import {
  MediaControlBar,
  MediaController,
  MediaMuteButton,
  MediaPlayButton,
  MediaTimeRange,
} from "media-chrome/react";
import React, { useState } from "react";
import { createPortal } from "react-dom";

import IntroFilm from '@/components/landing/IntroFilm';

import { cn } from "@/lib/utils";

export function VideoPlayerShell({
  src,
  poster,
  onClose,
  reduce,
}: {
  src: string;
  poster?: string;
  onClose: () => void;
  reduce: boolean;
}) {
  if (src === 'brand:intro') return <IntroFilm onDone={onClose} />;
  const openTransition = reduce
    ? { duration: 0.15 }
    : { duration: 0.9, type: "spring" as const, stiffness: 100, damping: 20 };

  return (
    <div className="fixed inset-0 z-[2147483000] flex items-center justify-center p-0 md:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-navy/90 backdrop-blur-lg"
        onClick={onClose}
      />
      <motion.div
        initial={
          reduce
            ? { opacity: 0 }
            : { clipPath: "inset(44% 44% 34% 44%)", opacity: 0 }
        }
        animate={reduce ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
        exit={
          reduce
            ? { opacity: 0, transition: { duration: 0.15 } }
            : {
                clipPath: "inset(44% 44% 34% 44%)",
                opacity: 0,
                transition: {
                  duration: 0.9,
                  type: "spring",
                  stiffness: 100,
                  damping: 20,
                  opacity: { duration: 0.2, delay: 0.7 },
                },
              }
        }
        transition={openTransition}
        className="relative w-full max-h-[90dvh] md:max-h-none md:aspect-video md:max-w-6xl overflow-hidden rounded-none md:rounded-2xl shadow-xl bg-black"
      >
        <MediaController className="aspect-video w-full md:[border-radius:16px]">
          <video
            src={src}
            poster={poster}
            autoPlay
            playsInline
            slot="media"
            className="h-full w-full object-contain bg-black"
          />
          <button
            type="button"
            aria-label="Close video"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
          >
            <X className="size-5" />
          </button>
          <MediaControlBar className="absolute bottom-0 left-1/2 flex w-full max-w-6xl -translate-x-1/2 items-center gap-2 px-4 py-3 mix-blend-exclusion md:px-8">
            <MediaPlayButton className="h-8 bg-transparent" />
            <MediaTimeRange className="flex-1 bg-transparent [--media-range-thumb-opacity:0] [--media-range-track-height:2px]" />
            <MediaMuteButton className="size-8 bg-transparent" />
          </MediaControlBar>
        </MediaController>
      </motion.div>
    </div>
  );
}

export type VideoRevealProps = {
  src: string;
  poster?: string;
  children?: React.ReactNode;
  /** Controlled open state. Omit for the click-to-open trigger mode. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  triggerClassName?: string;
  /** Show the magnetic "Play" hint over the trigger. Default true. */
  hint?: boolean;
};

export function VideoReveal({
  src,
  poster,
  children,
  open: controlledOpen,
  onOpenChange,
  className,
  triggerClassName,
  hint = true,
}: VideoRevealProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const reduce = useReducedMotion() ?? false;

  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  const x = useSpring(0, { mass: 0.1 });
  const y = useSpring(0, { mass: 0.1 });
  const opacity = useSpring(0, { mass: 0.1 });

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    opacity.set(1);
    const bounds = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - bounds.left);
    y.set(e.clientY - bounds.top);
  };

  const player = (
    <AnimatePresence>
      {open && (
        <VideoPlayerShell src={src} poster={poster} reduce={reduce} onClose={() => setOpen(false)} />
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* portal to <body> so the fullscreen player escapes the landing's Lenis
          wrapper + route filter (which otherwise stretch a fixed overlay to the
          whole page height — white bars above/below, video stuck in the middle) */}
      {typeof document !== "undefined" ? createPortal(player, document.body) : player}

      {children && (
        <div
          className={cn("relative cursor-pointer", className)}
          onMouseMove={handlePointerMove}
          onMouseLeave={() => opacity.set(0)}
          onClick={() => setOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Play video"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {hint && (
            <motion.div
              style={{ x, y, opacity }}
              className="pointer-events-none absolute left-0 top-0 z-20 flex w-fit select-none items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-sm font-medium text-white backdrop-blur"
            >
              <Play className="size-3.5 fill-white" /> Play
            </motion.div>
          )}
          <div className={triggerClassName}>{children}</div>
        </div>
      )}
    </>
  );
}

export default VideoReveal;
