import { AssessmentEngine } from "./engine";
import { SessionState, Item, Response, EngineConfig, SkillType, BlueprintConstraint } from "./types";
import { prisma } from "../prisma";
import { ScoringOrchestrator } from "../scoring/scoring-orchestrator";
import { RatingQueueService } from "../scoring/rating-queue";
import { CalibrationService } from "./calibration-service";
import { SessionStatus, ItemType, CefrLevel } from "@prisma/client";
import { BillingService } from "../enterprise/billing-service";
import { validateItem } from "../language-skills/item-quality-validator.js";
import { logger } from "../observability/index.js";
import { getCanDo, thetaToCefr, CEFR_LEVELS } from "../cefr/cefr-framework.js";
import { initExposureStore, getExposureStore } from "./exposure-store.js";

/** Wraps a promise with a hard timeout to prevent indefinite hangs */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Server-side Assessment Service
 * Manages the lifecycle of test sessions and interacts with the database.
 */

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
      engineInstance = new AssessmentEngine({ 
        ...DEFAULT_CONFIG, 
        cefrThresholds,
        pretestRatio,
        blueprint
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
    
    // --- ENSURE RECORDS EXIST (MOCK SEED) ---
    // If this is a new candidate or organization, create dummy rows to avoid FK errors
    try {
      await prisma.organization.upsert({
        where: { id: organizationId },
        update: {},
        create: { id: organizationId, name: organizationId, slug: organizationId.toLowerCase() + '-' + Date.now() }
      });
      await prisma.user.upsert({
         where: { id: candidateId },
         update: {},
         create: { id: candidateId, organizationId, email: `${candidateId}@b4skills.com`, name: "Candidate" }
      });
    } catch(e) {
      logger.warn({ err: e }, "Could not upsert org/user - moving on");
    }

    // --- CREDIT CHECK ---
    const hasCredits = await BillingService.hasSufficientCredits(organizationId);
    if (!hasCredits) {
      throw new Error("Insufficient assessment credits. Please top up your account.");
    }

    const initialState = engine.initializeSession();
    
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

    // --- CONSUME CREDIT ---
    await BillingService.consumeCredit(organizationId);

    return { sessionId: session.id, status: session.status };
  },

  /**
   * Get the next item for a session
   */
  async getNextItem(sessionId: string) {
    const engine = await getEngine();
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { responses: true }
    });

    if (!session || session.status !== SessionStatus.IN_PROGRESS) {
      throw new Error("Invalid session");
    }

    // Map Prisma session to Engine SessionState
    const state: SessionState = {
      theta: session.theta,
      sem: session.sem,
      responses: session.responses.map(r => ({
        itemId: r.itemId,
        score: r.score || 0,
        isPretest: (r as any).isPretest,
        latencyMs: r.latencyMs
      })),
      usedItemIds: new Set(session.responses.map(r => r.itemId))
    };

    // Check if we should stop
    const stopCheck = engine.shouldStop(state);
    if (stopCheck.stop) {
      await this.finalizeSession(sessionId, session.theta);
      return { stop: true, reason: stopCheck.reason, finalTheta: session.theta };
    }

    // Fetch available items from DB
    let whereClause: any = {
      status: { in: ["ACTIVE", "PRETEST"] },
      id: { notIn: Array.from(state.usedItemIds) }
    };
    
    // Filter by product line / skill if session was launched with a specific one
    const SKILL_TYPES = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"];
    const pLine = (session.metadata as any)?.productLine;
    if (pLine && pLine !== "General") {
      if (SKILL_TYPES.includes(pLine)) {
        // productLine maps directly to a SkillType — filter by skill
        whereClause.skill = pLine;
      } else {
        // productLine is a custom tag (e.g. a course code)
        whereClause.tags = { has: pLine };
      }
    }

    const dbItems = await prisma.item.findMany({
      where: whereClause
    });

    // Map DB items to Engine Item format
    const itemPool: Item[] = dbItems.map(di => ({
      id: di.id,
      skill: di.skill as unknown as SkillType,
      isPretest: (di as any).isPretest || di.status === "PRETEST",
      params: {
        a: di.discrimination,
        b: di.difficulty,
        c: di.guessing
      },
      metadata: di.content as any
    }));

    // Select next item
    const nextItem = engine.getNextItem(state, itemPool);
    if (!nextItem) {
      await this.finalizeSession(sessionId, session.theta);
      return { stop: true, reason: "NO_ITEMS_LEFT", finalTheta: session.theta };
    }

    // ── ANSWER SECURITY ──────────────────────────────────────────────────────
    // Strip sensitive answer/rubric fields before sending to client.
    // Scoring always happens server-side; the client never receives the key.
    const safeContent = { ...(nextItem.metadata || {}) };
    delete safeContent.correctAnswer;
    delete safeContent.correctOptionIndex;
    delete safeContent.rubric;

    return { stop: false, item: { ...nextItem, metadata: safeContent } };
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

    const item: Item = {
      id: dbItem.id,
      skill: dbItem.skill as unknown as SkillType,
      isPretest: (dbItem as any).isPretest || dbItem.status === "PRETEST",
      params: {
        a: dbItem.discrimination,
        b: dbItem.difficulty,
        c: dbItem.guessing
      },
      metadata: dbItem.content as any
    };

    // Calculate score
    let score = 0;
    let aiResult = null;
    let scoringDecision = null;

    if (item.metadata?.correctIndex !== undefined) {
      score = value === item.metadata?.correctIndex ? 1 : 0;
    } else if (item.metadata?.correctAnswer !== undefined && typeof value === 'string') {
      // FILL_IN_BLANKS: compare text answers case-insensitively
      score = value.trim().toLowerCase() === String(item.metadata.correctAnswer).trim().toLowerCase() ? 1 : 0;
    } else if (item.metadata?.options && Array.isArray(item.metadata?.options) && typeof value === 'number') {
      const option = item.metadata?.options[value];
      score = option && option.isCorrect ? 1 : 0;
    } else {
      try {
        const prompt = item.metadata?.prompt || "Please respond to the task.";
        const itemSkill = String(item.skill).toUpperCase();
        
        if (itemSkill === "WRITING") {
          scoringDecision = await withTimeout(
            ScoringOrchestrator.scoreWriting(String(value), prompt),
            30_000,
            "Writing AI scoring"
          );
        } else if (itemSkill === "SPEAKING") {
          // Check if value is multimodal (audio + mimeType)
          if (typeof value === "object" && value.audio && value.mimeType) {
            scoringDecision = await withTimeout(
              ScoringOrchestrator.scoreSpeaking(value.audio, value.mimeType, prompt),
              30_000,
              "Speaking AI scoring"
            );
          } else {
            // Fallback for text-only or simulated speaking
            scoringDecision = await withTimeout(
              ScoringOrchestrator.scoreSpeakingFromText(String(value), prompt),
              30_000,
              "Speaking (text) AI scoring"
            );
          }
        }
        
        if (scoringDecision) {
          aiResult = scoringDecision.aiResult;
          score = scoringDecision.score;
        }
      } catch (error) {
        logger.error({ err: error, sessionId, itemId }, "AI scoring failed — enqueuing for human review");
        // Do NOT use 0.5 — that biases theta upward for every AI failure.
        // Mark the response as requiring human review; exclude from theta estimation
        // by setting isPretest=true temporarily until a human scores it.
        score = 0; // Conservative fallback; overwritten when human review resolves
        // Flag for human review queue — response will be saved with requiresHumanReview
        aiResult = { requiresHumanReview: true, failureReason: "ai_scoring_error" };
      }
    }

    // Map Prisma session to Engine SessionState
    const state: SessionState = {
      theta: session.theta,
      sem: session.sem,
      responses: session.responses.map(r => ({
        itemId: r.itemId,
        score: r.score || 0,
        isPretest: (r as any).isPretest,
        latencyMs: r.latencyMs
      })),
      usedItemIds: new Set(session.responses.map(r => r.itemId))
    };

    const requiresHumanReview = (aiResult as any)?.requiresHumanReview === true;

    const response: Response = {
      itemId,
      score,
      // Treat AI-failed productive items as pretest to exclude from theta until reviewed
      isPretest: item.isPretest || requiresHumanReview,
      latencyMs: typeof clientLatencyMs === 'number' && clientLatencyMs > 0 ? clientLatencyMs : 0 
    };

      // Fetch previously used items to calculate new theta correctly
      const usedItems = await prisma.item.findMany({
        where: { id: { in: Array.from(state.usedItemIds) } }
      });
      
      const itemDict: Record<string, Item> = { [item.id]: item };
      usedItems.forEach(u => {
        itemDict[u.id] = {
          id: u.id,
          skill: u.skill as unknown as SkillType,
          isPretest: (u as any).isPretest || u.status === "PRETEST",
          params: { a: u.discrimination, b: u.difficulty, c: u.guessing },
          metadata: u.content as any
        };
      });

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
          isCorrect: score >= 0.5,
          isPretest: item.isPretest || false,
          aiScore: aiResult?.score,
          latencyMs: typeof clientLatencyMs === 'number' && clientLatencyMs > 0 ? clientLatencyMs : 0,
          order: session.responses.length + 1,
          metadata: aiResult ? {
            aiFeedback: aiResult.feedback, 
            confidence: aiResult.confidence,
            speakingFeatures: aiResult.speakingFeatures,
            cefrLevel: aiResult.cefrLevel,
            rubricScores: aiResult.rubricScores,
            corrections: aiResult.corrections,
            transcript: aiResult.transcript,
            scoreSource: scoringDecision?.scoreSource,
            reviewReasons: scoringDecision?.reviewReasons,
            agreementDelta: scoringDecision?.agreementDelta,
            model: scoringDecision?.model,
            modelVersion: scoringDecision?.modelVersion,
            scoringPasses: scoringDecision?.scoringPasses
          } : undefined
        } as any
      }),
      prisma.session.update({
        where: { id: sessionId },
        data: {
          theta: newState.theta,
          sem: newState.sem
        }
      })
    ]);

    // Enqueue for human review if needed
    if (scoringDecision?.requiresHumanReview) {
      await RatingQueueService.enqueue({
        sessionId,
        itemId,
        type: item.skill as any,
        content: value,
        aiResult: {
          ...aiResult,
          reviewReasons: scoringDecision.reviewReasons,
          agreementDelta: scoringDecision.agreementDelta,
          scoreSource: scoringDecision.scoreSource,
          scoringPasses: scoringDecision.scoringPasses
        }
      });
    } else if (!aiResult && (item.skill === "WRITING" || item.skill === "SPEAKING")) {
      // Enqueue if AI failed completely
      await RatingQueueService.enqueue({
        sessionId,
        itemId,
        type: item.skill as any,
        content: value
      });
    }

    // Check if we should stop after this response
    const stopCheck = engine.shouldStop(newState);
    if (stopCheck.stop) {
      await this.finalizeSession(sessionId, newState.theta);
    }

    // Online item calibration — fire-and-forget, won't block the response
    CalibrationService.recalibrateItem(itemId).catch(() => {});

    // Persist per-skill theta profiles back to session metadata
    const profileUpdate = newState.skillProfiles
      ? { skillProfiles: newState.skillProfiles }
      : {};

    return { 
      success: true, 
      theta: newState.theta, 
      sem: newState.sem,
      isCorrect: score >= 0.5,
      aiResult,
      isCompleted: stopCheck.stop,
      skillProfiles: newState.skillProfiles
    };
  },

  /**
   * Finalize a session: set status to COMPLETED, calculate CEFR, and create a full
   * diagnostic ScoreReport including per-skill CIs, Can-Do statements, and MIRT vector.
   */
  async finalizeSession(sessionId: string, theta: number) {
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
          itemDict[r.item.id] = {
            id: r.item.id,
            skill: r.item.skill as unknown as SkillType,
            isPretest: r.isPretest,
            params: { a: r.item.discrimination, b: r.item.difficulty, c: r.item.guessing },
            metadata: r.item.content as any,
          };
        }
      }

      for (const skill of Object.values(SkillType)) {
        const skillResponses = session.responses
          .filter(r => !r.isPretest && r.item?.skill === skill && r.score !== null)
          .map(r => ({
            itemId: r.itemId,
            score: r.score ?? 0,
            isPretest: false,
            latencyMs: r.latencyMs,
          }));

        if (skillResponses.length === 0) continue;

        const { theta: sTheta, sem: sSem } = estimateThetaFn(skillResponses, itemDict);
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

    const diagnosticReport = {
      overallTheta: theta,
      overallSem: sessionSem,
      overallCefr: cefrLevel,
      confidenceInterval: overallCI,
      canDoStatements: overallCanDo.flatMap(d => d.descriptors).slice(0, 6),
      skillProfiles: skillSubReports,
      mirtAbilityVector: mirtVector,
      generatedAt: new Date().toISOString(),
    };

    await prisma.$transaction([
      prisma.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.COMPLETED, completedAt: new Date(), cefrLevel: cefrLevel as any }
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

  async updateSystemConfig(config: any) {
    return prisma.systemConfig.upsert({
      where: { id: "global" },
      create: { id: "global", config },
      update: { config }
    });
  }
};
