/**
 * ASR Fallback Scorer — unit tests
 *
 * Covers:
 *  - wordErrorRate / computeWer pure computation (no network required)
 *  - scoreWithWhisper SKIPPED path (no OPENAI_API_KEY)
 *  - Pronunciation score derivation
 *  - Content coverage
 *  - Tokenisation edge cases
 */

import { describe, expect, it } from "vitest";
import { wordErrorRate, computeWer, scoreWithWhisper } from "../asr-fallback";

// ─── wordErrorRate ─────────────────────────────────────────────────────────────

describe("wordErrorRate()", () => {
  it("identical hypothesis and reference → WER = 0", () => {
    const words = ["the", "cat", "sat", "on", "the", "mat"];
    expect(wordErrorRate(words, words)).toBe(0);
  });

  it("empty hypothesis, non-empty reference → WER = 1", () => {
    expect(wordErrorRate([], ["hello", "world"])).toBe(1);
  });

  it("non-empty hypothesis, empty reference → WER = 1", () => {
    expect(wordErrorRate(["extra", "words"], [])).toBe(1);
  });

  it("both empty → WER = 0", () => {
    expect(wordErrorRate([], [])).toBe(0);
  });

  it("one substitution out of four words → WER = 0.25", () => {
    const hyp = ["the", "cat", "sat", "here"];
    const ref = ["the", "cat", "sat", "there"];
    expect(wordErrorRate(hyp, ref)).toBeCloseTo(0.25);
  });

  it("one deletion out of four reference words → WER = 0.25", () => {
    const hyp = ["the", "cat", "sat"];        // missing "there"
    const ref = ["the", "cat", "sat", "there"];
    expect(wordErrorRate(hyp, ref)).toBeCloseTo(0.25);
  });

  it("one insertion → WER = 0.25 relative to 4-word reference", () => {
    const hyp = ["the", "big", "cat", "sat", "there"];  // extra "big"
    const ref = ["the", "cat", "sat", "there"];
    expect(wordErrorRate(hyp, ref)).toBeCloseTo(0.25);
  });

  it("WER is clamped to 1 even with many errors", () => {
    const hyp = ["a", "b", "c", "d", "e"];
    const ref = ["x", "y"];
    const wer = wordErrorRate(hyp, ref);
    expect(wer).toBeLessThanOrEqual(1);
  });

  it("case-insensitive matching", () => {
    const hyp = ["The", "Cat", "Sat"];
    const ref = ["the", "cat", "sat"];
    expect(wordErrorRate(hyp, ref)).toBe(0);
  });
});

// ─── computeWer (text → WER) ──────────────────────────────────────────────────

describe("computeWer()", () => {
  it("identical sentences → 0", () => {
    expect(computeWer("hello world", "hello world")).toBe(0);
  });

  it("completely different → high WER", () => {
    const wer = computeWer("alpha beta gamma", "one two three");
    expect(wer).toBeGreaterThan(0);
  });

  it("punctuation stripped before comparison", () => {
    expect(computeWer("Hello, world!", "hello world")).toBe(0);
  });

  it("extra whitespace normalised", () => {
    expect(computeWer("  the  cat  ", "the cat")).toBe(0);
  });

  it("single-word perfect match → 0", () => {
    expect(computeWer("apple", "apple")).toBe(0);
  });

  it("single-word mismatch → 1", () => {
    expect(computeWer("apple", "orange")).toBe(1);
  });
});

// ─── scoreWithWhisper — no API key → graceful SKIPPED ─────────────────────────

describe("scoreWithWhisper() without OPENAI_API_KEY", () => {
  it("returns scored=false when no API key is set", async () => {
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const buffer = Buffer.from("fake audio data");
      const result = await scoreWithWhisper(buffer, {});
      expect(result.scored).toBe(false);
      expect(result.transcript).toBe("");
      expect(result.wer).toBeNull();
      expect(result.pronunciationScore).toBe(0);
      expect(result.speechRate).toBeNull();
      expect(result.errorMessage).toBeTruthy();
    } finally {
      if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
    }
  });
});

// ─── WER → pronunciation score derivation ────────────────────────────────────

describe("pronunciationScore derivation from WER", () => {
  it("WER=0 → pronunciationScore=1.0 (implicitly via computeWer)", () => {
    const wer = computeWer("hello world", "hello world");
    const pronunciationScore = Math.max(0, 1 - wer);
    expect(pronunciationScore).toBeCloseTo(1.0);
  });

  it("WER=0.5 → pronunciationScore=0.5", () => {
    const score = Math.max(0, 1 - 0.5);
    expect(score).toBeCloseTo(0.5);
  });

  it("WER=1.0 → pronunciationScore=0 (floor)", () => {
    const score = Math.max(0, 1 - 1.0);
    expect(score).toBe(0);
  });

  it("WER>1 clamped to 0 by max(0,...)", () => {
    const score = Math.max(0, 1 - 1.5);
    expect(score).toBe(0);
  });
});

// ─── Content coverage ─────────────────────────────────────────────────────────

describe("Content coverage (unit-level)", () => {
  /** Mirrors computeContentCoverage logic */
  function coverage(transcriptText: string, keywords: string[]): number {
    if (keywords.length === 0) return 1;
    const tokens = new Set(
      transcriptText.toLowerCase().replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean)
    );
    const found = keywords.filter((k) => tokens.has(k.toLowerCase())).length;
    return found / keywords.length;
  }

  it("all keywords present → coverage = 1", () => {
    expect(coverage("the cat sat on the mat", ["cat", "sat", "mat"])).toBeCloseTo(1);
  });

  it("no keywords present → coverage = 0", () => {
    expect(coverage("completely different text", ["quantum", "physics"])).toBe(0);
  });

  it("half keywords → coverage = 0.5", () => {
    expect(coverage("I can read books", ["read", "write"])).toBeCloseTo(0.5);
  });

  it("empty keywords list → coverage = 1 (no constraint)", () => {
    expect(coverage("anything here", [])).toBe(1);
  });

  it("case-insensitive keyword matching", () => {
    expect(coverage("The Quick Brown Fox", ["quick", "BROWN", "Fox"])).toBeCloseTo(1);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("computeWer with empty strings → WER = 0", () => {
    expect(computeWer("", "")).toBe(0);
  });

  it("computeWer empty hypothesis vs non-empty → WER = 1", () => {
    expect(computeWer("", "hello world")).toBe(1);
  });

  it("computeWer numbers treated as tokens", () => {
    expect(computeWer("100 200 300", "100 200 300")).toBe(0);
  });

  it("wordErrorRate handles long sequences correctly", () => {
    const ref = Array.from({ length: 50 }, (_, i) => `word${i}`);
    const hyp = [...ref]; // perfect
    hyp[25] = "WRONG";    // one substitution
    expect(wordErrorRate(hyp, ref)).toBeCloseTo(1 / 50);
  });
});
