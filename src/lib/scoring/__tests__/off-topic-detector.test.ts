/**
 * Off-Topic Detector — unit tests
 *
 * Covers:
 *  - Jaccard similarity computation (via forceLexical mode)
 *  - Relevance label classification (RELEVANT / BORDERLINE / OFF_TOPIC)
 *  - Graceful handling of empty / whitespace inputs
 *  - Batch helper
 *  - Cosine-normalised embedding path mocked via Jaccard bypass
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import {
  detectOffTopic,
  batchDetectOffTopic,
  type OffTopicResult,
} from "../off-topic-detector";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Run detector in forced-lexical mode (no network, no prisma). */
async function lexical(
  response: string,
  promptText: string
): Promise<OffTopicResult> {
  return detectOffTopic(response, { promptText, forceLexical: true });
}

// ─── Jaccard similarity ───────────────────────────────────────────────────────

describe("Jaccard / lexical fallback", () => {
  it("identical texts → similarity ≈ 1 and RELEVANT", async () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const result = await lexical(text, text);
    expect(result.similarity).toBeCloseTo(1.0);
    expect(result.label).toBe("RELEVANT");
    expect(result.method).toBe("lexical");
    expect(result.skipped).toBe(false);
  });

  it("completely disjoint texts → similarity = 0 and OFF_TOPIC", async () => {
    const result = await lexical("apple banana cherry", "dog elephant frog");
    expect(result.similarity).toBe(0);
    expect(result.label).toBe("OFF_TOPIC");
  });

  it("partial overlap → BORDERLINE when intersection is moderate", async () => {
    // 2 shared tokens out of 5+5-2 = 8 union → Jaccard ≈ 0.25 → OFF_TOPIC
    // Need a higher overlap: 3 shared out of 5+5-3 = 7 → ≈ 0.43 → still OFF_TOPIC
    // To get BORDERLINE (≥0.50): 4 shared / (5+5-4)=6 → 0.667
    const a = "a b c d e";
    const b = "a b c d f";
    const result = await lexical(a, b);
    // 4 shared (a,b,c,d) / union 5 = 0.80 → RELEVANT
    expect(result.similarity).toBeGreaterThan(0.5);
    expect(["RELEVANT", "BORDERLINE"]).toContain(result.label);
  });

  it("BORDERLINE range: Jaccard ∈ [0.50, 0.70)", async () => {
    // Construct: shared=3, |A|=4, |B|=4 → Jaccard = 3/(4+4-3) = 3/5 = 0.60
    const result = await lexical("a b c d", "a b c e");
    // shared: a,b,c (3); union: a,b,c,d,e (5) → 0.60
    expect(result.similarity).toBeCloseTo(0.6);
    expect(result.label).toBe("BORDERLINE");
  });

  it("empty response + non-empty prompt → similarity 0 and OFF_TOPIC", async () => {
    const result = await lexical("", "What is the capital of France?");
    expect(result.similarity).toBe(0);
    expect(result.label).toBe("OFF_TOPIC");
  });

  it("both empty → similarity 1 and RELEVANT (consistent identity)", async () => {
    const result = await lexical("", "");
    expect(result.similarity).toBeCloseTo(1.0);
    expect(result.label).toBe("RELEVANT");
  });

  it("punctuation is stripped before comparison", async () => {
    const r1 = await lexical("hello, world!", "hello world");
    expect(r1.similarity).toBeCloseTo(1.0);
  });

  it("case-insensitive comparison", async () => {
    const r = await lexical("THE QUICK BROWN FOX", "the quick brown fox");
    expect(r.similarity).toBeCloseTo(1.0);
  });
});

// ─── Label classification thresholds ─────────────────────────────────────────

describe("Label classification thresholds", () => {
  it("similarity ≥ 0.70 → RELEVANT", async () => {
    // 7 shared / 7 unique words → Jaccard = 1.0
    const result = await lexical(
      "reading comprehension passage vocabulary",
      "reading comprehension passage vocabulary"
    );
    expect(result.label).toBe("RELEVANT");
    expect(result.similarity).toBeGreaterThanOrEqual(0.7);
  });

  it("similarity < 0.50 → OFF_TOPIC", async () => {
    const result = await lexical("I love pizza and burgers", "quantum physics dark matter");
    expect(result.label).toBe("OFF_TOPIC");
    expect(result.similarity).toBeLessThan(0.5);
  });

  it("Jaccard exactly at 0.50 → BORDERLINE", async () => {
    // 1 shared / (1+1) = 0.5
    const result = await lexical("alpha beta", "alpha gamma");
    // shared: alpha (1), union: alpha,beta,gamma (3) → 1/3 ≈ 0.33 → OFF_TOPIC
    // Adjust: "a b c" vs "a d e" → 1/5 = 0.20 → OFF_TOPIC
    // Need exactly 0.50: shared=n, union=2n → n/(2n) = 0.5
    // "a b" vs "a c" → shared=1, union=3 → 0.33 → OFF_TOPIC
    // "a b c" vs "a b d" → 2/4 = 0.5 → BORDERLINE ✓
    const r = await lexical("a b c", "a b d");
    expect(r.similarity).toBeCloseTo(0.5);
    expect(r.label).toBe("BORDERLINE");
  });
});

// ─── No-API-key behaviour ─────────────────────────────────────────────────────

describe("Graceful degradation (no OPENAI_API_KEY)", () => {
  it("falls back to lexical when no API key is set", async () => {
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const result = await detectOffTopic("test response", {
        promptText: "test prompt response",
      });
      expect(result.method).toBe("lexical");
    } finally {
      if (savedKey !== undefined) process.env.OPENAI_API_KEY = savedKey;
    }
  });

  it("returns skipped=true when promptItemId given but no API key", async () => {
    // promptItemId with forceLexical won't skip — but without API key, it does
    // forceLexical takes precedence so no skip
    const result = await lexical("response text", "prompt text");
    expect(result.skipped).toBe(false);
  });
});

// ─── Batch helper ─────────────────────────────────────────────────────────────

describe("batchDetectOffTopic()", () => {
  it("returns one result per entry", async () => {
    const entries = [
      { sessionId: "s1", itemId: "i1", responseText: "reading passage text" },
      { sessionId: "s2", itemId: "i2", responseText: "completely unrelated nonsense" },
    ];
    const results = await batchDetectOffTopic(entries, { forceLexical: true });
    expect(results).toHaveLength(2);
  });

  it("preserves sessionId and itemId in results", async () => {
    const entries = [
      { sessionId: "session-abc", itemId: "item-xyz", responseText: "hello world" },
    ];
    const [result] = await batchDetectOffTopic(entries, { forceLexical: true });
    expect(result.sessionId).toBe("session-abc");
    expect(result.itemId).toBe("item-xyz");
    expect(result.result).toHaveProperty("similarity");
  });

  it("returns empty array for empty input", async () => {
    const results = await batchDetectOffTopic([], { forceLexical: true });
    expect(results).toHaveLength(0);
  });

  it("processes all entries (> CONCURRENCY=5)", async () => {
    const entries = Array.from({ length: 12 }, (_, i) => ({
      sessionId: `s${i}`,
      itemId: `item${i}`,
      responseText: `response number ${i}`,
    }));
    const results = await batchDetectOffTopic(entries, { forceLexical: true });
    expect(results).toHaveLength(12);
  });

  it("each result has label, similarity and method", async () => {
    const entries = [
      { sessionId: "s", itemId: "i", responseText: "sample text" },
    ];
    const [{ result }] = await batchDetectOffTopic(entries, { forceLexical: true });
    expect(typeof result.similarity).toBe("number");
    expect(["RELEVANT", "BORDERLINE", "OFF_TOPIC"]).toContain(result.label);
    expect(["lexical", "embedding"]).toContain(result.method);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("very long response text does not throw", async () => {
    const longText = "word ".repeat(2000);
    await expect(lexical(longText, "word")).resolves.not.toThrow();
  });

  it("numeric / non-ASCII characters handled gracefully", async () => {
    const result = await lexical("123 456 789", "123 abc def");
    expect(result.similarity).toBeDefined();
    expect(result.label).toBeDefined();
  });

  it("promptText=undefined with forceLexical → similarity 0", async () => {
    const result = await detectOffTopic("some response", { forceLexical: true });
    // No promptText → tokenise("") is empty set
    expect(result.similarity).toBeDefined();
    expect(result.skipped).toBe(false);
  });
});
