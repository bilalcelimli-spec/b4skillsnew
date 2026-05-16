/**
 * Freemium Placement Test — Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  thetaToCefr,
  cefrConfidenceInterval,
  createPlacementSession,
  shouldStopPlacement,
  buildPlacementResult,
  validatePlacementResponse,
  isRapidGuess,
  DEFAULT_PLACEMENT_CONFIG,
  type PlacementSessionState,
} from "../placement-test.js";

// ─── thetaToCefr ──────────────────────────────────────────────────────────────

describe("thetaToCefr()", () => {
  it("maps theta ≥ 2.5 to C2", () => {
    expect(thetaToCefr(3.0)).toBe("C2");
    expect(thetaToCefr(2.5)).toBe("C2");
  });

  it("maps theta in [1.5, 2.5) to C1", () => {
    expect(thetaToCefr(2.0)).toBe("C1");
    expect(thetaToCefr(1.5)).toBe("C1");
  });

  it("maps theta in [0.5, 1.5) to B2", () => {
    expect(thetaToCefr(1.0)).toBe("B2");
    expect(thetaToCefr(0.5)).toBe("B2");
  });

  it("maps theta in [-0.5, 0.5) to B1", () => {
    expect(thetaToCefr(0.0)).toBe("B1");
    expect(thetaToCefr(-0.5)).toBe("B1");
  });

  it("maps theta in [-1.75, -0.5) to A2", () => {
    expect(thetaToCefr(-1.0)).toBe("A2");
  });

  it("maps theta in [-3.0, -1.75) to A1", () => {
    expect(thetaToCefr(-2.0)).toBe("A1");
  });

  it("maps theta < -3.0 to PRE_A1", () => {
    expect(thetaToCefr(-4.0)).toBe("PRE_A1");
  });
});

// ─── cefrConfidenceInterval ───────────────────────────────────────────────────

describe("cefrConfidenceInterval()", () => {
  it("returns [cefrLevel, thetaLow, thetaHigh] tuple", () => {
    const ci = cefrConfidenceInterval(0.0, 0.45);
    expect(ci).toHaveLength(3);
    expect(typeof ci[0]).toBe("string");
    expect(typeof ci[1]).toBe("number");
    expect(typeof ci[2]).toBe("number");
  });

  it("lower bound < theta < upper bound", () => {
    const theta = 0.5;
    const sem = 0.4;
    const [, lo, hi] = cefrConfidenceInterval(theta, sem);
    expect(lo).toBeLessThan(theta);
    expect(hi).toBeGreaterThan(theta);
  });

  it("width equals 2 × z × sem", () => {
    const theta = 0.0;
    const sem = 0.45;
    const z = 1.645;
    const [, lo, hi] = cefrConfidenceInterval(theta, sem, z);
    expect(hi - lo).toBeCloseTo(2 * z * sem, 2);
  });

  it("CEFR level matches thetaToCefr for the theta", () => {
    const theta = 1.2;
    const [level] = cefrConfidenceInterval(theta, 0.3);
    expect(level).toBe(thetaToCefr(theta));
  });
});

// ─── createPlacementSession ───────────────────────────────────────────────────

describe("createPlacementSession()", () => {
  it("creates a session with a unique UUID placementId", () => {
    const s1 = createPlacementSession(true);
    const s2 = createPlacementSession(true);
    expect(s1.placementId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(s1.placementId).not.toBe(s2.placementId);
  });

  it("initialises theta and sem from config", () => {
    const session = createPlacementSession(false);
    expect(session.theta).toBe(DEFAULT_PLACEMENT_CONFIG.startingTheta);
    expect(session.sem).toBe(DEFAULT_PLACEMENT_CONFIG.startingSem);
  });

  it("starts with empty responses and usedItemIds", () => {
    const session = createPlacementSession(true);
    expect(session.responses).toHaveLength(0);
    expect(session.usedItemIds.size).toBe(0);
  });

  it("stores the consentToResearch flag", () => {
    expect(createPlacementSession(true).consentToResearch).toBe(true);
    expect(createPlacementSession(false).consentToResearch).toBe(false);
  });

  it("sets startedAt to approximately now", () => {
    const before = Date.now();
    const session = createPlacementSession(true);
    expect(session.startedAt).toBeGreaterThanOrEqual(before);
    expect(session.startedAt).toBeLessThanOrEqual(Date.now());
  });
});

// ─── shouldStopPlacement ──────────────────────────────────────────────────────

describe("shouldStopPlacement()", () => {
  function state(n: number, sem: number): PlacementSessionState {
    return {
      placementId: "test-id",
      theta: 0,
      sem,
      responses: Array.from({ length: n }, (_, i) => ({
        itemId: `item-${i}`,
        score: 1 as 0 | 1,
        latencyMs: 5000,
      })),
      usedItemIds: new Set(),
      consentToResearch: false,
      startedAt: Date.now(),
    };
  }

  it("does not stop before minItems even if SEM is low", () => {
    const result = shouldStopPlacement(state(3, 0.2)); // 3 < minItems=6
    expect(result.stop).toBe(false);
  });

  it("stops when maxItems reached", () => {
    const result = shouldStopPlacement(state(12, 1.0));
    expect(result.stop).toBe(true);
    expect(result.reason).toBe("MAX_ITEMS_REACHED");
  });

  it("stops when SEM ≤ threshold after minItems", () => {
    const result = shouldStopPlacement(state(6, 0.40)); // 0.40 ≤ 0.45
    expect(result.stop).toBe(true);
    expect(result.reason).toBe("SEM_THRESHOLD_REACHED");
  });

  it("continues when SEM > threshold and n < maxItems", () => {
    const result = shouldStopPlacement(state(7, 0.50)); // 0.50 > 0.45
    expect(result.stop).toBe(false);
    expect(result.reason).toBeNull();
  });

  it("SEM exactly at threshold triggers stop", () => {
    const result = shouldStopPlacement(state(6, 0.45)); // exactly 0.45
    expect(result.stop).toBe(true);
  });
});

// ─── buildPlacementResult ─────────────────────────────────────────────────────

describe("buildPlacementResult()", () => {
  const session: PlacementSessionState = {
    placementId: "placement-xyz",
    theta: 0.75,
    sem: 0.42,
    responses: [
      { itemId: "i1", score: 1, latencyMs: 12000 },
      { itemId: "i2", score: 0, latencyMs: 8000 },
      { itemId: "i3", score: 1, latencyMs: 15000 },
      { itemId: "i4", score: 1, latencyMs: 9000 },
      { itemId: "i5", score: 0, latencyMs: 11000 },
      { itemId: "i6", score: 1, latencyMs: 7000 },
    ],
    usedItemIds: new Set(["i1", "i2", "i3", "i4", "i5", "i6"]),
    consentToResearch: true,
    startedAt: Date.now() - 300_000, // 5 minutes ago
  };

  it("returns the placementId from the session", () => {
    const result = buildPlacementResult(session);
    expect(result.placementId).toBe("placement-xyz");
  });

  it("cefrLevel matches thetaToCefr(theta)", () => {
    const result = buildPlacementResult(session);
    expect(result.cefrLevel).toBe(thetaToCefr(session.theta));
  });

  it("theta is rounded to 3 decimal places", () => {
    const result = buildPlacementResult(session);
    expect(result.theta.toString().split(".")[1]?.length ?? 0).toBeLessThanOrEqual(3);
  });

  it("itemsAdministered equals response count", () => {
    const result = buildPlacementResult(session);
    expect(result.itemsAdministered).toBe(6);
  });

  it("completionMs is positive", () => {
    const result = buildPlacementResult(session);
    expect(result.completionMs).toBeGreaterThan(0);
  });

  it("cefrConfidenceInterval is a [string, number, number] tuple", () => {
    const result = buildPlacementResult(session);
    const ci = result.cefrConfidenceInterval;
    expect(ci).toHaveLength(3);
    expect(typeof ci[0]).toBe("string");
    expect(ci[1]).toBeLessThan(ci[2]);
  });

  it("upgradePrompt includes WRITING and SPEAKING skills", () => {
    const result = buildPlacementResult(session);
    expect(result.upgradePrompt.skills).toContain("WRITING");
    expect(result.upgradePrompt.skills).toContain("SPEAKING");
  });

  it("upgradePrompt callToActionUrl contains the CEFR level", () => {
    const result = buildPlacementResult(session);
    expect(result.upgradePrompt.callToActionUrl).toContain(result.cefrLevel);
  });

  it("uses appBaseUrl when provided", () => {
    const result = buildPlacementResult(session, "https://b4skills.com");
    expect(result.upgradePrompt.callToActionUrl).toContain("https://b4skills.com");
  });
});

// ─── validatePlacementResponse ────────────────────────────────────────────────

describe("validatePlacementResponse()", () => {
  it("returns null for a valid response", () => {
    expect(validatePlacementResponse("item-abc", 1, 12000)).toBeNull();
    expect(validatePlacementResponse("item-abc", 0, 5000)).toBeNull();
  });

  it("returns error for missing itemId", () => {
    expect(validatePlacementResponse("", 1, 5000)).not.toBeNull();
    expect(validatePlacementResponse("", 1, 5000)).toMatch(/itemId/);
  });

  it("returns error for invalid score (not 0 or 1)", () => {
    expect(validatePlacementResponse("item-1", 0.5, 5000)).toMatch(/score/);
    expect(validatePlacementResponse("item-1", 2, 5000)).toMatch(/score/);
  });

  it("returns error for negative latency", () => {
    expect(validatePlacementResponse("item-1", 1, -1)).toMatch(/latencyMs/);
  });

  it("returns error for latency exceeding 300s", () => {
    expect(validatePlacementResponse("item-1", 1, 300_001)).toMatch(/latencyMs/);
  });

  it("accepts latency at boundary (0 and 300000)", () => {
    expect(validatePlacementResponse("item-1", 1, 0)).toBeNull();
    expect(validatePlacementResponse("item-1", 1, 300_000)).toBeNull();
  });
});

// ─── isRapidGuess ─────────────────────────────────────────────────────────────

describe("isRapidGuess()", () => {
  it("flags response under 1500ms as rapid guess regardless of difficulty", () => {
    expect(isRapidGuess(1000, 0.0)).toBe(true);
    expect(isRapidGuess(500, -1.5)).toBe(true);
  });

  it("does not flag reasonable response time", () => {
    // difficulty=0 → expectedMs = 10,000ms; 10% = 1,000ms; 5000ms is fine
    expect(isRapidGuess(5000, 0.0)).toBe(false);
  });

  it("flags response at < 10% of expected time", () => {
    // difficulty=2 → expectedMs = 10000 + 2*5000 = 20000ms; 10% = 2000ms
    // 1800ms < 2000ms → rapid guess (but also ≥ 1500ms, so the 10% rule fires)
    expect(isRapidGuess(1800, 2.0)).toBe(true);
  });

  it("does not flag when time is comfortably above 10% expected", () => {
    // difficulty=0 → expectedMs=10000; 10%=1000ms; 3000ms is well above
    expect(isRapidGuess(3000, 0.0)).toBe(false);
  });
});
