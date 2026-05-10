/**
 * Process Data Analytics — Clickstream & Behavioural Anomaly Detection
 *
 * Captures and analyses keyboard, mouse, and navigation events collected
 * during an assessment session. The module computes:
 *
 *   1. Per-item behavioural features  (time, keystrokes, idle, focus loss)
 *   2. Session-level aggregates       (strategy profile)
 *   3. HMM-based state sequence       (engaged → hesitant → rapid-guessing)
 *   4. Low-effort & rapid-guessing flags for security & fairness
 *
 * HMM Reference: Baum-Welch / Viterbi on 3 hidden states:
 *   S0 = Engaged      (normal test-taking)
 *   S1 = Hesitant     (slow, rereading, revising)
 *   S2 = Rapid-guess  (time ≪ expected, minimal keystrokes)
 *
 * All times are in milliseconds.
 */

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface ClickEvent {
  timestamp: number;
  x?: number;
  y?: number;
  target?: string;
}

export interface KeyEvent {
  timestamp: number;
  key?: string;
}

export interface ItemClickstream {
  itemId: string;
  /** Wall-clock time first presented (ms since epoch or session start) */
  presentedAt: number;
  /** Wall-clock time response was submitted */
  submittedAt: number;
  clicks: ClickEvent[];
  keystrokes: KeyEvent[];
  /** Focus-loss intervals (tab-switch, window blur, etc.) */
  focusLossIntervals: Array<{ start: number; end: number }>;
  /** Scroll events (count only) */
  scrollCount: number;
  /** Audio playback count (listening items) */
  audioPlayCount?: number;
}

export interface ItemFeatures {
  itemId: string;
  /** Total response time in ms */
  responseTime: number;
  /** Active engagement time (total − idle − focus-loss) */
  activeTime: number;
  /** Total idle duration (ms) — gaps > IDLE_THRESHOLD between events */
  idleTime: number;
  /** Total focus-loss duration (ms) */
  focusLossTime: number;
  /** Number of keystrokes */
  keystrokeCount: number;
  /** Number of clicks */
  clickCount: number;
  /** Number of answer-changes (click on option after initial selection) */
  answerChanges: number;
  /** Scroll events */
  scrollCount: number;
  /** Audio playback count */
  audioPlayCount: number;
  /** Normalised response speed: responseTime / EXPECTED_TIME_MS */
  normalisedSpeed: number;
}

export type HmmState = "engaged" | "hesitant" | "rapid_guess";

export interface HmmStateEstimate {
  itemId: string;
  /** Most likely hidden state (Viterbi decode) */
  state: HmmState;
  /** Posterior probabilities [engaged, hesitant, rapid_guess] */
  probabilities: [number, number, number];
}

export interface SessionBehaviourProfile {
  /** Total items analysed */
  itemCount: number;
  /** Mean response time across items (ms) */
  meanResponseTime: number;
  /** Coefficient of variation of response times */
  cvResponseTime: number;
  /** Proportion of items in each HMM state */
  stateProportions: Record<HmmState, number>;
  /** Proportion of time spent with focus lost */
  focusLossProportion: number;
  /** Proportion of items where answer was changed ≥1 time */
  revisionRate: number;
  /** Rapid-guess item count (normalisedSpeed < RAPID_GUESS_SPEED_THRESHOLD) */
  rapidGuessCount: number;
  /** Overall low-effort flag */
  lowEffortFlag: boolean;
  /** Risk level */
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  /** Detailed per-item features */
  itemFeatures: ItemFeatures[];
  /** HMM state sequence */
  hmmSequence: HmmStateEstimate[];
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** Gap (ms) between consecutive events that counts as "idle". */
const IDLE_THRESHOLD_MS = 5_000;

/** Expected time (ms) per item for normalisation (≈90s / item average). */
const EXPECTED_TIME_MS = 90_000;

/**
 * normalisedSpeed < this → rapid guessing (e.g., < 10% of expected time = 9s).
 * Literature threshold: ≤ 3 s for MC items (Wise & Kong 2005); we use 10% of expected.
 */
const RAPID_GUESS_SPEED_THRESHOLD = 0.10;

/** Proportion of rapid-guess items needed to flag low effort at session level. */
const LOW_EFFORT_RAPID_THRESHOLD = 0.25;

/** Focus-loss proportion needed to flag a session. */
const LOW_EFFORT_FOCUS_LOSS_THRESHOLD = 0.15;

// ────────────────────────────────────────────────────────────────────────────
// Feature extraction
// ────────────────────────────────────────────────────────────────────────────

/**
 * Estimate idle time from a sorted sequence of event timestamps.
 * Any gap > IDLE_THRESHOLD_MS counts as idle (subtract threshold as "brief pause").
 */
function computeIdleTime(
  timestamps: number[],
  windowStart: number,
  windowEnd: number,
): number {
  if (timestamps.length < 2) return windowEnd - windowStart;
  const sorted = [...timestamps].sort((a, b) => a - b);
  let idle = 0;
  // Gap before first event
  if (sorted[0]! - windowStart > IDLE_THRESHOLD_MS) {
    idle += sorted[0]! - windowStart - IDLE_THRESHOLD_MS;
  }
  // Gaps between consecutive events
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i]! - sorted[i - 1]!;
    if (gap > IDLE_THRESHOLD_MS) idle += gap - IDLE_THRESHOLD_MS;
  }
  // Gap after last event
  if (windowEnd - sorted[sorted.length - 1]! > IDLE_THRESHOLD_MS) {
    idle += windowEnd - sorted[sorted.length - 1]! - IDLE_THRESHOLD_MS;
  }
  return Math.max(0, idle);
}

/**
 * Detect answer-change events: clicking on an answer target more than once
 * implies the examinee reconsidered. We count unique target → subsequent click pairs.
 */
function countAnswerChanges(clicks: ClickEvent[]): number {
  if (clicks.length < 2) return 0;
  const targets = clicks.map((c) => c.target ?? "").filter(Boolean);
  let changes = 0;
  let lastSeen: string | null = null;
  for (const t of targets) {
    if (lastSeen !== null && t !== lastSeen) changes++;
    lastSeen = t;
  }
  return changes;
}

/**
 * Extract ItemFeatures from raw clickstream for a single item.
 */
export function extractItemFeatures(item: ItemClickstream): ItemFeatures {
  const responseTime = Math.max(0, item.submittedAt - item.presentedAt);

  const focusLossTime = item.focusLossIntervals.reduce(
    (s, iv) => s + Math.max(0, iv.end - iv.start),
    0,
  );

  // All event timestamps merged for idle estimation
  const allTimestamps = [
    ...item.clicks.map((c) => c.timestamp),
    ...item.keystrokes.map((k) => k.timestamp),
  ].sort((a, b) => a - b);

  const idleTime = computeIdleTime(allTimestamps, item.presentedAt, item.submittedAt);
  const activeTime = Math.max(0, responseTime - idleTime - focusLossTime);
  const normalisedSpeed = EXPECTED_TIME_MS > 0 ? responseTime / EXPECTED_TIME_MS : 1;

  return {
    itemId: item.itemId,
    responseTime,
    activeTime,
    idleTime,
    focusLossTime,
    keystrokeCount: item.keystrokes.length,
    clickCount: item.clicks.length,
    answerChanges: countAnswerChanges(item.clicks),
    scrollCount: item.scrollCount,
    audioPlayCount: item.audioPlayCount ?? 0,
    normalisedSpeed,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Hidden Markov Model — 3-state Viterbi decoder
// ────────────────────────────────────────────────────────────────────────────

/**
 * HMM parameters (fixed / estimated from prior data):
 *
 *   States: 0=engaged, 1=hesitant, 2=rapid_guess
 *
 *   Transition matrix A[from][to]:
 *     Engaged   → [0.80, 0.10, 0.10]
 *     Hesitant  → [0.30, 0.60, 0.10]
 *     RapidGues → [0.20, 0.05, 0.75]
 *
 *   Initial distribution π: [0.70, 0.20, 0.10]
 *
 *   Emission B(state, feature) = P(observation | state)
 *   Observation = normalisedSpeed binned into: slow(<0.5), normal(0.5–2.0), fast(>2.0)
 *   Combined with keystroke activity: low (<3), medium (3–15), high (>15)
 *   For simplicity: 9-bin joint emission coded 0–8.
 */

const HMM_INITIAL: [number, number, number] = [0.70, 0.20, 0.10];

// Row = from-state, Col = to-state
const HMM_TRANSITION: [[number, number, number], [number, number, number], [number, number, number]] = [
  [0.80, 0.10, 0.10], // from engaged
  [0.30, 0.60, 0.10], // from hesitant
  [0.20, 0.05, 0.75], // from rapid_guess
];

type ObsBin = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Encode observation into a 9-bin index.
 * Axes:
 *   speed  = [slow, normal, fast]     → 0,1,2
 *   keyact = [low,  medium, high]     → 0,1,2
 *
 *  bin = speed * 3 + keyact
 */
function encodeObservation(features: ItemFeatures): ObsBin {
  const speed = features.normalisedSpeed;
  const keys  = features.keystrokeCount;

  // normalisedSpeed < 0.5  → very fast response (rapid guessing)
  // normalisedSpeed 0.5–2.0 → normal deliberation
  // normalisedSpeed > 2.0   → slow / hesitant
  const speedBin = speed < 0.5 ? 2 : speed <= 2.0 ? 1 : 0;
  const keyBin   = keys  < 3  ? 0 : keys  <= 15   ? 1 : 2;

  return (speedBin * 3 + keyBin) as ObsBin;
}

/**
 * Emission probability table B[state][bin].
 *
 * Bin layout: obs = speedBin * 3 + keyBin
 *   speedBin: 0 = slow  (RT > 2× expected → deliberate)
 *             1 = normal (0.5×–2× expected)
 *             2 = fast   (RT < 0.5× expected → rapid guess)
 *   keyBin:   0 = low (<3), 1 = medium (3–15), 2 = high (>15)
 *
 * Bin indices:  slow-low slow-med slow-hi  norm-low norm-med norm-hi fast-low fast-med fast-hi
 * Semantic:     hesitant-leaning             engaged-leaning          rapid-guess-leaning
 */
const HMM_EMISSION: [[number, number, number, number, number, number, number, number, number], // engaged
                      [number, number, number, number, number, number, number, number, number], // hesitant
                      [number, number, number, number, number, number, number, number, number]  // rapid_guess
                    ] = [
  // engaged:     slow-low slow-med slow-hi  norm-low norm-med norm-hi fast-low fast-med fast-hi
  [              0.02,    0.04,    0.05,    0.10,    0.28,    0.22,    0.10,    0.12,    0.07 ],
  // hesitant:
  [              0.18,    0.22,    0.18,    0.14,    0.12,    0.08,    0.03,    0.03,    0.02 ],
  // rapid_guess:
  [              0.02,    0.01,    0.01,    0.05,    0.04,    0.03,    0.44,    0.26,    0.14 ],
];

const STATE_NAMES: HmmState[] = ["engaged", "hesitant", "rapid_guess"];
const N_STATES = 3;

/**
 * Viterbi decoding: returns the most-likely state sequence and posteriors.
 * Uses log-probabilities to avoid underflow.
 */
export function viterbiDecode(featureSequence: ItemFeatures[]): HmmStateEstimate[] {
  const T = featureSequence.length;
  if (T === 0) return [];

  const obs = featureSequence.map(encodeObservation);

  // delta[t][s] = log P(best path to state s at time t)
  const delta: number[][] = Array.from({ length: T }, () => new Array<number>(N_STATES).fill(-Infinity));
  // psi[t][s] = predecessor state on best path
  const psi: number[][] = Array.from({ length: T }, () => new Array<number>(N_STATES).fill(0));

  // Initialise
  for (let s = 0; s < N_STATES; s++) {
    const emitProb = HMM_EMISSION[s]![obs[0]!]!;
    delta[0]![s] = Math.log(HMM_INITIAL[s]! * emitProb + 1e-300);
  }

  // Recursion
  for (let t = 1; t < T; t++) {
    for (let s = 0; s < N_STATES; s++) {
      const emitLogProb = Math.log(HMM_EMISSION[s]![obs[t]!]! + 1e-300);
      let best = -Infinity;
      let bestPrev = 0;
      for (let r = 0; r < N_STATES; r++) {
        const score = delta[t - 1]![r]! + Math.log(HMM_TRANSITION[r]![s]! + 1e-300);
        if (score > best) { best = score; bestPrev = r; }
      }
      delta[t]![s] = best + emitLogProb;
      psi[t]![s] = bestPrev;
    }
  }

  // Back-trace
  const path = new Array<number>(T);
  let last = 0;
  let bestFinal = -Infinity;
  for (let s = 0; s < N_STATES; s++) {
    if (delta[T - 1]![s]! > bestFinal) { bestFinal = delta[T - 1]![s]!; last = s; }
  }
  path[T - 1] = last;
  for (let t = T - 2; t >= 0; t--) {
    path[t] = psi[t + 1]![path[t + 1]!]!;
  }

  // Posterior probabilities via forward algorithm (approximate: normalise delta row)
  return featureSequence.map((feat, t) => {
    const logProbs = delta[t]!;
    const maxLP = Math.max(...logProbs);
    const exps = logProbs.map((lp) => Math.exp(lp - maxLP));
    const sumExp = exps.reduce((s, v) => s + v, 0);
    const probs = exps.map((e) => e / sumExp) as [number, number, number];
    return {
      itemId: feat.itemId,
      state: STATE_NAMES[path[t]!]!,
      probabilities: probs,
    };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Session-level aggregation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compute full session behaviour profile from raw item clickstreams.
 */
export function analyseSession(
  items: ItemClickstream[],
): SessionBehaviourProfile {
  const n = items.length;
  if (n === 0) {
    return {
      itemCount: 0,
      meanResponseTime: 0,
      cvResponseTime: 0,
      stateProportions: { engaged: 0, hesitant: 0, rapid_guess: 0 },
      focusLossProportion: 0,
      revisionRate: 0,
      rapidGuessCount: 0,
      lowEffortFlag: false,
      riskLevel: "LOW",
      itemFeatures: [],
      hmmSequence: [],
    };
  }

  const features = items.map(extractItemFeatures);
  const hmmSequence = viterbiDecode(features);

  // Aggregate stats
  const times = features.map((f) => f.responseTime);
  const meanRT = times.reduce((s, v) => s + v, 0) / n;
  const varRT = times.reduce((s, v) => s + (v - meanRT) ** 2, 0) / n;
  const sdRT = Math.sqrt(varRT);
  const cvRT = meanRT > 0 ? sdRT / meanRT : 0;

  const totalDuration = times.reduce((s, v) => s + v, 0) || 1;
  const totalFocusLoss = features.reduce((s, f) => s + f.focusLossTime, 0);
  const focusLossProportion = totalFocusLoss / totalDuration;

  const revisionCount = features.filter((f) => f.answerChanges > 0).length;
  const revisionRate = revisionCount / n;

  const rapidGuessCount = features.filter(
    (f) => f.normalisedSpeed < RAPID_GUESS_SPEED_THRESHOLD,
  ).length;

  const stateCounts: Record<HmmState, number> = { engaged: 0, hesitant: 0, rapid_guess: 0 };
  for (const h of hmmSequence) stateCounts[h.state]++;
  const stateProportions: Record<HmmState, number> = {
    engaged: stateCounts.engaged / n,
    hesitant: stateCounts.hesitant / n,
    rapid_guess: stateCounts.rapid_guess / n,
  };

  const rapidProportion = rapidGuessCount / n;
  const lowEffortFlag =
    rapidProportion >= LOW_EFFORT_RAPID_THRESHOLD ||
    focusLossProportion >= LOW_EFFORT_FOCUS_LOSS_THRESHOLD;

  const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
    rapidProportion >= 0.50 || focusLossProportion >= 0.30
      ? "HIGH"
      : lowEffortFlag
      ? "MEDIUM"
      : "LOW";

  return {
    itemCount: n,
    meanResponseTime: parseFloat(meanRT.toFixed(2)),
    cvResponseTime: parseFloat(cvRT.toFixed(4)),
    stateProportions,
    focusLossProportion: parseFloat(focusLossProportion.toFixed(4)),
    revisionRate: parseFloat(revisionRate.toFixed(4)),
    rapidGuessCount,
    lowEffortFlag,
    riskLevel,
    itemFeatures: features,
    hmmSequence,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: construct ItemClickstream from server-side log data
// ────────────────────────────────────────────────────────────────────────────

export interface RawEventLog {
  type: "click" | "keydown" | "focus_loss" | "focus_gain" | "scroll" | "audio_play";
  timestamp: number;
  x?: number;
  y?: number;
  target?: string;
  key?: string;
}

/**
 * Parse raw event log array (as stored in session metadata) into ItemClickstream.
 */
export function parseEventLog(
  itemId: string,
  presentedAt: number,
  submittedAt: number,
  events: RawEventLog[],
  audioPlayCount = 0,
): ItemClickstream {
  const clicks: ClickEvent[] = [];
  const keystrokes: KeyEvent[] = [];
  const focusLossIntervals: Array<{ start: number; end: number }> = [];
  let scrollCount = 0;
  let lastFocusLoss: number | null = null;

  for (const e of events) {
    switch (e.type) {
      case "click":
        clicks.push({ timestamp: e.timestamp, x: e.x, y: e.y, target: e.target });
        break;
      case "keydown":
        keystrokes.push({ timestamp: e.timestamp, key: e.key });
        break;
      case "focus_loss":
        lastFocusLoss = e.timestamp;
        break;
      case "focus_gain":
        if (lastFocusLoss !== null) {
          focusLossIntervals.push({ start: lastFocusLoss, end: e.timestamp });
          lastFocusLoss = null;
        }
        break;
      case "scroll":
        scrollCount++;
        break;
      default:
        break;
    }
  }
  // If focus was lost and never regained, close interval at submission
  if (lastFocusLoss !== null) {
    focusLossIntervals.push({ start: lastFocusLoss, end: submittedAt });
  }

  return {
    itemId,
    presentedAt,
    submittedAt,
    clicks,
    keystrokes,
    focusLossIntervals,
    scrollCount,
    audioPlayCount,
  };
}
