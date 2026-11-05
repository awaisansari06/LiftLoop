"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Logo from "@/components/common/Logo";

/** Branded first-visit intro; avoids embedding a previous brand's video. */
export function IntroFilm({ onDone }: { onDone: () => void }) {
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    setMounted(true);
    const timer = window.setTimeout(onDone, 2400);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  if (!mounted) return null;
  return createPortal(
    <motion.div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-6 bg-[#102D25] px-6 text-center text-white"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35 }}
      role="dialog" aria-modal="true" aria-label="Welcome to LiftLoop"
    >
      <motion.div initial={reduceMotion ? false : { scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}>
        <Logo size={88} light />
      </motion.div>
      <h1 className="font-display text-5xl font-extrabold tracking-tight">Lift<span className="text-accent">Loop</span></h1>
      <p className="text-lg text-white/75">Share the ride. Skip the wait.</p>
      <button autoFocus onClick={onDone} className="mt-4 rounded-full border border-white/30 px-6 py-3 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Get started</button>
    </motion.div>, document.body,
  );
}
export default IntroFilm;
