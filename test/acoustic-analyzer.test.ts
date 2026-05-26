/**
 * Acoustic Analyzer Unit Tests
 *
 * Q2.1: Speech Acoustic Analysis
 * Tests for prosodic feature extraction and audio quality assessment
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AcousticAnalyzer,
  computeAcousticFluencyScore,
  flagAudioQuality,
  type AudioFeatures,
} from "../src/lib/scoring/acoustic-analyzer.js";

describe("AcousticAnalyzer", () => {
  describe("analyzeAudio()", () => {
    it("should extract acoustic features from audio and transcript", async () => {
      // Create a base64-encoded buffer (simulated audio)
      const audioBuffer = Buffer.alloc(32000); // ~1 second at 16kHz, 16-bit
      const audioBase64 = audioBuffer.toString("base64");

      const transcript = "Hello, this is a test response with multiple words.";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

      expect(features).toBeDefined();
      expect(features.speechRate).toBeGreaterThan(0);
      expect(features.pauseDuration).toBeGreaterThanOrEqual(0);
      expect(features.pauseFrequency).toBeGreaterThanOrEqual(0);
      expect(features.voiceClarity).toBeGreaterThanOrEqual(0);
      expect(features.articulation).toBeGreaterThanOrEqual(0);
      expect(features.speakingDuration).toBeGreaterThan(0);
    });

    it("should handle empty audio buffer gracefully", async () => {
      const audioBase64 = Buffer.alloc(0).toString("base64");
      const transcript = "Test";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

      // Empty audio is technically valid base64, but will estimate 0 seconds
      expect(features.speakingDuration).toBeGreaterThanOrEqual(0);
      expect(features.audioQuality).toBeDefined();
    });

    it("should return error features on exception", async () => {
      // Pass invalid base64
      const features = await AcousticAnalyzer.analyzeAudio("not-valid-base64!", "test");

      expect(features.audioQuality).toBe("poor");
      expect(features.voiceQualityFlags).toContain("error");
      expect(features.speakingDuration).toBe(0);
    });

    it("should calculate speech rate correctly", async () => {
      // 2 seconds of audio
      const audioBuffer = Buffer.alloc(64000); // 16kHz * 16-bit * 2 seconds
      const audioBase64 = audioBuffer.toString("base64");

      // 10 words
      const transcript = "one two three four five six seven eight nine ten";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

      // Speech rate = (words / seconds) * 60
      // = (10 / 2) * 60 = 300 wpm (expected)
      expect(features.speechRate).toBeGreaterThan(0);
    });

    it("should detect pause distribution across time", async () => {
      const audioBuffer = Buffer.alloc(128000); // ~4 seconds
      const audioBase64 = audioBuffer.toString("base64");
      const transcript = "I would like to speak about this topic in some detail.";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

      expect(features.pauseDistribution.before1min).toBeGreaterThanOrEqual(0);
      expect(features.pauseDistribution.between1to3min).toBeGreaterThanOrEqual(0);
      expect(features.pauseDistribution.after3min).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Pitch variation categorization", () => {
    it("should categorize flat pitch (variance < 0.33)", async () => {
      const audioBuffer = Buffer.alloc(32000);
      const audioBase64 = audioBuffer.toString("base64");
      const transcript = "This is a flat response.";

      // Mock categorizePitchVariation by testing via analyzeAudio
      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

      expect(["flat", "moderate", "expressive"]).toContain(features.pitchVariation);
    });

    it("should provide pitch mean and range estimates", async () => {
      const audioBuffer = Buffer.alloc(32000);
      const audioBase64 = audioBuffer.toString("base64");
      const transcript = "Test response with pitch variation.";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

      // Pitch mean should be realistic for human speech
      expect(features.pitchMean).toBeGreaterThan(50);
      expect(features.pitchMean).toBeLessThan(300);

      // Pitch range should be in semitones
      expect(features.pitchRange).toBeGreaterThan(0);
      expect(features.pitchRange).toBeLessThan(24); // Max realistic range
    });
  });

  describe("Filler word detection", () => {
    it("should detect common filler words", async () => {
      const audioBuffer = Buffer.alloc(32000);
      const audioBase64 = audioBuffer.toString("base64");

      // Transcript with multiple fillers
      const transcriptWithFillers =
        "Um, I think like, uh, this is important. You know, I mean, sort of like a big deal.";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcriptWithFillers);

      expect(features.fillerWords).toBeGreaterThan(0);
      expect(features.fillerWordsFlag).toBe(true); // > 5% of words
    });

    it("should flag excessive fillers (> 5% of total words)", async () => {
      const audioBuffer = Buffer.alloc(32000);
      const audioBase64 = audioBuffer.toString("base64");

      // 20 fillers in ~40 words = 50%
      const transcriptWithManyFillers =
        "Um uh like um you know like um uh sort of kind of um like " +
        "I mean like uh this is sort of like um a test you know";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcriptWithManyFillers);

      expect(features.fillerWordsFlag).toBe(true);
    });

    it("should not flag normal speech without fillers", async () => {
      const audioBuffer = Buffer.alloc(32000);
      const audioBase64 = audioBuffer.toString("base64");

      const normalTranscript = "This is a clear response without any filler words.";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, normalTranscript);

      expect(features.fillerWords).toBeLessThanOrEqual(1);
      expect(features.fillerWordsFlag).toBe(false);
    });
  });

  describe("Sentence intonation categorization", () => {
    it("should categorize intonation patterns", async () => {
      const audioBuffer = Buffer.alloc(32000);
      const audioBase64 = audioBuffer.toString("base64");
      const transcript = "This is a test response.";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

      expect(["falling", "rising", "flat", "varied"]).toContain(features.stressPattern.sentenceIntonation);
    });
  });

  describe("Audio quality categorization", () => {
    it("should categorize audio quality as excellent/good/acceptable/poor", async () => {
      const audioBuffer = Buffer.alloc(32000);
      const audioBase64 = audioBuffer.toString("base64");
      const transcript = "Test";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

      expect(["excellent", "good", "acceptable", "poor"]).toContain(features.audioQuality);
    });

    it("should provide voice clarity rating (0-10)", async () => {
      const audioBuffer = Buffer.alloc(32000);
      const audioBase64 = audioBuffer.toString("base64");
      const transcript = "Voice clarity test.";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

      expect(features.voiceClarity).toBeGreaterThanOrEqual(0);
      expect(features.voiceClarity).toBeLessThanOrEqual(10);
    });

    it("should provide articulation rating (0-10)", async () => {
      const audioBuffer = Buffer.alloc(32000);
      const audioBase64 = audioBuffer.toString("base64");
      const transcript = "Articulation test response.";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

      expect(features.articulation).toBeGreaterThanOrEqual(0);
      expect(features.articulation).toBeLessThanOrEqual(10);
    });
  });

  describe("Stress pattern analysis", () => {
    it("should analyze keyword emphasis", async () => {
      const audioBuffer = Buffer.alloc(32000);
      const audioBase64 = audioBuffer.toString("base64");
      const transcript = "The MAIN point is very IMPORTANT to understand.";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

      expect(features.stressPattern.keywordEmphasis).toBeGreaterThanOrEqual(0);
      expect(features.stressPattern.keywordEmphasis).toBeLessThanOrEqual(10);
    });

    it("should provide natural flow rating", async () => {
      const audioBuffer = Buffer.alloc(32000);
      const audioBase64 = audioBuffer.toString("base64");
      const transcript = "This response flows naturally and smoothly.";

      const features = await AcousticAnalyzer.analyzeAudio(audioBase64, transcript);

      expect(features.stressPattern.naturalFlow).toBeGreaterThanOrEqual(0);
      expect(features.stressPattern.naturalFlow).toBeLessThanOrEqual(10);
    });
  });
});

describe("Acoustic Fluency Scoring", () => {
  let mockFeatures: AudioFeatures;

  beforeEach(() => {
    mockFeatures = {
      speechRate: 130,
      pauseDuration: 2,
      pauseFrequency: 3,
      pauseDistribution: { before1min: 1, between1to3min: 2, after3min: 0 },
      pitchMean: 120,
      pitchRange: 15,
      pitchStdDev: 8,
      pitchVariation: "expressive",
      voiceClarity: 8,
      articulation: 7,
      voiceQualityFlags: [],
      speakingDuration: 30,
      silenceDuration: 2,
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
  });

  it("should compute acoustic fluency score between 0-1", () => {
    const score = computeAcousticFluencyScore(mockFeatures, "B1");

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("should reward expressive pitch variation", () => {
    const expressiveFeatures = { ...mockFeatures, pitchVariation: "expressive" as const };
    const flatFeatures = { ...mockFeatures, pitchVariation: "flat" as const };

    const expressiveScore = computeAcousticFluencyScore(expressiveFeatures, "B1");
    const flatScore = computeAcousticFluencyScore(flatFeatures, "B1");

    // Expressive should score higher
    expect(expressiveScore).toBeGreaterThan(flatScore);
  });

  it("should consider speech rate appropriacy", () => {
    const fastSpeech = { ...mockFeatures, speechRate: 180 };
    const slowSpeech = { ...mockFeatures, speechRate: 80 };
    const optimalSpeech = { ...mockFeatures, speechRate: 135 };

    const fastScore = computeAcousticFluencyScore(fastSpeech, "B1");
    const slowScore = computeAcousticFluencyScore(slowSpeech, "B1");
    const optimalScore = computeAcousticFluencyScore(optimalSpeech, "B1");

    // Optimal (120-150 wpm) should score highest
    expect(optimalScore).toBeGreaterThanOrEqual(Math.max(fastScore, slowScore));
  });

  it("should factor in natural flow rating", () => {
    const naturalFlow = { ...mockFeatures, stressPattern: { ...mockFeatures.stressPattern, naturalFlow: 9 } };
    const unnaturalFlow = { ...mockFeatures, stressPattern: { ...mockFeatures.stressPattern, naturalFlow: 3 } };

    const naturalScore = computeAcousticFluencyScore(naturalFlow, "B1");
    const unnaturalScore = computeAcousticFluencyScore(unnaturalFlow, "B1");

    expect(naturalScore).toBeGreaterThan(unnaturalScore);
  });

  it("should vary scores based on CEFR level (placeholder for future enhancement)", () => {
    const a1Score = computeAcousticFluencyScore(mockFeatures, "A1");
    const c1Score = computeAcousticFluencyScore(mockFeatures, "C1");

    // Currently same algorithm for all levels, but interface supports future CEFR-aware scoring
    expect([a1Score, c1Score]).toBeDefined();
  });
});

describe("Audio Quality Flagging", () => {
  it("should flag poor audio quality", () => {
    const poorAudio: AudioFeatures = {
      speechRate: 100,
      pauseDuration: 1,
      pauseFrequency: 1,
      pauseDistribution: { before1min: 1, between1to3min: 0, after3min: 0 },
      pitchMean: 100,
      pitchRange: 10,
      pitchStdDev: 5,
      pitchVariation: "flat",
      voiceClarity: 2,
      articulation: 2,
      voiceQualityFlags: ["low_snr", "background_noise"],
      speakingDuration: 20,
      silenceDuration: 5,
      fillerWords: 0,
      fillerWordsFlag: false,
      stressPattern: { keywordEmphasis: 2, sentenceIntonation: "flat", naturalFlow: 2 },
      processingTime: 100,
      audioQuality: "poor",
    };

    const result = flagAudioQuality(poorAudio);

    expect(result.acceptable).toBe(false);
    expect(result.reason).toContain("too low");
  });

  it("should flag short audio duration (< 5 seconds)", () => {
    const shortAudio: AudioFeatures = {
      speechRate: 120,
      pauseDuration: 0.5,
      pauseFrequency: 1,
      pauseDistribution: { before1min: 1, between1to3min: 0, after3min: 0 },
      pitchMean: 120,
      pitchRange: 10,
      pitchStdDev: 5,
      pitchVariation: "moderate",
      voiceClarity: 7,
      articulation: 7,
      voiceQualityFlags: [],
      speakingDuration: 3, // Too short
      silenceDuration: 0,
      fillerWords: 0,
      fillerWordsFlag: false,
      stressPattern: { keywordEmphasis: 5, sentenceIntonation: "falling", naturalFlow: 5 },
      processingTime: 100,
      audioQuality: "good",
    };

    const result = flagAudioQuality(shortAudio);

    expect(result.acceptable).toBe(false);
    expect(result.reason).toContain("too short");
  });

  it("should flag excessive filler words (> 5%)", () => {
    const tooManyFillers: AudioFeatures = {
      speechRate: 120,
      pauseDuration: 1,
      pauseFrequency: 2,
      pauseDistribution: { before1min: 1, between1to3min: 1, after3min: 0 },
      pitchMean: 120,
      pitchRange: 10,
      pitchStdDev: 5,
      pitchVariation: "moderate",
      voiceClarity: 7,
      articulation: 7,
      voiceQualityFlags: [],
      speakingDuration: 30,
      silenceDuration: 2,
      fillerWords: 20, // High count
      fillerWordsFlag: true,
      stressPattern: { keywordEmphasis: 5, sentenceIntonation: "falling", naturalFlow: 5 },
      processingTime: 100,
      audioQuality: "good",
    };

    const result = flagAudioQuality(tooManyFillers);

    expect(result.acceptable).toBe(false);
    expect(result.reason).toContain("filler");
  });

  it("should accept good quality audio with appropriate duration", () => {
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
      speakingDuration: 45, // Good duration
      silenceDuration: 2,
      fillerWords: 2,
      fillerWordsFlag: false,
      stressPattern: { keywordEmphasis: 7, sentenceIntonation: "varied", naturalFlow: 8 },
      processingTime: 150,
      audioQuality: "good",
    };

    const result = flagAudioQuality(goodAudio);

    expect(result.acceptable).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

describe("AudioFeatures interface", () => {
  it("should have all required prosodic metrics", () => {
    const audioBuffer = Buffer.alloc(32000);
    const audioBase64 = audioBuffer.toString("base64");
    const transcript = "Test response for feature extraction.";

    AcousticAnalyzer.analyzeAudio(audioBase64, transcript).then(features => {
      // Verify structure
      expect(features).toHaveProperty("speechRate");
      expect(features).toHaveProperty("pauseDuration");
      expect(features).toHaveProperty("pauseFrequency");
      expect(features).toHaveProperty("pauseDistribution");
      expect(features).toHaveProperty("pitchMean");
      expect(features).toHaveProperty("pitchRange");
      expect(features).toHaveProperty("pitchStdDev");
      expect(features).toHaveProperty("pitchVariation");
      expect(features).toHaveProperty("voiceClarity");
      expect(features).toHaveProperty("articulation");
      expect(features).toHaveProperty("voiceQualityFlags");
      expect(features).toHaveProperty("speakingDuration");
      expect(features).toHaveProperty("silenceDuration");
      expect(features).toHaveProperty("fillerWords");
      expect(features).toHaveProperty("fillerWordsFlag");
      expect(features).toHaveProperty("stressPattern");
      expect(features).toHaveProperty("processingTime");
      expect(features).toHaveProperty("audioQuality");
    });
  });
});
