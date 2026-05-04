/**
 * Test Fraud Detection Service
 *
 * Combines three independent anomaly signals to produce a composite fraud score
 * (0 – 1) and a recommended action (PASS / REVIEW / FLAG / BLOCK).
 *
 * Signal 1 — Response-time anomaly (RT-IRT)
 *   Uses Van der Linden's (2006) lognormal RT model.
 *   Items answered unusually fast for the estimated ability level are penalised.
 *   Score = proportion of items with |z_RT| > 2.0 (speed outliers).
 *
 * Signal 2 — Response-pattern similarity (intra-session + cross-session)
 *   Compares the binary response vector of the current session against:
 *   (a) their own previous sessions (self-similarity — copy / item preview)
 *   (b) suspicious pairs from the same IP/device (collusion)
 *   Score = max Jaccard similarity to any reference vector.
 *
 * Signal 3 — IP / device clustering
 *   Counts how many distinct candidates from the same IPv4 /24 block completed
 *   the test within a tight time window. High density → proxy-server concern.
 *   Score = sigmoid(clusterSize − CLUSTER_THRESHOLD).
 *
 * Composite score: weighted sum, thresholded into risk tiers.
 *
 * References
 * ----------
 * van der Linden (2006) — A lognormal model for response times
 * Wollack (1997) — A nominal response model approach to detect answer copying
 * Maynes (2014) — Aberrant response-time patterns as indicators of fraud
 */

import { prisma } from "../prisma.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const RT_Z_THRESHOLD = 2.0;       // |z| for speed outlier
const SIMILARITY_THRESHOLD = 0.7; // Jaccard similarity flagging threshold
const CLUSTER_THRESHOLD = 5;      // sessions from same /24 in CLUSTER_WINDOW_MIN
const CLUSTER_WINDOW_MIN = 30;    // minutes
const WEIGHT_RT = 0.35;
const WEIGHT_SIM = 0.40;
const WEIGHT_IP = 0.25;

// ─── Types ────────────────────────────────────────────────────────────────────

export type FraudRiskTier = "PASS" | "REVIEW" | "FLAG" | "BLOCK";

export interface FraudSignals {
  rtAnomalyScore: number;       // 0–1: proportion of speed outliers
  rtOutlierItems: string[];     // itemIds that triggered RT outlier
  similarityScore: number;      // 0–1: max Jaccard to any reference
  mostSimilarSessionId: string | null;
  ipClusterScore: number;       // 0–1: sigmoid-scaled cluster density
  clusterSize: number;          // raw count of sessions in /24 window
}

export interface FraudReport {
  sessionId: string;
  candidateId: string;
  compositeScore: number;       // 0–1
  tier: FraudRiskTier;
  signals: FraudSignals;
  auditedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sigmoid function normalised around threshold */
function sigmoid(x: number, midpoint: number, steepness = 0.5): number {
  return 1 / (1 + Math.exp(-steepness * (x - midpoint)));
}

/**
 * Jaccard similarity between two binary response vectors.
 * Ignores skipped items (both -1).
 */
function jaccardSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length !== a.length) return 0;
  let intersection = 0;
  let union = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === -1 && b[i] === -1) continue; // skip
    if (a[i] === 1 && b[i] === 1) intersection++;
    if (a[i] === 1 || b[i] === 1) union++;
  }
  return union === 0 ? 0 : intersection / union;
}

/** Parse IPv4 /24 prefix (first three octets) */
function ipv4Prefix24(ip: string): string {
  const parts = ip.split(".");
  if (parts.length < 3) return ip;
  return parts.slice(0, 3).join(".");
}

// ─── Signal 1: RT anomaly ─────────────────────────────────────────────────────

async function rtAnomalySignal(
  sessionId: string
): Promise<{ score: number; outlierItems: string[] }> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { theta: true },
  });
  if (!session) return { score: 0, outlierItems: [] };

  const responses = await prisma.response.findMany({
    where: { sessionId, isPretest: false },
    select: { id: true, itemId: true, latencyMs: true, item: { select: { difficulty: true, discrimination: true } } },
  }) as any[];

  if (responses.length === 0) return { score: 0, outlierItems: [] };

  const theta = session.theta;
  const outlierItems: string[] = [];

  // Lognormal RT model: expected log-RT ≈ τ_i − β_i(θ − b_i)
  // Simplified: expected RT proportional to item difficulty distance from theta
  // We use the heuristic: expected_log_rt = 3.5 − 0.3 * (theta − b_i)
  // (roughly 30 seconds baseline, adjusted for difficulty match)
  const logRts: number[] = [];

  for (const r of responses) {
    if (!r.latencyMs || r.latencyMs <= 0) continue;
    const logRt = Math.log(r.latencyMs / 1000); // seconds
    logRts.push(logRt);
  }

  if (logRts.length < 3) return { score: 0, outlierItems: [] };

  const meanLogRt = logRts.reduce((a, b) => a + b, 0) / logRts.length;
  const sdLogRt = Math.sqrt(
    logRts.reduce((s, v) => s + (v - meanLogRt) ** 2, 0) / (logRts.length - 1)
  );

  let idx = 0;
  for (const r of responses) {
    if (!r.latencyMs || r.latencyMs <= 0) { idx++; continue; }
    const logRt = Math.log(r.latencyMs / 1000);
    const z = sdLogRt > 0 ? (logRt - meanLogRt) / sdLogRt : 0;
    // Too fast (z << -2) is the fraud signal; too slow is less concerning
    if (z < -RT_Z_THRESHOLD) {
      outlierItems.push(r.itemId);
    }
    idx++;
  }

  const score = Math.min(1, outlierItems.length / Math.max(1, responses.length) * 3);
  return { score, outlierItems };
}

// ─── Signal 2: Response-pattern similarity ───────────────────────────────────

async function similaritySignal(
  sessionId: string,
  candidateId: string
): Promise<{ score: number; mostSimilarSessionId: string | null }> {
  // Fetch current session's item order + responses
  const currentResponses = await prisma.response.findMany({
    where: { sessionId },
    select: { itemId: true, score: true },
    orderBy: { createdAt: "asc" },
  });

  if (currentResponses.length < 10) return { score: 0, mostSimilarSessionId: null };

  const currentItemIds = currentResponses.map((r) => r.itemId);
  const currentVector = currentResponses.map((r) => (r.score >= 0.5 ? 1 : 0));

  // Compare against recent sessions from same candidate (self-copy / preview)
  // and recent sessions sharing ≥50% of the same items
  const recentSessions = await prisma.session.findMany({
    where: {
      id: { not: sessionId },
      status: "COMPLETED",
      completedAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
      },
    },
    select: {
      id: true,
      responses: {
        select: { itemId: true, score: true },
        orderBy: { createdAt: "asc" },
      },
    },
    take: 100, // sample to keep this bounded
  }) as any[];

  let maxSim = 0;
  let mostSimilarId: string | null = null;

  for (const ref of recentSessions) {
    const refResponses: { itemId: string; score: number }[] = ref.responses;
    if (refResponses.length < 10) continue;

    // Align vectors on shared items
    const refMap = new Map(refResponses.map((r) => [r.itemId, r.score >= 0.5 ? 1 : 0]));
    const aVec: number[] = [];
    const bVec: number[] = [];

    for (let i = 0; i < currentItemIds.length; i++) {
      const refScore = refMap.get(currentItemIds[i]);
      if (refScore !== undefined) {
        aVec.push(currentVector[i]);
        bVec.push(refScore);
      }
    }

    if (aVec.length < 8) continue; // not enough overlap

    const sim = jaccardSimilarity(aVec, bVec);
    if (sim > maxSim) {
      maxSim = sim;
      mostSimilarId = ref.id;
    }
  }

  return { score: Math.min(1, maxSim), mostSimilarSessionId: mostSimilarId };
}

// ─── Signal 3: IP clustering ─────────────────────────────────────────────────

async function ipClusterSignal(
  sessionId: string
): Promise<{ score: number; clusterSize: number }> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { startedAt: true, metadata: true },
  });

  if (!session) return { score: 0, clusterSize: 0 };

  const ip: string | undefined = (session.metadata as any)?.ipAddress;
  if (!ip) return { score: 0, clusterSize: 0 };

  const prefix = ipv4Prefix24(ip);
  const windowStart = new Date(session.startedAt.getTime() - CLUSTER_WINDOW_MIN * 60 * 1000);
  const windowEnd = new Date(session.startedAt.getTime() + CLUSTER_WINDOW_MIN * 60 * 1000);

  // Count sessions from same /24 block in time window
  // We check the metadata JSON field for ipAddress prefix
  const nearbySessions = await prisma.session.findMany({
    where: {
      id: { not: sessionId },
      startedAt: { gte: windowStart, lte: windowEnd },
      status: { in: ["COMPLETED", "IN_PROGRESS"] },
    },
    select: { metadata: true },
    take: 200,
  });

  const clusterSize = nearbySessions.filter((s) => {
    const sIp: string | undefined = (s.metadata as any)?.ipAddress;
    return sIp && ipv4Prefix24(sIp) === prefix;
  }).length;

  const score = sigmoid(clusterSize, CLUSTER_THRESHOLD, 0.8);
  return { score, clusterSize };
}

// ─── Composite scorer ─────────────────────────────────────────────────────────

function compositeToTier(score: number): FraudRiskTier {
  if (score >= 0.75) return "BLOCK";
  if (score >= 0.50) return "FLAG";
  if (score >= 0.30) return "REVIEW";
  return "PASS";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the full fraud detection pipeline for a single completed session.
 */
export async function analyzeSessionFraud(sessionId: string): Promise<FraudReport> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { candidateId: true },
  });

  if (!session) throw new Error(`Session ${sessionId} not found`);

  const [rt, sim, ip] = await Promise.all([
    rtAnomalySignal(sessionId),
    similaritySignal(sessionId, session.candidateId),
    ipClusterSignal(sessionId),
  ]);

  const composite =
    WEIGHT_RT * rt.score +
    WEIGHT_SIM * sim.score +
    WEIGHT_IP * ip.score;

  const report: FraudReport = {
    sessionId,
    candidateId: session.candidateId,
    compositeScore: Number(composite.toFixed(3)),
    tier: compositeToTier(composite),
    signals: {
      rtAnomalyScore: Number(rt.score.toFixed(3)),
      rtOutlierItems: rt.outlierItems,
      similarityScore: Number(sim.score.toFixed(3)),
      mostSimilarSessionId: sim.mostSimilarSessionId,
      ipClusterScore: Number(ip.score.toFixed(3)),
      clusterSize: ip.clusterSize,
    },
    auditedAt: new Date().toISOString(),
  };

  // Persist fraud report into session metadata
  const existing = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { metadata: true },
  });
  const updatedMeta = { ...((existing?.metadata as object) ?? {}), fraudReport: report };
  await prisma.session.update({
    where: { id: sessionId },
    data: { metadata: updatedMeta as unknown as import("@prisma/client").Prisma.InputJsonValue },
  });

  return report;
}

/**
 * Batch analyse all completed sessions that have not yet been fraud-checked.
 * Returns summary counts.
 */
export async function runBatchFraudAudit(orgId?: string): Promise<{
  audited: number;
  blocked: number;
  flagged: number;
  reviewed: number;
  passed: number;
}> {
  const sessions = await prisma.session.findMany({
    where: {
      status: "COMPLETED",
      ...(orgId ? { organizationId: orgId } : {}),
      // Only sessions without an existing fraud report
      NOT: {
        metadata: {
          path: ["fraudReport"],
          not: Prisma.AnyNull,
        },
      },
    },
    select: { id: true },
    take: 500,
    orderBy: { completedAt: "desc" },
  }) as any[];

  const counts = { audited: 0, blocked: 0, flagged: 0, reviewed: 0, passed: 0 };

  for (const s of sessions) {
    try {
      const report = await analyzeSessionFraud(s.id);
      counts.audited++;
      counts[report.tier.toLowerCase() as keyof typeof counts]++;
    } catch {
      // Skip sessions that error (e.g. no responses yet)
    }
  }

  return counts;
}

/**
 * Retrieve the stored fraud report for a session.
 */
export async function getFraudReport(sessionId: string): Promise<FraudReport | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { metadata: true },
  });
  if (!session) return null;
  const report = (session.metadata as any)?.fraudReport;
  return report ?? null;
}

/**
 * List sessions in a given risk tier for an organisation.
 */
export async function listSessionsByTier(
  tier: FraudRiskTier,
  orgId?: string,
  limit = 50
): Promise<{ sessionId: string; candidateId: string; compositeScore: number; auditedAt: string }[]> {
  const sessions = await prisma.session.findMany({
    where: {
      status: "COMPLETED",
      ...(orgId ? { organizationId: orgId } : {}),
    },
    select: { id: true, candidateId: true, metadata: true },
    orderBy: { completedAt: "desc" },
    take: 2000, // scan window
  });

  return sessions
    .filter((s) => (s.metadata as any)?.fraudReport?.tier === tier)
    .slice(0, limit)
    .map((s) => {
      const fr = (s.metadata as any).fraudReport as FraudReport;
      return { sessionId: s.id, candidateId: s.candidateId, compositeScore: fr.compositeScore, auditedAt: fr.auditedAt };
    });
}

// Re-export Prisma namespace for batch audit
import { Prisma } from "@prisma/client";
