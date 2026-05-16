/**
 * Scoring SLA Monitor
 *
 * Tracks the latency of AI scoring calls and ensures the platform meets its
 * scoring turnaround commitment: p50 ≤ 30s, p95 ≤ 5 min, p99 ≤ 15 min.
 *
 * Architecture
 * ------------
 * This module maintains an in-process ring buffer of recent scoring latencies.
 * For multi-instance deployments, the same metrics are available via Prometheus
 * (ai_scoring_duration_seconds histogram) — this module is a lightweight
 * companion that provides structured SLA reporting without Prometheus dependency.
 *
 * SLA Tiers
 * ---------
 * TIER_1 (automated MC items): p95 ≤ 2s   (synchronous, inline)
 * TIER_2 (writing/speaking AI): p95 ≤ 5min (async queue)
 * TIER_3 (human fallback):      SLA ≤ 24h  (manual review queue)
 *
 * Integration points
 * ------------------
 * Call `recordScoringLatency()` in ScoringOrchestrator after each scoring call.
 * Call `getSlaReport()` from GET /api/admin/scoring-sla.
 * `checkSlaViolation()` returns true when the SLA is breached — wire to alerting.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoringTier = "TIER_1" | "TIER_2" | "TIER_3";
export type SkillType = "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "GRAMMAR" | "VOCABULARY";

export interface ScoringLatencyRecord {
  taskId: string;
  skill: SkillType;
  tier: ScoringTier;
  latencyMs: number;
  success: boolean;
  recordedAt: number; // Date.now()
}

export interface Percentiles {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

export interface SlaWindow {
  tier: ScoringTier;
  n: number;
  successRate: number;
  percentiles: Percentiles;
  /** true when p95 exceeds the SLA threshold for this tier */
  slaViolated: boolean;
  /** Configured p95 SLA threshold for this tier (ms) */
  slaThresholdMs: number;
}

export interface SlaReport {
  generatedAt: string;
  windowMinutes: number;
  totalRecords: number;
  byTier: Record<ScoringTier, SlaWindow>;
  bySkill: Partial<Record<SkillType, { n: number; p95Ms: number }>>;
  overallHealthy: boolean;
}

// ─── SLA thresholds (ms) ──────────────────────────────────────────────────────

const SLA_P95_THRESHOLD_MS: Record<ScoringTier, number> = {
  TIER_1: 2_000,         //  2 seconds  — inline MC scoring
  TIER_2: 5 * 60_000,   //  5 minutes  — async AI scoring
  TIER_3: 24 * 3600_000, // 24 hours   — human review
};

// ─── In-process ring buffer ───────────────────────────────────────────────────

const RING_BUFFER_CAPACITY = 10_000;
const DEFAULT_WINDOW_MINUTES = 60;

const ringBuffer: ScoringLatencyRecord[] = [];
let bufferHead = 0;
let bufferCount = 0;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a completed scoring latency observation.
 * Thread-safe for single-process Node.js (event loop serialisation).
 */
export function recordScoringLatency(record: ScoringLatencyRecord): void {
  ringBuffer[bufferHead] = record;
  bufferHead = (bufferHead + 1) % RING_BUFFER_CAPACITY;
  bufferCount = Math.min(bufferCount + 1, RING_BUFFER_CAPACITY);
}

/**
 * Retrieve all records from the last `windowMinutes` minutes.
 */
export function getRecentRecords(windowMinutes = DEFAULT_WINDOW_MINUTES): ScoringLatencyRecord[] {
  const cutoff = Date.now() - windowMinutes * 60_000;
  const result: ScoringLatencyRecord[] = [];
  const total = Math.min(bufferCount, RING_BUFFER_CAPACITY);
  for (let i = 0; i < total; i++) {
    const idx = (bufferHead - 1 - i + RING_BUFFER_CAPACITY) % RING_BUFFER_CAPACITY;
    const rec = ringBuffer[idx];
    if (rec && rec.recordedAt >= cutoff) {
      result.push(rec);
    }
  }
  return result;
}

/**
 * Compute percentile statistics from an array of latency values (ms).
 * Returns zeroes for empty arrays.
 */
export function computePercentiles(latencies: number[]): Percentiles {
  if (latencies.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const pct = (p: number) => {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)]!;
  };
  return {
    p50: pct(50),
    p75: pct(75),
    p90: pct(90),
    p95: pct(95),
    p99: pct(99),
    max: sorted[sorted.length - 1]!,
  };
}

/**
 * Check if SLA is currently violated for a given tier in the analysis window.
 */
export function checkSlaViolation(
  tier: ScoringTier,
  windowMinutes = DEFAULT_WINDOW_MINUTES
): { violated: boolean; p95Ms: number; thresholdMs: number } {
  const records = getRecentRecords(windowMinutes).filter(r => r.tier === tier);
  const latencies = records.map(r => r.latencyMs);
  const percentiles = computePercentiles(latencies);
  const thresholdMs = SLA_P95_THRESHOLD_MS[tier];
  return {
    violated: latencies.length > 0 && percentiles.p95 > thresholdMs,
    p95Ms: percentiles.p95,
    thresholdMs,
  };
}

/**
 * Generate a full SLA health report for the last `windowMinutes` minutes.
 */
export function getSlaReport(windowMinutes = DEFAULT_WINDOW_MINUTES): SlaReport {
  const records = getRecentRecords(windowMinutes);

  const byTier: Partial<Record<ScoringTier, SlaWindow>> = {};
  for (const tier of ["TIER_1", "TIER_2", "TIER_3"] as ScoringTier[]) {
    const tierRecords = records.filter(r => r.tier === tier);
    const latencies = tierRecords.map(r => r.latencyMs);
    const percentiles = computePercentiles(latencies);
    const successRate = tierRecords.length > 0
      ? tierRecords.filter(r => r.success).length / tierRecords.length
      : 1;
    const thresholdMs = SLA_P95_THRESHOLD_MS[tier];
    byTier[tier] = {
      tier,
      n: tierRecords.length,
      successRate,
      percentiles,
      slaViolated: latencies.length > 0 && percentiles.p95 > thresholdMs,
      slaThresholdMs: thresholdMs,
    };
  }

  const bySkill: Partial<Record<SkillType, { n: number; p95Ms: number }>> = {};
  for (const skill of ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"] as SkillType[]) {
    const skillRecords = records.filter(r => r.skill === skill);
    if (skillRecords.length > 0) {
      bySkill[skill] = {
        n: skillRecords.length,
        p95Ms: computePercentiles(skillRecords.map(r => r.latencyMs)).p95,
      };
    }
  }

  const overallHealthy = Object.values(byTier).every(w => !w!.slaViolated);

  return {
    generatedAt: new Date().toISOString(),
    windowMinutes,
    totalRecords: records.length,
    byTier: byTier as Record<ScoringTier, SlaWindow>,
    bySkill,
    overallHealthy,
  };
}

/**
 * Reset the ring buffer — used in tests only.
 * @internal
 */
export function _resetSlaMonitorForTests(): void {
  ringBuffer.length = 0;
  ringBuffer.length = RING_BUFFER_CAPACITY;
  bufferHead = 0;
  bufferCount = 0;
}
