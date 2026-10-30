import { describe, expect, it } from "vitest";
import { isAdaptiveEligible, profileAbilityPrior, profileThetaRange } from "../adaptive-policy";
import { PRODUCT_LINE_PROFILES, getProfile } from "../../product-lines/profiles";
import { SkillType } from "../types";

describe("profileAbilityPrior", () => {
  it("centres the default prior on the profile's CEFR range with SD 1", () => {
    const primary = getProfile("Primary (7-10)");
    const prior = profileAbilityPrior(primary);
    expect(prior.sd).toBe(1);
    expect(prior.mean).toBeCloseTo(profileThetaRange(primary).centre, 3);
    expect(prior.mean).toBeLessThan(-1); // PRE_A1–A2 cohort sits well below the population mean
    const general = profileAbilityPrior(getProfile("General English"));
    expect(Math.abs(general.mean)).toBeLessThan(0.5); // A1–C1 ≈ population
  });

  it("lets an organisation prior from SystemConfig override the profile", () => {
    const prior = profileAbilityPrior(getProfile("Primary (7-10)"), { priorMean: 0.4, priorSd: 0.7 });
    expect(prior).toEqual({ mean: 0.4, sd: 0.7 });
    expect(profileAbilityPrior(getProfile("Primary (7-10)"), { priorMean: 0.4 }).sd).toBe(1);
    expect(profileAbilityPrior(getProfile("Primary (7-10)"), { priorMean: Number.NaN }).mean).toBeLessThan(-1);
  });

  it("honours an explicit profile prior over the derived centre", () => {
    const profile = { ...getProfile("Academia"), abilityPrior: { mean: 1.1, sd: 0.8 } };
    expect(profileAbilityPrior(profile)).toEqual({ mean: 1.1, sd: 0.8 });
  });

  it("yields a finite prior for every shipped profile", () => {
    for (const profile of Object.values(PRODUCT_LINE_PROFILES)) {
      const prior = profileAbilityPrior(profile);
      expect(Number.isFinite(prior.mean)).toBe(true);
      expect(prior.mean).toBeGreaterThan(-4);
      expect(prior.mean).toBeLessThan(4);
    }
  });
});

describe("isAdaptiveEligible (in-memory mirror of adaptiveItemWhere)", () => {
  const profile = getProfile("Corporate"); // sources: corporate + general → tags corporate aliases
  const base = {
    skill: SkillType.GRAMMAR, status: "ACTIVE", isPretest: false, cefrLevel: "B1",
    discrimination: 1.1, guessing: 0.2, tags: [] as string[], content: {},
  };

  it("accepts untagged ACTIVE items inside the CEFR range with valid parameters", () => {
    expect(isAdaptiveEligible(base, profile, SkillType.GRAMMAR)).toBe(true);
  });

  it("rejects the wrong skill, pretest, non-ACTIVE, out-of-range and invalid parameters", () => {
    expect(isAdaptiveEligible(base, profile, SkillType.READING)).toBe(false);
    expect(isAdaptiveEligible({ ...base, isPretest: true }, profile, SkillType.GRAMMAR)).toBe(false);
    expect(isAdaptiveEligible({ ...base, status: "PRETEST" }, profile, SkillType.GRAMMAR)).toBe(false);
    expect(isAdaptiveEligible({ ...base, cefrLevel: "PRE_A1" }, profile, SkillType.GRAMMAR)).toBe(false);
    expect(isAdaptiveEligible({ ...base, discrimination: 0 }, profile, SkillType.GRAMMAR)).toBe(false);
    expect(isAdaptiveEligible({ ...base, guessing: 1 }, profile, SkillType.GRAMMAR)).toBe(false);
  });

  it("applies the exam-source tag / productLine rule like the Prisma filter", () => {
    expect(isAdaptiveEligible({ ...base, tags: ["corporate"] }, profile, SkillType.GRAMMAR)).toBe(true);
    expect(isAdaptiveEligible({ ...base, tags: ["Corporate"] }, profile, SkillType.GRAMMAR)).toBe(true);
    expect(isAdaptiveEligible({ ...base, tags: ["primary"] }, profile, SkillType.GRAMMAR)).toBe(false);
    expect(isAdaptiveEligible({ ...base, tags: ["primary"], content: { productLine: "corporate" } }, profile, SkillType.GRAMMAR)).toBe(true);
    // General English has no non-general source: every tag is acceptable
    expect(isAdaptiveEligible({ ...base, tags: ["primary"] }, getProfile("General English"), SkillType.GRAMMAR)).toBe(true);
  });
});
