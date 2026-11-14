import { describe, expect, it } from "vitest";
import { resolveItemType } from "../src/lib/content-factory/blueprint";
import { matchingRules } from "../src/lib/content-factory/generation-guidelines";
import { buildSystemPrompt } from "../src/lib/content-factory/batch-generator";

const cell = (over: Record<string, unknown>) => ({ skill: "LISTENING", cefr: "C1", subskill: "SPEAKER_ATTITUDE", ...over }) as any;

describe("matching-first defaults (Faz 2)", () => {
  it("defaults B2+ receptive inference / attitude / gist cells to matching", () => {
    expect(resolveItemType(cell({}))).toBe("DRAG_DROP");
    expect(resolveItemType(cell({ skill: "READING", cefr: "B2", subskill: "INFERENCE" }))).toBe("DRAG_DROP");
    expect(resolveItemType(cell({ cefr: "B2", subskill: "GIST" }))).toBe("DRAG_DROP");
  });

  it("keeps MCQ below B2, for detail subskills, and for productive skills", () => {
    expect(resolveItemType(cell({ cefr: "B1" }))).toBe("MULTIPLE_CHOICE");
    expect(resolveItemType(cell({ subskill: "FACTUAL_DETAIL" }))).toBe("MULTIPLE_CHOICE");
    expect(resolveItemType(cell({ skill: "WRITING", subskill: "STANCE" }))).toBe("WRITING_PROMPT");
  });

  it("an explicit itemType wins", () => {
    expect(resolveItemType(cell({ itemType: "MULTIPLE_CHOICE" }))).toBe("MULTIPLE_CHOICE");
  });

  it("adds attitude rules only to attitude matching", () => {
    expect(matchingRules("LISTENING", "SPEAKER_ATTITUDE")).toContain("ATTITUDE MATCHING RULES");
    expect(matchingRules("READING", "WRITER_ATTITUDE")).toContain("writer");
    expect(matchingRules("LISTENING", "INFERENCE")).not.toContain("ATTITUDE MATCHING RULES");
    // Two-speaker recordings gave only 2 pairs (5 of 10 Junior drafts failed structure).
    expect(matchingRules("LISTENING")).toContain("3–4 named speakers");
  });

  it("the prompt for a default C1 attitude cell asks for matching with attitude rules; legacy keeps MCQ", () => {
    const base = { ...cell({}), genre: "interview", topic: "media", ageSuitability: "UNIVERSAL" };
    const prompt = buildSystemPrompt(base, 3, 0, { seed: 1 });
    expect(prompt).toContain('"itemType":      "DRAG_DROP"');
    expect(prompt).toContain("ATTITUDE MATCHING RULES");
    expect(buildSystemPrompt(base, 3, 0, { seed: 1, legacy: true })).toContain("ITEM TYPE:           MULTIPLE_CHOICE");
  });
});
