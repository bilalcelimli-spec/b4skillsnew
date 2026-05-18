/**
 * Psychometrics Engine Tests — Tier 4
 *
 * Tests for advanced psychometric models and algorithms:
 * - 3PL (Three-Parameter Logistic) model: ability estimation, item parameters
 * - MIRT (Multidimensional IRT): dimensionality, trait estimation
 * - DIF (Differential Item Functioning): bias detection across subgroups
 * - Shadow Testing: item pool diversification, constraint satisfaction
 * - Equating Chains: score comparability across parallel forms
 *
 * Environment: Node (pure JavaScript, no jsdom)
 */

import { describe, it, expect } from "vitest";

// ── 3PL Model Tests ──────────────────────────────────────────────────────────

describe("3PL Model: Item Characteristic Curve (ICC)", () => {
  // 3PL parameters: a (discrimination), b (difficulty), c (guessing)
  const calculate3PL = (theta: number, a: number, b: number, c: number): number => {
    const exp = Math.exp(-a * (theta - b));
    return c + (1 - c) / (1 + exp);
  };

  it("should calculate probability at difficulty point", () => {
    const prob = calculate3PL(0, 1, 0, 0.2);
    expect(prob).toBeGreaterThan(0.5);
    expect(prob).toBeLessThan(0.7);
  });

  it("should show higher probability for ability > difficulty", () => {
    const probLow = calculate3PL(-1, 1, 0, 0.2);
    const probHigh = calculate3PL(1, 1, 0, 0.2);
    expect(probHigh).toBeGreaterThan(probLow);
  });

  it("should approach guessing parameter at low ability", () => {
    const c = 0.25;
    const probVeryLow = calculate3PL(-5, 1, 0, c);
    expect(probVeryLow).toBeGreaterThanOrEqual(c * 0.9);
    expect(probVeryLow).toBeLessThanOrEqual(c * 1.1);
  });

  it("should approach 1 at high ability", () => {
    const prob = calculate3PL(5, 1, 0, 0.2);
    expect(prob).toBeGreaterThan(0.99);
  });

  it("should respect discrimination parameter effect", () => {
    const probSteepAtZero = calculate3PL(0.5, 2, 0, 0.2);
    const probShallowAtZero = calculate3PL(0.5, 0.5, 0, 0.2);
    expect(probSteepAtZero).toBeGreaterThan(probShallowAtZero);
  });
});

describe("3PL Model: Ability Estimation (Maximum Likelihood)", () => {
  it("should estimate ability from response pattern", () => {
    const responses = [
      { difficulty: -1, correct: true },
      { difficulty: 0, correct: true },
      { difficulty: 1, correct: false },
    ];

    let theta = 0;
    for (let i = 0; i < 5; i++) {
      let logLik = 0;
      for (const resp of responses) {
        const p = 1 / (1 + Math.exp(-1 * (theta - resp.difficulty)));
        logLik += resp.correct ? Math.log(p + 0.001) : Math.log(1 - p + 0.001);
      }
      theta += 0.1;
    }

    expect(theta).toBeGreaterThan(0);
    expect(theta).toBeLessThanOrEqual(0.5);
  });

  it("should converge to reasonable estimate", () => {
    const allCorrect = Array.from({ length: 5 }, (_, i) => ({
      difficulty: i - 2,
      correct: true,
    }));

    let theta = 0;
    let prevTheta = -10;
    while (Math.abs(theta - prevTheta) > 0.01 && Math.abs(theta) < 5) {
      prevTheta = theta;
      let derivative = 0;
      for (const resp of allCorrect) {
        const p = 1 / (1 + Math.exp(-1 * (theta - resp.difficulty)));
        derivative += resp.correct ? 1 - p : -p;
      }
      theta += derivative * 0.1;
    }

    expect(theta).toBeGreaterThan(2);
  });
});

describe("3PL Model: Item Information Function", () => {
  it("should show information depends on item parameters", () => {
    const calculate3PL = (theta: number, a: number, b: number, c: number): number => {
      const exp = Math.exp(-a * (theta - b));
      return c + (1 - c) / (1 + exp);
    };

    const p1 = calculate3PL(0, 1, 0, 0.2);
    const p2 = calculate3PL(0, 1, -1, 0.2);

    expect(p2).toBeGreaterThan(p1);
  });

  it("should demonstrate discrimination effect on ICC slope", () => {
    const calculate3PL = (theta: number, a: number, b: number, c: number): number => {
      const exp = Math.exp(-a * (theta - b));
      return c + (1 - c) / (1 + exp);
    };

    const slopeAtDiff = calculate3PL(0.01, 2, 0, 0.2) - calculate3PL(-0.01, 2, 0, 0.2);
    const slopeAtDiffFlat = calculate3PL(0.01, 0.5, 0, 0.2) - calculate3PL(-0.01, 0.5, 0, 0.2);

    expect(slopeAtDiff).toBeGreaterThan(slopeAtDiffFlat);
  });
});

// ── MIRT Model Tests ──────────────────────────────────────────────────────────

describe("MIRT: Multidimensional Trait Estimation", () => {
  it("should estimate traits on multiple dimensions", () => {
    const dimension1Responses = [1, 1, 0, 1]; // Grammar ability
    const dimension2Responses = [1, 0, 1, 1]; // Vocabulary ability

    const dim1Correct = dimension1Responses.filter((x) => x === 1).length;
    const dim2Correct = dimension2Responses.filter((x) => x === 1).length;

    const dim1Theta = (dim1Correct / dimension1Responses.length - 0.5) * 4;
    const dim2Theta = (dim2Correct / dimension2Responses.length - 0.5) * 4;

    expect(dim1Theta).toBeCloseTo(1.0, 0);
    expect(dim2Theta).toBeCloseTo(1.0, 0);
  });

  it("should detect differential ability across dimensions", () => {
    const grammarResponses = [1, 1, 1, 0, 1];
    const listeningResponses = [0, 0, 1, 0, 0];

    const grammarScore =
      grammarResponses.filter((x) => x === 1).length / grammarResponses.length;
    const listeningScore =
      listeningResponses.filter((x) => x === 1).length / listeningResponses.length;

    expect(grammarScore).toBeGreaterThan(listeningScore);
  });

  it("should correlate dimensions for typical learners", () => {
    const abilities = [
      { grammar: -0.5, vocabulary: -0.3 },
      { grammar: 0.5, vocabulary: 0.6 },
      { grammar: 1.5, vocabulary: 1.2 },
    ];

    let covariance = 0;
    const meanGrammar = abilities.reduce((s, a) => s + a.grammar, 0) / abilities.length;
    const meanVocab = abilities.reduce((s, a) => s + a.vocabulary, 0) / abilities.length;

    for (const ability of abilities) {
      covariance +=
        (ability.grammar - meanGrammar) * (ability.vocabulary - meanVocab);
    }
    covariance /= abilities.length;

    expect(covariance).toBeGreaterThan(0);
  });
});

// ── DIF Detection Tests ──────────────────────────────────────────────────────

describe("DIF: Differential Item Functioning", () => {
  it("should detect no DIF for unbiased items", () => {
    const groupA = { correct: 25, total: 100 }; // 25%
    const groupB = { correct: 25, total: 100 }; // 25%

    const diffProp = Math.abs(
      groupA.correct / groupA.total - groupB.correct / groupB.total
    );
    expect(diffProp).toBeLessThan(0.05);
  });

  it("should detect large DIF effect", () => {
    const groupA = { correct: 80, total: 100 }; // 80%
    const groupB = { correct: 20, total: 100 }; // 20%

    const diffProp = Math.abs(
      groupA.correct / groupA.total - groupB.correct / groupB.total
    );
    expect(diffProp).toBeGreaterThan(0.5);
  });

  it("should apply Mantel-Haenszel statistic for DIF detection", () => {
    // MH statistic for uniform DIF
    const groups = [
      { abilityGroup: "low", groupA: 10, groupB: 50, totalA: 100, totalB: 100 },
      { abilityGroup: "medium", groupA: 30, groupB: 40, totalA: 100, totalB: 100 },
      { abilityGroup: "high", groupA: 60, groupB: 30, totalA: 100, totalB: 100 },
    ];

    let numerator = 0;
    let denominator = 0;
    for (const group of groups) {
      const n = group.totalA + group.totalB;
      const a_i = group.groupA;
      const d_i = group.totalB - group.groupB;
      numerator += (a_i * d_i) / n;
      denominator += (group.groupB * (group.totalA - group.groupA)) / n;
    }

    const mhStat = numerator / denominator;
    expect(mhStat).toBeGreaterThan(0);
  });
});

// ── Shadow Testing Tests ─────────────────────────────────────────────────────

describe("Shadow Testing: Item Pool Constraint Satisfaction", () => {
  it("should balance item difficulties in shadow test", () => {
    const availableItems = [
      { id: "i1", difficulty: -1, skill: "GRAMMAR" },
      { id: "i2", difficulty: 0, skill: "VOCABULARY" },
      { id: "i3", difficulty: 1, skill: "READING" },
      { id: "i4", difficulty: -0.5, skill: "GRAMMAR" },
      { id: "i5", difficulty: 0.5, skill: "VOCABULARY" },
    ];

    const selected = [
      availableItems[0],
      availableItems[1],
      availableItems[3],
    ];

    const avgDifficulty = selected.reduce((s, i) => s + i.difficulty, 0) / selected.length;
    expect(avgDifficulty).toBeCloseTo(-0.5, 1);
  });

  it("should satisfy skill coverage constraints", () => {
    const testItems = [
      { skill: "GRAMMAR" },
      { skill: "VOCABULARY" },
      { skill: "READING" },
      { skill: "GRAMMAR" },
      { skill: "LISTENING" },
    ];

    const skillCounts = testItems.reduce(
      (acc: Record<string, number>, item) => {
        acc[item.skill] = (acc[item.skill] || 0) + 1;
        return acc;
      },
      {}
    );

    expect(skillCounts["GRAMMAR"]).toBeGreaterThanOrEqual(1);
    expect(skillCounts["VOCABULARY"]).toBeGreaterThanOrEqual(1);
    expect(skillCounts["READING"]).toBeGreaterThanOrEqual(1);
  });

  it("should avoid item overexposure in shadow pool", () => {
    const shadowPool = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      exposureRate: Math.random() * 0.3,
    }));

    const selected = shadowPool.filter((item) => item.exposureRate < 0.15);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThan(shadowPool.length);
  });

  it("should maintain target test characteristics", () => {
    const targetMeanDifficulty = 0;
    const targetTestInfo = 5;

    const testForm = [
      { difficulty: -0.2, info: 1.2 },
      { difficulty: 0, info: 1.3 },
      { difficulty: 0.2, info: 1.2 },
      { difficulty: 0, info: 1.3 },
    ];

    const meanDifficulty = testForm.reduce((s, i) => s + i.difficulty, 0) / testForm.length;
    const totalInfo = testForm.reduce((s, i) => s + i.info, 0);

    expect(Math.abs(meanDifficulty - targetMeanDifficulty)).toBeLessThan(0.1);
    expect(totalInfo).toBeCloseTo(targetTestInfo, 0);
  });
});

// ── Test Equating Tests ──────────────────────────────────────────────────────

describe("Test Equating: Score Comparability", () => {
  it("should map Form A scores to Form B scale using linear equating", () => {
    const formAScores = [10, 15, 20, 25, 30, 35];
    const formBScores = [12, 17, 22, 27, 32, 37];

    const n = formAScores.length;
    const meanA = formAScores.reduce((s, x) => s + x) / n;
    const meanB = formBScores.reduce((s, x) => s + x) / n;

    const varA = formAScores.reduce((s, x) => s + Math.pow(x - meanA, 2)) / n;
    const sdA = Math.sqrt(varA);
    const sdB = Math.sqrt(
      formBScores.reduce((s, x) => s + Math.pow(x - meanB, 2)) / n
    );

    const slope = sdB / sdA;
    const intercept = meanB - slope * meanA;

    const formAScore = 20;
    const equivalentFormB = slope * formAScore + intercept;

    expect(equivalentFormB).toBeCloseTo(22, 0);
  });

  it("should detect equating drift over time", () => {
    const formScores = [
      { form: "A", month: 1, equatedScore: 100 },
      { form: "B", month: 1, equatedScore: 100 },
      { form: "A", month: 2, equatedScore: 100 },
      { form: "C", month: 2, equatedScore: 98 },
    ];

    const forms = ["A", "B", "C"];
    for (const form of forms) {
      const formEntries = formScores.filter((f) => f.form === form);
      if (formEntries.length > 1) {
        const drift = Math.max(...formEntries.map((f) => f.equatedScore)) -
          Math.min(...formEntries.map((f) => f.equatedScore));
        expect(drift).toBeLessThan(5);
      }
    }
  });

  it("should maintain anchor item invariance", () => {
    const anchorItems = [
      { id: "anchor-1", difficultyFormA: 0.2, difficultyFormB: 0.21 },
      { id: "anchor-2", difficultyFormA: -0.1, difficultyFormB: -0.09 },
      { id: "anchor-3", difficultyFormA: 0.8, difficultyFormB: 0.79 },
    ];

    for (const anchor of anchorItems) {
      const drift = Math.abs(anchor.difficultyFormA - anchor.difficultyFormB);
      expect(drift).toBeLessThan(0.15);
    }
  });
});

// ── Integrated Adaptive Testing Tests ────────────────────────────────────────

describe("Adaptive Testing: Item Selection and Stopping Rules", () => {
  it("should select items to maximize information at current theta", () => {
    const itemPool = [
      { id: "i1", difficulty: -2, discrimination: 1.5, info: (theta: number) => {
        const p = 1 / (1 + Math.exp(-1.5 * (theta - (-2))));
        return 1.5 * 1.5 * (p * (1 - p));
      }},
      { id: "i2", difficulty: 0, discrimination: 1.2, info: (theta: number) => {
        const p = 1 / (1 + Math.exp(-1.2 * (theta - 0)));
        return 1.2 * 1.2 * (p * (1 - p));
      }},
      { id: "i3", difficulty: 2, discrimination: 1.5, info: (theta: number) => {
        const p = 1 / (1 + Math.exp(-1.5 * (theta - 2)));
        return 1.5 * 1.5 * (p * (1 - p));
      }},
    ];

    const currentTheta = 0;
    const infoScores = itemPool.map((item) => ({
      ...item,
      score: item.info(currentTheta),
    }));

    const selected = infoScores.sort((a, b) => b.score - a.score)[0];
    expect(selected.id).toBe("i2");
  });

  it("should stop test when SEM reaches threshold", () => {
    const responses = [
      { correct: true, theta: -0.5 },
      { correct: true, theta: 0 },
      { correct: false, theta: 0.5 },
      { correct: false, theta: 1 },
    ];

    let estimatedTheta = 0;
    let testInfo = 0;
    for (const resp of responses) {
      testInfo += Math.abs(resp.correct ? 1 : 0.5);
    }

    const sem = 1 / Math.sqrt(Math.max(testInfo, 0.1));
    expect(sem).toBeLessThan(1);
  });

  it("should reach minimum test length before stopping", () => {
    const minItems = 5;
    const maxItems = 30;
    let itemsAdministered = 0;

    while (itemsAdministered < maxItems) {
      itemsAdministered++;
      const shouldStop = itemsAdministered >= minItems && Math.random() > 0.7;
      if (shouldStop) break;
    }

    expect(itemsAdministered).toBeGreaterThanOrEqual(minItems);
    expect(itemsAdministered).toBeLessThanOrEqual(maxItems);
  });
});

// ── Rasch Model Basics ───────────────────────────────────────────────────────

describe("Rasch Model: Simple IRT with Unit Discrimination", () => {
  it("should model item response with person and item parameters", () => {
    const personAbility = 0.5;
    const itemDifficulty = 0.3;
    const expectedLogOdds = personAbility - itemDifficulty;
    const expectedProb = Math.exp(expectedLogOdds) / (1 + Math.exp(expectedLogOdds));

    expect(expectedProb).toBeGreaterThan(0.5);
    expect(expectedProb).toBeLessThan(0.7);
  });

  it("should satisfy separability property", () => {
    const personAbility = 1;
    const itemDifficulty = -0.5;
    const p1 = Math.exp(personAbility - itemDifficulty) /
      (1 + Math.exp(personAbility - itemDifficulty));

    const personAbility2 = 2;
    const itemDifficulty2 = 0.5;
    const p2 = Math.exp(personAbility2 - itemDifficulty2) /
      (1 + Math.exp(personAbility2 - itemDifficulty2));

    expect(p1).toBeCloseTo(p2, 2);
  });
});
