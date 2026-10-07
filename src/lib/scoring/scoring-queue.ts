/**
 * Async AI Scoring Queue
 *
 * Problem: Under 100 concurrent users each submitting a Writing or Speaking
 * response, the server would hold 100 HTTP connections open for up to 30 s
 * each waiting for Gemini. Express becomes unable to serve other requests.
 *
 * Solution: Fire-and-forget. The HTTP response returns immediately with a
 * `pending` score while the AI call is processed in the background. When
 * the result arrives it is persisted directly to the DB; the client polls
 * (or receives a push via SSE) for the final score.
 *
 * Concurrency limit: MAX_CONCURRENT_AI caps simultaneous Gemini calls so we
 * don't hammer the API key's RPM quota. Additional jobs are queued in memory.
 *
 * Back-pressure: If the queue grows beyond QUEUE_WARN_SIZE, a warning is
 * logged so ops can scale the instance or add a dedicated scoring worker.
 */

import { buildScoringPrompt } from "./task-context.js";
import { productiveScoringMode } from "../assessment-engine/productive-response.js";
import { refreshScoredSession } from "./score-report-refresh.js";
import { prisma } from "../prisma.js";
import { ScoringOrchestrator } from "./scoring-orchestrator.js";
import { RatingQueueService } from "./rating-queue.js";
import { logger } from "../observability/index.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const configuredConcurrency = Number(process.env.AI_SCORE_CONCURRENCY ?? "8");
const MAX_CONCURRENT_AI = Number.isFinite(configuredConcurrency) && configuredConcurrency >= 1
  ? Math.floor(configuredConcurrency) : 8;
const QUEUE_WARN_SIZE = 200;
const AI_TIMEOUT_MS = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoringSkill = "WRITING" | "SPEAKING";

export interface ScoringJob {
  sessionId: string;
  responseId: string;
  itemId: string;
  skill: ScoringSkill;
  value: string | { audio: string; mimeType: string };
  prompt: string;
}

type ScoringJobWithResolve = ScoringJob & {
  resolve: (result: ScoringResult) => void;
  reject: (err: Error) => void;
};

export interface ScoringResult {
  score: number;
  aiResult: Record<string, unknown> | null;
  requiresHumanReview: boolean;
  scoreSource?: string;
}

// ─── Queue state ─────────────────────────────────────────────────────────────

const queue: ScoringJobWithResolve[] = [];
let activeCount = 0;
const pendingResponseIds = new Set<string>();

export function isScoringJobPending(responseId: string): boolean { return pendingResponseIds.has(responseId); }

/** Preserve task evidence and atomically keep finalized human grades authoritative. */
async function persistScoringResult(responseId: string, data: Record<string, any>): Promise<boolean> {
  const current = await prisma.response.findUnique({where:{id:responseId},select:{metadata:true,humanScore:true}});
  if (!current) throw new Error("Scoring response no longer exists");
  if (current.humanScore != null) return false;
  const result = await prisma.response.updateMany({
    where:{id:responseId,humanScore:null},
    data:{...data,metadata:{...((current.metadata as Record<string,unknown>) ?? {}),...data.metadata}},
  });
  return result.count === 1;
}
async function resolveHumanGrade(job: ScoringJobWithResolve): Promise<void> {
  const current = await prisma.response.findUnique({where:{id:job.responseId},select:{humanScore:true}});
  if (current?.humanScore == null) throw new Error("Scoring response changed before persistence");
  job.resolve({score:current.humanScore,aiResult:null,requiresHumanReview:false,scoreSource:'human'});
}

// ─── Core processor ───────────────────────────────────────────────────────────

async function processJob(job: ScoringJobWithResolve): Promise<void> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      timeoutHandle = setTimeout(() => reject(new Error(`AI scoring timed out after ${AI_TIMEOUT_MS}ms`)), AI_TIMEOUT_MS)
    );
    // Prevent an unhandled-rejection crash if the race resolves before the timer fires
    timeoutPromise.catch(() => undefined);

    let scoringDecision: Awaited<ReturnType<typeof ScoringOrchestrator.scoreWriting>> | null = null;

    if (job.skill === "WRITING") {
      scoringDecision = await Promise.race([
        ScoringOrchestrator.scoreWriting(String(job.value), job.prompt),
        timeoutPromise,
      ]);
    } else {
      const val = job.value as { audio: string; mimeType: string } | string;
      if (typeof val === "object" && val.audio && val.mimeType) {
        scoringDecision = await Promise.race([
          ScoringOrchestrator.scoreSpeaking(val.audio, val.mimeType, job.prompt),
          timeoutPromise,
        ]);
      } else {
        throw new Error("Speaking assessment requires actual audio; a text marker is not a recording");
      }
    }

    const aiResult = scoringDecision?.aiResult ?? null;
    const score = scoringDecision?.score ?? 0;
    const requiresHumanReview = scoringDecision?.requiresHumanReview === true;

    // Persist the AI result to the existing response row
    const persisted = await persistScoringResult(job.responseId, {
        score: requiresHumanReview ? null : score,
        adjustedScore: null,
        isCorrect: requiresHumanReview ? null : score >= 0.5,
        aiScore: scoringDecision?.scoreSource === "ai_unavailable" ? null : aiResult?.score as number | undefined,
        metadata: aiResult
          ? {
              aiFeedback: aiResult.feedback,
              scoringMode: job.skill,
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
              scoringPasses: scoringDecision?.scoringPasses,
              asyncScored: true,
              pendingAsyncScore: false,
              requiresHumanReview,
              scoreFailed: scoringDecision?.scoreSource === "ai_unavailable",
            }
          : { asyncScored: true, scoreFailed: true },
      });
    if (!persisted) { await resolveHumanGrade(job); return; }

    // Enqueue for human review if needed
    if (requiresHumanReview || !aiResult) {
      await RatingQueueService.enqueue({
        sessionId: job.sessionId,
        itemId: job.itemId,
        type: job.skill as any,
        content: typeof job.value === "string" ? job.value : JSON.stringify(job.value),
        ...(aiResult && scoringDecision
          ? {
              aiResult: {
                ...aiResult,
                reviewReasons: scoringDecision.reviewReasons,
                agreementDelta: scoringDecision.agreementDelta,
                scoreSource: scoringDecision.scoreSource,
                scoringPasses: scoringDecision.scoringPasses,
              },
            }
          : {}),
      });
    }

    try { await refreshScoredSession(job.sessionId); }
    catch (err) { logger.error({ err, sessionId: job.sessionId }, "async-scoring: report refresh failed"); }
    job.resolve({ score, aiResult: aiResult as any, requiresHumanReview, scoreSource: scoringDecision?.scoreSource });
    logger.debug({ sessionId: job.sessionId, responseId: job.responseId, skill: job.skill, score }, "async-scoring: job complete");
  } catch (err) {
    logger.error({ err, sessionId: job.sessionId, responseId: job.responseId }, "async-scoring: job failed");

    // Persist failure marker and send to human review
    try {
      const persisted = await persistScoringResult(job.responseId, {
          score: null, adjustedScore: null, isCorrect: null,
          metadata: { asyncScored: true, pendingAsyncScore: false, requiresHumanReview: true, scoreFailed: true, failureReason: (err as Error).message } as any,
      });
      if (!persisted) { await resolveHumanGrade(job); return; }
      await RatingQueueService.enqueue({
        sessionId: job.sessionId,
        itemId: job.itemId,
        type: job.skill as any,
        content: typeof job.value === "string" ? job.value : JSON.stringify(job.value),
      });
    } catch (persistErr) {
      logger.error({ persistErr }, "async-scoring: failed to persist scoring failure");
    }

    job.reject(err as Error);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    activeCount--;
    pendingResponseIds.delete(job.responseId);
    drain();
  }
}

function drain(): void {
  while (activeCount < MAX_CONCURRENT_AI && queue.length > 0) {
    const job = queue.shift()!;
    activeCount++;
    // Use setImmediate so the event loop processes pending I/O between jobs
    setImmediate(() => processJob(job));
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueue a scoring job and return a Promise that resolves when scoring is done.
 *
 * **For fire-and-forget:** callers must attach a rejection handler. The result
 * or failure marker is persisted to the DB regardless.
 *
 * **For awaitable scoring (tests):** await the returned promise to get the result.
 */
export function enqueueScoringJob(job: ScoringJob): Promise<ScoringResult> {
  if (pendingResponseIds.has(job.responseId)) return Promise.reject(new Error("Response is already being scored"));
  pendingResponseIds.add(job.responseId);
  if (queue.length >= QUEUE_WARN_SIZE) {
    logger.warn(
      { queueSize: queue.length, activeCount },
      "async-scoring: queue backpressure — consider scaling or adding AI_SCORE_CONCURRENCY"
    );
  }

  return new Promise<ScoringResult>((resolve, reject) => {
    queue.push({ ...job, resolve, reject });
    drain();
  });
}

/** Metrics for ops dashboards */
export function getScoringQueueStats(): {
  activeCount: number;
  queueDepth: number;
  maxConcurrent: number;
} {
  return { activeCount, queueDepth: queue.length, maxConcurrent: MAX_CONCURRENT_AI };
}

/**
 * Wait for all in-progress and queued scoring jobs to complete (or timeout).
 * Call this during graceful shutdown before closing the server.
 */
export function drainScoringQueue(timeoutMs = 25_000): Promise<void> {
  return new Promise((resolve) => {
    if (activeCount === 0 && queue.length === 0) return resolve();

    const deadline = setTimeout(() => {
      clearInterval(check);
      logger.warn(
        { activeCount, queueDepth: queue.length },
        "async-scoring: drain timed out — some jobs may be lost"
      );
      resolve();
    }, timeoutMs);
    deadline.unref();

    const check = setInterval(() => {
      if (activeCount === 0 && queue.length === 0) {
        clearInterval(check);
        clearTimeout(deadline);
        resolve();
      }
    }, 100);
  });
}

/** Recover persisted submissions after a worker restart; old numeric placeholders stay withheld. */
export async function recoverPendingScoringJobs(): Promise<number> {
  const responses = await prisma.response.findMany({
    where:{isPretest:false,humanScore:null,metadata:{path:["pendingAsyncScore"],equals:true}},
    include:{item:true},orderBy:{createdAt:"asc"},take:100,
  });
  let recovered=0;
  for (const response of responses) {
    const metadata=(response.metadata as Record<string,unknown>) ?? {};
    if (metadata.asyncScored === true || isScoringJobPending(response.id)) continue;
    let value: any=response.value ?? "";
    if (typeof value === "string" && value.startsWith("{")) {
      try {
        const parsed=JSON.parse(value);
        if (parsed && typeof parsed.audio === "string" && typeof parsed.mimeType === "string") value=parsed;
      } catch { /* Keep literal writing text. */ }
    }
    const content=(response.item.content as Record<string,any>) ?? {};
    let mode;
    try { mode=productiveScoringMode(response.item.skill,response.item.type,content,value); }
    catch { logger.warn({responseId:response.id}, "async-scoring: invalid recovery submission"); continue; }
    if (!mode) continue;
    void enqueueScoringJob({sessionId:response.sessionId,responseId:response.id,itemId:response.itemId,
      skill:mode,value,prompt:buildScoringPrompt(content)}).catch(() => undefined);
    recovered++;
  }
  return recovered;
}
