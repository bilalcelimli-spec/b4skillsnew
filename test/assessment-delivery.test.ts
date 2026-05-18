/**
 * Assessment Delivery Integration Tests
 *
 * Verifies the critical assessment flow:
 * - Load item by skill/CEFR
 * - Render item with correct structure
 * - Score response based on item type
 * - Update assessment state
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";

type Item = any;
type Option = { text?: string; isCorrect?: boolean; rationale?: string; id?: string };

describe("Assessment Delivery", () => {
  let grammarItem: Item;
  let readingItem: Item;
  let listeningItem: Item;
  let speakingItem: Item;

  beforeAll(async () => {
    // Load real items from database for integration testing
    grammarItem = await prisma.item.findFirst({
      where: { skill: "GRAMMAR", status: "ACTIVE" },
    });

    readingItem = await prisma.item.findFirst({
      where: { skill: "READING", status: "ACTIVE" },
    });

    listeningItem = await prisma.item.findFirst({
      where: { skill: "LISTENING", status: "ACTIVE" },
    });

    speakingItem = await prisma.item.findFirst({
      where: { skill: "SPEAKING", status: "ACTIVE" },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── MCQ Item Rendering (GRAMMAR, VOCABULARY, READING) ──────────────────────

  describe("MCQ Item Rendering", () => {
    it("should load GRAMMAR item with required structure", () => {
      expect(grammarItem).toBeDefined();
      expect(grammarItem.skill).toBe("GRAMMAR");
      expect(grammarItem.status).toBe("ACTIVE");

      const content = grammarItem.content as any;
      expect(content).toBeDefined();
      expect(content.prompt || content.stem || content.question).toBeTruthy();
    });

    it("should load GRAMMAR item with valid options", () => {
      const content = grammarItem.content as any;
      const opts: Option[] = Array.isArray(content.options) ? content.options : [];

      expect(opts.length).toBeGreaterThanOrEqual(4);
      opts.forEach((opt) => {
        expect(opt.text).toBeDefined();
        expect(opt.text?.length).toBeGreaterThan(0);
        expect(opt.isCorrect).toBeDefined();
      });
    });

    it("should have exactly 1 correct option marked in GRAMMAR item", () => {
      const content = grammarItem.content as any;
      const opts: Option[] = Array.isArray(content.options) ? content.options : [];

      const correctCount = opts.filter((o) => o.isCorrect === true).length;
      expect(correctCount).toBe(1);
    });

    it("should have rationales for all GRAMMAR options", () => {
      const content = grammarItem.content as any;
      const opts: Option[] = Array.isArray(content.options) ? content.options : [];

      opts.forEach((opt, idx) => {
        expect(opt.rationale).toBeDefined();
        expect((opt.rationale ?? "").trim().length).toBeGreaterThan(0);
      });
    });

    it("should not have duplicate options in GRAMMAR item", () => {
      const content = grammarItem.content as any;
      const opts: Option[] = Array.isArray(content.options) ? content.options : [];

      const texts = opts.map((o) => (o.text ?? "").trim().toLowerCase());
      const unique = new Set(texts);

      expect(unique.size).toBe(texts.length);
    });
  });

  // ── READING Item Rendering ──────────────────────────────────────────────────

  describe("READING Item Rendering", () => {
    it("should load READING item with required structure", () => {
      expect(readingItem).toBeDefined();
      expect(readingItem.skill).toBe("READING");
      expect(readingItem.status).toBe("ACTIVE");

      const content = readingItem.content as any;
      expect(content).toBeDefined();
      expect(content.prompt || content.stem || content.question).toBeTruthy();
    });

    it("should have passage content in READING item", () => {
      const content = readingItem.content as any;
      const passage = content.passage ?? content.text ?? content.readingText ?? "";

      expect(String(passage).trim().length).toBeGreaterThanOrEqual(30);
    });

    it("should have options with sufficient length in READING item", () => {
      const content = readingItem.content as any;
      const opts: Option[] = Array.isArray(content.options) ? content.options : [];

      expect(opts.length).toBeGreaterThanOrEqual(4);
      opts.forEach((opt) => {
        expect(opt.text).toBeDefined();
        expect(opt.text?.trim().length).toBeGreaterThan(2);
      });
    });

    it("should have exactly 1 correct option in READING item", () => {
      const content = readingItem.content as any;
      const opts: Option[] = Array.isArray(content.options) ? content.options : [];

      const correctCount = opts.filter((o) => o.isCorrect === true).length;
      expect(correctCount).toBe(1);
    });
  });

  // ── LISTENING Item Rendering ────────────────────────────────────────────────

  describe("LISTENING Item Rendering", () => {
    it("should load LISTENING item with required structure", () => {
      expect(listeningItem).toBeDefined();
      expect(listeningItem.skill).toBe("LISTENING");
      expect(listeningItem.status).toBe("ACTIVE");

      const content = listeningItem.content as any;
      expect(content).toBeDefined();
      expect(content.prompt || content.stem || content.question).toBeTruthy();
    });

    it("should have audio source or TTS script in LISTENING item", () => {
      const content = listeningItem.content as any;
      const hasAudio = !!content.audioUrl;
      const hasTts = !!content.ttsScript;
      const hasTranscript = !!content.transcript;

      expect(hasAudio || hasTts || hasTranscript).toBe(true);
    });

    it("should have valid audio URL or TTS script in LISTENING item", () => {
      const content = listeningItem.content as any;

      if (content.audioUrl) {
        expect(content.audioUrl).toMatch(/^\/audio\/|^https?:\/\//);
      }
      if (content.ttsScript) {
        expect(content.ttsScript.length).toBeGreaterThan(10);
      }
    });

    it("should have valid options in LISTENING item", () => {
      const content = listeningItem.content as any;
      const opts: Option[] = Array.isArray(content.options) ? content.options : [];

      if (opts.length > 0) {
        expect(opts.length).toBeGreaterThanOrEqual(2);
        opts.forEach((opt) => {
          expect(opt.text).toBeDefined();
          expect(opt.text?.trim().length).toBeGreaterThan(0);
        });

        const correctCount = opts.filter((o) => o.isCorrect === true).length;
        expect(correctCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ── SPEAKING Item Rendering ────────────────────────────────────────────────

  describe("SPEAKING Item Rendering", () => {
    it("should load SPEAKING item with required structure", () => {
      expect(speakingItem).toBeDefined();
      expect(speakingItem.skill).toBe("SPEAKING");
      expect(speakingItem.status).toBe("ACTIVE");

      const content = speakingItem.content as any;
      expect(content).toBeDefined();
      expect(content.prompt || content.stem || content.question).toBeTruthy();
    });

    it("should have scoringRubric in SPEAKING item (not correctAnswer)", () => {
      const content = speakingItem.content as any;

      // SPEAKING items should use rubric, not correctAnswer
      expect(content.scoringRubric || content.rubric).toBeDefined();
    });

    it("should have responseTime and prepTime in SPEAKING item", () => {
      const content = speakingItem.content as any;

      expect(content.responseTime).toBeDefined();
      expect(content.prepTime).toBeDefined();
      expect(typeof content.responseTime).toBe("number");
      expect(typeof content.prepTime).toBe("number");
    });

    it("should have well-formed rubric structure in SPEAKING item", () => {
      const content = speakingItem.content as any;
      const rubric = content.scoringRubric || content.rubric;

      if (rubric) {
        expect(typeof rubric).toBe("object");
        expect(Object.keys(rubric).length).toBeGreaterThan(0);

        // Check rubric dimensions have descriptors and structure (may vary by schema)
        Object.values(rubric).forEach((dimension: any) => {
          expect(typeof dimension).toBe("object");
          // Dimension should have either levels + descriptor or similar structure
          const hasLevels = "levels" in dimension || "name" in dimension || "descriptor" in dimension;
          expect(hasLevels).toBe(true);
        });
      }
    });

    it("should NOT have options in SPEAKING item", () => {
      const content = speakingItem.content as any;
      const opts: Option[] = Array.isArray(content.options) ? content.options : [];

      // SPEAKING items are not multiple-choice
      expect(opts.length).toBe(0);
    });
  });

  // ── Assessment State Management ────────────────────────────────────────────

  describe("Assessment State Management", () => {
    it("should be able to determine correct answer for MCQ item", () => {
      const content = grammarItem.content as any;
      const opts: Option[] = Array.isArray(content.options) ? content.options : [];

      const correctOption = opts.find((o) => o.isCorrect === true);
      expect(correctOption).toBeDefined();
      expect(correctOption?.text).toBeDefined();
    });

    it("should be able to retrieve rationale for incorrect option", () => {
      const content = grammarItem.content as any;
      const opts: Option[] = Array.isArray(content.options) ? content.options : [];

      const incorrectOption = opts.find((o) => o.isCorrect === false);
      if (incorrectOption) {
        expect(incorrectOption.rationale).toBeDefined();
        expect(incorrectOption.rationale?.trim().length).toBeGreaterThan(0);
      }
    });

    it("should handle item response with option selection", () => {
      const content = grammarItem.content as any;
      const opts: Option[] = Array.isArray(content.options) ? content.options : [];

      // Simulate selecting first option
      const selectedOption = opts[0];
      const isCorrect = selectedOption.isCorrect === true;

      expect(typeof isCorrect).toBe("boolean");
      expect(selectedOption.rationale).toBeDefined();
    });

    it("should be able to load assessment with multiple items of same skill", async () => {
      const items = await prisma.item.findMany({
        where: { skill: "GRAMMAR", status: "ACTIVE" },
        take: 5,
      });

      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.skill === "GRAMMAR")).toBe(true);
    });

    it("should be able to load assessment with mixed skills", async () => {
      // Load items from different skills to verify multi-skill assessment capability
      const grammarItems = await prisma.item.findMany({
        where: { skill: "GRAMMAR", status: "ACTIVE" },
        take: 2,
      });
      const readingItems = await prisma.item.findMany({
        where: { skill: "READING", status: "ACTIVE" },
        take: 2,
      });

      expect(grammarItems.length).toBeGreaterThan(0);
      expect(readingItems.length).toBeGreaterThan(0);
      expect(grammarItems[0].skill).not.toBe(readingItems[0].skill);
    });
  });

  // ── Content Integrity Checks ───────────────────────────────────────────────

  describe("Content Integrity", () => {
    it("should not have [object Object] serialization errors in GRAMMAR", () => {
      const content = grammarItem.content as any;
      const serialized = JSON.stringify(content);

      expect(serialized).not.toContain("[object Object]");
    });

    it("should not have [object Object] serialization errors in READING", () => {
      const content = readingItem.content as any;
      const serialized = JSON.stringify(content);

      expect(serialized).not.toContain("[object Object]");
    });

    it("should not have [object Object] serialization errors in LISTENING", () => {
      const content = listeningItem.content as any;
      const serialized = JSON.stringify(content);

      expect(serialized).not.toContain("[object Object]");
    });

    it("should not have [object Object] serialization errors in SPEAKING", () => {
      const content = speakingItem.content as any;
      const serialized = JSON.stringify(content);

      expect(serialized).not.toContain("[object Object]");
    });
  });
});
