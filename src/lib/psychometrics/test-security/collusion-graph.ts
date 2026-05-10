/**
 * Collusion Graph — Multi-Examinee Cheating Detection
 *
 * Detects clusters of examinees who may have shared answers via three
 * independent signals:
 *
 *   1. IP proximity  — same or adjacent (subnet/VPN) IP addresses
 *   2. Response-time correlation — unusually similar RT profiles
 *      (Belov & Armstrong 2010; Van der Linden & Guo 2008)
 *   3. Response-pattern overlap — pairwise g2 / ω across all pairs in a
 *      session cohort, then community detection on the resulting graph
 *
 * The output is a list of flagged pairs and clusters. Downstream systems
 * (admin panel) can then trigger manual review.
 *
 * References
 * ──────────
 * Belov, D.I. & Armstrong, R.D. (2010). Automatic detection of answer
 *   copying via Kullback-Leibler divergence and K-index.
 *   Applied Psychological Measurement, 34(6), 379-392.
 *
 * Wollack, J.A. & Fremer, J.J. (2013). Handbook of Test Security.
 *   Routledge, ch. 7 (Collusion Networks).
 */

import { detectAnswerCopying, ExamineeResponses, ItemMeta, CopyingResult } from "./answer-copying.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExamineeProfile {
  examineeId: string;
  /** IP address (IPv4 or IPv6). */
  ipAddress?: string;
  /** Ability estimate from operational items. */
  theta: number;
  /** Response vector. */
  responses: ExamineeResponses[];
  /** Response times in ms per item, keyed by itemId. */
  responseTimes?: Record<string, number>;
}

export interface PairResult {
  examineeA: string;
  examineeB: string;
  copying: CopyingResult;
  /** IP signal: 'SAME' | 'SAME_SUBNET' | 'DIFFERENT'. */
  ipSignal: "SAME" | "SAME_SUBNET" | "DIFFERENT";
  /** RT correlation (Pearson) on shared items, or null if insufficient. */
  rtCorrelation: number | null;
  /** Combined flag: copying flagged OR (IP=SAME AND rtCorr > threshold). */
  combinedFlag: boolean;
}

export interface CollusionCluster {
  /** IDs of examinees in this cluster. */
  members: string[];
  /** All flagged pairs within the cluster. */
  flaggedPairs: PairResult[];
  /** Risk level based on cluster size and flag density. */
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface CollusionReport {
  flaggedPairs: PairResult[];
  clusters: CollusionCluster[];
  totalExaminees: number;
  totalPairsAnalyzed: number;
  flagRate: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const RT_CORR_THRESHOLD = 0.90;    // suspiciously similar timing
const MIN_SHARED_ITEMS  = 10;      // minimum items to run pair analysis
const MIN_RT_PAIRS      = 8;       // minimum shared RT observations

// ─── IP Helpers ───────────────────────────────────────────────────────────────

function ipSignal(
  ipA?: string,
  ipB?: string
): "SAME" | "SAME_SUBNET" | "DIFFERENT" {
  if (!ipA || !ipB) return "DIFFERENT";
  if (ipA === ipB) return "SAME";

  // IPv4: compare /24 subnet (first three octets)
  const partsA = ipA.split(".");
  const partsB = ipB.split(".");
  if (partsA.length === 4 && partsB.length === 4) {
    if (partsA[0] === partsB[0] && partsA[1] === partsB[1] && partsA[2] === partsB[2]) {
      return "SAME_SUBNET";
    }
  }

  // IPv6: compare /48 prefix (first 3 groups)
  const groupsA = ipA.split(":");
  const groupsB = ipB.split(":");
  if (groupsA.length >= 3 && groupsB.length >= 3) {
    if (groupsA[0] === groupsB[0] && groupsA[1] === groupsB[1] && groupsA[2] === groupsB[2]) {
      return "SAME_SUBNET";
    }
  }

  return "DIFFERENT";
}

// ─── RT correlation ───────────────────────────────────────────────────────────

function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length < MIN_RT_PAIRS) return null;
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den < 1e-9 ? null : num / den;
}

function rtCorrelation(
  a: ExamineeProfile,
  b: ExamineeProfile
): number | null {
  if (!a.responseTimes || !b.responseTimes) return null;
  const sharedItems = Object.keys(a.responseTimes).filter(id => id in b.responseTimes!);
  if (sharedItems.length < MIN_RT_PAIRS) return null;
  const xs = sharedItems.map(id => a.responseTimes![id]);
  const ys = sharedItems.map(id => b.responseTimes![id]);
  return pearsonCorrelation(xs, ys);
}

// ─── Pair analysis ────────────────────────────────────────────────────────────

function analyzePair(
  a: ExamineeProfile,
  b: ExamineeProfile,
  items: ItemMeta[]
): PairResult | null {
  const sharedItems = items.filter(it => {
    const ra = a.responses.find(r => r.itemId === it.itemId);
    const rb = b.responses.find(r => r.itemId === it.itemId);
    return ra !== undefined && rb !== undefined;
  });

  if (sharedItems.length < MIN_SHARED_ITEMS) return null;

  // Run copying detection in both directions, take the more flagged direction
  const abResult = detectAnswerCopying(
    a.responses, b.responses, a.theta, b.theta, sharedItems
  );
  const baResult = detectAnswerCopying(
    b.responses, a.responses, b.theta, a.theta, sharedItems
  );

  // Choose the direction with higher ω (more evidence of copying)
  const copying = abResult.omega >= baResult.omega ? abResult : baResult;

  const ip = ipSignal(a.ipAddress, b.ipAddress);
  const rtCorr = rtCorrelation(a, b);

  const combinedFlag =
    copying.flagged ||
    (ip === "SAME" && rtCorr !== null && rtCorr > RT_CORR_THRESHOLD);

  return {
    examineeA: a.examineeId,
    examineeB: b.examineeId,
    copying,
    ipSignal: ip,
    rtCorrelation: rtCorr !== null ? Number(rtCorr.toFixed(4)) : null,
    combinedFlag,
  };
}

// ─── Community detection (Union-Find) ─────────────────────────────────────────

class UnionFind {
  private parent: Map<string, string> = new Map();

  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    const p = this.parent.get(x)!;
    if (p !== x) this.parent.set(x, this.find(p));
    return this.parent.get(x)!;
  }

  union(x: string, y: string): void {
    const px = this.find(x);
    const py = this.find(y);
    if (px !== py) this.parent.set(px, py);
  }
}

function buildClusters(
  examinees: ExamineeProfile[],
  flaggedPairs: PairResult[]
): CollusionCluster[] {
  const uf = new UnionFind();
  for (const e of examinees) uf.find(e.examineeId); // initialise
  for (const pair of flaggedPairs) {
    if (pair.combinedFlag) {
      uf.union(pair.examineeA, pair.examineeB);
    }
  }

  const clusterMap = new Map<string, string[]>();
  for (const e of examinees) {
    const root = uf.find(e.examineeId);
    if (!clusterMap.has(root)) clusterMap.set(root, []);
    clusterMap.get(root)!.push(e.examineeId);
  }

  const clusters: CollusionCluster[] = [];
  for (const [, members] of clusterMap) {
    if (members.length < 2) continue; // singleton → not a cluster

    const clusterPairs = flaggedPairs.filter(
      p => members.includes(p.examineeA) && members.includes(p.examineeB)
    );

    const totalPossiblePairs = (members.length * (members.length - 1)) / 2;
    const flagDensity = clusterPairs.filter(p => p.combinedFlag).length / totalPossiblePairs;

    const riskLevel: CollusionCluster["riskLevel"] =
      flagDensity >= 0.75 ? "HIGH" : flagDensity >= 0.40 ? "MEDIUM" : "LOW";

    clusters.push({ members, flaggedPairs: clusterPairs, riskLevel });
  }

  return clusters.sort((a, b) => b.members.length - a.members.length);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyse a cohort of examinees from the same session window for collusion.
 *
 * Runs pairwise copying detection across all N*(N-1)/2 pairs.
 * For large cohorts (N > 200) consider sampling or batching externally.
 *
 * @param examinees  Array of examinee profiles (responses + metadata)
 * @param items      Item parameter metadata for all shared items
 * @returns          CollusionReport with flagged pairs and clusters
 */
export function analyseCollusion(
  examinees: ExamineeProfile[],
  items: ItemMeta[]
): CollusionReport {
  const flaggedPairs: PairResult[] = [];
  let totalPairs = 0;

  for (let i = 0; i < examinees.length; i++) {
    for (let j = i + 1; j < examinees.length; j++) {
      totalPairs++;
      const result = analyzePair(examinees[i], examinees[j], items);
      if (result) flaggedPairs.push(result);
    }
  }

  const trulFlagged = flaggedPairs.filter(p => p.combinedFlag);
  const clusters = buildClusters(examinees, flaggedPairs);

  return {
    flaggedPairs: trulFlagged,
    clusters,
    totalExaminees: examinees.length,
    totalPairsAnalyzed: totalPairs,
    flagRate: totalPairs > 0 ? Number((trulFlagged.length / totalPairs).toFixed(4)) : 0,
  };
}
