import { z } from "zod";

/**
 * Faz7: Typed validation for `SystemConfig` JSON (global assessment engine + priors).
 * Unknown top-level keys are allowed (passthrough) for forward compatibility.
 */
export const SystemConfigPayloadSchema = z
  .object({
    useRtIrt: z.boolean().optional(),
    useGrmProductive: z.boolean().optional(),
    useMirt2B: z.boolean().optional(),
    useMirt: z.boolean().optional(),
    useShadowTest: z.boolean().optional(),
    pretestRatio: z.number().min(0).max(1).optional(),
    minItems: z.number().int().min(1).max(200).optional(),
    maxItems: z.number().int().min(1).max(200).optional(),
    semThreshold: z.number().min(0.01).max(2).optional(),
    speedThresholdMs: z.number().min(0).max(120_000).optional(),
    classificationConfidenceThreshold: z.number().min(0.5).max(0.999).optional(),
    priorMean: z.number().min(-6).max(6).optional(),
    priorSd: z.number().min(0.1).max(4).optional(),
    mst: z
      .object({
        enabled: z.boolean(),
        moduleSizes: z.array(z.number().int().positive()),
        continueWithCatAfterMst: z.boolean().optional(),
        routing: z
          .object({ lowMaxTheta: z.number(), midMaxTheta: z.number() })
          .optional(),
      })
      .optional(),
    sprt: z
      .object({
        enabled: z.boolean(),
        alpha: z.number().min(0.001).max(0.5).optional(),
        beta: z.number().min(0.001).max(0.5).optional(),
        halfWidth: z.number().min(0.01).max(1).optional(),
        minItems: z.number().int().min(1).max(200).optional(),
      })
      .optional(),
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
