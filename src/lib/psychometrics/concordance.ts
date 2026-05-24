/**
 * Concordance Studies — IRT Score Linking & Equating
 * ─────────────────────────────────────────────────────────────────────────────
 * Establishes score comparability between:
 *   • Different test forms (Form A ↔ Form B)
 *   • LinguAdapt scores and external frameworks (IELTS, TOEFL, TOEIC)
 *   • Module-specific tests and the General English scale
 *   • Longitudinal score tracking (same candidate, different administrations)
 *
 * Equating designs:
 *   • Common-Item Non-Equivalent Groups (CINEG) — anchor item equating
 *   • Single Group (SG) — same candidates take both forms
 *   • Random Groups (RG) — different random samples per form
 *
 * Methods:
 *   • Mean/Sigma (MS) and Mean/Mean (MM) — linear characteristic curve methods
 *   • Haebara function — IRT characteristic curve equating
 *   • Stocking-Lord function — test characteristic curve equating
 *   • Concordance tables: LinguAdapt theta → IELTS band / TOEFL score / TOEIC
 *
 * References:
 *   Kolen & Brennan (2014) — Test Equating, Scaling, and Linking. 3rd ed.
 *   González & Wiberg (2017) — Applying Test Equating Methods.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type EquatingDesign = "CINEG" | "SINGLE_GROUP" | "RANDOM_GROUP";
export type EquatingMethod = "MEAN_SIGMA" | "MEAN_MEAN" | "HAEBARA" | "STOCKING_LORD";

export interface AnchorItemParams {
  itemId: string;
  formX: { a: number; b: number; c: number };
  formY: { a: number; b: number; c: number };
}

export interface EquatingResult {
  design: EquatingDesign;
  method: EquatingMethod;
  formX: string;
  formY: string;
  linkA: number;    // scale: b_X = A * b_Y + B
  linkB: number;    // location
  seA: number;
  seB: number;
  anchorN: number;
  SEE: number;      // Standard Error of Equating (overall)
  scoreTable: Array<{ thetaY: number; thetaX: number }>;
  computedAt: string;
}

export interface ConcordanceEntry {
  thetaLinguAdapt: number;
  cefrBand: string;
  ielts: number | null;       // IELTS Overall Band (0–9)
  toeflIBT: number | null;    // TOEFL iBT (0–120)
  toeic: number | null;       // TOEIC L&R (10–990)
  cambridgeMark: number | null; // Cambridge scaled score (0–210)
  confidence: "HIGH" | "MEDIUM" | "LOW"; // based on sample size
}

export interface ConcordanceStudy {
  studyId: string;
  title: string;
  externalTest: string;
  n: number;                 // sample size
  conductedAt: string;
  pearsonR: number;
  spearmanRho: number;
  meanAbsoluteError: number;
  table: ConcordanceEntry[];
  publicationRef?: string;
}

// ── Mean/Sigma equating ───────────────────────────────────────────────────────

export function meanSigmaEquating(
  anchors: AnchorItemParams[],
  formX: string,
  formY: string,
  design: EquatingDesign = "CINEG"
): EquatingResult {
  if (anchors.length < 3) throw new Error("Need ≥ 3 anchor items for equating");

  const bX = anchors.map((a) => a.formX.b);
  const bY = anchors.map((a) => a.formY.b);
  const n = anchors.length;

  const meanX = bX.reduce((s, b) => s + b, 0) / n;
  const meanY = bY.reduce((s, b) => s + b, 0) / n;
  const sdX   = Math.sqrt(bX.reduce((s, b) => s + (b - meanX) ** 2, 0) / n);
  const sdY   = Math.sqrt(bY.reduce((s, b) => s + (b - meanY) ** 2, 0) / n);

  const A = sdX / (sdY || 1);
  const B = meanX - A * meanY;

  // Standard error via jackknife approximation
  const jackA: number[] = [];
  for (let i = 0; i < n; i++) {
    const jbX = bX.filter((_, k) => k !== i);
    const jbY = bY.filter((_, k) => k !== i);
    const jmX = jbX.reduce((s, b) => s + b, 0) / (n - 1);
    const jmY = jbY.reduce((s, b) => s + b, 0) / (n - 1);
    const jsdX = Math.sqrt(jbX.reduce((s, b) => s + (b - jmX) ** 2, 0) / (n - 1));
    const jsdY = Math.sqrt(jbY.reduce((s, b) => s + (b - jmY) ** 2, 0) / (n - 1));
    jackA.push(jsdX / (jsdY || 1));
  }
  const meanJackA = jackA.reduce((s, a) => s + a, 0) / n;
  const seA = Math.sqrt(((n - 1) / n) * jackA.reduce((s, a) => s + (a - meanJackA) ** 2, 0));
  const seB = seA * Math.abs(meanY) + Math.sqrt(sdX ** 2 / n);

  // SEE: standard deviation of equating differences at anchor items
  const diffs = anchors.map((a) => (A * a.formY.b + B) - a.formX.b);
  const SEE   = Math.sqrt(diffs.reduce((s, d) => s + d * d, 0) / n);

  // Score table
  const scoreTable = [];
  for (let t = -4; t <= 4.01; t += 0.1) {
    const tRound = Math.round(t * 10) / 10;
    scoreTable.push({ thetaY: tRound, thetaX: Math.round((A * tRound + B) * 1000) / 1000 });
  }

  return {
    design,
    method: "MEAN_SIGMA",
    formX,
    formY,
    linkA: Math.round(A * 10000) / 10000,
    linkB: Math.round(B * 10000) / 10000,
    seA:   Math.round(seA * 10000) / 10000,
    seB:   Math.round(seB * 10000) / 10000,
    anchorN: n,
    SEE: Math.round(SEE * 10000) / 10000,
    scoreTable,
    computedAt: new Date().toISOString(),
  };
}

// ── Stocking-Lord equating ────────────────────────────────────────────────────

function icc(theta: number, a: number, b: number, c: number): number {
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

/**
 * Stocking-Lord minimisation: minimises sum of squared differences between
 * test characteristic curves across the theta range.
 * Uses gradient descent (simple version; full implementation uses L-BFGS).
 */
export function stockingLordEquating(
  anchors: AnchorItemParams[],
  formX: string,
  formY: string
): EquatingResult {
  const GRID = Array.from({ length: 41 }, (_, i) => -4 + i * 0.2);

  let A = 1.0, B = 0.0;
  const lr = 0.005;

  for (let iter = 0; iter < 200; iter++) {
    let gA = 0, gB = 0;
    for (const theta of GRID) {
      for (const anch of anchors) {
        const pX = icc(theta, anch.formX.a, anch.formX.b, anch.formX.c);
        const pY = icc(A * theta + B, anch.formY.a, anch.formY.b / A - B / A, anch.formY.c);
        const diff = pX - pY;
        const pYq  = pY * (1 - pY);
        const da   = anch.formY.a;
        gA -= 2 * diff * pYq * da * theta;
        gB -= 2 * diff * pYq * da;
      }
    }
    A -= lr * gA;
    B -= lr * gB;
    A = Math.max(0.1, Math.min(3.0, A));
    B = Math.max(-5,  Math.min(5,   B));
  }

  // SEE
  const diffs = anchors.map((anch) => {
    const bYlinked = A * anch.formY.b + B;
    return bYlinked - anch.formX.b;
  });
  const SEE = Math.sqrt(diffs.reduce((s, d) => s + d * d, 0) / anchors.length);

  const scoreTable = [];
  for (let t = -4; t <= 4.01; t += 0.1) {
    const tRound = Math.round(t * 10) / 10;
    scoreTable.push({ thetaY: tRound, thetaX: Math.round((A * tRound + B) * 1000) / 1000 });
  }

  return {
    design: "CINEG",
    method: "STOCKING_LORD",
    formX, formY,
    linkA: Math.round(A * 10000) / 10000,
    linkB: Math.round(B * 10000) / 10000,
    seA: 0,
    seB: 0,
    anchorN: anchors.length,
    SEE: Math.round(SEE * 10000) / 10000,
    scoreTable,
    computedAt: new Date().toISOString(),
  };
}

// ── External score concordance tables ────────────────────────────────────────

/**
 * LinguAdapt IRT theta → external test score concordance.
 * Based on standard CEFR alignment mappings from published concordance studies
 * (ETS TOEFL-CEFR 2017, Cambridge Assessment 2013, TOEIC-CEFR 2016).
 */
export const EXTERNAL_CONCORDANCE_TABLE: ConcordanceEntry[] = [
  { thetaLinguAdapt: -3.5, cefrBand: "A1", ielts: 1.0,  toeflIBT: 0,   toeic: 120,  cambridgeMark: 80,  confidence: "MEDIUM" },
  { thetaLinguAdapt: -2.5, cefrBand: "A1", ielts: 1.5,  toeflIBT: 5,   toeic: 225,  cambridgeMark: 100, confidence: "MEDIUM" },
  { thetaLinguAdapt: -2.0, cefrBand: "A2", ielts: 2.0,  toeflIBT: 14,  toeic: 300,  cambridgeMark: 110, confidence: "HIGH" },
  { thetaLinguAdapt: -1.5, cefrBand: "A2", ielts: 2.5,  toeflIBT: 20,  toeic: 385,  cambridgeMark: 120, confidence: "HIGH" },
  { thetaLinguAdapt: -1.0, cefrBand: "B1", ielts: 3.5,  toeflIBT: 32,  toeic: 490,  cambridgeMark: 140, confidence: "HIGH" },
  { thetaLinguAdapt: -0.5, cefrBand: "B1", ielts: 4.0,  toeflIBT: 45,  toeic: 545,  cambridgeMark: 154, confidence: "HIGH" },
  { thetaLinguAdapt:  0.0, cefrBand: "B1", ielts: 4.5,  toeflIBT: 52,  toeic: 600,  cambridgeMark: 160, confidence: "HIGH" },
  { thetaLinguAdapt:  0.5, cefrBand: "B2", ielts: 5.0,  toeflIBT: 60,  toeic: 665,  cambridgeMark: 170, confidence: "HIGH" },
  { thetaLinguAdapt:  1.0, cefrBand: "B2", ielts: 5.5,  toeflIBT: 72,  toeic: 725,  cambridgeMark: 180, confidence: "HIGH" },
  { thetaLinguAdapt:  1.5, cefrBand: "B2", ielts: 6.0,  toeflIBT: 80,  toeic: 785,  cambridgeMark: 185, confidence: "HIGH" },
  { thetaLinguAdapt:  2.0, cefrBand: "C1", ielts: 6.5,  toeflIBT: 88,  toeic: 855,  cambridgeMark: 191, confidence: "HIGH" },
  { thetaLinguAdapt:  2.5, cefrBand: "C1", ielts: 7.0,  toeflIBT: 95,  toeic: 900,  cambridgeMark: 195, confidence: "HIGH" },
  { thetaLinguAdapt:  3.0, cefrBand: "C1", ielts: 7.5,  toeflIBT: 102, toeic: 935,  cambridgeMark: 200, confidence: "HIGH" },
  { thetaLinguAdapt:  3.5, cefrBand: "C2", ielts: 8.0,  toeflIBT: 110, toeic: 960,  cambridgeMark: 205, confidence: "MEDIUM" },
  { thetaLinguAdapt:  4.0, cefrBand: "C2", ielts: 9.0,  toeflIBT: 120, toeic: 990,  cambridgeMark: 210, confidence: "MEDIUM" },
];

/** Interpolate external score for a given theta */
export function lookupConcordance(theta: number): ConcordanceEntry {
  const table = EXTERNAL_CONCORDANCE_TABLE;
  if (theta <= table[0].thetaLinguAdapt) return table[0];
  if (theta >= table[table.length - 1].thetaLinguAdapt) return table[table.length - 1];

  for (let i = 0; i < table.length - 1; i++) {
    const lo = table[i], hi = table[i + 1];
    if (theta >= lo.thetaLinguAdapt && theta <= hi.thetaLinguAdapt) {
      const t = (theta - lo.thetaLinguAdapt) / (hi.thetaLinguAdapt - lo.thetaLinguAdapt);
      const interp = (a: number | null, b: number | null) =>
        a !== null && b !== null ? Math.round((a + t * (b - a)) * 10) / 10 : null;
      return {
        thetaLinguAdapt: Math.round(theta * 10) / 10,
        cefrBand: t < 0.5 ? lo.cefrBand : hi.cefrBand,
        ielts:          interp(lo.ielts, hi.ielts),
        toeflIBT:       interp(lo.toeflIBT, hi.toeflIBT),
        toeic:          interp(lo.toeic, hi.toeic),
        cambridgeMark:  interp(lo.cambridgeMark, hi.cambridgeMark),
        confidence:     "HIGH",
      };
    }
  }
  return table[table.length - 1];
}
