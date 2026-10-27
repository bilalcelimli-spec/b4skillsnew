import { describe, expect, it } from 'vitest';
import {
  TOUR_STEPS, classifyStep, compareRuns, contentQualityMetrics, coverageMetrics, describeDatabaseTarget,
  irtHealthMetrics, jsonMetrics, lastJsonObject, redactConnectionStrings, type StepResult, type TourRun,
} from '../src/lib/quality/quality-tour';

const step = (id: string) => TOUR_STEPS.find(s => s.id === id)!;
const result = (id: string, status: StepResult['status'], metrics: Record<string, number> = {}): StepResult =>
  ({ id, title: id, status, exitCode: 0, durationMs: 1, metrics });
const run = (date: string, steps: StepResult[]): TourRun =>
  ({ date, startedAt: `${date}T00:00:00.000Z`, gitCommit: null, gitDirty: false, database: null, steps });

describe('quality tour: database target', () => {
  it('returns host and database without credentials or parameters', () => {
    const target = describeDatabaseTarget('postgresql://user:s3cret@db.example.com:6543/postgres?pgbouncer=true');
    expect(target).toEqual({ host: 'db.example.com', database: 'postgres', isLocal: false });
    expect(JSON.stringify(target)).not.toContain('s3cret');
  });
  it('recognises local targets', () => {
    expect(describeDatabaseTarget('postgresql://u@127.0.0.1:5432/all_exams_1')?.isLocal).toBe(true);
    expect(describeDatabaseTarget('postgresql://u@localhost/dev')?.isLocal).toBe(true);
  });
  it('treats a missing or malformed URL as no target', () => {
    expect(describeDatabaseTarget(undefined)).toBeNull();
    expect(describeDatabaseTarget('not a url')).toBeNull();
  });
  it('redacts connection strings in captured output', () => {
    expect(redactConnectionStrings('failed: postgresql://user:pw@host:5432/db?x=1 unreachable'))
      .toBe('failed: postgresql://[redacted] unreachable');
  });
});

describe('quality tour: metric extraction', () => {
  it('reads the final JSON object after log noise', () => {
    const stdout = 'warming up\n{ not json\n{\n  "itemCount": 3,\n  "byRule": {\n    "KEY_MISSING": 2\n  }\n}\n';
    expect(lastJsonObject(stdout)).toEqual({ itemCount: 3, byRule: { KEY_MISSING: 2 } });
  });
  it('keeps top-level numbers and only the named count maps', () => {
    const stdout = JSON.stringify({ itemCount: 10, blockedItems: 0, byRule: { A: 1 }, coverage: { cell: 9 }, reportPath: 'x' }, null, 2);
    expect(jsonMetrics(stdout, ['byRule'])).toEqual({ itemCount: 10, blockedItems: 0, 'byRule.A': 1 });
  });
  it('returns nothing when the output has no JSON', () => {
    expect(jsonMetrics('Evidence audit failed')).toEqual({});
  });
  it('reads coverage gaps per product', () => {
    const stdout = JSON.stringify({ totalGaps: 2, reports: [{ profile: 'Academia', gaps: 2, rows: [] }, { profile: 'Corporate', gaps: 0, rows: [] }], gaps: [] }, null, 2);
    expect(coverageMetrics(stdout)).toEqual({ totalGaps: 2, 'gaps.Academia': 2, 'gaps.Corporate': 0 });
  });
  it('reads the IRT health text report', () => {
    const stdout = ['Total ACTIVE items: 2094', '[1] Zero-information items (a ≤ 0): 0', '    synthetic (untagged): 4 (0.2%)',
      '    prior (norm-based):   2090 (99.8%)', '    calibrated (real):    0 (0.0%)', '[3] IQS coverage: 2000/2094 (95.5%), avg=93.0'].join('\n');
    expect(irtHealthMetrics(stdout)).toEqual({ activeItems: 2094, zeroInformationItems: 0, 'paramSource.synthetic': 4,
      'paramSource.prior': 2090, 'paramSource.calibrated': 0, itemsWithIqs: 2000 });
  });
  it('reads the content IQS scan summary', () => {
    const stdout = 'scanned=2094 flagged=481 (23.0%)\nflags by code: {"ABSOLUTE_IN_DISTRACTOR":300,"KEY_LONGEST":181}\n';
    expect(contentQualityMetrics(stdout)).toEqual({ scanned: 2094, flagged: 481, 'flag.ABSOLUTE_IN_DISTRACTOR': 300, 'flag.KEY_LONGEST': 181 });
  });
});

describe('quality tour: step status', () => {
  it('separates findings from crashes by exit code', () => {
    expect(classifyStep(step('coverage'), 1, { totalGaps: 3 })).toBe('findings');
    expect(classifyStep(step('coverage'), 2, {})).toBe('error');
    expect(classifyStep(step('type-check'), 1, {})).toBe('error');
  });
  it('marks a clean exit with non-zero finding metrics as findings', () => {
    expect(classifyStep(step('item-content'), 0, { itemCount: 10, blockerCount: 1, reviewCount: 0 })).toBe('findings');
    expect(classifyStep(step('item-content'), 0, { itemCount: 10, blockerCount: 0, reviewCount: 0 })).toBe('passed');
  });
  it('treats a timeout or failed spawn as an error', () => {
    expect(classifyStep(step('unit-tests'), null, {})).toBe('error');
  });
  it('has unique step ids', () => {
    expect(new Set(TOUR_STEPS.map(s => s.id)).size).toBe(TOUR_STEPS.length);
  });
});

describe('quality tour: comparison', () => {
  it('reports only metrics that moved', () => {
    const comparison = compareRuns(
      run('2026-10-07', [result('item-content', 'findings', { itemCount: 100, blockerCount: 2 })]),
      run('2026-10-14', [result('item-content', 'findings', { itemCount: 100, blockerCount: 5 })]));
    expect(comparison.previousDate).toBe('2026-10-07');
    expect(comparison.statusChanges).toEqual([]);
    expect(comparison.metricChanges).toEqual([{ step: 'item-content', metric: 'blockerCount', previous: 2, current: 5, delta: 3 }]);
  });
  it('reports new and vanished metrics without a delta', () => {
    const comparison = compareRuns(
      run('2026-10-07', [result('item-content', 'findings', { 'byRule.OLD': 1 })]),
      run('2026-10-14', [result('item-content', 'findings', { 'byRule.NEW': 4 })]));
    expect(comparison.metricChanges).toEqual([
      { step: 'item-content', metric: 'byRule.OLD', previous: 1, current: null, delta: null },
      { step: 'item-content', metric: 'byRule.NEW', previous: null, current: 4, delta: null },
    ]);
  });
  it('does not read a crashed step as every finding being resolved', () => {
    const comparison = compareRuns(
      run('2026-10-07', [result('coverage', 'findings', { totalGaps: 6 })]),
      run('2026-10-14', [result('coverage', 'error')]));
    expect(comparison.statusChanges).toEqual([{ step: 'coverage', previous: 'findings', current: 'error' }]);
    expect(comparison.metricChanges).toEqual([]);
  });
  it('ignores steps that only one run contains', () => {
    const comparison = compareRuns(
      run('2026-10-07', [result('type-check', 'passed'), result('coverage', 'passed', { totalGaps: 0 })]),
      run('2026-10-14', [result('coverage', 'passed', { totalGaps: 0 }), result('new', 'passed')]));
    expect(comparison).toEqual({ previousDate: '2026-10-07', statusChanges: [], metricChanges: [] });
  });
});
