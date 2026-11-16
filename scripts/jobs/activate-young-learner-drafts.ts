#!/usr/bin/env tsx
/**
 * Takes the young-learner / Faz 2 drafts generated on 2026-11-16 out of DRAFT on
 * the product owner's explicit instruction (2026-11-17), WITHOUT the expert
 * review the pipeline normally requires. Dry run by default.
 *
 *   npx tsx scripts/jobs/activate-young-learner-drafts.ts                       # dry run, mode pretest-first
 *   npx tsx scripts/jobs/activate-young-learner-drafts.ts --mode active         # dry run, everything scored
 *   npx tsx scripts/jobs/activate-young-learner-drafts.ts --mode <m> --apply    # write
 *   npx tsx scripts/jobs/activate-young-learner-drafts.ts --mode active --from-review scripts/jobs/.out/young-learners/backlog-review.json [--apply]
 *     older backlog: only the items review-young-learner-backlog.ts marked READY
 *
 * Modes
 *   pretest-first  listening/reading/grammar/vocabulary → PRETEST (shown, unscored, calibrated);
 *                  writing/speaking → ACTIVE (pretest is never embedded in W/S, and they are
 *                  scored by the AI rubric, not by IRT parameters)
 *   active         everything → ACTIVE, scored now with CEFR-prior parameters
 *
 * Skipped: drafts with a blocking gate flag (SOLVABLE-BLIND, KEY-UNCONFIRMED,
 * TEXTDEP-UNCHECKED), listening without audio, picture tasks without their
 * picture, and items that fail validateItemStructure. Every activated item
 * gets metadata.provisionalActivation { reviewBypassed: true, ... } so it can
 * be found and reverted; previous values go to
 * scripts/jobs/.out/young-learners/activated-<ts>.jsonl.
 */

import "dotenv/config";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PRODUCT_LINE_PROFILES } from "../../src/lib/product-lines/profiles.js";
import { isAdaptiveEligible, isPretestEligible } from "../../src/lib/assessment-engine/adaptive-policy.js";
import { validateItemStructure } from "../../src/lib/validation/item-schema.js";
import type { SkillType } from "../../src/lib/assessment-engine/types.js";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const APPLY = process.argv.includes("--apply");
const MODE = (arg("--mode") ?? "pretest-first") as "pretest-first" | "active";
if (MODE !== "pretest-first" && MODE !== "active") throw new Error("--mode must be pretest-first or active");
const OUT = "scripts/jobs/.out/young-learners";
const TRIGGERS = ["claude-code:yl-pictures", "claude-code:yl-text", "claude-code:phase2-pilot"];
const SINCE = new Date("2026-11-15T21:00:00Z"); // 2026-11-16 00:00 Europe/Istanbul
const BLOCKING = /SOLVABLE-BLIND|KEY-UNCONFIRMED|TEXTDEP-UNCHECKED/;
const PRODUCTIVE = new Set(["WRITING", "SPEAKING"]);
/** --from-review <backlog-review.json>: activate the items that review marked READY (DRAFT or REVIEW, any date). */
const FROM_REVIEW = arg("--from-review");

async function main(): Promise<void> {
  const db = new PrismaClient();
  try {
    const readyIds = FROM_REVIEW
      ? (JSON.parse(readFileSync(FROM_REVIEW, "utf8")).results as Array<{ id: string; verdict: string }>).filter((r) => r.verdict === "READY").map((r) => r.id)
      : null;
    const rows = await db.item.findMany({
      where: readyIds
        ? { id: { in: readyIds }, status: { in: ["DRAFT", "REVIEW"] } }
        : { status: "DRAFT", createdAt: { gte: SINCE }, OR: TRIGGERS.map((t) => ({ metadata: { path: ["triggeredBy"], equals: t } })) },
      select: { id: true, itemCode: true, type: true, skill: true, cefrLevel: true, content: true, metadata: true, tags: true,
        ageSuitability: true, discrimination: true, guessing: true, status: true, isPretest: true, pipelineStage: true },
      orderBy: { itemCode: "asc" },
    });
    const skipped: Record<string, string[]> = {};
    const skip = (why: string, code: string) => (skipped[why] ??= []).push(code);
    const plan: Array<{ row: (typeof rows)[number]; target: "ACTIVE" | "PRETEST" }> = [];
    for (const row of rows) {
      const c = (row.content ?? {}) as Record<string, any>;
      const m = (row.metadata ?? {}) as Record<string, any>;
      const code = row.itemCode ?? row.id;
      const flags: string[] = m.generationGates?.flags ?? [];
      if (flags.some((f) => BLOCKING.test(f))) { skip("blocking gate flag", code); continue; }
      if (row.skill === "LISTENING" && !c.audioUrl) { skip("listening without audio", code); continue; }
      if (m.taskType && !c.imageUrl && !(Array.isArray(c.options) && c.options.every((o: any) => o?.imageUrl))) { skip("picture task without picture", code); continue; }
      const errors = validateItemStructure(row.skill, c);
      if (errors.length) { skip(`validation: ${errors[0]}`, code); continue; }
      plan.push({ row, target: MODE === "active" || PRODUCTIVE.has(row.skill) ? "ACTIVE" : "PRETEST" });
    }

    // Where would they be served? Simulate the new status against every profile.
    const reach: Record<string, Record<string, number>> = {};
    for (const { row, target } of plan) {
      const sim = { ...row, status: target, isPretest: target === "PRETEST", content: row.content as unknown } as any;
      for (const profile of Object.values(PRODUCT_LINE_PROFILES)) {
        const ok = target === "ACTIVE" ? isAdaptiveEligible(sim, profile, row.skill as SkillType) : isPretestEligible(sim, profile, row.skill as SkillType);
        if (ok) { const r = (reach[profile.name] ??= {}); r[`${row.skill}/${target}`] = (r[`${row.skill}/${target}`] ?? 0) + 1; }
      }
    }

    const at = new Date().toISOString();
    const logFile = `${OUT}/activated-${at.replace(/[:.]/g, "-")}.jsonl`;
    mkdirSync(OUT, { recursive: true });
    let written = 0;
    if (APPLY) {
      for (let i = 0; i < plan.length; i += 100) {
        const chunk = plan.slice(i, i + 100);
        const lines: string[] = [];
        await db.$transaction(async (tx) => {
          const ids = chunk.map((p) => p.row.id);
          await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ANY(${ids}) ORDER BY id FOR UPDATE`;
          for (const { row, target } of chunk) {
            const current = await tx.item.findUnique({ where: { id: row.id }, select: { status: true, metadata: true } });
            if (current?.status !== row.status) continue; // changed since the plan
            const metadata = (current.metadata ?? {}) as Record<string, any>;
            const provisionalActivation = {
              policyVersion: readyIds ? "yl-backlog-2026-11-17" : "yl-2026-11-17", mode: MODE, reviewBypassed: true, paramsSource: "CEFR_PRIOR", calibrationPending: true,
              instructedBy: "product owner (chat, 2026-11-17)", activatedBy: "claude-code:activate-young-learner-drafts", activatedAt: at,
            };
            await tx.item.update({ where: { id: row.id }, data: {
              status: target, isPretest: target === "PRETEST", pipelineStage: target === "PRETEST" ? "PILOT" : "LIVE",
              metadata: { ...metadata, provisionalActivation } as any } });
            lines.push(JSON.stringify({ id: row.id, itemCode: row.itemCode, target,
              before: { status: row.status, isPretest: row.isPretest, pipelineStage: row.pipelineStage } }));
          }
        }, { maxWait: 10000, timeout: 120000 });
        if (lines.length) appendFileSync(logFile, lines.join("\n") + "\n");
        written += lines.length;
      }
    }

    const byTarget = (t: string) => Object.fromEntries(["LISTENING", "READING", "GRAMMAR", "VOCABULARY", "WRITING", "SPEAKING"]
      .map((s) => [s, plan.filter((p) => p.target === t && p.row.skill === s).length]).filter(([, n]) => n));
    console.log(JSON.stringify({ mode: MODE, drafts: rows.length, toActivate: plan.length, ACTIVE: byTarget("ACTIVE"), PRETEST: byTarget("PRETEST"),
      skipped: Object.fromEntries(Object.entries(skipped).map(([k, v]) => [k, { n: v.length, items: v.slice(0, 8) }])),
      servedBy: Object.fromEntries(Object.entries(reach).filter(([, v]) => Object.keys(v).length)) }, null, 1));
    console.log(APPLY ? `activated ${written}. Rollback log: ${logFile}` : "dry run — nothing written. Add --apply to write.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(APPLY ? "Activation failed; committed chunks are in the activated-*.jsonl log." : "Dry run failed; nothing was written.", error);
  process.exitCode = 1;
});
