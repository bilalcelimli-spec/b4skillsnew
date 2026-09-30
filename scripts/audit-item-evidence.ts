/** Read-only DB access. Writes a local, private report; never changes item eligibility. */
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildEvidenceQueue, type AuditItem } from '../src/lib/quality/item-evidence-audit.js';

config({ path: '.env.local', quiet: true });
config({ quiet: true });
const prisma = new PrismaClient();
async function main() {
  const items: AuditItem[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await prisma.item.findMany({
      where: { status: { in: ['ACTIVE', 'PRETEST'] } }, orderBy: { id: 'asc' }, take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, itemCode: true, type: true, skill: true, cefrLevel: true, status: true, version: true,
        content: true, metadata: true, construct: true, subskill: true, descriptorRef: true, evidenceStatement: true,
        estimatedResponseTimeSec: true, itemReviews: { select: { reviewerId: true, verdict: true } },
        _count: { select: { responses: true, calibrationRuns: true } } },
    });
    if (!page.length) break;
    items.push(...page); cursor = page.at(-1)!.id;
    if (page.length < 100) break;
  }
  const hashes = new Map(items.map(item => [item.id, createHash('sha256').update(JSON.stringify(item.content)).digest('hex')]));
  const queue = buildEvidenceQueue(items).map(row => ({ ...row, contentHash: hashes.get(row.itemId) }));
  const byRule: Record<string, number> = {}, coverage: Record<string, number> = {};
  for (const item of items) {
    const cell = `${item.status}/${item.skill}/${item.cefrLevel}/${item.type}`;
    coverage[cell] = (coverage[cell] || 0) + 1;
  }
  for (const row of queue) for (const finding of row.findings) byRule[finding.rule] = (byRule[finding.rule] || 0) + 1;
  const summary = { itemCount: items.length,
    blockedItems: queue.filter(r => r.decision === 'BLOCKED').length,
    itemsNeedingEditorialReview: queue.filter(r => r.findings.some(f => f.severity === 'REVIEW')).length,
    itemsWithEvidenceGaps: queue.filter(r => r.findings.some(f => f.severity === 'EVIDENCE_GAP')).length,
    byRule, coverage };
  const directory = path.resolve('reports/item-evidence');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const reportPath = path.join(directory, `audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(reportPath, JSON.stringify({ policyVersion: '1.0', generatedAt: new Date().toISOString(),
    limitations: ['Static checks are not expert approval or validation.', 'Audio is not played or fetched.',
      'Missing evidence means unlocated in recognized fields, not proof that work never occurred.',
      'Snapshot spans paginated reads; do not treat it as an atomic release gate.',
      'No live item status, content or scoring parameters were changed.'], summary, queue }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ ...summary, reportPath }, null, 2));
  if (process.argv.includes('--strict') && summary.blockedItems) process.exitCode = 2;
}
main().catch(() => { console.error('Evidence audit failed; check database access. No item changes were attempted.'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
