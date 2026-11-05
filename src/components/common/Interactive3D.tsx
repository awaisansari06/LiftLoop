/**
 * Interactive3D — UI primitives (de-slopped).
 *
 * The names are kept for API stability, but the flashy behaviour (3D tilt,
 * magnetic pull, cursor spotlights, conic gradient borders, particle/dot grids,
 * orbiting globes, glow shadows) has been removed in favour of clean, flat,
 * professional components. Entrances are minimal fades only.
 */
import {
  useRef,
  useEffect,
  useState,
  type ReactNode,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import T from '../../lib/theme';

/* Card — gentle cursor tilt (no glare / shine). Rests flat with no pointer. */
export function TiltCard({
  children, style, className, max = 8, radius = 16,
}: {
  children: ReactNode; style?: CSSProperties; className?: string;
  max?: number; glare?: boolean; layers?: boolean; radius?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 220, damping: 20, mass: 0.6 });
  const sy = useSpring(ry, { stiffness: 220, damping: 20, mass: 0.6 });
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * max);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * max);
  };
  const onLeave = () => { rx.set(0); ry.set(0); };
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{
        ...style, borderRadius: radius, position: 'relative',
        rotateX: sx, rotateY: sy, transformPerspective: 1000,
      }}
    >
      {children}
    </motion.div>
  );
}

/* Magnetic — cursor-follow pull (desktop); rests in place on touch. */
export function Magnetic({
  children, strength = 0.3, className, style,
}: { children: ReactNode; strength?: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.6 });
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  };
  const onLeave = () => { x.set(0); y.set(0); };
  return (
    <motion.div
      ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      className={className} style={{ ...style, x: sx, y: sy, display: 'inline-block' }}
    >
      {children}
    </motion.div>
  );
}

/* Spotlight — plain container (no cursor glow). */
export function Spotlight({
  children, className, style, radius = 16,
}: {
  children: ReactNode; className?: string; style?: CSSProperties; color?: string; radius?: number;
}) {
  return (
    <div className={className} style={{ ...style, position: 'relative', borderRadius: radius }}>
      {children}
    </div>
  );
}

/* GradientBorder — plain 1px bordered panel (no animated conic gradient). */
export function GradientBorder({
  children, style, className, radius = 16,
}: {
  children: ReactNode; style?: CSSProperties; className?: string; radius?: number; colors?: string[];
}) {
  return (
    <div className={className} style={{
      ...style, borderRadius: radius,
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.03)',
    }}>
      {children}
    </div>
  );
}

/* AnimatedCounter — counts up once on view (kept; it's a real data animation). */
export function AnimatedCounter({
  value, duration = 1200, prefix = '', suffix = '', format = (n: number) => n.toFixed(0), style,
}: {
  value: number; duration?: number; prefix?: string; suffix?: string;
  format?: (n: number) => string; style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  return <span ref={ref} style={style}>{prefix}{format(display)}{suffix}</span>;
}

/* Reveal — minimal fade up on scroll (subtle, not a bounce). */
export function Reveal({
  children, delay = 0, y = 12, className, style,
}: { children: ReactNode; delay?: number; y?: number; className?: string; style?: CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* Scramble — renders the plain text (no letter shuffle). */
export function Scramble({
  text, className, style,
}: { text: string; className?: string; style?: CSSProperties; delay?: number }) {
  return <span className={className} style={style}>{text}</span>;
}

/* ParticleField — removed (dot grids). */
export function ParticleField(_: { color?: string; density?: number; height?: number }) {
  return null;
}

/* OrbitGlobe — clean static wireframe globe (no radial glow, no orbiting dots). */
export function OrbitGlobe({ size = 280 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, position: 'relative' }} aria-hidden>
      <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.8" />
        {[30, 60, 90, 120, 150].map((a) => (
          <ellipse key={a} cx="100" cy="100" rx="80" ry="30"
            transform={`rotate(${a} 100 100)`}
            fill="none" stroke="rgba(200,149,108,0.22)" strokeWidth="0.6" />
        ))}
        {[26, 52].map((r) => (
          <ellipse key={r} cx="100" cy="100" rx="80" ry={r}
            fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        ))}
      </svg>
    </div>
  );
}

/* Marquee — simple static row (no infinite scroll). */
export function Marquee({ items }: { items: (string | ReactNode)[]; speed?: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center' }}>
      {items.map((it, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          color: 'rgba(255,255,255,0.5)', fontSize: 12.5, fontWeight: 600,
          letterSpacing: 1.2, textTransform: 'uppercase',
        }}>
          {it}
        </span>
      ))}
    </div>
  );
}

/* RippleButton — plain button (kept; ripple removed for calm). */
export function RippleButton({
  children, onClick, style, className, disabled,
}: { children: ReactNode; onClick?: () => void; style?: CSSProperties; className?: string; disabled?: boolean }) {
  return (
    <button
      onClick={() => { if (!disabled) onClick?.(); }}
      className={className}
      disabled={disabled}
      style={{ border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
    >
      {children}
    </button>
  );
}

/* ScrollProgress — thin solid top bar (no glow / gradient). */
export function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setP(total > 0 ? h.scrollTop / total : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 200,
      pointerEvents: 'none', background: 'transparent',
    }}>
      <div style={{ width: `${p * 100}%`, height: '100%', background: T.gold, transition: 'width 60ms linear' }} />
    </div>
  );
}

/* StepFlow3D — plain numbered steps (no tilt, gradients, blur or glow). */
export function StepFlow3D({ steps, accent = T.gold }: { steps: { icon: ReactNode; title: string; body: string }[]; accent?: string }) {
  return (
    <div className="mobile-step-flow" style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 16 }}>
      {steps.map((s, i) => (
        <Reveal key={i} delay={i * 0.06}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '22px 20px', height: '100%',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, marginBottom: 14,
              background: 'rgba(200,149,108,0.16)', border: `1px solid ${accent}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent,
            }}>
              {s.icon}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, letterSpacing: 2, color: accent, fontWeight: 700 }}>0{i + 1}</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>{s.title}</h3>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55 }}>{s.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* AnnouncementBar — flat tinted banner (no gradient/blur/glow). */
export function AnnouncementBar({ title, body, severity = 'info', onDismiss }: {
  title: string; body: string; severity?: 'info' | 'warning' | 'critical' | 'success'; onDismiss?: () => void;
}) {
  const color = severity === 'critical' ? T.red : severity === 'warning' ? T.orange : severity === 'success' ? T.green : T.blue;
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 90,
      background: T.navy, borderBottom: `1px solid ${color}55`,
      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 13, marginRight: 8 }}>{title}</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{body}</span>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} style={{
          border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px',
        }}>×</button>
      )}
    </div>
  );
}

/* RadialProgress — progress ring (kept; glow removed). */
export function RadialProgress({
  value, size = 120, thickness = 10, color = T.gold, label, sub, colorTrack = 'rgba(255,255,255,0.1)',
}: {
  value: number; size?: number; thickness?: number; color?: string;
  label?: string; sub?: string; colorTrack?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const dashOffset = c - (clamped / 100) * c;
  const ref = useRef<SVGCircleElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colorTrack} strokeWidth={thickness} />
        <circle
          ref={ref}
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeDasharray={c}
          strokeDashoffset={inView ? dashOffset : c}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: 'white', textAlign: 'center',
      }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, letterSpacing: '-0.03em', color }}>{Math.round(clamped)}</span>
        {label && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>{label}</span>}
        {sub && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{sub}</span>}
      </div>
    </div>
  );
}

/* KineticText — renders the text plainly (no per-word rise). */
export function KineticText({ text, style }: { text: string; style?: CSSProperties }) {
  return <span style={{ display: 'inline-block', ...style }}>{text}</span>;
}

/* ActivityDrawer — slide-out panel (flat surface). */
export function ActivityDrawer({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }}
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 92vw)', zIndex: 200,
              background: T.navy, borderLeft: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ color: 'white', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h3>
              <button onClick={onClose} style={{
                border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.75)', cursor: 'pointer', width: 30, height: 30, borderRadius: 8,
                fontSize: 16, lineHeight: 1,
              }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default {
  TiltCard, Magnetic, Spotlight, GradientBorder, AnimatedCounter, Reveal, Scramble,
  ParticleField, OrbitGlobe, Marquee, RippleButton, ScrollProgress, StepFlow3D,
  AnnouncementBar, RadialProgress, KineticText, ActivityDrawer,
};
