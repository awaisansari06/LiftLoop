"use client";

/**
 * Cursor-interaction primitives (desktop pointer only; disabled for touch and
 * prefers-reduced-motion). Used to give the site the tactile, cursor-responsive
 * feel of the Skiper components.
 *
 *  • <Magnetic>   — wraps any element so it drifts toward the cursor on hover.
 *  • <MagneticButton> — a design-system Button that is magnetic.
 *  • <CursorGlow> — a soft spotlight that tracks the cursor inside a container.
 */

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import React, { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./primitives";

function useFinePointer() {
  return typeof window !== "undefined"
    ? window.matchMedia("(pointer: fine)").matches
    : false;
}

export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.6 });
  const reduce = useReducedMotion();
  const enabled = !reduce && useFinePointer();

  const onMove = (e: React.MouseEvent) => {
    if (!enabled) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy, display: "inline-flex" }}
      className={className}
    >
      {children}
    </motion.span>
  );
}

export function MagneticButton({ strength, ...props }: ButtonProps & { strength?: number }) {
  return (
    <Magnetic strength={strength}>
      <Button {...props} />
    </Magnetic>
  );
}

/**
 * MouseParallax — drifts its children a few px toward the cursor as it moves
 * across the region, giving the hero a tactile, cursor-responsive feel without
 * hurting readability. Disabled on touch / reduced-motion.
 */
export function MouseParallax({
  children,
  intensity = 14,
  className,
}: {
  children: React.ReactNode;
  intensity?: number;
  className?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 140, damping: 22, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 140, damping: 22, mass: 0.6 });
  const reduce = useReducedMotion();
  const enabled = !reduce && useFinePointer();

  const onMove = (e: React.MouseEvent) => {
    if (!enabled) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    x.set(nx * intensity);
    y.set(ny * intensity);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div onMouseMove={onMove} onMouseLeave={reset} className={className}>
      <motion.div style={{ x: sx, y: sy }}>{children}</motion.div>
    </div>
  );
}

/** Soft spotlight that follows the cursor inside its (relatively-positioned) parent. */
export function CursorGlow({
  className,
  color = "var(--rm-accent)",
  splitColorRight,
  size = 460,
}: {
  className?: string;
  color?: string;
  splitColorRight?: string;
  size?: number;
}) {
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const sx = useSpring(x, { stiffness: 220, damping: 30, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 220, damping: 30, mass: 0.5 });
  const opacity = useMotionValue(0);
  const sOpacity = useSpring(opacity, { stiffness: 200, damping: 30 });
  const reduce = useReducedMotion();
  const [activeColor, setActiveColor] = useState(color);

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - r.left;
        x.set(mouseX);
        y.set(e.clientY - r.top);
        opacity.set(1);
        if (splitColorRight) {
          const newColor = mouseX > r.width / 2 ? splitColorRight : color;
          if (newColor !== activeColor) setActiveColor(newColor);
        }
      }}
      onMouseLeave={() => opacity.set(0)}
      className={cn("pointer-events-auto absolute inset-0 z-0", className)}
    >
      <motion.div
        className="absolute rounded-full blur-3xl transition-colors duration-500"
        style={{
          x: sx,
          y: sy,
          opacity: sOpacity,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          background: `radial-gradient(circle, ${activeColor} 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}
