#!/usr/bin/env tsx
/**
 * Pulls blind-solvable PRETEST items out of service (status → REVIEW), using
 * the result file of scripts/_audit-pretest-text-dependency.ts. Dry run by default.
 *
 *   npx tsx scripts/jobs/pull-blind-pretest.ts                # dry run: what would change
 *   npx tsx scripts/jobs/pull-blind-pretest.ts --apply        # write
 *   [--audit scripts/jobs/.out/pretest-textdep/audit-READING-PRETEST.json]
 *
 * Selected: audit outcome "blind" (SOLVABLE-BLIND) or "key-unconfirmed".
 * Only items that are still PRETEST and unchanged since the audit
 * (updatedAt ≤ audit time) are touched; anything else is reported and skipped.
 * Each pulled item gets status REVIEW, isPretest false and
 * metadata.textDependencyAudit { outcome, codes, auditedAt, pulledAt, previousStatus }.
 * Nothing is deleted. Previous values are logged to
 * scripts/jobs/.out/pretest-textdep/pulled-<ts>.jsonl so the change can be reverted.
 *
 * A running server keeps its in-process item cache for up to 5 minutes
 * (item-bank-cache TTL); after that the pulled items are no longer embedded.
 */

import "dotenv/config";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const AUDIT = arg("--audit") ?? "scripts/jobs/.out/pretest-textdep/audit-READING-PRETEST.json";
const APPLY = process.argv.includes("--apply");
const OUT = "scripts/jobs/.out/pretest-textdep";
const PULL = new Set(["blind", "key-unconfirmed"]);

interface AuditRow { id: string; itemCode?: string | null; cefr: string; outcome: string; codes: string[] }

async function main(): Promise<void> {
  const audit = JSON.parse(readFileSync(AUDIT, "utf8")) as { generatedAt: string; status: string; results: AuditRow[] };
  const auditedAt = new Date(audit.generatedAt);
  const selected = audit.results.filter((r) => PULL.has(r.outcome));
  const db = new PrismaClient();
  try {
    const at = new Date().toISOString();
    const logFile = `${OUT}/pulled-${at.replace(/[:.]/g, "-")}.jsonl`;
    mkdirSync(OUT, { recursive: true });
    const summary = { audited: audit.results.length, selected: selected.length, pulled: 0, byCefr: {} as Record<string, number>,
      skipped: { notPretest: [] as string[], changedSinceAudit: [] as string[], missing: [] as string[] } };

    for (let i = 0; i < selected.length; i += 100) {
      const chunk = selected.slice(i, i + 100);
      const written: string[] = [];
      const run = async (tx: any) => {
        const ids = chunk.map((r) => r.id);
        if (APPLY) await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ANY(${ids}) ORDER BY id FOR UPDATE`;
        const rows = new Map<string, any>((await tx.item.findMany({ where: { id: { in: ids } },
          select: { id: true, itemCode: true, status: true, isPretest: true, updatedAt: true, metadata: true } })).map((r: any) => [r.id, r]));
        for (const a of chunk) {
          const row = rows.get(a.id);
          const label = row?.itemCode ?? a.itemCode ?? a.id;
          if (!row) { summary.skipped.missing.push(label); continue; }
          if (row.status !== "PRETEST") { summary.skipped.notPretest.push(label); continue; }
          // generatedAt is when the (last) audit run finished, so any edit after it means the verdict may be stale.
          if (row.updatedAt > auditedAt) { summary.skipped.changedSinceAudit.push(label); continue; }
          summary.pulled++;
          summary.byCefr[a.cefr] = (summary.byCefr[a.cefr] ?? 0) + 1;
          if (!APPLY) continue;
          const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
          const textDependencyAudit = { outcome: a.outcome, codes: a.codes, auditedAt: audit.generatedAt, pulledAt: at, previousStatus: row.status };
          await tx.item.update({ where: { id: a.id }, data: { status: "REVIEW", isPretest: false, metadata: { ...metadata, textDependencyAudit } } });
          written.push(JSON.stringify({ id: a.id, itemCode: row.itemCode, outcome: a.outcome,
            before: { status: row.status, isPretest: row.isPretest, textDependencyAudit: metadata.textDependencyAudit ?? null } }));
        }
      };
      if (APPLY) await db.$transaction(run, { maxWait: 10000, timeout: 60000 }); else await run(db);
      if (written.length) appendFileSync(logFile, written.join("\n") + "\n");
    }

    const remaining = await db.item.groupBy({ by: ["cefrLevel"], where: { skill: "READING", status: "PRETEST" }, _count: true });
    const after = Object.fromEntries(remaining.map((r) => [r.cefrLevel, r._count - (APPLY ? 0 : summary.byCefr[r.cefrLevel] ?? 0)]));
    console.log(JSON.stringify({ ...summary,
      skipped: Object.fromEntries(Object.entries(summary.skipped).map(([k, v]) => [k, { n: v.length, items: v.slice(0, 10) }])),
      readingPretestAfter: after }, null, 1));
    console.log(APPLY ? `pulled ${summary.pulled} items to REVIEW. Log: ${logFile}` : "dry run — nothing written. Add --apply to write.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(APPLY ? "Pull failed; committed chunks are in the pulled-*.jsonl log." : "Dry run failed; nothing was written.", error);
  process.exitCode = 1;
});
