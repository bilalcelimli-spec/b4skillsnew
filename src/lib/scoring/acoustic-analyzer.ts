/**
 * Speech Acoustic Analyzer
 *
 * Extracts and analyzes prosodic features from speech responses:
 * - Speech rate (words/minute)
 * - Pause patterns (frequency, duration, distribution)
 * - Pitch variation (mean, range, std dev, intonation)
 * - Voice quality (clarity, articulation, voice quality flags)
 * - Temporal features (speaking time, silence, filler words)
 * - Stress & intonation patterns
 *
 * Used by multi-rater ensemble to enhance fluency scoring for SPEAKING tasks.
 */

/**
 * Prosodic features extracted from audio
 */
export interface AudioFeatures {
  // Speech rate
  speechRate: number; // Words per minute
  
  // Pause analysis
  pauseDuration: number; // Total pause time in seconds
  pauseFrequency: number; // Count of pauses detected
  pauseDistribution: {
    before1min: number; // Pauses in first minute
    between1to3min: number; // Pauses between 1-3 minutes
    after3min: number; // Pauses after 3 minutes
  };
  
  // Pitch analysis (fundamental frequency, F0)
  pitchMean: number; // Mean F0 in Hz
  pitchRange: number; // Range (Hz_max / Hz_min, in semitones)
  pitchStdDev: number; // Standard deviation of F0
  pitchVariation: "flat" | "moderate" | "expressive"; // Subjective pitch variation
  
  // Voice quality
  voiceClarity: number; // 0-10 (signal-to-noise ratio: high = clear)
  articulation: number; // 0-10 (pronunciation distinctness)
  voiceQualityFlags: string[]; // ["breathiness", "nasality", "harshness", "roughness"]
  
  // Temporal features
  speakingDuration: number; // Total speaking time (seconds)
  silenceDuration: number; // Total silence (excluding pauses)
  fillerWords: number; // Count of um/uh/like/you know
  fillerWordsFlag: boolean; // True if > 5% of words
  
  // Stress & intonation
  stressPattern: {
    keywordEmphasis: number; // 0-10 (prominence on content words)
    sentenceIntonation: "falling" | "rising" | "flat" | "varied"; // Intonation contour
    naturalFlow: number; // 0-10 (overall prosodic naturalness)
  };
  
  // Metadata
  processingTime: number; // Milliseconds to extract features
  audioQuality: "excellent" | "good" | "acceptable" | "poor"; // Overall quality flag
}

/**
 * Placeholder implementation for speech acoustic analysis
 *
 * In production, this would use:
 * - librosa (Python) for FFT and pitch extraction
 * - WebRTC VAD for voice activity detection
 * - Praat-compatible pitch algorithms
 * - Custom filler-word detection (regex + phoneme matching)
 *
 * For now, returns simulated/placeholder features to unblock multi-rater integration.
 */
export class AcousticAnalyzer {
  /**
   * Extract acoustic features from audio
   *
   * @param audioBase64 Base64-encoded audio (WAV/MP3)
   * @param transcript Transcribed text (for word count, filler detection)
   * @returns AudioFeatures with all prosodic metrics
   */
  static async analyzeAudio(
    audioBase64: string,
    transcript: string
  ): Promise<AudioFeatures> {
    const t0 = Date.now();

    try {
      // TODO: In production, invoke Python backend (librosa) or Node audio library
      // For MVP, return simulated features based on audio length + transcript

      const audioBuffer = Buffer.from(audioBase64, "base64");
      const audioLengthSeconds = this.estimateAudioDuration(audioBuffer);
      const wordCount = transcript.split(/\s+/).length;
      const fillerCount = this.countFillerWords(transcript);

      // Simulated features (would be computed from actual audio)
      const features: AudioFeatures = {
        speechRate: Math.round((wordCount / audioLengthSeconds) * 60),
        pauseDuration: Math.random() * 5, // 0-5 seconds
        pauseFrequency: Math.floor(Math.random() * 8), // 0-8 pauses
        pauseDistribution: {
          before1min: Math.floor(Math.random() * 3),
          between1to3min: Math.floor(Math.random() * 4),
          after3min: Math.floor(Math.random() * 2),
        },

        pitchMean: 100 + Math.random() * 50, // 100-150 Hz (voice-dependent)
        pitchRange: 12 + Math.random() * 6, // 12-18 semitones
        pitchStdDev: 5 + Math.random() * 10,
        pitchVariation: this.categorizePitchVariation(Math.random()),

        voiceClarity: Math.round(5 + Math.random() * 5), // 5-10
        articulation: Math.round(5 + Math.random() * 5), // 5-10
        voiceQualityFlags: fillerCount > 3 ? ["excessive_pausing"] : [],

        speakingDuration: audioLengthSeconds,
        silenceDuration: Math.random() * 5,
        fillerWords: fillerCount,
        fillerWordsFlag: fillerCount / wordCount > 0.05,

        stressPattern: {
          keywordEmphasis: Math.round(5 + Math.random() * 5),
          sentenceIntonation: this.categorizeSentenceIntonation(Math.random()),
          naturalFlow: Math.round(5 + Math.random() * 5),
        },

        processingTime: Date.now() - t0,
        audioQuality: this.categorizeAudioQuality(
          Math.round(7 + Math.random() * 3)
        ),
      };

      return features;
    } catch (error) {
      console.error("[AcousticAnalyzer] Error:", error);
      // Return null features on error
      return {
        speechRate: 0,
        pauseDuration: 0,
        pauseFrequency: 0,
        pauseDistribution: { before1min: 0, between1to3min: 0, after3min: 0 },
        pitchMean: 0,
        pitchRange: 0,
        pitchStdDev: 0,
        pitchVariation: "flat",
        voiceClarity: 0,
        articulation: 0,
        voiceQualityFlags: ["error"],
        speakingDuration: 0,
        silenceDuration: 0,
        fillerWords: 0,
        fillerWordsFlag: false,
        stressPattern: {
          keywordEmphasis: 0,
          sentenceIntonation: "flat",
          naturalFlow: 0,
        },
        processingTime: Date.now() - t0,
        audioQuality: "poor",
      };
    }
  }

  /**
   * Estimate audio duration from buffer (simplified)
   * In production: parse WAV header or use ffprobe
   */
  private static estimateAudioDuration(buffer: Buffer): number {
    // Very rough estimate: assume 16-bit PCM at 16kHz
    // Actual implementation would parse WAV headers
    const sampleRate = 16000;
    const bytesPerSample = 2;
    const seconds = buffer.length / (sampleRate * bytesPerSample);
    return Math.max(1, seconds); // At least 1 second
  }

  /**
   * Count filler words (um, uh, like, you know, etc.)
   */
  private static countFillerWords(transcript: string): number {
    const fillers = ["um", "uh", "erm", "like", "you know", "i mean", "sort of", "kind of"];
    let count = 0;
    const words = transcript.toLowerCase().split(/\s+/);

    for (const word of words) {
      if (fillers.includes(word.replace(/[.,!?]/g, ""))) {
        count++;
      }
    }

    return count;
  }

  /**
   * Categorize pitch variation based on stdDev
   */
  private static categorizePitchVariation(
    variance: number
  ): "flat" | "moderate" | "expressive" {
    if (variance < 0.33) return "flat";
    if (variance < 0.66) return "moderate";
    return "expressive";
  }

  /**
   * Categorize sentence intonation
   */
  private static categorizeSentenceIntonation(
    pattern: number
  ): "falling" | "rising" | "flat" | "varied" {
    if (pattern < 0.25) return "falling";
    if (pattern < 0.5) return "rising";
    if (pattern < 0.75) return "flat";
    return "varied";
  }

  /**
   * Categorize overall audio quality
   */
  private static categorizeAudioQuality(
    score: number
  ): "excellent" | "good" | "acceptable" | "poor" {
    if (score >= 9) return "excellent";
    if (score >= 7) return "good";
    if (score >= 5) return "acceptable";
    return "poor";
  }
}

/**
 * Scoring contribution from acoustic features
 *
 * Fluency score blends:
 *  - 50% LLM fluency rating (from multi-rater ensemble)
 *  - 30% Acoustic naturalness (pitch variation, pause appropriacy, intonation)
 *  - 20% Speech rate appropriacy (relative to CEFR level)
 */
export function computeAcousticFluencyScore(
  features: AudioFeatures,
  cefrLevel: string
): number {
  const acousticNaturalness =
    (features.pitchVariation === "expressive" ? 10 : 7) *
    0.3 +
    features.stressPattern.naturalFlow * 0.7;

  const speechRateAppropriate =
    features.speechRate >= 120 && features.speechRate <= 150 ? 10 : 6;

  const combinedScore =
    acousticNaturalness * 0.6 + speechRateAppropriate * 0.4;

  return combinedScore / 10; // Normalize to 0-1
}

/**
 * Detect low-quality audio before scoring
 */
export function flagAudioQuality(features: AudioFeatures): {
  acceptable: boolean;
  reason?: string;
} {
  if (features.audioQuality === "poor") {
    return {
      acceptable: false,
      reason: `Audio quality too low (${features.voiceClarity}/10 clarity)`,
    };
  }

  if (features.speakingDuration < 5) {
    return { acceptable: false, reason: "Speaking duration too short (< 5 sec)" };
  }

  if (features.fillerWordsFlag) {
    return {
      acceptable: false,
      reason: `Excessive filler words (${features.fillerWords})`,
    };
  }

  return { acceptable: true };
}
