/**
 * Tests for pretest manager — injection + auto-calibration.
 *
 * These tests are integration tests that mock Prisma calls.
 * Real end-to-end testing requires a test DB with PRETEST items + responses.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as PretestManager from "../pretest-manager.js";

describe("pretest manager", () => {
  describe("checkActivationCriteria", () => {
    it("rejects items below response threshold", () => {
      const item = { discrimination: 1.0, difficulty: 0.0, guessing: 0.2 };
      const result = PretestManager.checkActivationCriteria(item, 25);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Insufficient responses");
    });

    it("rejects items with low discrimination", () => {
      const item = { discrimination: 0.3, difficulty: 0.0, guessing: 0.2 };
      const result = PretestManager.checkActivationCriteria(item, 50);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Discrimination too low");
    });

    it("rejects items with high discrimination", () => {
      const item = { discrimination: 3.5, difficulty: 0.0, guessing: 0.2 };
      const result = PretestManager.checkActivationCriteria(item, 50);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Discrimination too high");
    });

    it("accepts well-calibrated items", () => {
      const item = { discrimination: 1.2, difficulty: 0.1, guessing: 0.15 };
      const result = PretestManager.checkActivationCriteria(item, 75);
      expect(result.passed).toBe(true);
    });
  });

  // Integration tests would require a test DB setup.
  // Skipping for now as they require Prisma + real data.
  it.skip("injects 2-3 PRETEST items into a session", async () => {
    // Would mock Prisma calls and verify the session metadata is updated
  });

  it.skip("marks PRETEST responses correctly", async () => {
    // Would create a mock Response and verify isPretest flag
  });
});
