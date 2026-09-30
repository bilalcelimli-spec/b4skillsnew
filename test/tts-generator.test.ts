import { describe, expect, it } from "vitest";
import { detectSpeakers, resolveListeningScript } from "../src/lib/audio/tts-generator.js";

describe("listening TTS source selection", () => {
  it("recognizes titles and multi-word speaker names", () => {
    expect(detectSpeakers("Ms. Green: Hello.\nTom: Hi.\nMs. Green: Sit down.")).toEqual([
      "Ms. Green",
      "Tom",
    ]);
    expect(detectSpeakers("Prof. Chen: Begin.\nDr. Amara Diallo: I agree.")).toEqual([
      "Prof. Chen",
      "Dr. Amara Diallo",
    ]);
  });

  it("uses the labelled passage when an old ttsScript collapsed the dialogue", () => {
    const passage = "Ms. Green: Good morning.\nTom: Good morning.";
    expect(resolveListeningScript({
      numberOfSpeakers: 2,
      speakers: ["Ms. Green", "Tom"],
      passage,
      ttsScript: "Good morning.\nGood morning.",
    })).toBe(passage);
  });

  it("keeps the curated ttsScript for a monologue", () => {
    expect(resolveListeningScript({
      numberOfSpeakers: 1,
      passage: "[Lecturer]\nA longer source passage.",
      ttsScript: "A pronunciation-safe source passage.",
    })).toBe("A pronunciation-safe source passage.");
  });
});
