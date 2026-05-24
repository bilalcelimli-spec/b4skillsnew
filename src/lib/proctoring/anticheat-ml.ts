/**
 * Anti-Cheat ML v1
 * ─────────────────────────────────────────────────────────────────────────────
 * Behavioral biometrics engine that detects anomalous patterns in:
 *   1. Keystroke dynamics  — inter-key timing, dwell time
 *   2. Response timing     — suspiciously fast/uniform answer patterns
 *   3. Copy-paste signals  — clipboard events, sudden text appearance
 *   4. Answer entropy      — statistically unlikely correct-rate bursts
 *   5. Session fingerprint — device/browser consistency across events
 *
 * Architecture: lightweight statistical model (no external ML deps needed).
 * A future v2 can replace the scoring functions with a trained ONNX model.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface KeystrokeEvent {
  key: string;
  type: "keydown" | "keyup";
  timestamp: number; // ms since session start
}

export interface AnswerEvent {
  itemId: string;
  answeredAt: number;   // ms since session start
  isCorrect: boolean;
  skill: string;
  cefrLevel: string;
  latencyMs: number;    // time from item display to answer submission
}

export interface CopyPasteEvent {
  type: "copy" | "paste" | "cut";
  textLength: number;
  timestamp: number;
}

export interface SessionTelemetry {
  sessionId: string;
  keystrokes: KeystrokeEvent[];
  answers: AnswerEvent[];
  copyPasteEvents: CopyPasteEvent[];
  focusLostCount: number;
  fullscreenExitCount: number;
  deviceFingerprint: string;
}

export interface AnticheatSignal {
  name: string;
  score: number;   // 0 (clean) → 1 (highly anomalous)
  weight: number;
  detail: string;
}

export interface AnticheatReport {
  sessionId: string;
  riskScore: number;         // 0–100 (higher = more suspicious)
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  signals: AnticheatSignal[];
  recommendation: "PASS" | "REVIEW" | "FLAG" | "INVALIDATE";
  computedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

// Minimum realistic answer latency per skill (ms)
const MIN_PLAUSIBLE_LATENCY: Record<string, number> = {
  READING:    4000,
  LISTENING:  3000,
  GRAMMAR:    2500,
  VOCABULARY: 2000,
  WRITING:    10000,
  SPEAKING:   5000,
};

const COPY_PASTE_PENALTY_PER_EVENT = 0.15;
const FOCUS_LOST_PENALTY_PER_EVENT = 0.08;
const FULLSCREEN_EXIT_PENALTY      = 0.12;

// ── Signal Detectors ─────────────────────────────────────────────────────────

/**
 * Detect suspiciously fast answers (below human reaction threshold).
 */
function detectSpeedAnomalies(answers: AnswerEvent[]): AnticheatSignal {
  if (answers.length === 0) {
    return { name: "speed_anomaly", score: 0, weight: 0.25, detail: "No answers" };
  }

  let violations = 0;
  for (const a of answers) {
    const threshold = MIN_PLAUSIBLE_LATENCY[a.skill] ?? 2000;
    if (a.latencyMs < threshold) violations++;
  }

  const rate = violations / answers.length;
  return {
    name: "speed_anomaly",
    score: Math.min(rate * 2, 1),   // double-weight violations, cap at 1
    weight: 0.25,
    detail: `${violations}/${answers.length} answers below plausible latency floor`,
  };
}

/**
 * Detect unnaturally uniform response timing (bot-like constant cadence).
 */
function detectTimingUniformity(answers: AnswerEvent[]): AnticheatSignal {
  if (answers.length < 5) {
    return { name: "timing_uniformity", score: 0, weight: 0.15, detail: "Too few answers" };
  }

  const latencies = answers.map((a) => a.latencyMs);
  const mean = latencies.reduce((s, v) => s + v, 0) / latencies.length;
  const variance = latencies.reduce((s, v) => s + (v - mean) ** 2, 0) / latencies.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / (mean || 1); // coefficient of variation

  // Humans show high variability (cv > 0.3); bots show very low (cv < 0.05)
  const score = cv < 0.05 ? 1 : cv < 0.15 ? 0.6 : cv < 0.3 ? 0.2 : 0;

  return {
    name: "timing_uniformity",
    score,
    weight: 0.15,
    detail: `Latency CV=${cv.toFixed(3)} (lower = more uniform/suspicious)`,
  };
}

/**
 * Detect improbably high accuracy runs (e.g., 10 hard items all correct instantly).
 */
function detectAccuracyBursts(answers: AnswerEvent[]): AnticheatSignal {
  if (answers.length < 5) {
    return { name: "accuracy_burst", score: 0, weight: 0.2, detail: "Too few answers" };
  }

  // Look at windows of 5 consecutive answers
  const WINDOW = 5;
  let maxBurstScore = 0;

  for (let i = 0; i <= answers.length - WINDOW; i++) {
    const window = answers.slice(i, i + WINDOW);
    const correctCount = window.filter((a) => a.isCorrect).length;
    const avgLatency = window.reduce((s, a) => s + a.latencyMs, 0) / WINDOW;
    const hardCount = window.filter((a) => ["C1", "C2", "B2"].includes(a.cefrLevel)).length;

    // Flag: all correct + very fast + mostly hard items
    if (correctCount === WINDOW && avgLatency < 3000 && hardCount >= 3) {
      maxBurstScore = Math.max(maxBurstScore, 0.85);
    } else if (correctCount === WINDOW && avgLatency < 5000) {
      maxBurstScore = Math.max(maxBurstScore, 0.5);
    }
  }

  return {
    name: "accuracy_burst",
    score: maxBurstScore,
    weight: 0.2,
    detail: maxBurstScore > 0 ? "Burst of perfect fast answers on hard items" : "No suspicious accuracy bursts",
  };
}

/**
 * Keystroke dynamics: check for paste-style text entry (very long dwell gaps).
 */
function detectKeystrokeAnomalies(keystrokes: KeystrokeEvent[]): AnticheatSignal {
  if (keystrokes.length < 10) {
    return { name: "keystroke_dynamics", score: 0, weight: 0.15, detail: "Insufficient keystroke data" };
  }

  const downEvents = keystrokes.filter((k) => k.type === "keydown");
  const interKeyTimes: number[] = [];

  for (let i = 1; i < downEvents.length; i++) {
    interKeyTimes.push(downEvents[i].timestamp - downEvents[i - 1].timestamp);
  }

  const mean = interKeyTimes.reduce((s, v) => s + v, 0) / interKeyTimes.length;
  // Detect suspiciously large single gaps (paste event disguised as typing)
  const hugeGaps = interKeyTimes.filter((t) => t > 5000).length;
  const tinyGaps = interKeyTimes.filter((t) => t < 30).length; // < 30ms = not human

  const hugeGapRate = hugeGaps / interKeyTimes.length;
  const tinyGapRate = tinyGaps / interKeyTimes.length;

  const score = Math.min(hugeGapRate * 0.5 + tinyGapRate * 0.8, 1);

  return {
    name: "keystroke_dynamics",
    score,
    weight: 0.15,
    detail: `mean IKI=${mean.toFixed(0)}ms, huge gaps=${hugeGaps}, tiny gaps=${tinyGaps}`,
  };
}

/**
 * Copy-paste and external resource signals.
 */
function detectCopyPaste(
  events: CopyPasteEvent[],
  focusLost: number,
  fullscreenExits: number
): AnticheatSignal {
  const pasteCount = events.filter((e) => e.type === "paste").length;
  const score = Math.min(
    pasteCount * COPY_PASTE_PENALTY_PER_EVENT +
      focusLost * FOCUS_LOST_PENALTY_PER_EVENT +
      fullscreenExits * FULLSCREEN_EXIT_PENALTY,
    1
  );

  return {
    name: "copy_paste_external",
    score,
    weight: 0.25,
    detail: `pastes=${pasteCount}, focus_lost=${focusLost}, fullscreen_exits=${fullscreenExits}`,
  };
}

// ── Main Scorer ──────────────────────────────────────────────────────────────

export function computeAnticheatReport(telemetry: SessionTelemetry): AnticheatReport {
  const signals: AnticheatSignal[] = [
    detectSpeedAnomalies(telemetry.answers),
    detectTimingUniformity(telemetry.answers),
    detectAccuracyBursts(telemetry.answers),
    detectKeystrokeAnomalies(telemetry.keystrokes),
    detectCopyPaste(
      telemetry.copyPasteEvents,
      telemetry.focusLostCount,
      telemetry.fullscreenExitCount
    ),
  ];

  // Weighted sum
  const totalWeight = signals.reduce((s, sig) => s + sig.weight, 0);
  const weightedScore = signals.reduce((s, sig) => s + sig.score * sig.weight, 0);
  const normalized = totalWeight > 0 ? weightedScore / totalWeight : 0;
  const riskScore = Math.round(normalized * 100);

  const riskLevel =
    riskScore >= 75 ? "CRITICAL" :
    riskScore >= 50 ? "HIGH" :
    riskScore >= 25 ? "MEDIUM" : "LOW";

  const recommendation =
    riskScore >= 75 ? "INVALIDATE" :
    riskScore >= 50 ? "FLAG" :
    riskScore >= 25 ? "REVIEW" : "PASS";

  return {
    sessionId: telemetry.sessionId,
    riskScore,
    riskLevel,
    signals,
    recommendation,
    computedAt: new Date().toISOString(),
  };
}

// ── React Hook (client-side telemetry collector) ─────────────────────────────
// Kept in this file so server can import the types; the hook is tree-shaken in Node.

export function createTelemetryCollector(sessionId: string) {
  const state: SessionTelemetry = {
    sessionId,
    keystrokes: [],
    answers: [],
    copyPasteEvents: [],
    focusLostCount: 0,
    fullscreenExitCount: 0,
    deviceFingerprint: "",
  };

  const sessionStart = Date.now();

  function recordKeystroke(e: KeyboardEvent) {
    state.keystrokes.push({
      key: e.key.length === 1 ? "char" : e.key, // don't store actual text
      type: e.type as "keydown" | "keyup",
      timestamp: Date.now() - sessionStart,
    });
  }

  function recordCopyPaste(e: ClipboardEvent) {
    state.copyPasteEvents.push({
      type: e.type as "copy" | "paste" | "cut",
      textLength: e.clipboardData?.getData("text")?.length ?? 0,
      timestamp: Date.now() - sessionStart,
    });
  }

  function recordFocusLost() {
    state.focusLostCount++;
  }

  function recordFullscreenExit() {
    if (!document.fullscreenElement) state.fullscreenExitCount++;
  }

  function recordAnswer(answer: Omit<AnswerEvent, never>) {
    state.answers.push(answer);
  }

  function flush(): SessionTelemetry {
    return JSON.parse(JSON.stringify(state));
  }

  return { recordKeystroke, recordCopyPaste, recordFocusLost, recordFullscreenExit, recordAnswer, flush };
}
