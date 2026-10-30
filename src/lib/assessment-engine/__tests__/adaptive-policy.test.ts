import { describe, expect, it } from "vitest";
import { crossSkillPrior, crossSkillPriors, isAdaptiveEligible, isPretestEligible, pretestItemWhere, profileAbilityPrior, profileThetaRange, sectionAbility, CROSS_SKILL_PRIOR_MIN_SD } from "../adaptive-policy";
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

describe("pretest pool (pretestItemWhere / isPretestEligible)", () => {
  const profile = getProfile("Corporate");
  const base = { skill: SkillType.GRAMMAR, status: "PRETEST", isPretest: true, cefrLevel: "B1", discrimination: 1.1, guessing: 0.2, tags: [] as string[], content: {} };

  it("accepts PRETEST items and ACTIVE items flagged isPretest inside the range", () => {
    expect(isPretestEligible(base, profile, SkillType.GRAMMAR)).toBe(true);
    expect(isPretestEligible({ ...base, status: "ACTIVE", isPretest: true }, profile, SkillType.GRAMMAR)).toBe(true);
    expect(isPretestEligible({ ...base, status: "ACTIVE", isPretest: false }, profile, SkillType.GRAMMAR)).toBe(false);
    expect(isPretestEligible({ ...base, status: "DRAFT" }, profile, SkillType.GRAMMAR)).toBe(false);
    expect(isPretestEligible({ ...base, cefrLevel: "PRE_A1" }, profile, SkillType.GRAMMAR)).toBe(false);
    expect(isPretestEligible({ ...base, tags: ["primary"] }, profile, SkillType.GRAMMAR)).toBe(false);
  });

  it("mirrors the Prisma filter shape", () => {
    const where = pretestItemWhere(profile, SkillType.GRAMMAR);
    expect(where).toMatchObject({ skill: SkillType.GRAMMAR, OR: [{ status: "PRETEST" }, { status: "ACTIVE", isPretest: true }], discrimination: { gt: 0 } });
    expect((where.cefrLevel as { in: string[] }).in[0]).toBe(profile.cefrRange[0]);
    expect(Array.isArray(where.AND)).toBe(true);
    expect(pretestItemWhere(getProfile("General English"), SkillType.READING).AND).toBeUndefined();
  });
});

describe("crossSkillPrior (collateral information)", () => {
  const base = { mean: 0, sd: 1 };
  const state = { theta: 0, sem: 1, responses: [], usedItemIds: new Set<string>(),
    skillProfiles: { GRAMMAR: { theta: 1.2, sem: 0.4 }, VOCABULARY: { theta: 0.8, sem: 0.4 } } } as any;

  it("shrinks the measured mean toward the base mean by ρ and tightens the SD", () => {
    const prior = crossSkillPrior(state, SkillType.READING, base, { correlation: 0.85 });
    expect(prior.mean).toBeCloseTo(0.85 * 1.0, 6);
    const expectedSd = Math.sqrt(1 * (1 - 0.85 ** 2) + 0.85 ** 2 * (0.16 / 2));
    expect(prior.sd).toBeCloseTo(Math.max(CROSS_SKILL_PRIOR_MIN_SD, expectedSd), 6);
    expect(prior.sd).toBeGreaterThanOrEqual(CROSS_SKILL_PRIOR_MIN_SD);
  });

  it("falls back to the base prior with nothing measured or ρ = 0, and ignores the skill itself", () => {
    expect(crossSkillPrior({ ...state, skillProfiles: {} }, SkillType.READING, base, { correlation: 0.85 })).toEqual(base);
    expect(crossSkillPrior(state, SkillType.READING, base, { correlation: 0 })).toEqual(base);
    const own = crossSkillPrior({ ...state, skillProfiles: { READING: { theta: 3, sem: 0.3 } } }, SkillType.READING, base, { correlation: 0.85 });
    expect(own).toEqual(base);
  });

  it("is only applied when the profile enables it", () => {
    const off = getProfile("General English");
    expect(crossSkillPriors(state, off, base)).toBeUndefined();
    expect(sectionAbility(state, SkillType.READING, 0, 1, { profile: off })).toEqual({ theta: 0, sem: 1 });
    const on = { ...off, crossSkillPrior: { correlation: 0.85 } };
    expect(crossSkillPriors(state, on, base)?.READING?.mean).toBeCloseTo(0.85, 6);
    expect(sectionAbility(state, SkillType.READING, 0, 1, { profile: on }).theta).toBeCloseTo(0.85, 6);
    // an already measured skill always uses its own estimate
    expect(sectionAbility(state, SkillType.GRAMMAR, 0, 1, { profile: on })).toEqual({ theta: 1.2, sem: 0.4 });
  });
});
