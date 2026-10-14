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

  it("emits an info alert when the anchor corpus is empty (evidence failure)", () => {
    const decision = evaluateCalibrationResult(
      baseResult({ totalItems: 0, scoredItems: 0, meetsThreshold: true })
    );
    expect(decision.exitCode).toBe(2);
    expect(decision.alertSeverity).toBe("warning");
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

it('does not trust a success flag with incomplete scoring or failed numerical limits',()=>{
 expect(evaluateCalibrationResult(baseResult({scoredItems:49,meetsThreshold:true})).exitCode).toBe(1);
 expect(evaluateCalibrationResult(baseResult({mae:.2,meetsThreshold:true})).exitCode).toBe(1);
});
it('distinguishes absent evidence from model outages without a zero-error success',()=>{
 const result=baseResult({scoredItems:0,mae:null,rmse:null,pearsonR:null,excludedItems:[{id:'one',reasons:['RUBRIC_MISSING']}]});
 expect(evaluateCalibrationResult(result).exitCode).toBe(2);
 expect(evaluateCalibrationResult(baseResult({evidenceGaps:['WRITING_ANCHORS_BELOW_30']})).exitCode).toBe(2);
});
it('rejects invalid numerical metrics and signals undefined variation',()=>{
 expect(evaluateCalibrationResult(baseResult({mae:NaN})).exitCode).toBe(1);
 expect(evaluateCalibrationResult(baseResult({pearsonR:null})).exitCode).toBe(2);
});
it('independently checks per-skill values even when the pooled metrics and flag look good',()=>{
 const metric={n:30,mae:.02,rmse:.02,pearsonR:1};
 const result=baseResult({bySkill:{WRITING:metric,SPEAKING:{...metric,mae:.1}}});
 expect(evaluateCalibrationResult(result).exitCode).toBe(1);
 expect(evaluateCalibrationResult({...result,bySkill:{WRITING:metric,SPEAKING:{...metric,n:2}}}).exitCode).toBe(2);
});
it('does not accept impossible counts or negative error metrics',()=>{
 expect(evaluateCalibrationResult(baseResult({totalItems:0,scoredItems:1})).exitCode).toBe(1);
 expect(evaluateCalibrationResult(baseResult({mae:-.1})).exitCode).toBe(1);
});
