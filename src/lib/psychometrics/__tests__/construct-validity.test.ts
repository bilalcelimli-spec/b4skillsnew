import { describe, it, expect } from "vitest";
import {
  pearson,
  correlationMatrix,
  cronbachAlpha,
  mtmmReport,
  auditConstructValidity,
  type TraitSample,
  type MtmmGroup,
} from "../construct-validity";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rng: () => number): number {
  const u1 = Math.max(1e-9, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const TRAITS = ["grammar", "vocabulary", "coherence", "taskRelevance"];

/**
 * Generate samples where two latent traits drive observed scores:
 *   accuracy = N(0,1)   →  grammar, vocabulary
 *   discourse = N(0,1)  →  coherence, taskRelevance
 * Inter-trait correlation within a latent dimension is high; across
 * dimensions it is low. Used to validate MTMM separation.
 */
function generateTwoFactorSamples(
  n: number,
  seed = 12345,
  noise = 0.4
): TraitSample[] {
  const rng = mulberry32(seed);
  const samples: TraitSample[] = [];
  for (let i = 0; i < n; i++) {
    const accuracy = randn(rng);
    const discourse = randn(rng);
    samples.push({
      scores: {
        grammar:       accuracy + noise * randn(rng),
        vocabulary:    accuracy + noise * randn(rng),
        coherence:     discourse + noise * randn(rng),
        taskRelevance: discourse + noise * randn(rng),
      },
    });
  }
  return samples;
}

describe("pearson()", () => {
  it("returns 1 for perfectly correlated arrays", () => {
    expect(pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBeCloseTo(1, 6);
  });

  it("returns -1 for perfectly inverse arrays", () => {
    expect(pearson([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1, 6);
  });

  it("returns 0 when one array is constant (no variance)", () => {
    expect(pearson([1, 1, 1, 1], [4, 5, 6, 7])).toBe(0);
  });

  it("matches a hand-computed correlation", () => {
    // X=[1,2,3,4,5], Y=[2,1,4,3,5]
    //   Σ(xi-3)(yi-3) = 8;  Σ(xi-3)² = 10;  Σ(yi-3)² = 10
    //   r = 8 / √(10·10) = 0.8
    expect(pearson([1, 2, 3, 4, 5], [2, 1, 4, 3, 5])).toBeCloseTo(0.8, 4);
  });
});

describe("correlationMatrix()", () => {
  it("produces a symmetric matrix with 1s on the diagonal", () => {
    const samples = generateTwoFactorSamples(50);
    const cm = correlationMatrix(samples, TRAITS);
    expect(cm.traits).toEqual(TRAITS);
    for (let i = 0; i < TRAITS.length; i++) {
      expect(cm.matrix[i][i]).toBeCloseTo(1, 6);
      for (let j = 0; j < TRAITS.length; j++) {
        expect(cm.matrix[i][j]).toBeCloseTo(cm.matrix[j][i], 8);
      }
    }
  });

  it("recovers the two-factor structure: within-factor r > between-factor r", () => {
    // Tighter noise here to make the within-factor signal clearly visible
    const samples = generateTwoFactorSamples(300, 99, 0.3);
    const cm = correlationMatrix(samples, TRAITS);
    const idx = (t: string) => TRAITS.indexOf(t);

    const grammarVocab = cm.matrix[idx("grammar")][idx("vocabulary")];
    const cohereTask = cm.matrix[idx("coherence")][idx("taskRelevance")];
    const grammarCohere = cm.matrix[idx("grammar")][idx("coherence")];
    const vocabTask = cm.matrix[idx("vocabulary")][idx("taskRelevance")];

    // Within-factor correlations should be substantially higher
    expect(grammarVocab).toBeGreaterThan(0.80);
    expect(cohereTask).toBeGreaterThan(0.80);
    // Between-factor correlations should be near zero
    expect(Math.abs(grammarCohere)).toBeLessThan(0.20);
    expect(Math.abs(vocabTask)).toBeLessThan(0.20);
  });
});

describe("cronbachAlpha()", () => {
  it("returns 0 with too few samples or too few traits", () => {
    expect(cronbachAlpha([], TRAITS).alpha).toBe(0);
    expect(cronbachAlpha([{ scores: { a: 1 } }], ["a"]).alpha).toBe(0);
  });

  it("is high (> 0.85) on a strongly correlated trait set", () => {
    // Single-factor data: one latent ability drives all four traits
    const rng = mulberry32(7);
    const samples: TraitSample[] = [];
    for (let i = 0; i < 200; i++) {
      const ability = randn(rng);
      samples.push({
        scores: {
          grammar:       ability + 0.15 * randn(rng),
          vocabulary:    ability + 0.15 * randn(rng),
          coherence:     ability + 0.15 * randn(rng),
          taskRelevance: ability + 0.15 * randn(rng),
        },
      });
    }
    const r = cronbachAlpha(samples, TRAITS);
    expect(r.alpha).toBeGreaterThan(0.85);
    expect(["good", "excellent"]).toContain(r.interpretation);
  });

  it("is low when traits are independent (no shared factor)", () => {
    const rng = mulberry32(1234);
    const samples: TraitSample[] = [];
    for (let i = 0; i < 200; i++) {
      samples.push({
        scores: {
          grammar:       randn(rng),
          vocabulary:    randn(rng),
          coherence:     randn(rng),
          taskRelevance: randn(rng),
        },
      });
    }
    const r = cronbachAlpha(samples, TRAITS);
    expect(r.alpha).toBeLessThan(0.30);
    expect(r.interpretation).toBe("poor");
  });
});

describe("mtmmReport()", () => {
  const groups: MtmmGroup[] = [
    { name: "Accuracy", traits: ["grammar", "vocabulary"] },
    { name: "Discourse", traits: ["coherence", "taskRelevance"] },
  ];

  it("convergent r > discriminant r on two-factor synthetic data", () => {
    const samples = generateTwoFactorSamples(300, 999);
    const r = mtmmReport(samples, groups);
    expect(r.convergentMean).toBeGreaterThan(r.discriminantMean);
    expect(r.separation).toBeGreaterThan(0.50);
  });

  it("flags weak separation on single-factor (halo) data", () => {
    const rng = mulberry32(42);
    const samples: TraitSample[] = [];
    for (let i = 0; i < 300; i++) {
      const halo = randn(rng);
      samples.push({
        scores: {
          grammar: halo + 0.1 * randn(rng),
          vocabulary: halo + 0.1 * randn(rng),
          coherence: halo + 0.1 * randn(rng),
          taskRelevance: halo + 0.1 * randn(rng),
        },
      });
    }
    const r = mtmmReport(samples, groups);
    // Halo => convergent ≈ discriminant ≈ very high
    expect(r.separation).toBeLessThan(0.10);
  });
});

describe("auditConstructValidity() — top-level summary", () => {
  it("emits a small-sample warning when n < 30", () => {
    const samples = generateTwoFactorSamples(15);
    const audit = auditConstructValidity(samples, TRAITS);
    expect(audit.warnings.some(w => w.includes("Sample size"))).toBe(true);
  });

  it("emits a halo-risk warning when two traits correlate > 0.95", () => {
    const rng = mulberry32(2024);
    const samples: TraitSample[] = [];
    for (let i = 0; i < 100; i++) {
      const ability = randn(rng);
      samples.push({
        scores: {
          grammar:       ability + 0.02 * randn(rng), // very tight correlation
          vocabulary:    ability + 0.02 * randn(rng), // with grammar
          coherence:     randn(rng),
          taskRelevance: randn(rng),
        },
      });
    }
    const audit = auditConstructValidity(samples, TRAITS);
    expect(audit.warnings.some(w => w.includes("Halo risk"))).toBe(true);
  });

  it("clean two-factor data emits no halo or MTMM-separation warning", () => {
    // Note: Cronbach α is intentionally moderate on two-factor data because
    // the rubric measures TWO constructs, not one. The audit will emit a
    // single α-related warning ("questionable"), but should NOT emit halo or
    // MTMM-separation warnings — those are the structural-validity flags.
    const samples = generateTwoFactorSamples(300, 5555);
    const audit = auditConstructValidity(samples, TRAITS);
    expect(audit.warnings.some(w => w.includes("Halo risk"))).toBe(false);
    expect(audit.warnings.some(w => w.includes("MTMM separation"))).toBe(false);
    expect(audit.warnings.some(w => w.includes("Sample size"))).toBe(false);
    expect(audit.mtmm?.separation).toBeGreaterThan(0.50);
  });
});
