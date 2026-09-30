import { describe, expect, it } from "vitest";
import { normalizeBlankScaffold, scoreBlankResponse } from "../blank-response";
import { stripAnswerKeys } from "../../security/answer-sanitizer";

describe("numbered gap delivery and scoring", () => {
  it("recognizes one gap per numbered marker", () => {
    expect(normalizeBlankScaffold("One ___1___, two ___[2]___ and three ___.")).toBe("One ___, two ___ and three ___.");
  });
  it("accepts declared variants in the candidate's gap order", () => {
    const blanks = [{ acceptableAnswers: ["walks", "goes"] }, { acceptableAnswers: ["home"] }];
    expect(scoreBlankResponse(blanks, " GOES | home ")).toBe(1);
    expect(scoreBlankResponse(blanks, "home|goes")).toBe(0);
    expect(() => scoreBlankResponse(blanks, "goes")).toThrow();
    expect(stripAnswerKeys({ blanks })).toEqual({ blanks: [{}, {}] });
  });
});
