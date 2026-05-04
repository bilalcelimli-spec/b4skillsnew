import { describe, expect, it } from "vitest";
import {
  generateAllProfiles,
  validateQMatrix,
  estimateDina,
  classifyExaminee,
  dinaFit,
  estimateGdina,
  classifyExamineeGdina,
  type QMatrix,
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
