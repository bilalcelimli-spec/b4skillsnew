import { AIScoringService, ScoringResult } from "./ai-scoring";

import { prisma } from "../prisma";
import { RatingStatus } from "@prisma/client";

/**
 * Human Rating Queue Service
 * Manages responses that require manual evaluation by a rater.
 */

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
   * Submit a manual rating
   */
  async submitRating(taskId: string, score: number, feedback: string) {
    const task = await prisma.ratingTask.update({
      where: { id: taskId },
      include: { response: true },
      data: {
        status: RatingStatus.COMPLETED,
        score,
        feedback
      }
    });

    // Update the response with the human score
    await prisma.response.update({
      where: { id: task.responseId },
      data: {
        humanScore: score,
        score: score, // Override with human score
        metadata: {
          ...(task.response.metadata as any),
          humanFeedback: feedback
        }
      }
    });

    return task;
  }
};
