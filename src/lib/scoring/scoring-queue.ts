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

import { prisma } from "../prisma.js";
import { ScoringOrchestrator } from "./scoring-orchestrator.js";
import { RatingQueueService } from "./rating-queue.js";
import { logger } from "../observability/index.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_CONCURRENT_AI = Number(process.env.AI_SCORE_CONCURRENCY ?? "8");
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

// ─── Core processor ───────────────────────────────────────────────────────────

async function processJob(job: ScoringJobWithResolve): Promise<void> {
  activeCount++;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`AI scoring timed out after ${AI_TIMEOUT_MS}ms`)), AI_TIMEOUT_MS)
    );

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
        scoringDecision = await Promise.race([
          ScoringOrchestrator.scoreSpeakingFromText(String(val), job.prompt),
          timeoutPromise,
        ]);
      }
    }

    const aiResult = scoringDecision?.aiResult ?? null;
    const score = scoringDecision?.score ?? 0;
    const requiresHumanReview = scoringDecision?.requiresHumanReview === true;

    // Persist the AI result to the existing response row
    await prisma.response.update({
      where: { id: job.responseId },
      data: {
        score,
        isCorrect: score >= 0.5,
        aiScore: aiResult?.score as number | undefined,
        metadata: aiResult
          ? {
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
              scoringPasses: scoringDecision?.scoringPasses,
              asyncScored: true,
            }
          : { asyncScored: true, scoreFailed: true },
      } as any,
    });

    // Enqueue for human review if needed
    if (requiresHumanReview || !aiResult) {
      await RatingQueueService.enqueue({
        sessionId: job.sessionId,
        itemId: job.itemId,
        type: job.skill as any,
        content: job.value,
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

    job.resolve({ score, aiResult: aiResult as any, requiresHumanReview, scoreSource: scoringDecision?.scoreSource });
    logger.debug({ sessionId: job.sessionId, responseId: job.responseId, skill: job.skill, score }, "async-scoring: job complete");
  } catch (err) {
    logger.error({ err, sessionId: job.sessionId, responseId: job.responseId }, "async-scoring: job failed");

    // Persist failure marker and send to human review
    try {
      await prisma.response.update({
        where: { id: job.responseId },
        data: {
          metadata: { asyncScored: true, scoreFailed: true, failureReason: (err as Error).message } as any,
        } as any,
      });
      await RatingQueueService.enqueue({
        sessionId: job.sessionId,
        itemId: job.itemId,
        type: job.skill as any,
        content: job.value,
      });
    } catch (persistErr) {
      logger.error({ persistErr }, "async-scoring: failed to persist scoring failure");
    }

    job.reject(err as Error);
  } finally {
    activeCount--;
    drain();
  }
}

function drain(): void {
  while (activeCount < MAX_CONCURRENT_AI && queue.length > 0) {
    const job = queue.shift()!;
    // Use setImmediate so the event loop processes pending I/O between jobs
    setImmediate(() => processJob(job));
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueue a scoring job and return a Promise that resolves when scoring is done.
 *
 * **For fire-and-forget:** callers may ignore the returned promise. The result
 * will be persisted to the DB regardless.
 *
 * **For awaitable scoring (tests):** await the returned promise to get the result.
 */
export function enqueueScoringJob(job: ScoringJob): Promise<ScoringResult> {
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
