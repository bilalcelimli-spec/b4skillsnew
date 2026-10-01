import { refreshScoredSession } from "./score-report-refresh.js";
import { prisma } from "../prisma";
import { RatingStatus } from "@prisma/client";

/**
 * Human Rating Queue Service
 * Manages responses that require manual evaluation by a rater.
 *
 * Double-blind workflow:
 *  1. Item is enqueued → status=PENDING, no rater
 *  2. Rater A claims → status=CLAIMED, raterId set
 *  3. Rater A submits → score + feedback stored; if second rater not yet assigned,
 *     status flips to PENDING_SECOND_RATER
 *  4. Rater B claims the second slot (must be a different user)
 *  5. Rater B submits → QWK computed; if |score_A - score_B| > 0.20,
 *     requiresArbitration=true and status=FLAGGED for a third rater
 *  6. Otherwise status=COMPLETED and final score = average of A & B
 */

const SECOND_RATER_AGREEMENT_THRESHOLD = 0.20; // |score_A - score_B| > this → arbitration

export interface EnqueueParams {
  sessionId: string;
  itemId: string;
  type: "WRITING" | "SPEAKING";
  content: string;
  aiResult?: any;
}

export const RatingQueueService = {
  /**
   * Add a response to the queue
   */
  async enqueue(params: EnqueueParams) {
    // Find the response record first
    const response = await prisma.response.findFirst({
      where: {
        sessionId: params.sessionId,
        itemId: params.itemId
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!response) throw new Error("Response not found for enqueuing");

    {
      await prisma.response.update({
        where: { id: response.id },
        data: {
          metadata: {
            ...((response.metadata as any) || {}),
            scoringMode: params.type,
            reviewQueue: {
              enqueuedAt: new Date().toISOString(),
              aiResult: params.aiResult
            }
          }
        }
      });
    }

    const task = await prisma.ratingTask.upsert({
      where:{responseId:response.id},
      create:{responseId:response.id,status:RatingStatus.PENDING},
      update:{},
    });
    return task.id;
  },

  /**
   * Get pending tasks for a rater
   */
  async getTasks(status: RatingStatus = RatingStatus.PENDING, raterId?: string) {
    const tasks = await prisma.ratingTask.findMany({
      where: { status, ...(status === RatingStatus.PENDING && raterId ? {OR:[{raterId:null},{raterId:{not:raterId}}]} : {}) },
      include: {
        response: {
          include: {
            item: true,
            session: {
              include: {
                candidate: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });
    return tasks.map(task => {
      const needsSecondRater = task.status === RatingStatus.PENDING && task.score != null;
      return {...task,needsSecondRater,...(needsSecondRater ? {score:null,feedback:null} : {})};
    });
  },

  /**
   * Claim a task for rating
   */
  async claimTask(taskId: string, raterId: string) {
    const claimed = await prisma.ratingTask.updateMany({where:{id:taskId,status:RatingStatus.PENDING,raterId:null},
      data:{status:RatingStatus.CLAIMED,raterId}});
    if (claimed.count !== 1) throw new Error("Rating task is already claimed or awaits a second rater");
    return prisma.ratingTask.findUnique({where:{id:taskId}});
  },

  /**
   * Submit a manual rating (first rater).
   * After submission the task transitions to PENDING_SECOND_RATER so a second
   * blind rater can independently score the same response.
   */
  async submitRating(taskId: string, score: number, feedback = "", raterId?: string) {
    if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error("Rating score must be between 0 and 1");
    const current = await prisma.ratingTask.findUnique({where:{id:taskId}});
    if (!raterId || current?.raterId !== raterId || current?.status !== RatingStatus.CLAIMED || current.score != null) throw new Error("Only the assigned first rater can submit this rating");
    const task = await prisma.ratingTask.update({
      where: { id: taskId },
      include: { response: true },
      data: {
        score,
        feedback,
        // Transition to waiting for second rater (reuse PENDING for simplicity;
        // raterId being set distinguishes "waiting second rater" from fresh items)
        status: RatingStatus.PENDING,
      } as any
    });

    // Don't overwrite the response score yet — wait for second rater
    return task;
  },

  /**
   * Claim the second-rater slot for a task.
   * The second rater must be a different user from the first rater.
   */
  async claimSecondRating(taskId: string, raterId: string) {
    const claimed = await prisma.ratingTask.updateMany({where:{id:taskId,status:RatingStatus.PENDING,
      score:{not:null},raterId:{not:raterId},secondRaterId:null},data:{secondRaterId:raterId,status:RatingStatus.CLAIMED}});
    if (claimed.count !== 1) throw new Error("Second rater must be different and the task must be available");
    return prisma.ratingTask.findUnique({where:{id:taskId}});
  },

  /**
   * Submit the second rater's score.
   * Computes QWK, determines if arbitration is needed, and finalises the response
   * with the averaged score when agreement is sufficient.
   */
  async submitSecondRating(taskId: string, score: number, feedback = "", raterId?: string) {
    if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error("Rating score must be between 0 and 1");
    const task = await prisma.ratingTask.findUnique({
      where: { id: taskId },
      include: { response: true },
    });
    if (!task) throw new Error("Rating task not found");
    if (!raterId || task.secondRaterId !== raterId || task.raterId === raterId || task.status !== RatingStatus.CLAIMED) throw new Error("Only the assigned independent second rater can submit");
    if (task.score === null || task.score === undefined) {
      throw new Error("First rater has not yet submitted a score.");
    }

    const firstScore = task.score as number;
    // A single pair cannot establish chance-corrected inter-rater reliability.
    // Compute QWK across a rating sample in ai-human-agreement.ts instead.
    const qwk = null;
    const requiresArbitration = Math.abs(firstScore - score) > SECOND_RATER_AGREEMENT_THRESHOLD;
    const finalScore = requiresArbitration ? null : (firstScore + score) / 2;

    const updatedTask = await prisma.ratingTask.update({
      where: { id: taskId },
      include: { response: true },
      data: {
        secondRaterScore: score,
        secondRaterFeedback: feedback,
        qwk,
        requiresArbitration,
        status: requiresArbitration ? RatingStatus.FLAGGED : RatingStatus.COMPLETED,
      } as any,
    });

    // Finalise the response only when agreement is reached
    if (finalScore !== null) {
      await prisma.response.update({
        where: { id: task.responseId },
        data: {
          humanScore: finalScore,
          score: finalScore,
          adjustedScore: null,
          isCorrect: finalScore >= 0.5,
          metadata: {
            ...((task.response?.metadata as any) || {}),
            humanFeedback: feedback,
            scoreSource: "human",
            requiresHumanReview: false,
            pendingAsyncScore: false,
            scoreFailed: false,
            irrQwk: qwk,
            finalScoreSource: "double_blind_average",
          },
        },
      });
    }

    if (finalScore !== null) await refreshScoredSession(task.response.sessionId);
    return updatedTask;
  },

  /**
   * Get tasks awaiting a second rater (first rater done, second not yet assigned).
   */
  async getTasksPendingSecondRater() {
    return prisma.ratingTask.findMany({
      where: {
        status: RatingStatus.PENDING,
        raterId: { not: null },
        secondRaterId: null,
      } as any,
      include: {
        response: {
          include: { item: true, session: { include: { candidate: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  /**
   * Get tasks flagged for arbitration (disagreement > threshold).
   */
  async getArbitrationTasks() {
    return prisma.ratingTask.findMany({
      where: { status: RatingStatus.FLAGGED, requiresArbitration: true } as any,
      include: {
        response: {
          include: { item: true, session: { include: { candidate: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },
};
