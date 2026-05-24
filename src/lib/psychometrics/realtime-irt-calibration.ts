/**
 * Real-Time IRT Calibration Streaming
 * ─────────────────────────────────────────────────────────────────────────────
 * Streams live parameter updates to connected admin dashboards via WebSocket.
 *
 * Architecture:
 *   1. As responses arrive at POST /api/sessions/:id/respond, the server
 *      appends observations to an in-memory ring buffer per item.
 *   2. Every CALIBRATION_INTERVAL_MS the CalibrationStreamer:
 *      a. Runs one EM cycle for each item that has accumulated ≥ MIN_N new obs
 *      b. Emits a CalibrationUpdate event over WebSocket to subscribed admins
 *      c. Persists accepted updates to the DB
 *   3. Admin dashboard subscribes via WS message: { type: "subscribe_calibration" }
 *
 * This is a streaming / incremental companion to the batch online-calibration.ts.
 * It trades statistical optimality for immediacy (live dashboards, fast feedback).
 *
 * References:
 *   Linden & Hambleton (1997), Chapter 18 — Online Calibration
 *   Stocking (1990), Psychometrika 55(3)
 */

import { EventEmitter } from "events";
import { probability } from "../assessment-engine/irt.js";
import type { IrtParameters } from "../assessment-engine/types.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const CALIBRATION_INTERVAL_MS = parseInt(process.env.REALTIME_CALIB_INTERVAL_MS ?? "15000", 10);
const MIN_NEW_OBS    = parseInt(process.env.REALTIME_CALIB_MIN_N ?? "20",  10);
const MAX_DELTA_B    = 0.5;
const NR_ITERATIONS  = 5;
const NR_DAMPEN      = 0.5;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RealtimeObservation {
  theta: number;
  score: 0 | 1;
  weight?: number;
}

export interface ItemBuffer {
  itemId: string;
  params: IrtParameters;
  newObs: RealtimeObservation[];    // observations since last calibration
  totalObs: number;
  lastCalibratedAt: string | null;
}

export interface CalibrationUpdate {
  type: "calibration_update";
  itemId: string;
  previousParams: IrtParameters;
  updatedParams: IrtParameters;
  deltaB: number;
  deltaA: number;
  obsUsed: number;
  totalObs: number;
  stable: boolean;
  timestamp: string;
}

export interface CalibrationCycleSummary {
  type: "calibration_cycle";
  cycleAt: string;
  itemsEvaluated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  updates: CalibrationUpdate[];
}

// ── EAP theta grid (simplified — matches online-calibration.ts) ───────────────

const THETA_GRID = Array.from({ length: 61 }, (_, i) => -3 + i * 0.1);
const PRIOR_WEIGHTS = THETA_GRID.map((t) => Math.exp(-0.5 * t * t) / Math.sqrt(2 * Math.PI) * 0.1);

// ── Newton-Raphson EM update ──────────────────────────────────────────────────

function emUpdate(
  obs: RealtimeObservation[],
  params: IrtParameters
): { updated: IrtParameters; stable: boolean; deltaB: number; deltaA: number } {
  let { a, b, c } = params;

  for (let iter = 0; iter < NR_ITERATIONS; iter++) {
    let dLdb = 0, d2Ldb2 = 0;
    let dLda = 0, d2Lda2 = 0;

    for (const obs_i of obs) {
      const w = obs_i.weight ?? 1;
      const p = probability(obs_i.theta, { a, b, c });
      const safeP = Math.max(1e-6, Math.min(1 - 1e-6, p));
      const resid = (obs_i.score - safeP) / (safeP * (1 - safeP));

      const dPdb = -a * (1 - c) * safeP * (1 - safeP);
      const dPda = (obs_i.theta - b) * (1 - c) * safeP * (1 - safeP);

      dLdb  += w * resid * dPdb;
      d2Ldb2 += w * (dPdb * dPdb / (safeP * (1 - safeP)));
      dLda  += w * resid * dPda;
      d2Lda2 += w * (dPda * dPda / (safeP * (1 - safeP)));
    }

    const stepB = d2Ldb2 > 1e-8 ? NR_DAMPEN * dLdb / d2Ldb2 : 0;
    const stepA = d2Lda2 > 1e-8 ? NR_DAMPEN * dLda / d2Lda2 : 0;
    b -= stepB;
    a = Math.max(0.3, Math.min(3.0, a + stepA));
  }

  const deltaB = b - params.b;
  const deltaA = a - params.a;
  const stable = Math.abs(deltaB) <= MAX_DELTA_B && a >= 0.3 && a <= 3.0 && c >= 0 && c <= 0.35;

  return {
    updated: stable ? { a: Math.round(a * 1000) / 1000, b: Math.round(b * 1000) / 1000, c: params.c } : params,
    stable,
    deltaB,
    deltaA,
  };
}

// ── Calibration Streamer ──────────────────────────────────────────────────────

class CalibrationStreamer extends EventEmitter {
  private readonly buffers = new Map<string, ItemBuffer>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  /** Register item parameters (called at server startup from item bank). */
  registerItem(itemId: string, params: IrtParameters) {
    if (!this.buffers.has(itemId)) {
      this.buffers.set(itemId, {
        itemId,
        params,
        newObs: [],
        totalObs: 0,
        lastCalibratedAt: null,
      });
    }
  }

  /** Push a new observation. Called every time a response is submitted. */
  pushObservation(itemId: string, theta: number, score: 0 | 1, weight = 1.0) {
    let buf = this.buffers.get(itemId);
    if (!buf) {
      // Unregistered item — create buffer with flat priors
      buf = { itemId, params: { a: 1.0, b: 0.0, c: 0.2 }, newObs: [], totalObs: 0, lastCalibratedAt: null };
      this.buffers.set(itemId, buf);
    }
    buf.newObs.push({ theta, score, weight });
    buf.totalObs++;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => this.runCycle(), CALIBRATION_INTERVAL_MS);
    console.log(`[RealtimeCalibration] Started — interval=${CALIBRATION_INTERVAL_MS}ms, minN=${MIN_NEW_OBS}`);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.running = false;
  }

  private runCycle() {
    const cycleAt = new Date().toISOString();
    const updates: CalibrationUpdate[] = [];
    let itemsEvaluated = 0;
    let itemsSkipped = 0;

    for (const [itemId, buf] of this.buffers) {
      if (buf.newObs.length < MIN_NEW_OBS) { itemsSkipped++; continue; }
      itemsEvaluated++;

      const obsToUse = buf.newObs.splice(0, buf.newObs.length); // drain buffer
      const { updated, stable, deltaB, deltaA } = emUpdate(obsToUse, buf.params);

      const update: CalibrationUpdate = {
        type: "calibration_update",
        itemId,
        previousParams: { ...buf.params },
        updatedParams: updated,
        deltaB: Math.round(deltaB * 1000) / 1000,
        deltaA: Math.round(deltaA * 1000) / 1000,
        obsUsed: obsToUse.length,
        totalObs: buf.totalObs,
        stable,
        timestamp: new Date().toISOString(),
      };

      buf.params = updated;
      buf.lastCalibratedAt = cycleAt;
      updates.push(update);

      // Emit per-item event for WebSocket broadcast
      this.emit("item_calibrated", update);
    }

    const summary: CalibrationCycleSummary = {
      type: "calibration_cycle",
      cycleAt,
      itemsEvaluated,
      itemsUpdated: updates.filter((u) => u.stable).length,
      itemsSkipped,
      updates,
    };

    if (updates.length > 0) {
      this.emit("cycle_complete", summary);
      console.log(`[RealtimeCalibration] Cycle: evaluated=${itemsEvaluated} updated=${summary.itemsUpdated} skipped=${itemsSkipped}`);
    }
  }

  getBufferSnapshot(): Array<Omit<ItemBuffer, "newObs"> & { pendingObs: number }> {
    return Array.from(this.buffers.values()).map(({ newObs, ...rest }) => ({
      ...rest,
      pendingObs: newObs.length,
    }));
  }
}

export const calibrationStreamer = new CalibrationStreamer();

// Auto-start in server context
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  calibrationStreamer.start();
}
