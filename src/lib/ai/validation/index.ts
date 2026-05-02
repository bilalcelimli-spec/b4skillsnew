/**
 * Phase 1 Validation Gate System — public surface.
 *
 * Usage:
 *   import { validateDraftItem } from "@/lib/ai/validation";
 *   const report = await validateDraftItem(draft, { bankItems });
 *   if (report.verdict === "PUBLISH") {
 *     // auto-publish to PRETEST
 *   }
 */

export * from "./types.js";
export {
  validateDraftItem,
  validateDraftItemBatch,
} from "./orchestrator.js";
export {
  embedText,
  embedBatch,
  cosine,
  cosineDistance,
  isEmbeddingAvailable,
  clearEmbeddingCache,
} from "./embeddings.js";
export { isJudgeAvailable } from "./prompt-judge.js";

export { runStructuralGate } from "./gates/structural.js";
export { runReadabilityGate } from "./gates/readability.js";
export { runDistractorQualityGate } from "./gates/distractor-quality.js";
export { runKeyUniquenessGate } from "./gates/key-uniqueness.js";
export { runDuplicateGate } from "./gates/duplicate.js";
export { runBiasFairnessGate } from "./gates/bias-fairness.js";
export { runPlagiarismGate } from "./gates/plagiarism.js";
