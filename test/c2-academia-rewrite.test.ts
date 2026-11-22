import { describe, expect, it } from "vitest";
import { applyRewrite, INTERLOCUTOR, REWRITES, rewriteProblems } from "../scripts/jobs/apply-c2-academia-rewrite";

const stored: Record<string, { skill: string; type: string; tags: string[]; content: Record<string, unknown> }> = {
  "SPK-C2-0009": { skill: "SPEAKING", type: "SPEAKING_RESPONSE", tags: ["speaking", "c2", "discussion", "academia"],
    content: { prompt: "Discuss with the examiner the following proposition.", prepTime: 90, responseTime: 210, taskType: "discussion", productLine: "academia" } },
  "WRT-C2-0010": { skill: "WRITING", type: "OPEN_RESPONSE", tags: ["writing", "c2", "epistolary-fiction", "creative", "academia"],
    content: { prompt: "Write a piece of epistolary short fiction.", minWords: 280, maxWords: 380, taskType: "story", productLine: "academia", sampleAnswer: "From: a\nTo: b" } },
};

describe("C2 Academia rewrite (2026-11-22)", () => {
  it("flags the old speaking prompt for assuming an examiner", () => {
    expect(INTERLOCUTOR.test(String(stored["SPK-C2-0009"].content.prompt))).toBe(true);
  });

  it.each(REWRITES.map((r) => [r.itemCode, r] as const))("%s passes every check after the rewrite", (code, rewrite) => {
    const item = stored[code];
    const next = applyRewrite(rewrite, item);
    expect(rewriteProblems(item.skill, item.type, next.content)).toEqual([]);
    expect(next.content.productLine).toBe("academia");
  });

  it("turns the speaking task into a monologue and the writing task into an essay", () => {
    const speaking = applyRewrite(REWRITES[0], stored["SPK-C2-0009"]);
    expect(speaking.content.taskType).toBe("monologue");
    expect(speaking.tags).toContain("monologue");
    expect(speaking.tags).not.toContain("discussion");
    const writing = applyRewrite(REWRITES[1], stored["WRT-C2-0010"]);
    expect(writing.content.taskType).toBe("essay");
    expect(writing.tags).toEqual(["writing", "c2", "essay", "research-culture", "academia"]);
    expect(String(writing.content.sampleAnswer)).not.toMatch(/^From:/m);
  });

  it("rejects a sample answer outside the word range", () => {
    const writing = applyRewrite(REWRITES[1], stored["WRT-C2-0010"]);
    expect(rewriteProblems("WRITING", "OPEN_RESPONSE", { ...writing.content, sampleAnswer: "Too short." })).toEqual(
      expect.arrayContaining([expect.stringMatching(/sample answer is 2 words/)]));
  });
});
