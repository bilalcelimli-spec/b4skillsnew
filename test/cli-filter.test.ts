import { describe, expect, it } from "vitest";
import { makeCellFilter } from "../src/lib/content-factory/cli-filter";

describe("makeCellFilter", () => {
  it("matches substrings, prefixes, suffixes and exact labels without regex", () => {
    const f = makeCellFilter("teen|^C1/LISTENING/SPEAKER_ATTITUDE/interview/matching$|^L-PIC3")!;
    expect(f("B2/LISTENING/GIST/conversation/matching/teen")).toBe(true);
    expect(f("C1/LISTENING/SPEAKER_ATTITUDE/interview/matching")).toBe(true);
    expect(f("C1/LISTENING/SPEAKER_ATTITUDE/interview")).toBe(false);
    expect(f("L-PIC3/primary/A1/food")).toBe(true);
    expect(f("V-PICWORD/primary/A1/L-PIC3")).toBe(false);
    expect(makeCellFilter("(a+)+$")!("aaaa")).toBe(false);
    expect(makeCellFilter(undefined)).toBeUndefined();
  });
});
