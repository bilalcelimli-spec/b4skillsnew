#!/usr/bin/env tsx
/**
 * Read-only review of the older young-learner backlog: Primary / Junior items in
 * DRAFT or REVIEW created before 2026-11-16 (the 2026-11-16 batches were
 * activated separately). Nothing is written to the database.
 *
 *   npx tsx scripts/jobs/review-young-learner-backlog.ts            # deterministic checks + text-dependency gate
 *   npx tsx scripts/jobs/review-young-learner-backlog.ts --no-gate  # deterministic checks only (no Gemini calls)
 *   → scripts/jobs/.out/young-learners/backlog-review.json
 *
 * Verdict per item
 *   READY   no finding; could go live like the 2026-11-16 batches
 *   FIX     fixable finding (no audio yet, one-line dialogue, external image host, review-level editorial rule)
 *   REJECT  defect that needs rewriting: blocker editorial rule, invalid structure, adult context
 *           for the age band, a name the text never mentions, solvable without the text, key
 *           not confirmed by the solver
 */

import "dotenv/config"; // first: the gates read GEMINI_API_KEY at import time
import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { itemRules } from "../../src/lib/quality/item-content-rules.js";
import { validateItemStructure } from "../../src/lib/validation/item-schema.js";
import { ageContextViolations, unanchoredNames } from "../../src/lib/content-factory/age-context.js";
import { normalizeDialogue } from "../../src/lib/content-factory/picture-items.js";
import { runTextDependencyGate } from "../../src/lib/ai/validation/gates/text-dependency.js";
import { runMatchingDependencyGate } from "../../src/lib/ai/validation/gates/matching-dependency.js";

const GATE = !process.argv.includes("--no-gate");
const OUT = "scripts/jobs/.out/young-learners";
const SINCE = new Date("2026-11-15T21:00:00Z");
const PRIMARY = ["primary", "PRIMARY", "Primary (7-10)"];
const JUNIOR = ["junior", "JUNIOR", "JUNIOR_SUITE", "Junior Suite (11-14)"];
const BLOCKING_FLAG = /SOLVABLE-BLIND|KEY-UNCONFIRMED|TEXTDEP-UNCHECKED/;

type Verdict = "READY" | "FIX" | "REJECT";

async function main(): Promise<void> {
  const db = new PrismaClient();
  try {
    const rows = await db.item.findMany({
      where: { status: { in: ["DRAFT", "REVIEW"] }, createdAt: { lt: SINCE },
        OR: [{ tags: { hasSome: [...PRIMARY, ...JUNIOR] } }, ...[...PRIMARY, ...JUNIOR].map((v) => ({ content: { path: ["productLine"], equals: v } }))] },
      select: { id: true, itemCode: true, type: true, skill: true, cefrLevel: true, status: true, tags: true, content: true, metadata: true },
      orderBy: { itemCode: "asc" },
    });
    const results: any[] = [];
    let gateCalls = 0;
    for (const row of rows) {
      const c = (row.content ?? {}) as Record<string, any>;
      const m = (row.metadata ?? {}) as Record<string, any>;
      const product = [c.productLine, ...row.tags].some((t) => PRIMARY.includes(t)) ? "primary" : "junior";
      const age = product === "primary" ? "YOUNG_LEARNER" : "TEEN";
      const reject: string[] = [];
      const fix: string[] = [];

      for (const hit of itemRules({ id: row.id, itemCode: row.itemCode, skill: row.skill, type: row.type, content: c })) {
        (hit.severity === "BLOCKER" ? reject : hit.rule === "IMAGE_EXTERNAL_HOTLINK" ? fix : fix).push(`${hit.rule}: ${hit.evidence}`.slice(0, 160));
      }
      for (const e of validateItemStructure(row.skill, c)) reject.push(`STRUCTURE: ${e}`);
      const adult = ageContextViolations(c, age);
      if (adult.length) reject.push(`AGE_CONTEXT (${age}): ${adult.join(", ")}`);
      const ghosts = unanchoredNames(c);
      if (ghosts.length) reject.push(`UNANCHORED_NAME: ${ghosts.join(", ")}`);
      const flags: string[] = m.generationGates?.flags ?? [];
      if (flags.some((f) => BLOCKING_FLAG.test(f))) reject.push(`GATE_FLAG: ${flags.filter((f) => BLOCKING_FLAG.test(f)).join(", ")}`);
      if (row.skill === "LISTENING") {
        if (!c.audioUrl) fix.push("NO_AUDIO");
        const script = String(c.ttsScript ?? "");
        if (script && normalizeDialogue(script) !== script.trim() && !script.includes("\n")) fix.push("ONE_LINE_DIALOGUE");
      }
      // Why it was pulled earlier (REVIEW items).
      const pulled = m.textDependencyAudit?.outcome ?? m.contentAudit?.reason ?? m.ageReview?.decision ?? null;

      // Text dependency for receptive objective items (fresh run; earlier audits may predate fixes).
      let gate: string | null = null;
      if (GATE && ["READING", "LISTENING"].includes(row.skill) && ["MULTIPLE_CHOICE", "DRAG_DROP"].includes(String(row.type)) && !reject.some((r) => r.startsWith("STRUCTURE"))) {
        const draft = { id: row.id, type: row.type as any, skill: row.skill as any, cefrLevel: row.cefrLevel as any, content: c as any };
        const run = () => (row.type === "DRAG_DROP" ? runMatchingDependencyGate(draft) : runTextDependencyGate(draft)).catch(() => null);
        let g = await run(); gateCalls++;
        if (!g || g.verdict === "ERROR") { g = await run(); gateCalls++; }
        const codes = g?.issues.map((i) => i.code) ?? [];
        gate = !g ? "error" : g.verdict === "SKIPPED" ? `skipped:${(g.metrics as any)?.reason ?? ""}` : codes.length ? codes.join(",") : "pass";
        if (codes.some((x) => /SOLVABLE-BLIND/.test(x))) reject.push(`SOLVABLE_WITHOUT_TEXT (${codes.join(",")})`);
        else if (codes.some((x) => /KEY-UNCONFIRMED/.test(x))) reject.push(`KEY_NOT_CONFIRMED (${codes.join(",")})`);
        else if (!g || g.verdict === "ERROR") fix.push("GATE_ERROR (re-run)");
      }

      const verdict: Verdict = reject.length ? "REJECT" : fix.length ? "FIX" : "READY";
      results.push({ id: row.id, itemCode: row.itemCode, product, status: row.status, skill: row.skill, type: row.type, cefr: row.cefrLevel,
        triggeredBy: m.triggeredBy ?? m.generatedBy ?? m.source ?? null, pulledEarlierFor: pulled, verdict, reject, fix, gate });
      if (results.length % 50 === 0) console.log(`${results.length}/${rows.length}`);
    }

    const count = (f: (r: any) => boolean) => results.filter(f).length;
    const summary: Record<string, any> = { total: results.length, gateCalls };
    for (const v of ["READY", "FIX", "REJECT"]) summary[v] = count((r) => r.verdict === v);
    const by: Record<string, Record<string, number>> = {};
    for (const r of results) { const k = `${r.product} ${r.skill}`; (by[k] ??= { READY: 0, FIX: 0, REJECT: 0 })[r.verdict]++; }
    const reasons: Record<string, number> = {};
    for (const r of results) for (const x of [...r.reject, ...r.fix]) { const k = x.split(/[:( ]/)[0]; reasons[k] = (reasons[k] ?? 0) + 1; }
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/backlog-review.json`, JSON.stringify({ generatedAt: new Date().toISOString(), summary, byProductSkill: by, reasons, results }, null, 1));
    console.log(JSON.stringify({ summary, byProductSkill: by, reasons }, null, 1));
    console.log(`wrote ${OUT}/backlog-review.json (read-only: the database was not changed)`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => { console.error("Backlog review failed; nothing was written.", error); process.exitCode = 1; });
