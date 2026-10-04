import { describe, it, expect } from "vitest";
import { scriptToText, normalizeSourceFields } from "../src/lib/content-factory/script-text";
import { extractFingerprint } from "../src/lib/content-factory/duplicate-detector";

describe("scriptToText", () => {
  it("passes strings through", () => expect(scriptToText("Maria: Hi.")).toBe("Maria: Hi."));
  it("joins turn objects with speakers", () => {
    expect(scriptToText([{ speaker: "Maria", text: "Hello." }, { speaker: "Tom", line: "Hi there." }])).toBe("Maria: Hello.\nTom: Hi there.");
  });
  it("handles nested turns, bare strings and nulls", () => {
    expect(scriptToText({ turns: ["A.", { text: "B." }] })).toBe("A.\nB.");
    expect(scriptToText(null)).toBe("");
    expect(scriptToText(undefined)).toBe("");
  });
  it("never yields [object Object]", () => {
    expect(scriptToText([{ foo: 1 }, { speaker: "X", text: "ok" }])).toBe("X: ok");
    expect(scriptToText({ a: 1 })).not.toContain("[object Object]");
  });
});

describe("normalizeSourceFields", () => {
  it("converts only non-string source fields", () => {
    const out = normalizeSourceFields({ ttsScript: [{ speaker: "A", text: "x" }], prompt: "keep", passage: "already text" });
    expect(out.ttsScript).toBe("A: x");
    expect(out.prompt).toBe("keep");
    expect(out.passage).toBe("already text");
  });
});

describe("extractFingerprint with turn-list scripts", () => {
  it("does not throw and includes the spoken text", () => {
    const fp = extractFingerprint({ ttsScript: [{ speaker: "Maria", text: "Remote work helps." }], prompt: "Match each speaker." });
    expect(fp).toContain("Maria: Remote work helps.");
  });
});

import { unusableSourceFields } from "../src/lib/content-factory/script-text";

describe("unknown shapes never destroy data", () => {
  it("handles speaker maps and single-key turns", () => {
    expect(scriptToText({ Maria: "Hello.", Tom: "Hi." })).toBe("Maria: Hello.\nTom: Hi.");
    expect(scriptToText([{ Maria: "Hello." }, { Tom: "Hi." }])).toBe("Maria: Hello.\nTom: Hi.");
    expect(scriptToText([["Maria", "Hello."], ["Tom", "Hi."]])).toBe("Maria: Hello.\nTom: Hi.");
  });
  it("keeps the original value when nothing can be extracted", () => {
    const weird = { foo: 42, bar: { baz: true } };
    const out = normalizeSourceFields({ ttsScript: weird as any });
    expect(out.ttsScript).toBe(weird);
    expect(unusableSourceFields(out)).toEqual(["ttsScript"]);
  });
  it("flags empty strings as unusable", () => {
    expect(unusableSourceFields({ passage: "   " })).toEqual(["passage"]);
    expect(unusableSourceFields({ passage: "text" })).toEqual([]);
  });
});
