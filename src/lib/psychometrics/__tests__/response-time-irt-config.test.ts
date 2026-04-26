import { describe, it, expect } from "vitest";
import {
  DEFAULT_RESPONSE_TIME_PARAMS,
  responseTimeParamsFromItemContent,
} from "../response-time-irt";

describe("responseTimeParamsFromItemContent (Faz4 RT-IRT)", () => {
  it("uses defaults for empty/invalid content", () => {
    const p = responseTimeParamsFromItemContent(null);
    expect(p.beta).toBe(DEFAULT_RESPONSE_TIME_PARAMS.beta);
    expect(p.alpha).toBe(DEFAULT_RESPONSE_TIME_PARAMS.alpha);
  });

  it("reads named keys from item content", () => {
    const p = responseTimeParamsFromItemContent({
      rtTimeBeta: 4,
      rtTimeAlpha: 1.2,
      rtTimeSigma2: 0.4,
    });
    expect(p.beta).toBe(4);
    expect(p.alpha).toBe(1.2);
    expect(p.sigma2).toBe(0.4);
  });
});
