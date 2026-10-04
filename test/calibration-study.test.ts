import { describe, it, expect } from "vitest";
import { assembleForms, personsPerItem, planSample, type DesignItem } from "../src/lib/calibration-study/form-design";
import { calibrateRasch, linkToScale, type Observation } from "../src/lib/calibration-study/rasch-mmle";

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const normal = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());

function makeItems(n: number, groupSize: number, r: () => number): DesignItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `i${i}`, groupKey: `g${Math.floor(i / groupSize)}`, b: normal(r) * 1.2,
  }));
}

describe("form design", () => {
  const items = makeItems(120, 3, rng(1));
  const design = assembleForms(items, { formLength: 30, anchorShare: 0.2 });

  it("keeps every anchor in every form", () => {
    expect(design.anchorItemIds.length).toBeGreaterThanOrEqual(5);
    for (const f of design.forms) for (const a of design.anchorItemIds) expect(f.itemIds).toContain(a);
  });

  it("never splits a passage group across forms", () => {
    const groupOf = new Map(items.map((i) => [i.id, i.groupKey]));
    const anchorGroups = new Set(design.anchorItemIds.map((id) => groupOf.get(id)));
    const formsOfGroup = new Map<string, Set<string>>();
    for (const f of design.forms) for (const id of f.itemIds) {
      const g = groupOf.get(id)!;
      if (anchorGroups.has(g)) continue;
      (formsOfGroup.get(g) ?? formsOfGroup.set(g, new Set()).get(g)!).add(f.formId);
    }
    for (const forms of formsOfGroup.values()) expect(forms.size).toBe(1);
  });

  it("places every item and keeps forms near the target length", () => {
    const placed = new Set(design.forms.flatMap((f) => f.itemIds));
    expect(placed.size).toBe(items.length);
    for (const f of design.forms) expect(Math.abs(f.itemIds.length - 30)).toBeLessThanOrEqual(6);
  });

  it("spreads difficulty so no form is all easy or all hard", () => {
    const bOf = new Map(items.map((i) => [i.id, i.b]));
    const means = design.forms.map((f) => f.itemIds.reduce((s, id) => s + bOf.get(id)!, 0) / f.itemIds.length);
    expect(Math.max(...means) - Math.min(...means)).toBeLessThan(0.5);
  });

  it("sample size follows 1/(SE²·p(1-p))", () => {
    expect(personsPerItem(0.25, 0.2)).toBe(100);
    expect(personsPerItem(0.2, 0.2)).toBe(157);
    const plan = planSample(design, 0.25);
    expect(plan.totalPersons).toBe(100 * design.forms.length);
    expect(plan.personsPerAnchor).toBe(plan.totalPersons);
  });
});

describe("Rasch MMLE recovery (simulated NEAT data)", () => {
  const r = rng(42);
  const items = makeItems(90, 3, r);
  const design = assembleForms(items, { formLength: 30, anchorShare: 0.2 });
  const trueB = new Map(items.map((i) => [i.id, i.b]));

  const obs: Observation[] = [];
  const perForm = 400;
  design.forms.forEach((form, fi) => {
    for (let p = 0; p < perForm; p++) {
      const theta = 0.3 + normal(r);
      for (const id of form.itemIds) {
        const pr = 1 / (1 + Math.exp(-(theta - trueB.get(id)!)));
        obs.push({ personId: `f${fi}p${p}`, itemId: id, score: r() < pr ? 1 : 0 });
      }
    }
  });

  const out = calibrateRasch(obs);
  const est = out.items.filter((i) => i.b != null);

  it("converges and estimates nearly all items", () => {
    expect(out.converged).toBe(true);
    expect(est.length).toBeGreaterThanOrEqual(items.length - 3);
  });

  it("recovers true difficulties up to a constant shift", () => {
    const xs = est.map((i) => trueB.get(i.itemId)!);
    const ys = est.map((i) => i.b as number);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const cov = xs.reduce((s, x, k) => s + (x - mx) * (ys[k] - my), 0);
    const corr = cov / Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
    const rmse = Math.sqrt(xs.reduce((s, x, k) => s + (x - mx - (ys[k] - my)) ** 2, 0) / xs.length);
    expect(corr).toBeGreaterThan(0.97);
    expect(rmse).toBeLessThan(0.2);
  });

  it("estimates the person SD close to the simulated 1.0", () => {
    expect(out.personSd).toBeGreaterThan(0.85);
    expect(out.personSd).toBeLessThan(1.15);
  });

  it("reports sensible standard errors and few misfit flags on well-behaved data", () => {
    const meanSe = est.reduce((s, i) => s + (i.se as number), 0) / est.length;
    expect(meanSe).toBeLessThan(0.25);
    const misfit = est.filter((i) => i.flags.some((f) => f === "INFIT" || f === "OUTFIT")).length;
    expect(misfit / est.length).toBeLessThan(0.15);
  });

  it("links to a reference scale by mean shift", () => {
    const reference = new Map(est.map((i) => [i.itemId, trueB.get(i.itemId)!]));
    const linked = linkToScale(est, reference);
    const err = linked.items.map((i) => (i.bLinked as number) - trueB.get(i.itemId)!);
    expect(Math.abs(err.reduce((a, b) => a + b, 0) / err.length)).toBeLessThan(1e-9);
    expect(() => linkToScale(est.slice(0, 3), reference)).toThrow();
  });
});

describe("Rasch MMLE flags", () => {
  it("flags a reversed item (negative discrimination) and a constant item", () => {
    const r = rng(7);
    const obs: Observation[] = [];
    const bs = [-1, -0.5, 0, 0.5, 1, -0.2, 0.3, 0.8, -0.8, 0.1];
    for (let p = 0; p < 600; p++) {
      const theta = normal(r);
      bs.forEach((b, i) => obs.push({ personId: `p${p}`, itemId: `i${i}`, score: r() < 1 / (1 + Math.exp(-(theta - b))) ? 1 : 0 }));
      obs.push({ personId: `p${p}`, itemId: "reversed", score: r() < 1 / (1 + Math.exp(theta)) ? 1 : 0 });
      obs.push({ personId: `p${p}`, itemId: "const", score: 1 });
    }
    const out = calibrateRasch(obs);
    const rev = out.items.find((i) => i.itemId === "reversed")!;
    const con = out.items.find((i) => i.itemId === "const")!;
    expect(rev.flags).toContain("NEGATIVE_DISCRIMINATION");
    expect(con.flags).toContain("NO_VARIANCE");
    expect(con.b).toBeNull();
  });
});
