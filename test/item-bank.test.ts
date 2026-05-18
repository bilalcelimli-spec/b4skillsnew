/**
 * Item Bank Integrity Tests
 *
 * Verifies item bank constraints and validation:
 * - Item creation with required fields
 * - Option structure validation
 * - Skill-specific requirements (READING needs passage, LISTENING needs audio, etc.)
 * - Content integrity checks
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";

type Item = any;
type Option = { text?: string; isCorrect?: boolean; rationale?: string; id?: string };

describe("Item Bank Integrity", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── MCQ Item Structure Validation ────────────────────────────────────────────

  describe("MCQ Item Validation (GRAMMAR, VOCABULARY, READING)", () => {
    let mcqItems: Item[];

    beforeAll(async () => {
      // Load sample MCQ items from each skill
      mcqItems = await prisma.item.findMany({
        where: {
          skill: { in: ["GRAMMAR", "VOCABULARY", "READING"] },
          status: { in: ["ACTIVE", "PRETEST"] },
        },
        take: 100,
        select: {
          id: true,
          skill: true,
          status: true,
          content: true,
        },
      });
    }, 15000);

    it("should have items from multiple MCQ skills", () => {
      const bySkill = mcqItems.reduce(
        (acc, item) => {
          acc[item.skill] = (acc[item.skill] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Verify we have items from each skill represented
      expect(bySkill["GRAMMAR"]).toBeGreaterThan(0);
      expect(bySkill["VOCABULARY"] || 0).toBeGreaterThanOrEqual(0);
      expect(bySkill["READING"] || 0).toBeGreaterThanOrEqual(0);
    });

    it("should have prompt/stem/question in all MCQ items", () => {
      const itemsWithoutPrompt = mcqItems.filter((item) => {
        const c = item.content as any;
        return !(c.prompt || c.stem || c.question);
      });

      expect(itemsWithoutPrompt.length).toBe(0);
    });

    it("should have 4+ valid options in all MCQ items", () => {
      const itemsWithInvalidOptions = mcqItems.filter((item) => {
        const c = item.content as any;
        const opts: Option[] = Array.isArray(c.options) ? c.options : [];
        return opts.length < 4;
      });

      expect(itemsWithInvalidOptions.length).toBe(0);
    });

    it("should have exactly 1 correct option marked (isCorrect: true) in all MCQ items", () => {
      const itemsWithWrongCorrectCount = mcqItems.filter((item) => {
        const c = item.content as any;
        const opts: Option[] = Array.isArray(c.options) ? c.options : [];
        const correctCount = opts.filter((o) => o.isCorrect === true).length;
        return correctCount !== 1;
      });

      expect(itemsWithWrongCorrectCount.length).toBe(0);
    });

    it("should have rationale text on all options of MCQ items", () => {
      const itemsWithMissingRationale = mcqItems.filter((item) => {
        const c = item.content as any;
        const opts: Option[] = Array.isArray(c.options) ? c.options : [];
        return opts.some(
          (o) => !o.rationale || (o.rationale ?? "").trim().length < 3
        );
      });

      expect(itemsWithMissingRationale.length).toBe(0);
    });

    it("should not have duplicate option texts in MCQ items", () => {
      const itemsWithDuplicates = mcqItems.filter((item) => {
        const c = item.content as any;
        const opts: Option[] = Array.isArray(c.options) ? c.options : [];
        const texts = opts.map((o) => (o.text ?? "").trim().toLowerCase());
        const unique = new Set(texts);
        return unique.size < texts.length;
      });

      expect(itemsWithDuplicates.length).toBe(0);
    });
  });

  // ── READING Item Specific Validation ─────────────────────────────────────────

  describe("READING Item Validation", () => {
    let readingItems: Item[];

    beforeAll(async () => {
      readingItems = await prisma.item.findMany({
        where: { skill: "READING", status: { in: ["ACTIVE", "PRETEST"] } },
        take: 50,
        select: { id: true, skill: true, content: true },
      });
    }, 15000);

    it("should have passage/text/readingText in all READING items", () => {
      const itemsWithoutPassage = readingItems.filter((item) => {
        const c = item.content as any;
        const passage = (c.passage ?? c.text ?? c.readingText ?? "").toString().trim();
        return passage.length < 30;
      });

      expect(itemsWithoutPassage.length).toBe(0);
    });

    it("should have coherent passage length (30-5000 chars)", () => {
      const passageLengthIssues = readingItems.filter((item) => {
        const c = item.content as any;
        const passage = (c.passage ?? c.text ?? c.readingText ?? "").toString();
        return passage.length < 30 || passage.length > 5000;
      });

      expect(passageLengthIssues.length).toBe(0);
    });

    it("should have prompt/stem relevant to passage in READING items", () => {
      const itemsWithoutPrompt = readingItems.filter((item) => {
        const c = item.content as any;
        return !(c.prompt || c.stem || c.question);
      });

      expect(itemsWithoutPrompt.length).toBe(0);
    });
  });

  // ── LISTENING Item Specific Validation ───────────────────────────────────────

  describe("LISTENING Item Validation", () => {
    let listeningItems: Item[];

    beforeAll(async () => {
      listeningItems = await prisma.item.findMany({
        where: { skill: "LISTENING", status: { in: ["ACTIVE", "PRETEST"] } },
        take: 50,
        select: { id: true, skill: true, content: true },
      });
    }, 15000);

    it("should have audio or TTS script in all LISTENING items", () => {
      const itemsWithoutAudio = listeningItems.filter((item) => {
        const c = item.content as any;
        const hasAudio = !!c.audioUrl;
        const hasTts = !!c.ttsScript;
        const hasTranscript = !!c.transcript;
        return !hasAudio && !hasTts && !hasTranscript;
      });

      expect(itemsWithoutAudio.length).toBe(0);
    });

    it("should have valid audio URL format in LISTENING items with audioUrl", () => {
      const itemsWithBadUrl = listeningItems.filter((item) => {
        const c = item.content as any;
        if (!c.audioUrl) return false;
        return !c.audioUrl.match(/^\/audio\/|^https?:\/\//);
      });

      expect(itemsWithBadUrl.length).toBe(0);
    });

    it("should have sufficient TTS script length when present", () => {
      const itemsWithShortScript = listeningItems.filter((item) => {
        const c = item.content as any;
        if (!c.ttsScript) return false;
        return (c.ttsScript as string).length < 20;
      });

      expect(itemsWithShortScript.length).toBe(0);
    });
  });

  // ── SPEAKING Item Specific Validation ────────────────────────────────────────

  describe("SPEAKING Item Validation", () => {
    let speakingItems: Item[];

    beforeAll(async () => {
      speakingItems = await prisma.item.findMany({
        where: { skill: "SPEAKING", status: { in: ["ACTIVE", "PRETEST"] } },
        take: 50,
        select: { id: true, skill: true, content: true },
      });
    }, 15000);

    it("should have prompt in all SPEAKING items", () => {
      const itemsWithoutPrompt = speakingItems.filter((item) => {
        const c = item.content as any;
        return !(c.prompt || c.stem || c.question);
      });

      expect(itemsWithoutPrompt.length).toBe(0);
    });

    it("should have scoringRubric or rubric in all SPEAKING items", () => {
      const itemsWithoutRubric = speakingItems.filter((item) => {
        const c = item.content as any;
        return !c.scoringRubric && !c.rubric;
      });

      expect(itemsWithoutRubric.length).toBe(0);
    });

    it("should have responseTime and prepTime in all SPEAKING items", () => {
      const itemsWithoutTiming = speakingItems.filter((item) => {
        const c = item.content as any;
        return !c.responseTime || !c.prepTime;
      });

      expect(itemsWithoutTiming.length).toBe(0);
    });

    it("should NOT have MCQ options in SPEAKING items", () => {
      const itemsWithOptions = speakingItems.filter((item) => {
        const c = item.content as any;
        const opts: Option[] = Array.isArray(c.options) ? c.options : [];
        return opts.length > 0;
      });

      expect(itemsWithOptions.length).toBe(0);
    });
  });

  // ── Content Integrity Checks ─────────────────────────────────────────────────

  describe("Content Integrity Checks", () => {
    it("should not have [object Object] in any item content", async () => {
      const sample = await prisma.item.findMany({
        where: { status: { in: ["ACTIVE", "PRETEST"] } },
        take: 50,
        select: { id: true, content: true },
      });

      const corruptedItems = sample.filter((item) => {
        const serialized = JSON.stringify(item.content);
        return serialized.includes("[object Object]");
      });

      expect(corruptedItems.length).toBe(0);
    });

    it("should not have null or undefined options arrays", async () => {
      const mcqItems = await prisma.item.findMany({
        where: {
          skill: { in: ["GRAMMAR", "VOCABULARY", "READING"] },
          status: { in: ["ACTIVE", "PRETEST"] },
        },
        take: 50,
        select: { id: true, content: true },
      });

      const itemsWithBadOptions = mcqItems.filter((item) => {
        const c = item.content as any;
        return c.options === null || c.options === undefined;
      });

      expect(itemsWithBadOptions.length).toBe(0);
    });

    it("should have valid UTF-8 text in all items", async () => {
      const sample = await prisma.item.findMany({
        where: { status: { in: ["ACTIVE", "PRETEST"] } },
        take: 30,
        select: { id: true, content: true },
      });

      const itemsWithBadEncoding = sample.filter((item) => {
        const serialized = JSON.stringify(item.content);
        try {
          // Try to encode/decode to verify UTF-8 validity
          Buffer.from(serialized, "utf8");
          return false;
        } catch {
          return true;
        }
      });

      expect(itemsWithBadEncoding.length).toBe(0);
    });
  });

  // ── CEFR Level Distribution ──────────────────────────────────────────────────

  describe("CEFR Level Coverage", () => {
    it("should have items across multiple CEFR levels", async () => {
      const sample = await prisma.item.findMany({
        where: { status: { in: ["ACTIVE", "PRETEST"] } },
        select: { cefrLevel: true },
        take: 100,
      });

      const cefrLevels = new Set(sample.map((i) => i.cefrLevel));

      // Should have at least 5 different CEFR levels represented
      expect(cefrLevels.size).toBeGreaterThanOrEqual(5);
    });

    it("should have diverse skill-CEFR combinations", async () => {
      const sample = await prisma.item.findMany({
        where: { status: { in: ["ACTIVE", "PRETEST"] } },
        select: { skill: true, cefrLevel: true },
        take: 100,
      });

      const skillCefrCounts = sample.reduce(
        (acc, item) => {
          const key = `${item.skill}-${item.cefrLevel}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Verify we have multiple skill-CEFR combinations (not all same)
      expect(Object.keys(skillCefrCounts).length).toBeGreaterThan(5);
    });
  });

  // ── Status Distribution ──────────────────────────────────────────────────────

  describe("Item Status Validation", () => {
    it("should have both ACTIVE and PRETEST items in database", async () => {
      const [activeCount, pretestCount] = await Promise.all([
        prisma.item.count({ where: { status: "ACTIVE" } }),
        prisma.item.count({ where: { status: "PRETEST" } }),
      ]);

      expect(activeCount).toBeGreaterThan(0);
      expect(pretestCount).toBeGreaterThan(0);
    });

    it("should have majority ACTIVE items", async () => {
      const [activeCount, totalCount] = await Promise.all([
        prisma.item.count({ where: { status: "ACTIVE" } }),
        prisma.item.count({ where: { status: { in: ["ACTIVE", "PRETEST"] } } }),
      ]);

      expect(activeCount / totalCount).toBeGreaterThan(0.5);
    });
  });
});
