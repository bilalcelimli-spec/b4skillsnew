/**
 * Test Equating & Item Audit Trail
 * 
 * Common-item equating (Stocking-Lord method) for linking
 * different test forms to the same scale.
 * Item version history for audit compliance.
 */

import { probability, information } from "../assessment-engine/irt";
import { IrtParameters } from "../assessment-engine/types";

export interface EquatingResult {
  /** Scale transformation: θ_new = A * θ_old + B */
  A: number;
  B: number;
  /** Method used */
  method: "STOCKING_LORD" | "HAEBARA" | "MEAN_SIGMA" | "MEAN_MEAN";
  /** Common items used */
  commonItemCount: number;
  /** Root mean squared difference in TCC */
  rmsd: number;
}

export interface ItemVersion {
  itemId: string;
  version: number;
  timestamp: Date;
  changeType: "CREATED" | "PARAMS_UPDATED" | "CONTENT_EDITED" | "STATUS_CHANGED" | "RETIRED";
  changedBy: string;
  previousValues?: Record<string, any>;
  newValues: Record<string, any>;
  reason: string;
}

/**
 * Mean/Sigma equating method
 * A = σ(b_new) / σ(b_old)
 * B = mean(b_new) - A * mean(b_old)
 */
export function meanSigmaEquating(
  commonItemsOld: IrtParameters[],
  commonItemsNew: IrtParameters[]
): EquatingResult {
  if (commonItemsOld.length !== commonItemsNew.length || commonItemsOld.length < 3) {
    throw new Error("Need at least 3 matching common items");
  }

  const bOld = commonItemsOld.map(p => p.b);
  const bNew = commonItemsNew.map(p => p.b);

  const meanOld = bOld.reduce((a, b) => a + b, 0) / bOld.length;
  const meanNew = bNew.reduce((a, b) => a + b, 0) / bNew.length;

  const sdOld = Math.sqrt(bOld.reduce((s, b) => s + (b - meanOld) ** 2, 0) / (bOld.length - 1));
  const sdNew = Math.sqrt(bNew.reduce((s, b) => s + (b - meanNew) ** 2, 0) / (bNew.length - 1));

  const A = sdOld > 0 ? sdNew / sdOld : 1;
  const B = meanNew - A * meanOld;

  // Calculate RMSD of TCC
  const rmsd = tccRMSD(commonItemsOld, commonItemsNew, A, B);

  return { A: Number(A.toFixed(4)), B: Number(B.toFixed(4)), method: "MEAN_SIGMA", commonItemCount: commonItemsOld.length, rmsd };
}

/**
 * Stocking-Lord equating (characteristic curve method)
 * Minimizes the squared difference between TCCs across theta
 */
export function stockingLordEquating(
  commonItemsOld: IrtParameters[],
  commonItemsNew: IrtParameters[]
): EquatingResult {
  if (commonItemsOld.length !== commonItemsNew.length || commonItemsOld.length < 3) {
    throw new Error("Need at least 3 matching common items");
  }

  // Start with Mean/Sigma as initial values
  const initial = meanSigmaEquating(commonItemsOld, commonItemsNew);
  let bestA = initial.A;
  let bestB = initial.B;
  let bestRMSD = initial.rmsd;

  // Grid search refinement around initial estimates
  for (let dA = -0.3; dA <= 0.3; dA += 0.02) {
    for (let dB = -0.5; dB <= 0.5; dB += 0.02) {
      const A = initial.A + dA;
      const B = initial.B + dB;
      const rmsd = tccRMSD(commonItemsOld, commonItemsNew, A, B);
      if (rmsd < bestRMSD) {
        bestRMSD = rmsd;
        bestA = A;
        bestB = B;
      }
    }
  }

  return {
    A: Number(bestA.toFixed(4)),
    B: Number(bestB.toFixed(4)),
    method: "STOCKING_LORD",
    commonItemCount: commonItemsOld.length,
    rmsd: Number(bestRMSD.toFixed(5)),
  };
}

/**
 * Apply equating transformation to theta scores
 */
export function transformTheta(theta: number, equating: EquatingResult): number {
  return equating.A * theta + equating.B;
}

/**
 * Apply equating transformation to item parameters
 */
export function transformItemParams(
  params: IrtParameters,
  equating: EquatingResult
): IrtParameters {
  return {
    a: params.a / equating.A,
    b: equating.A * params.b + equating.B,
    c: params.c,
  };
}

/**
 * RMSD of test characteristic curves
 */
function tccRMSD(
  itemsOld: IrtParameters[],
  itemsNew: IrtParameters[],
  A: number,
  B: number
): number {
  const thetaPoints = [];
  for (let t = -4; t <= 4; t += 0.5) thetaPoints.push(t);

  let sumSqDiff = 0;
  for (const theta of thetaPoints) {
    let tccOld = 0;
    let tccNew = 0;

    for (let i = 0; i < itemsOld.length; i++) {
      // Transform old params to new scale
      const transformedOld: IrtParameters = {
        a: itemsOld[i].a / A,
        b: A * itemsOld[i].b + B,
        c: itemsOld[i].c,
      };
      tccOld += probability(theta, transformedOld);
      tccNew += probability(theta, itemsNew[i]);
    }

    sumSqDiff += (tccOld - tccNew) ** 2;
  }

  return Math.sqrt(sumSqDiff / thetaPoints.length);
}

// ========== ITEM AUDIT TRAIL ==========

const auditLog: ItemVersion[] = [];

/**
 * Record an item change in the audit trail
 */
export function recordItemChange(entry: ItemVersion): void {
  auditLog.push(entry);
}

/**
 * Get audit trail for a specific item
 */
export function getItemHistory(itemId: string): ItemVersion[] {
  return auditLog
    .filter(e => e.itemId === itemId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Get all changes within a date range
 */
export function getAuditLog(
  from: Date,
  to: Date,
  changeType?: ItemVersion["changeType"]
): ItemVersion[] {
  return auditLog
    .filter(e => {
      const inRange = e.timestamp >= from && e.timestamp <= to;
      const matchType = !changeType || e.changeType === changeType;
      return inRange && matchType;
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
