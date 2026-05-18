import { AssessmentEngine } from "./engine";
import { selectNextItem } from "./selector.js";
import { getCATSelector, ShadowItem } from "../selection/cat-selector.js";
import { SequencingContext } from "../selection/sequencing-rules.js";
import { getProfile } from "../product-lines/profiles.js";
import { resolveMstPhase, buildMstTagFilter } from "../selection/mst-router.js";
import { SessionState, Item, Response, EngineConfig, SkillType, BlueprintConstraint, IrtParameters } from "./types";
import { prisma } from "../prisma";
import { validateItemBeforeSave } from "../validation/item-schema.js";
import { AppError } from "../errors/app-error.js";
import { ScoringOrchestrator } from "../scoring/scoring-orchestrator";
import { RatingQueueService } from "../scoring/rating-queue";
import { getCachedItems, getItemsByIds } from "./item-bank-cache.js";
import { enqueueScoringJob } from "../scoring/scoring-queue.js";
import { CalibrationService } from "./calibration-service";
import { Prisma, SessionStatus, ItemType, CefrLevel } from "@prisma/client";
import { BillingService } from "../enterprise/billing-service";
import { validateItem } from "../language-skills/item-quality-validator.js";
import { logger } from "../observability/index.js";
import { getCanDo, thetaToCefr, CEFR_LEVELS } from "../cefr/cefr-framework.js";
import { initExposureStore, getExposureStore } from "./exposure-store.js";
import { parseSystemConfigPayload } from "./system-config-zod.js";
import type { ResponseTimeParams } from "../psychometrics/response-time-irt.js";
import {
  detectAberrantResponseTime,
  estimateSpeed,
  responseTimeAdjustedScore,
  responseTimeParamsFromItemContent,
} from "../psychometrics/response-time-irt.js";
import {
  classifyCandidate,
  computeConsistencyReport,
} from "../psychometrics/classification-consistency.js";
import { computePersonFit } from "../psychometrics/person-fit.js";
import {
  detectAnswerCopying,
  ExamineeResponses as CopyingResponse,
  ItemMeta as CopyingItemMeta,
} from "../psychometrics/test-security/answer-copying.js";
import { probability as irtProbability } from "./irt.js";
import {
  estimate4DTheta,
  unidimTo4DParams,
  compositeTheta,
  compositeSem,
  type Mirt4DObservation,
} from "../psychometrics/mirt-4d.js";
import { analyseSession as analyseClickstream, type ItemClickstream } from "../psychometrics/clickstream.js";
import {
  estimateGdina,
  classifyExamineeGdina,
  generateDiagnosticFeedback,
  LINGUADAPT_QMATRIX,
  LINGUADAPT_ATTRIBUTES,
} from "../psychometrics/cdm-dina.js";
import {
  analyseCollusion,
  type ExamineeProfile as CollusionExamineeProfile,
} from "../psychometrics/test-security/collusion-graph.js";

/** Wraps a promise with a hard timeout to prevent indefinite hangs */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ── OPTION SHUFFLING ──────────────────────────────────────────────────────────
/**
 * Seeded LCG PRNG (not cryptographic — used only for deterministic option
 * ordering so the server can reproduce the same shuffle at scoring time
 * without persisting extra state).
 */
function seededRng(seed: string): () => number {
  // FNV-1a 32-bit hash to convert string seed to numeric
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 0x100000000;
  };
}

function seededFisherYates<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  const rng = seededRng(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffles MCQ options for a (sessionId, itemId) pair and returns:
 * - shuffledOptions: options array with re-labelled positional ids (A/B/C/D)
 * - newCorrectAnswer: the letter the correct option received after shuffle
 *
 * Returns null for non-MCQ items or items without the expected format.
 */
function shuffleMcqOptions(
  options: unknown[],
  correctAnswer: string,
  sessionId: string,
  itemId: string,
): { shuffledOptions: { id: string; text: string }[]; newCorrectAnswer: string } | null {
  if (!Array.isArray(options) || options.length === 0) return null;
  if (!/^[A-Da-d]$/.test(correctAnswer)) return null;
  const hasIdText = options.every(
    (o) => typeof o === "object" && o !== null && typeof (o as any).id === "string" && typeof (o as any).text === "string",
  );
  if (!hasIdText) return null;

  const seed = `${sessionId}:${itemId}`;
  const shuffled = seededFisherYates(options as { id: string; text: string }[], seed);
  const LABELS = ["A", "B", "C", "D"];
  const originalCorrectId = correctAnswer.toUpperCase();
  const newCorrectIndex = shuffled.findIndex((o) => o.id.toUpperCase() === originalCorrectId);
  if (newCorrectIndex === -1) return null;

  const shuffledOptions = shuffled.map((o, i) => ({ ...o, id: LABELS[i] }));
  return { shuffledOptions, newCorrectAnswer: LABELS[newCorrectIndex] };
}
// ─────────────────────────────────────────────────────────────────────────────

function dbItemToEngineItem(u: {
  id: string;
  itemCode?: string | null;
  type: string;
  skill: string;
  discrimination: number;
  difficulty: number;
  guessing: number;
  content: unknown;
  status: string;
  isPretest: boolean;
}): Item {
  const c = (u.content as Record<string, unknown> | null) || {};
  const ar = c.aReceptive;
  const ap = c.aProductive;
  const params: IrtParameters = { a: u.discrimination, b: u.difficulty, c: u.guessing };
  if (typeof ar === "number" && Number.isFinite(ar)) params.aReceptive = ar;
  if (typeof ap === "number" && Number.isFinite(ap)) params.aProductive = ap;
  return {
    id: u.id,
    itemCode: u.itemCode ?? null,
    type: u.type,
    skill: u.skill as unknown as SkillType,
    isPretest: u.isPretest || u.status === "PRETEST",
    status: u.status as "DRAFT" | "REVIEW" | "ACTIVE" | "PRETEST" | "RETIRED",
    params,
    metadata: u.content as any,
  };
}

async function loadItemMapByIds(itemIds: string[]): Promise<Record<string, Item>> {
  const uniq = [...new Set(itemIds)];
  if (uniq.length === 0) return {};
  const rows = await prisma.item.findMany({ where: { id: { in: uniq } } });
  return Object.fromEntries(rows.map((row) => [row.id, dbItemToEngineItem(row)]));
}

function buildRtHistoryForPersonSpeed(
  state: SessionState,
  itemById: Record<string, Item>
): { timeSeconds: number; params: ResponseTimeParams }[] {
  const out: { timeSeconds: number; params: ResponseTimeParams }[] = [];
  for (const r of state.responses) {
    if (r.isPretest) continue;
    if (r.latencyMs === undefined || r.latencyMs <= 0) continue;
    const it = itemById[r.itemId];
    if (!it) continue;
    out.push({
      timeSeconds: r.latencyMs / 1000,
      params: responseTimeParamsFromItemContent(it.metadata),
    });
  }
  return out;
}

function toEngineState(session: {
  theta: number;
  sem: number;
  metadata: unknown;
  responses: Array<{
    itemId: string;
    score: number | null;
    adjustedScore?: number | null;
    isPretest?: boolean | null;
    latencyMs: number | null;
  }>;
}): SessionState {
  const m = (session.metadata as Record<string, unknown> | null) || {};
  return {
    theta: session.theta,
    sem: session.sem,
    responses: session.responses.map((r) => {
      const raw = r.score ?? 0;
      const adj = r.adjustedScore;
      const effective = adj != null && Number.isFinite(adj) ? adj : raw;
      return {
        itemId: r.itemId,
        score: effective,
        isPretest: (r as { isPretest?: boolean }).isPretest,
        latencyMs: r.latencyMs ?? undefined,
      };
    }),
    usedItemIds: new Set(session.responses.map((r) => r.itemId)),
    mstRouteKey: m.mstRouteKey as SessionState["mstRouteKey"],
    skillProfiles: m.skillProfiles as SessionState["skillProfiles"],
    mirtAbilityVector: m.mirtAbilityVector as SessionState["mirtAbilityVector"],
    mirt2B: m.mirt2B as SessionState["mirt2B"],
  };
}

/**
 * Server-side Assessment Service
 * Manages the lifecycle of test sessions and interacts with the database.
 */

// ─── STRUCTURED SECTION ORDER ─────────────────────────────────────────────────
// 4-skill adaptive assessment: VOCABULARY → GRAMMAR → LISTENING → READING
// Each section uses IRT-based adaptive item selection (MFI + exposure control).
// Sections advance when per-skill SEM ≤ threshold OR max items reached.
export const SECTION_ORDER: SkillType[] = [
  SkillType.VOCABULARY,
  SkillType.GRAMMAR,
  SkillType.LISTENING,
  SkillType.READING,
];

// Per-section stopping config.
// semThreshold: SEM value that triggers early stop (requires minItems already answered).
// Values are calibrated for typical IRT items with a ≈ 1.0–1.5.
export const SECTION_CONFIG: Record<string, { minItems: number; maxItems: number; semThreshold: number }> = {
  VOCABULARY: { minItems: 6, maxItems: 10, semThreshold: 0.45 },
  GRAMMAR:    { minItems: 5, maxItems: 8,  semThreshold: 0.45 },
  LISTENING:  { minItems: 4, maxItems: 6,  semThreshold: 0.50 },
  READING:    { minItems: 3, maxItems: 5,  semThreshold: 0.50 },
};

/** Default content blueprint: min/max items per skill in a 15-item test. */
const DEFAULT_BLUEPRINT: BlueprintConstraint[] = [
  { skill: SkillType.READING,    minCount: 2, maxCount: 4 },
  { skill: SkillType.GRAMMAR,    minCount: 2, maxCount: 4 },
  { skill: SkillType.VOCABULARY, minCount: 2, maxCount: 3 },
  { skill: SkillType.LISTENING,  minCount: 1, maxCount: 3 },
  { skill: SkillType.WRITING,    minCount: 1, maxCount: 2 },
  { skill: SkillType.SPEAKING,   minCount: 1, maxCount: 2 },
];

const DEFAULT_CONFIG: EngineConfig = {
  minItems: 3,
  maxItems: 15,
  semThreshold: 0.3,
  startingTheta: 0.0,
  startingSem: 1.0,
  pretestRatio: 0.1,
  speedThresholdMs: 2500,      // Responses faster than 2.5s on hard items → guessing flag
  blueprint: DEFAULT_BLUEPRINT,
  useMirt: true,
  useRtIrt: false,             // Faz4 RT-IRT; enable via SystemConfig
  useGrmProductive: process.env.USE_GRM_PRODUCTIVE === "true",  // Faz5 GRM for W/S
  useRlSelector:   process.env.USE_RL_SELECTOR   === "true",   // RL policy item selection
  useShadowTest: false,        // Shadow test off by default; enable via SystemConfig
  classificationConfidenceThreshold: 0.90,
  cefrThresholds: {
    A1: -2.5,
    A2: -1.5,
    B1: -0.5,
    B2: 0.5,
    C1: 1.5,
    C2: 2.5
  }
};

// Pre-initialise the exposure store so Redis connection is established before first request
initExposureStore();

let engineInstance: AssessmentEngine | null = null;
let lastConfigUpdate: number = 0;
const CONFIG_CACHE_TTL = 30000; // 30 seconds cache

/**
 * Get the assessment engine with the latest configuration from the database.
 */
export async function getEngine(): Promise<AssessmentEngine> {
  const now = Date.now();
  if (!engineInstance || (now - lastConfigUpdate > CONFIG_CACHE_TTL)) {
    try {
      const configDoc = await prisma.systemConfig.findUnique({ where: { id: "global" } });
      const config = (configDoc?.config as any) || {};
      const cefrThresholds = config.cefrThresholds || DEFAULT_CONFIG.cefrThresholds;
      const pretestRatio = config.pretestRatio ?? DEFAULT_CONFIG.pretestRatio;
      
      const blueprint: BlueprintConstraint[] = config.blueprint || DEFAULT_BLUEPRINT;
      const mst = (config as { mst?: { enabled: boolean; moduleSizes: number[]; continueWithCatAfterMst?: boolean } })
        .mst;
      const useMirt2B = (config as { useMirt2B?: boolean }).useMirt2B === true;
      const sprt = (config as { sprt?: EngineConfig["sprt"] }).sprt;
      const useRtIrt = (config as { useRtIrt?: boolean }).useRtIrt === true;
      const useGrmProductive = (config as { useGrmProductive?: boolean }).useGrmProductive ?? DEFAULT_CONFIG.useGrmProductive;
      const useRlSelector   = (config as { useRlSelector?:   boolean }).useRlSelector   ?? DEFAULT_CONFIG.useRlSelector;
      engineInstance = new AssessmentEngine({
        ...DEFAULT_CONFIG,
        cefrThresholds,
        pretestRatio,
        blueprint,
        useMirt2B,
        useMirt: useMirt2B ? false : (config as { useMirt?: boolean }).useMirt ?? DEFAULT_CONFIG.useMirt,
        useRtIrt,
        useGrmProductive,
        useRlSelector,
        ...(sprt?.enabled ? { sprt } : {}),
        ...(mst?.enabled && mst.moduleSizes?.length ? { mst } : {}),
      });
      lastConfigUpdate = now;
    } catch (error) {
      logger.error({ err: error }, "Failed to load dynamic engine config, using defaults");
      if (!engineInstance) {
        engineInstance = new AssessmentEngine(DEFAULT_CONFIG);
      }
    }
  }
  return engineInstance;
}

export const AssessmentService = {
  /**
   * Launch a new session
   */
  async launchSession(candidateId: string, organizationId: string, productLine?: string) {
    const engine = await getEngine();
    
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      throw new Error("Organization not found. Create the organization in the admin console first.");
    }
    let candidate = await prisma.user.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      // Auto-create a guest candidate record (e.g. from code-entry flow)
      candidate = await prisma.user.create({
        data: {
          id: candidateId,
          email: `guest_${candidateId}@exam.local`,
          name: "Guest Candidate",
          role: "CANDIDATE",
          organizationId,
        },
      });
    }

    // --- CREDIT CHECK ---
    const hasCredits = await BillingService.hasSufficientCredits(organizationId);
    if (!hasCredits) {
      throw new Error("Insufficient assessment credits. Please top up your account.");
    }

    const initialState = engine.initializeSession();

    // ── ITEM BANK PRE-FLIGHT CHECK ────────────────────────────────────────────
    // Verify the item bank has at least minItems for every section in the profile
    // before creating the session. This prevents silent empty-section cascades
    // where the exam skips sections because the item pool is empty.
    const profile = getProfile(productLine);
    const itemCountsBySkill = await Promise.all(
      profile.sectionOrder.map(async (skill) => {
        const count = await prisma.item.count({
          where: { skill: skill as any, status: { in: ["ACTIVE", "PRETEST"] } },
        });
        const cfg = profile.sectionConfig[skill as string] ?? SECTION_CONFIG[skill as string];
        const minRequired = cfg?.minItems ?? 1;
        return { skill, count, minRequired, sufficient: count >= minRequired };
      })
    );
    const insufficientSections = itemCountsBySkill.filter((s) => !s.sufficient);
    if (insufficientSections.length > 0) {
      logger.error(
        { profileName: profile.name, insufficientSections },
        "Item bank coverage check failed — session launch blocked"
      );
      throw new Error(
        `Item bank is insufficient for profile "${profile.name}". ` +
        `The following sections need more ACTIVE/PRETEST items: ` +
        insufficientSections
          .map((s) => `${s.skill} (has ${s.count}, needs ${s.minRequired})`)
          .join(", ") +
        ". Please add items via the admin console or expand the item bank before launching sessions."
      );
    }

    const session = await prisma.session.create({
      data: {
        candidateId,
        organizationId,
        status: SessionStatus.IN_PROGRESS,
        theta: initialState.theta,
        sem: initialState.sem,
        metadata: productLine ? { productLine } : {},
        startedAt: new Date()
      }
    });

    // Denominator for global Sympson–Hetter exposure rate (exposures / test starts)
    getExposureStore()
      .then((store) => store.recordTestStart())
      .catch(() => {});

    // --- PRETEST INJECTION (Phase 2) ---
    // Inject 2-3 PRETEST items to collect calibration data during live testing
    const { injectPretestItems } = await import("./pretest-manager.js");
    await injectPretestItems(session.id).catch((err) => {
      logger.warn({ err, sessionId: session.id }, "pretest injection failed — non-blocking");
    });

    // --- CONSUME CREDIT ---
    await BillingService.consumeCredit(organizationId);

    return {
      sessionId: session.id,
      status: session.status,
      // Adaptive time budget: safety-net ceiling from the product line profile.
      // This is NOT a countdown — the exam ends when psychometric criteria are met.
      // The UI uses this only to show elapsed time as a fraction of the budget.
      maxDurationMs: profile.maxDurationMs,
      estimatedDurationMin: profile.estimatedDurationMin,
    };
  },

  /**
   * Get the next item for a session — structured section flow:
   * VOCABULARY → GRAMMAR → LISTENING → READING → WRITING → SPEAKING
   */
  async getNextItem(sessionId: string) {
    const engine = await getEngine();
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { responses: { include: { item: { select: { skill: true } } } } }
    });

    if (!session || session.status !== SessionStatus.IN_PROGRESS) {
      throw new Error("Invalid session");
    }

    const meta = (session.metadata as any) ?? {};
    const state = toEngineState(session);

    // ── ADAPTIVE TIME BUDGET CHECK ────────────────────────────────────────────
    // If the elapsed wall-clock time exceeds the profile's safety-net ceiling,
    // finalize the session. This is a server-side guard — the client never
    // shows a countdown; the exam simply ends when either:
    //   (a) psychometric stopping criteria are met (preferred), or
    //   (b) this hard time ceiling is reached (fallback).
    const profile = getProfile(meta.productLine);
    if (session.startedAt) {
      const elapsedMs = Date.now() - session.startedAt.getTime();
      if (elapsedMs >= profile.maxDurationMs) {
        logger.info(
          { sessionId, elapsedMs, maxDurationMs: profile.maxDurationMs, profileName: profile.name },
          "TIME_LIMIT_EXCEEDED — finalizing session"
        );
        await this.finalizeSession(sessionId, session.theta, { stopReason: "TIME_LIMIT_EXCEEDED" });
        return { stop: true, reason: "TIME_LIMIT_EXCEEDED", finalTheta: session.theta };
      }
    }

    const activeSectionOrder = profile.sectionOrder;
    const activeSectionConfig = profile.sectionConfig;

    // ── SECTION FLOW ──────────────────────────────────────────────────────────
    // Determine current section (default to index 0)
    const sectionIndex: number = meta.sectionIndex ?? 0;

    // All sections complete
    if (sectionIndex >= activeSectionOrder.length) {
      await this.finalizeSession(sessionId, session.theta, { stopReason: "ALL_SECTIONS_COMPLETE" });
      return { stop: true, reason: "ALL_SECTIONS_COMPLETE", finalTheta: session.theta };
    }

    const currentSkill = activeSectionOrder[sectionIndex];
    const sectionCfg = activeSectionConfig[currentSkill as string] ?? SECTION_CONFIG[currentSkill as string];

    // Guard: if no sectionConfig exists for this skill, skip the section rather than
    // crashing with a TypeError on sectionCfg.minItems. This can happen when a
    // product-line profile is missing a config entry for a skill in its sectionOrder.
    if (!sectionCfg) {
      logger.error(
        { sessionId, skill: currentSkill, profileName: profile.name, sectionIndex },
        "No sectionConfig found for skill — skipping section to prevent TypeError"
      );
      const newSectionIndex = sectionIndex + 1;
      if (newSectionIndex >= activeSectionOrder.length) {
        await this.finalizeSession(sessionId, session.theta, { stopReason: "ALL_SECTIONS_COMPLETE" });
        return { stop: true, reason: "ALL_SECTIONS_COMPLETE", finalTheta: session.theta };
      }
      const nextSkill = activeSectionOrder[newSectionIndex];
      await prisma.session.update({
        where: { id: sessionId },
        data: { metadata: { ...meta, sectionIndex: newSectionIndex } }
      });
      return {
        stop: false,
        sectionTransition: true,
        completedSection: currentSkill as string,
        nextSection: nextSkill as string,
        sectionIndex: newSectionIndex,
        totalSections: activeSectionOrder.length,
        sectionProgress: 0,
        reason: "MISSING_SECTION_CONFIG",
      };
    }

    // Count non-pretest responses for the current skill
    const sectionResponses = session.responses.filter(
      (r) => !r.isPretest && r.item?.skill === (currentSkill as string)
    );
    const sectionCount = sectionResponses.length;

    // Per-skill SEM from skill profiles (falls back to global SEM)
    const skillSem = state.skillProfiles?.[currentSkill]?.sem ?? state.sem;

    // Check if current section is complete
    const sectionDone =
      sectionCount >= sectionCfg.minItems &&
      (skillSem <= sectionCfg.semThreshold || sectionCount >= sectionCfg.maxItems);

    if (sectionDone) {
      logger.info(
        { sessionId, completedSkill: currentSkill, sectionCount, skillSem, sectionIndex, profileName: profile.name },
        "Section complete — advancing to next section"
      );
      const newSectionIndex = sectionIndex + 1;

      if (newSectionIndex >= activeSectionOrder.length) {
        // All sections done → finalize
        await this.finalizeSession(sessionId, session.theta, { stopReason: "ALL_SECTIONS_COMPLETE" });
        return { stop: true, reason: "ALL_SECTIONS_COMPLETE", finalTheta: session.theta };
      }

      const nextSkill = activeSectionOrder[newSectionIndex];
      // Persist new section index and completed section stats in metadata
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          metadata: {
            ...meta,
            sectionIndex: newSectionIndex,
            [`${currentSkill}_theta`]: session.theta,
            [`${currentSkill}_sem`]: skillSem,
          }
        }
      });

      return {
        stop: false,
        sectionTransition: true,
        completedSection: currentSkill as string,
        nextSection: nextSkill as string,
        sectionIndex: newSectionIndex,
        totalSections: activeSectionOrder.length,
        sectionProgress: sectionCount,
      };
    }

    // ── ITEM SELECTION ────────────────────────────────────────────────────────
    // Fetch available items restricted to the current skill section.
    // Optionally narrow by exam source tags defined in the product line profile.
    const whereClause: any = {
      status: { in: ["ACTIVE", "PRETEST"] },
      id: { notIn: Array.from(state.usedItemIds) },
      skill: currentSkill as string,
    };

    // Exam source tag filter: only apply when profile has specific sources
    // ("general" is the catch-all — never use it as a restrictive tag).
    const specificSources = profile.examSources.filter((s) => s !== "general");
    if (specificSources.length > 0) {
      whereClause.OR = [
        { tags: { hasSome: specificSources } },
        { tags: { isEmpty: true } },   // untagged items are always eligible
      ];
    }

    // ── MST ROUTING (Junior Suite, Academia) ─────────────────────────────────
    // When the profile has an MST config, resolve the current phase and:
    //  - During the routing module: no track filter applied
    //  - After routing: assign track to metadata (once) and filter by track
    const totalNonPretestResponses = session.responses.filter((r) => !r.isPretest).length;
    if (profile.mst?.enabled) {
      const mstPhase = resolveMstPhase(
        meta,
        totalNonPretestResponses,
        state.theta,
        profile.mst
      );

      // Persist track assignment on the first call after routing completes
      if (mstPhase.shouldAssignTrack && mstPhase.trackLabel) {
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            metadata: {
              ...meta,
              mstTrack: mstPhase.trackLabel,
              mstRoutingTheta: mstPhase.routingTheta,
            }
          }
        });
        // Update local meta so the track filter below sees the new value
        meta.mstTrack = mstPhase.trackLabel;
      }

      // Apply MST track filter to the Prisma where clause
      const trackFilter = buildMstTagFilter(mstPhase);
      if (trackFilter) {
        // Merge: if OR already set (exam sources), nest inside an AND
        if (whereClause.OR) {
          whereClause.AND = [{ OR: whereClause.OR }, trackFilter];
          delete whereClause.OR;
        } else {
          Object.assign(whereClause, trackFilter);
        }
      }
    }

    const dbItems = await getCachedItems(whereClause);
    const itemPool: Item[] = dbItems.map((di) => dbItemToEngineItem(di));

    // ── WARM-UP FILTERING ─────────────────────────────────────────────────────
    // For the first N items across all sections, restrict to easier items so
    // candidates build confidence before harder adaptive items appear.
    const operationalPool = itemPool.filter((item) => {
      if (item.isPretest) return false;
      if (totalNonPretestResponses < profile.warmupItems) {
        // Warm-up window: only items with b ≤ θ + offset
        return item.params.b <= state.theta + profile.warmupDifficultyOffset;
      }
      return true;
    });

    // If warm-up filter empties the pool, fall back to full operational pool
    const selectionPool =
      operationalPool.length > 0
        ? operationalPool
        : itemPool.filter((item) => !item.isPretest);

    // ── CAT SELECTION (composite α/β/γ/δ + shadow-test + sequencing) ─────────
    // Build administeredItems from pool (items already used in this session)
    const itemById = new Map<string, Item>(itemPool.map((i) => [i.id, i]));
    const administeredItems: Item[] = session.responses
      .map((r) => itemById.get(r.itemId))
      .filter((i): i is Item => i != null);

    const seqCtx: SequencingContext = {
      administeredItems,
      responses: state.responses,
      plannedTotal: profile.globalMaxItems,
      totalAdministeredAcrossAllSections: session.responses.length,
      profile,
    };

    const catSelector = getCATSelector(profile);
    const catResult = await catSelector.selectNext(
      selectionPool as ShadowItem[],
      state,
      seqCtx,
      profile.blueprint,
      engine.getConfig().useRlSelector === true,
    );
    const nextItem = catResult?.item ?? null;
    if (!nextItem) {
      // No more items in this section — force advance
      logger.warn(
        {
          sessionId,
          skill: currentSkill,
          profileName: profile.name,
          sectionIndex,
          sectionCount,
          usedItemCount: state.usedItemIds.size,
        },
        "NO_ITEMS_LEFT_IN_SECTION: item bank exhausted or empty for this skill — force-advancing. " +
        "Check item bank coverage for this profile and ensure sufficient ACTIVE items exist per section."
      );
      const newSectionIndex = sectionIndex + 1;
      if (newSectionIndex >= activeSectionOrder.length) {
        await this.finalizeSession(sessionId, session.theta, { stopReason: "ALL_SECTIONS_COMPLETE" });
        return { stop: true, reason: "ALL_SECTIONS_COMPLETE", finalTheta: session.theta };
      }
      const nextSkill = activeSectionOrder[newSectionIndex];
      await prisma.session.update({
        where: { id: sessionId },
        data: { metadata: { ...meta, sectionIndex: newSectionIndex } }
      });
      return {
        stop: false,
        sectionTransition: true,
        completedSection: currentSkill as string,
        nextSection: nextSkill as string,
        sectionIndex: newSectionIndex,
        totalSections: activeSectionOrder.length,
        sectionProgress: sectionCount,
        reason: "NO_ITEMS_LEFT_IN_SECTION",
      };
    }

    // ── ANSWER SECURITY ──────────────────────────────────────────────────────
    // Strip sensitive answer/rubric fields before sending to client.
    // Scoring always happens server-side; the client never receives the key.
    const safeContent = { ...(nextItem.metadata || {}) };

    // Shuffle MCQ options deterministically per (session, item) to prevent
    // position bias (all-A / all-C patterns) from being exploited by candidates.
    // The shuffle is re-derived at scoring time from the same seed so no extra
    // DB state is required.
    const mcqShuffleResult = shuffleMcqOptions(
      safeContent.options,
      safeContent.correctAnswer,
      sessionId,
      nextItem.id,
    );
    if (mcqShuffleResult) {
      safeContent.options = mcqShuffleResult.shuffledOptions;
      // Keep a hash of the shuffled answer for server-side scoring — stored
      // transiently in safeContent only so it is available in submitResponse
      // via the same shuffle function (no need to embed it in the payload).
    }

    delete (safeContent as any).correctAnswer;
    delete (safeContent as any).correctOptionIndex;
    delete (safeContent as any).rubric;

    // Compute elapsed time to send alongside the item so the UI can render
    // an accurate progress indicator without a separate status round-trip.
    const elapsedMs = session.startedAt ? Date.now() - session.startedAt.getTime() : 0;

    return {
      stop: false,
      sectionTransition: false,
      item: { ...nextItem, metadata: safeContent },
      currentSection: currentSkill as string,
      sectionIndex,
      totalSections: activeSectionOrder.length,
      sectionProgress: sectionCount,
      productLine: profile.name,
      elapsedMs,
      maxDurationMs: profile.maxDurationMs,
    };
  },

  /**
   * Submit a response
   */
  async submitResponse(sessionId: string, itemId: string, value: any, clientLatencyMs?: number) {
    const engine = await getEngine();
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { responses: true }
    });

    if (!session || session.status !== SessionStatus.IN_PROGRESS) {
      throw new Error("Invalid session");
    }

    const dbItem = await prisma.item.findUnique({
      where: { id: itemId }
    });
    if (!dbItem) throw new Error("Item not found");

    const item: Item = dbItemToEngineItem(dbItem);

    // Calculate score
    let score = 0;
    let aiResult = null;
    let scoringDecision = null;

    if (item.metadata?.correctIndex !== undefined) {
      score = value === item.metadata?.correctIndex ? 1 : 0;
    } else if (item.metadata?.correctAnswer !== undefined && typeof value === 'string') {
      const storedCorrect = String(item.metadata.correctAnswer).trim().toUpperCase();
      const candidateAnswer = value.trim().toUpperCase();

      // For MCQ letter answers (A/B/C/D) re-derive the shuffled position
      if (/^[A-D]$/.test(storedCorrect) && /^[A-D]$/.test(candidateAnswer)) {
        const shuffleResult = shuffleMcqOptions(
          item.metadata?.options,
          storedCorrect,
          sessionId,
          itemId,
        );
        const effectiveCorrect = shuffleResult ? shuffleResult.newCorrectAnswer : storedCorrect;
        score = candidateAnswer === effectiveCorrect ? 1 : 0;
      } else {
        // FILL_IN_BLANKS: compare text answers case-insensitively
        score = value.trim().toLowerCase() === String(item.metadata.correctAnswer).trim().toLowerCase() ? 1 : 0;
      }
    } else if (item.metadata?.options && Array.isArray(item.metadata?.options) && typeof value === 'number') {
      const option = item.metadata?.options[value];
      score = option && option.isCorrect ? 1 : 0;
    } else {
      // WRITING / SPEAKING — use async queue (fire-and-forget).
      // The response row is saved immediately with score=0 / isPretest=true so
      // theta estimation is unaffected; the queue updates the row when AI returns.
      // This prevents 100 × 30 s open HTTP connections under concurrent load.
      aiResult = { requiresHumanReview: true, pendingAsyncScore: true };
      score = 0; // Conservative; overwritten by scoring-queue when AI completes
    }

    const state = toEngineState(session);

    const requiresHumanReview = (aiResult as any)?.requiresHumanReview === true;

    // N+1 fix: use item bank cache instead of a raw findMany per session
    const usedItems = await getItemsByIds(Array.from(state.usedItemIds));

    const itemDict: Record<string, Item> = { [item.id]: item };
    for (const u of usedItems) {
      itemDict[u.id] = dbItemToEngineItem(u);
    }

    const cfg = engine.getConfig();
    let irtInputScore = score;
    let rtZ: number | null = null;
    let rtFlag: string | null = null;
    if (
      cfg.useRtIrt === true &&
      typeof clientLatencyMs === "number" &&
      clientLatencyMs > 0
    ) {
      const history = buildRtHistoryForPersonSpeed(state, itemDict);
      const { tau } = estimateSpeed(history);
      const rtParams = responseTimeParamsFromItemContent(item.metadata);
      const aberrant = detectAberrantResponseTime(
        clientLatencyMs,
        tau,
        rtParams,
        itemId
      );
      irtInputScore = responseTimeAdjustedScore(score, aberrant);
      rtZ = aberrant.zScore;
      rtFlag = aberrant.flag;
    }

    const response: Response = {
      itemId,
      score: irtInputScore,
      // Treat AI-failed productive items as pretest to exclude from theta until reviewed
      isPretest: item.isPretest || requiresHumanReview,
      latencyMs:
        typeof clientLatencyMs === "number" && clientLatencyMs > 0
          ? clientLatencyMs
          : 0,
    };

    // Update session state using the engine
    const rawState = engine.processResponse(state, response, itemDict);

      // Theta bounds guard: NaN or out-of-range theta is a sign of numerical instability
      const newTheta = rawState.theta;
      if (!Number.isFinite(newTheta) || newTheta < -6 || newTheta > 6) {
        logger.warn(
          { sessionId, itemId, rawTheta: newTheta },
          "Theta out of bounds — clamping to [-6, 6]"
        );
        rawState.theta = Math.max(-6, Math.min(6, Number.isFinite(newTheta) ? newTheta : 0));
      }
      const newState = rawState;
            
            // Persist response and update session
            const [savedResponse] = await prisma.$transaction([
              prisma.response.create({
                data: {
                  sessionId,
                  itemId,
                  value: typeof value === 'string' ? value : JSON.stringify(value),
          score,
          adjustedScore:
            cfg.useRtIrt &&
            typeof clientLatencyMs === "number" &&
            clientLatencyMs > 0
              ? irtInputScore
              : null,
          isCorrect: score >= 0.5,
          isPretest: item.isPretest || dbItem.status === "PRETEST" || requiresHumanReview || false,
          aiScore: aiResult?.score,
          latencyMs: typeof clientLatencyMs === 'number' && clientLatencyMs > 0 ? clientLatencyMs : 0,
          rtZScore: rtZ,
          rtFlag: rtFlag,
          order: session.responses.length + 1,
          metadata: aiResult ? {
            aiFeedback: (aiResult as any).feedback,
            confidence: (aiResult as any).confidence,
            speakingFeatures: (aiResult as any).speakingFeatures,
            cefrLevel: (aiResult as any).cefrLevel,
            rubricScores: (aiResult as any).rubricScores,
            corrections: (aiResult as any).corrections,
            transcript: (aiResult as any).transcript,
            scoreSource: (aiResult as any).scoreSource ?? scoringDecision?.scoreSource,
            reviewReasons: (aiResult as any).reviewReasons ?? scoringDecision?.reviewReasons,
            agreementDelta: scoringDecision?.agreementDelta,
            model: scoringDecision?.model,
            modelVersion: scoringDecision?.modelVersion,
            scoringPasses: scoringDecision?.scoringPasses,
            // Async scoring marker — updated by scoring-queue when AI returns
            pendingAsyncScore: (aiResult as any).pendingAsyncScore ?? false,
          } : undefined
        } as any
      }),
      prisma.session.update({
        where: { id: sessionId },
        data: {
          theta: newState.theta,
          sem: newState.sem,
          metadata: {
            ...((session.metadata as Record<string, unknown> | null) || {}),
            ...(newState.mstRouteKey != null ? { mstRouteKey: newState.mstRouteKey } : {}),
            ...(newState.skillProfiles && Object.keys(newState.skillProfiles).length
              ? { skillProfiles: newState.skillProfiles }
              : {}),
            ...(newState.mirtAbilityVector
              ? { mirtAbilityVector: newState.mirtAbilityVector }
              : {}),
            ...(newState.mirt2B ? { mirt2B: newState.mirt2B } : {}),
          } as Prisma.InputJsonValue,
        }
      })
    ]);

    // Async AI scoring: dispatch WRITING / SPEAKING jobs to the queue (fire-and-forget).
    // The queue updates the response row when Gemini returns; the client polls for the score.
    const itemSkill = String(item.skill).toUpperCase();
    if ((itemSkill === "WRITING" || itemSkill === "SPEAKING") && (aiResult as any)?.pendingAsyncScore) {
      const prompt = item.metadata?.prompt || "Please respond to the task.";
      enqueueScoringJob({
        sessionId,
        responseId: savedResponse.id,
        itemId,
        skill: itemSkill as "WRITING" | "SPEAKING",
        value: value as string | { audio: string; mimeType: string },
        prompt,
      });
      // Do NOT await — fire-and-forget so HTTP response returns immediately
    }

    // Online item calibration — fire-and-forget, won't block the response
    CalibrationService.recalibrateItem(itemId).catch(() => {});

    // ── Clickstream: append item-level behavioural record to session metadata ─
    // We build a minimal ItemClickstream from server-observable signals:
    //   - responseTimeMs from clientLatencyMs (best available proxy for RT)
    //   - keystrokes / events are zero since we don't track DOM events server-side
    //   - focusLossCount = 0 (front-end may supply via a separate endpoint)
    // This is enough for the HMM to classify Engaged vs. Rapid-guess on RT alone.
    if (typeof clientLatencyMs === "number" && clientLatencyMs > 0) {
      const newClickstreamEntry: ItemClickstream = {
        itemId,
        responseTimeMs: clientLatencyMs,
        keystrokes: 0,
        mouseClicks: 0,
        focusLossCount: 0,
        revisitCount: 0,
        events: [],
      };
      // Fire-and-forget: append ONLY the clickstreams array via jsonb_set so this
      // write never overwrites concurrently-updated fields (e.g. sectionIndex set
      // by getNextItem that is already in flight when this promise resolves).
      prisma.$executeRaw`
        UPDATE "Session"
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'),
          '{clickstreams}',
          COALESCE(metadata->'clickstreams', '[]') || ${JSON.stringify([newClickstreamEntry])}::jsonb
        )
        WHERE id = ${sessionId}
      `.catch(() => {});
    }

    return { 
      success: true, 
      theta: newState.theta, 
      sem: newState.sem,
      isCorrect: score >= 0.5,
      aiResult,
      skillProfiles: newState.skillProfiles
    };
  },

  /**
   * Finalize a session: set status to COMPLETED, calculate CEFR, and create a full
   * diagnostic ScoreReport including per-skill CIs, Can-Do statements, and MIRT vector.
   */
  async finalizeSession(
    sessionId: string,
    theta: number,
    opts?: { stopReason?: string | null }
  ) {
    const engine = await getEngine();
    const cefrLevel = engine.mapToCefr(theta);

    // Simple scaled score: map [-4,4] → [0,100]
    const scaledScore = Math.max(0, Math.min(100, Math.round(((theta + 4) / 8) * 100)));

    // Fetch full session including responses and MIRT profiles stored in metadata
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { responses: { include: { item: true } } },
    });

    // ── Build per-skill diagnostic sub-reports ────────────────────────────────
    type SkillSubReport = {
      theta: number;
      sem: number;
      cefr: string;
      scaledScore: number;
      confidenceInterval: [number, number];
      canDoStatements: string[];
    };

    const skillSubReports: Partial<Record<SkillType, SkillSubReport>> = {};
    const skillScoresForDb: Record<string, number | null> = {
      readingScore: null, listeningScore: null, writingScore: null,
      speakingScore: null, grammarScore: null, vocabularyScore: null,
    };

    const SKILL_DB_MAP: Record<string, string> = {
      [SkillType.READING]: "readingScore",
      [SkillType.LISTENING]: "listeningScore",
      [SkillType.WRITING]: "writingScore",
      [SkillType.SPEAKING]: "speakingScore",
      [SkillType.GRAMMAR]: "grammarScore",
      [SkillType.VOCABULARY]: "vocabularyScore",
    };

    // Group non-pretest responses by skill and re-estimate theta per skill
    if (session) {
      const { estimateTheta: estimateThetaFn } = await import("./estimator.js");
      const itemDict: Record<string, Item> = {};
      for (const r of session.responses) {
        if (r.item) {
          itemDict[r.item.id] = dbItemToEngineItem(r.item);
        }
      }

      for (const skill of Object.values(SkillType)) {
        const skillResponses = session.responses
          .filter(r => !r.isPretest && r.item?.skill === skill && r.score !== null)
          .map(r => ({
            itemId: r.itemId,
            score:
              (r.adjustedScore != null && Number.isFinite(r.adjustedScore)
                ? r.adjustedScore
                : r.score) ?? 0,
            isPretest: false,
            latencyMs: r.latencyMs,
          }));

        if (skillResponses.length === 0) continue;

        const { theta: sTheta, sem: sSem } = estimateThetaFn(
          skillResponses,
          itemDict,
          0,
          1,
          { useGrmProductive: engine.getConfig().useGrmProductive === true }
        );
        const skillCefr = engine.mapToCefr(sTheta);
        const canDos = getCanDo(skillCefr as any, skill.toLowerCase() as any);
        const canDoStatements = canDos.flatMap(d => d.descriptors).slice(0, 4);
        const lo = Number((sTheta - 1.96 * sSem).toFixed(3));
        const hi = Number((sTheta + 1.96 * sSem).toFixed(3));
        const sScaled = Math.max(0, Math.min(100, Math.round(((sTheta + 4) / 8) * 100)));

        skillSubReports[skill] = {
          theta: sTheta,
          sem: sSem,
          cefr: skillCefr,
          scaledScore: sScaled,
          confidenceInterval: [lo, hi],
          canDoStatements,
        };

        const dbKey = SKILL_DB_MAP[skill];
        if (dbKey) skillScoresForDb[dbKey] = sScaled;
      }
    }

    // ── Overall CI ─────────────────────────────────────────────────────────────
    const sessionSem = session?.sem ?? 1;
    const overallCI: [number, number] = [
      Number((theta - 1.96 * sessionSem).toFixed(3)),
      Number((theta + 1.96 * sessionSem).toFixed(3)),
    ];

    const overallCanDo = getCanDo(cefrLevel as any);
    const mirtVector = (session?.metadata as any)?.mirtAbilityVector ?? null;
    const mirt2B = (session?.metadata as any)?.mirt2B ?? null;

    const stopReason = opts?.stopReason ?? (session?.metadata as { stopReason?: string } | null)?.stopReason ?? null;
    const sessionMeta = (session?.metadata as Record<string, unknown> | null) ?? {};
    const sessionProductLine: string | null = (sessionMeta.productLine as string) ?? null;
    const sessionMstTrack: string | null = (sessionMeta.mstTrack as string) ?? null;
    const sessionProfile = getProfile(sessionProductLine);
    const stoppingRule = {
      globalMaxItems: sessionProfile.globalMaxItems,
      globalSemThreshold: sessionProfile.globalSemThreshold,
    };

    // Compact skill profile snapshot for session metadata (theta + SEM only)
    const skillProfilesSnapshot: Record<string, { theta: number; sem: number }> = {};
    for (const [skill, report] of Object.entries(skillSubReports)) {
      if (report) {
        skillProfilesSnapshot[skill] = { theta: report.theta, sem: report.sem };
      }
    }

    const ec = engine.getConfig();
    const opCount =
      session?.responses?.filter((r) => !r.isPretest).length ?? 0;
    const testInfo = sessionSem > 0 ? 1 / (sessionSem * sessionSem) : 0;
    const psychometrics = {
      operationalItemCount: opCount,
      testInformation: Number(testInfo.toFixed(2)),
      marginalReliabilityApprox:
        sessionSem > 0
          ? Number((1 - Math.min(1, sessionSem * sessionSem)).toFixed(3))
          : null,
      featureFlags: {
        useRtIrt: ec.useRtIrt === true,
        useGrmProductive: ec.useGrmProductive === true,
        useMirt2B: ec.useMirt2B === true,
        useMirt: ec.useMirt === true,
        mstEnabled: ec.mst?.enabled === true,
        sprtEnabled: ec.sprt?.enabled === true,
        useShadowTest: ec.useShadowTest === true,
        // Faz 2–3 features — always active regardless of config flags
        daveyParshallExposureControl: true,
        klInformationSelection: true,
        onlineCalibrationStockingEM: true,
        itemParameterDriftLordChiSq: true,
        personFitDrasgowLzECI: true,
        answerCopyingWollackOmega: true,
        collusionGraphDetection: true,
        clickstreamHmmAnalysis: true,
        mirt4DCompensatory: true,
        gdinaDiagnosticFeedback: true,
        rlItemSelector: ec.useRlSelector === true,
      },
    };

    // ── Classification Consistency (Livingston-Lewis) ─────────────────────────
    const classificationResult = classifyCandidate(theta, sessionSem);
    const consistencyReport = computeConsistencyReport(theta, sessionSem);

    // ── Person-Fit (Drasgow Lz + ECI + U3) ───────────────────────────────────
    const allItems = session
      ? session.responses.map(r => r.item).filter(Boolean).map(dbItemToEngineItem)
      : [];
    const personFitResult = session
      ? computePersonFit({
          responses: session.responses.map(r => ({
            itemId: r.itemId,
            score: r.score ?? 0,
            isPretest: r.isPretest ?? false,
            latencyMs: r.latencyMs ?? undefined,
          })),
          items: allItems,
          theta,
        })
      : null;

    // ── MIRT 4D profile ────────────────────────────────────────────────────────
    const mirt4DProfile = (() => {
      if (!session) return null;
      const opResponses = session.responses.filter(r => !r.isPretest && r.score !== null);
      if (opResponses.length === 0) return null;
      const obs: Mirt4DObservation[] = opResponses
        .map(r => {
          const item = allItems.find(it => it.id === r.itemId);
          if (!item) return null;
          return {
            score: ((r.score ?? 0) > 0.5 ? 1 : 0) as 0 | 1,
            params: unidimTo4DParams(
              item.params.a,
              item.params.b,
              item.params.c,
              (item.skill as string) ?? "DEFAULT",
            ),
          };
        })
        .filter((x): x is Mirt4DObservation => x !== null);
      if (obs.length === 0) return null;
      const profile = estimate4DTheta(obs);
      return {
        theta: profile.theta,
        sem: profile.sem,
        traceCovariance: profile.traceCovariance,
        composite: compositeTheta(profile),
        compositeSem: compositeSem(profile),
        dimensionLabels: [
          "Receptive (Reading/Listening)",
          "Productive (Writing/Speaking)",
          "Grammatical Accuracy (Grammar/Vocabulary)",
          "Strategic Competence (Discourse/Pragmatics)",
        ],
      };
    })();

    // ── Clickstream behavioural analysis ─────────────────────────────────────
    const behaviourProfile = (() => {
      if (!session) return null;
      const meta = (session.metadata as Record<string, unknown> | null) ?? {};
      const rawClickstreams = (meta.clickstreams as ItemClickstream[] | undefined) ?? [];
      if (rawClickstreams.length === 0) return null;
      const profile = analyseClickstream(rawClickstreams);
      return {
        itemCount: profile.itemCount,
        meanResponseTime: profile.meanResponseTime,
        cvResponseTime: profile.cvResponseTime,
        stateProportions: profile.stateProportions,
        focusLossProportion: profile.focusLossProportion,
        revisionRate: profile.revisionRate,
        rapidGuessCount: profile.rapidGuessCount,
        lowEffortFlag: profile.lowEffortFlag,
        riskLevel: profile.riskLevel,
      };
    })();

    // ── G-DINA diagnostic feedback ──────────────────────────────────────────────────
    const gdinaDiagnostic = (() => {
      if (!session) return null;
      const opResponses = session.responses.filter(r => !r.isPretest && r.score !== null);
      const J = LINGUADAPT_QMATRIX.length;
      if (opResponses.length < Math.ceil(J / 2)) return null; // need at least half the items

      // Build a response vector aligned to the prototype Q-matrix.
      // We use the first J operational responses for the CDM estimation.
      const responseVector = LINGUADAPT_QMATRIX.map((_, j) => {
        const r = opResponses[j % opResponses.length];
        return r ? ((r.score ?? 0) > 0.5 ? 1 : 0) : 0;
      });

      // Use precomputed Q-matrix; in production supply a full item-bank Q-matrix.
      const responses = [responseVector]; // single examinee
      try {
        const model = estimateGdina(responses, LINGUADAPT_QMATRIX, 50); // fast: 50 iter
        const classification = classifyExamineeGdina(responseVector, model);
        const feedback = generateDiagnosticFeedback(classification, LINGUADAPT_ATTRIBUTES);
        return {
          overallMasteryRate: feedback.overallMasteryRate,
          learningStage: feedback.learningStage,
          primaryWeakness: feedback.primaryWeakness,
          primaryStrength: feedback.primaryStrength,
          mapProfile: feedback.mapProfileString,
          attributes: feedback.attributes,
        };
      } catch {
        return null;
      }
    })();

    // ── Per-session cheating signal (answer-copying self-check) ───────────────
    // Compares the observed response pattern against the expected pattern
    // given the examinee's own θ (self-reference baseline).
    // A flagged result means the pattern is anomalous relative to
    // person-fit AND ω/S2 — this is then surfaced in the admin panel.
    const securityFlag = (() => {
      if (!session || allItems.length < 10) return null;
      const opResponses = session.responses.filter(r => !r.isPretest);
      if (opResponses.length < 10) return null;

      const copyingItems: CopyingItemMeta[] = allItems
        .filter(it => !it.isPretest)
        .map(it => ({ itemId: it.id, params: it.params }));

      const expectedResponses: CopyingResponse[] = copyingItems.map(it => ({
        itemId: it.itemId,
        score: irtProbability(theta, it.params) > 0.5 ? 1 : 0,
      }));

      const observed: CopyingResponse[] = opResponses.map(r => ({
        itemId: r.itemId,
        score: (r.score ?? 0) > 0.5 ? 1 : 0,
      }));

      const result = detectAnswerCopying(
        expectedResponses, observed, theta, theta, copyingItems
      );

      return {
        omega:   result.omega,
        s2:      result.s2,
        kIndex:  result.kIndex,
        kPValue: result.kPValue,
        flagged: result.flagged,
        triggers: result.triggers,
      };
    })();

    // ── Cross-session collusion graph detection ───────────────────────────────
    // Queries sessions completed in the last 24 hours on the same product line
    // and runs the Belov-Armstrong / Wollack collusion graph algorithm (IP
    // proximity + RT correlation + response-pattern overlap).
    const collusionReport = await (async () => {
      if (!session || opCount < 10) return null;
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentSessions = await prisma.session.findMany({
          where: {
            status: "COMPLETED",
            completedAt: { gte: since },
            id: { not: sessionId },
            ...(sessionProductLine ? { metadata: { path: ["productLine"], equals: sessionProductLine } } : {}),
          },
          include: { responses: { where: { isPretest: false }, select: { itemId: true, score: true, latencyMs: true } } },
          take: 50,
          orderBy: { completedAt: "desc" },
        });

        if (recentSessions.length < 2) return null;

        // Build current examinee profile
        const currentResponses: CopyingResponse[] = session.responses
          .filter(r => !r.isPretest)
          .map(r => ({ itemId: r.itemId, score: (r.score ?? 0) > 0.5 ? 1 : 0 }));
        const currentRTs: Record<string, number> = {};
        for (const r of session.responses) {
          if (r.latencyMs) currentRTs[r.itemId] = r.latencyMs;
        }

        const profiles: CollusionExamineeProfile[] = [
          {
            examineeId: sessionId,
            theta,
            responses: currentResponses,
            responseTimes: currentRTs,
          },
          ...recentSessions.slice(0, 20).map(s => ({
            examineeId: s.id,
            theta: s.theta ?? 0,
            responses: s.responses.map(r => ({ itemId: r.itemId, score: (r.score ?? 0) > 0.5 ? 1 : 0 })),
            responseTimes: s.responses.reduce<Record<string, number>>((acc, r) => {
              if (r.latencyMs) acc[r.itemId] = r.latencyMs;
              return acc;
            }, {}),
          })),
        ];

        const itemMetas = allItems.filter(it => !it.isPretest).map(it => ({
          itemId: it.id,
          params: it.params,
        }));

        const report = analyseCollusion(profiles, itemMetas);
        // Only return if current session is involved in a flagged pair
        const involvedPairs = report.flaggedPairs.filter(
          p => p.examineeA === sessionId || p.examineeB === sessionId
        );
        if (involvedPairs.length === 0) return null;
        return {
          flaggedPairs: involvedPairs.length,
          flagRate: report.flagRate,
          involvedWithIds: involvedPairs.map(p => p.examineeA === sessionId ? p.examineeB : p.examineeA),
          riskLevel: report.clusters.find(c => c.members.includes(sessionId))?.riskLevel ?? "LOW",
        };
      } catch {
        return null;
      }
    })();

    const diagnosticReport = {
      overallTheta: theta,
      overallSem: sessionSem,
      overallCefr: cefrLevel,
      confidenceInterval: overallCI,
      canDoStatements: overallCanDo.flatMap(d => d.descriptors).slice(0, 6),
      skillProfiles: skillSubReports,
      mirtAbilityVector: mirtVector,
      mirt2B,
      mirt4D: mirt4DProfile,
      behaviourProfile,
      gdinaDiagnostic,
      stopReason,
      productLine: sessionProductLine,
      mstTrack: sessionMstTrack,
      psychometrics,
      // Livingston-Lewis decision-consistency & classification accuracy
      classificationConsistency: {
        cefrLevel: classificationResult.cefrLevel,
        isBorderline: classificationResult.isBorderline,
        borderlineLevels: classificationResult.borderlineLevels,
        posteriorProbCorrect: classificationResult.posteriorProbCorrect,
        recommendedAction: classificationResult.recommendedAction,
        decisionConsistency: consistencyReport.decisionConsistency,
        classificationAccuracy: consistencyReport.classificationAccuracy,
        meetsHighStakesThreshold: consistencyReport.decisionConsistency >= 0.80,
        meetsPlacementThreshold: consistencyReport.decisionConsistency >= 0.70,
      },
      // Person-fit: Drasgow Lz, ECI, U3 aberrance detection
      personFit: personFitResult
        ? {
            lz: personFitResult.lz,
            eci: personFitResult.eci,
            u3: personFitResult.u3,
            rgi: personFitResult.rgi,
            flag: personFitResult.flag,
            recommendedAction: personFitResult.recommendedAction,
            interpretation: personFitResult.interpretation,
          }
        : null,
      // Test security: per-session anomaly signal (answer-copying self-baseline)
      securityFlag,
      // Cross-session collusion graph (Belov-Armstrong / Wollack, last 24h cohort)
      collusionReport,
      generatedAt: new Date().toISOString(),
    };

    await prisma.$transaction([
      prisma.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.COMPLETED,
          completedAt: new Date(),
          cefrLevel: cefrLevel as any,
          metadata: {
            ...sessionMeta,
            ...(stopReason != null ? { stopReason } : {}),
            skillProfiles: skillProfilesSnapshot,
            ...(sessionMstTrack != null ? { mstTrack: sessionMstTrack } : {}),
            stoppingRule,
          } as Prisma.InputJsonValue,
        }
      }),
      prisma.scoreReport.upsert({
        where: { sessionId },
        create: {
          sessionId,
          overallCefr: cefrLevel as any,
          overallScore: scaledScore,
          ...skillScoresForDb,
          diagnosticReport,
          isVerified: true,
        } as any,
        update: {
          overallCefr: cefrLevel as any,
          overallScore: scaledScore,
          ...skillScoresForDb,
          diagnosticReport,
        } as any,
      }),
    ]);
  },

  /**
   * Get session status
   */
  async getSessionStatus(sessionId: string) {
    const engine = await getEngine();
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { responses: true }
    });

    if (!session) throw new Error("Session not found");
    
    return {
      status: session.status,
      theta: session.theta,
      progress: session.responses.length,
      cefr: engine.mapToCefr(session.theta)
    };
  },

  /**
   * Item Bank Management
   */
  async getAllItems() {
    return prisma.item.findMany({
      include: { assets: true },
      orderBy: { createdAt: "desc" }
    });
  },

  async createItem(data: any) {
    const { assets, ...itemData } = data;
    const parsedContent = typeof itemData.content === "string" ? JSON.parse(itemData.content) : itemData.content;

    // Pre-save validation
    if (itemData.skill && parsedContent) {
      const validation = await validateItemBeforeSave(itemData.skill, parsedContent);
      if (!validation.success) {
        throw AppError.unprocessable(
          `Item validation failed: ${validation.error}`
        );
      }
    }

    const created = await prisma.item.create({
      data: {
        ...itemData,
        content: parsedContent
      },
      include: { assets: true }
    });
    // Attach inline quality report for the caller (not persisted — use /validate endpoint to store)
    const qualityReport = validateItem({
      skill: created.skill,
      cefrLevel: created.cefrLevel,
      type: created.type,
      discrimination: created.discrimination,
      difficulty: created.difficulty,
      guessing: created.guessing,
      content: parsedContent as any,
    });
    return { ...created, qualityReport };
  },

  async updateItem(id: string, data: any) {
    const { assets, ...itemData } = data;
    const parsedContent = itemData.content
      ? (typeof itemData.content === "string" ? JSON.parse(itemData.content) : itemData.content)
      : undefined;

    // Pre-save validation (get skill from existing item if not provided)
    const existingItem = await prisma.item.findUnique({ where: { id } });
    if (!existingItem) {
      throw AppError.notFound("Item not found");
    }
    const skill = itemData.skill || existingItem.skill;
    const contentToValidate = parsedContent ?? existingItem.content;
    if (skill && contentToValidate) {
      const validation = await validateItemBeforeSave(skill, contentToValidate);
      if (!validation.success) {
        throw AppError.unprocessable(
          `Item validation failed: ${validation.error}`
        );
      }
    }

    const updated = await prisma.item.update({
      where: { id },
      data: { ...itemData, content: parsedContent },
      include: { assets: true }
    });
    const qualityReport = validateItem({
      skill: updated.skill,
      cefrLevel: updated.cefrLevel,
      type: updated.type,
      discrimination: updated.discrimination,
      difficulty: updated.difficulty,
      guessing: updated.guessing,
      content: (parsedContent ?? updated.content) as any,
    });
    return { ...updated, qualityReport };
  },

  async deleteItem(id: string) {
    return prisma.item.delete({
      where: { id }
    });
  },

  async addItemAsset(itemId: string, assetData: { type: string; url: string; metadata?: any }) {
    return prisma.asset.create({
      data: {
        itemId,
        type: assetData.type,
        url: assetData.url,
        metadata: assetData.metadata
      }
    });
  },

  async deleteAsset(assetId: string) {
    return prisma.asset.delete({
      where: { id: assetId }
    });
  },

  async getSystemConfig() {
    const configDoc = await prisma.systemConfig.findUnique({ where: { id: "global" } });
    return configDoc?.config || DEFAULT_CONFIG;
  },

  async updateSystemConfig(config: unknown) {
    const safe = parseSystemConfigPayload(config);
    return prisma.systemConfig.upsert({
      where: { id: "global" },
      create: { id: "global", config: safe as Prisma.InputJsonValue },
      update: { config: safe as Prisma.InputJsonValue },
    });
  }
};
