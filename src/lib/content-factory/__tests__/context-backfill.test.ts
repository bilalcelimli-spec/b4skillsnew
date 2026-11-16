import { describe, expect, it } from "vitest";
import { proposeAge, proposeContext, proposeGenre, proposeTopic } from "../context-backfill.js";

describe("proposeAge", () => {
  it("maps a single product source to its age band", () => {
    expect(proposeAge({ skill: "READING", tags: ["primary"] }).value).toBe("YOUNG_LEARNER");
    expect(proposeAge({ skill: "READING", content: { productLine: "JUNIOR_SUITE" } }).value).toBe("TEEN");
    expect(proposeAge({ skill: "READING", tags: ["Corporate"] }).value).toBe("ADULT");
  });

  it("leaves mixed or missing signals unresolved", () => {
    expect(proposeAge({ skill: "GRAMMAR", tags: ["junior", "academia"] }).value).toBeNull();
    expect(proposeAge({ skill: "GRAMMAR", tags: ["general"] }).value).toBeNull();
  });
});

describe("proposeGenre", () => {
  it("maps free-text text types into the skill's controlled list", () => {
    expect(proposeGenre({ skill: "READING", content: { textType: "notices / signs" } }).value).toBe("notice");
    expect(proposeGenre({ skill: "READING", content: { textType: "academic philosophical text" } }).value).toBe("article");
    expect(proposeGenre({ skill: "WRITING", content: { taskType: "formal_letter" } }).value).toBe("letter");
    expect(proposeGenre({ skill: "SPEAKING", content: { taskType: "roleplay" } }).value).toBe("situational");
  });

  it("returns null when no stored signal exists", () => {
    expect(proposeGenre({ skill: "GRAMMAR", content: {} }).value).toBeNull();
  });
});

describe("proposeTopic", () => {
  it("uses topic tags and content.topic", () => {
    expect(proposeTopic({ skill: "READING", tags: ["topic:how_sleep_affects_academic_performance"] }).value).toBe("education");
    expect(proposeTopic({ skill: "READING", content: { topic: "nature and wildlife" } }).value).toBe("environment");
  });

  it("does not read 'art' inside other words", () => {
    expect(proposeTopic({ skill: "READING", content: { topic: "starting a part-time plan" } }).value).not.toBe("culture");
  });
});

it("proposeContext records the evidence for each field", () => {
  const p = proposeContext({ skill: "READING", tags: ["primary", "topic:animals_at_the_zoo"], content: { textType: "simple narrative" } });
  expect(p).toMatchObject({ ageSuitability: "YOUNG_LEARNER", genre: "narrative", topic: "environment" });
  expect(p.evidence.genre).toBe("simple narrative");
});
