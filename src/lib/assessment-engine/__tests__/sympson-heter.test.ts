import { describe, it, expect } from "vitest";
import { thetaToStratum, sympsonHetterWeight, STRATUM_COUNT } from "../sympson-heter";

describe("sympsonHetterWeight", () => {
  it("returns 1 when rate is below cap", () => {
    expect(sympsonHetterWeight(0.1, 0.2)).toBe(1);
    expect(sympsonHetterWeight(0, 0.2)).toBe(1);
  });

  it("downweights when rate exceeds cap", () => {
    expect(sympsonHetterWeight(0.4, 0.2)).toBeCloseTo(0.5, 6);
  });
});

describe("thetaToStratum", () => {
  it("covers STRATUM_COUNT buckets", () => {
    expect(thetaToStratum(-2)).toBe(0);
    expect(thetaToStratum(-1)).toBe(1);
    expect(thetaToStratum(0)).toBe(2);
    expect(thetaToStratum(1)).toBe(3);
    expect(thetaToStratum(2)).toBe(4);
    expect(STRATUM_COUNT).toBe(5);
  });
});
