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

import { evaluateFreemiumResponse } from "../product-lines/freemium-productive-scoring.js";
import { stripAnswerKeys } from "../security/answer-sanitizer.js";
import { estimateTheta } from "./estimator.js";
import { thetaToCefr } from "../cefr/cefr-framework.js";
import type { Item, SkillType } from "./types.js";
import { RatingQueueService } from "../scoring/rating-queue.js";
import { shouldExcludeResponseFromAbility } from "../scoring/score-evidence.js";
import { prisma } from "../prisma.js";


// ── Constants ─────────────────────────────────────────────────────────────────

export const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"] as const;
export type Skill = typeof SKILLS[number];

export const DIAGNOSTIC_ITEMS_PER_SKILL = 5;
export const DIAGNOSTIC_TOTAL_ITEMS     = SKILLS.length * DIAGNOSTIC_ITEMS_PER_SKILL; // 30
export const DIAGNOSTIC_WALL_CLOCK_MS   = 45 * 60 * 1_000; // 45 min

// ── DiagnosticSession state ───────────────────────────────────────────────────

export interface DiagnosticItemRecord {
  itemId:       string;
  skill:        Skill;
  type?:        string;
  irtA:         number;
  irtB:         number;
  irtC:         number;
  cefrLevel:    string;
  answered:     boolean;
  isCorrect?:   boolean;
  score?:       number | null;
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
  const candidates = await prisma.item.findMany({
    where: {
      skill:      skill as any,
      status:     "ACTIVE",
      isPretest: false,
      id:         { notIn: [...usedIds] },
      // spread across difficulty
    },
    select: { id: true, skill: true, type: true, cefrLevel: true, discrimination: true, difficulty: true, guessing: true, content: true, assets: {select:{type:true,url:true}} },
    orderBy: { difficulty: "asc" },
    take: count * 4,
  });

  const items = candidates.filter(item => skill !== "LISTENING" || (item.content as any)?.audioUrl || item.assets.some(asset=>asset.type === "AUDIO"));
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
      type:      pick.type,
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
    // Select items for all skills
    const usedIds = new Set<string>();
    const skillStates: Record<string, DiagnosticSkillState> = {};

    for (const skill of SKILLS) {
      const items = await selectItemsForSkill(skill, usedIds, DIAGNOSTIC_ITEMS_PER_SKILL);
      if (items.length < DIAGNOSTIC_ITEMS_PER_SKILL) throw new Error(`Diagnostic requires ${DIAGNOSTIC_ITEMS_PER_SKILL} valid items for ${skill}`);
      items.forEach((it) => usedIds.add(it.itemId));
      skillStates[skill] = { theta: 0, sem: 1, answered: 0, items };
    }

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
    return { sessionId: session.id, firstItem: { ...first, content: stripAnswerKeys({...((itemRow?.content ?? {}) as Record<string, unknown>),audioUrl:(itemRow?.content as any)?.audioUrl ?? itemRow?.assets.find(asset=>asset.type === "AUDIO")?.url}) }, totalItems: DIAGNOSTIC_TOTAL_ITEMS, expiresAt };
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
    value:     unknown,
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
    if (DiagnosticService._nextItem(state)?.itemId !== itemId) throw new Error("Response must match the current unanswered item");

    // Score — fetch item to get correct answer
    const itemRow = await prisma.item.findUnique({ where: { id: itemId } });
    const content  = (itemRow?.content ?? {}) as any;
    if (!itemRow) throw new Error("Item not found");
    const input = itemRow.type === "MULTIPLE_CHOICE" && typeof value === "string" && /^[A-Z]$/i.test(value.trim())
      ? value.trim().toUpperCase().charCodeAt(0) - 65 : value;
    const options = Array.isArray(content.options) ? content.options.map((option: any) => typeof option === "string" ? option : option.text) : undefined;
    const flaggedIndex = Array.isArray(content.options) ? content.options.findIndex((option: any) => option?.isCorrect === true) : -1;
    const evaluation = await evaluateFreemiumResponse({skill:foundSkill,type:itemRow.type,content:{...content, options,
      correctIndex:content.correctIndex ?? (flaggedIndex >= 0 ? flaggedIndex : undefined)}}, input);
    const score = evaluation.score;
    const isCorrect = score === null ? null : score >= .5;
    foundItem.answered = true;
    foundItem.isCorrect = isCorrect ?? undefined;
    foundItem.score = score;
    foundItem.latencyMs = latencyMs;
    foundItem.answeredAt = new Date().toISOString();
    const skillState = state.skills[foundSkill];
    const evidence = skillState.items.filter(item => item.answered && item.score != null);
    const itemDict: Record<string, Item> = Object.fromEntries(evidence.map(item => [item.itemId, {
      id:item.itemId,skill:foundSkill as SkillType,type:item.type,params:{a:item.irtA,b:item.irtB,c:item.irtC},isPretest:false,status:"ACTIVE",
    }]));
    const estimate = estimateTheta(evidence.map(item => ({itemId:item.itemId,score:item.score!})),itemDict,0,1,{useGrmProductive:true});
    skillState.theta = estimate.theta;
    skillState.sem = estimate.sem;
    skillState.answered++;
    state.totalAnswered++;

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

    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${sessionId} FOR UPDATE`;
      const current = await tx.session.findUnique({where:{id:sessionId}});
      const currentState = (current?.metadata as any)?.diagnosticState as DiagnosticSessionState | undefined;
      if (!currentState || currentState.complete || DiagnosticService._nextItem(currentState)?.itemId !== itemId ||
          await tx.response.count({where:{sessionId,itemId}}) > 0) throw new Error("Response must match the current unanswered item");
    // Persist Response row
    await tx.response.create({
      data: {
        sessionId,
        itemId,
        value: typeof value === "string" ? value : JSON.stringify(value),
        isCorrect,
        score,
        isPretest: false,
        latencyMs,
        order: state.totalAnswered,
        metadata: { diagnosticSkill: foundSkill, requiresHumanReview: score === null,
          scoreSource: score === null ? "ai_flagged" : evaluation.kind === "rubric" ? "ai_auto" : "objective",
          aiFeedback: evaluation.feedback, },
      },
    });

      await tx.session.update({where:{id:sessionId},data:{
        metadata:{...((current?.metadata as any) ?? {}),diagnosticState:state},
        theta:overallTheta,sem:Math.max(...SKILLS.map(skill=>state.skills[skill].sem)),
        ...(state.complete ? {status:"COMPLETED",cefrLevel:thetaToCefr(overallTheta) as any,completedAt:new Date()} : {}),
      }});
    });
    if (score === null) await RatingQueueService.enqueue({sessionId,itemId,type:foundSkill === "SPEAKING" ? "SPEAKING" : "WRITING",content:typeof value === "string" ? value : JSON.stringify(value)});


    const skillThetas = Object.fromEntries(
      SKILLS.map((s) => [s, {
        theta:    state.skills[s].theta,
        sem:      state.skills[s].sem,
        cefrBand: state.skills[s].items.some(item => item.answered && item.score != null) ? thetaToCefr(state.skills[s].theta) : "UNKNOWN",
      }])
    ) as Record<Skill, { theta: number; sem: number; cefrBand: string }>;

    const nextRaw = state.complete ? null : DiagnosticService._nextItem(state);
    let nextItem: (DiagnosticItemRecord & { content: any }) | undefined;
    if (nextRaw) {
      const nextRow = await prisma.item.findUnique({ where: { id: nextRaw.itemId }, include: { assets: true } });
      nextItem = { ...nextRaw, content: stripAnswerKeys({...((nextRow?.content ?? {}) as Record<string, unknown>),audioUrl:(nextRow?.content as any)?.audioUrl ?? nextRow?.assets.find(asset=>asset.type === "AUDIO")?.url}) };
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

    const session = await prisma.session.findUnique({ where: { id: sessionId }, include:{responses:{include:{item:true}}} });
    if (!session?.completedAt) throw new Error("Session not yet complete");

    if (session.responses.some(response => shouldExcludeResponseFromAbility(response) && !response.isPretest)) {
      throw new Error("Diagnostic scoring is incomplete; unresolved responses require review");
    }
    for (const skill of SKILLS) {
      const responses = session.responses.filter(response => response.item.skill === skill && !shouldExcludeResponseFromAbility(response));
      if (!responses.length) throw new Error("Diagnostic scoring lacks evidence for a required skill");
      const items: Record<string, Item> = Object.fromEntries(responses.map(response => [response.itemId, {
        id:response.itemId, skill:skill as SkillType, type:response.item.type,
        params:{a:response.item.discrimination,b:response.item.difficulty,c:response.item.guessing},isPretest:false,status:"ACTIVE",
      }]));
      const estimate = estimateTheta(responses.map(response => ({itemId:response.itemId,score:response.score!})),items,0,1,{useGrmProductive:true});
      state.skills[skill].theta=estimate.theta; state.skills[skill].sem=estimate.sem;
    }
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
