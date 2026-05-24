/**
 * Diagnostic Test Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * A fixed-length, multi-skill diagnostic assessment that:
 *
 *   • Runs 30 calibrated items across all 6 skills (CEFR A1–C2)
 *   • Uses a stratified item selection strategy (5 items/skill)
 *   • Produces per-skill and overall CEFR band estimates via IRT 3PL
 *   • Streams adaptive ability updates after each response
 *   • Generates a DiagnosticReport with strengths / gap analysis
 *   • Integrates with the main SessionService (reuses Session model)
 *
 * Differences from the standard adaptive engine:
 *   • Fixed 30-item limit (vs variable CAT stopping rule)
 *   • All 6 skills always covered (forced stratification)
 *   • Diagnostic metadata flagged with `sessionType: "DIAGNOSTIC"` in metadata
 *   • No time limit per item; overall 45-minute wall-clock limit
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Constants ─────────────────────────────────────────────────────────────────

export const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"] as const;
export type Skill = typeof SKILLS[number];

export const DIAGNOSTIC_ITEMS_PER_SKILL = 5;
export const DIAGNOSTIC_TOTAL_ITEMS     = SKILLS.length * DIAGNOSTIC_ITEMS_PER_SKILL; // 30
export const DIAGNOSTIC_WALL_CLOCK_MS   = 45 * 60 * 1_000; // 45 min

const CEFR_THETA_MAP: Array<{ band: string; lo: number; hi: number }> = [
  { band: "A1", lo: -4.0, hi: -2.5 },
  { band: "A2", lo: -2.5, hi: -1.0 },
  { band: "B1", lo: -1.0, hi:  0.5 },
  { band: "B2", lo:  0.5, hi:  1.5 },
  { band: "C1", lo:  1.5, hi:  2.5 },
  { band: "C2", lo:  2.5, hi:  4.0 },
];

function thetaToCefr(theta: number): string {
  for (const { band, lo, hi } of CEFR_THETA_MAP) {
    if (theta >= lo && theta < hi) return band;
  }
  return theta < -4 ? "A1" : "C2";
}

// ── IRT 3PL helpers ───────────────────────────────────────────────────────────

/** 3PL item characteristic curve */
function p3pl(theta: number, a: number, b: number, c: number): number {
  return c + (1 - c) / (1 + Math.exp(-1.702 * a * (theta - b)));
}

/** Expected Fisher information */
function itemInfo(theta: number, a: number, b: number, c: number): number {
  const P = p3pl(theta, a, b, c);
  const Q = 1 - P;
  const num = (1.702 * a) ** 2 * (P - c) ** 2 * Q;
  const den = (1 - c) ** 2 * P;
  return num / (den || 1e-9);
}

/** EAP theta update after a single binary response */
function updateThetaEAP(
  prevTheta: number,
  prevSem:   number,
  isCorrect: boolean,
  a: number, b: number, c: number
): { theta: number; sem: number } {
  const GRID_POINTS = 41;
  const gridStep    = 8 / (GRID_POINTS - 1);
  let numerator = 0, denominator = 0;

  for (let i = 0; i < GRID_POINTS; i++) {
    const th  = -4 + i * gridStep;
    const P   = p3pl(th, a, b, c);
    const lik = isCorrect ? P : 1 - P;
    // Prior: N(prevTheta, prevSem²)
    const prior = Math.exp(-0.5 * ((th - prevTheta) / prevSem) ** 2);
    const w = lik * prior;
    numerator   += th * w;
    denominator += w;
  }

  const newTheta = denominator > 0 ? numerator / denominator : prevTheta;
  const info     = itemInfo(newTheta, a, b, c);
  const newSem   = Math.min(prevSem, 1 / Math.sqrt(info || 1));
  return { theta: Math.max(-4, Math.min(4, newTheta)), sem: Math.max(0.01, newSem) };
}

// ── DiagnosticSession state ───────────────────────────────────────────────────

export interface DiagnosticItemRecord {
  itemId:       string;
  skill:        Skill;
  irtA:         number;
  irtB:         number;
  irtC:         number;
  cefrLevel:    string;
  answered:     boolean;
  isCorrect?:   boolean;
  score?:       number;
  answeredAt?:  string;
  latencyMs?:   number;
}

export interface DiagnosticSkillState {
  theta:     number;
  sem:       number;
  answered:  number;
  items:     DiagnosticItemRecord[];
}

export interface DiagnosticSessionState {
  sessionId:   string;
  candidateId: string;
  orgId:       string;
  startedAt:   string;
  expiresAt:   string;           // wall-clock deadline
  totalAnswered: number;
  complete:    boolean;
  skills:      Record<Skill, DiagnosticSkillState>;
}

// ── In-memory state (replaced by DB in production) ───────────────────────────
// The state is serialised into Session.metadata on every update.

async function loadState(sessionId: string): Promise<DiagnosticSessionState | null> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return null;
  const meta = session.metadata as any;
  return meta?.diagnosticState ?? null;
}

async function saveState(sessionId: string, state: DiagnosticSessionState): Promise<void> {
  const current = await prisma.session.findUnique({ where: { id: sessionId } });
  const meta    = (current?.metadata ?? {}) as any;
  await prisma.session.update({
    where: { id: sessionId },
    data:  { metadata: { ...meta, diagnosticState: state }, updatedAt: new Date() },
  });
}

// ── Item selection ────────────────────────────────────────────────────────────

async function selectItemsForSkill(skill: Skill, usedIds: Set<string>, count: number): Promise<DiagnosticItemRecord[]> {
  const items = await prisma.item.findMany({
    where: {
      skill:      skill as any,
      active:     true,
      status:     "ACTIVE",
      id:         { notIn: [...usedIds] },
      // spread across difficulty
    },
    select: { id: true, skill: true, cefrLevel: true, discrimination: true, difficulty: true, guessing: true },
    orderBy: { difficulty: "asc" },
    take: count * 4,
  });

  if (items.length === 0) return [];

  // Pick items spread across CEFR bands (A2, B1, B2 as the diagnostic core)
  const TARGET_BANDS = ["A2", "B1", "B1", "B2", "B2"];
  const selected: DiagnosticItemRecord[] = [];
  for (const band of TARGET_BANDS) {
    const candidate = items.find((it) => it.cefrLevel === band && !selected.some((s) => s.itemId === it.id));
    const pick      = candidate ?? items.find((it) => !selected.some((s) => s.itemId === it.id));
    if (!pick) continue;
    selected.push({
      itemId:    pick.id,
      skill:     pick.skill as Skill,
      irtA:      pick.discrimination ?? 1.0,
      irtB:      pick.difficulty     ?? 0.0,
      irtC:      pick.guessing       ?? 0.2,
      cefrLevel: pick.cefrLevel      ?? "B1",
      answered:  false,
    });
  }
  return selected.slice(0, count);
}

// ── DiagnosticService ─────────────────────────────────────────────────────────

export class DiagnosticService {

  /** Launch a new diagnostic session */
  static async launch(candidateId: string, orgId: string): Promise<{
    sessionId: string;
    firstItem: DiagnosticItemRecord & { content: any };
    totalItems: number;
    expiresAt: string;
  }> {
    // Create Session row
    const session = await prisma.session.create({
      data: {
        candidateId,
        organizationId: orgId,
        status:  "IN_PROGRESS",
        theta:   0.0,
        sem:     1.0,
        metadata: { sessionType: "DIAGNOSTIC" },
      },
    });

    // Select items for all skills
    const usedIds = new Set<string>();
    const skillStates: Record<string, DiagnosticSkillState> = {};

    for (const skill of SKILLS) {
      const items = await selectItemsForSkill(skill, usedIds, DIAGNOSTIC_ITEMS_PER_SKILL);
      items.forEach((it) => usedIds.add(it.itemId));
      skillStates[skill] = { theta: 0, sem: 1, answered: 0, items };
    }

    const now       = new Date();
    const expiresAt = new Date(now.getTime() + DIAGNOSTIC_WALL_CLOCK_MS).toISOString();

    const state: DiagnosticSessionState = {
      sessionId:    session.id,
      candidateId,
      orgId,
      startedAt:    now.toISOString(),
      expiresAt,
      totalAnswered: 0,
      complete:     false,
      skills:       skillStates as Record<Skill, DiagnosticSkillState>,
    };

    await saveState(session.id, state);

    const first = DiagnosticService._nextItem(state);
    if (!first) throw new Error("No items available for diagnostic");

    const itemRow = await prisma.item.findUnique({ where: { id: first.itemId }, include: { assets: true } });
    return { sessionId: session.id, firstItem: { ...first, content: itemRow?.content ?? {} }, totalItems: DIAGNOSTIC_TOTAL_ITEMS, expiresAt };
  }

  /** Return the next unanswered item (cycles through skills in round-robin) */
  static _nextItem(state: DiagnosticSessionState): DiagnosticItemRecord | null {
    // Round-robin across skills to keep the experience varied
    const skillOrder = [...SKILLS];
    for (const skill of skillOrder) {
      const item = state.skills[skill]?.items.find((i) => !i.answered);
      if (item) return item;
    }
    return null;
  }

  /** Submit a response and return updated state + next item */
  static async respond(
    sessionId: string,
    itemId:    string,
    value:     string,
    latencyMs: number,
  ): Promise<{
    complete:      boolean;
    theta:         number;
    sem:           number;
    skillThetas:   Record<Skill, { theta: number; sem: number; cefrBand: string }>;
    nextItem?:     DiagnosticItemRecord & { content: any };
    itemsAnswered: number;
    totalItems:    number;
  }> {
    const state = await loadState(sessionId);
    if (!state) throw new Error("Diagnostic session not found");
    if (state.complete) throw new Error("Session already complete");

    // Find item
    let foundItem: DiagnosticItemRecord | null = null;
    let foundSkill: Skill | null = null;
    for (const skill of SKILLS) {
      const item = state.skills[skill].items.find((i) => i.itemId === itemId);
      if (item) { foundItem = item; foundSkill = skill; break; }
    }
    if (!foundItem || !foundSkill) throw new Error("Item not found in session");
    if (foundItem.answered) throw new Error("Item already answered");

    // Score — fetch item to get correct answer
    const itemRow = await prisma.item.findUnique({ where: { id: itemId } });
    const content  = (itemRow?.content ?? {}) as any;
    let isCorrect  = false;
    let score      = 0;

    if (content.correctIndex !== undefined) {
      const idx = parseInt(value, 10);
      isCorrect = idx === content.correctIndex;
      score     = isCorrect ? 1 : 0;
    } else if (typeof value === "string" && value.length > 0) {
      // Open-response: mark as 0.5 pending human/AI scoring
      score     = 0.5;
      isCorrect = true;
    }

    // Update item
    foundItem.answered   = true;
    foundItem.isCorrect  = isCorrect;
    foundItem.score      = score;
    foundItem.latencyMs  = latencyMs;
    foundItem.answeredAt = new Date().toISOString();

    // IRT update for the skill
    const skillState = state.skills[foundSkill];
    const { theta: newTheta, sem: newSem } = updateThetaEAP(
      skillState.theta, skillState.sem, isCorrect,
      foundItem.irtA, foundItem.irtB, foundItem.irtC,
    );
    skillState.theta   = newTheta;
    skillState.sem     = newSem;
    skillState.answered++;
    state.totalAnswered++;

    // Persist Response row
    await prisma.response.create({
      data: {
        sessionId,
        itemId,
        value,
        isCorrect,
        score,
        isPretest: false,
        latencyMs,
        metadata: { diagnosticSkill: foundSkill },
      },
    });

    // Check completion
    const allDone = SKILLS.every((s) => state.skills[s].answered >= DIAGNOSTIC_ITEMS_PER_SKILL);
    const expired = Date.now() > new Date(state.expiresAt).getTime();
    state.complete = allDone || expired;

    // Overall theta = weighted average across skills
    const skillWeights = { READING: 2, LISTENING: 2, GRAMMAR: 1.5, VOCABULARY: 1.5, WRITING: 2, SPEAKING: 2 } as Record<Skill, number>;
    let wSum = 0, wTheta = 0;
    for (const s of SKILLS) {
      const w = skillWeights[s];
      wTheta += w * state.skills[s].theta;
      wSum   += w;
    }
    const overallTheta = wTheta / wSum;

    if (state.complete) {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status:      "COMPLETED",
          theta:       overallTheta,
          cefrLevel:   thetaToCefr(overallTheta) as any,
          completedAt: new Date(),
        },
      });
    }

    await saveState(sessionId, state);

    const skillThetas = Object.fromEntries(
      SKILLS.map((s) => [s, {
        theta:    state.skills[s].theta,
        sem:      state.skills[s].sem,
        cefrBand: thetaToCefr(state.skills[s].theta),
      }])
    ) as Record<Skill, { theta: number; sem: number; cefrBand: string }>;

    const nextRaw = state.complete ? null : DiagnosticService._nextItem(state);
    let nextItem: (DiagnosticItemRecord & { content: any }) | undefined;
    if (nextRaw) {
      const nextRow = await prisma.item.findUnique({ where: { id: nextRaw.itemId }, include: { assets: true } });
      nextItem = { ...nextRaw, content: nextRow?.content ?? {} };
    }

    return {
      complete:      state.complete,
      theta:         overallTheta,
      sem:           Math.max(...SKILLS.map((s) => state.skills[s].sem)),
      skillThetas,
      nextItem,
      itemsAnswered: state.totalAnswered,
      totalItems:    DIAGNOSTIC_TOTAL_ITEMS,
    };
  }

  /** Get the diagnostic report once complete */
  static async getReport(sessionId: string): Promise<{
    sessionId:     string;
    candidateId:   string;
    overallBand:   string;
    overallTheta:  number;
    skills:        Array<{ skill: Skill; cefrBand: string; theta: number; sem: number; percentile: number }>;
    strengths:     Skill[];
    gaps:          Skill[];
    recommendations: string[];
    completedAt:   string;
  }> {
    const state = await loadState(sessionId);
    if (!state) throw new Error("Session not found");

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session?.completedAt) throw new Error("Session not yet complete");

    const skillResults = SKILLS.map((s) => {
      const st = state.skills[s];
      // Rough percentile from theta (normal distribution approximation)
      const z   = st.theta / 1;
      const pct = Math.round(50 * (1 + Math.sign(z) * (1 - Math.exp(-0.7 * z * z))));
      return { skill: s, cefrBand: thetaToCefr(st.theta), theta: st.theta, sem: st.sem, percentile: Math.min(99, Math.max(1, pct)) };
    });

    const overallTheta = session.theta ?? 0;
    const sorted       = [...skillResults].sort((a, b) => b.theta - a.theta);
    const strengths    = sorted.slice(0, 2).map((s) => s.skill);
    const gaps         = sorted.slice(-2).map((s) => s.skill);

    const recommendations: string[] = [
      ...gaps.map((s) => `Focus on ${s.toLowerCase()} practice — current level: ${thetaToCefr(state.skills[s].theta)}`),
      overallTheta < 0 ? "Review A2–B1 grammar structures daily." : "Extend B2+ academic vocabulary.",
    ];

    return {
      sessionId,
      candidateId: state.candidateId,
      overallBand:  thetaToCefr(overallTheta),
      overallTheta,
      skills:       skillResults,
      strengths,
      gaps,
      recommendations,
      completedAt:  session.completedAt.toISOString(),
    };
  }
}
