import { describe, it, expect } from "vitest";
import {
  extractItemFeatures,
  viterbiDecode,
  analyseSession,
  parseEventLog,
  type ItemClickstream,
  type ItemFeatures,
} from "../clickstream";

// ────────────────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────────────────

const T0 = 1_000_000; // arbitrary session start ms

function makeItem(
  id: string,
  durationMs: number,
  keystrokes: number,
  clicks: number,
  focusLossMs = 0,
  overridePresentedAt?: number,
): ItemClickstream {
  const presentedAt = overridePresentedAt ?? T0;
  const submittedAt = presentedAt + durationMs;

  const keystrokeEvents = Array.from({ length: keystrokes }, (_, i) => ({
    timestamp: presentedAt + Math.floor((durationMs * (i + 1)) / (keystrokes + 1)),
  }));

  const clickEvents = Array.from({ length: clicks }, (_, i) => ({
    timestamp: presentedAt + Math.floor((durationMs * (i + 1)) / (clicks + 1)),
    target: `option_${i % 4}`,
  }));

  const focusLossIntervals = focusLossMs > 0
    ? [{ start: presentedAt + 1000, end: presentedAt + 1000 + focusLossMs }]
    : [];

  return {
    itemId: id,
    presentedAt,
    submittedAt,
    clicks: clickEvents,
    keystrokes: keystrokeEvents,
    focusLossIntervals,
    scrollCount: 2,
    audioPlayCount: 0,
  };
}

/** 90s item with moderate activity — "normal" engaged item */
const ENGAGED_ITEM = makeItem("i1", 90_000, 10, 3);
/** 8s item with 0 keystrokes — rapid guess (< 10% of 90s = 9s) */
const RAPID_ITEM = makeItem("i2", 8_000, 0, 1);
/** 180s item with many keystrokes and revisions — hesitant */
const HESITANT_ITEM = makeItem("i3", 180_000, 25, 6);

// ────────────────────────────────────────────────────────────────────────────
// extractItemFeatures
// ────────────────────────────────────────────────────────────────────────────

describe("extractItemFeatures", () => {
  it("computes responseTime correctly", () => {
    const f = extractItemFeatures(ENGAGED_ITEM);
    expect(f.responseTime).toBe(90_000);
  });

  it("normalisedSpeed is responseTime / 90000", () => {
    const f = extractItemFeatures(ENGAGED_ITEM);
    expect(f.normalisedSpeed).toBeCloseTo(90_000 / 90_000, 5);
  });

  it("rapid item has normalisedSpeed < 0.10", () => {
    const f = extractItemFeatures(RAPID_ITEM);
    expect(f.normalisedSpeed).toBeLessThan(0.10);
  });

  it("counts keystrokes correctly", () => {
    const f = extractItemFeatures(ENGAGED_ITEM);
    expect(f.keystrokeCount).toBe(10);
  });

  it("counts clicks correctly", () => {
    const f = extractItemFeatures(ENGAGED_ITEM);
    expect(f.clickCount).toBe(3);
  });

  it("focusLossTime matches interval duration", () => {
    const item = makeItem("fx", 90_000, 5, 2, 15_000);
    const f = extractItemFeatures(item);
    expect(f.focusLossTime).toBe(15_000);
  });

  it("activeTime is non-negative", () => {
    const f = extractItemFeatures(RAPID_ITEM);
    expect(f.activeTime).toBeGreaterThanOrEqual(0);
  });

  it("detects answer changes when option switches", () => {
    const item: ItemClickstream = {
      itemId: "ac",
      presentedAt: T0,
      submittedAt: T0 + 60_000,
      clicks: [
        { timestamp: T0 + 5_000,  target: "option_0" },
        { timestamp: T0 + 20_000, target: "option_1" }, // change
        { timestamp: T0 + 40_000, target: "option_2" }, // change
      ],
      keystrokes: [],
      focusLossIntervals: [],
      scrollCount: 0,
    };
    const f = extractItemFeatures(item);
    expect(f.answerChanges).toBe(2);
  });

  it("returns zero answerChanges when no clicks", () => {
    const item: ItemClickstream = {
      itemId: "no_click",
      presentedAt: T0,
      submittedAt: T0 + 10_000,
      clicks: [],
      keystrokes: [],
      focusLossIntervals: [],
      scrollCount: 0,
    };
    const f = extractItemFeatures(item);
    expect(f.answerChanges).toBe(0);
  });

  it("scrollCount propagated correctly", () => {
    const f = extractItemFeatures(ENGAGED_ITEM);
    expect(f.scrollCount).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// viterbiDecode
// ────────────────────────────────────────────────────────────────────────────

describe("viterbiDecode", () => {
  it("returns empty array for empty input", () => {
    expect(viterbiDecode([])).toEqual([]);
  });

  it("returns one estimate per feature", () => {
    const features = [ENGAGED_ITEM, RAPID_ITEM, HESITANT_ITEM].map(extractItemFeatures);
    const seq = viterbiDecode(features);
    expect(seq).toHaveLength(3);
  });

  it("each state is one of the valid HMM states", () => {
    const features = [ENGAGED_ITEM, RAPID_ITEM, HESITANT_ITEM].map(extractItemFeatures);
    const seq = viterbiDecode(features);
    for (const s of seq) {
      expect(["engaged", "hesitant", "rapid_guess"]).toContain(s.state);
    }
  });

  it("probabilities sum to ≈1", () => {
    const features = [extractItemFeatures(ENGAGED_ITEM)];
    const seq = viterbiDecode(features);
    const sum = seq[0]!.probabilities.reduce((s, p) => s + p, 0);
    expect(sum).toBeCloseTo(1, 4);
  });

  it("probabilities are all non-negative", () => {
    const features = [ENGAGED_ITEM, RAPID_ITEM].map(extractItemFeatures);
    const seq = viterbiDecode(features);
    for (const s of seq) {
      for (const p of s.probabilities) expect(p).toBeGreaterThanOrEqual(0);
    }
  });

  it("rapid item has elevated rapid_guess posterior probability", () => {
    // A 5s, zero-keystroke item should elevate rapid_guess probability
    const veryRapid: ItemClickstream = makeItem("vr", 5_000, 0, 1);
    const [feat] = [extractItemFeatures(veryRapid)];
    const [estimate] = viterbiDecode([feat!]);
    const rapidProb = estimate!.probabilities[2]!;
    // rapid_guess should be substantially elevated above its prior (0.10)
    expect(rapidProb).toBeGreaterThan(0.25);
  });

  it("sequence of rapid items converges to rapid_guess state", () => {
    // Three consecutive rapid items — HMM transitions should lock to rapid_guess
    const rapidFeats = Array.from({ length: 3 }, (_, i) =>
      extractItemFeatures(makeItem(`vr${i}`, 5_000, 0, 1)),
    );
    const seq = viterbiDecode(rapidFeats);
    // Last item in the sequence should be in rapid_guess state
    expect(seq[seq.length - 1]!.state).toBe("rapid_guess");
  });

  it("long deliberate item has engaged or hesitant as most likely", () => {
    const feat = extractItemFeatures(HESITANT_ITEM);
    const [est] = viterbiDecode([feat]);
    expect(["engaged", "hesitant"]).toContain(est!.state);
  });

  it("preserves itemId in output", () => {
    const feat = extractItemFeatures(ENGAGED_ITEM);
    const [est] = viterbiDecode([feat]);
    expect(est!.itemId).toBe("i1");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// analyseSession
// ────────────────────────────────────────────────────────────────────────────

describe("analyseSession", () => {
  it("handles empty input gracefully", () => {
    const profile = analyseSession([]);
    expect(profile.itemCount).toBe(0);
    expect(profile.lowEffortFlag).toBe(false);
    expect(profile.riskLevel).toBe("LOW");
  });

  it("computes itemCount correctly", () => {
    const profile = analyseSession([ENGAGED_ITEM, RAPID_ITEM, HESITANT_ITEM]);
    expect(profile.itemCount).toBe(3);
  });

  it("meanResponseTime is average of item durations", () => {
    const items = [makeItem("a", 60_000, 5, 2), makeItem("b", 120_000, 10, 3)];
    const profile = analyseSession(items);
    expect(profile.meanResponseTime).toBeCloseTo(90_000, 0);
  });

  it("stateProportions sum to 1", () => {
    const profile = analyseSession([ENGAGED_ITEM, RAPID_ITEM, HESITANT_ITEM]);
    const total = profile.stateProportions.engaged
               + profile.stateProportions.hesitant
               + profile.stateProportions.rapid_guess;
    expect(total).toBeCloseTo(1, 6);
  });

  it("flags low effort when >25% of items are rapid-guess", () => {
    // 3 rapid items out of 4 = 75% → low effort
    const rapidItems = Array.from({ length: 3 }, (_, i) => makeItem(`r${i}`, 5_000, 0, 1));
    const normalItem = makeItem("n1", 90_000, 10, 3);
    const profile = analyseSession([...rapidItems, normalItem]);
    expect(profile.lowEffortFlag).toBe(true);
    expect(profile.rapidGuessCount).toBe(3);
  });

  it("does not flag low effort for a normal session", () => {
    const items = Array.from({ length: 10 }, (_, i) => makeItem(`n${i}`, 90_000, 10, 3));
    const profile = analyseSession(items);
    expect(profile.lowEffortFlag).toBe(false);
  });

  it("riskLevel HIGH when >50% rapid-guess", () => {
    const rapidItems = Array.from({ length: 6 }, (_, i) => makeItem(`r${i}`, 5_000, 0, 1));
    const normalItems = Array.from({ length: 4 }, (_, i) => makeItem(`n${i}`, 90_000, 8, 2));
    const profile = analyseSession([...rapidItems, ...normalItems]);
    expect(profile.riskLevel).toBe("HIGH");
  });

  it("flags low effort when focus-loss proportion exceeds threshold", () => {
    // 50% of each item's time is focus-lost → proportion well above 0.15
    const items = Array.from({ length: 5 }, (_, i) =>
      makeItem(`fl${i}`, 60_000, 5, 2, 30_000), // 30s focus loss in 60s item
    );
    const profile = analyseSession(items);
    expect(profile.focusLossProportion).toBeGreaterThan(0.15);
    expect(profile.lowEffortFlag).toBe(true);
  });

  it("itemFeatures array matches input length", () => {
    const items = [ENGAGED_ITEM, RAPID_ITEM, HESITANT_ITEM];
    const profile = analyseSession(items);
    expect(profile.itemFeatures).toHaveLength(3);
  });

  it("hmmSequence array matches input length", () => {
    const items = [ENGAGED_ITEM, RAPID_ITEM, HESITANT_ITEM];
    const profile = analyseSession(items);
    expect(profile.hmmSequence).toHaveLength(3);
  });

  it("cvResponseTime is non-negative", () => {
    const profile = analyseSession([ENGAGED_ITEM, RAPID_ITEM, HESITANT_ITEM]);
    expect(profile.cvResponseTime).toBeGreaterThanOrEqual(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// parseEventLog
// ────────────────────────────────────────────────────────────────────────────

describe("parseEventLog", () => {
  it("parses click events", () => {
    const events = [
      { type: "click" as const, timestamp: T0 + 5000, x: 100, y: 200, target: "option_A" },
    ];
    const item = parseEventLog("i1", T0, T0 + 30_000, events);
    expect(item.clicks).toHaveLength(1);
    expect(item.clicks[0]!.target).toBe("option_A");
  });

  it("parses keydown events", () => {
    const events = [
      { type: "keydown" as const, timestamp: T0 + 2000, key: "a" },
      { type: "keydown" as const, timestamp: T0 + 3000, key: "b" },
    ];
    const item = parseEventLog("i2", T0, T0 + 30_000, events);
    expect(item.keystrokes).toHaveLength(2);
  });

  it("parses focus_loss and focus_gain into intervals", () => {
    const events = [
      { type: "focus_loss" as const, timestamp: T0 + 5_000 },
      { type: "focus_gain" as const, timestamp: T0 + 15_000 },
    ];
    const item = parseEventLog("i3", T0, T0 + 30_000, events);
    expect(item.focusLossIntervals).toHaveLength(1);
    expect(item.focusLossIntervals[0]!.end - item.focusLossIntervals[0]!.start).toBe(10_000);
  });

  it("closes focus_loss interval at submittedAt if no focus_gain", () => {
    const events = [{ type: "focus_loss" as const, timestamp: T0 + 5_000 }];
    const item = parseEventLog("i4", T0, T0 + 30_000, events);
    expect(item.focusLossIntervals[0]!.end).toBe(T0 + 30_000);
  });

  it("counts scroll events", () => {
    const events = [
      { type: "scroll" as const, timestamp: T0 + 1000 },
      { type: "scroll" as const, timestamp: T0 + 2000 },
      { type: "scroll" as const, timestamp: T0 + 3000 },
    ];
    const item = parseEventLog("i5", T0, T0 + 30_000, events);
    expect(item.scrollCount).toBe(3);
  });

  it("propagates audioPlayCount", () => {
    const item = parseEventLog("i6", T0, T0 + 30_000, [], 3);
    expect(item.audioPlayCount).toBe(3);
  });

  it("returns empty arrays for empty event log", () => {
    const item = parseEventLog("i7", T0, T0 + 30_000, []);
    expect(item.clicks).toHaveLength(0);
    expect(item.keystrokes).toHaveLength(0);
    expect(item.focusLossIntervals).toHaveLength(0);
    expect(item.scrollCount).toBe(0);
  });
});
