/**
 * b4skills Spaced Repetition Scheduler
 *
 * Based on the Ebbinghaus forgetting curve: R = e^(-t/S)
 * where R = memory retention, t = time since last review, S = stability.
 *
 * Schedules next review when predicted retention drops below 90%.
 * Stability increases with each successful recall.
 */

import { prisma } from "../prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewItem {
  itemId: string;
  skill: string;
  cefrLevel: string;
  lastReviewedAt: Date;
  nextReviewDue: Date;
  stability: number; // days to 90% retention
  retentionEstimate: number; // 0-1
  reviewCount: number;
  correctCount: number;
  priority: number; // higher = more urgent
  isDue: boolean;
}

export interface ReviewSession {
  candidateId: string;
  dueItems: ReviewItem[];
  upcomingItems: ReviewItem[]; // due in next 3 days
  optimalSessionLength: number; // recommended item count
  nextReviewDate: Date;
}

export interface ReviewResult {
  itemId: string;
  candidateId: string;
  wasCorrect: boolean;
  responseTimeMs: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_RETENTION = 0.9; // schedule when retention drops to 90%
const STABILITY_BASE = 1; // initial stability in days
const STABILITY_MULTIPLIER_CORRECT = 2.0; // doubling on correct recall
const STABILITY_MULTIPLIER_WRONG = 0.5; // halve on wrong recall
const EASE_BONUS = 0.1; // bonus per easy recall
const MAX_INTERVAL_DAYS = 365;

// ---------------------------------------------------------------------------
// Persistence layer (in-memory with DB fallback)
// ---------------------------------------------------------------------------

// In production: replace with a dedicated SpacedRepetition table in Prisma
const reviewStore = new Map<string, ReviewItem>(); // key: `${candidateId}:${itemId}`

function reviewKey(candidateId: string, itemId: string): string {
  return `${candidateId}:${itemId}`;
}

// ---------------------------------------------------------------------------
// Core schedule calculation
// ---------------------------------------------------------------------------

/**
 * Calculate retention at time t (days) given stability S.
 * R(t) = exp(-t/S)
 */
function calcRetention(daysSinceReview: number, stability: number): number {
  return Math.exp(-daysSinceReview / stability);
}

/**
 * Calculate optimal interval: the day when retention hits TARGET_RETENTION.
 * t = -S * ln(R_target)
 */
function optimalInterval(stability: number): number {
  const days = -stability * Math.log(TARGET_RETENTION);
  return Math.min(Math.max(1, Math.round(days)), MAX_INTERVAL_DAYS);
}

/**
 * Update stability after a review.
 */
function updateStability(stability: number, wasCorrect: boolean, easeFactor: number): number {
  if (wasCorrect) {
    return stability * (STABILITY_MULTIPLIER_CORRECT + easeFactor);
  } else {
    return Math.max(1, stability * STABILITY_MULTIPLIER_WRONG);
  }
}

// ---------------------------------------------------------------------------
// Spaced Repetition Scheduler
// ---------------------------------------------------------------------------

export class SpacedRepetitionScheduler {
  /** Initialise review tracking for a set of items the candidate has seen */
  async initialiseItems(candidateId: string, itemIds: string[]): Promise<void> {
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, skill: true, cefrLevel: true },
    });

    for (const item of items) {
      const key = reviewKey(candidateId, item.id);
      if (!reviewStore.has(key)) {
        const now = new Date();
        const due = new Date(now.getTime() + 24 * 60 * 60 * 1000); // due in 1 day
        reviewStore.set(key, {
          itemId: item.id,
          skill: item.skill,
          cefrLevel: item.cefrLevel,
          lastReviewedAt: now,
          nextReviewDue: due,
          stability: STABILITY_BASE,
          retentionEstimate: 1.0,
          reviewCount: 0,
          correctCount: 0,
          priority: 1,
          isDue: false,
        });
      }
    }
  }

  /** Load review queue from completed session responses */
  async syncFromSessions(candidateId: string): Promise<void> {
    const responses = await prisma.response.findMany({
      where: { session: { candidateId } },
      orderBy: { createdAt: "asc" },
      select: {
        itemId: true,
        isCorrect: true,
        createdAt: true,
        latencyMs: true,
        item: { select: { skill: true, cefrLevel: true } },
      },
    });

    for (const response of responses) {
      const key = reviewKey(candidateId, response.itemId);
      let record = reviewStore.get(key);

      if (!record) {
        record = {
          itemId: response.itemId,
          skill: response.item?.skill ?? "UNKNOWN",
          cefrLevel: response.item?.cefrLevel ?? "A1",
          lastReviewedAt: response.createdAt,
          nextReviewDue: new Date(response.createdAt.getTime() + 24 * 60 * 60 * 1000),
          stability: STABILITY_BASE,
          retentionEstimate: 1.0,
          reviewCount: 0,
          correctCount: 0,
          priority: 1,
          isDue: false,
        };
      }

      // Process this response
      const easeBonus = (response.latencyMs ?? 0) < 3000 ? EASE_BONUS : 0;
      const newStability = updateStability(record.stability, response.isCorrect, easeBonus);
      const interval = optimalInterval(newStability);
      const nextDue = new Date(response.createdAt.getTime() + interval * 24 * 60 * 60 * 1000);

      record = {
        ...record,
        lastReviewedAt: response.createdAt,
        nextReviewDue: nextDue,
        stability: newStability,
        reviewCount: record.reviewCount + 1,
        correctCount: record.correctCount + (response.isCorrect ? 1 : 0),
      };
      reviewStore.set(key, record);
    }
  }

  /** Record the result of a review and reschedule */
  async recordReview(result: ReviewResult): Promise<ReviewItem> {
    const key = reviewKey(result.candidateId, result.itemId);
    let record = reviewStore.get(key);

    const item = await prisma.item.findUnique({
      where: { id: result.itemId },
      select: { skill: true, cefrLevel: true },
    });

    if (!record) {
      record = {
        itemId: result.itemId,
        skill: item?.skill ?? "UNKNOWN",
        cefrLevel: item?.cefrLevel ?? "A1",
        lastReviewedAt: new Date(),
        nextReviewDue: new Date(),
        stability: STABILITY_BASE,
        retentionEstimate: 1.0,
        reviewCount: 0,
        correctCount: 0,
        priority: 1,
        isDue: false,
      };
    }

    const easeBonus = result.responseTimeMs < 3000 ? EASE_BONUS : 0;
    const newStability = updateStability(record.stability, result.wasCorrect, easeBonus);
    const interval = optimalInterval(newStability);
    const nextDue = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

    const updated: ReviewItem = {
      ...record,
      lastReviewedAt: new Date(),
      nextReviewDue: nextDue,
      stability: newStability,
      retentionEstimate: 1.0, // just reviewed
      reviewCount: record.reviewCount + 1,
      correctCount: record.correctCount + (result.wasCorrect ? 1 : 0),
      isDue: false,
      priority: 1,
    };

    reviewStore.set(key, updated);
    return updated;
  }

  /** Get the candidate's current review queue */
  async getReviewQueue(candidateId: string): Promise<ReviewSession> {
    // Sync from DB first
    await this.syncFromSessions(candidateId);

    const now = new Date();
    const candidateKeys = [...reviewStore.entries()].filter(([k]) => k.startsWith(`${candidateId}:`));

    const allItems: ReviewItem[] = candidateKeys.map(([, item]) => {
      const daysSince = (now.getTime() - item.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);
      const retention = calcRetention(daysSince, item.stability);
      const priority = Math.exp(daysSince / 7); // exponential urgency
      const isDue = now >= item.nextReviewDue;

      return { ...item, retentionEstimate: Math.round(retention * 1000) / 1000, priority: Math.round(priority * 100) / 100, isDue };
    });

    const dueItems = allItems
      .filter((i) => i.isDue)
      .sort((a, b) => b.priority - a.priority);

    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingItems = allItems
      .filter((i) => !i.isDue && i.nextReviewDue <= in3Days)
      .sort((a, b) => a.nextReviewDue.getTime() - b.nextReviewDue.getTime());

    // Find next review date
    const futureItems = allItems.filter((i) => !i.isDue);
    const nextDue = futureItems.length > 0
      ? futureItems.reduce((min, i) => (i.nextReviewDue < min ? i.nextReviewDue : min), futureItems[0].nextReviewDue)
      : new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Optimal session: target 15 minutes at 1 min/item
    const optimalSessionLength = Math.min(dueItems.length, 15);

    return {
      candidateId,
      dueItems,
      upcomingItems,
      optimalSessionLength,
      nextReviewDate: nextDue,
    };
  }

  /** Forecast retention for a set of items over the next N days */
  forecastRetention(items: ReviewItem[], days: number): Array<{ date: Date; retention: number; itemCount: number }> {
    const forecast: Array<{ date: Date; retention: number; itemCount: number }> = [];
    const now = new Date();

    for (let d = 1; d <= days; d++) {
      const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      const retentions = items.map((item) => {
        const daysSince = (date.getTime() - item.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);
        return calcRetention(daysSince, item.stability);
      });
      const avgRetention = retentions.length > 0 ? retentions.reduce((a, b) => a + b, 0) / retentions.length : 1;
      const dueCount = items.filter((item) => date >= item.nextReviewDue).length;
      forecast.push({ date, retention: Math.round(avgRetention * 1000) / 1000, itemCount: dueCount });
    }

    return forecast;
  }
}

export const spacedRepetitionScheduler = new SpacedRepetitionScheduler();
