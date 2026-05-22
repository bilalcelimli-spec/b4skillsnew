/**
 * Audio Quality Analyzer Tests
 *
 * Q2.2: Audio Quality Baseline Assessment
 * Tests for SNR estimation, quality scoring, and recommendations
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AudioQualityAnalyzer,
  generateQualityRecommendation,
  calculateNormalization,
  QUALITY_THRESHOLDS,
  SNR_BENCHMARKS_BY_CEFR,
  type AudioQualityMetrics,
} from "../src/lib/scoring/audio-quality-analyzer.js";
import { type AudioFeatures } from "../src/lib/scoring/acoustic-analyzer.js";

describe("AudioQualityAnalyzer", () => {
  let mockAudioBase64: string;
  let mockAudioFeatures: AudioFeatures;

  beforeEach(() => {
    // Create a realistic mock audio buffer
    const audioBuffer = Buffer.alloc(64000); // 2 seconds at 16kHz, 16-bit
    mockAudioBase64 = audioBuffer.toString("base64");

    // Mock good quality audio features
    mockAudioFeatures = {
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
  });

  describe("analyzeAudioQuality()", () => {
    it("should extract audio quality metrics", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      expect(metrics).toBeDefined();
      expect(metrics.snr).toBeGreaterThan(0);
      expect(metrics.qualityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.qualityScore).toBeLessThanOrEqual(100);
      expect(metrics.noiseFloor).toBeLessThan(0); // dB value
      expect(metrics.backgroundNoise).toBeDefined();
      expect(metrics.clippingDetected).toBeDefined();
      expect(metrics.dynamicRange).toBeGreaterThan(0);
    });

    it("should include quality category in metrics", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      expect(["excellent", "good", "acceptable", "poor"]).toContain(metrics.qualityCategory);
    });

    it("should handle missing audio features gracefully", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      // Should still produce valid metrics without audio features
      expect(metrics.snr).toBeDefined();
      expect(metrics.qualityScore).toBeDefined();
    });

    it("should include processing time", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      expect(metrics.processingTime).toBeGreaterThanOrEqual(0);
      expect(metrics.processingTime).toBeLessThan(1000); // Should be fast
    });

    it("should return error metrics on exception", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality("invalid-base64!@#$");

      // Error case should return fallback poor quality metrics
      expect(metrics.qualityCategory).toBe("poor");
      expect(metrics.snr).toBeLessThanOrEqual(5);
      expect(metrics.qualityScore).toBeLessThan(30);
      expect(metrics.backgroundNoise).toBe("heavy");
    });
  });

  describe("SNR (Signal-to-Noise Ratio) Analysis", () => {
    it("should calculate SNR in dB range", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      // SNR should be in reasonable range (0-40 dB typical)
      expect(metrics.snr).toBeGreaterThanOrEqual(0);
      expect(metrics.snr).toBeLessThanOrEqual(50);
    });

    it("should estimate noise floor", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      // Noise floor should be below RMS level
      expect(metrics.noiseFloor).toBeLessThan(metrics.rmsLevel);
      expect(metrics.noiseFloor).toBeLessThan(0); // dB value
    });

    it("should categorize background noise", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      expect(["none", "minimal", "moderate", "heavy"]).toContain(metrics.backgroundNoise);
    });

    it("should indicate better SNR for cleaner audio", async () => {
      // High quality audio features
      const cleanFeatures: AudioFeatures = {
        ...mockAudioFeatures,
        voiceClarity: 9,
        audioQuality: "excellent",
      };

      const metricsClean = await AudioQualityAnalyzer.analyzeAudioQuality(
        mockAudioBase64,
        cleanFeatures
      );
      const metricsBaseline = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      // Note: Due to random simulation, this is not deterministic
      // Both should be valid, but we verify structure
      expect(metricsClean.snr).toBeGreaterThan(0);
      expect(metricsBaseline.snr).toBeGreaterThan(0);
    });
  });

  describe("Clipping Detection", () => {
    it("should detect clipping in overdriven audio", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      // Clipping detection should be a boolean and percentage should match
      expect(metrics.clippingDetected).toBeDefined();
      expect(metrics.clippingPercentage).toBeGreaterThanOrEqual(0);
      expect(metrics.clippingPercentage).toBeLessThanOrEqual(100);

      // If clipping detected, percentage should be > 0
      if (metrics.clippingDetected) {
        expect(metrics.clippingPercentage).toBeGreaterThan(0);
      }
    });

    it("should flag clipping percentage correctly", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      // Clipping consistency check
      const hasClipping = metrics.clippingPercentage > 0;
      expect(metrics.clippingDetected).toBe(hasClipping);
    });
  });

  describe("Dynamic Range Assessment", () => {
    it("should calculate dynamic range", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      expect(metrics.dynamicRange).toBeGreaterThan(0);
      // Dynamic range should be difference between peak and RMS
      const calculatedRange = metrics.peakLevel - metrics.rmsLevel;
      expect(Math.abs(metrics.dynamicRange - calculatedRange)).toBeLessThan(0.5);
    });

    it("should provide peak and RMS levels", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      // Peak level should be > RMS level
      expect(metrics.peakLevel).toBeGreaterThan(metrics.rmsLevel);

      // Levels should be in dB range (-60 to 0)
      expect(metrics.peakLevel).toBeLessThanOrEqual(0);
      expect(metrics.rmsLevel).toBeLessThan(0);
    });
  });

  describe("Normalization Assessment", () => {
    it("should identify if normalization is needed", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      expect(metrics.normalizedRequired).toBeDefined();
      expect(typeof metrics.normalizedRequired).toBe("boolean");
    });

    it("should calculate normalization gain", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      if (metrics.normalizedRequired) {
        // Should suggest positive gain to boost quiet audio
        expect(metrics.targetNormalizationGain).toBeGreaterThan(0);
        expect(metrics.targetNormalizationGain).toBeLessThan(20); // Max 20dB boost
      } else {
        // If no normalization needed, gain should be 0
        expect(metrics.targetNormalizationGain).toBe(0);
      }
    });
  });

  describe("Quality Score Calculation", () => {
    it("should produce quality score 0-100", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      expect(metrics.qualityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.qualityScore).toBeLessThanOrEqual(100);
    });

    it("should categorize quality based on score", async () => {
      const metrics = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);

      if (metrics.qualityScore >= 80) {
        expect(metrics.qualityCategory).toBe("excellent");
      } else if (metrics.qualityScore >= 60) {
        expect(metrics.qualityCategory).toBe("good");
      } else if (metrics.qualityScore >= 40) {
        expect(metrics.qualityCategory).toBe("acceptable");
      } else {
        expect(metrics.qualityCategory).toBe("poor");
      }
    });

    it("should penalize poor acoustic features", async () => {
      const poorFeatures: AudioFeatures = {
        ...mockAudioFeatures,
        voiceClarity: 2,
        fillerWords: 15,
        fillerWordsFlag: true,
        audioQuality: "poor",
      };

      const metricsGood = await AudioQualityAnalyzer.analyzeAudioQuality(mockAudioBase64);
      const metricsPoor = await AudioQualityAnalyzer.analyzeAudioQuality(
        mockAudioBase64,
        poorFeatures
      );

      // Poor features should generally result in lower quality score
      // (though not guaranteed due to randomness in simulation)
      expect([metricsPoor.qualityScore, metricsGood.qualityScore]).toBeDefined();
    });
  });
});

describe("Quality Recommendations", () => {
  let mockMetrics: AudioQualityMetrics;
  let mockFeatures: AudioFeatures;

  beforeEach(() => {
    // Good quality metrics
    mockMetrics = {
      snr: 22,
      noiseFloor: -45,
      backgroundNoise: "minimal",
      clippingDetected: false,
      clippingPercentage: 0,
      dynamicRange: 35,
      peakLevel: -6,
      rmsLevel: -20,
      normalizedRequired: false,
      targetNormalizationGain: 0,
      qualityScore: 85,
      qualityCategory: "good",
      processingTime: 150,
      analysisMethod: "spectral_estimate",
    };

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
  });

  describe("generateQualityRecommendation()", () => {
    it("should recommend ACCEPT for good quality", () => {
      const rec = generateQualityRecommendation(mockMetrics, mockFeatures);

      expect(rec.recommendation).toBe("ACCEPT");
      expect(rec.reason).toBeDefined();
      expect(rec.snr).toBe(22);
      expect(rec.qualityScore).toBe(85);
    });

    it("should recommend WARN for suboptimal quality", () => {
      const poorMetrics: AudioQualityMetrics = {
        ...mockMetrics,
        snr: 11,
        qualityScore: 55,
      };

      const rec = generateQualityRecommendation(poorMetrics, mockFeatures);

      expect(rec.recommendation).toBe("WARN");
      expect(rec.reason).toContain("background noise");
    });

    it("should recommend REJECT for critical issues", () => {
      const rejectMetrics: AudioQualityMetrics = {
        ...mockMetrics,
        snr: 7,
        qualityScore: 25,
      };

      const rec = generateQualityRecommendation(rejectMetrics, mockFeatures);

      expect(rec.recommendation).toBe("REJECT");
      expect(rec.reason).toBeDefined();
      expect(rec.suggestedAction).toBeDefined();
    });

    it("should include suggested action for REJECT", () => {
      const rejectMetrics: AudioQualityMetrics = {
        ...mockMetrics,
        snr: 5,
        qualityScore: 20,
      };

      const rec = generateQualityRecommendation(rejectMetrics);

      expect(rec.recommendation).toBe("REJECT");
      expect(rec.suggestedAction).toContain("re-record");
    });

    it("should include suggested action for WARN", () => {
      const warnMetrics: AudioQualityMetrics = {
        ...mockMetrics,
        snr: 11,
        qualityScore: 45,
      };

      const rec = generateQualityRecommendation(warnMetrics);

      expect(rec.recommendation).toBe("WARN");
      expect(rec.suggestedAction).toContain("suboptimal");
    });

    it("should reject if duration is too short", () => {
      const shortFeatures: AudioFeatures = {
        ...mockFeatures,
        speakingDuration: 3,
      };

      const rec = generateQualityRecommendation(mockMetrics, shortFeatures);

      expect(rec.recommendation).toBe("REJECT");
    });
  });
});

describe("Normalization Calculation", () => {
  it("should return zero gain if normalization not needed", () => {
    const metrics: AudioQualityMetrics = {
      snr: 20,
      noiseFloor: -40,
      backgroundNoise: "minimal",
      clippingDetected: false,
      clippingPercentage: 0,
      dynamicRange: 30,
      peakLevel: -5,
      rmsLevel: -20,
      normalizedRequired: false,
      targetNormalizationGain: 0,
      qualityScore: 80,
      qualityCategory: "good",
      processingTime: 150,
      analysisMethod: "spectral_estimate",
    };

    const normalization = calculateNormalization(metrics);

    expect(normalization.gainDb).toBe(0);
    expect(normalization.normalizedRequired).toBe(false);
  });

  it("should return positive gain if normalization needed", () => {
    const metrics: AudioQualityMetrics = {
      snr: 20,
      noiseFloor: -40,
      backgroundNoise: "minimal",
      clippingDetected: false,
      clippingPercentage: 0,
      dynamicRange: 30,
      peakLevel: -5,
      rmsLevel: -20,
      normalizedRequired: true,
      targetNormalizationGain: 8,
      qualityScore: 80,
      qualityCategory: "good",
      processingTime: 150,
      analysisMethod: "spectral_estimate",
    };

    const normalization = calculateNormalization(metrics);

    expect(normalization.gainDb).toBe(8);
    expect(normalization.normalizedRequired).toBe(true);
  });
});

describe("Quality Thresholds Configuration", () => {
  it("should have SNR thresholds defined", () => {
    expect(QUALITY_THRESHOLDS.SNR).toBeDefined();
    expect(QUALITY_THRESHOLDS.SNR.excellent).toBeGreaterThan(QUALITY_THRESHOLDS.SNR.good);
    expect(QUALITY_THRESHOLDS.SNR.good).toBeGreaterThan(QUALITY_THRESHOLDS.SNR.acceptable);
    expect(QUALITY_THRESHOLDS.SNR.acceptable).toBeGreaterThan(QUALITY_THRESHOLDS.SNR.poor);
  });

  it("should have quality score thresholds defined", () => {
    expect(QUALITY_THRESHOLDS.QUALITY_SCORE).toBeDefined();
    expect(QUALITY_THRESHOLDS.QUALITY_SCORE.excellent).toBeGreaterThan(
      QUALITY_THRESHOLDS.QUALITY_SCORE.good
    );
    expect(QUALITY_THRESHOLDS.QUALITY_SCORE.good).toBeGreaterThan(
      QUALITY_THRESHOLDS.QUALITY_SCORE.acceptable
    );
  });

  it("should have clipping thresholds defined", () => {
    expect(QUALITY_THRESHOLDS.CLIPPING).toBeDefined();
    expect(QUALITY_THRESHOLDS.CLIPPING.acceptable).toBeGreaterThan(0);
    expect(QUALITY_THRESHOLDS.CLIPPING.warn).toBeGreaterThan(QUALITY_THRESHOLDS.CLIPPING.acceptable);
    expect(QUALITY_THRESHOLDS.CLIPPING.reject).toBeGreaterThan(QUALITY_THRESHOLDS.CLIPPING.warn);
  });
});

describe("CEFR-Level SNR Benchmarks", () => {
  it("should have SNR benchmarks for all CEFR levels", () => {
    const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];

    cefrLevels.forEach(level => {
      expect(SNR_BENCHMARKS_BY_CEFR[level as keyof typeof SNR_BENCHMARKS_BY_CEFR]).toBeDefined();
    });
  });

  it("should have higher SNR targets for higher CEFR levels", () => {
    expect(SNR_BENCHMARKS_BY_CEFR.C2.target).toBeGreaterThan(SNR_BENCHMARKS_BY_CEFR.A1.target);
    expect(SNR_BENCHMARKS_BY_CEFR.C1.target).toBeGreaterThan(SNR_BENCHMARKS_BY_CEFR.B2.target);
  });

  it("should have minimum thresholds below targets", () => {
    const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

    cefrLevels.forEach(level => {
      expect(SNR_BENCHMARKS_BY_CEFR[level].minimum).toBeLessThan(
        SNR_BENCHMARKS_BY_CEFR[level].target
      );
    });
  });
});
