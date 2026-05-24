/**
 * MicroCelebration — Haptic + visual feedback for score milestones
 * ─────────────────────────────────────────────────────────────────────────────
 * Triggers confetti burst, animated badge pop, and optional haptic feedback
 * when candidates achieve milestones or complete assessments.
 *
 * Events:
 *   • LEVEL_UP:  new CEFR band achieved
 *   • PERFECT:   100% score on a module
 *   • COMPLETE:  assessment session finished
 *   • STREAK:    N correct in a row
 *   • FIRST_C1:  first C1 item answered correctly
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { motion as m, AnimatePresence, useReducedMotion } from "./motion.js";

// ── Event types ───────────────────────────────────────────────────────────────

export type CelebrationEvent =
  | "LEVEL_UP"
  | "PERFECT"
  | "COMPLETE"
  | "STREAK_5"
  | "STREAK_10"
  | "FIRST_C1"
  | "MILESTONE";

interface CelebrationConfig {
  emoji:    string;
  headline: string;
  subtext:  string;
  confettiColors: string[];
  confettiCount:  number;
  hapticPattern?: number[];  // VibrateAPI pattern (ms on/off)
}

const CONFIGS: Record<CelebrationEvent, CelebrationConfig> = {
  LEVEL_UP: {
    emoji: "🎯", headline: "Level Up!", subtext: "You've reached a new CEFR level.",
    confettiColors: ["#1a56db","#6b8efc","#fbbf24","#34d399"],
    confettiCount: 120, hapticPattern: [80, 40, 80, 40, 200],
  },
  PERFECT: {
    emoji: "⭐", headline: "Perfect Score!", subtext: "100% — flawless performance.",
    confettiColors: ["#f59e0b","#fbbf24","#fde68a","#ffffff"],
    confettiCount: 200, hapticPattern: [60, 30, 60, 30, 60, 30, 300],
  },
  COMPLETE: {
    emoji: "🏆", headline: "Assessment Complete!", subtext: "Your results are ready.",
    confettiColors: ["#1a56db","#7c3aed","#ec4899","#34d399"],
    confettiCount: 150, hapticPattern: [100, 50, 200],
  },
  STREAK_5: {
    emoji: "🔥", headline: "5 in a Row!", subtext: "Impressive streak — keep going!",
    confettiColors: ["#ef4444","#f97316","#fbbf24"],
    confettiCount: 60, hapticPattern: [40, 30, 40],
  },
  STREAK_10: {
    emoji: "💥", headline: "10-Streak!", subtext: "On fire! Outstanding consistency.",
    confettiColors: ["#ef4444","#f97316","#fbbf24","#ffffff"],
    confettiCount: 100, hapticPattern: [60, 30, 60, 30, 200],
  },
  FIRST_C1: {
    emoji: "🌟", headline: "C1 Territory!", subtext: "You answered a C1-level item correctly.",
    confettiColors: ["#7c3aed","#a78bfa","#c4b5fd","#1a56db"],
    confettiCount: 80, hapticPattern: [80, 40, 160],
  },
  MILESTONE: {
    emoji: "🎉", headline: "Milestone!", subtext: "Great progress — keep it up!",
    confettiColors: ["#1a56db","#34d399","#f59e0b"],
    confettiCount: 80, hapticPattern: [60, 40, 120],
  },
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useCelebration() {
  const [active, setActive]     = useState<CelebrationEvent | null>(null);
  const [config, setConfig]     = useState<CelebrationConfig | null>(null);
  const reduced = useReducedMotion();

  const trigger = useCallback((event: CelebrationEvent) => {
    const cfg = CONFIGS[event];
    setActive(event);
    setConfig(cfg);

    // Confetti
    if (!reduced) {
      confetti({
        particleCount:  cfg.confettiCount,
        spread:         80,
        origin:         { y: 0.5 },
        colors:         cfg.confettiColors,
        ticks:          200,
        gravity:        1.2,
        scalar:         0.9,
        shapes:         ["circle", "square"],
      });
      // Side bursts for big events
      if (event === "PERFECT" || event === "LEVEL_UP" || event === "COMPLETE") {
        setTimeout(() => {
          confetti({ particleCount: 40, angle: 60,  spread: 55, origin: { x: 0 }, colors: cfg.confettiColors });
          confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1 }, colors: cfg.confettiColors });
        }, 150);
      }
    }

    // Haptic
    if (cfg.hapticPattern && "vibrate" in navigator) {
      navigator.vibrate(cfg.hapticPattern);
    }

    // Auto-dismiss
    setTimeout(() => setActive(null), 3200);
  }, [reduced]);

  const dismiss = useCallback(() => setActive(null), []);

  return { active, config, trigger, dismiss };
}

// ── Celebration Banner ────────────────────────────────────────────────────────

export interface CelebrationBannerProps {
  event: CelebrationEvent | null;
  config: CelebrationConfig | null;
  onDismiss?: () => void;
}

export function CelebrationBanner({ event, config, onDismiss }: CelebrationBannerProps) {
  if (!event || !config) return null;

  return (
    <AnimatePresence>
      <m.div
        key={event}
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, y: -60, scale: 0.8 }}
        animate={{ opacity: 1, y:   0, scale: 1    }}
        exit={{   opacity: 0, y: -40, scale: 0.9   }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        onClick={onDismiss}
        style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 1900,
          background: "linear-gradient(135deg, var(--brand) 0%, var(--accent, #7c3aed) 100%)",
          color: "white", borderRadius: "var(--radius-2xl)",
          padding: "16px 28px", boxShadow: "var(--shadow-xl)",
          display: "flex", alignItems: "center", gap: 14,
          cursor: "pointer", userSelect: "none",
          minWidth: 280, maxWidth: "calc(100vw - 48px)",
        }}
      >
        <m.span
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 18, delay: 0.1 }}
          style={{ fontSize: 36, lineHeight: 1 }}
          aria-hidden="true"
        >
          {config.emoji}
        </m.span>
        <div>
          <m.p
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 }}
            style={{ fontWeight: 700, fontSize: "1.0625rem", margin: 0 }}
          >
            {config.headline}
          </m.p>
          <m.p
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18 }}
            style={{ fontSize: "0.8125rem", opacity: 0.85, margin: "2px 0 0" }}
          >
            {config.subtext}
          </m.p>
        </div>
      </m.div>
    </AnimatePresence>
  );
}

// ── Streak indicator ──────────────────────────────────────────────────────────

export function StreakBadge({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <m.div
      key={count}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 600, damping: 20 }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 10px", borderRadius: "var(--radius-full)",
        background: count >= 10
          ? "linear-gradient(135deg, #ef4444 0%, #f97316 100%)"
          : count >= 5
          ? "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)"
          : "var(--warning-subtle)",
        color: count >= 5 ? "white" : "var(--warning)",
        fontSize: "0.8125rem", fontWeight: 700,
      }}
    >
      <span aria-hidden="true">🔥</span>
      <span>{count}</span>
    </m.div>
  );
}
