import { AssessmentEngine } from "./engine";
import { SessionState, Item, Response, EngineConfig, SkillType } from "./types";
import { prisma } from "../prisma";
import { GeminiScoringService } from "../scoring/gemini-scoring-service";
import { RatingQueueService } from "../scoring/rating-queue";
import { SessionStatus, ItemType, CefrLevel } from "@prisma/client";

import { BillingService } from "../enterprise/billing-service";

/**
 * Server-side Assessment Service
 * Manages the lifecycle of test sessions and interacts with the database.
 */

const DEFAULT_CONFIG: EngineConfig = {
  minItems: 3,
  maxItems: 15,
  semThreshold: 0.3,
  startingTheta: 0.0,
  startingSem: 1.0,
  pretestRatio: 0.1, // 10% of items are pretest
  cefrThresholds: {
    A1: -2.5,
    A2: -1.5,
    B1: -0.5,
    B2: 0.5,
    C1: 1.5,
    C2: 2.5
  }
};

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
      
      engineInstance = new AssessmentEngine({ 
        ...DEFAULT_CONFIG, 
        cefrThresholds,
        pretestRatio
      });
      lastConfigUpdate = now;
    } catch (error) {
      console.error("Failed to load dynamic engine config, using defaults:", error);
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
      console.warn("Could not upsert org/user - moving on", e);
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

    return { stop: false, item: nextItem };
  },

  /**
   * Submit a response
   */
  async submitResponse(sessionId: string, itemId: string, value: any) {
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

    if (item.metadata.correctIndex !== undefined) {
      score = value === item.metadata.correctIndex ? 1 : 0;
    } else if (item.metadata.options && Array.isArray(item.metadata.options) && typeof value === 'number') {
      const option = item.metadata.options[value];
      score = option && option.isCorrect ? 1 : 0;
    } else {
      try {
        const prompt = item.metadata.prompt || "Please respond to the task.";
        const itemSkill = String(item.skill).toUpperCase();
        
        if (itemSkill === "WRITING") {
          aiResult = await GeminiScoringService.scoreWriting(value, prompt);
        } else if (itemSkill === "SPEAKING") {
          // Check if value is multimodal (audio + mimeType)
          if (typeof value === "object" && value.audio && value.mimeType) {
            aiResult = await GeminiScoringService.scoreSpeaking(value.audio, value.mimeType, prompt);
          } else {
            // Fallback for text-only or simulated speaking
            aiResult = await GeminiScoringService.scoreWriting(value, prompt);
          }
        }
        
        if (aiResult) {
          score = aiResult.score;
        }
      } catch (error) {
        console.error("AI Scoring failed, enqueuing for human review...");
        score = 0.5;
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

    const response: Response = {
      itemId,
      score,
      isPretest: item.isPretest,
      latencyMs: 0 
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
      const newState = engine.processResponse(state, response, itemDict);
            
            // Persist response and update session
            const [savedResponse] = await prisma.$transaction([
              prisma.response.create({
                data: {
                  sessionId,
                  itemId,
                  value: typeof value === 'string' ? value : JSON.stringify(value),
          score,
          isCorrect: score === 1,
          isPretest: item.isPretest || false,
          aiScore: aiResult?.score,
          order: session.responses.length + 1,
          metadata: aiResult ? { 
            aiFeedback: aiResult.feedback, 
            confidence: aiResult.confidence,
            speakingFeatures: aiResult.speakingFeatures,
            cefrLevel: aiResult.cefrLevel,
            rubricScores: aiResult.rubricScores,
            corrections: aiResult.corrections,
            transcript: aiResult.transcript
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
    if (aiResult && aiResult.confidence < 0.7) {
      await RatingQueueService.enqueue({
        sessionId,
        itemId,
        type: item.skill as any,
        content: value,
        aiResult
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

    return { 
      success: true, 
      theta: newState.theta, 
      sem: newState.sem,
      isCorrect: score === 1,
      aiResult,
      isCompleted: stopCheck.stop
    };
  },

  /**
   * Finalize a session: set status to COMPLETED, calculate CEFR, and create ScoreReport.
   */
  async finalizeSession(sessionId: string, theta: number) {
    const engine = await getEngine();
    const cefrLevel = engine.mapToCefr(theta);
    
    // Simple scaled score calculation: map -4 to 4 range to 0-100
    const scaledScore = Math.max(0, Math.min(100, Math.round(((theta + 4) / 8) * 100)));

    await prisma.$transaction([
      prisma.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.COMPLETED,
          completedAt: new Date(),
          cefrLevel: cefrLevel as any
        }
      }),
      prisma.scoreReport.upsert({
        where: { sessionId },
        create: {
          sessionId,
          overallCefr: cefrLevel as any,
          overallScore: scaledScore,
          isVerified: true
        },
        update: {
          overallCefr: cefrLevel as any,
          overallScore: scaledScore
        }
      })
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
    return prisma.item.create({
      data: {
        ...itemData,
        content: typeof itemData.content === "string" ? JSON.parse(itemData.content) : itemData.content
      },
      include: { assets: true }
    });
  },

  async updateItem(id: string, data: any) {
    const { assets, ...itemData } = data;
    return prisma.item.update({
      where: { id },
      data: {
        ...itemData,
        content: itemData.content ? (typeof itemData.content === "string" ? JSON.parse(itemData.content) : itemData.content) : undefined
      },
      include: { assets: true }
    });
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
