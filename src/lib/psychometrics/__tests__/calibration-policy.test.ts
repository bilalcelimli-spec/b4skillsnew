import { describe, expect, it } from "vitest";
import { CALIBRATION_POLICY, describeCalibrationPolicy, evaluatePublishGate } from "../calibration-policy";

const good = { n: 250, a: 1.2, b: 0.3, c: 0.18, bSe: 0.18, infit: 1.02, outfit: 0.97, pointBiserial: 0.41, iqScore: 82, deltaB: 0.1, driftClass: "A" };

describe("calibration policy — publish gate", () => {
  it("has one source of truth for the thresholds the roadmap fixed", () => {
    expect(CALIBRATION_POLICY.publishMinN).toBe(200);
    expect(CALIBRATION_POLICY.publishMaxBSe).toBe(0.25);
    expect(CALIBRATION_POLICY.minIqs).toBe(65);
    expect(CALIBRATION_POLICY.maxDeltaB).toBe(0.30);
    expect(CALIBRATION_POLICY.estimateMinN).toBeGreaterThan(0);
    expect(Object.keys(describeCalibrationPolicy())).toEqual(["estimate", "publish", "fit", "stability"]);
  });

  it("passes a well-estimated item", () => {
    expect(evaluatePublishGate(good)).toEqual({ eligible: true, reasons: [] });
  });

  it("lists every failed criterion", () => {
    const out = evaluatePublishGate({ ...good, n: 120, bSe: 0.31, infit: 1.6, pointBiserial: 0.1, iqScore: 50, deltaB: 0.5, driftClass: "C" });
    expect(out.eligible).toBe(false);
    expect(out.reasons).toEqual(expect.arrayContaining([
      "N_BELOW_200", "B_SE_TOO_LARGE", "INFIT_OUT_OF_RANGE", "POINT_BISERIAL_LOW", "IQS_BELOW_MIN", "DELTA_B_UNSTABLE", "DRIFT_CLASS_C",
    ]));
  });

  it("requires a standard error but tolerates missing fit, IQS and drift information", () => {
    expect(evaluatePublishGate({ n: 250, a: 1.0, b: 0, c: 0.1, bSe: 0.2 })).toEqual({ eligible: true, reasons: [] });
    expect(evaluatePublishGate({ n: 250, a: 1.0, b: 0, c: 0.1 }).reasons).toEqual(["B_SE_MISSING"]);
  });

  it("rejects parameters outside the publishable range", () => {
    expect(evaluatePublishGate({ ...good, a: 0.3 }).reasons).toEqual(["A_OUT_OF_RANGE"]);
    expect(evaluatePublishGate({ ...good, a: 3.5 }).reasons).toEqual(["A_OUT_OF_RANGE"]);
    expect(evaluatePublishGate({ ...good, c: 0.5 }).reasons).toEqual(["C_OUT_OF_RANGE"]);
    expect(evaluatePublishGate({ ...good, b: Number.NaN }).reasons).toEqual(["B_NOT_FINITE"]);
  });
});
