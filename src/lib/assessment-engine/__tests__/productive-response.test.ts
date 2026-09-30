import { describe, expect, it } from "vitest";
import { productiveModes, productiveScoringMode } from "../productive-response";

describe("integrated response delivery and scoring routing", () => {
  const dual = { responseFormat: "spoken-or-written", taskType: "productive" };
  it("offers both modes and routes the actual answer to the correct scorer", () => {
    expect(productiveModes("LISTENING", "MULTIPLE_CHOICE", dual)).toEqual(["WRITING", "SPEAKING"]);
    expect(productiveScoringMode("LISTENING", "MULTIPLE_CHOICE", dual, "Written summary")).toBe("WRITING");
    expect(productiveScoringMode("LISTENING", "MULTIPLE_CHOICE", dual, { audio: "base64", mimeType: "audio/webm" })).toBe("SPEAKING");
  });
  it("rejects unsupported formats and malformed audio", () => {
    expect(() => productiveScoringMode("LISTENING", "INTEGRATED_TASK", { responseFormat: "written" }, { audio: "base64", mimeType: "audio/webm" })).toThrow();
    expect(() => productiveScoringMode("LISTENING", "INTEGRATED_TASK", dual, 2)).toThrow();
  });
  it("honours the response format of a reading-integrated task", () => {
    expect(productiveScoringMode("READING", "INTEGRATED_TASK", { responseFormat: "written" }, "Essay")).toBe("WRITING");
    expect(productiveScoringMode("READING", "MULTIPLE_CHOICE", {}, "A")).toBeNull();
    expect(productiveScoringMode("WRITING", "INTEGRATED_TASK", { responseFormat: "spoken" }, { audio: "base64", mimeType: "audio/webm" })).toBe("SPEAKING");
  });
});
