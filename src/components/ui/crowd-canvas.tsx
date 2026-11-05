"use client";

/**
 * CrowdCanvas — an endless crowd of people walking across a full-bleed band.
 * The commute-crowd metaphor: everyone on campus heading the same way.
 *
 * The walk ENGINE is ported faithfully from Skiper 39 (Canvas_Landing_004,
 * adapted from codepen.io/zadvorsky/pen/xxwbBQV, illustrations openpeeps.com):
 * a GSAP timeline moves each peep across X with a yoyo Y-bob, and on complete
 * the peep is recycled to the far edge — a self-sustaining crowd.
 *
 * The original slices a sprite sheet; that atlas isn't reachable in this
 * environment, so each peep is drawn PROCEDURALLY as a walking silhouette in a
 * brand tone (varied height / palette / stride). Same interaction design, no
 * external asset. Honors prefers-reduced-motion (renders a static crowd).
 *
 * Skiper UI — free tier requires attribution. https://skiper-ui.com
 */

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Peep = {
  color: string;
  bag: boolean;
  scale: number;
  width: number;
  height: number;
  phase: number;
  x: number;
  y: number;
  anchorY: number;
  scaleX: number;
  walk: gsap.core.Timeline | null;
};

// Brand-tone silhouettes (navy / slate / gold / clay / sage) — depth via alpha.
const PALETTE = [
  "rgba(27,43,75,0.92)", // navy
  "rgba(44,74,124,0.85)", // navy-light
  "rgba(90,102,120,0.80)", // slate
  "rgba(200,149,108,0.90)", // accent / clay
  "rgba(122,95,66,0.82)", // deep clay
  "rgba(62,110,90,0.80)", // sage
  "rgba(70,82,102,0.70)", // muted slate (far)
];

export function CrowdCanvas({
  className,
  density = 1,
}: {
  className?: string;
  /** multiplier on how many people populate the band */
  density?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const randomRange = (min: number, max: number) => min + Math.random() * (max - min);
    const randomIndex = (arr: unknown[]) => (randomRange(0, arr.length) | 0);
    const removeFromArray = <T,>(arr: T[], i: number) => arr.splice(i, 1)[0];
    const removeItemFromArray = <T,>(arr: T[], item: T) => removeFromArray(arr, arr.indexOf(item));
    const removeRandomFromArray = <T,>(arr: T[]) => removeFromArray(arr, randomIndex(arr));
    const getRandomFromArray = <T,>(arr: T[]) => arr[randomIndex(arr) | 0];

    const stage = { width: 0, height: 0 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // ── draw one walking silhouette in its own local box (feet at bottom) ──
    const drawPeep = (peep: Peep) => {
      const w = peep.width;
      const h = peep.height;
      const stride = Math.sin(peep.x / 16 + peep.phase);
      const swing = stride * (w * 0.34);
      const cx = w / 2;
      const hipY = h * 0.6;
      const shoulderY = h * 0.32;
      const headR = w * 0.24;
      const limb = Math.max(3, w * 0.15);

      ctx.save();
      ctx.translate(peep.x, peep.y);
      ctx.scale(peep.scaleX, 1);
      ctx.fillStyle = peep.color;
      ctx.strokeStyle = peep.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // legs (swing opposite)
      ctx.lineWidth = limb;
      ctx.beginPath();
      ctx.moveTo(cx, hipY);
      ctx.lineTo(cx - swing * 0.5, h - limb / 2);
      ctx.moveTo(cx, hipY);
      ctx.lineTo(cx + swing * 0.5, h - limb / 2);
      ctx.stroke();

      // torso
      ctx.lineWidth = w * 0.42;
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx, hipY);
      ctx.stroke();

      // arms (swing opposite to legs)
      ctx.lineWidth = limb * 0.85;
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY + h * 0.03);
      ctx.lineTo(cx + swing * 0.45, shoulderY + h * 0.22);
      ctx.stroke();

      // optional shoulder bag
      if (peep.bag) {
        ctx.lineWidth = Math.max(2, w * 0.08);
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.1, shoulderY + h * 0.02);
        ctx.lineTo(cx + w * 0.22, hipY - h * 0.02);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + w * 0.24, hipY - h * 0.02, w * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }

      // head
      ctx.beginPath();
      ctx.arc(cx, shoulderY - headR * 0.9, headR, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const createPeep = (): Peep => {
      const scale = randomRange(0.72, 1.12);
      return {
        color: getRandomFromArray(PALETTE),
        bag: Math.random() > 0.55,
        scale,
        width: 46 * scale,
        height: 150 * scale,
        phase: randomRange(0, Math.PI * 2),
        x: 0,
        y: 0,
        anchorY: 0,
        scaleX: 1,
        walk: null,
      };
    };

    const resetPeep = (peep: Peep) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      // vary the baseline so nearer peeps sit lower (depth)
      const offsetY = 90 - 220 * gsap.parseEase("power2.in")(Math.random());
      const startY = stage.height - peep.height + offsetY;
      let startX: number;
      let endX: number;
      if (direction === 1) {
        startX = -peep.width;
        endX = stage.width;
        peep.scaleX = 1;
      } else {
        startX = stage.width + peep.width;
        endX = -peep.width;
        peep.scaleX = -1;
      }
      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY;
      return { startX, startY, endX };
    };

    const normalWalk = (peep: Peep, props: { startX: number; startY: number; endX: number }) => {
      const { startY, endX } = props;
      const xDuration = 10;
      const yDuration = 0.25;
      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.5, 1.5));
      tl.to(peep, { duration: xDuration, x: endX, ease: "none" }, 0);
      tl.to(
        peep,
        { duration: yDuration, repeat: Math.round(xDuration / yDuration), yoyo: true, y: startY - 9 },
        0,
      );
      return tl;
    };

    const allPeeps: Peep[] = [];
    const availablePeeps: Peep[] = [];
    const crowd: Peep[] = [];

    const addPeepToCrowd = () => {
      const peep = removeRandomFromArray(availablePeeps);
      if (!peep) return null;
      const walk = normalWalk(peep, resetPeep(peep)).eventCallback("onComplete", () => {
        removePeepFromCrowd(peep);
        addPeepToCrowd();
      });
      peep.walk = walk;
      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);
      return peep;
    };

    const removePeepFromCrowd = (peep: Peep) => {
      removeItemFromArray(crowd, peep);
      availablePeeps.push(peep);
    };

    const initCrowd = () => {
      while (availablePeeps.length) {
        const p = addPeepToCrowd();
        p?.walk?.progress(Math.random());
      }
      if (prefersReduced) crowd.forEach((p) => p.walk?.pause());
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      crowd.forEach(drawPeep);
      ctx.restore();
    };

    const buildPeeps = () => {
      const count = Math.max(8, Math.round((stage.width / 90) * density));
      allPeeps.length = 0;
      for (let i = 0; i < count; i++) allPeeps.push(createPeep());
    };

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return; // not laid out yet
      if (w === stage.width && h === stage.height && crowd.length) return; // no change
      stage.width = w;
      stage.height = h;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      crowd.forEach((p) => p.walk?.kill());
      crowd.length = 0;
      availablePeeps.length = 0;
      buildPeeps();
      availablePeeps.push(...allPeeps);
      initCrowd();
    };

    // Size synchronously if we can (doesn't depend on rAF, which some hosts
    // pause when the tab/pane is hidden); otherwise poll until laid out.
    let rafId = 0;
    const startWhenSized = () => {
      if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
        resize();
        return;
      }
      rafId = requestAnimationFrame(startWhenSized);
    };
    startWhenSized();

    gsap.ticker.add(render);
    const handleResize = () => resize();
    window.addEventListener("resize", handleResize);
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement ?? canvas);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
      gsap.ticker.remove(render);
      crowd.forEach((p) => p.walk?.kill());
    };
  }, [density]);

  return <canvas ref={canvasRef} className={cn("block h-full w-full", className)} />;
}

export default CrowdCanvas;
