import { describe, expect, it } from "vitest";
import { scoreStructuredResponse } from "../structured-response";
import { stripAnswerKeys } from "../../security/answer-sanitizer";
import { SessionRespondBody } from "../../security/schemas/sessions";

describe("structured answer delivery and scoring", () => {
  it("scores word placement with distractors and strips its sequence key", () => {
    const content = { stimulus: "She [___] [___].", draggableItems: ["walks", "home", "decoy"], correctSequence: ["walks", "home"] };
    const value = { kind: "placement", placements: [0, 1] };
    expect(SessionRespondBody.safeParse({ itemId: "item-1", value }).success).toBe(true);
    expect(scoreStructuredResponse(content, value)).toBe(1);
    expect(scoreStructuredResponse(content, { kind: "placement", placements: [2, 1] })).toBe(0);
    expect(() => scoreStructuredResponse(content, { kind: "placement", placements: [0, 0] })).toThrow();
    expect(stripAnswerKeys(content)).toEqual({ stimulus: content.stimulus, draggableItems: content.draggableItems });
  });
  const matching = { draggableItems: ["meows", "barks"], dropZones: ["cat", "dog"], correctMapping: { "0": 0, "1": 1 } };
  const ordering = { draggableItems: ["second", "first"], correctOrder: [1, 0] };
  it("accepts structured answers through the actual API schema", () => {
    const itemId = "clabcdefghijklmnopqrstuvw";
    expect(SessionRespondBody.safeParse({ itemId, value: { kind: "matching", mapping: { "0": 0, "1": 1 } } }).success).toBe(true);
    expect(SessionRespondBody.safeParse({ itemId, value: { kind: "ordering", order: [1, 0] } }).success).toBe(true);
    expect(SessionRespondBody.safeParse({ itemId, value: { kind: "ordering", order: [-1, 0] } }).success).toBe(false);
  });
  it("grades matching by original indexes", () => {
    expect(scoreStructuredResponse(matching, { kind: "matching", mapping: { "0": 0, "1": 1 } })).toBe(1);
    expect(scoreStructuredResponse(matching, { kind: "matching", mapping: { "0": 1, "1": 0 } })).toBe(0);
  });
  it("rejects incomplete and duplicate matching responses", () => {
    expect(() => scoreStructuredResponse(matching, { kind: "matching", mapping: { "0": 0 } })).toThrow();
    expect(() => scoreStructuredResponse(matching, { kind: "matching", mapping: { "0": 0, "1": 0 } })).toThrow();
  });
  it("grades ordering and rejects invalid permutations", () => {
    expect(scoreStructuredResponse(ordering, { kind: "ordering", order: [1, 0] })).toBe(1);
    expect(scoreStructuredResponse(ordering, { kind: "ordering", order: [0, 1] })).toBe(0);
    expect(() => scoreStructuredResponse(ordering, { kind: "ordering", order: [1, 1] })).toThrow();
    expect(() => scoreStructuredResponse(ordering, { kind: "ordering", order: [1, 2] })).toThrow();
  });
  it("removes structured keys while retaining candidate content", () => {
    expect(stripAnswerKeys(matching)).toEqual({ draggableItems: matching.draggableItems, dropZones: matching.dropZones });
    expect(stripAnswerKeys(ordering)).toEqual({ draggableItems: ordering.draggableItems });
  });
});
