/**
 * Concurrent Rasch (1PL) calibration by marginal maximum likelihood (EM).
 *
 * Works on a sparse response set, so data from several forms linked by anchor
 * items calibrate onto one scale in a single run. Location is identified by the
 * person ability prior N(0, σ²) with σ estimated (mean θ = 0), so item
 * difficulties are relative to the sample's mean ability. Do not also centre b. Use `linkToScale` to
 * place them on the platform scale.
 *
 * Rasch is deliberate: with a few hundred persons per item, 2PL/3PL
 * discrimination and guessing are too noisy to trust. Discrimination is
 * screened via point-biserial and infit/outfit instead.
 */

export interface Observation {
  personId: string;
  itemId: string;
  /** 0 or 1 (dichotomous). */
  score: 0 | 1;
}

export interface ItemResult {
  itemId: string;
  n: number;
  pValue: number;
  /** Logit difficulty relative to the sample mean; null when not estimable. */
  b: number | null;
  se: number | null;
  infit: number | null;
  outfit: number | null;
  /** Correlation of the item with the proportion correct on the person's other items. */
  pointBiserial: number | null;
  flags: string[];
}

export interface CalibrationOutput {
  items: ItemResult[];
  personSd: number;
  iterations: number;
  converged: boolean;
  nPersons: number;
  nObservations: number;
}

export interface CalibrationOptions {
  nodes?: number;
  maxIter?: number;
  tol?: number;
  /** Items answered by fewer persons are reported but not estimated. */
  minResponses?: number;
}

export const EXTREME_P_LOW = 0.15;
export const EXTREME_P_HIGH = 0.85;

/** Flags that say the DATA is inadequate for this item, not that the item is bad. */
export const DATA_ADEQUACY_FLAGS = new Set(["TOO_FEW_RESPONSES", "NO_VARIANCE", "EXTREME_P", "IMPRECISE"]);

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function calibrateRasch(obs: Observation[], options: CalibrationOptions = {}): CalibrationOutput {
  const nodes = options.nodes ?? 41;
  const maxIter = options.maxIter ?? 200;
  const tol = options.tol ?? 1e-4;
  const minResponses = options.minResponses ?? 30;

  const personIdx = new Map<string, number>();
  const itemIdx = new Map<string, number>();
  for (const o of obs) {
    if (!personIdx.has(o.personId)) personIdx.set(o.personId, personIdx.size);
    if (!itemIdx.has(o.itemId)) itemIdx.set(o.itemId, itemIdx.size);
  }
  const P = personIdx.size;
  const I = itemIdx.size;
  const itemIds = [...itemIdx.keys()];

  const byPerson: Array<Array<[number, number]>> = Array.from({ length: P }, () => []);
  const nItem = new Array(I).fill(0);
  const rItem = new Array(I).fill(0);
  for (const o of obs) {
    const p = personIdx.get(o.personId)!;
    const i = itemIdx.get(o.itemId)!;
    byPerson[p].push([i, o.score]);
    nItem[i]++;
    rItem[i] += o.score;
  }

  // Items with no variance (all right / all wrong) or too few responses cannot be estimated.
  const estimable = nItem.map((n, i) => n >= minResponses && rItem[i] > 0 && rItem[i] < n);

  const grid = Array.from({ length: nodes }, (_, q) => -5 + (10 * q) / (nodes - 1));
  const b = new Array(I).fill(0);
  let sigma = 1;
  let iterations = 0;
  let converged = false;

  // Posterior weights per person are recomputed each iteration.
  const post: Float64Array[] = Array.from({ length: P }, () => new Float64Array(nodes));
  const Nq = Array.from({ length: I }, () => new Float64Array(nodes));
  const Rq = Array.from({ length: I }, () => new Float64Array(nodes));

  for (iterations = 1; iterations <= maxIter; iterations++) {
    const prior = grid.map((t) => Math.exp(-0.5 * (t / sigma) ** 2));
    for (const arr of Nq) arr.fill(0);
    for (const arr of Rq) arr.fill(0);
    let sumW = 0, sumT2 = 0;

    for (let p = 0; p < P; p++) {
      const w = post[p];
      for (let q = 0; q < nodes; q++) {
        let logL = 0;
        for (const [i, x] of byPerson[p]) {
          if (!estimable[i]) continue;
          const pr = sigmoid(grid[q] - b[i]);
          logL += x ? Math.log(pr) : Math.log(1 - pr);
        }
        w[q] = prior[q] * Math.exp(logL);
      }
      let tot = 0;
      for (let q = 0; q < nodes; q++) tot += w[q];
      for (let q = 0; q < nodes; q++) w[q] /= tot;
      for (const [i, x] of byPerson[p]) {
        if (!estimable[i]) continue;
        for (let q = 0; q < nodes; q++) {
          Nq[i][q] += w[q];
          if (x) Rq[i][q] += w[q];
        }
      }
      for (let q = 0; q < nodes; q++) { sumW += w[q]; sumT2 += w[q] * grid[q] * grid[q]; }
    }

    let maxDelta = 0;
    for (let i = 0; i < I; i++) {
      if (!estimable[i]) continue;
      let grad = 0, hess = 0;
      for (let q = 0; q < nodes; q++) {
        const pr = sigmoid(grid[q] - b[i]);
        grad += Rq[i][q] - Nq[i][q] * pr;
        hess -= Nq[i][q] * pr * (1 - pr);
      }
      // dlogL/db = -grad and d²logL/db² = hess (< 0), so Newton gives b ← b + grad/hess.
      const step = Math.max(-1, Math.min(1, -grad / hess));
      b[i] -= step;
      maxDelta = Math.max(maxDelta, Math.abs(step));
    }

    sigma = Math.sqrt(sumT2 / sumW);
    if (maxDelta < tol) { converged = true; break; }
  }

  // EAP ability per person (estimable items only) for fit statistics and point-biserial.
  const eap = new Array(P).fill(0);
  for (let p = 0; p < P; p++) for (let q = 0; q < nodes; q++) eap[p] += post[p][q] * grid[q];

  const pcRest = (p: number, skip: number) => {
    let s = 0, n = 0;
    for (const [i, x] of byPerson[p]) if (i !== skip) { s += x; n++; }
    return n ? s / n : NaN;
  };

  const items: ItemResult[] = itemIds.map((itemId, i) => {
    const flags: string[] = [];
    const n = nItem[i];
    const pValue = n ? rItem[i] / n : NaN;
    if (n < minResponses) flags.push("TOO_FEW_RESPONSES");
    else if (rItem[i] === 0 || rItem[i] === n) flags.push("NO_VARIANCE");

    let se: number | null = null, infit: number | null = null, outfit: number | null = null;
    if (estimable[i]) {
      let info = 0;
      for (let q = 0; q < nodes; q++) { const pr = sigmoid(grid[q] - b[i]); info += Nq[i][q] * pr * (1 - pr); }
      se = 1 / Math.sqrt(info);

      let num = 0, den = 0, z2 = 0, cnt = 0;
      for (let p = 0; p < P; p++) {
        for (const [j, x] of byPerson[p]) {
          if (j !== i) continue;
          const pr = sigmoid(eap[p] - b[i]);
          const v = pr * (1 - pr);
          num += (x - pr) ** 2; den += v; z2 += (x - pr) ** 2 / v; cnt++;
        }
      }
      infit = den ? num / den : null;
      outfit = cnt ? z2 / cnt : null;
    }

    // Point-biserial against the person's proportion correct on their other items.
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, m = 0;
    for (let p = 0; p < P; p++) {
      for (const [j, x] of byPerson[p]) {
        if (j !== i) continue;
        const y = pcRest(p, i);
        if (Number.isNaN(y)) continue;
        sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; m++;
      }
    }
    let pointBiserial: number | null = null;
    if (m > 2) {
      const cov = sxy / m - (sx / m) * (sy / m);
      const vx = sxx / m - (sx / m) ** 2, vy = syy / m - (sy / m) ** 2;
      pointBiserial = vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : null;
    }

    // Items far from the sample's ability level have restricted variance: their
    // point-biserial and SE say more about the sample than about item quality.
    const extreme = n >= minResponses && (pValue < EXTREME_P_LOW || pValue > EXTREME_P_HIGH);
    if (extreme) flags.push("EXTREME_P");
    if (!extreme && pointBiserial != null && pointBiserial < 0.2) flags.push("LOW_DISCRIMINATION");
    if (!extreme && pointBiserial != null && pointBiserial < 0) flags.push("NEGATIVE_DISCRIMINATION");
    if (infit != null && (infit > 1.3 || infit < 0.7)) flags.push("INFIT");
    if (outfit != null && (outfit > 1.5 || outfit < 0.5)) flags.push("OUTFIT");
    if (se != null && se > 0.35) flags.push("IMPRECISE");

    return { itemId, n, pValue, b: estimable[i] ? b[i] : null, se, infit, outfit, pointBiserial, flags };
  });

  return { items, personSd: sigma, iterations, converged, nPersons: P, nObservations: obs.length };
}

/**
 * Place Rasch difficulties on a reference scale by a mean shift over items
 * that have a trusted reference difficulty. Rasch fixes a = 1, so only a shift
 * is identified; the SD ratio is returned as a diagnostic, not applied.
 */
export function linkToScale(
  items: ItemResult[],
  reference: Map<string, number>,
  minLinkItems = 10
): { shift: number; sdRatio: number | null; nLink: number; items: Array<ItemResult & { bLinked: number | null }> } {
  const pairs = items.filter((it) => it.b != null && reference.has(it.itemId)).map((it) => [it.b as number, reference.get(it.itemId)!] as const);
  if (pairs.length < minLinkItems) throw new Error(`Need at least ${minLinkItems} linking items, got ${pairs.length}`);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const sd = (xs: number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
  const est = pairs.map((p) => p[0]);
  const ref = pairs.map((p) => p[1]);
  const shift = mean(ref) - mean(est);
  const sdEst = sd(est);
  return {
    shift,
    sdRatio: sdEst > 0 ? sd(ref) / sdEst : null,
    nLink: pairs.length,
    items: items.map((it) => ({ ...it, bLinked: it.b == null ? null : it.b + shift })),
  };
}
