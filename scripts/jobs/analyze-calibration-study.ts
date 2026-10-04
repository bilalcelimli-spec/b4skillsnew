#!/usr/bin/env tsx

/**
 * Analyses calibration-study responses. Reads files, writes a report, and
 * NEVER writes to the database.
 *
 *   npx tsx scripts/jobs/analyze-calibration-study.ts responses.csv \
 *     [--forms scripts/jobs/.out/calibration-study/forms.csv] [--min-responses 30]
 *
 * responses.csv columns: personId,itemId,score   (score 0|1, one row per answer)
 * forms.csv (from design-calibration-study) supplies seed difficulties used to
 * place the Rasch scale on the platform scale by mean shift.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { calibrateRasch, linkToScale, DATA_ADEQUACY_FLAGS, type Observation } from "../../src/lib/calibration-study/rasch-mmle.js";

const file = process.argv[2];
if (!file) { console.error("usage: analyze-calibration-study.ts responses.csv [--forms forms.csv]"); process.exit(1); }
const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
};
const formsFile = arg("forms", "scripts/jobs/.out/calibration-study/forms.csv");
const minResponses = Number(arg("min-responses", "30"));

function parseCsv(path: string): Array<Record<string, string>> {
  const [head, ...lines] = readFileSync(path, "utf8").trim().split(/\r?\n/);
  const cols = head.split(",").map((c) => c.trim());
  return lines.filter(Boolean).map((l) => {
    const cells = l.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? "").trim()]));
  });
}

const obs: Observation[] = [];
let bad = 0;
for (const r of parseCsv(file)) {
  const score = Number(r.score);
  if (!r.personId || !r.itemId || (score !== 0 && score !== 1)) { bad++; continue; }
  obs.push({ personId: r.personId, itemId: r.itemId, score: score as 0 | 1 });
}
console.log(`observations=${obs.length} skipped-invalid=${bad}`);

const out = calibrateRasch(obs, { minResponses });
console.log(`persons=${out.nPersons} items=${out.items.length} converged=${out.converged} (${out.iterations} iterations) personSD=${out.personSd.toFixed(2)}`);

const meta = new Map(parseCsv(formsFile).map((r) => [r.itemId, r]));
const reference = new Map<string, number>();
for (const it of out.items) { const m = meta.get(it.itemId); if (m && it.b != null) reference.set(it.itemId, Number(m.seedB)); }

let linked: ReturnType<typeof linkToScale> | null = null;
try { linked = linkToScale(out.items, reference); } catch (e) { console.warn("not linked:", (e as Error).message); }

const rows = (linked?.items ?? out.items.map((i) => ({ ...i, bLinked: null as number | null }))).map((it) => ({
  itemId: it.itemId,
  itemCode: meta.get(it.itemId)?.itemCode ?? "",
  n: it.n,
  p: +it.pValue.toFixed(3),
  b: it.b == null ? null : +it.b.toFixed(3),
  bLinked: it.bLinked == null ? null : +it.bLinked.toFixed(3),
  seedB: meta.get(it.itemId) ? Number(meta.get(it.itemId)!.seedB) : null,
  se: it.se == null ? null : +it.se.toFixed(3),
  infit: it.infit == null ? null : +it.infit.toFixed(2),
  outfit: it.outfit == null ? null : +it.outfit.toFixed(2),
  pointBiserial: it.pointBiserial == null ? null : +it.pointBiserial.toFixed(3),
  flags: it.flags,
  recommendation: it.flags.some((f) => !DATA_ADEQUACY_FLAGS.has(f)) ? "REVIEW" : it.flags.length ? "NEEDS_MORE_DATA" : "OK",
}));

const dir = "scripts/jobs/.out/calibration-study";
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/report.json`, JSON.stringify({ summary: { ...out, items: undefined, linking: linked && { shift: linked.shift, sdRatio: linked.sdRatio, nLink: linked.nLink } }, items: rows }, null, 2));

const reviewN = rows.filter((r) => r.recommendation === "REVIEW").length;
const moreDataN = rows.filter((r) => r.recommendation === "NEEDS_MORE_DATA").length;
const byFlag: Record<string, number> = {};
for (const r of rows) for (const f of r.flags) byFlag[f] = (byFlag[f] ?? 0) + 1;
console.log(`OK=${rows.length - reviewN - moreDataN} REVIEW(quality)=${reviewN} NEEDS_MORE_DATA=${moreDataN}  flags=${JSON.stringify(byFlag)}`);
if (linked) {
  console.log(`linking: shift=${linked.shift.toFixed(2)} logits over ${linked.nLink} items; SD(seed)/SD(estimated)=${linked.sdRatio?.toFixed(2)}`);
  console.log("  (the platform scale is anchored to CEFR-seeded difficulties — a mean shift only; treat as provisional)");
}
console.log(`report: ${dir}/report.json  (no database changes were made)`);
