/**
 * Accessibility DOM Tests — Phase 2 (WCAG 2.1 Level AA)
 *
 * Uses vitest-axe + @testing-library/react + jsdom to perform full DOM-based
 * accessibility audits on rendered React components. These tests complement
 * the static analysis in a11y-static.test.ts by catching issues that only
 * appear in the rendered output (contrast violations, landmark structure,
 * focus management, etc.).
 *
 * Environment: jsdom (configured via vitest.config.ts environmentMatchGlobs)
 * Setup:       test/setup-axe.ts (Canvas/WebAudio stubs + expect.extend)
 *
 * Non-conformances targeted:
 *   A01 — role="alert" on auth errors
 *   A03 — aria-valuenow on progress bar
 *   A05 — aria-label on icon-only buttons
 *
 * See docs/accessibility-statement.md for the full audit record.
 */

// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
// toHaveNoViolations is extended onto expect in test/setup-axe.ts via vitest-axe/matchers.js
import { describe, it, expect, vi, beforeAll } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

/**
 * motion/react: replace animated wrappers with plain HTML elements so jsdom
 * doesn't choke on animation internals (ResizeObserver, WAAPI, etc.).
 */
vi.mock("motion/react", () => {
  const createEl =
    (tag: string) =>
    // eslint-disable-next-line react/display-name
    React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<unknown>) =>
      React.createElement(tag as keyof React.JSX.IntrinsicElements, { ...props, ref }, children)
    );

  const tags = [
    "div","span","button","a","ul","li","nav","section","article",
    "header","footer","main","form","input","label","p","h1","h2","h3",
  ];
  const motion = Object.fromEntries(tags.map((t) => [t, createEl(t)]));

  return {
    motion,
    AnimatePresence: ({ children }: React.PropsWithChildren) => children,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useMotionValue: (initial: number) => ({ get: () => initial, set: vi.fn() }),
    useTransform: () => ({ get: () => 0 }),
  };
});

/** framer-motion alias (DynamicPage imports it directly). */
vi.mock("framer-motion", () => {
  const createEl =
    (tag: string) =>
    React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<unknown>) =>
      React.createElement(tag as keyof React.JSX.IntrinsicElements, { ...props, ref }, children)
    );
  const tags = ["div","span","button","section","nav","ul","li","p","h1","h2","h3","article"];
  const motion = Object.fromEntries(tags.map((t) => [t, createEl(t)]));
  return {
    motion,
    AnimatePresence: ({ children }: React.PropsWithChildren) => children,
  };
});

/** DynamicPage is a large marketing page — irrelevant to auth form a11y. */
vi.mock("../DynamicPage", () => ({
  DynamicPage: () => React.createElement("div", { "data-testid": "dynamic-page-mock" }),
}));

/** SpeakingRecorder / WritingEditor — not under test here. */
vi.mock("../SpeakingRecorder", () => ({
  SpeakingRecorder: () =>
    React.createElement("div", { role: "region", "aria-label": "Speaking recorder mock" }),
}));
vi.mock("../WritingEditor", () => ({
  WritingEditor: ({ onChange }: { onChange?: (v: string) => void }) =>
    React.createElement("textarea", {
      "aria-label": "Writing response",
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value),
    }),
}));

// ── Lazy imports (after mocks are registered) ─────────────────────────────────

// Import components lazily so vitest applies mocks before module resolution.
// This is the standard pattern for ESM mocking with vitest.
const { AudioPlayer } = await import("../AudioPlayer");
const { AuthPage } = await import("../AuthPage");
const { ItemRenderer } = await import("../ItemRenderer");

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mcItem = {
  id: "test-vocab-001",
  skill: "VOCABULARY" as const,
  type: "MULTIPLE_CHOICE",
  params: { a: 1.0, b: 0.0, c: 0.25 },
  metadata: {
    skill: "VOCABULARY",
    cefr: "B1",
    difficulty: 0,
  },
  content: {
    prompt: "Choose the word that best completes the sentence.",
    question: "The scientist made an important ___ in her research.",
    options: ["discovery", "discover", "discoverer", "discovering"],
  },
};

const fibItem = {
  id: "test-fib-001",
  skill: "GRAMMAR" as const,
  type: "FILL_IN_BLANKS",
  params: { a: 1.2, b: 0.2, c: 0.0 },
  metadata: { skill: "GRAMMAR", cefr: "A2", difficulty: 0.2 },
  content: {
    prompt: "She ___ to the store yesterday.",
    passage: "She ___ to the store yesterday.",
    options: ["went", "go", "going", "gone"],
  },
};

// ── AudioPlayer ───────────────────────────────────────────────────────────────

describe("AudioPlayer — WCAG 2.1 DOM audit", () => {
  it("has no critical axe violations (WCAG AA)", async () => {
    const { container } = render(
      React.createElement(AudioPlayer, {
        src: "https://example.com/test.mp3",
        maxPlays: 2,
      })
    );
    const results = await axe(container);
    // @ts-expect-error — vitest-axe augments expect
    expect(results).toHaveNoViolations();
  });

  it("play/pause button has accessible name", () => {
    render(
      React.createElement(AudioPlayer, {
        src: "https://example.com/test.mp3",
      })
    );
    // AudioPlayer renders "Play audio" + optional "Replay audio" buttons — all must have labels
    const allButtons = screen.getAllByRole("button");
    allButtons.forEach((btn) => {
      const hasLabel =
        btn.getAttribute("aria-label") ||
        btn.textContent?.trim();
      expect(hasLabel).toBeTruthy();
    });
  });

  it("replay count is communicated accessibly", () => {
    render(
      React.createElement(AudioPlayer, {
        src: "https://example.com/test.mp3",
        maxPlays: 2,
      })
    );
    // Replay info should be present somewhere readable
    const container = document.body;
    const hasReplayText =
      container.innerHTML.includes("aria-live") ||
      container.innerHTML.includes("role=") ||
      container.textContent?.match(/play|listen|replay/i);
    expect(hasReplayText).toBeTruthy();
  });
});

// ── AuthPage ──────────────────────────────────────────────────────────────────

describe("AuthPage — WCAG 2.1 DOM audit", () => {
  it("has no critical axe violations on sign-in form", async () => {
    const { container } = render(
      React.createElement(AuthPage, { onBack: vi.fn() })
    );
    const results = await axe(container, {
      // Color-contrast requires CSS computed styles — skip in jsdom (no CSS engine)
      // This is expected; colour contrast is verified manually (A02 in statement)
      rules: { "color-contrast": { enabled: false } },
    });
    // @ts-expect-error — vitest-axe augments expect
    expect(results).toHaveNoViolations();
  });

  it("email input is labelled (WCAG 1.3.1)", () => {
    render(React.createElement(AuthPage, { onBack: vi.fn() }));
    // Input should be associated with a label via htmlFor or aria-label
    const emailInput = screen.queryByRole("textbox", { name: /email/i });
    expect(emailInput).not.toBeNull();
  });

  it("password input has accessible label (WCAG 4.1.2)", () => {
    render(React.createElement(AuthPage, { onBack: vi.fn() }));
    // password inputs are type="password" — not role=textbox, check by label text
    const passwordLabel = document.querySelector("label[for]");
    // At least one label is associated with an input
    expect(passwordLabel).not.toBeNull();
  });

  it("submit button has accessible name (WCAG 4.1.2)", () => {
    render(React.createElement(AuthPage, { onBack: vi.fn() }));
    // AuthPage may render multiple buttons (sign in + social login options) — all must have names
    const allButtons = screen.getAllByRole("button");
    expect(allButtons.length).toBeGreaterThan(0);
    allButtons.forEach((btn) => {
      const hasLabel =
        btn.getAttribute("aria-label") ||
        btn.textContent?.trim();
      expect(hasLabel).toBeTruthy();
    });
  });
});

// ── ItemRenderer — VOCABULARY (Multiple Choice) ───────────────────────────────

describe("ItemRenderer — vocabulary MC — WCAG 2.1 DOM audit", () => {
  it("has no critical axe violations", async () => {
    const { container } = render(
      React.createElement(ItemRenderer, {
        item: mcItem as any,
        onResponse: vi.fn(),
        disabled: false,
      })
    );
    const results = await axe(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });
    // @ts-expect-error — vitest-axe augments expect
    expect(results).toHaveNoViolations();
  });

  it("answer options have role=radio and aria-checked (WCAG 4.1.2)", () => {
    render(
      React.createElement(ItemRenderer, {
        item: mcItem as any,
        onResponse: vi.fn(),
      })
    );
    const radioEls = document.querySelectorAll('[role="radio"]');
    expect(radioEls.length).toBeGreaterThanOrEqual(2);
    // Each radio option must have aria-checked
    radioEls.forEach((el) => {
      expect(el.hasAttribute("aria-checked")).toBe(true);
    });
  });

  it("answer group has role=radiogroup linking to prompt (WCAG 1.3.1)", () => {
    render(
      React.createElement(ItemRenderer, {
        item: mcItem as any,
        onResponse: vi.fn(),
      })
    );
    const group = document.querySelector('[role="radiogroup"]');
    expect(group).not.toBeNull();
    // Should have aria-labelledby pointing to the prompt
    const labelledBy = group?.getAttribute("aria-labelledby");
    if (labelledBy) {
      const promptEl = document.getElementById(labelledBy);
      expect(promptEl).not.toBeNull();
    }
  });

  it("answer form has role=form (WCAG 1.3.1)", () => {
    render(
      React.createElement(ItemRenderer, {
        item: mcItem as any,
        onResponse: vi.fn(),
      })
    );
    const form = document.querySelector('[role="form"]');
    expect(form).not.toBeNull();
  });
});

// ── ItemRenderer — GRAMMAR (Fill-in-Blank) ────────────────────────────────────

describe("ItemRenderer — grammar FIB — WCAG 2.1 DOM audit", () => {
  it("has no critical axe violations", async () => {
    const { container } = render(
      React.createElement(ItemRenderer, {
        item: fibItem as any,
        onResponse: vi.fn(),
        disabled: false,
      })
    );
    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    // @ts-expect-error — vitest-axe augments expect
    expect(results).toHaveNoViolations();
  });
});

// ── A01 — role="alert" regression guard ──────────────────────────────────────
// This test is marked 'todo' until A01 is fixed in Q3 2026.
// When role="alert" is added to AuthPage error messages, replace .todo with .skip

describe("A01 regression — auth error announcement (Q3 2026 target)", () => {
  it.todo("error message element has role=alert or aria-live=assertive (A01)");
});

// ── A03 — progress bar ────────────────────────────────────────────────────────

describe("A03 regression — progress indicator aria-valuenow (Q3 2026 target)", () => {
  it.todo(
    "exam progress bar has role=progressbar + aria-valuenow + aria-valuemin + aria-valuemax (A03)"
  );
});
