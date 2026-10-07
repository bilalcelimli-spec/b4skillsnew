import { refreshScoredSession } from "./score-report-refresh.js";
import { prisma } from "../prisma";
import { RatingStatus } from "@prisma/client";

/** Human ratings use two independent reviewers, then a third when the difference exceeds 0.20.
 * Finalization and the response grade commit together. Single rating pairs do not establish QWK.
 */
const SECOND_RATER_AGREEMENT_THRESHOLD = 0.20;

export interface EnqueueParams {
  sessionId: string;
  itemId: string;
  type: "WRITING" | "SPEAKING";
  content: string;
  aiResult?: any;
}

function presentTask<T extends {
  status:string;score:number|null;raterId:string|null;feedback?:string|null;secondRaterId?:string|null;
  requiresArbitration?:boolean;arbitratorId?:string|null;arbitrationScore?:number|null;
  response?:{metadata?:unknown};
}>(task:T, viewerId?:string) {
  const needsArbitration = task.requiresArbitration === true && task.arbitrationScore == null &&
    (task.status === RatingStatus.FLAGGED || task.status === RatingStatus.CLAIMED);
  const needsSecondRater = !needsArbitration && task.score != null &&
    (task.status === RatingStatus.PENDING || task.status === RatingStatus.CLAIMED) && task.raterId !== viewerId;
  if (needsArbitration) {
    const meta = (task.response?.metadata ?? {}) as Record<string,unknown>;
    return {...task,needsArbitration,needsSecondRater:false,score:null,feedback:null,
      secondRaterScore:null,secondRaterFeedback:null,raterId:null,secondRaterId:null,
      ...(task.response ? {response:{...task.response,score:null,aiScore:null,humanScore:null,adjustedScore:null,
        metadata:{scoringMode:meta.scoringMode}}} : {})};
  }
  return {...task,needsArbitration:false,needsSecondRater,...(needsSecondRater ? {score:null,feedback:null} : {})};
}
function validateScore(score:number) {
  if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error("Rating score must be between 0 and 1");
}
function humanGrade(score:number, feedback:string, metadata:unknown, source:string) {
  const previous = (metadata as Record<string,unknown>) ?? {};
  const aiUnavailable = previous.aiUnavailable === true || previous.scoreSource === 'ai_unavailable' || previous.scoreFailed === true;
  return {humanScore:score,score,adjustedScore:null,isCorrect:score>=0.5,
    metadata:{...previous,aiUnavailable,humanFeedback:feedback,scoreSource:'human',
      requiresHumanReview:false,pendingAsyncScore:false,scoreFailed:false,irrQwk:null,finalScoreSource:source}};
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
      where: { status,
        ...(status === RatingStatus.PENDING && raterId ? {OR:[{raterId:null},{raterId:{not:raterId}}]} : {}),
        ...(status === RatingStatus.CLAIMED && raterId ? {OR:[
          {raterId,secondRaterId:null,arbitratorId:null},
          {secondRaterId:raterId,requiresArbitration:false}, {arbitratorId:raterId},
        ]} : {}),
        ...(status === RatingStatus.FLAGGED && raterId ? {requiresArbitration:true,arbitratorId:null,
          raterId:{not:raterId},secondRaterId:{not:raterId}} : {}),
      },
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
    return tasks.map(task => presentTask(task,raterId));
  },

  /**
   * Claim a task for rating
   */
  async claimTask(taskId: string, raterId: string) {
    const claimed = await prisma.ratingTask.updateMany({where:{id:taskId,status:RatingStatus.PENDING,raterId:null,score:null,secondRaterId:null,arbitratorId:null},
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
    validateScore(score);
    if (!raterId) throw new Error("Assigned rater required");
    const saved = await prisma.ratingTask.updateMany({
      where:{id:taskId,raterId,status:RatingStatus.CLAIMED,score:null,secondRaterId:null,arbitratorId:null},
      data:{score,feedback,status:RatingStatus.PENDING},
    });
    if (saved.count !== 1) throw new Error("Only the assigned first rater can submit once");
    return prisma.ratingTask.findUnique({where:{id:taskId},include:{response:true}});
  },

  /**
   * Claim the second-rater slot for a task.
   * The second rater must be a different user from the first rater.
   */
  async claimSecondRating(taskId: string, raterId: string) {
    const claimed = await prisma.ratingTask.updateMany({where:{id:taskId,status:RatingStatus.PENDING,
      score:{not:null},raterId:{not:raterId},secondRaterId:null,secondRaterScore:null,requiresArbitration:false,arbitratorId:null},data:{secondRaterId:raterId,status:RatingStatus.CLAIMED}});
    if (claimed.count !== 1) throw new Error("Second rater must be different and the task must be available");
    const task = await prisma.ratingTask.findUnique({where:{id:taskId}});
    if (!task) throw new Error("Rating task not found");
    return presentTask(task,raterId);
  },

  /** Finalize an agreeing pair, or withhold the grade and request a third independent rating. */
  async submitSecondRating(taskId:string,score:number,feedback="",raterId?:string) {
    validateScore(score);
    const result = await prisma.$transaction(async tx => {
      const task = await tx.ratingTask.findUnique({where:{id:taskId},include:{response:true}});
      if (!task || !raterId || task.secondRaterId !== raterId || task.raterId === raterId || task.score == null)
        throw new Error("Only the assigned independent second rater can submit");
      // A retry after a report-refresh failure may refresh, but cannot change the committed grade.
      if (task.status === RatingStatus.COMPLETED && !task.requiresArbitration &&
        task.secondRaterScore === score && task.secondRaterFeedback === feedback) return task;
      if (task.status !== RatingStatus.CLAIMED || task.secondRaterScore != null || task.requiresArbitration)
        throw new Error("Second rating has already been submitted");
      const requiresArbitration = Math.abs(task.score-score) > SECOND_RATER_AGREEMENT_THRESHOLD + 4*Number.EPSILON;
      const saved = await tx.ratingTask.updateMany({
        where:{id:taskId,status:RatingStatus.CLAIMED,secondRaterId:raterId,secondRaterScore:null,
          requiresArbitration:false,score:task.score,arbitratorId:null},
        data:{secondRaterScore:score,secondRaterFeedback:feedback,qwk:null,requiresArbitration,
          status:requiresArbitration?RatingStatus.FLAGGED:RatingStatus.COMPLETED},
      });
      if (saved.count !== 1) throw new Error("Rating task changed; reload before submitting");
      await tx.response.update({where:{id:task.responseId},data:requiresArbitration
        ? {score:null,humanScore:null,adjustedScore:null,isCorrect:null,
            metadata:{...((task.response.metadata as Record<string,unknown>) ?? {}),requiresHumanReview:true,pendingAsyncScore:false}}
        : humanGrade((task.score+score)/2,feedback,task.response.metadata,'double_blind_average')});
      return tx.ratingTask.findUniqueOrThrow({where:{id:taskId},include:{response:true}});
    });
    await refreshScoredSession(result.response.sessionId);
    return result;
  },

  async claimArbitration(taskId:string,raterId:string) {
    if (!raterId) throw new Error("Independent arbitrator required");
    const claimed = await prisma.ratingTask.updateMany({
      where:{id:taskId,status:RatingStatus.FLAGGED,requiresArbitration:true,arbitratorId:null,arbitrationScore:null,
        score:{not:null},secondRaterScore:{not:null},raterId:{not:raterId},secondRaterId:{not:raterId}},
      data:{arbitratorId:raterId,status:RatingStatus.CLAIMED},
    });
    if (claimed.count !== 1) throw new Error("Arbitration requires an available independent third rater");
    const task = await prisma.ratingTask.findUniqueOrThrow({where:{id:taskId},include:{response:true}});
    return presentTask(task,raterId);
  },

  /** Third review is blind. The final normalized grade is the mean of all three independent scores. */
  async submitArbitration(taskId:string,score:number,feedback="",raterId?:string) {
    validateScore(score);
    const result = await prisma.$transaction(async tx => {
      const task = await tx.ratingTask.findUnique({where:{id:taskId},include:{response:true}});
      if (!task || !raterId || task.arbitratorId !== raterId || task.raterId === raterId || task.secondRaterId === raterId ||
        !task.requiresArbitration || task.score == null || task.secondRaterScore == null)
        throw new Error("Only the assigned independent third rater can submit");
      if (task.status === RatingStatus.COMPLETED && task.arbitrationScore === score && task.arbitrationFeedback === feedback) return task;
      if (task.status !== RatingStatus.CLAIMED || task.arbitrationScore != null) throw new Error("Arbitration has already been submitted");
      const saved = await tx.ratingTask.updateMany({
        where:{id:taskId,status:RatingStatus.CLAIMED,arbitratorId:raterId,arbitrationScore:null,requiresArbitration:true,
          score:task.score,secondRaterScore:task.secondRaterScore},
        data:{arbitrationScore:score,arbitrationFeedback:feedback,status:RatingStatus.COMPLETED},
      });
      if (saved.count !== 1) throw new Error("Arbitration task changed; reload before submitting");
      await tx.response.update({where:{id:task.responseId},data:humanGrade(
        (task.score+task.secondRaterScore+score)/3,feedback,task.response.metadata,'three_independent_ratings_average')});
      return tx.ratingTask.findUniqueOrThrow({where:{id:taskId},include:{response:true}});
    });
    await refreshScoredSession(result.response.sessionId);
    return result;
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
      where: { status: RatingStatus.FLAGGED, requiresArbitration: true, arbitratorId:null },
      include: {
        response: {
          include: { item: true, session: { include: { candidate: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },
};
