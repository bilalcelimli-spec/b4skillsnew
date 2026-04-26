import { describe, it, expect } from "vitest";
import type { IrtParameters } from "../../assessment-engine/types";
import {
  meanSigmaEquating,
  stockingLordEquating,
  transformTheta,
  transformItemParams,
  recordItemChange,
  getItemHistory,
  getAuditLog,
} from "../equating-audit";

function buildShiftedCommonItems(
  base: IrtParameters[],
  A: number,
  B: number
): IrtParameters[] {
  return base.map((p) => ({
    a: p.a / A,
    b: A * p.b + B,
    c: p.c,
  }));
}

describe("meanSigmaEquating()", () => {
  it("recovers A and B from a known linear shift", () => {
    const oldParams: IrtParameters[] = [
      { a: 0.8, b: -1.5, c: 0.2 },
      { a: 1.0, b: -0.5, c: 0.2 },
      { a: 1.2, b: 0.0, c: 0.2 },
      { a: 1.0, b: 0.8, c: 0.2 },
      { a: 0.9, b: 1.6, c: 0.2 },
    ];

    const expectedA = 1.2;
    const expectedB = -0.3;
    const newParams = buildShiftedCommonItems(oldParams, expectedA, expectedB);

    const result = meanSigmaEquating(oldParams, newParams);
    expect(result.method).toBe("MEAN_SIGMA");
    expect(result.commonItemCount).toBe(5);
    expect(result.A).toBeCloseTo(expectedA, 2);
    expect(result.B).toBeCloseTo(expectedB, 2);
    expect(result.rmsd).toBeLessThan(0.02);
  });

  it("throws when there are fewer than three common items", () => {
    const oldParams: IrtParameters[] = [
      { a: 1, b: -1, c: 0.2 },
      { a: 1, b: 0, c: 0.2 },
    ];
    const newParams = oldParams.map((p) => ({ ...p }));
    expect(() => meanSigmaEquating(oldParams, newParams)).toThrow(
      "Need at least 3 matching common items"
    );
  });
});

describe("stockingLordEquating()", () => {
  it("does not worsen RMSD against mean/sigma baseline", () => {
    const oldParams: IrtParameters[] = [
      { a: 0.7, b: -2.0, c: 0.2 },
      { a: 0.9, b: -1.0, c: 0.2 },
      { a: 1.1, b: -0.3, c: 0.2 },
      { a: 1.3, b: 0.4, c: 0.2 },
      { a: 1.0, b: 1.0, c: 0.2 },
      { a: 0.8, b: 1.8, c: 0.2 },
    ];
    const newParams = buildShiftedCommonItems(oldParams, 1.15, 0.25);

    const meanSigma = meanSigmaEquating(oldParams, newParams);
    const stockingLord = stockingLordEquating(oldParams, newParams);

    expect(stockingLord.method).toBe("STOCKING_LORD");
    expect(stockingLord.rmsd).toBeLessThanOrEqual(meanSigma.rmsd + 1e-6);
  });
});

describe("transformTheta() and transformItemParams()", () => {
  it("applies the equating transform to theta and item parameters", () => {
    const eq = {
      A: 1.25,
      B: -0.5,
      method: "MEAN_SIGMA" as const,
      commonItemCount: 4,
      rmsd: 0.01,
    };
    const theta = 0.8;
    const item: IrtParameters = { a: 1.5, b: -0.2, c: 0.2 };

    expect(transformTheta(theta, eq)).toBeCloseTo(0.5, 6);
    const transformed = transformItemParams(item, eq);
    expect(transformed.a).toBeCloseTo(1.2, 6);
    expect(transformed.b).toBeCloseTo(-0.75, 6);
    expect(transformed.c).toBeCloseTo(0.2, 6);
  });
});

describe("item audit trail", () => {
  it("returns item history in descending timestamp order", () => {
    const itemId = "equating-audit-history-order";
    const first = new Date("2026-01-01T10:00:00.000Z");
    const second = new Date("2026-01-01T11:00:00.000Z");

    recordItemChange({
      itemId,
      version: 1,
      timestamp: first,
      changeType: "CREATED",
      changedBy: "system",
      newValues: { status: "draft" },
      reason: "Initial creation",
    });

    recordItemChange({
      itemId,
      version: 2,
      timestamp: second,
      changeType: "PARAMS_UPDATED",
      changedBy: "psychometrician",
      previousValues: { b: -0.2 },
      newValues: { b: -0.15 },
      reason: "Calibration update",
    });

    const history = getItemHistory(itemId);
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe(2);
    expect(history[1].version).toBe(1);
  });

  it("filters audit logs by date range and optional change type", () => {
    const itemId = "equating-audit-range-filter";
    const inRange = new Date("2026-02-10T10:00:00.000Z");
    const outOfRange = new Date("2026-02-01T10:00:00.000Z");

    recordItemChange({
      itemId,
      version: 1,
      timestamp: outOfRange,
      changeType: "CREATED",
      changedBy: "system",
      newValues: { status: "draft" },
      reason: "Initial creation",
    });

    recordItemChange({
      itemId,
      version: 2,
      timestamp: inRange,
      changeType: "STATUS_CHANGED",
      changedBy: "admin",
      previousValues: { status: "draft" },
      newValues: { status: "active" },
      reason: "Activation",
    });

    const rangeFrom = new Date("2026-02-09T00:00:00.000Z");
    const rangeTo = new Date("2026-02-11T00:00:00.000Z");
    const all = getAuditLog(rangeFrom, rangeTo);
    const statusOnly = getAuditLog(rangeFrom, rangeTo, "STATUS_CHANGED");

    expect(all.some((e) => e.itemId === itemId && e.version === 2)).toBe(true);
    expect(all.some((e) => e.itemId === itemId && e.version === 1)).toBe(false);
    expect(statusOnly.every((e) => e.changeType === "STATUS_CHANGED")).toBe(true);
    expect(statusOnly.some((e) => e.itemId === itemId && e.version === 2)).toBe(
      true
    );
  });
});
