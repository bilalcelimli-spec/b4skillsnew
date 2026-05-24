/**
 * Motion Design System — Animation variants & spring presets
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses `motion` (Framer Motion v12 rebranded) for all animations.
 * All variants respect `prefers-reduced-motion` via `useReducedMotion()`.
 */
import { useReducedMotion } from "motion/react";
import type { Variants, Transition } from "motion/react";
export { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useAnimate } from "motion/react";

// ── Spring presets ─────────────────────────────────────────────────────────

export const springs = {
  snappy:  { type: "spring", stiffness: 400, damping: 30, mass: 0.8 } as Transition,
  smooth:  { type: "spring", stiffness: 300, damping: 35, mass: 1.0 } as Transition,
  bouncy:  { type: "spring", stiffness: 600, damping: 20, mass: 0.6 } as Transition,
  gentle:  { type: "spring", stiffness: 200, damping: 40, mass: 1.2 } as Transition,
  micro:   { type: "spring", stiffness: 700, damping: 35, mass: 0.5 } as Transition,
};

// ── Common animation variants ─────────────────────────────────────────────

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: springs.gentle },
  exit:    { opacity: 0, transition: { duration: 0.12 } },
};

export const slideUp: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0,    transition: springs.smooth },
  exit:    { opacity: 0, y: 8,    transition: { duration: 0.12 } },
};

export const slideDown: Variants = {
  hidden:  { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0,    transition: springs.smooth },
  exit:    { opacity: 0, y: -8,   transition: { duration: 0.12 } },
};

export const slideInLeft: Variants = {
  hidden:  { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0,    transition: springs.smooth },
  exit:    { opacity: 0, x: -16,  transition: { duration: 0.12 } },
};

export const slideInRight: Variants = {
  hidden:  { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0,    transition: springs.smooth },
  exit:    { opacity: 0, x: 16,   transition: { duration: 0.12 } },
};

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1,   transition: springs.snappy },
  exit:    { opacity: 0, scale: 0.96, transition: { duration: 0.10 } },
};

export const popIn: Variants = {
  hidden:  { opacity: 0, scale: 0.7 },
  visible: { opacity: 1, scale: 1,   transition: springs.bouncy },
  exit:    { opacity: 0, scale: 0.9, transition: { duration: 0.08 } },
};

/** Stagger children list items */
export const staggerContainer: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: springs.smooth },
};

/** Score counter animation */
export const countUp: Variants = {
  hidden:  { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: springs.bouncy },
};

/** Page transition (used in router) */
export const pageTransition: Variants = {
  hidden:  { opacity: 0, y: 8  },
  visible: { opacity: 1, y: 0, transition: { ...springs.smooth, duration: 0.25 } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

/** Drawer / sidebar */
export const drawerLeft: Variants = {
  hidden:  { x: "-100%" },
  visible: { x: 0,       transition: springs.smooth },
  exit:    { x: "-100%", transition: springs.snappy },
};

export const drawerRight: Variants = {
  hidden:  { x: "100%" },
  visible: { x: 0,      transition: springs.smooth },
  exit:    { x: "100%", transition: springs.snappy },
};

/** Modal backdrop */
export const backdrop: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

// ── Hooks ─────────────────────────────────────────────────────────────────

/** Returns null variants when reduced-motion is requested */
export function useMotionVariants<T extends Variants>(variants: T): T | { hidden: {}; visible: {}; exit: {} } {
  const reduced = useReducedMotion();
  if (reduced) return { hidden: {}, visible: {}, exit: {} };
  return variants;
}

/** Hook: animated number counter */
import { useState, useEffect, useRef } from "react";

export function useCountUp(target: number, duration = 1200, delay = 0): number {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();
  const rafRef   = useRef<number>(0);

  useEffect(() => {
    if (reduced) { setValue(target); return; }
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start - delay;
      if (elapsed < 0) { rafRef.current = requestAnimationFrame(step); return; }
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, delay, reduced]);

  return value;
}
