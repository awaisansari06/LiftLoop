"use client";

/**
 * RideCarousel — full-bleed horizontal carousel of colored ride posters.
 * Ported from Skiper 54 (Carousel_006, Skiper UI) — the active slide expands
 * via a clip-path inset while neighbours sit inset; drag / arrows / dots.
 * Uses embla-carousel directly (no extra shadcn wrapper). Reduced-motion safe.
 *
 * Skiper UI — free tier requires attribution. https://skiper-ui.com
 */

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { RidePoster, type PosterTone, type RideKind } from "@/components/ui/ride-illustrations";

export type RideSlide = {
  tone: PosterTone;
  kind: RideKind;
  eyebrow?: string;
  title: string;
  caption?: string;
};

export function RideCarousel({
  slides,
  autoplay = false,
  className,
}: {
  slides: RideSlide[];
  autoplay?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center", slidesToScroll: 1, containScroll: false },
    autoplay ? [Autoplay({ delay: 3200, stopOnInteraction: true, stopOnMouseEnter: true })] : [],
  );
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrent(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  return (
    <div className={cn("w-full", className)}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {slides.map((s, index) => {
            const active = current === index;
            return (
              <div
                key={index}
                onClick={() => scrollTo(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    scrollTo(index);
                  }
                }}
                className={cn(
                  "relative flex min-w-0 shrink-0 grow-0 basis-[78%] items-center justify-center px-2 sm:basis-[52%] md:basis-[36%] lg:basis-[27%] xl:basis-[23%]",
                  active ? "cursor-default" : "cursor-pointer",
                )}
              >
                <motion.div
                  initial={false}
                  animate={{
                    clipPath: reduce
                      ? "inset(0 0 0 0 round 1.75rem)"
                      : active
                        ? "inset(0 0 0 0 round 1.75rem)"
                        : "inset(9% 0 9% 0 round 1.75rem)",
                  }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="h-[24rem] w-full"
                >
                  <RidePoster
                    tone={s.tone}
                    kind={s.kind}
                    eyebrow={s.eyebrow}
                    title={s.title}
                    caption={active ? s.caption : undefined}
                    className={cn("transition-shadow duration-500", active ? "shadow-2xl" : "shadow-md")}
                  />
                </motion.div>
                <AnimatePresence>
                  {active && s.caption && (
                    <motion.div
                      initial={{ opacity: 0, filter: "blur(8px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45 }}
                      className="pointer-events-none absolute -bottom-8 left-0 right-0 text-center text-sm font-medium text-muted-foreground"
                    >
                      {s.eyebrow}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-12 flex items-center justify-center gap-5">
        <button
          aria-label="Previous"
          onClick={scrollPrev}
          className="grid size-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:border-accent hover:text-accent"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all",
                current === i ? "w-6 bg-accent" : "w-2 bg-border hover:bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
        <button
          aria-label="Next"
          onClick={scrollNext}
          className="grid size-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:border-accent hover:text-accent"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}

export default RideCarousel;
