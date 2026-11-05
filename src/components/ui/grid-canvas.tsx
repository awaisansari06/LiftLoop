"use client";

/**
 * GridCanvas — the app-wide animated backdrop (a 2D-canvas reimplementation of
 * the "wave grid": a field of tiles that ripple with idle waves and rise/brighten
 * toward the cursor). Chosen over the WebGL version because a 2D canvas:
 *   • always paints (no silent WebGL/context failures),
 *   • persists its last frame when the tab is backgrounded (stays visible),
 *   • is light (no three.js), and cursor-reactive across the whole UI.
 * Warm taupe→clay tiles on a transparent canvas, so it reads on every ivory/white
 * surface. Reduced-motion → a single static frame (still visible).
 */

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const BASE = [201, 188, 162]; // #C9BCA2 taupe
const PEAK = [200, 149, 108]; // #B8E568 clay
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function GridCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let cols = 0;
    let rows = 0;
    let cell = 46;

    const resize = () => {
      W = window.innerWidth || 1;
      H = window.innerHeight || 1;
      cell = W < 640 ? 38 : 48;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / cell) + 1;
      rows = Math.ceil(H / cell) + 1;
    };
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: W / 2, y: H / 2 };
    const target = { x: W / 2, y: H / 2 };
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const t0 = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const time = (now - t0) / 1000;
      // ease the cursor influence
      mouse.x += (target.x - mouse.x) * 0.08;
      mouse.y += (target.y - mouse.y) * 0.08;

      ctx.clearRect(0, 0, W, H);
      const half = cell / 2;
      const rr = typeof ctx.roundRect === "function";
      for (let j = 0; j < rows; j++) {
        const y = j * cell + half;
        for (let i = 0; i < cols; i++) {
          const x = i * cell + half;

          // gentle idle wave
          const wave = 0.5 + 0.5 * Math.sin(time * 0.9 + i * 0.55 + j * 0.42);
          // cursor ripple (gaussian falloff + travelling ring)
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ripple = Math.exp(-dist / 170) * (0.6 + 0.4 * Math.sin(time * 3 - dist * 0.045));

          const hRaw = 0.18 + wave * 0.34 + Math.max(0, ripple);
          const h = hRaw > 1 ? 1 : hRaw;

          // tiles fill most of the cell (gaps read as grid lines)
          const s = cell * 0.6 + h * (cell * 0.12);
          const r = (lerp(BASE[0], PEAK[0], h) + 0.5) | 0;
          const g = (lerp(BASE[1], PEAK[1], h) + 0.5) | 0;
          const b = (lerp(BASE[2], PEAK[2], h) + 0.5) | 0;
          const a = 0.32 + h * 0.5;
          const lift = h * 4;
          const rad = 5;

          // soft drop shadow for a subtle 3D tile feel
          ctx.fillStyle = `rgba(120,96,60,${a * 0.3})`;
          if (rr) {
            ctx.beginPath();
            ctx.roundRect(x - s / 2, y - s / 2 - lift + 3, s, s, rad);
            ctx.fill();
          } else {
            ctx.fillRect(x - s / 2, y - s / 2 - lift + 3, s, s);
          }
          // tile face
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          if (rr) {
            ctx.beginPath();
            ctx.roundRect(x - s / 2, y - s / 2 - lift, s, s, rad);
            ctx.fill();
          } else {
            ctx.fillRect(x - s / 2, y - s / 2 - lift, s, s);
          }
        }
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (!reduce) {
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={cn("block h-full w-full", className)} />;
}

export default GridCanvas;
