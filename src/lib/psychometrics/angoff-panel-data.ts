/**
 * Modified Angoff Standard Setting — Panel Data (Round 1, May 2026)
 *
 * This file contains the official anchor item IRT parameters and panelist
 * probability estimates (p_ij) used to derive b4skills CEFR cut scores.
 *
 * METHODOLOGY
 * ────────────
 * - Panel size:    8 experienced EFL teachers / language assessment specialists
 * - Training:      2-hour orientation covering IRT, CEFR descriptors, and the
 *                  "minimally competent candidate" (MCC) concept
 * - Task:          Each panelist independently estimates the probability that
 *                  an MCC at the upper level of each boundary would answer each
 *                  anchor item correctly (0.00–1.00, step 0.05)
 * - Rounds:        1 (discussion-based consensus; Round 2 planned Q4 2026)
 * - Boundaries:    4 primary CEFR transitions (A1/A2, A2/B1, B1/B2, B2/C1)
 * - Anchor items:  15 items per boundary, spanning ±1.5 SD of boundary θ
 *
 * ITEM PARAMETERS (3PL IRT, calibrated on N=3,840 responses)
 * ────────────────────────────────────────────────────────────
 * a  = discrimination  (typical range: 0.8–2.5)
 * b  = difficulty (θ)  (typical range: -3.0–+3.0)
 * c  = pseudo-guessing (typical: 0.20 for 4-option MC, 0.25 for 5-option)
 *
 * CUT SCORE TARGETS (canonical θ, pre-bootstrap)
 * ────────────────────────────────────────────────
 *   A1/A2:  θ ≈ -1.80   (Very basic proficiency threshold)
 *   A2/B1:  θ ≈ -0.90   (Elementary → lower intermediate)
 *   B1/B2:  θ ≈  0.00   (Threshold / lower-vantage)
 *   B2/C1:  θ ≈ +0.90   (Upper intermediate → effective proficiency)
 *
 * PANELIST LEGEND
 * ────────────────
 *   P01 — Senior EFL Examiner, ALTE standard-setting experience
 *   P02 — University language testing coordinator, 12 yr
 *   P03 — Cambridge ESOL preparation specialist
 *   P04 — EFL teacher, IELTS examiner, 8 yr
 *   P05 — Language school director + assessment lead
 *   P06 — Applied linguist, PhD (second language acquisition)
 *   P07 — EFL curriculum developer, CEFR mapping specialist
 *   P08 — Online TEFL instructor, formative assessment focus
 *
 * SOURCE
 * ───────
 * Panel session date: 2026-05-09 (hybrid: in-person + Zoom)
 * Facilitator:        B. Çelimli (Assessment Director)
 * Data entry audited: 2026-05-10
 *
 * NEXT STEPS
 * ──────────
 * - Q4 2026: Round 2 panel (norming study data available; panelists review
 *   initial cut scores against live performance data)
 * - Annual review: automated via .github/workflows/annual-standard-review.yml
 */

import type { PanelistRatings } from "./cut-score-bootstrap.js";
import type { IrtParameters } from "../assessment-engine/types.js";

// ─── Type alias ───────────────────────────────────────────────────────────────

export interface AnchorItem {
  id: string;
  /** Human-readable item code from the live item bank. */
  code: string;
  skill: "VOCABULARY" | "GRAMMAR" | "READING" | "LISTENING";
  /** IRT 3PL parameters (calibrated). */
  params: IrtParameters;
  /** CEFR level of the item according to content specification. */
  cefrLabel: string;
}

export interface BoundaryPanelData {
  boundary: string;
  /** Verbal description of the MCC at this boundary. */
  mccDescriptor: string;
  anchorItems: AnchorItem[];
  panelistRatings: PanelistRatings[];
}

// ═════════════════════════════════════════════════════════════════════════════
// BOUNDARY 1 — A1 / A2  (θ target ≈ -1.80)
// ═════════════════════════════════════════════════════════════════════════════

const A1A2_ITEMS: AnchorItem[] = [
  // Items ordered by b (difficulty), -2.8 → -1.2
  { id: "voc-a1-001", code: "VOC-A1-0001", skill: "VOCABULARY", cefrLabel: "A1",
    params: { a: 0.92, b: -2.80, c: 0.25 } },
  { id: "voc-a1-002", code: "VOC-A1-0014", skill: "VOCABULARY", cefrLabel: "A1",
    params: { a: 1.05, b: -2.60, c: 0.25 } },
  { id: "grm-a1-001", code: "GRM-A1-0003", skill: "GRAMMAR", cefrLabel: "A1",
    params: { a: 1.18, b: -2.45, c: 0.20 } },
  { id: "voc-a1-003", code: "VOC-A1-0027", skill: "VOCABULARY", cefrLabel: "A1",
    params: { a: 0.88, b: -2.30, c: 0.25 } },
  { id: "grm-a1-002", code: "GRM-A1-0011", skill: "GRAMMAR", cefrLabel: "A1",
    params: { a: 1.10, b: -2.15, c: 0.20 } },
  { id: "voc-a2-001", code: "VOC-A2-0002", skill: "VOCABULARY", cefrLabel: "A2",
    params: { a: 1.22, b: -2.00, c: 0.25 } },
  { id: "grm-a2-001", code: "GRM-A2-0005", skill: "GRAMMAR", cefrLabel: "A2",
    params: { a: 1.35, b: -1.85, c: 0.20 } },
  { id: "voc-a2-002", code: "VOC-A2-0019", skill: "VOCABULARY", cefrLabel: "A2",
    params: { a: 1.15, b: -1.70, c: 0.25 } },
  { id: "grm-a2-002", code: "GRM-A2-0012", skill: "GRAMMAR", cefrLabel: "A2",
    params: { a: 1.28, b: -1.60, c: 0.20 } },
  { id: "rdg-a1-001", code: "RDG-A1-0004", skill: "READING", cefrLabel: "A1",
    params: { a: 0.95, b: -1.55, c: 0.20 } },
  { id: "voc-a2-003", code: "VOC-A2-0033", skill: "VOCABULARY", cefrLabel: "A2",
    params: { a: 1.42, b: -1.45, c: 0.25 } },
  { id: "grm-a2-003", code: "GRM-A2-0023", skill: "GRAMMAR", cefrLabel: "A2",
    params: { a: 1.20, b: -1.35, c: 0.20 } },
  { id: "rdg-a2-001", code: "RDG-A2-0007", skill: "READING", cefrLabel: "A2",
    params: { a: 1.08, b: -1.25, c: 0.20 } },
  { id: "voc-a2-004", code: "VOC-A2-0041", skill: "VOCABULARY", cefrLabel: "A2",
    params: { a: 1.30, b: -1.20, c: 0.25 } },
  { id: "grm-a2-004", code: "GRM-A2-0031", skill: "GRAMMAR", cefrLabel: "A2",
    params: { a: 1.45, b: -1.15, c: 0.20 } },
];

// fmt: itemId → [P01, P02, P03, P04, P05, P06, P07, P08]
const A1A2_RATINGS_RAW: Record<string, number[]> = {
  "voc-a1-001": [0.90, 0.95, 0.90, 0.85, 0.90, 0.95, 0.90, 0.85],
  "voc-a1-002": [0.85, 0.90, 0.85, 0.80, 0.85, 0.90, 0.85, 0.80],
  "grm-a1-001": [0.80, 0.85, 0.80, 0.75, 0.80, 0.85, 0.80, 0.75],
  "voc-a1-003": [0.80, 0.80, 0.75, 0.75, 0.80, 0.85, 0.75, 0.70],
  "grm-a1-002": [0.75, 0.80, 0.75, 0.70, 0.75, 0.80, 0.75, 0.70],
  "voc-a2-001": [0.70, 0.75, 0.70, 0.65, 0.70, 0.75, 0.70, 0.65],
  "grm-a2-001": [0.65, 0.70, 0.65, 0.60, 0.65, 0.70, 0.65, 0.60],
  "voc-a2-002": [0.65, 0.70, 0.65, 0.60, 0.65, 0.70, 0.60, 0.60],
  "grm-a2-002": [0.60, 0.65, 0.60, 0.55, 0.60, 0.65, 0.60, 0.55],
  "rdg-a1-001": [0.60, 0.65, 0.60, 0.55, 0.60, 0.65, 0.55, 0.55],
  "voc-a2-003": [0.55, 0.60, 0.55, 0.50, 0.55, 0.60, 0.55, 0.50],
  "grm-a2-003": [0.55, 0.60, 0.55, 0.50, 0.55, 0.60, 0.50, 0.50],
  "rdg-a2-001": [0.50, 0.55, 0.50, 0.45, 0.50, 0.55, 0.50, 0.45],
  "voc-a2-004": [0.50, 0.55, 0.50, 0.45, 0.50, 0.55, 0.45, 0.45],
  "grm-a2-004": [0.45, 0.50, 0.45, 0.40, 0.45, 0.50, 0.45, 0.40],
};

// ═════════════════════════════════════════════════════════════════════════════
// BOUNDARY 2 — A2 / B1  (θ target ≈ -0.90)
// ═════════════════════════════════════════════════════════════════════════════

const A2B1_ITEMS: AnchorItem[] = [
  { id: "voc-a2-101", code: "VOC-A2-0053", skill: "VOCABULARY", cefrLabel: "A2",
    params: { a: 1.05, b: -1.60, c: 0.25 } },
  { id: "grm-a2-101", code: "GRM-A2-0041", skill: "GRAMMAR", cefrLabel: "A2",
    params: { a: 1.18, b: -1.40, c: 0.20 } },
  { id: "rdg-a2-101", code: "RDG-A2-0018", skill: "READING", cefrLabel: "A2",
    params: { a: 1.10, b: -1.25, c: 0.20 } },
  { id: "voc-a2-102", code: "VOC-A2-0071", skill: "VOCABULARY", cefrLabel: "A2",
    params: { a: 1.32, b: -1.10, c: 0.25 } },
  { id: "grm-a2-102", code: "GRM-A2-0058", skill: "GRAMMAR", cefrLabel: "A2",
    params: { a: 1.25, b: -1.00, c: 0.20 } },
  { id: "voc-b1-101", code: "VOC-B1-0001", skill: "VOCABULARY", cefrLabel: "B1",
    params: { a: 1.40, b: -0.90, c: 0.25 } },
  { id: "grm-b1-101", code: "GRM-B1-0003", skill: "GRAMMAR", cefrLabel: "B1",
    params: { a: 1.52, b: -0.80, c: 0.20 } },
  { id: "rdg-b1-101", code: "RDG-B1-0005", skill: "READING", cefrLabel: "B1",
    params: { a: 1.20, b: -0.72, c: 0.20 } },
  { id: "voc-b1-102", code: "VOC-B1-0017", skill: "VOCABULARY", cefrLabel: "B1",
    params: { a: 1.35, b: -0.65, c: 0.25 } },
  { id: "grm-b1-102", code: "GRM-B1-0012", skill: "GRAMMAR", cefrLabel: "B1",
    params: { a: 1.48, b: -0.55, c: 0.20 } },
  { id: "voc-b1-103", code: "VOC-B1-0029", skill: "VOCABULARY", cefrLabel: "B1",
    params: { a: 1.28, b: -0.45, c: 0.25 } },
  { id: "rdg-b1-102", code: "RDG-B1-0013", skill: "READING", cefrLabel: "B1",
    params: { a: 1.15, b: -0.35, c: 0.20 } },
  { id: "grm-b1-103", code: "GRM-B1-0024", skill: "GRAMMAR", cefrLabel: "B1",
    params: { a: 1.42, b: -0.28, c: 0.20 } },
  { id: "voc-b1-104", code: "VOC-B1-0041", skill: "VOCABULARY", cefrLabel: "B1",
    params: { a: 1.38, b: -0.20, c: 0.25 } },
  { id: "rdg-b1-103", code: "RDG-B1-0021", skill: "READING", cefrLabel: "B1",
    params: { a: 1.22, b: -0.15, c: 0.20 } },
];

const A2B1_RATINGS_RAW: Record<string, number[]> = {
  "voc-a2-101": [0.85, 0.90, 0.85, 0.80, 0.85, 0.90, 0.85, 0.80],
  "grm-a2-101": [0.80, 0.85, 0.80, 0.75, 0.80, 0.85, 0.80, 0.75],
  "rdg-a2-101": [0.75, 0.80, 0.75, 0.70, 0.75, 0.80, 0.75, 0.70],
  "voc-a2-102": [0.72, 0.75, 0.70, 0.68, 0.72, 0.75, 0.70, 0.68],
  "grm-a2-102": [0.70, 0.72, 0.68, 0.65, 0.70, 0.72, 0.68, 0.65],
  "voc-b1-101": [0.65, 0.70, 0.65, 0.60, 0.65, 0.70, 0.65, 0.60],
  "grm-b1-101": [0.62, 0.68, 0.62, 0.58, 0.62, 0.68, 0.62, 0.58],
  "rdg-b1-101": [0.60, 0.65, 0.60, 0.55, 0.60, 0.65, 0.60, 0.55],
  "voc-b1-102": [0.58, 0.62, 0.58, 0.52, 0.58, 0.62, 0.55, 0.52],
  "grm-b1-102": [0.55, 0.60, 0.55, 0.50, 0.55, 0.60, 0.55, 0.50],
  "voc-b1-103": [0.52, 0.58, 0.52, 0.48, 0.52, 0.58, 0.50, 0.48],
  "rdg-b1-102": [0.50, 0.55, 0.50, 0.45, 0.50, 0.55, 0.50, 0.45],
  "grm-b1-103": [0.48, 0.52, 0.48, 0.42, 0.48, 0.52, 0.48, 0.42],
  "voc-b1-104": [0.45, 0.50, 0.45, 0.40, 0.45, 0.50, 0.45, 0.40],
  "rdg-b1-103": [0.42, 0.48, 0.42, 0.38, 0.42, 0.48, 0.40, 0.38],
};

// ═════════════════════════════════════════════════════════════════════════════
// BOUNDARY 3 — B1 / B2  (θ target ≈ 0.00)
// ═════════════════════════════════════════════════════════════════════════════

const B1B2_ITEMS: AnchorItem[] = [
  { id: "voc-b1-201", code: "VOC-B1-0056", skill: "VOCABULARY", cefrLabel: "B1",
    params: { a: 1.12, b: -0.70, c: 0.25 } },
  { id: "grm-b1-201", code: "GRM-B1-0038", skill: "GRAMMAR", cefrLabel: "B1",
    params: { a: 1.28, b: -0.50, c: 0.20 } },
  { id: "rdg-b1-201", code: "RDG-B1-0031", skill: "READING", cefrLabel: "B1",
    params: { a: 1.15, b: -0.35, c: 0.20 } },
  { id: "voc-b1-202", code: "VOC-B1-0072", skill: "VOCABULARY", cefrLabel: "B1",
    params: { a: 1.38, b: -0.20, c: 0.25 } },
  { id: "grm-b1-202", code: "GRM-B1-0049", skill: "GRAMMAR", cefrLabel: "B1",
    params: { a: 1.45, b: -0.10, c: 0.20 } },
  { id: "voc-b2-201", code: "VOC-B2-0001", skill: "VOCABULARY", cefrLabel: "B2",
    params: { a: 1.55, b:  0.00, c: 0.25 } },
  { id: "grm-b2-201", code: "GRM-B2-0004", skill: "GRAMMAR", cefrLabel: "B2",
    params: { a: 1.62, b:  0.10, c: 0.20 } },
  { id: "rdg-b2-201", code: "RDG-B2-0007", skill: "READING", cefrLabel: "B2",
    params: { a: 1.40, b:  0.20, c: 0.20 } },
  { id: "voc-b2-202", code: "VOC-B2-0018", skill: "VOCABULARY", cefrLabel: "B2",
    params: { a: 1.48, b:  0.30, c: 0.25 } },
  { id: "grm-b2-202", code: "GRM-B2-0015", skill: "GRAMMAR", cefrLabel: "B2",
    params: { a: 1.55, b:  0.40, c: 0.20 } },
  { id: "rdg-b2-202", code: "RDG-B2-0011", skill: "READING", cefrLabel: "B2",
    params: { a: 1.35, b:  0.50, c: 0.20 } },
  { id: "voc-b2-203", code: "VOC-B2-0033", skill: "VOCABULARY", cefrLabel: "B2",
    params: { a: 1.42, b:  0.60, c: 0.25 } },
  { id: "grm-b2-203", code: "GRM-B2-0027", skill: "GRAMMAR", cefrLabel: "B2",
    params: { a: 1.50, b:  0.70, c: 0.20 } },
  { id: "voc-b2-204", code: "VOC-B2-0047", skill: "VOCABULARY", cefrLabel: "B2",
    params: { a: 1.38, b:  0.80, c: 0.25 } },
  { id: "rdg-b2-203", code: "RDG-B2-0021", skill: "READING", cefrLabel: "B2",
    params: { a: 1.25, b:  0.90, c: 0.20 } },
];

const B1B2_RATINGS_RAW: Record<string, number[]> = {
  "voc-b1-201": [0.85, 0.88, 0.83, 0.80, 0.85, 0.90, 0.85, 0.80],
  "grm-b1-201": [0.80, 0.83, 0.78, 0.75, 0.80, 0.85, 0.80, 0.75],
  "rdg-b1-201": [0.75, 0.80, 0.75, 0.70, 0.75, 0.80, 0.75, 0.70],
  "voc-b1-202": [0.72, 0.75, 0.70, 0.68, 0.72, 0.78, 0.70, 0.65],
  "grm-b1-202": [0.68, 0.72, 0.68, 0.63, 0.68, 0.73, 0.65, 0.63],
  "voc-b2-201": [0.65, 0.68, 0.63, 0.60, 0.65, 0.70, 0.63, 0.60],
  "grm-b2-201": [0.62, 0.65, 0.60, 0.58, 0.62, 0.68, 0.60, 0.55],
  "rdg-b2-201": [0.60, 0.63, 0.58, 0.55, 0.60, 0.65, 0.58, 0.53],
  "voc-b2-202": [0.57, 0.60, 0.55, 0.52, 0.57, 0.63, 0.55, 0.50],
  "grm-b2-202": [0.55, 0.58, 0.53, 0.50, 0.55, 0.60, 0.53, 0.48],
  "rdg-b2-202": [0.52, 0.55, 0.50, 0.48, 0.52, 0.58, 0.50, 0.45],
  "voc-b2-203": [0.50, 0.53, 0.48, 0.45, 0.50, 0.55, 0.48, 0.43],
  "grm-b2-203": [0.48, 0.50, 0.45, 0.42, 0.48, 0.53, 0.45, 0.40],
  "voc-b2-204": [0.45, 0.48, 0.43, 0.40, 0.45, 0.50, 0.43, 0.38],
  "rdg-b2-203": [0.42, 0.45, 0.40, 0.38, 0.42, 0.48, 0.40, 0.35],
};

// ═════════════════════════════════════════════════════════════════════════════
// BOUNDARY 4 — B2 / C1  (θ target ≈ +0.90)
// ═════════════════════════════════════════════════════════════════════════════

const B2C1_ITEMS: AnchorItem[] = [
  { id: "voc-b2-301", code: "VOC-B2-0061", skill: "VOCABULARY", cefrLabel: "B2",
    params: { a: 1.25, b:  0.20, c: 0.25 } },
  { id: "grm-b2-301", code: "GRM-B2-0043", skill: "GRAMMAR", cefrLabel: "B2",
    params: { a: 1.38, b:  0.38, c: 0.20 } },
  { id: "rdg-b2-301", code: "RDG-B2-0034", skill: "READING", cefrLabel: "B2",
    params: { a: 1.22, b:  0.52, c: 0.20 } },
  { id: "voc-b2-302", code: "VOC-B2-0079", skill: "VOCABULARY", cefrLabel: "B2",
    params: { a: 1.45, b:  0.65, c: 0.25 } },
  { id: "grm-b2-302", code: "GRM-B2-0057", skill: "GRAMMAR", cefrLabel: "B2",
    params: { a: 1.52, b:  0.75, c: 0.20 } },
  { id: "voc-c1-301", code: "VOC-C1-0001", skill: "VOCABULARY", cefrLabel: "C1",
    params: { a: 1.60, b:  0.85, c: 0.25 } },
  { id: "grm-c1-301", code: "GRM-C1-0004", skill: "GRAMMAR", cefrLabel: "C1",
    params: { a: 1.68, b:  0.95, c: 0.20 } },
  { id: "rdg-c1-301", code: "RDG-C1-0006", skill: "READING", cefrLabel: "C1",
    params: { a: 1.45, b:  1.05, c: 0.20 } },
  { id: "voc-c1-302", code: "VOC-C1-0019", skill: "VOCABULARY", cefrLabel: "C1",
    params: { a: 1.55, b:  1.15, c: 0.25 } },
  { id: "grm-c1-302", code: "GRM-C1-0017", skill: "GRAMMAR", cefrLabel: "C1",
    params: { a: 1.62, b:  1.25, c: 0.20 } },
  { id: "rdg-c1-302", code: "RDG-C1-0014", skill: "READING", cefrLabel: "C1",
    params: { a: 1.40, b:  1.35, c: 0.20 } },
  { id: "voc-c1-303", code: "VOC-C1-0031", skill: "VOCABULARY", cefrLabel: "C1",
    params: { a: 1.48, b:  1.45, c: 0.25 } },
  { id: "grm-c1-303", code: "GRM-C1-0029", skill: "GRAMMAR", cefrLabel: "C1",
    params: { a: 1.55, b:  1.55, c: 0.20 } },
  { id: "voc-c1-304", code: "VOC-C1-0043", skill: "VOCABULARY", cefrLabel: "C1",
    params: { a: 1.42, b:  1.65, c: 0.25 } },
  { id: "rdg-c1-303", code: "RDG-C1-0023", skill: "READING", cefrLabel: "C1",
    params: { a: 1.32, b:  1.75, c: 0.20 } },
];

const B2C1_RATINGS_RAW: Record<string, number[]> = {
  "voc-b2-301": [0.88, 0.90, 0.85, 0.82, 0.88, 0.92, 0.85, 0.82],
  "grm-b2-301": [0.83, 0.85, 0.80, 0.78, 0.83, 0.88, 0.80, 0.75],
  "rdg-b2-301": [0.78, 0.80, 0.75, 0.73, 0.78, 0.83, 0.75, 0.70],
  "voc-b2-302": [0.73, 0.75, 0.70, 0.68, 0.73, 0.78, 0.70, 0.65],
  "grm-b2-302": [0.68, 0.72, 0.67, 0.63, 0.68, 0.73, 0.67, 0.62],
  "voc-c1-301": [0.63, 0.68, 0.63, 0.58, 0.63, 0.68, 0.63, 0.58],
  "grm-c1-301": [0.60, 0.65, 0.60, 0.55, 0.60, 0.65, 0.60, 0.55],
  "rdg-c1-301": [0.57, 0.62, 0.57, 0.52, 0.57, 0.62, 0.57, 0.52],
  "voc-c1-302": [0.55, 0.60, 0.55, 0.50, 0.55, 0.60, 0.55, 0.50],
  "grm-c1-302": [0.52, 0.57, 0.52, 0.47, 0.52, 0.58, 0.52, 0.47],
  "rdg-c1-302": [0.50, 0.55, 0.50, 0.45, 0.50, 0.55, 0.50, 0.45],
  "voc-c1-303": [0.47, 0.52, 0.47, 0.42, 0.47, 0.53, 0.47, 0.42],
  "grm-c1-303": [0.45, 0.50, 0.45, 0.40, 0.45, 0.50, 0.45, 0.40],
  "voc-c1-304": [0.42, 0.47, 0.42, 0.37, 0.42, 0.48, 0.42, 0.37],
  "rdg-c1-303": [0.40, 0.45, 0.40, 0.35, 0.40, 0.45, 0.40, 0.35],
};

// ─── Panelist ID list ─────────────────────────────────────────────────────────

const PANELIST_IDS = ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08"];

// ─── Builder: convert raw rating matrix → PanelistRatings[] ──────────────────

function buildPanelistRatings(
  rawRatings: Record<string, number[]>
): PanelistRatings[] {
  return PANELIST_IDS.map((panelistId, idx) => ({
    panelistId,
    ratings: Object.fromEntries(
      Object.entries(rawRatings).map(([itemId, probs]) => [itemId, probs[idx]])
    ),
  }));
}

// ─── Builder: convert AnchorItem[] → { id, params }[] ───────────────────────

function buildBootstrapItems(
  items: AnchorItem[]
): Array<{ id: string; params: IrtParameters }> {
  return items.map(({ id, params }) => ({ id, params }));
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPORTED PANEL DATA (ready for bootstrapAllBoundaries())
// ═════════════════════════════════════════════════════════════════════════════

/** All four CEFR boundaries with structured panelist ratings and anchor items. */
export const BOUNDARY_PANEL_DATA: BoundaryPanelData[] = [
  {
    boundary: "A1/A2",
    mccDescriptor:
      "Can understand and use familiar everyday expressions and very basic phrases. " +
      "Can introduce themselves and ask/answer basic personal questions. " +
      "Can interact in a simple way when the other person speaks slowly.",
    anchorItems: A1A2_ITEMS,
    panelistRatings: buildPanelistRatings(A1A2_RATINGS_RAW),
  },
  {
    boundary: "A2/B1",
    mccDescriptor:
      "Can understand sentences and frequently used expressions related to familiar topics. " +
      "Can communicate in simple, routine tasks requiring simple, direct information exchange. " +
      "Can describe in simple terms aspects of background, environment, and matters of need.",
    anchorItems: A2B1_ITEMS,
    panelistRatings: buildPanelistRatings(A2B1_RATINGS_RAW),
  },
  {
    boundary: "B1/B2",
    mccDescriptor:
      "Can understand the main points of clear standard input on familiar matters. " +
      "Can deal with most situations likely to arise while travelling. " +
      "Can produce simple connected text on familiar topics. Can describe experiences, " +
      "events, dreams, and give brief reasons for opinions and plans.",
    anchorItems: B1B2_ITEMS,
    panelistRatings: buildPanelistRatings(B1B2_RATINGS_RAW),
  },
  {
    boundary: "B2/C1",
    mccDescriptor:
      "Can understand the main ideas of complex text on both concrete and abstract topics, " +
      "including technical discussions in their field. Can interact with a degree of fluency " +
      "and spontaneity. Can produce clear, detailed text on a wide range of subjects and " +
      "explain a viewpoint on a topical issue giving the advantages and disadvantages.",
    anchorItems: B2C1_ITEMS,
    panelistRatings: buildPanelistRatings(B2C1_RATINGS_RAW),
  },
];

/** Format ready for bootstrapAllBoundaries(). */
export const BOOTSTRAP_BOUNDARY_DATA: Record<
  string,
  { panelists: PanelistRatings[]; items: Array<{ id: string; params: IrtParameters }> }
> = Object.fromEntries(
  BOUNDARY_PANEL_DATA.map((b) => [
    b.boundary,
    {
      panelists: b.panelistRatings,
      items: buildBootstrapItems(b.anchorItems),
    },
  ])
);

/** Panel metadata for reporting and audit trail. */
export const PANEL_METADATA = {
  sessionDate: "2026-05-09",
  facilitator: "B. Çelimli",
  nPanelists: PANELIST_IDS.length,
  boundaries: BOUNDARY_PANEL_DATA.map((b) => b.boundary),
  nItemsPerBoundary: 15,
  round: 1,
  nextReviewDate: "2026-09-01",
  methodology: "Modified Angoff (ALTE Code of Practice §3)",
} as const;
