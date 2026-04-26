import { describe, it, expect } from "vitest";
import { evaluateCalibrationResult } from "../../../../scripts/anchor-calibration-runner";
import type { AnchorCalibrationResult } from "../anchor-calibration-service";

const baseResult = (overrides: Partial<AnchorCalibrationResult> = {}): AnchorCalibrationResult => ({
  totalItems: 50,
  scoredItems: 50,
  mae: 0.05,
  rmse: 0.08,
  pearsonR: 0.92,
  biasDirection: "neutral",
  meetsThreshold: true,
  details: [],
  runAt: new Date().toISOString(),
  ...overrides,
});

describe("evaluateCalibrationResult()", () => {
  it("returns exitCode 0 with no alert when thresholds are met", () => {
    const decision = evaluateCalibrationResult(baseResult());
    expect(decision.exitCode).toBe(0);
    expect(decision.alertSeverity).toBe("none");
    expect(decision.alertMessage).toBeNull();
  });

  it("emits an info alert when the anchor corpus is empty (clean exit)", () => {
    const decision = evaluateCalibrationResult(
      baseResult({ totalItems: 0, scoredItems: 0, meetsThreshold: true })
    );
    expect(decision.exitCode).toBe(0);
    expect(decision.alertSeverity).toBe("info");
    expect(decision.alertMessage).toMatch(/empty/i);
  });

  it("returns exitCode 1 with error alert when MAE exceeds threshold", () => {
    const decision = evaluateCalibrationResult(
      baseResult({ mae: 0.12, meetsThreshold: false })
    );
    expect(decision.exitCode).toBe(1);
    expect(decision.alertSeverity).toBe("error");
    expect(decision.alertMessage).toMatch(/MAE=0\.12/);
  });

  it("returns exitCode 1 with error alert when scoring outage produced 0 scored", () => {
    const decision = evaluateCalibrationResult(
      baseResult({ scoredItems: 0, meetsThreshold: false })
    );
    expect(decision.exitCode).toBe(1);
    expect(decision.alertSeverity).toBe("error");
    expect(decision.alertMessage).toMatch(/could not score/i);
  });

  it("includes bias direction in the failure message", () => {
    const decision = evaluateCalibrationResult(
      baseResult({
        mae: 0.10,
        meetsThreshold: false,
        biasDirection: "overscoring",
      })
    );
    expect(decision.alertMessage).toMatch(/overscoring/);
  });
});
