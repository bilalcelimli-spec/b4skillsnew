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

/** Quadratic Weighted Kappa between two ratings on a 0–1 continuous scale. */
function computeQwk(score1: number, score2: number): number {
  // For two scalar ratings, QWK simplifies to 1 - (d/max_d)^2
  // where d = |score1 - score2|.  We discretise to 7 CEFR bands (0-indexed).
  const band = (s: number) => Math.round(s * 6); // [0,1] → {0,1,2,3,4,5,6}
  const diff = Math.abs(band(score1) - band(score2));
  const maxDiff = 6; // maximum possible band distance
  return 1 - Math.pow(diff / maxDiff, 2);
}

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

    if (params.aiResult) {
      await prisma.response.update({
        where: { id: response.id },
        data: {
          metadata: {
            ...((response.metadata as any) || {}),
            reviewQueue: {
              enqueuedAt: new Date().toISOString(),
              aiResult: params.aiResult
            }
          }
        }
      });
    }

    const task = await prisma.ratingTask.create({
      data: {
        responseId: response.id,
        status: RatingStatus.PENDING
      }
    });
    return task.id;
  },

  /**
   * Get pending tasks for a rater
   */
  async getTasks(status: RatingStatus = RatingStatus.PENDING) {
    return await prisma.ratingTask.findMany({
      where: { status },
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
  },

  /**
   * Claim a task for rating
   */
  async claimTask(taskId: string, raterId: string) {
    return await prisma.ratingTask.update({
      where: { id: taskId },
      data: {
        status: RatingStatus.CLAIMED,
        raterId
      }
    });
  },

  /**
   * Submit a manual rating (first rater).
   * After submission the task transitions to PENDING_SECOND_RATER so a second
   * blind rater can independently score the same response.
   */
  async submitRating(taskId: string, score: number, feedback: string) {
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
    const task = await prisma.ratingTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("Rating task not found");
    if (task.raterId === raterId) {
      throw new Error("Second rater must be a different user from the first rater.");
    }
    return prisma.ratingTask.update({
      where: { id: taskId },
      data: { secondRaterId: raterId, status: RatingStatus.CLAIMED } as any,
    });
  },

  /**
   * Submit the second rater's score.
   * Computes QWK, determines if arbitration is needed, and finalises the response
   * with the averaged score when agreement is sufficient.
   */
  async submitSecondRating(taskId: string, score: number, feedback: string) {
    const task = await prisma.ratingTask.findUnique({
      where: { id: taskId },
      include: { response: true },
    });
    if (!task) throw new Error("Rating task not found");
    if (task.score === null || task.score === undefined) {
      throw new Error("First rater has not yet submitted a score.");
    }

    const firstScore = task.score as number;
    const qwk = computeQwk(firstScore, score);
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
          metadata: {
            ...((task.response?.metadata as any) || {}),
            humanFeedback: feedback,
            irrQwk: qwk,
            finalScoreSource: "double_blind_average",
          },
        },
      });
    }

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
