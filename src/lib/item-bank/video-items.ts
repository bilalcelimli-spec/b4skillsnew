/**
 * Video Item Support
 * ─────────────────────────────────────────────────────────────────────────────
 * Extends the item model to support video-based assessment tasks:
 *   • Listening comprehension with video stimulus (replaces audio-only)
 *   • Speaking response to video prompt (candidate records video reply)
 *   • Writing task triggered by video (summarise, respond, critique)
 *   • Video role-play: pre-recorded interlocutor + candidate response
 *
 * Video storage: HLS streaming via CDN (Cloudflare Stream / AWS MediaConvert)
 * Subtitles: WebVTT with cue timestamps for accessibility (WCAG 1.2.2)
 * Playback controls: play/pause only (no scrubbing during exam mode)
 * Max plays: configurable per item (default: 2 for listening, unlimited for speaking prompts)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type VideoItemType =
  | "VIDEO_COMPREHENSION"     // Watch → MCQ / short answer
  | "VIDEO_SPEAKING_PROMPT"   // Watch prompt → record spoken response
  | "VIDEO_WRITING_PROMPT"    // Watch → written response
  | "VIDEO_ROLE_PLAY"         // Interlocutor video + candidate replies
  | "VIDEO_DICTATION";        // Listen-and-type transcription

export interface VideoAsset {
  assetId: string;
  hlsUrl: string;              // primary streaming URL (m3u8)
  mp4Url?: string;             // fallback progressive download
  subtitleUrl?: string;        // WebVTT
  thumbnailUrl?: string;
  durationSec: number;
  resolution: "360p" | "480p" | "720p" | "1080p";
  language: string;            // e.g. "en-GB", "en-US"
  nativeSpeaker: boolean;
  accent: string;              // e.g. "British RP", "General American", "Australian"
  speakingRate: "SLOW" | "NORMAL" | "FAST"; // CEFR A1-A2 = SLOW, B1-B2 = NORMAL, C1-C2 = FAST
  hasBackgroundNoise: boolean;
  backgroundNoiseType?: string; // e.g. "office", "hospital ward", "lecture hall"
  createdAt: string;
  licensedFor: string[];       // organization IDs or "ALL"
}

export interface VideoItemContent {
  type: VideoItemType;
  video: VideoAsset;
  maxPlays: number;            // how many times candidate can replay
  question: string;            // text question shown below video
  options?: string[];          // for VIDEO_COMPREHENSION MCQ
  correctIndex?: number;
  targetWordCount?: number;    // for VIDEO_WRITING_PROMPT
  speakingTimeLimit?: number;  // seconds for VIDEO_SPEAKING_PROMPT
  rubricId?: string;           // reference to scoring rubric
  subtitlesAvailable: boolean; // accessibility flag
  subtitlesDefaultHidden: boolean; // true for listening items
}

export interface VideoResponse {
  itemId: string;
  sessionId: string;
  playsUsed: number;
  subtitlesViewed: boolean;     // accessibility tracking
  responseType: "VIDEO" | "TEXT" | "AUDIO";
  responseData: string;        // text answer OR base64 video/audio blob reference
  videoUrl?: string;           // if candidate recorded video response
  transcribedText?: string;    // AI transcription of audio/video response
  submittedAt: string;
  timeOnTask: number;          // seconds
}

export interface VideoScoringResult {
  itemId: string;
  responseId: string;
  method: "AI" | "HUMAN" | "HYBRID";
  score: number;               // 0–1
  cefrBand: string;
  dimensions?: Record<string, number>;
  feedback: string;
  transcription?: string;      // for spoken responses
  flaggedForReview: boolean;
}

// ── Video CDN helpers ─────────────────────────────────────────────────────────

const VIDEO_CDN_BASE = process.env.VIDEO_CDN_BASE ?? "https://stream.linguadapt.com";

export function buildHLSUrl(assetId: string): string {
  return `${VIDEO_CDN_BASE}/${assetId}/manifest.m3u8`;
}

export function buildThumbnailUrl(assetId: string): string {
  return `${VIDEO_CDN_BASE}/${assetId}/thumbnail.jpg`;
}

export function buildSubtitleUrl(assetId: string, lang = "en"): string {
  return `${VIDEO_CDN_BASE}/${assetId}/subtitles_${lang}.vtt`;
}

// ── Video accessibility validation ────────────────────────────────────────────

export interface AccessibilityCheck {
  hasSubtitles: boolean;
  hasTranscript: boolean;
  hasAudioDescription: boolean;   // for visual content
  meetsWCAG122: boolean;          // WCAG 1.2.2 — captions for live audio
  meetsWCAG125: boolean;          // WCAG 1.2.5 — audio description
  issues: string[];
}

export function validateVideoAccessibility(asset: VideoAsset, content: VideoItemContent): AccessibilityCheck {
  const issues: string[] = [];

  const hasSubtitles = !!asset.subtitleUrl || content.subtitlesAvailable;
  const hasTranscript = false; // would check transcript asset
  const hasAudioDescription = false; // would check AD track

  if (!hasSubtitles && content.type !== "VIDEO_WRITING_PROMPT") {
    issues.push("WCAG 1.2.2: Captions required for video content");
  }
  if (content.subtitlesDefaultHidden && !hasSubtitles) {
    issues.push("Subtitles toggled hidden but no subtitle track available");
  }

  return {
    hasSubtitles,
    hasTranscript,
    hasAudioDescription,
    meetsWCAG122: hasSubtitles,
    meetsWCAG125: hasAudioDescription,
    issues,
  };
}

// ── Video playback session tracker ────────────────────────────────────────────

export class VideoPlaybackTracker {
  private plays: Map<string, number> = new Map(); // `${sessionId}:${itemId}` → count

  canPlay(sessionId: string, itemId: string, maxPlays: number): boolean {
    const key = `${sessionId}:${itemId}`;
    return (this.plays.get(key) ?? 0) < maxPlays;
  }

  recordPlay(sessionId: string, itemId: string): void {
    const key = `${sessionId}:${itemId}`;
    this.plays.set(key, (this.plays.get(key) ?? 0) + 1);
  }

  playsUsed(sessionId: string, itemId: string): number {
    return this.plays.get(`${sessionId}:${itemId}`) ?? 0;
  }
}

export const videoPlaybackTracker = new VideoPlaybackTracker();

// ── Speaking rate norms by CEFR ───────────────────────────────────────────────

export const VIDEO_SPEAKING_RATE_NORMS: Record<string, { wpm: [number, number]; accent: string[] }> = {
  A1: { wpm: [80, 110],  accent: ["British RP", "General American"] },
  A2: { wpm: [90, 120],  accent: ["British RP", "General American", "Australian"] },
  B1: { wpm: [100, 140], accent: ["British RP", "General American", "Australian", "Irish"] },
  B2: { wpm: [120, 160], accent: ["Any standard native variety"] },
  C1: { wpm: [140, 180], accent: ["Any native variety including regional"] },
  C2: { wpm: [150, 200], accent: ["Any native variety including strong regional"] },
};

// ── Video item factory ────────────────────────────────────────────────────────

export function createVideoItem(opts: {
  assetId: string;
  type: VideoItemType;
  durationSec: number;
  cefrLevel: string;
  question: string;
  options?: string[];
  correctIndex?: number;
  accent?: string;
  nativeSpeaker?: boolean;
  hasBackgroundNoise?: boolean;
}): { asset: VideoAsset; content: VideoItemContent } {
  const isListening = opts.type === "VIDEO_COMPREHENSION" || opts.type === "VIDEO_DICTATION";
  const rateNorm = VIDEO_SPEAKING_RATE_NORMS[opts.cefrLevel] ?? VIDEO_SPEAKING_RATE_NORMS["B1"];

  const asset: VideoAsset = {
    assetId: opts.assetId,
    hlsUrl: buildHLSUrl(opts.assetId),
    mp4Url: `${VIDEO_CDN_BASE}/${opts.assetId}/video.mp4`,
    subtitleUrl: buildSubtitleUrl(opts.assetId),
    thumbnailUrl: buildThumbnailUrl(opts.assetId),
    durationSec: opts.durationSec,
    resolution: "720p",
    language: "en",
    nativeSpeaker: opts.nativeSpeaker ?? true,
    accent: opts.accent ?? rateNorm.accent[0],
    speakingRate: opts.cefrLevel <= "A2" ? "SLOW" : opts.cefrLevel <= "B2" ? "NORMAL" : "FAST",
    hasBackgroundNoise: opts.hasBackgroundNoise ?? false,
    createdAt: new Date().toISOString(),
    licensedFor: ["ALL"],
  };

  const content: VideoItemContent = {
    type: opts.type,
    video: asset,
    maxPlays: isListening ? 2 : 999,
    question: opts.question,
    options: opts.options,
    correctIndex: opts.correctIndex,
    targetWordCount: opts.type === "VIDEO_WRITING_PROMPT" ? 150 : undefined,
    speakingTimeLimit: opts.type === "VIDEO_SPEAKING_PROMPT" ? 90 : undefined,
    subtitlesAvailable: true,
    subtitlesDefaultHidden: isListening, // captions hidden by default for listening tasks
  };

  return { asset, content };
}
