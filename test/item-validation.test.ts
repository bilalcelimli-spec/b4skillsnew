/**
 * Item Validation Tests
 *
 * Verifies that validation schemas correctly catch broken items
 * and prevent them from being created.
 */

import { describe, it, expect } from "vitest";
import {
  validateItemStructure,
  optionSchema,
  mcqContentSchema,
  readingContentSchema,
  listeningContentSchema,
  speakingContentSchema,
} from "../src/lib/validation/item-schema.js";

describe("Item Validation Schema", () => {
  // ── Option Schema Validation ─────────────────────────────────────────────

  describe("Option Schema", () => {
    it("should accept valid option", async () => {
      const option = {
        text: "This is a valid option",
        isCorrect: true,
        rationale: "This is correct because...",
      };

      const result = await optionSchema.safeParseAsync(option);
      expect(result.success).toBe(true);
    });

    it("should reject option with text <2 chars", async () => {
      const option = {
        text: "a",
        isCorrect: false,
        rationale: "Too short text",
      };

      const result = await optionSchema.safeParseAsync(option);
      expect(result.success).toBe(false);
    });

    it("should reject option with rationale <5 chars", async () => {
      const option = {
        text: "Valid text here",
        isCorrect: false,
        rationale: "bad",
      };

      const result = await optionSchema.safeParseAsync(option);
      expect(result.success).toBe(false);
    });
  });

  // ── MCQ Content Validation ───────────────────────────────────────────────

  describe("MCQ Content Validation (GRAMMAR, VOCABULARY)", () => {
    it("should accept valid MCQ content", async () => {
      const content = {
        prompt: "Which is correct?",
        options: [
          { text: "Option A", isCorrect: true, rationale: "This is correct" },
          { text: "Option B", isCorrect: false, rationale: "Common mistake" },
          { text: "Option C", isCorrect: false, rationale: "Another mistake" },
          { text: "Option D", isCorrect: false, rationale: "Wrong approach" },
        ],
      };

      const result = await mcqContentSchema.safeParseAsync(content);
      expect(result.success).toBe(true);
    });

    it("should reject MCQ with <4 options", async () => {
      const content = {
        prompt: "Which is correct?",
        options: [
          { text: "Option A", isCorrect: true, rationale: "This is correct" },
          { text: "Option B", isCorrect: false, rationale: "Wrong" },
        ],
      };

      const result = await mcqContentSchema.safeParseAsync(content);
      expect(result.success).toBe(false);
    });

    it("should reject MCQ without correct option marked", async () => {
      const content = {
        prompt: "Which is correct?",
        options: [
          { text: "Option A", isCorrect: false, rationale: "This is not correct" },
          { text: "Option B", isCorrect: false, rationale: "Wrong" },
          { text: "Option C", isCorrect: false, rationale: "Wrong" },
          { text: "Option D", isCorrect: false, rationale: "Wrong" },
        ],
      };

      const result = await mcqContentSchema.safeParseAsync(content);
      expect(result.success).toBe(false);
    });

    it("should reject MCQ with duplicate option texts", async () => {
      const content = {
        prompt: "Which is correct?",
        options: [
          { text: "Option A", isCorrect: true, rationale: "Correct" },
          { text: "Option A", isCorrect: false, rationale: "Duplicate" },
          { text: "Option C", isCorrect: false, rationale: "Wrong" },
          { text: "Option D", isCorrect: false, rationale: "Wrong" },
        ],
      };

      const result = await mcqContentSchema.safeParseAsync(content);
      expect(result.success).toBe(false);
    });

    it("should reject MCQ without prompt/stem/question", async () => {
      const content = {
        options: [
          { text: "Option A", isCorrect: true, rationale: "Correct" },
          { text: "Option B", isCorrect: false, rationale: "Wrong" },
          { text: "Option C", isCorrect: false, rationale: "Wrong" },
          { text: "Option D", isCorrect: false, rationale: "Wrong" },
        ],
      };

      const result = await mcqContentSchema.safeParseAsync(content);
      expect(result.success).toBe(false);
    });
  });

  // ── READING Content Validation ───────────────────────────────────────────
  // Note: Complex validation rules are checked in validateItemStructure()
  // Tests here verify basic schema structure compatibility

  describe("READING Content Validation", () => {
    it("should accept READING content structure with passage", async () => {
      const content = {
        prompt: "What does the passage say?",
        passage:
          "This is a passage with at least thirty characters of content for the test.",
        options: [
          { text: "Option A", isCorrect: true, rationale: "Correct interpretation" },
          { text: "Option B", isCorrect: false, rationale: "Misread" },
          { text: "Option C", isCorrect: false, rationale: "Wrong" },
          { text: "Option D", isCorrect: false, rationale: "Wrong" },
        ],
      };

      const result = await readingContentSchema.safeParseAsync(content);
      expect(result.success).toBe(true);
    });

    it("should accept READING content with minimal fields", async () => {
      const content = {
        prompt: "What does the passage say?",
        passage: "This is a passage with at least thirty characters.",
      };

      const result = await readingContentSchema.safeParseAsync(content);
      expect(result.success).toBe(true);
    });
  });

  // ── LISTENING Content Validation ─────────────────────────────────────────
  // Note: Audio presence validation is checked in validateItemStructure()

  describe("LISTENING Content Validation", () => {
    it("should accept LISTENING structure with audioUrl", async () => {
      const content = {
        prompt: "What did you hear?",
        audioUrl: "/audio/listening-item-001.wav",
        options: [
          { text: "Option A", isCorrect: true, rationale: "Correct" },
          { text: "Option B", isCorrect: false, rationale: "Wrong" },
          { text: "Option C", isCorrect: false, rationale: "Wrong" },
          { text: "Option D", isCorrect: false, rationale: "Wrong" },
        ],
      };

      const result = await listeningContentSchema.safeParseAsync(content);
      expect(result.success).toBe(true);
    });

    it("should accept LISTENING structure with ttsScript", async () => {
      const content = {
        prompt: "What did you hear?",
        ttsScript: "[Speaker A] Hello. [Speaker B] Hi there.",
        options: [
          { text: "Option A", isCorrect: true, rationale: "Correct" },
          { text: "Option B", isCorrect: false, rationale: "Wrong" },
          { text: "Option C", isCorrect: false, rationale: "Wrong" },
          { text: "Option D", isCorrect: false, rationale: "Wrong" },
        ],
      };

      const result = await listeningContentSchema.safeParseAsync(content);
      expect(result.success).toBe(true);
    });

    it("should accept LISTENING without options", async () => {
      const content = {
        prompt: "What did you hear?",
        audioUrl: "/audio/listening-item-001.wav",
      };

      const result = await listeningContentSchema.safeParseAsync(content);
      expect(result.success).toBe(true);
    });
  });

  // ── SPEAKING Content Validation ──────────────────────────────────────────
  // Note: SPEAKING schema uses basic Zod validation; additional checks are done
  // in validateItemStructure() function since Zod refine chains have complexity.

  describe("SPEAKING Content Validation", () => {
    it("should accept valid SPEAKING item structure", async () => {
      const content = {
        prompt: "Describe your daily routine.",
        responseTime: 120,
        prepTime: 30,
        scoringRubric: {
          fluency: { levels: 4, descriptor: "Smooth, natural speech" },
        },
      };

      const result = await speakingContentSchema.safeParseAsync(content);
      expect(result.success).toBe(true);
    });

    it("should reject SPEAKING with missing responseTime", async () => {
      const content = {
        prompt: "Describe your daily routine.",
        prepTime: 30,
        scoringRubric: {
          fluency: { levels: 4, descriptor: "Smooth speech" },
        },
      };

      const result = await speakingContentSchema.safeParseAsync(content);
      expect(result.success).toBe(false);
    });

    it("should reject SPEAKING with missing prepTime", async () => {
      const content = {
        prompt: "Describe your daily routine.",
        responseTime: 120,
        scoringRubric: {
          fluency: { levels: 4, descriptor: "Smooth speech" },
        },
      };

      const result = await speakingContentSchema.safeParseAsync(content);
      expect(result.success).toBe(false);
    });

    it("should accept SPEAKING even without rubric (checked in structural validation)", async () => {
      const content = {
        prompt: "Describe your daily routine.",
        responseTime: 120,
        prepTime: 30,
      };

      const result = await speakingContentSchema.safeParseAsync(content);
      // Schema allows it; structural validation will catch missing rubric
      expect(result.success).toBe(true);
    });
  });

  // ── Structural Validation Function ───────────────────────────────────────

  describe("validateItemStructure", () => {
    it("should detect missing prompt", () => {
      const errors = validateItemStructure("GRAMMAR", {
        options: [
          { text: "A", isCorrect: true, rationale: "Correct" },
        ],
      });

      expect(errors.some((e) => e.includes("prompt/stem/question"))).toBe(true);
    });

    it("should detect insufficient options", () => {
      const errors = validateItemStructure("GRAMMAR", {
        prompt: "Choose one",
        options: [{ text: "A", isCorrect: true, rationale: "Correct" }],
      });

      expect(errors.some((e) => e.includes("options"))).toBe(true);
    });

    it("should detect missing correct option", () => {
      const errors = validateItemStructure("GRAMMAR", {
        prompt: "Choose one",
        options: [
          { text: "A", isCorrect: false, rationale: "Wrong" },
          { text: "B", isCorrect: false, rationale: "Wrong" },
          { text: "C", isCorrect: false, rationale: "Wrong" },
          { text: "D", isCorrect: false, rationale: "Wrong" },
        ],
      });

      expect(errors.some((e) => e.includes("correct option"))).toBe(true);
    });

    it("should detect serialization errors", () => {
      const content = JSON.parse(
        '{"prompt":"test","options":[{"text":"a","isCorrect":true,"rationale":"test"}],"nested":"[object Object]"}'
      );
      const errors = validateItemStructure("GRAMMAR", content);

      expect(errors.some((e) => e.includes("serialization"))).toBe(true);
    });

    it("should pass valid item structure", () => {
      const errors = validateItemStructure("GRAMMAR", {
        prompt: "Which is correct?",
        options: [
          { text: "Option A", isCorrect: true, rationale: "This is correct" },
          { text: "Option B", isCorrect: false, rationale: "Wrong answer" },
          { text: "Option C", isCorrect: false, rationale: "Wrong answer" },
          { text: "Option D", isCorrect: false, rationale: "Wrong answer" },
        ],
      });

      expect(errors.length).toBe(0);
    });
  });
});
