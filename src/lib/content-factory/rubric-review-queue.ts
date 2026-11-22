/**
 * Review queue for writing and speaking items parked in the pretest pool
 * (docs/quality/rubric-item-activation-2026-11.md). Pure; the job script
 * loads the rows.
 *
 * Such an item is never served: pretest slots exclude these skills and the
 * live pool takes only non-pretest ACTIVE items. Its only route to ACTIVE is
 * the editorial review (four current approvals from at least two reviewers)
 * followed by pilot promotion, which activates admitted writing and speaking
 * items under RUBRIC_ACTIVATION_POLICY.
 */
import { pilotAdmissionReasons } from './pilot-promotion.js';

export type QueueItem = Parameters<typeof pilotAdmissionReasons>[0] & { id: string; itemCode?: string | null };

export interface QueueRow {
  id: string;
  itemCode: string | null;
  skill: string;
  cefrLevel: string;
  status: string;
  pipelineStage: string;
  /** What still stands between the item and admission, ignoring the stage it is at. */
  outstanding: string[];
  /** Content problems a reviewer must fix first (evidence-audit blockers). */
  contentBlockers: string[];
  readyToPromote: boolean;
}

const LEVEL_ORDER = ['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const level = (cefr: string) => { const i = LEVEL_ORDER.indexOf(cefr); return i < 0 ? LEVEL_ORDER.length : i; };
const byCell = (a: { skill: string; cefrLevel: string }, b: { skill: string; cefrLevel: string }) =>
  a.skill.localeCompare(b.skill) || level(a.cefrLevel) - level(b.cefrLevel);

const REVIEW_REASONS = /_APPROVAL_MISSING$|^INDEPENDENT_REVIEWERS_MISSING$|^UNRESOLVED_REVIEW_OBJECTION$/;
const LIFECYCLE_REASONS = new Set(['STAGE_CHANGED', 'STATUS_NOT_ELIGIBLE', 'ITEM_SUSPENDED', 'ITEM_COMPROMISED']);

export function buildRubricQueue(items: QueueItem[]): QueueRow[] {
  return items.map((item) => {
    const atGate = pilotAdmissionReasons({ ...item, pipelineStage: 'APPROVED_FOR_PILOT' });
    const reasons = pilotAdmissionReasons(item);
    return {
      id: item.id,
      itemCode: item.itemCode ?? null,
      skill: item.skill,
      cefrLevel: item.cefrLevel,
      status: item.status,
      pipelineStage: item.pipelineStage,
      outstanding: atGate.filter((r) => REVIEW_REASONS.test(r) || LIFECYCLE_REASONS.has(r)),
      contentBlockers: atGate.filter((r) => !REVIEW_REASONS.test(r) && !LIFECYCLE_REASONS.has(r)),
      readyToPromote: reasons.length === 0,
    };
  }).sort((a, b) => Number(b.readyToPromote) - Number(a.readyToPromote) || a.contentBlockers.length - b.contentBlockers.length
    || byCell(a, b) || (a.itemCode ?? a.id).localeCompare(b.itemCode ?? b.id));
}

const count = <T,>(rows: T[], key: (row: T) => string) => {
  const out = new Map<string, number>();
  for (const row of rows) out.set(key(row), (out.get(key(row)) ?? 0) + 1);
  return [...out.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};

export function renderRubricQueueMarkdown(rows: QueueRow[], now: Date): string {
  const lines: string[] = [];
  const ready = rows.filter((r) => r.readyToPromote).length;
  const blocked = rows.filter((r) => r.contentBlockers.length).length;
  lines.push('# Writing and speaking review queue', '');
  lines.push(`Generated ${now.toISOString()}. ${rows.length} writing and speaking items sit in the pretest pool, where they are never served.`, '');
  lines.push('Route: editorial review in the Content Factory queue (language, CEFR, fairness, moderation; at least two reviewers) → `APPROVED_FOR_PILOT` → pilot promotion, which makes them ACTIVE on prior parameters (calibration pending).', '');
  lines.push('| Items | Ready to promote | Need review only | Need a content fix first |', '|---:|---:|---:|---:|');
  lines.push(`| ${rows.length} | ${ready} | ${rows.length - ready - blocked} | ${blocked} |`, '');

  lines.push('## By skill and level', '', '| Skill · level | Items | Ready | Content fix first |', '|---|---:|---:|---:|');
  const cells = [...new Map(rows.map((r) => [`${r.skill} ${r.cefrLevel}`, r])).values()].sort(byCell);
  for (const first of cells) {
    const inCell = rows.filter((r) => r.skill === first.skill && r.cefrLevel === first.cefrLevel);
    lines.push(`| ${first.skill} ${first.cefrLevel} | ${inCell.length} | ${inCell.filter((r) => r.readyToPromote).length} | ${inCell.filter((r) => r.contentBlockers.length).length} |`);
  }
  lines.push('');

  lines.push('## Editorial stage', '', '| Stage | Items |', '|---|---:|');
  for (const [stage, n] of count(rows, (r) => r.pipelineStage)) lines.push(`| ${stage} | ${n} |`);
  lines.push('');

  const blockers = count(rows.flatMap((r) => r.contentBlockers.map((b) => ({ b }))), (x) => x.b);
  if (blockers.length) {
    lines.push('## Content blockers', '', '| Rule | Items |', '|---|---:|');
    for (const [rule, n] of blockers) lines.push(`| ${rule} | ${n} |`);
    lines.push('');
  }

  lines.push('## Items', '', 'Items with no content blockers come first: they need only the reviews.', '');
  lines.push('| Item | Skill · level | Status | Stage | Content blockers | Still needed |', '|---|---|---|---|---|---|');
  for (const r of rows) {
    const needed = r.readyToPromote ? 'ready to promote' : r.outstanding.map((o) => o.replace(/_APPROVAL_MISSING$/, '').replace(/_/g, ' ').toLowerCase()).join(', ');
    lines.push(`| ${r.itemCode ?? r.id} | ${r.skill} ${r.cefrLevel} | ${r.status} | ${r.pipelineStage} | ${r.contentBlockers.join(', ') || '—'} | ${needed} |`);
  }
  return lines.join('\n') + '\n';
}
