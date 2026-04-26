/**
 * Sympson–Hetter style conditional exposure: penalty depends on the examinee's θ band,
 * not only global item frequency. See e.g. Sympson & Hetter (1985); implemented here as
 * "share of this item among all deliveries in the same θ stratum" capped at k_max.
 */

export const STRATUM_COUNT = 5;

/** Minimum number of *administrations* in a stratum before trusting conditional rates. */
export const DEFAULT_MIN_STRATUM_N = 24;

/**
 * Map θ to stratum index 0..STRATUM_COUNT-1
 */
export function thetaToStratum(theta: number): number {
  if (!Number.isFinite(theta)) return Math.floor(STRATUM_COUNT / 2);
  if (theta < -1.5) return 0;
  if (theta < -0.5) return 1;
  if (theta < 0.5) return 2;
  if (theta < 1.5) return 3;
  return 4;
}

/**
 * @param rate Observed share in [0,1] (item in stratum / all deliveries in stratum)
 * @param kMax Max allowed share (e.g. 0.20)
 */
export function sympsonHetterWeight(rate: number, kMax: number): number {
  if (rate < kMax || rate <= 0) return 1.0;
  return kMax / rate;
}
