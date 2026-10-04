/**
 * Calibration study form design (NEAT: non-equivalent groups with anchor test).
 *
 * Items that share a passage/recording form a "unit" and are never split across
 * forms (local dependence). A set of anchor units appears in EVERY form so all
 * forms link onto one scale in a single concurrent calibration. Remaining units
 * are dealt to forms in difficulty order (snake) so each form spans the range.
 */

export interface DesignItem {
  id: string;
  itemCode?: string | null;
  /** Items with the same groupKey share a stimulus and stay together. */
  groupKey: string;
  /** Prior difficulty (platform seed); only used to spread items across forms. */
  b: number;
  skill?: string;
  cefr?: string;
}

export interface DesignOptions {
  nForms?: number;
  /** Target items per form including anchors. */
  formLength: number;
  /** Share of each form that is anchor items (0.15–0.25 recommended). */
  anchorShare?: number;
}

export interface Form {
  formId: string;
  itemIds: string[];
  anchorItemIds: string[];
}

export interface StudyDesign {
  forms: Form[];
  anchorItemIds: string[];
}

interface Unit {
  key: string;
  items: DesignItem[];
  meanB: number;
}

function toUnits(items: DesignItem[]): Unit[] {
  const map = new Map<string, DesignItem[]>();
  for (const it of items) {
    const list = map.get(it.groupKey) ?? [];
    list.push(it);
    map.set(it.groupKey, list);
  }
  return [...map.entries()]
    .map(([key, its]) => ({ key, items: its, meanB: its.reduce((s, i) => s + i.b, 0) / its.length }))
    .sort((a, b) => a.meanB - b.meanB || a.key.localeCompare(b.key));
}

/** Pick anchor units evenly across the difficulty range until the item budget is met. */
function pickAnchors(units: Unit[], budget: number): Unit[] {
  const picked: Unit[] = [];
  let used = 0;
  const step = units.length / Math.max(1, Math.min(units.length, Math.ceil(budget / 2)));
  for (let pos = step / 2; pos < units.length && used < budget; pos += step) {
    const unit = units[Math.floor(pos)];
    if (picked.includes(unit) || used + unit.items.length > budget + 2) continue;
    picked.push(unit);
    used += unit.items.length;
  }
  return picked;
}

export function assembleForms(items: DesignItem[], opts: DesignOptions): StudyDesign {
  const anchorShare = opts.anchorShare ?? 0.2;
  const units = toUnits(items);
  const anchorBudget = Math.round(opts.formLength * anchorShare);

  const anchors = pickAnchors(units, anchorBudget);
  const anchorKeys = new Set(anchors.map((u) => u.key));
  const rest = units.filter((u) => !anchorKeys.has(u.key));

  const anchorItems = anchors.flatMap((u) => u.items);
  const perFormFree = Math.max(1, opts.formLength - anchorItems.length);
  const restItemCount = rest.reduce((s, u) => s + u.items.length, 0);
  const nForms = opts.nForms ?? Math.max(1, Math.round(restItemCount / perFormFree));

  const buckets: Unit[][] = Array.from({ length: nForms }, () => []);
  const sizes = new Array(nForms).fill(0);
  // Snake through difficulty so every form spans the range; ties go to the emptiest form.
  rest.forEach((unit, idx) => {
    const lap = Math.floor(idx / nForms);
    const pos = lap % 2 === 0 ? idx % nForms : nForms - 1 - (idx % nForms);
    let target = pos;
    if (sizes[target] + unit.items.length > perFormFree + 3) {
      target = sizes.indexOf(Math.min(...sizes));
    }
    buckets[target].push(unit);
    sizes[target] += unit.items.length;
  });

  const forms: Form[] = buckets.map((units, i) => ({
    formId: `F${i + 1}`,
    anchorItemIds: anchorItems.map((it) => it.id),
    itemIds: [...anchorItems, ...units.flatMap((u) => u.items)].map((it) => it.id),
  }));

  return { forms, anchorItemIds: anchorItems.map((it) => it.id) };
}

/**
 * Rasch-based sample size. For an item answered by n persons with proportion
 * correct p, SE(b) ≈ 1 / sqrt(n·p·(1−p)). Returns n for a target SE(b),
 * assuming a conservative p range (items far from the sample mean are
 * estimated less precisely).
 */
export function personsPerItem(targetSeB: number, worstCaseP = 0.2): number {
  return Math.ceil(1 / (targetSeB * targetSeB * worstCaseP * (1 - worstCaseP)));
}

export interface SamplePlan {
  nForms: number;
  personsPerForm: number;
  totalPersons: number;
  /** Persons answering each non-anchor item (one form). */
  personsPerRegularItem: number;
  /** Persons answering each anchor item (all forms). */
  personsPerAnchor: number;
}

export function planSample(design: StudyDesign, targetSeB = 0.25, worstCaseP = 0.2): SamplePlan {
  const n = personsPerItem(targetSeB, worstCaseP);
  const nForms = design.forms.length;
  return {
    nForms,
    personsPerForm: n,
    totalPersons: n * nForms,
    personsPerRegularItem: n,
    personsPerAnchor: n * nForms,
  };
}
