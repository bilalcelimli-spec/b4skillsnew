import { describe, expect, it } from "vitest";
import { PRODUCT_LINE_PROFILES, getProfile } from "../profiles.js";

describe("product-line flow contracts", () => {
  it("defines every supported assessment product", () => {
    expect(Object.keys(PRODUCT_LINE_PROFILES)).toEqual([
      "Primary (7-10)",
      "Junior Suite (11-14)",
      "15-Min Diagnostic",
      "Express Assessment (30-Min)",
      "General English",
      "Academia",
      "Corporate",
      "Language Schools",
      "Specialized / Integrated Skills",
    ]);
  });

  it.each(Object.entries(PRODUCT_LINE_PROFILES))(
    "%s has a coherent section, blueprint, and duration contract",
    (_key, profile) => {
      expect(profile.sectionOrder.length).toBeGreaterThan(0);
      expect(new Set(profile.sectionOrder).size).toBe(profile.sectionOrder.length);
      expect(profile.estimatedDurationMin[0]).toBeLessThanOrEqual(profile.estimatedDurationMin[1]);
      expect(profile.maxDurationMs).toBeGreaterThanOrEqual(profile.estimatedDurationMin[1] * 60_000);

      for (const skill of profile.sectionOrder) {
        const config = profile.sectionConfig[skill];
        expect(config, `${profile.name}/${skill} config`).toBeDefined();
        expect(config.minItems).toBeGreaterThan(0);
        expect(config.maxItems).toBeGreaterThanOrEqual(config.minItems);
        expect(profile.blueprint.filter((entry) => entry.skill === skill)).toHaveLength(1);
      }

      if (profile.sectionOrder.includes("WRITING" as any)) {
        expect(profile.writingTaskSpecs?.length ?? 0).toBeGreaterThanOrEqual(profile.sectionConfig.WRITING.minItems);
      }
    },
  );

  it("keeps the legacy diagnostic key but exposes an honest customer-facing duration", () => {
    const profile = getProfile("15-Min Diagnostic");
    expect(profile.displayName).toBe("Rapid Diagnostic (30–40 Min)");
    expect(profile.estimatedDurationMin).toEqual([30, 40]);
  });

  it("falls back safely to General English for unknown product names", () => {
    expect(getProfile("unknown").name).toBe("General English");
  });
});
