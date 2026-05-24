/**
 * Design Tokens — LinguAdapt Design System v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all visual primitives:
 *   • Colors (Radix Color Scale — light + dark)
 *   • Typography (Inter + Noto Sans for CJK/RTL/extended scripts)
 *   • Spacing (4-point grid, T-shirt sizes)
 *   • Radii, Shadows, Z-indices, Transitions
 *   • Motion (spring constants, easing curves)
 *   • RTL-aware logical properties
 *
 * Usage:
 *   import { tokens } from '@/design-system/tokens';
 *   // or use CSS custom properties directly: var(--color-brand-9)
 */

// ── Primitive palette (Radix-compatible 12-step scale) ────────────────────────

export const colorScales = {
  // Brand: Indigo-based
  brand: {
    1: "#f8f9ff", 2: "#f0f3ff", 3: "#e0e7ff", 4: "#c7d4ff",
    5: "#a9beff", 6: "#8aa5ff", 7: "#6b8efc", 8: "#4d75f7",
    9: "#1a56db", 10: "#1748c4", 11: "#1239a8", 12: "#0b2470",
  },
  // Accent: Violet
  accent: {
    1: "#fdf8ff", 2: "#f9f0ff", 3: "#f2e2ff", 4: "#e8ccff",
    5: "#dab4ff", 6: "#c994ff", 7: "#b26efd", 8: "#9a4cf4",
    9: "#7c3aed", 10: "#6d31d4", 11: "#5a25bb", 12: "#3b0f82",
  },
  // Success: Green
  success: {
    1: "#f6fef9", 2: "#edfcf2", 3: "#d3f9e0", 4: "#aef2c6",
    5: "#84e7a8", 6: "#56d685", 7: "#2ec063", 8: "#16a34a",
    9: "#15803d", 10: "#166534", 11: "#14532d", 12: "#052e16",
  },
  // Warning: Amber
  warning: {
    1: "#fffbf0", 2: "#fef7dc", 3: "#feecaa", 4: "#fede6d",
    5: "#fece3e", 6: "#fab914", 7: "#e8a109", 8: "#cb8504",
    9: "#b45309", 10: "#92400e", 11: "#78350f", 12: "#451a03",
  },
  // Error: Red
  error: {
    1: "#fff8f8", 2: "#ffeded", 3: "#fdd7d7", 4: "#fbb9b9",
    5: "#f89494", 6: "#f36767", 7: "#e83d3d", 8: "#d41b1b",
    9: "#b91c1c", 10: "#991b1b", 11: "#7f1d1d", 12: "#450a0a",
  },
  // Neutral: Slate
  neutral: {
    1: "#f8fafc", 2: "#f1f5f9", 3: "#e2e8f0", 4: "#cbd5e1",
    5: "#94a3b8", 6: "#64748b", 7: "#475569", 8: "#334155",
    9: "#1e293b", 10: "#0f172a", 11: "#020617", 12: "#000000",
  },
} as const;

// ── Semantic color tokens ─────────────────────────────────────────────────────

export const semanticColors = {
  light: {
    "bg-app":        colorScales.neutral[1],
    "bg-subtle":     colorScales.neutral[2],
    "bg-surface":    "#ffffff",
    "bg-overlay":    "rgba(15,23,42,0.6)",
    "border":        colorScales.neutral[3],
    "border-strong": colorScales.neutral[4],
    "text-primary":  colorScales.neutral[10],
    "text-secondary":colorScales.neutral[6],
    "text-muted":    colorScales.neutral[5],
    "text-inverse":  "#ffffff",
    "brand":         colorScales.brand[9],
    "brand-hover":   colorScales.brand[10],
    "brand-subtle":  colorScales.brand[3],
    "focus-ring":    colorScales.brand[8],
  },
  dark: {
    "bg-app":        "#0c0f1a",
    "bg-subtle":     "#111827",
    "bg-surface":    "#1a2035",
    "bg-overlay":    "rgba(0,0,0,0.8)",
    "border":        "#1f2d45",
    "border-strong": "#2a3d5c",
    "text-primary":  "#e8edf8",
    "text-secondary":"#94a3b8",
    "text-muted":    "#64748b",
    "text-inverse":  "#0c0f1a",
    "brand":         colorScales.brand[7],
    "brand-hover":   colorScales.brand[6],
    "brand-subtle":  "#1a2d5a",
    "focus-ring":    colorScales.brand[7],
  },
} as const;

// ── Typography ────────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    sans: '"Inter Variable", "Inter", system-ui, -apple-system, sans-serif',
    serif: '"Lora", Georgia, serif',
    mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
    /** CJK / Arabic / Devanagari / extended coverage */
    extended: '"Noto Sans", "Noto Sans CJK SC", "Noto Sans Arabic", "Noto Sans Devanagari", system-ui, sans-serif',
  },
  scale: {
    "2xs": ["0.625rem", { lineHeight: "1rem",    letterSpacing: "0.025em" }],
    xs:    ["0.75rem",  { lineHeight: "1rem",    letterSpacing: "0.015em" }],
    sm:    ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.01em"  }],
    base:  ["1rem",     { lineHeight: "1.5rem",  letterSpacing: "0"       }],
    md:    ["1.0625rem",{ lineHeight: "1.625rem",letterSpacing: "0"       }],
    lg:    ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "-0.005em"}],
    xl:    ["1.25rem",  { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
    "2xl": ["1.5rem",   { lineHeight: "2rem",    letterSpacing: "-0.015em"}],
    "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
    "4xl": ["2.25rem",  { lineHeight: "2.5rem",  letterSpacing: "-0.025em"}],
    "5xl": ["3rem",     { lineHeight: "1",       letterSpacing: "-0.03em" }],
    "6xl": ["3.75rem",  { lineHeight: "1",       letterSpacing: "-0.04em" }],
  },
  weight: { thin: 100, light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, black: 900 },
} as const;

// ── Spacing (4pt grid) ────────────────────────────────────────────────────────

export const spacing = {
  0: "0px", px: "1px", 0.5: "2px", 1: "4px", 1.5: "6px",
  2: "8px", 2.5: "10px", 3: "12px", 3.5: "14px", 4: "16px",
  5: "20px", 6: "24px", 7: "28px", 8: "32px", 9: "36px",
  10: "40px", 11: "44px", 12: "48px", 14: "56px", 16: "64px",
  20: "80px", 24: "96px", 28: "112px", 32: "128px", 36: "144px",
  40: "160px", 48: "192px", 56: "224px", 64: "256px",
} as const;

// ── Border radius ─────────────────────────────────────────────────────────────

export const radii = {
  none: "0",
  xs:   "2px",
  sm:   "4px",
  md:   "8px",
  lg:   "12px",
  xl:   "16px",
  "2xl":"20px",
  "3xl":"24px",
  full: "9999px",
} as const;

// ── Shadows ───────────────────────────────────────────────────────────────────

export const shadows = {
  none: "none",
  xs:   "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  sm:   "0 1px 3px 0 rgb(0 0 0 / 0.10), 0 1px 2px -1px rgb(0 0 0 / 0.10)",
  md:   "0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)",
  lg:   "0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10)",
  xl:   "0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.10)",
  "2xl":"0 25px 50px -12px rgb(0 0 0 / 0.25)",
  inner:"inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  "glow-brand":"0 0 0 3px rgba(26,86,219,0.35)",
  "glow-success":"0 0 0 3px rgba(21,128,61,0.35)",
} as const;

// ── Z-index scale ─────────────────────────────────────────────────────────────

export const zIndex = {
  hide:     -1, auto: "auto", base: 0, docked: 10,
  dropdown: 1000, sticky: 1100, banner: 1200,
  overlay:  1300, modal:  1400, popover: 1500,
  toast:    1700, tooltip:1800,
} as const;

// ── Motion (spring physics + easing) ─────────────────────────────────────────

export const motion = {
  spring: {
    /** Snappy: UI interactions (button press, toggle) */
    snappy:   { type: "spring", stiffness: 400, damping: 30, mass: 0.8 },
    /** Smooth: page transitions, drawers, modals */
    smooth:   { type: "spring", stiffness: 300, damping: 35, mass: 1.0 },
    /** Bouncy: celebrations, badges, counts */
    bouncy:   { type: "spring", stiffness: 600, damping: 20, mass: 0.6 },
    /** Gentle: tooltips, overlays */
    gentle:   { type: "spring", stiffness: 200, damping: 40, mass: 1.2 },
    /** Micro:  icon swaps, indicator dots */
    micro:    { type: "spring", stiffness: 700, damping: 35, mass: 0.5 },
  },
  easing: {
    standard:   [0.2, 0, 0, 1]    as [number,number,number,number],
    decelerate: [0.0, 0.0, 0.2, 1] as [number,number,number,number],
    accelerate: [0.3, 0, 1.0, 1]   as [number,number,number,number],
    sharp:      [0.4, 0, 0.6, 1]   as [number,number,number,number],
  },
  duration: {
    instant: 0, xs: 80, sm: 120, md: 200, lg: 300, xl: 500, "2xl": 800,
  },
} as const;

// ── Breakpoints ───────────────────────────────────────────────────────────────

export const breakpoints = {
  xs:  "375px",
  sm:  "640px",
  md:  "768px",   // tablet portrait
  lg:  "1024px",  // tablet landscape / small desktop
  xl:  "1280px",
  "2xl":"1536px",
} as const;

// ── Exported flat object for use in Tailwind theme extension ─────────────────

export const tokens = { colorScales, semanticColors, typography, spacing, radii, shadows, zIndex, motion, breakpoints } as const;
