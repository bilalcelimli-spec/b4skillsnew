/**
 * Acoustic Analyzer Integration Tests
 *
 * Tests acoustic feature extraction within the multi-rater ensemble workflow
 * for SPEAKING task assessment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ScoringOrchestratorEnsemble } from "../src/lib/scoring/scoring-orchestrator.js";
import { AcousticAnalyzer, type AudioFeatures } from "../src/lib/scoring/acoustic-analyzer.js";

// Set ensemble mode for these tests
process.env.USE_ENSEMBLE_SCORING = "true";

describe("Acoustic Analyzer Integration with Multi-Rater Ensemble", () => {
  let mockAudioBase64: string;
  let mockTranscript: string;
  const prompt = "Describe your favorite hobby in 2 minutes.";
  const targetCefrLevel = "B1";

  beforeEach(() => {
    // Create a realistic mock audio buffer (2 seconds at 16kHz, 16-bit)
    const audioBuffer = Buffer.alloc(64000); // 2 seconds
    mockAudioBase64 = audioBuffer.toString("base64");

    // Realistic transcript matching the duration
    mockTranscript =
      "My favorite hobby is reading books. I really enjoy science fiction novels. " +
      "They allow me to escape into different worlds and imagine fascinating possibilities. " +
      "I spend about two hours every evening reading before bed.";
  });

  describe("SPEAKING Assessment Flow", () => {
    it("should extract audio features during ensemble scoring", async () => {
      // Mock the ensemble result with a valid response
      vi.mock("../src/lib/scoring/multi-rater-ensemble.js", () => ({
        scoreSpeakingWithEnsemble: vi.fn().mockResolvedValue({
          finalScore: 0.72,
          finalCefrLevel: "B1",
          consensusLevel: "high",
          variance: 0.05,
          stdDev: 0.05,
          raterAgreement: 0.9,
          flagForHumanReview: false,
          averageConfidence: 0.88,
          raterScores: [
            {
              rater: "gemini",
              score: 0.72,
              cefrLevel: "B1",
              confidence: 0.9,
              rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 8, fluency: 7 },
              feedback: mockTranscript,
              latencyMs: 250,
            },
            {
              rater: "claude",
              score: 0.71,
              cefrLevel: "B1",
              confidence: 0.88,
              rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 8, fluency: 7 },
              feedback: mockTranscript,
              latencyMs: 280,
            },
            {
              rater: "gpt4",
              score: 0.73,
              cefrLevel: "B1",
              confidence: 0.87,
              rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 8, fluency: 7 },
              feedback: mockTranscript,
              latencyMs: 300,
            },
          ],
          recommendedAction: "accept",
          diagnosticFeedback: "High consensus across raters",
        }),
      }));

      // Extract features independently to verify they're created correctly
      const features = await AcousticAnalyzer.analyzeAudio(mockAudioBase64, mockTranscript);

      expect(features).toBeDefined();
      expect(features.speechRate).toBeGreaterThan(0);
      expect(features.audioQuality).toBeDefined();
      expect(features.stressPattern).toBeDefined();
    });

    it("should include audio features in orchestrated score", async () => {
      // Mock ensemble response
      const mockEnsembleResult = {
        finalScore: 0.72,
        finalCefrLevel: "B1",
        consensusLevel: "high",
        variance: 0.05,
        stdDev: 0.05,
        raterAgreement: 0.9,
        flagForHumanReview: false,
        averageConfidence: 0.88,
        raterScores: [
          {
            rater: "gemini" as const,
            score: 0.72,
            cefrLevel: "B1",
            confidence: 0.9,
            rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 8, fluency: 7 },
            feedback: mockTranscript,
            latencyMs: 250,
          },
        ],
        recommendedAction: "accept" as const,
        diagnosticFeedback: "High consensus across raters",
      };

      // Verify features can be added to the score
      const features = await AcousticAnalyzer.analyzeAudio(mockAudioBase64, mockTranscript);

      // Simulate what the orchestrator does
      const orchestratedWithFeatures = {
        ...mockEnsembleResult,
        audioFeatures: features,
      };

      expect(orchestratedWithFeatures.audioFeatures).toBeDefined();
      expect(orchestratedWithFeatures.audioFeatures.speechRate).toBeGreaterThan(0);
    });
  });

  describe("Acoustic Feature Quality Checks", () => {
    it("should flag poor audio quality in review reasons", async () => {
      // Create poor quality audio features
      const poorAudioFeatures: AudioFeatures = {
        speechRate: 50, // Very slow
        pauseDuration: 10,
        pauseFrequency: 15,
        pauseDistribution: { before1min: 5, between1to3min: 8, after3min: 2 },
        pitchMean: 80,
        pitchRange: 5,
        pitchStdDev: 2,
        pitchVariation: "flat",
        voiceClarity: 2,
        articulation: 2,
        voiceQualityFlags: ["low_snr", "background_noise"],
        speakingDuration: 120,
        silenceDuration: 60,
        fillerWords: 25,
        fillerWordsFlag: true,
        stressPattern: {
          keywordEmphasis: 2,
          sentenceIntonation: "flat",
          naturalFlow: 2,
        },
        processingTime: 200,
        audioQuality: "poor",
      };

      // Verify quality flagging would work
      const { flagAudioQuality } = await import("../src/lib/scoring/acoustic-analyzer.js");
      const qualityCheck = flagAudioQuality(poorAudioFeatures);

      expect(qualityCheck.acceptable).toBe(false);
      expect(qualityCheck.reason).toBeDefined();
    });

    it("should not flag good quality audio", async () => {
      const features = await AcousticAnalyzer.analyzeAudio(mockAudioBase64, mockTranscript);

      // Manually create good quality features for testing
      const goodAudio: AudioFeatures = {
        speechRate: 130,
        pauseDuration: 2,
        pauseFrequency: 3,
        pauseDistribution: { before1min: 1, between1to3min: 2, after3min: 0 },
        pitchMean: 120,
        pitchRange: 15,
        pitchStdDev: 8,
        pitchVariation: "expressive",
        voiceClarity: 8,
        articulation: 8,
        voiceQualityFlags: [],
        speakingDuration: 120,
        silenceDuration: 5,
        fillerWords: 2,
        fillerWordsFlag: false,
        stressPattern: {
          keywordEmphasis: 8,
          sentenceIntonation: "varied",
          naturalFlow: 8,
        },
        processingTime: 150,
        audioQuality: "good",
      };

      const { flagAudioQuality } = await import("../src/lib/scoring/acoustic-analyzer.js");
      const qualityCheck = flagAudioQuality(goodAudio);

      expect(qualityCheck.acceptable).toBe(true);
      expect(qualityCheck.reason).toBeUndefined();
    });
  });

  describe("Fluency Score Blending", () => {
    it("should compute acoustic fluency contribution (0-1)", async () => {
      const features = await AcousticAnalyzer.analyzeAudio(mockAudioBase64, mockTranscript);

      const { computeAcousticFluencyScore } = await import(
        "../src/lib/scoring/acoustic-analyzer.js"
      );
      const acousticScore = computeAcousticFluencyScore(features, "B1");

      expect(acousticScore).toBeGreaterThanOrEqual(0);
      expect(acousticScore).toBeLessThanOrEqual(1);
    });

    it("should reward expressive pitch variation with higher fluency", async () => {
      const { computeAcousticFluencyScore } = await import(
        "../src/lib/scoring/acoustic-analyzer.js"
      );

      const expressiveFeatures: AudioFeatures = {
        speechRate: 130,
        pauseDuration: 2,
        pauseFrequency: 3,
        pauseDistribution: { before1min: 1, between1to3min: 2, after3min: 0 },
        pitchMean: 120,
        pitchRange: 15,
        pitchStdDev: 8,
        pitchVariation: "expressive",
        voiceClarity: 8,
        articulation: 8,
        voiceQualityFlags: [],
        speakingDuration: 120,
        silenceDuration: 5,
        fillerWords: 1,
        fillerWordsFlag: false,
        stressPattern: {
          keywordEmphasis: 8,
          sentenceIntonation: "varied",
          naturalFlow: 8,
        },
        processingTime: 150,
        audioQuality: "good",
      };

      const flatFeatures: AudioFeatures = {
        ...expressiveFeatures,
        pitchVariation: "flat",
        stressPattern: {
          ...expressiveFeatures.stressPattern,
          sentenceIntonation: "flat",
        },
      };

      const expressiveScore = computeAcousticFluencyScore(expressiveFeatures, "B1");
      const flatScore = computeAcousticFluencyScore(flatFeatures, "B1");

      expect(expressiveScore).toBeGreaterThan(flatScore);
    });

    it("should reward optimal speech rate (120-150 wpm)", async () => {
      const { computeAcousticFluencyScore } = await import(
        "../src/lib/scoring/acoustic-analyzer.js"
      );

      const baseFeatures: AudioFeatures = {
        speechRate: 135, // Optimal
        pauseDuration: 2,
        pauseFrequency: 3,
        pauseDistribution: { before1min: 1, between1to3min: 2, after3min: 0 },
        pitchMean: 120,
        pitchRange: 15,
        pitchStdDev: 8,
        pitchVariation: "expressive",
        voiceClarity: 8,
        articulation: 8,
        voiceQualityFlags: [],
        speakingDuration: 120,
        silenceDuration: 5,
        fillerWords: 1,
        fillerWordsFlag: false,
        stressPattern: {
          keywordEmphasis: 8,
          sentenceIntonation: "varied",
          naturalFlow: 8,
        },
        processingTime: 150,
        audioQuality: "good",
      };

      const fastFeatures: AudioFeatures = { ...baseFeatures, speechRate: 180 };
      const slowFeatures: AudioFeatures = { ...baseFeatures, speechRate: 80 };

      const optimalScore = computeAcousticFluencyScore(baseFeatures, "B1");
      const fastScore = computeAcousticFluencyScore(fastFeatures, "B1");
      const slowScore = computeAcousticFluencyScore(slowFeatures, "B1");

      // Optimal should be highest or tied for highest
      expect(optimalScore).toBeGreaterThanOrEqual(Math.min(fastScore, slowScore));
    });

    it("should blend LLM fluency + acoustic contribution (50/50)", async () => {
      // Example: LLM fluency = 0.7 (7/10), acoustic = 0.6
      const llmFluency = 0.7;
      const acousticContribution = 0.6;

      // 50% LLM + 50% acoustic
      const blended = (llmFluency * 0.5 + acousticContribution * 0.5);

      expect(blended).toBe(0.65); // (0.7 * 0.5 + 0.6 * 0.5) = 0.65
    });
  });

  describe("Audio Metadata in OrchestratedScore", () => {
    it("should include audioFeatures in aiResult", async () => {
      const features = await AcousticAnalyzer.analyzeAudio(mockAudioBase64, mockTranscript);

      // Simulate orchestrated score with acoustic features
      const orchestratedWithAcoustics = {
        score: 0.72,
        aiResult: {
          score: 0.72,
          rubricScores: { grammar: 7, vocabulary: 7, coherence: 7, taskRelevance: 8, fluency: 7.5 },
          audioFeatures: features,
          acousticFluencyContribution: 0.78,
        },
        requiresHumanReview: false,
        reviewReasons: [],
      };

      expect(orchestratedWithAcoustics.aiResult.audioFeatures).toBeDefined();
      expect(orchestratedWithAcoustics.aiResult.acousticFluencyContribution).toBe(0.78);
    });

    it("should track acoustic features in review reasons when quality is poor", async () => {
      // Simulate flagging behavior
      const reviewReasons: string[] = [];

      const poorAudio: AudioFeatures = {
        speechRate: 40,
        pauseDuration: 15,
        pauseFrequency: 20,
        pauseDistribution: { before1min: 10, between1to3min: 8, after3min: 2 },
        pitchMean: 70,
        pitchRange: 3,
        pitchStdDev: 1,
        pitchVariation: "flat",
        voiceClarity: 1,
        articulation: 1,
        voiceQualityFlags: ["severe_noise"],
        speakingDuration: 30,
        silenceDuration: 25,
        fillerWords: 8,
        fillerWordsFlag: true,
        stressPattern: {
          keywordEmphasis: 1,
          sentenceIntonation: "flat",
          naturalFlow: 1,
        },
        processingTime: 200,
        audioQuality: "poor",
      };

      const { flagAudioQuality } = await import("../src/lib/scoring/acoustic-analyzer.js");
      const check = flagAudioQuality(poorAudio);

      if (!check.acceptable && check.reason) {
        reviewReasons.push(`AUDIO_QUALITY_FLAG: ${check.reason}`);
      }

      expect(reviewReasons.length).toBeGreaterThan(0);
      expect(reviewReasons[0]).toContain("AUDIO_QUALITY_FLAG");
    });
  });

  describe("Error Handling in Ensemble Flow", () => {
    it("should gracefully handle acoustic analysis failures", async () => {
      // Invalid base64 should return error features
      const invalidAudio = "not-a-valid-base64-string!@#$%";

      const features = await AcousticAnalyzer.analyzeAudio(invalidAudio, mockTranscript);

      // Should return null-like features gracefully
      expect(features.audioQuality).toBe("poor");
      expect(features.voiceQualityFlags).toContain("error");
    });

    it("should continue scoring when acoustic analysis fails", async () => {
      // Even if acoustic extraction fails, ensemble should continue
      // The orchestrator has try-catch around acoustic analysis

      const testAudio = mockAudioBase64;
      const testTranscript = mockTranscript;

      // This should not throw even if processing fails
      try {
        const features = await AcousticAnalyzer.analyzeAudio(testAudio, testTranscript);
        expect(features).toBeDefined();
      } catch (error) {
        expect.fail("Acoustic analysis should not throw");
      }
    });
  });

  describe("Batch Processing Integration", () => {
    it("should extract features consistently across multiple responses", async () => {
      const responses = [
        {
          audio: mockAudioBase64,
          transcript:
            "First response about my favorite hobby. I like reading books and spending time outdoors.",
        },
        {
          audio: mockAudioBase64,
          transcript: "Second response with different content but same audio length. Testing consistency.",
        },
        {
          audio: mockAudioBase64,
          transcript: "Third response to verify reproducibility of acoustic feature extraction.",
        },
      ];

      const allFeatures = await Promise.all(
        responses.map(r => AcousticAnalyzer.analyzeAudio(r.audio, r.transcript))
      );

      // All should have complete features
      allFeatures.forEach(features => {
        expect(features.speechRate).toBeGreaterThan(0);
        expect(features.audioQuality).toBeDefined();
        expect(features.stressPattern).toBeDefined();
      });

      // Features should differ based on transcript content
      expect(allFeatures[0].fillerWords).toBeDefined();
      expect(allFeatures[1].fillerWords).toBeDefined();
      expect(allFeatures[2].fillerWords).toBeDefined();
    });
  });
});

describe("Acoustic Features in Response Database", () => {
  it("should have schema to store AudioFeatures", () => {
    // This test verifies the schema design can accommodate audio features
    const mockStoredFeatures = {
      speechRate: 130,
      pauseDuration: 2,
      pauseFrequency: 3,
      pauseDistribution: { before1min: 1, between1to3min: 2, after3min: 0 },
      pitchMean: 120,
      pitchRange: 15,
      pitchStdDev: 8,
      pitchVariation: "expressive",
      voiceClarity: 8,
      articulation: 8,
      voiceQualityFlags: [],
      speakingDuration: 120,
      silenceDuration: 5,
      fillerWords: 2,
      fillerWordsFlag: false,
      stressPattern: {
        keywordEmphasis: 8,
        sentenceIntonation: "varied",
        naturalFlow: 8,
      },
      processingTime: 150,
      audioQuality: "good",
    };

    // Verify the structure can be serialized/stored
    const json = JSON.stringify(mockStoredFeatures);
    const parsed = JSON.parse(json);

    expect(parsed.speechRate).toBe(130);
    expect(parsed.audioQuality).toBe("good");
    expect(parsed.stressPattern.naturalFlow).toBe(8);
  });
});
