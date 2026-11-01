import { describe, expect, it } from "vitest";
import { crossItemRules, itemRules, type RuleItem } from "../item-content-rules";

const opts = (texts: string[], key = 0) => texts.map((text, i) => ({ text, isCorrect: i === key }));
const item = (over: Partial<RuleItem> & { content: Record<string, unknown> }): RuleItem => ({ id: Math.random().toString(36).slice(2), skill: "GRAMMAR", type: "MULTIPLE_CHOICE", ...over });
const rules = (i: RuleItem) => itemRules(i).map((h) => `${h.rule}:${h.severity}`);

// Each case is a real defect class from the 2026-11-01 bank review.
describe("itemRules", () => {
  it("flags single-response items with 8 options", () => {
    const i = item({ skill: "READING", content: { prompt: "Doctor's Surgery: book online.", passage: "x".repeat(40), options: opts(["a", "b", "c", "d", "e", "f", "g", "h"]) } });
    expect(rules(i)).toContain("OPTION_COUNT_OUT_OF_RANGE:BLOCKER");
    expect(rules(item({ content: { prompt: "I ___ happy.", options: opts(["am", "is", "are", "be"]) } }))).toEqual([]);
  });

  it("flags an instruction with no sentence stored", () => {
    expect(rules(item({ content: { prompt: "Drag the correct word to complete the sentence.", options: opts(["is", "are", "am", "be"]) } }))).toContain("NOTHING_TO_ANSWER:BLOCKER");
  });

  it("flags image-generation notes and URLs shown in the prompt", () => {
    expect(rules(item({ skill: "SPEAKING", type: "SPEAKING_PROMPT", content: { prompt: "Look at the picture.\n\n[Image description: a red train]", imageUrl: "https://x.supabase.co/a.jpg" } }))).toContain("IMAGE_DESCRIPTION_SHOWN:BLOCKER");
    expect(rules(item({ skill: "SPEAKING", type: "SPEAKING_PROMPT", content: { prompt: "Image description: A modern train.", imageUrl: "https://x.supabase.co/a.jpg" } }))).toContain("IMAGE_DESCRIPTION_SHOWN:BLOCKER");
    expect(rules(item({ skill: "SPEAKING", type: "SPEAKING_PROMPT", content: { prompt: "https://i.imgur.com/example.jpg\n\nLook at the picture.", imageUrl: "https://x.supabase.co/a.jpg" } }))).toContain("URL_IN_PROMPT:BLOCKER");
  });

  it("flags a picture reference without an image, in prompt or passage", () => {
    for (const content of [
      { prompt: "Look at Picture 2. What is it?", passage: "1. [Picture of a plant] 2. [Picture of a cow]", options: opts(["cow", "tree", "water", "plant"]) },
      { prompt: "Picture 2 is an...", passage: "Look at the pictures. Picture 1: A plant.", options: opts(["animal", "plant", "food", "object"]) },
      { prompt: "Write the correct word for each picture.\n[Picture 1: a pencil] → ___" },
    ]) expect(rules(item({ skill: "READING", content }))).toContain("PICTURE_REFERENCED_NO_IMAGE:BLOCKER");
    expect(rules(item({ skill: "SPEAKING", type: "SPEAKING_PROMPT", content: { prompt: "Look at the picture.", imageUrl: "https://x.supabase.co/a.jpg" } }))).not.toContain("PICTURE_REFERENCED_NO_IMAGE:BLOCKER");
  });

  it("treats TTS stage directions as blockers and *emphasis* by whether audio exists", () => {
    const lis = (ttsScript: string, audioUrl?: string) => item({ skill: "LISTENING", content: { prompt: "Q?", ttsScript, audioUrl, options: opts(["a", "b", "c", "d"]) } });
    expect(rules(lis("*(Sound of a busy reception area)*\nAmara: Hello."))).toContain("TTS_STAGE_DIRECTION:BLOCKER");
    expect(rules(lis("Sam: It's *really* big."))).toContain("TTS_SCRIPT_MARKUP:BLOCKER");
    expect(rules(lis("Sam: It's *really* big.", "/audio/x.wav"))).toContain("TTS_SCRIPT_MARKUP:REVIEW");
    expect(rules(lis("Sam: Plain text.", "/audio/x.wav"))).toEqual([]);
  });

  it("flags a vocabulary key that is also in the stem, not a gap word", () => {
    expect(rules(item({ skill: "VOCABULARY", content: { prompt: "We eat ___ and chips at the fish restaurant.", options: opts(["paper", "brush", "fish", "clock"], 2) } }))).toContain("KEY_IN_STEM:REVIEW");
    expect(rules(item({ skill: "VOCABULARY", content: { prompt: "We eat ___ and chips.", options: opts(["paper", "brush", "fish", "clock"], 2) } }))).toEqual([]);
  });

  it("flags five-blank all-or-nothing worksheets and hotlinked images", () => {
    expect(rules(item({ skill: "LISTENING", type: "FILL_IN_BLANKS", content: { prompt: "Notes:\nHair: ___\nColour: ___\nWearing: ___\nDrinking: ___\nType: ___", ttsScript: "A: hi", audioUrl: "/a.wav" } }))).toContain("MULTI_BLANK_ALL_OR_NOTHING:REVIEW");
    expect(rules(item({ skill: "SPEAKING", type: "SPEAKING_PROMPT", content: { prompt: "Describe it.", imageUrl: "https://images.unsplash.com/photo-1" } }))).toContain("IMAGE_EXTERNAL_HOTLINK:REVIEW");
    expect(rules(item({ skill: "SPEAKING", type: "SPEAKING_PROMPT", content: { prompt: "Describe it.", imageUrl: "https://abc.supabase.co/storage/a.jpg" } }))).toEqual([]);
  });
});

describe("crossItemRules", () => {
  it("flags items sharing a 5+ option set but not common 4-option sets", () => {
    const eight = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
    const hits = crossItemRules([item({ id: "a", content: { prompt: "Notice A", options: opts(eight, 0) } }), item({ id: "b", content: { prompt: "Notice B", options: opts(eight, 3) } })]);
    expect(hits.filter((h) => h.rule === "SHARED_OPTION_SET").map((h) => h.itemId).sort()).toEqual(["a", "b"]);
    const articles = ["a", "an", "the", "—"];
    expect(crossItemRules([item({ id: "c", content: { prompt: "I saw ___ elephant at the zoo.", options: opts(articles, 1) } }), item({ id: "d", content: { prompt: "She is ___ engineer at work.", options: opts(articles, 1) } })])).toEqual([]);
  });

  it("flags the same stem stored twice, ignoring quote style", () => {
    const hits = crossItemRules([
      item({ id: "x", skill: "VOCABULARY", content: { prompt: "The opposite of ‘cheap’ is ___.", options: opts(["expensive", "a", "b", "c"]) } }),
      item({ id: "y", skill: "VOCABULARY", content: { prompt: "The opposite of 'cheap' is ___.", options: opts(["slow", "expensive", "b", "c"], 1) } }),
    ]);
    expect(hits.filter((h) => h.rule === "DUPLICATE_STEM").map((h) => h.itemId).sort()).toEqual(["x", "y"]);
  });
});
