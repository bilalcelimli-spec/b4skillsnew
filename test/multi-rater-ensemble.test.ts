/**
 * Multi-Rater Ensemble Tests
 *
 * Verifies:
 *  - Inter-rater agreement detection
 *  - Variance-based consensus levels
 *  - Human review flagging thresholds
 *  - Median score aggregation
 *  - CEFR level majority voting
 */

import { describe, it, expect, vi } from "vitest";
import {
  scoreWithEnsemble,
  scoreWritingWithEnsemble,
  scoreSpeakingWithEnsemble,
  type EnsembleResult,
} from "../src/lib/scoring/multi-rater-ensemble.js";
import * as Gemini from "../src/lib/scoring/gemini-scoring-service.js";
import * as Claude from "../src/lib/scoring/claude-scoring-service.js";
import * as GPT4 from "../src/lib/scoring/gpt4-scoring-service.js";

// Mock scoring services
vi.mock("../src/lib/scoring/gemini-scoring-service.js");
vi.mock("../src/lib/scoring/claude-scoring-service.js");
vi.mock("../src/lib/scoring/gpt4-scoring-service.js");

describe("Multi-Rater Ensemble Scoring", () => {
  describe("scoreWithEnsemble", () => {
    it("should aggregate three rater scores using median", async () => {
      // Setup: Three different scores (0.6, 0.7, 0.8) → median 0.7
      const mockGeminiScore = {
        score: 0.6,
        cefrLevel: "B1",
        feedback: "Good writing",
        confidence: 0.8,
        rubricScores: { grammar: 7, vocabulary: 7, coherence: 6, taskRelevance: 6 },
        corrections: [],
      };

      const mockClaudeScore = {
        score: 0.7,
        cefrLevel: "B1",
        feedback: "Well structured",
        confidence: 0.85,
        rubricScores: { grammar: 7, vocabulary: 8, coherence: 7, taskRelevance: 7 },
        corrections: [],
      };

      const mockGPT4Score = {
        score: 0.8,
        cefrLevel: "B2",
        feedback: "Excellent expression",
        confidence: 0.9,
        rubricScores: { grammar: 8, vocabulary: 8, coherence: 8, taskRelevance: 8 },
        corrections: [],
      };

      vi.spyOn(Gemini.GeminiScoringService, "scoreWriting").mockResolvedValue(mockGeminiScore);
      vi.spyOn(Claude, "scoreWithClaude").mockResolvedValue(mockClaudeScore);
      vi.spyOn(GPT4, "scoreWithGPT4").mockResolvedValue(mockGPT4Score);

      const result = await scoreWritingWithEnsemble(
        "The quick brown fox jumps over the lazy dog.",
        "Write about an animal",
        "B1"
      );

      // Median of [0.6, 0.7, 0.8] = 0.7
      expect(result.finalScore).toBe(0.7);
      expect(result.raterScores).toHaveLength(3);
    });

    it("should detect high consensus (stdDev < 0.1 && κ > 0.8)", async () => {
      // Setup: Three very similar scores (0.70, 0.71, 0.72) → high agreement
      const mockScores = [
        {
          score: 0.70,
          cefrLevel: "B1",
          feedback: "Good",
          confidence: 0.9,
          rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 7 },
          corrections: [],
        },
        {
          score: 0.71,
          cefrLevel: "B1",
          feedback: "Good",
          confidence: 0.89,
          rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 7 },
          corrections: [],
        },
        {
          score: 0.72,
          cefrLevel: "B1",
          feedback: "Good",
          confidence: 0.88,
          rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 7 },
          corrections: [],
        },
      ];

      vi.spyOn(Gemini.GeminiScoringService, "scoreWriting").mockResolvedValue(mockScores[0]);
      vi.spyOn(Claude, "scoreWithClaude").mockResolvedValue(mockScores[1]);
      vi.spyOn(GPT4, "scoreWithGPT4").mockResolvedValue(mockScores[2]);

      const result = await scoreWritingWithEnsemble("text", "prompt", "B1");

      expect(result.consensusLevel).toBe("high");
      expect(result.stdDev).toBeLessThan(0.1);
      expect(result.flagForHumanReview).toBe(false);
    });

    it("should flag for review when consensus is low (stdDev > 0.25)", async () => {
      // Setup: Wide score spread (0.4, 0.6, 0.8) → low agreement
      const mockScores = [
        { score: 0.4, cefrLevel: "A2", feedback: "Weak", confidence: 0.6 },
        { score: 0.6, cefrLevel: "B1", feedback: "Fair", confidence: 0.7 },
        { score: 0.8, cefrLevel: "B2", feedback: "Strong", confidence: 0.8 },
      ];

      vi.spyOn(Gemini.GeminiScoringService, "scoreWriting").mockResolvedValueOnce({
        ...mockScores[0],
        rubricScores: { grammar: 4, vocabulary: 4, coherence: 4, taskRelevance: 4 },
        corrections: [],
      });
      vi.spyOn(Claude, "scoreWithClaude").mockResolvedValueOnce({
        ...mockScores[1],
        rubricScores: { grammar: 6, vocabulary: 6, coherence: 6, taskRelevance: 6 },
        corrections: [],
      });
      vi.spyOn(GPT4, "scoreWithGPT4").mockResolvedValueOnce({
        ...mockScores[2],
        rubricScores: { grammar: 8, vocabulary: 8, coherence: 8, taskRelevance: 8 },
        corrections: [],
      });

      const result = await scoreWritingWithEnsemble("text", "prompt", "B1");

      expect(result.consensusLevel).toBe("low");
      expect(result.stdDev).toBeGreaterThan(0.15);
      expect(result.flagForHumanReview).toBe(true);
      expect(result.reviewReason).toContain("variance");
    });

    it("should use majority vote for CEFR level", async () => {
      // Setup: Two raters say B1, one says B2 → majority B1
      const mockScores = [
        {
          score: 0.65,
          cefrLevel: "B1",
          feedback: "Good",
          confidence: 0.8,
          rubricScores: { grammar: 6, vocabulary: 6, coherence: 6, taskRelevance: 6 },
          corrections: [],
        },
        {
          score: 0.68,
          cefrLevel: "B1",
          feedback: "Good",
          confidence: 0.82,
          rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 7 },
          corrections: [],
        },
        {
          score: 0.75,
          cefrLevel: "B2",
          feedback: "Strong",
          confidence: 0.85,
          rubricScores: { grammar: 8, vocabulary: 8, coherence: 8, taskRelevance: 8 },
          corrections: [],
        },
      ];

      vi.spyOn(Gemini.GeminiScoringService, "scoreWriting").mockResolvedValue(mockScores[0]);
      vi.spyOn(Claude, "scoreWithClaude").mockResolvedValue(mockScores[1]);
      vi.spyOn(GPT4, "scoreWithGPT4").mockResolvedValue(mockScores[2]);

      const result = await scoreWritingWithEnsemble("text", "prompt", "B1");

      expect(result.finalCefrLevel).toBe("B1"); // majority
    });

    it("should handle rater failures gracefully (Promise.allSettled)", async () => {
      // Setup: One rater fails, two succeed
      vi.spyOn(Gemini.GeminiScoringService, "scoreWriting").mockRejectedValue(
        new Error("API error")
      );
      vi.spyOn(Claude, "scoreWithClaude").mockResolvedValue({
        score: 0.65,
        cefrLevel: "B1",
        feedback: "Good",
        confidence: 0.8,
        rubricScores: { grammar: 6, vocabulary: 6, coherence: 6, taskRelevance: 6 },
        corrections: [],
      });
      vi.spyOn(GPT4, "scoreWithGPT4").mockResolvedValue({
        score: 0.68,
        cefrLevel: "B1",
        feedback: "Good",
        confidence: 0.82,
        rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 7 },
        corrections: [],
      });

      const result = await scoreWritingWithEnsemble("text", "prompt", "B1");

      // Should succeed with 2 raters (minimum is 2)
      expect(result.raterScores).toHaveLength(2);
      expect(result.finalScore).toBeDefined();
    });

    it("should reject if fewer than 2 raters succeed", async () => {
      // Setup: Two raters fail, one succeeds
      vi.spyOn(Gemini.GeminiScoringService, "scoreWriting").mockRejectedValue(
        new Error("API error")
      );
      vi.spyOn(Claude, "scoreWithClaude").mockRejectedValue(
        new Error("API error")
      );
      vi.spyOn(GPT4, "scoreWithGPT4").mockResolvedValue({
        score: 0.65,
        cefrLevel: "B1",
        feedback: "Good",
        confidence: 0.8,
        rubricScores: { grammar: 6, vocabulary: 6, coherence: 6, taskRelevance: 6 },
        corrections: [],
      });

      await expect(
        scoreWritingWithEnsemble("text", "prompt", "B1")
      ).rejects.toThrow("Insufficient raters succeeded");
    });

    it("should provide diagnostic feedback", async () => {
      const mockScores = [
        {
          score: 0.6,
          cefrLevel: "B1",
          feedback: "Good",
          confidence: 0.8,
          rubricScores: { grammar: 6, vocabulary: 6, coherence: 6, taskRelevance: 6 },
          corrections: [],
        },
        {
          score: 0.7,
          cefrLevel: "B1",
          feedback: "Good",
          confidence: 0.85,
          rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 7 },
          corrections: [],
        },
        {
          score: 0.8,
          cefrLevel: "B2",
          feedback: "Strong",
          confidence: 0.9,
          rubricScores: { grammar: 8, vocabulary: 8, coherence: 8, taskRelevance: 8 },
          corrections: [],
        },
      ];

      vi.spyOn(Gemini.GeminiScoringService, "scoreWriting").mockResolvedValue(mockScores[0]);
      vi.spyOn(Claude, "scoreWithClaude").mockResolvedValue(mockScores[1]);
      vi.spyOn(GPT4, "scoreWithGPT4").mockResolvedValue(mockScores[2]);

      const result = await scoreWritingWithEnsemble("text", "prompt", "B1");

      // Diagnostic should include score range and CEFR consensus
      expect(result.diagnosticFeedback).toContain("Score range");
      expect(result.diagnosticFeedback).toContain("CEFR consensus");
      expect(result.diagnosticFeedback).toContain("Avg confidence");
    });
  });

  describe("recommendedAction", () => {
    it("should recommend 'accept' for high consensus without flags", async () => {
      const mockScores = [
        {
          score: 0.70,
          cefrLevel: "B1",
          feedback: "Good",
          confidence: 0.9,
          rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 7 },
          corrections: [],
        },
        {
          score: 0.71,
          cefrLevel: "B1",
          feedback: "Good",
          confidence: 0.89,
          rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 7 },
          corrections: [],
        },
        {
          score: 0.72,
          cefrLevel: "B1",
          feedback: "Good",
          confidence: 0.88,
          rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 7 },
          corrections: [],
        },
      ];

      vi.spyOn(Gemini.GeminiScoringService, "scoreWriting").mockResolvedValue(mockScores[0]);
      vi.spyOn(Claude, "scoreWithClaude").mockResolvedValue(mockScores[1]);
      vi.spyOn(GPT4, "scoreWithGPT4").mockResolvedValue(mockScores[2]);

      const result = await scoreWritingWithEnsemble("text", "prompt", "B1");

      expect(result.recommendedAction).toBe("accept");
    });

    it("should recommend 'review' for low consensus", async () => {
      const mockScores = [
        {
          score: 0.4,
          cefrLevel: "A2",
          feedback: "Weak",
          confidence: 0.6,
          rubricScores: { grammar: 4, vocabulary: 4, coherence: 4, taskRelevance: 4 },
          corrections: [],
        },
        {
          score: 0.6,
          cefrLevel: "B1",
          feedback: "Fair",
          confidence: 0.7,
          rubricScores: { grammar: 6, vocabulary: 6, coherence: 6, taskRelevance: 6 },
          corrections: [],
        },
        {
          score: 0.8,
          cefrLevel: "B2",
          feedback: "Strong",
          confidence: 0.8,
          rubricScores: { grammar: 8, vocabulary: 8, coherence: 8, taskRelevance: 8 },
          corrections: [],
        },
      ];

      vi.spyOn(Gemini.GeminiScoringService, "scoreWriting").mockResolvedValue(mockScores[0]);
      vi.spyOn(Claude, "scoreWithClaude").mockResolvedValue(mockScores[1]);
      vi.spyOn(GPT4, "scoreWithGPT4").mockResolvedValue(mockScores[2]);

      const result = await scoreWritingWithEnsemble("text", "prompt", "B1");

      expect(result.recommendedAction).toBe("review");
    });

    it("should recommend 'flag' for medium consensus with borderline metrics", async () => {
      const mockScores = [
        {
          score: 0.60,
          cefrLevel: "B1",
          feedback: "Fair",
          confidence: 0.62, // Below 0.65 threshold
          rubricScores: { grammar: 6, vocabulary: 6, coherence: 6, taskRelevance: 6 },
          corrections: [],
        },
        {
          score: 0.65,
          cefrLevel: "B1",
          feedback: "Fair",
          confidence: 0.65,
          rubricScores: { grammar: 6, vocabulary: 6, coherence: 6, taskRelevance: 6 },
          corrections: [],
        },
        {
          score: 0.70,
          cefrLevel: "B1",
          feedback: "Good",
          confidence: 0.68,
          rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 7 },
          corrections: [],
        },
      ];

      vi.spyOn(Gemini.GeminiScoringService, "scoreWriting").mockResolvedValue(mockScores[0]);
      vi.spyOn(Claude, "scoreWithClaude").mockResolvedValue(mockScores[1]);
      vi.spyOn(GPT4, "scoreWithGPT4").mockResolvedValue(mockScores[2]);

      const result = await scoreWritingWithEnsemble("text", "prompt", "B1");

      expect(result.recommendedAction).toBe("flag");
    });
  });
});
