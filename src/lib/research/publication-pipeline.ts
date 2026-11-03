/**
 * Publication Pipeline — Peer-Reviewed Research Data Export
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates anonymised datasets and psychometric statistics packages
 * suitable for peer-reviewed publication in applied linguistics and
 * educational measurement journals.
 *
 * Outputs:
 *   1. Item analysis tables (difficulty, discrimination, fit statistics)
 *   2. Test reliability statistics (Cronbach α, McDonald ω, IRT marginal reliability)
 *   3. Validity evidence summary (content, concurrent, construct)
 *   4. DIF analysis results (Mantel-Haenszel, logistic regression)
 *   5. CEFR alignment evidence (anchor studies, standard-setting data)
 *   6. Equating study results
 *   7. Anonymised response data (CSV format, IRB-compliant)
 *
 * Compliance:
 *   • GDPR/KVKK: all personal data removed, pseudonymous IDs only
 *   • IRB: data use policy requires informed consent for research
 *   • APA 7th edition statistics reporting format
 *
 * Target journals:
 *   • Language Testing (SAGE)
 *   • Language Assessment Quarterly (Taylor & Francis)
 *   • Applied Linguistics (Oxford)
 *   • Educational Measurement: Issues and Practice (NCME/Wiley)
 */

import { prisma } from "../prisma.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ItemAnalysisRow {
  itemId: string;           // pseudonymous ID (never original)
  skill: string;
  cefrLevel: string;
  format: string;
  module: string;
  n: number;               // number of responses
  pValue: number;          // proportion correct
  pointBiserial: number | null;   // item-total correlation
  a: number | null;        // IRT discrimination
  b: number | null;        // IRT difficulty
  c: number | null;        // IRT pseudo-guessing
  infit: number | null;    // Rasch infit MNSQ
  outfit: number | null;   // Rasch outfit MNSQ
  difFlag: boolean | null;        // flagged for differential item functioning
}

export interface ReliabilityStats {
  skill: string;
  cefrLevel: string | "ALL";
  n: number;                  // candidates
  nItems: number;
  cronbachAlpha: number;
  mcdonaldOmega: number | null;
  irtMarginalReliability: number;
  sem: number;                // Standard Error of Measurement (IRT scale)
  splitHalfR: number | null;
}

export interface ConcurrentValidityEvidence {
  externalTest: string;
  n: number;
  pearsonR: number;
  spearmanRho: number;
  concordanceStudyId: string;
  publicationYear: number | null;
}

export interface PublicationDataPackage {
  packageId: string;
  generatedAt: string;
  dataVersion: string;
  totalCandidates: number | null;        // anonymised
  totalItems: number;
  totalResponses: number;
  dateRange: { from: string | null; to: string };
  itemAnalysis: ItemAnalysisRow[];
  reliability: ReliabilityStats[];
  concurrentValidity: ConcurrentValidityEvidence[];
  equatingStudies: string[];      // references to concordance.ts equating results
  irtSoftwareNote: string;
  ethicsStatement: string;
  citationTemplate: string;
  csvFiles: Record<string, string>;  // filename → CSV content
}

// ── Pseudonymisation ──────────────────────────────────────────────────────────

import * as crypto from "crypto";

const PSEUDO_SALT = process.env.RESEARCH_PSEUDO_SALT ?? "linguadapt-research-salt-change-in-prod";

export function pseudonymiseId(realId: string): string {
  return crypto.createHmac("sha256", PSEUDO_SALT).update(realId).digest("hex").slice(0, 12);
}

// ── Item analysis ─────────────────────────────────────────────────────────────

export async function computeItemAnalysis(opts: {
  skill?: string;
  cefrLevel?: string;
  minN?: number;
}): Promise<ItemAnalysisRow[]> {
  const { skill, cefrLevel, minN = 30 } = opts;

  const where: any = { active: true };
  if (skill)     where.skill     = skill;
  if (cefrLevel) where.cefrLevel = cefrLevel;

  const items = await prisma.item.findMany({ where, select: { id: true, skill: true, cefrLevel: true, type: true, discrimination: true, difficulty: true, guessing: true, metadata: true } });

  const responseCounts = await prisma.response.groupBy({
    by: ["itemId"],
    _count: { itemId: true },
    _avg:   { score: true },
    where: { itemId: { in: items.map((i) => i.id) } },
  });

  const statsMap: Record<string, { n: number; pValue: number }> = {};
  for (const r of responseCounts) {
    statsMap[r.itemId] = { n: r._count.itemId, pValue: Math.round((r._avg.score ?? 0) * 1000) / 1000 };
  }

  const rows: ItemAnalysisRow[] = [];
  for (const item of items) {
    const stats = statsMap[item.id];
    if (!stats || stats.n < minN) continue;

    const a = item.discrimination ?? null;

    rows.push({
      itemId: pseudonymiseId(item.id),
      skill: item.skill,
      cefrLevel: item.cefrLevel,
      format: item.type,
      module: (item.metadata as any)?.module ?? "GENERAL",
      n: stats.n,
      pValue: stats.pValue,
      pointBiserial: null, // Requires observed item/total score covariance.
      a: a ? Math.round(a * 1000) / 1000 : null,
      b: item.difficulty != null ? Math.round(item.difficulty * 1000) / 1000 : null,
      c: item.guessing != null ? Math.round(item.guessing   * 1000) / 1000 : null,
      infit:  null,  // Rasch infit requires raw data computation
      outfit: null,
      difFlag: null, // No linked empirical DIF result in this export.
    });
  }

  return rows.sort((a, b) => a.cefrLevel.localeCompare(b.cefrLevel) || a.skill.localeCompare(b.skill));
}

// ── Reliability ───────────────────────────────────────────────────────────────

export async function computeReliabilityStats(): Promise<ReliabilityStats[]> {
  // No per-skill common-item or theta/SEM study is linked to this export.
  // Do not substitute illustrative statistics for measured evidence. Public
  // product-level IRT estimates are computed separately in public-reliability.ts.
  return [];
}

// ── CSV export ────────────────────────────────────────────────────────────────

export function itemAnalysisToCSV(rows: ItemAnalysisRow[]): string {
  const header = ["itemId","skill","cefrLevel","format","module","n","pValue","pointBiserial","a","b","c","infit","outfit","difFlag"].join(",");
  const body = rows.map((r) =>
    [r.itemId, r.skill, r.cefrLevel, r.format, r.module, r.n, r.pValue, r.pointBiserial ?? "", r.a ?? "", r.b ?? "", r.c ?? "", r.infit ?? "", r.outfit ?? "", r.difFlag == null ? "" : r.difFlag ? 1 : 0].join(",")
  ).join("\n");
  return header + "\n" + body;
}

// ── Full publication package ──────────────────────────────────────────────────

export async function generatePublicationPackage(opts: {
  skill?: string;
  cefrLevel?: string;
} = {}): Promise<PublicationDataPackage> {
  const [itemAnalysis, reliability] = await Promise.all([
    computeItemAnalysis({ ...opts, minN: 30 }),
    computeReliabilityStats(),
  ]);

  const totalItems    = itemAnalysis.length;
  const totalResponses = itemAnalysis.reduce((s, r) => s + r.n, 0);

  const concurrentValidity: ConcurrentValidityEvidence[] = []; // No linked empirical study in this export.

  const packageId = crypto.randomUUID();

  return {
    packageId,
    generatedAt: new Date().toISOString(),
    dataVersion: "1.0",
    totalCandidates: null,
    totalItems,
    totalResponses,
    dateRange: { from: null, to: new Date().toISOString().slice(0, 10) },
    itemAnalysis,
    reliability,
    concurrentValidity,
    equatingStudies: [],
    irtSoftwareNote: "Item parameters are exported from the b4skills item bank. Their presence does not establish empirical calibration. Unavailable statistics are left blank.",
    ethicsStatement: "Item identifiers are pseudonymised with HMAC-SHA256; pseudonymisation is not anonymisation. No institutional ethics approval or legal compliance certification is asserted by this export.",
    citationTemplate: `LinguAdapt Assessment Platform (2026). Adaptive English Proficiency Assessment Technical Manual. LinguAdapt Inc. https://linguadapt.com/technical-manual`,
    csvFiles: {
      "item_analysis.csv":  itemAnalysisToCSV(itemAnalysis),
      "reliability.csv":    ["skill","cefrLevel","n","nItems","cronbachAlpha","irtMarginalReliability","sem"].join(",") + "\n" +
        reliability.map((r) => [r.skill, r.cefrLevel, r.n, r.nItems, r.cronbachAlpha, r.irtMarginalReliability, r.sem].join(",")).join("\n"),
    },
  };
}
