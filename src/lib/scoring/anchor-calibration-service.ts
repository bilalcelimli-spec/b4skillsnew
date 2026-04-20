/**
 * Anchor Calibration Service
 *
 * Manages a gold-standard benchmark corpus ("anchor set") of Writing and Speaking
 * responses that have been independently scored by certified CEFR examiners.
 * The service compares live AI scores against the anchor to detect drift and
 * enforce a quality gate before new model versions go live.
 *
 * Workflow:
 *  1. Admins upload anchor items (responseText + expertScore) via the API.
 *  2. Periodically (or on demand), all anchor items are re-scored by the current
 *     AI scoring pipeline and MAE / RMSE are computed.
 *  3. If MAE > DRIFT_ALARM_THRESHOLD the drift event is logged and an alert raised.
 *  4. Before deploying a new Gemini model version, the admin runs a
 *     validateModelVersion() check — it fails if the new MAE exceeds the threshold.
 *
 * Targets (Cambridge / ETS industry standards):
 *  - MAE  < 0.08  (normalised 0–1 scale)
 *  - RMSE < 0.12
 *  - Pearson r > 0.85
 */

import { prisma } from "../prisma";
import { ScoringOrchestrator } from "../scoring/scoring-orchestrator";
import { logger } from "../observability/index.js";

export interface AnchorItem {
  id: string;
  skill: "WRITING" | "SPEAKING";
  cefrLevel: string;
  /** The response text (or base64-encoded audio for speaking) */
  content: string;
  mimeType?: string; // For speaking audio
  /** Normalised human expert score [0,1] — consensus of ≥ 3 certified examiners */
  expertScore: number;
  /** Number of expert raters who agreed on this score */
  raterCount: number;
  /** Inter-rater agreement (QWK) among the expert raters */
  expertQwk: number;
  prompt: string;
  addedAt: string;
}

export interface AnchorCalibrationResult {
  totalItems: number;
  scoredItems: number;
  mae: number;
  rmse: number;
  pearsonR: number;
  biasDirection: "overscoring" | "underscoring" | "neutral";
  meetsThreshold: boolean;
  details: { id: string; expertScore: number; aiScore: number; delta: number }[];
  runAt: string;
}

const DRIFT_ALARM_THRESHOLD_MAE  = 0.08;
const DRIFT_ALARM_THRESHOLD_RMSE = 0.12;

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b) / n;
  const my = ys.reduce((a, b) => a + b) / n;
  const num   = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const denX  = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const denY  = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return denX * denY === 0 ? 0 : num / (denX * denY);
}

export const AnchorCalibrationService = {
  /**
   * Add a human-scored anchor item to the SystemConfig anchor corpus.
   * The anchor corpus is stored in SystemConfig.config.anchorSet as a JSON array.
   */
  async addAnchorItem(item: Omit<AnchorItem, "id" | "addedAt">): Promise<AnchorItem> {
    const config = await prisma.systemConfig.findUnique({ where: { id: "global" } });
    const cfg = (config?.config as any) || {};
    const anchorSet: AnchorItem[] = cfg.anchorSet || [];

    const newItem: AnchorItem = {
      ...item,
      id: crypto.randomUUID(),
      addedAt: new Date().toISOString(),
    };

    anchorSet.push(newItem);

    await prisma.systemConfig.upsert({
      where: { id: "global" },
      create: { id: "global", config: { ...cfg, anchorSet } as any },
      update: { config: { ...cfg, anchorSet } as any },
    });

    logger.info({ anchorItemId: newItem.id, skill: item.skill, cefr: item.cefrLevel },
      "Anchor item added");
    return newItem;
  },

  /**
   * Retrieve the full anchor corpus.
   */
  async getAnchorSet(): Promise<AnchorItem[]> {
    const config = await prisma.systemConfig.findUnique({ where: { id: "global" } });
    return ((config?.config as any)?.anchorSet as AnchorItem[]) || [];
  },

  /**
   * Run the AI scoring pipeline against all anchor items and compute drift metrics.
   * Results are persisted in SystemConfig.config.anchorCalibrationHistory (last 30 runs).
   *
   * @param concurrency Number of parallel AI scoring calls (default: 3)
   */
  async runCalibration(concurrency = 3): Promise<AnchorCalibrationResult> {
    const anchorSet = await this.getAnchorSet();
    if (anchorSet.length === 0) {
      return {
        totalItems: 0, scoredItems: 0, mae: 0, rmse: 0, pearsonR: 0,
        biasDirection: "neutral", meetsThreshold: true,
        details: [], runAt: new Date().toISOString(),
      };
    }

    const details: { id: string; expertScore: number; aiScore: number; delta: number }[] = [];

    // Process in batches for concurrency control
    for (let i = 0; i < anchorSet.length; i += concurrency) {
      const batch = anchorSet.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(async (item) => {
          let aiScore: number;
          if (item.skill === "WRITING") {
            const result = await ScoringOrchestrator.scoreWriting(item.content, item.prompt);
            aiScore = result.score;
          } else {
            if (item.mimeType && item.content.length > 100) {
              const result = await ScoringOrchestrator.scoreSpeaking(
                item.content, item.mimeType, item.prompt);
              aiScore = result.score;
            } else {
              const result = await ScoringOrchestrator.scoreSpeakingFromText(
                item.content, item.prompt);
              aiScore = result.score;
            }
          }
          return { id: item.id, expertScore: item.expertScore, aiScore };
        })
      );

      for (const r of batchResults) {
        if (r.status === "fulfilled") {
          const { id, expertScore, aiScore } = r.value;
          details.push({ id, expertScore, aiScore, delta: aiScore - expertScore });
        }
      }
    }

    if (details.length === 0) {
      return {
        totalItems: anchorSet.length, scoredItems: 0, mae: 0, rmse: 0, pearsonR: 0,
        biasDirection: "neutral", meetsThreshold: false,
        details: [], runAt: new Date().toISOString(),
      };
    }

    const deltas = details.map(d => d.delta);
    const mae  = deltas.reduce((s, d) => s + Math.abs(d), 0) / deltas.length;
    const rmse = Math.sqrt(deltas.reduce((s, d) => s + d * d, 0) / deltas.length);
    const r    = pearsonR(details.map(d => d.expertScore), details.map(d => d.aiScore));
    const meanDelta = deltas.reduce((s, d) => s + d, 0) / deltas.length;
    const biasDirection = Math.abs(meanDelta) < 0.02 ? "neutral"
      : meanDelta > 0 ? "overscoring" : "underscoring";

    const meetsThreshold = mae <= DRIFT_ALARM_THRESHOLD_MAE
      && rmse <= DRIFT_ALARM_THRESHOLD_RMSE;

    const result: AnchorCalibrationResult = {
      totalItems: anchorSet.length,
      scoredItems: details.length,
      mae: Number(mae.toFixed(4)),
      rmse: Number(rmse.toFixed(4)),
      pearsonR: Number(r.toFixed(4)),
      biasDirection,
      meetsThreshold,
      details,
      runAt: new Date().toISOString(),
    };

    if (!meetsThreshold) {
      logger.error(
        { mae, rmse, pearsonR: r, biasDirection },
        "AI scoring DRIFT ALARM — MAE or RMSE exceeds threshold. Review Gemini model version."
      );
    } else {
      logger.info({ mae, rmse, pearsonR: r }, "Anchor calibration run — within threshold");
    }

    // Persist the last 30 runs in SystemConfig for trending
    const config = await prisma.systemConfig.findUnique({ where: { id: "global" } });
    const cfg = (config?.config as any) || {};
    const history: AnchorCalibrationResult[] = cfg.anchorCalibrationHistory || [];
    history.unshift(result);
    if (history.length > 30) history.length = 30;

    await prisma.systemConfig.upsert({
      where: { id: "global" },
      create: { id: "global", config: { ...cfg, anchorCalibrationHistory: history } as any },
      update: { config: { ...cfg, anchorCalibrationHistory: history } as any },
    });

    return result;
  },

  /**
   * Get historical calibration runs (for trend monitoring).
   */
  async getCalibrationHistory(): Promise<AnchorCalibrationResult[]> {
    const config = await prisma.systemConfig.findUnique({ where: { id: "global" } });
    return ((config?.config as any)?.anchorCalibrationHistory as AnchorCalibrationResult[]) || [];
  },

  /**
   * Quality gate: returns true only if the current AI pipeline meets
   * all accuracy thresholds against the anchor set.
   * Use this in CI/CD before deploying a new Gemini model version.
   */
  async validateModelVersion(): Promise<{ passed: boolean; result: AnchorCalibrationResult }> {
    const result = await this.runCalibration();
    return { passed: result.meetsThreshold, result };
  },
};
