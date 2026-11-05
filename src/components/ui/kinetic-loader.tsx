"use client";

/**
 * KineticTextLoader — a kinetic word loader (bouncing dot + stretching letters).
 * Adapted from the provided component: dropped the next-themes dependency and the
 * mid-document @import (fonts load from index.html), theme-aware via tokens.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export interface KineticTextLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
}

export function KineticTextLoader({ className, text = "Loading", ...props }: KineticTextLoaderProps) {
  const letters = text.split("");

  return (
    <div className={cn("relative flex items-center justify-center font-light text-foreground", className)} {...props}>
      <style>{`
        @keyframes ktl-dotMove {
          0%, 100% { transform: rotate(180deg) translate(-80px, -10px) rotate(-180deg); }
          50% { transform: rotate(0deg) translate(-81px, 10px) rotate(0deg); }
        }
        @keyframes ktl-letterStretch {
          0%, 100% { transform: scale(1, 0.35); transform-origin: 100% 75%; }
          8%, 28% { transform: scale(1, 1.4); transform-origin: 100% 67%; }
          37% { transform: scale(1, 0.875); transform-origin: 100% 75%; }
          46% { transform: scale(1, 1.03); transform-origin: 100% 75%; }
          50%, 97% { transform: scale(1); transform-origin: 100% 75%; }
        }
        @keyframes ktl-l-bounce {
          0%, 45%, 70%, 100% { transform: scaleY(1.11); }
          49% { transform: scaleY(0.31); }
          50% { transform: scaleY(0.16); }
          53% { transform: scaleY(0.63); }
          60% { transform: scaleY(1.275); }
          68% { transform: scaleY(1.04); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ktl-dot, .ktl-anim { animation: none !important; }
        }
      `}</style>

      <div className="relative scale-75 md:scale-90 lg:scale-100">
        <div
          className="ktl-dot absolute z-10 top-[40px] left-[85px] size-[6px] rounded-full bg-accent"
          style={{ animation: "ktl-dotMove 1800ms cubic-bezier(0.25,0.25,0.75,0.75) infinite" }}
        />

        <p className="relative m-0 whitespace-nowrap text-[3.75rem] text-foreground" aria-label={text}>
          {letters.map((char, index) => {
            if (index === 0 && char.toUpperCase() === "L") {
              return (
                <span
                  key={index}
                  className="ktl-anim relative inline-block origin-[100%_70%] tracking-[8px]"
                  style={{ animation: "ktl-l-bounce 1800ms cubic-bezier(0.25,0.25,0.75,0.75) infinite" }}
                >
                  {char}
                </span>
              );
            }
            if (index === 4 && char.toLowerCase() === "i") {
              return (
                <span
                  key={index}
                  className="ktl-anim relative inline-block origin-[100%_70%] tracking-[8px]"
                  style={{ animation: "ktl-letterStretch 1800ms cubic-bezier(0.25,0.23,0.73,0.75) infinite" }}
                >
                  ı
                </span>
              );
            }
            return (
              <span key={index} className="relative inline-block tracking-[8px]">
                {char}
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}

export default KineticTextLoader;
