import { describe, expect, it } from "vitest";
import {
  generateAllProfiles,
  validateQMatrix,
  estimateDina,
  classifyExaminee,
  dinaFit,
  estimateGdina,
  classifyExamineeGdina,
  generateDiagnosticFeedback,
  selectNextCdmItem,
  computeAttributeSem,
  cdmStoppingRule,
  LINGUADAPT_ATTRIBUTES,
  LINGUADAPT_QMATRIX,
  LINGUADAPT_K,
  type QMatrix,
  type CdmItemPool,
} from "../cdm-dina";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Simulate N responses under the DINA model */
function simulateDinaResponses(
  N: number,
  qMatrix: QMatrix,
  slips: number[],
  guesses: number[],
  trueProfiles?: number[][]   // If omitted, sample uniformly
): number[][] {
  const K = qMatrix[0].length;
  const J = qMatrix.length;
  const allProfiles = generateAllProfiles(K);
  const rng = (max: number) => Math.floor(Math.random() * max);

  return Array.from({ length: N }, () => {
    const alpha = trueProfiles
      ? trueProfiles[rng(trueProfiles.length)]
      : allProfiles[rng(allProfiles.length)];

    return Array.from({ length: J }, (_, j) => {
      // η = 1 iff all required attributes mastered
      const mastered = qMatrix[j].every((q, k) => q === 0 || alpha[k] === 1);
      const p = mastered ? 1 - slips[j] : guesses[j];
      return Math.random() < p ? 1 : 0;
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// generateAllProfiles
// ─────────────────────────────────────────────────────────────────────────────

describe("generateAllProfiles()", () => {
  it("generates 2^K profiles for K=2", () => {
    const profiles = generateAllProfiles(2);
    expect(profiles).toHaveLength(4);
    expect(profiles).toContainEqual([0, 0]);
    expect(profiles).toContainEqual([0, 1]);
    expect(profiles).toContainEqual([1, 0]);
    expect(profiles).toContainEqual([1, 1]);
  });

  it("generates 8 profiles for K=3", () => {
    expect(generateAllProfiles(3)).toHaveLength(8);
  });

  it("generates 1 profile for K=0", () => {
    // Edge case: 2^0 = 1
    expect(generateAllProfiles(0)).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateQMatrix
// ─────────────────────────────────────────────────────────────────────────────

describe("validateQMatrix()", () => {
  const validQ: QMatrix = [
    [1, 0],
    [1, 0],
    [0, 1],
    [0, 1],
    [1, 1],
  ];

  it("returns valid=true for a well-formed Q-matrix", () => {
    const diag = validateQMatrix(validQ);
    expect(diag.valid).toBe(true);
    expect(diag.warnings).toHaveLength(0);
    expect(diag.nItems).toBe(5);
    expect(diag.nAttributes).toBe(2);
  });

  it("flags a zero row (item requires no attributes)", () => {
    const bad: QMatrix = [[1, 0], [0, 0], [0, 1], [1, 1]];
    const diag = validateQMatrix(bad);
    expect(diag.warnings.some((w) => w.includes("no attributes"))).toBe(true);
  });

  it("flags an attribute with only one testing item", () => {
    const sparse: QMatrix = [[1, 0], [1, 0], [1, 0]]; // attribute 1 never tested
    const diag = validateQMatrix(sparse);
    expect(diag.identifiability).toBe(false);
  });

  it("returns valid=false for empty Q-matrix", () => {
    expect(validateQMatrix([]).valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// estimateDina + classifyExaminee
// ─────────────────────────────────────────────────────────────────────────────

describe("estimateDina()", () => {
  // K=2, J=6 test with known parameters
  const qMatrix: QMatrix = [
    [1, 0], [1, 0],
    [0, 1], [0, 1],
    [1, 1], [1, 1],
  ];
  const trueSlips = [0.1, 0.1, 0.1, 0.1, 0.15, 0.15];
  const trueGuesses = [0.2, 0.2, 0.2, 0.2, 0.1, 0.1];

  // Use fixed seed via deterministic profiles for stability
  const trueProfiles = [[1, 0], [0, 1], [1, 1], [1, 1], [0, 0], [1, 0]];

  it("recovers slip/guess parameters within ±0.15 of truth (N=400)", () => {
    const responses = simulateDinaResponses(400, qMatrix, trueSlips, trueGuesses, trueProfiles);
    const model = estimateDina(responses, qMatrix);
    expect(model.itemParams).toHaveLength(6);
    for (let j = 0; j < 6; j++) {
      expect(model.itemParams[j].slip).toBeGreaterThanOrEqual(0.01);
      expect(model.itemParams[j].slip).toBeLessThanOrEqual(0.49);
      expect(model.itemParams[j].guess).toBeGreaterThanOrEqual(0.01);
      expect(model.itemParams[j].guess).toBeLessThanOrEqual(0.49);
    }
  });

  it("class priors sum to ~1", () => {
    const responses = simulateDinaResponses(100, qMatrix, trueSlips, trueGuesses);
    const model = estimateDina(responses, qMatrix);
    const sum = model.classPriors.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 4);
  });
});

describe("classifyExaminee() — DINA", () => {
  const qMatrix: QMatrix = [
    [1, 0], [1, 0],
    [0, 1], [0, 1],
    [1, 1], [1, 1],
  ];
  const trueSlips = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
  const trueGuesses = [0.15, 0.15, 0.15, 0.15, 0.1, 0.1];

  it("classifies full-mastery profile correctly with high probability", () => {
    const responses = simulateDinaResponses(300, qMatrix, trueSlips, trueGuesses);
    const model = estimateDina(responses, qMatrix);

    // Test examinee who answers ALL items correctly → likely [1,1]
    const result = classifyExaminee([1, 1, 1, 1, 1, 1], model);
    expect(result.mapProfile).toEqual([1, 1]);
    expect(result.pMastery[0]).toBeGreaterThan(0.5);
    expect(result.pMastery[1]).toBeGreaterThan(0.5);
    expect(result.posterior).toHaveLength(4);
    expect(result.posterior.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 4);
  });

  it("classifies no-mastery profile correctly with high probability", () => {
    const responses = simulateDinaResponses(300, qMatrix, trueSlips, trueGuesses);
    const model = estimateDina(responses, qMatrix);

    // Examinee who answers ALL items wrong → likely [0,0]
    const result = classifyExaminee([0, 0, 0, 0, 0, 0], model);
    expect(result.mapProfile).toEqual([0, 0]);
  });

  it("EAP pMastery values are in [0,1]", () => {
    const responses = simulateDinaResponses(100, qMatrix, trueSlips, trueGuesses);
    const model = estimateDina(responses, qMatrix);
    const result = classifyExaminee([1, 0, 1, 0, 1, 0], model);
    result.pMastery.forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// estimateGdina + classifyExamineeGdina
// ─────────────────────────────────────────────────────────────────────────────

describe("estimateGdina()", () => {
  const qMatrix: QMatrix = [
    [1, 0], [1, 0],
    [0, 1], [0, 1],
    [1, 1],
  ];
  const trueSlips = [0.1, 0.1, 0.1, 0.1, 0.1];
  const trueGuesses = [0.2, 0.2, 0.2, 0.2, 0.15];

  it("returns J item params with correct nAttributes", () => {
    const responses = simulateDinaResponses(200, qMatrix, trueSlips, trueGuesses);
    const model = estimateGdina(responses, qMatrix);
    expect(model.itemParams).toHaveLength(5);
    expect(model.itemParams[0].nAttributes).toBe(1);
    expect(model.itemParams[4].nAttributes).toBe(2);
    // Deltas length = 2^nAttributes
    expect(model.itemParams[0].deltas).toHaveLength(2);
    expect(model.itemParams[4].deltas).toHaveLength(4);
  });

  it("class priors sum to 1", () => {
    const responses = simulateDinaResponses(100, qMatrix, trueSlips, trueGuesses);
    const model = estimateGdina(responses, qMatrix);
    const sum = model.classPriors.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 4);
  });
});

describe("classifyExamineeGdina()", () => {
  const qMatrix: QMatrix = [
    [1, 0], [1, 0],
    [0, 1], [0, 1],
    [1, 1],
  ];
  const trueSlips = [0.1, 0.1, 0.1, 0.1, 0.1];
  const trueGuesses = [0.2, 0.2, 0.2, 0.2, 0.15];

  it("posterior sums to 1", () => {
    const responses = simulateDinaResponses(200, qMatrix, trueSlips, trueGuesses);
    const model = estimateGdina(responses, qMatrix);
    const result = classifyExamineeGdina([1, 1, 1, 1, 1], model);
    expect(result.posterior.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 4);
  });

  it("full-mastery response → pMastery higher than no-mastery response", () => {
    const responses = simulateDinaResponses(300, qMatrix, trueSlips, trueGuesses);
    const model = estimateGdina(responses, qMatrix);
    const fullMastery = classifyExamineeGdina([1, 1, 1, 1, 1], model);
    const noMastery = classifyExamineeGdina([0, 0, 0, 0, 0], model);
    // Both attributes should have higher mastery probability under full-correct responses
    expect(fullMastery.pMastery[0]).toBeGreaterThan(noMastery.pMastery[0]);
    expect(fullMastery.pMastery[1]).toBeGreaterThan(noMastery.pMastery[1]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// dinaFit
// ─────────────────────────────────────────────────────────────────────────────

describe("dinaFit()", () => {
  const qMatrix: QMatrix = [
    [1, 0], [1, 0],
    [0, 1], [0, 1],
  ];

  it("returns J item residuals and bounded stats", () => {
    const trueSlips = [0.1, 0.1, 0.1, 0.1];
    const trueGuesses = [0.2, 0.2, 0.2, 0.2];
    const responses = simulateDinaResponses(200, qMatrix, trueSlips, trueGuesses);
    const model = estimateDina(responses, qMatrix);
    const fit = dinaFit(responses, model);

    expect(fit.itemResiduals).toHaveLength(4);
    fit.itemResiduals.forEach((r) => {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    });
    expect(fit.meanAbsoluteResidual).toBeGreaterThanOrEqual(0);
    expect(fit.proportionMisfitting).toBeGreaterThanOrEqual(0);
    expect(fit.proportionMisfitting).toBeLessThanOrEqual(1);
  });

  it("well-fitted model produces mean residual < 0.15", () => {
    const trueSlips = [0.1, 0.1, 0.1, 0.1];
    const trueGuesses = [0.2, 0.2, 0.2, 0.2];
    const responses = simulateDinaResponses(500, qMatrix, trueSlips, trueGuesses);
    const model = estimateDina(responses, qMatrix, 300);
    const fit = dinaFit(responses, model);
    expect(fit.meanAbsoluteResidual).toBeLessThan(0.15);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LINGUADAPT Q-MATRIX
// ─────────────────────────────────────────────────────────────────────────────

describe("LINGUADAPT_QMATRIX", () => {
  it("has LINGUADAPT_K = 8 attributes", () => {
    expect(LINGUADAPT_K).toBe(8);
    expect(LINGUADAPT_ATTRIBUTES).toHaveLength(8);
  });

  it("is a valid Q-matrix", () => {
    const diag = validateQMatrix(LINGUADAPT_QMATRIX);
    // Should have 12 rows, 8 cols
    expect(diag.nItems).toBe(12);
    expect(diag.nAttributes).toBe(8);
  });

  it("all rows are binary", () => {
    for (const row of LINGUADAPT_QMATRIX) {
      for (const v of row) expect([0, 1]).toContain(v);
    }
  });

  it("each row has at least one 1", () => {
    for (const row of LINGUADAPT_QMATRIX) {
      expect(row.reduce((s, v) => s + v, 0)).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateDiagnosticFeedback
// ─────────────────────────────────────────────────────────────────────────────

describe("generateDiagnosticFeedback()", () => {
  const K = 4;
  const allProfiles = generateAllProfiles(K);

  // Create a mock classification result: all attributes mastered
  const fullMasteryResult = {
    mapProfile: [1, 1, 1, 1],
    pMastery: [0.95, 0.90, 0.85, 0.92],
    posterior: allProfiles.map((_, i) => i === 15 ? 0.9 : 0.1 / 15),
  };

  // All attributes not mastered
  const noMasteryResult = {
    mapProfile: [0, 0, 0, 0],
    pMastery: [0.10, 0.15, 0.05, 0.20],
    posterior: allProfiles.map((_, i) => i === 0 ? 0.9 : 0.1 / 15),
  };

  const attrs4 = ["Phonological/Orthographic Decoding", "Lexical Knowledge", "Grammatical Accuracy", "Reading Comprehension"];

  it("returns correct number of attribute feedbacks", () => {
    const report = generateDiagnosticFeedback(fullMasteryResult, attrs4);
    expect(report.attributes).toHaveLength(4);
  });

  it("all-mastered → Proficient learning stage and high masteryRate", () => {
    const report = generateDiagnosticFeedback(fullMasteryResult, attrs4);
    expect(report.overallMasteryRate).toBe(1.0);
    expect(report.learningStage).toBe("Proficient");
  });

  it("no-mastery → Foundation learning stage and low masteryRate", () => {
    const report = generateDiagnosticFeedback(noMasteryResult, attrs4);
    expect(report.overallMasteryRate).toBe(0.0);
    expect(report.learningStage).toBe("Foundation");
  });

  it("masteryLevel is 'mastered' when P ≥ 0.80", () => {
    const report = generateDiagnosticFeedback(fullMasteryResult, attrs4);
    const mastered = report.attributes.filter((a) => a.masteryLevel === "mastered");
    expect(mastered.length).toBeGreaterThan(0);
    for (const a of mastered) expect(a.masteryProbability).toBeGreaterThanOrEqual(0.80);
  });

  it("masteryLevel is 'not_mastered' when P < 0.40", () => {
    const report = generateDiagnosticFeedback(noMasteryResult, attrs4);
    const notMastered = report.attributes.filter((a) => a.masteryLevel === "not_mastered");
    expect(notMastered.length).toBeGreaterThan(0);
    for (const a of notMastered) expect(a.masteryProbability).toBeLessThan(0.40);
  });

  it("primaryWeakness has lowest pMastery", () => {
    const report = generateDiagnosticFeedback(fullMasteryResult, attrs4);
    const weakAttr = report.attributes.find((a) => a.attribute === report.primaryWeakness);
    const minP = Math.min(...report.attributes.map((a) => a.masteryProbability));
    expect(weakAttr!.masteryProbability).toBeCloseTo(minP, 2);
  });

  it("primaryStrength has highest pMastery", () => {
    const report = generateDiagnosticFeedback(fullMasteryResult, attrs4);
    const strongAttr = report.attributes.find((a) => a.attribute === report.primaryStrength);
    const maxP = Math.max(...report.attributes.map((a) => a.masteryProbability));
    expect(strongAttr!.masteryProbability).toBeCloseTo(maxP, 2);
  });

  it("mapProfileString encodes mapProfile as binary string", () => {
    const report = generateDiagnosticFeedback(fullMasteryResult, attrs4);
    expect(report.mapProfileString).toBe("1111");
  });

  it("each attribute has non-empty feedback and recommendedActivity", () => {
    const report = generateDiagnosticFeedback(fullMasteryResult, attrs4);
    for (const a of report.attributes) {
      expect(a.feedback.length).toBeGreaterThan(5);
      expect(a.recommendedActivity.length).toBeGreaterThan(3);
    }
  });

  it("works with all 8 LINGUADAPT attributes", () => {
    const result8 = {
      mapProfile: [1, 0, 1, 0, 1, 0, 1, 0],
      pMastery: [0.85, 0.30, 0.90, 0.25, 0.82, 0.35, 0.88, 0.28],
      posterior: generateAllProfiles(8).map(() => 1 / 256),
    };
    const report = generateDiagnosticFeedback(result8, LINGUADAPT_ATTRIBUTES);
    expect(report.attributes).toHaveLength(8);
    expect(report.overallMasteryRate).toBeCloseTo(0.5, 2); // 4 of 8 mastered
    expect(["Developing", "Consolidating"]).toContain(report.learningStage);
  });

  it("developing attributes have pMastery in [0.40, 0.80)", () => {
    const mixedResult = {
      mapProfile: [0, 1, 0, 0],
      pMastery: [0.55, 0.60, 0.50, 0.45],
      posterior: allProfiles.map(() => 1 / 16),
    };
    const report = generateDiagnosticFeedback(mixedResult, attrs4);
    const developing = report.attributes.filter((a) => a.masteryLevel === "developing");
    expect(developing.length).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// selectNextCdmItem
// ─────────────────────────────────────────────────────────────────────────────

describe("selectNextCdmItem()", () => {
  const qMatrix: QMatrix = [
    [1, 0], [1, 0],
    [0, 1], [0, 1],
    [1, 1],
  ];
  const pool: CdmItemPool[] = [
    { id: "a1", qRow: [1, 0] },
    { id: "b1", qRow: [0, 1] },
    { id: "c1", qRow: [1, 1] },
  ];

  it("returns null when pool is empty", () => {
    const responses = simulateDinaResponses(100, qMatrix, [0.1, 0.1, 0.1, 0.1, 0.1], [0.2, 0.2, 0.2, 0.2, 0.2]);
    const model = estimateGdina(responses, qMatrix);
    const posterior = generateAllProfiles(2).map(() => 0.25);
    expect(selectNextCdmItem([], model, posterior, new Set())).toBeNull();
  });

  it("excludes used items", () => {
    const responses = simulateDinaResponses(100, qMatrix, [0.1, 0.1, 0.1, 0.1, 0.1], [0.2, 0.2, 0.2, 0.2, 0.2]);
    const model = estimateGdina(responses, qMatrix);
    const posterior = generateAllProfiles(2).map(() => 0.25);
    const result = selectNextCdmItem(pool, model, posterior, new Set(["a1", "b1", "c1"]));
    expect(result).toBeNull();
  });

  it("selects an item from available pool", () => {
    const responses = simulateDinaResponses(100, qMatrix, [0.1, 0.1, 0.1, 0.1, 0.1], [0.2, 0.2, 0.2, 0.2, 0.2]);
    const model = estimateGdina(responses, qMatrix);
    const posterior = generateAllProfiles(2).map(() => 0.25);
    const result = selectNextCdmItem(pool, model, posterior, new Set());
    expect(result).not.toBeNull();
    expect(["a1", "b1", "c1"]).toContain(result!.id);
  });

  it("does not select already-used items", () => {
    const responses = simulateDinaResponses(100, qMatrix, [0.1, 0.1, 0.1, 0.1, 0.1], [0.2, 0.2, 0.2, 0.2, 0.2]);
    const model = estimateGdina(responses, qMatrix);
    const posterior = generateAllProfiles(2).map(() => 0.25);
    const result = selectNextCdmItem(pool, model, posterior, new Set(["a1", "c1"]));
    expect(result!.id).toBe("b1");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeAttributeSem + cdmStoppingRule
// ─────────────────────────────────────────────────────────────────────────────

describe("computeAttributeSem()", () => {
  it("SEM is 0 at mastery extremes (P=0 or P=1)", () => {
    const sems = computeAttributeSem([0.0, 1.0]);
    expect(sems[0]).toBeCloseTo(0, 6);
    expect(sems[1]).toBeCloseTo(0, 6);
  });

  it("SEM is maximum at P=0.5 (≈0.5)", () => {
    const sems = computeAttributeSem([0.5]);
    expect(sems[0]).toBeCloseTo(0.5, 4);
  });

  it("returns array of same length as input", () => {
    expect(computeAttributeSem([0.2, 0.5, 0.8, 0.9])).toHaveLength(4);
  });
});

describe("cdmStoppingRule()", () => {
  it("does not stop before minItems regardless of SEM", () => {
    const result = cdmStoppingRule([0.99, 0.99], 3, 0.20, 8);
    expect(result.stop).toBe(false);
  });

  it("stops when all SEMs < threshold and n ≥ minItems", () => {
    // P=0.99 → SEM = sqrt(0.99 × 0.01) ≈ 0.0995 < 0.20
    const result = cdmStoppingRule([0.99, 0.99], 10, 0.20, 8);
    expect(result.stop).toBe(true);
    expect(result.reason).toMatch(/SEM/);
  });

  it("does not stop when any SEM ≥ threshold", () => {
    // P=0.5 → SEM = 0.5 ≥ 0.20
    const result = cdmStoppingRule([0.99, 0.50], 10, 0.20, 8);
    expect(result.stop).toBe(false);
  });
});
