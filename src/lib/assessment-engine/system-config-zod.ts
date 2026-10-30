import { z } from "zod";

/**
 * Faz7: Typed validation for `SystemConfig` JSON (global assessment engine + priors).
 * Unknown top-level keys are allowed (passthrough) for forward compatibility.
 *
 * Which keys the LIVE adaptive flow (server-engine.ts → CATSelector) actually reads
 * (Faz 0 audit, 2026-10-30):
 *   effective  — cefrThresholds, priorMean, priorSd (org prior, Faz 1), pretestRatio
 *                (pretest slots, Faz 2), useRtIrt (default ON, flag-only), useGrmProductive,
 *                useRlSelector, useMirt / useMirt2B (default OFF, exploratory estimation only),
 *                speedThresholdMs (rapid-guess flag), useOnlineRecalibration, itemRetirement,
 *                difDetection.
 *   NOT read   — minItems, maxItems, semThreshold, blueprint (kept for standalone
 *                flows; per-profile values come from product-lines/profiles.ts).
 *   removed    — useShadowTest, sprt, mst, classificationConfidenceThreshold (Faz 1):
 *                selection is CATSelector-only and section stop rules are declared per
 *                profile (`stopRules`). Stored values are ignored via passthrough.
 */
export const SystemConfigPayloadSchema = z
  .object({
    useRtIrt: z.boolean().optional(),
    useGrmProductive: z.boolean().optional(),
    useRlSelector: z.boolean().optional(),
    useMirt2B: z.boolean().optional(),
    useMirt: z.boolean().optional(),
    useOnlineRecalibration: z.boolean().optional(),
    pretestRatio: z.number().min(0).max(1).optional(),
    minItems: z.number().int().min(1).max(200).optional(),
    maxItems: z.number().int().min(1).max(200).optional(),
    semThreshold: z.number().min(0.01).max(2).optional(),
    speedThresholdMs: z.number().min(0).max(120_000).optional(),
    priorMean: z.number().min(-6).max(6).optional(),
    priorSd: z.number().min(0.1).max(4).optional(),
    cefrThresholds: z.record(z.string(), z.number().finite()).optional(),
    blueprint: z.array(z.unknown()).optional(),
    itemRetirement: z
      .object({
        enabled: z.boolean().optional(),
        minResponses: z.number().int().min(10).max(1000).optional(),
        gracePeriodDays: z.number().int().min(1).max(30).optional(),
        scoreThresholds: z
          .object({
            flag: z.number().min(0).max(1).optional(),
            autoRetire: z.number().min(0).max(1).optional(),
          })
          .optional(),
        cronSchedule: z.string().optional(),
      })
      .optional(),
    difDetection: z
      .object({
        enabled: z.boolean().optional(),
        minResponses: z.number().int().min(10).max(1000).optional(),
        cronSchedule: z.string().optional(),
        thresholds: z
          .object({
            pValue: z.number().min(0.001).max(0.5).optional(),
            effectSize: z.number().min(0.1).max(5).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough();

export class SystemConfigValidationError extends Error {
  statusCode: 400;
  zodError: z.ZodFlattenedError<unknown> | null;
  constructor(message: string, zod: z.ZodFlattenedError<unknown> | null) {
    super(message);
    this.name = "SystemConfigValidationError";
    this.statusCode = 400;
    this.zodError = zod;
  }
}

export function parseSystemConfigPayload(config: unknown): Record<string, unknown> {
  const r = SystemConfigPayloadSchema.safeParse(config);
  if (!r.success) {
    throw new SystemConfigValidationError("Invalid system config", r.error.flatten());
  }
  return r.data as Record<string, unknown>;
}
