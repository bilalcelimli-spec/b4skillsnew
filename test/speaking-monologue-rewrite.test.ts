import { describe, expect, it } from "vitest";
import {
  applyMonologueRewrite, HANDLED_ELSEWHERE, INTERLOCUTOR, interlocutorFields, monologueProblems, MONOLOGUE_REWRITES, REPLY_EXPECTED,
} from "../scripts/jobs/apply-speaking-monologue-rewrite";

/** Stored content of four items as of 2026-11-22, trimmed to the fields that matter. */
const stored = {
  "SPK-C1-0016": {
    type: "SPEAKING_PROMPT", genre: "discussion", tags: ["speaking", "c1", "discussion", "academic-seminar", "academia"],
    content: {
      prompt: "Discuss with the examiner: some scholars argue that the scientific method is insufficient for answering ethical questions.",
      rubric: "Assess effective and flexible language use.", prepTime: 75, responseTime: 180, taskType: "discussion", productLine: "Academia",
      cefrDescriptor: "Can participate fluently and precisely in academic discussions.",
      sampleBullets: ["Identifies what the scientific method offers"],
      scoringRubric: [{ name: "Task Achievement", maxScore: 2, descriptor: "Presents complex ideas fluently and precisely." }],
    },
  },
  "SPK-B1-0002": {
    type: "SPEAKING_PROMPT", genre: "problem_solving", tags: ["speaking", "b1", "discussion", "environment", "junior"],
    content: {
      prompt: "Discuss with the examiner: How much should schools do to teach students about environmental issues?",
      rubric: "Assess ability to deal with most everyday situations.", prepTime: 60, responseTime: 120, taskType: "discussion",
      sampleBullets: ["Evaluates current school role", "Asks or responds to examiner's question"],
      scoringRubric: [{ name: "Task Achievement", maxScore: 2, descriptor: "Maintains interaction on familiar topics; can express main points." }],
    },
  },
  "SPE-B1-0072": {
    type: "SPEAKING_PROMPT", genre: null, tags: ["SPEAKING", "B1", "DISCOURSE_MANAGEMENT", "discussion", "free time", "junior"],
    content: {
      prompt: "You are Yuna. … Discuss with Chidi what activity you should choose.\n- Listen to Chidi's suggestion and say what you think about it.",
      rubric: { communicativeEffectiveness: "The candidate successfully participates in the discussion … understood by the interlocutor (implied)." },
      purpose: "To discuss and agree on a free-time activity for the club.", audience: "Chidi (friend/peer)", prepTime: 30, responseTime: 90, productLine: "junior",
    },
  },
  "SPE-B1-0061-MVX1NFTX": {
    type: "SPEAKING_PROMPT", genre: "situational", tags: ["skill:speaking", "level:b1", "format:speaking_role_play"],
    content: {
      prompt: "Your manager (the examiner) wants to discuss this with you.",
      rubric: "Examiner interaction will be key to facilitate discourse.", scoringRubric: "Examiner interaction will be key to facilitate discourse.",
      prepTime: 45, responseTime: 90, timeLimitSeconds: 90,
    },
  },
} as const;

const rewriteFor = (code: string) => MONOLOGUE_REWRITES.find((r) => r.itemCode === code)!;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe("speaking monologue rewrite (2026-11-22)", () => {
  it("covers 75 distinct items and leaves SPK-C2-0009 to the C2 rewrite", () => {
    expect(MONOLOGUE_REWRITES).toHaveLength(75);
    expect(new Set(MONOLOGUE_REWRITES.map((r) => r.id)).size).toBe(75);
    expect(MONOLOGUE_REWRITES.every((r) => /^c[a-z0-9]{24}$/.test(r.id))).toBe(true);
    expect(MONOLOGUE_REWRITES.some((r) => r.itemCode && HANDLED_ELSEWHERE.has(r.itemCode))).toBe(false);
  });

  it("never changes timing", () => {
    for (const r of MONOLOGUE_REWRITES) {
      expect(r.content).not.toHaveProperty("prepTime");
      expect(r.content).not.toHaveProperty("responseTime");
      expect(r.content).not.toHaveProperty("timeLimitSeconds");
    }
  });

  it.each(MONOLOGUE_REWRITES.map((r) => [r.itemCode ?? r.id, r] as const))("%s: rewritten content assumes nobody answers back", (_code, rewrite) => {
    const strings = JSON.stringify(rewrite.content);
    expect(strings).not.toMatch(INTERLOCUTOR);
    expect(strings).not.toMatch(REPLY_EXPECTED);
    expect(strings).not.toMatch(/\[\s*EXAMINER/i);
  });

  it.each(Object.entries(stored))("%s fails before the rewrite and passes after it", (code, item) => {
    const before = copy(item);
    expect(interlocutorFields(before.content as Record<string, unknown>).length).toBeGreaterThan(0);
    const next = applyMonologueRewrite(rewriteFor(code), { tags: [...before.tags], genre: before.genre, content: before.content as Record<string, unknown> });
    expect(monologueProblems(item.type, next.content)).toEqual([]);
    expect(next.content.prepTime).toBe(item.content.prepTime);
    expect(next.content.responseTime).toBe(item.content.responseTime);
    expect(next.tags.some((t) => /discussion|role_play/.test(t))).toBe(false);
  });

  it("maps format tags and genre, and follows a duplicated string scoringRubric", () => {
    const c1 = applyMonologueRewrite(rewriteFor("SPK-C1-0016"), copy(stored["SPK-C1-0016"]) as any);
    expect(c1.content.taskType).toBe("monologue");
    expect(c1.tags).toEqual(["speaking", "c1", "monologue", "academic-seminar", "academia"]);
    expect(c1.genre).toBe("opinion");
    expect(c1.content.productLine).toBe("Academia");

    const tx = applyMonologueRewrite(rewriteFor("SPE-B1-0061-MVX1NFTX"), copy(stored["SPE-B1-0061-MVX1NFTX"]) as any);
    expect(tx.content.scoringRubric).toBe(tx.content.rubric);
    expect(tx.tags).toContain("format:speaking_monologue");

    const b1 = applyMonologueRewrite(rewriteFor("SPK-B1-0002"), copy(stored["SPK-B1-0002"]) as any);
    expect((b1.content.scoringRubric as { descriptor: string }[])[0].descriptor).not.toMatch(/interaction/i);
  });

  it("does not flag an imagined listener who only hears the candidate", () => {
    for (const prompt of [
      "Tell your friend Alex about one hobby you really like.",
      "Your friend asks: 'What technology do you use?' Answer your friend.",
      "Speak to the shop assistant: say what you are looking for.",
      "Leave Chidi a voice message about the choice.",
    ]) expect(interlocutorFields({ prompt })).toEqual([]);
    for (const prompt of [
      "The interviewer will ask you some questions.",
      "Alex will start the conversation.",
      "Listen to Chidi's suggestion and say what you think.",
      "Respond to the panel member's challenge.",
    ]) expect(interlocutorFields({ prompt })).toEqual(["prompt"]);
  });
});
