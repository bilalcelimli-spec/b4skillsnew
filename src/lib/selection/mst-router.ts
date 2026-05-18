/**
 * MST Router
 *
 * Profile-driven Multi-Stage Testing routing for Junior Suite (2-stage)
 * and Academia (3-stage).
 *
 * Flow:
 *  Stage 0 — Routing module: administer `routingItemCount` items from the
 *            first section's pool without any track filter. After the last
 *            routing item, compute θ and assign a track label ("L"/"M"/"H"
 *            for Junior Suite; "B1"/"B2"/"C1+" for Academia).
 *
 *  Stage 1+ — Track modules: item pool is filtered to items tagged with
 *             the assigned track label (via `metadata.mstTrack`). Items
 *             without this tag are always eligible (untagged = universal).
 *
 * Integration with server-engine.ts:
 *   Call `resolveMstPhase()` before the item-query `whereClause` is built.
 *   If the function returns `shouldAssignTrack: true`, persist the track to
 *   session metadata before continuing so subsequent calls see the assignment.
 */

import { MSTConfig } from "../product-lines/profiles.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MstPhase {
  /** True while the routing module is still being administered */
  isRouting: boolean;
  /** Number of routing items still remaining (0 when routing is done) */
  routingItemsRemaining: number;
  /** Track label assigned after routing ("L"/"M"/"H" etc.) or null if not yet */
  trackLabel: string | null;
  /** True on the first call after the final routing item — caller must persist */
  shouldAssignTrack: boolean;
  /** θ at which routing decision was / will be made */
  routingTheta: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute the current MST phase for a session.
 *
 * @param meta              Session metadata (from `session.metadata as any`)
 * @param nonPretestCount   Total non-pretest responses so far
 * @param currentTheta      Current θ estimate
 * @param mstCfg            MST config from the product line profile
 */
export function resolveMstPhase(
  meta: Record<string, any>,
  nonPretestCount: number,
  currentTheta: number,
  mstCfg: MSTConfig
): MstPhase {
  const { routingItemCount, routingCuts, trackLabels } = mstCfg;

  // If track already assigned in a previous call, return stable state
  const savedTrack: string | null = meta.mstTrack ?? null;
  if (savedTrack) {
    return {
      isRouting: false,
      routingItemsRemaining: 0,
      trackLabel: savedTrack,
      shouldAssignTrack: false,
      routingTheta: meta.mstRoutingTheta ?? currentTheta,
    };
  }

  const remaining = routingItemCount - nonPretestCount;

  // Still in routing module
  if (remaining > 0) {
    return {
      isRouting: true,
      routingItemsRemaining: remaining,
      trackLabel: null,
      shouldAssignTrack: false,
      routingTheta: currentTheta,
    };
  }

  // Routing module just completed — assign track
  const track = assignTrack(currentTheta, routingCuts, trackLabels);

  return {
    isRouting: false,
    routingItemsRemaining: 0,
    trackLabel: track,
    shouldAssignTrack: true,
    routingTheta: currentTheta,
  };
}

/**
 * Assign a track label based on θ and the configured cut-points.
 * routingCuts has (numTracks - 1) values.
 * E.g. cuts = [-1.0, 0.8], labels = ["L","M","H"]:
 *   θ < -1.0 → "L", -1.0 ≤ θ < 0.8 → "M", θ ≥ 0.8 → "H"
 */
export function assignTrack(
  theta: number,
  routingCuts: number[],
  trackLabels: string[]
): string {
  for (let i = 0; i < routingCuts.length; i++) {
    if (theta < routingCuts[i]) {
      return trackLabels[i];
    }
  }
  return trackLabels[trackLabels.length - 1];
}

/**
 * Build a Prisma-compatible OR clause to filter items by MST track.
 *
 * NOTE: The previous implementation used `{ path: ["mstTrack"], not: {} }` to
 * match items without a track assignment, but Prisma translates this to
 * `metadata->'mstTrack' <> '{}'` in SQL. When the key is absent the path
 * evaluates to NULL, and `NULL <> '{}'` is NULL (not TRUE) in PostgreSQL —
 * so ALL items without `mstTrack` in their metadata were excluded, emptying
 * every section pool after the routing module completed.
 *
 * Current item bank stores no `metadata.mstTrack` on any item, so the track
 * filter is intentionally a no-op. MST routing still assigns a track to the
 * session (persisted as `session.metadata.mstTrack`); items are selected
 * adaptively by difficulty/discrimination from the full section pool instead
 * of a track-restricted subset.
 *
 * To re-enable track filtering: tag items with `metadata: { mstTrack: "L" }`
 * etc. and restore the Prisma filter using IS NULL / OR NULL handling via raw SQL.
 */
export function buildMstTagFilter(
  _phase: MstPhase
): undefined {
  // Track filter disabled — see note above.
  return undefined;
}

/**
 * Merge an MST track filter into an existing Prisma where clause.
 * Safe to call with `trackFilter = undefined` (no-op).
 */
export function mergeTrackFilter(
  whereClause: Record<string, any>,
  _trackFilter: ReturnType<typeof buildMstTagFilter>
): Record<string, any> {
  return whereClause;
}
