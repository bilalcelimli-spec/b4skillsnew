import { describe, it, expect } from "vitest";
import { probability, information, likelihood, logLikelihood } from "../irt";
import type { IrtParameters } from "../types";

const p = (a: number, b: number, c: number): IrtParameters => ({ a, b, c });

describe("IRT 3PL — probability()", () => {
  it("returns c at theta = -inf (asymptotic lower bound)", () => {
    const params = p(1.5, 0, 0.25);
    expect(probability(-100, params)).toBeCloseTo(0.25, 6);
  });

  it("returns ~1 at theta = +inf (asymptotic upper bound)", () => {
    const params = p(1.5, 0, 0.25);
    expect(probability(100, params)).toBeCloseTo(1, 6);
  });

  it("returns c + (1-c)/2 at theta = b (inflection point)", () => {
    // At theta=b, logistic = 0.5, so P = c + (1-c)*0.5
    const params = p(1.0, 0.5, 0.2);
    expect(probability(0.5, params)).toBeCloseTo(0.2 + 0.8 * 0.5, 6);
  });

  it("is monotonically increasing in theta", () => {
    const params = p(1.2, 0, 0.15);
    let prev = -1;
    for (let theta = -3; theta <= 3; theta += 0.25) {
      const current = probability(theta, params);
      expect(current).toBeGreaterThan(prev);
      prev = current;
    }
  });

  it("higher discrimination (a) gives steeper curve at b", () => {
    const flat = p(0.5, 0, 0.0);
    const steep = p(2.5, 0, 0.0);
    // Both pass through P=0.5 at theta=b=0; steep should rise faster just above b
    const flatAt05 = probability(0.5, flat);
    const steepAt05 = probability(0.5, steep);
    expect(steepAt05).toBeGreaterThan(flatAt05);
  });

  it("guessing parameter c shifts lower asymptote correctly", () => {
    const noG = p(1.0, 0, 0.0);
    const withG = p(1.0, 0, 0.25);
    expect(probability(-5, noG)).toBeLessThan(0.01);
    // At theta=-5 with a=1, P should approach c from above; tolerance 0.01
    const v = probability(-5, withG);
    expect(v).toBeGreaterThan(0.249);
    expect(v).toBeLessThan(0.27);
  });

  it("output is always in [c, 1] range", () => {
    const params = p(1.5, 0.3, 0.2);
    for (let theta = -4; theta <= 4; theta += 0.5) {
      const v = probability(theta, params);
      expect(v).toBeGreaterThanOrEqual(0.2 - 1e-9);
      expect(v).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

describe("IRT 3PL — information()", () => {
  it("is non-negative for all theta", () => {
    const params = p(1.5, 0, 0.2);
    for (let theta = -4; theta <= 4; theta += 0.25) {
      expect(information(theta, params)).toBeGreaterThanOrEqual(0);
    }
  });

  it("is approximately maximised at theta = b when c = 0 (2PL case)", () => {
    const params = p(1.5, 0.5, 0);
    let maxTheta = -10;
    let maxInfo = -1;
    for (let theta = -2; theta <= 2; theta += 0.01) {
      const i = information(theta, params);
      if (i > maxInfo) { maxInfo = i; maxTheta = theta; }
    }
    // For 2PL (c=0), max info occurs exactly at theta = b
    expect(maxTheta).toBeCloseTo(0.5, 1);
  });

  it("for c > 0, max info shifts slightly above b (3PL property)", () => {
    const params = p(1.5, 0, 0.25);
    let maxTheta = -10;
    let maxInfo = -1;
    for (let theta = -2; theta <= 2; theta += 0.01) {
      const i = information(theta, params);
      if (i > maxInfo) { maxInfo = i; maxTheta = theta; }
    }
    // Birnbaum (1968): for 3PL with c > 0, max info is at theta > b
    expect(maxTheta).toBeGreaterThan(0);
  });

  it("higher discrimination yields higher peak information", () => {
    const flat = p(0.5, 0, 0.2);
    const steep = p(2.5, 0, 0.2);
    let flatPeak = 0, steepPeak = 0;
    for (let theta = -3; theta <= 3; theta += 0.05) {
      flatPeak = Math.max(flatPeak, information(theta, flat));
      steepPeak = Math.max(steepPeak, information(theta, steep));
    }
    expect(steepPeak).toBeGreaterThan(flatPeak * 4); // a^2 ratio = 25
  });

  it("returns 0 when c >= 1 (degenerate item)", () => {
    expect(information(0, p(1, 0, 0.9999))).toBe(0);
  });

  it("matches analytic Fisher Information formula", () => {
    // I(θ) = a² · (P−c)² · (1−P) / [P · (1−c)²]
    const params = p(1.2, 0.5, 0.2);
    const theta = 0.8;
    const P = probability(theta, params);
    const expected =
      (params.a ** 2 * (P - params.c) ** 2 * (1 - P)) /
      (P * (1 - params.c) ** 2);
    expect(information(theta, params)).toBeCloseTo(expected, 6);
  });
});

describe("IRT — likelihood() and logLikelihood()", () => {
  it("likelihood is product of per-item probabilities", () => {
    const responses = [
      { score: 1, params: p(1, 0, 0) },
      { score: 0, params: p(1, 0, 0) },
    ];
    const theta = 0.5;
    const expected =
      probability(theta, responses[0].params) *
      (1 - probability(theta, responses[1].params));
    expect(likelihood(theta, responses)).toBeCloseTo(expected, 6);
  });

  it("logLikelihood == log(likelihood) on well-conditioned input", () => {
    const responses = [
      { score: 1, params: p(1.2, -0.5, 0.1) },
      { score: 0, params: p(1.0, 0.5, 0.2) },
      { score: 1, params: p(0.8, 1.0, 0.15) },
    ];
    const theta = 0.0;
    const ll = logLikelihood(theta, responses);
    const l = likelihood(theta, responses);
    expect(ll).toBeCloseTo(Math.log(l), 4);
  });

  it("logLikelihood is finite even when probability is near 0 or 1", () => {
    // Extreme theta case where P ≈ 1 and a wrong answer would push likelihood to 0
    const responses = [{ score: 0, params: p(2.5, -2, 0) }];
    const ll = logLikelihood(5, responses);
    expect(Number.isFinite(ll)).toBe(true);
  });

  it("likelihood maximised near true theta on dense correct/incorrect pattern", () => {
    // Simulate responses for a candidate with true theta = 1.0
    const trueTheta = 1.0;
    const items = [
      p(1.5, -1, 0.1),
      p(1.5, 0, 0.1),
      p(1.5, 1, 0.1),
      p(1.5, 2, 0.1),
    ];
    // Deterministic responses: pass items where P > 0.5 at true theta
    const responses = items.map(params => ({
      score: probability(trueTheta, params) >= 0.5 ? 1 : 0,
      params,
    }));

    // Find theta that maximises log-likelihood by grid search
    let bestTheta = -10;
    let bestLL = -Infinity;
    for (let t = -3; t <= 3; t += 0.05) {
      const ll = logLikelihood(t, responses);
      if (ll > bestLL) { bestLL = ll; bestTheta = t; }
    }
    // With only 4 deterministic items the likelihood plateau is wide; require <= 0.75
    expect(Math.abs(bestTheta - trueTheta)).toBeLessThanOrEqual(0.75);
  });
});
