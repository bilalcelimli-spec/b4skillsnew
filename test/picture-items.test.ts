import { describe, expect, it } from "vitest";
import { normalizeDialogue, shapeContent } from "../src/lib/content-factory/picture-items";
import { parseSpeakerTurn } from "../src/lib/audio/speaker-labels";

describe("picture items", () => {
  it("splits a one-line dialogue into one turn per line", () => {
    const out = normalizeDialogue("Elif: What do you have for your snack, Jonas?Jonas: I have cookies.Elif: Are they chocolate cookies?Jonas: No, they are plain.");
    const lines = out.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines.map((l) => parseSpeakerTurn(l)?.speaker)).toEqual(["Elif", "Jonas", "Elif", "Jonas"]);
    expect(lines[0]).toBe("Elif: What do you have for your snack, Jonas?");
  });

  it("leaves a well-formed dialogue unchanged", () => {
    const s = "Mia: Is it the red ball?\nTom: No, the blue one.";
    expect(normalizeDialogue(s)).toBe(s);
  });

  it("shapes listening picture options with an empty text and the key outside the options' text", () => {
    const r = shapeContent("L-PIC3", { prompt: "What does Tom want?", ttsScript: "Mia: Hi.Tom: The blue one.", correctIndex: 1,
      options: [{ imageDescription: "a red ball", imageAlt: "a red ball" }, { imageDescription: "a blue ball", imageAlt: "a blue ball" }, { imageDescription: "a blue kite", imageAlt: "a blue kite" }] });
    expect(r.content?.options.map((o: any) => [o.text, o.isCorrect])).toEqual([["", false], ["", true], ["", false]]);
    expect(r.content?.ttsScript).toBe("Mia: Hi.\nTom: The blue one.");
  });

  it("rejects malformed model output", () => {
    expect(shapeContent("V-PICWORD", { options: ["a", "b"], correctIndex: 0, imageDescription: "x" }).reason).toBeTruthy();
    expect(shapeContent("R-PICSENT", { options: ["a", "b", "c"], correctIndex: 5, sceneDescription: "x" }).reason).toBeTruthy();
  });
});
