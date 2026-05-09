/**
 * Axe-core DOM Test Setup
 *
 * Extends vitest's `expect` with axe matchers and wires up cleanup.
 * Registered globally in vitest.config.ts setupFiles, but all DOM-specific
 * stubs are guarded behind `typeof window !== "undefined"` so this file is
 * safe to load in node environment too (no-op for non-jsdom tests).
 *
 * Phase 2 — see docs/accessibility-statement.md §3.
 */

import * as axeMatchers from "vitest-axe/matchers.js";
import { expect, afterEach } from "vitest";

// Wire all axe matchers (toHaveNoViolations, etc.) into vitest's expect.
// This is safe in node — it just adds matcher functions that won't be called.
expect.extend(axeMatchers);

// ── All DOM setup is guarded: no-op in node environment ──────────────────────

if (typeof window !== "undefined") {
  // Import @testing-library/react cleanup dynamically to avoid loading
  // react-dom in node environment where it's not needed.
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());

  // ── Canvas stub (jsdom does not implement Canvas API) ──────────────────────
  // AudioPlayer renders a waveform via canvas; stub prevents "not implemented".
  Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
    value: () => ({
      clearRect: () => {},
      fillRect: () => {},
      fillText: () => {},
      beginPath: () => {},
      closePath: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      lineTo: () => {},
      moveTo: () => {},
      scale: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      drawImage: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      lineWidth: 0,
      strokeStyle: "",
      fillStyle: "",
      font: "",
      textAlign: "left",
    }),
    writable: true,
  });

  // ── Web Audio API stub ──────────────────────────────────────────────────────
  (globalThis as any).AudioContext = class {
    createAnalyser() {
      return {
        connect: () => {},
        disconnect: () => {},
        fftSize: 256,
        frequencyBinCount: 128,
        getByteTimeDomainData: () => {},
      };
    }
    createMediaElementSource() {
      return { connect: () => {} };
    }
    state = "running";
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  };

  // ── MediaRecorder stub (SpeakingRecorder) ──────────────────────────────────
  (globalThis as any).MediaRecorder = class {
    static isTypeSupported() { return true; }
    start() {}
    stop() {}
    pause() {}
    resume() {}
    addEventListener() {}
    removeEventListener() {}
    state = "inactive";
  };

  // ── ResizeObserver stub (motion/react internals) ────────────────────────────
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
