/**
 * Pure helpers for the routine quality tour (scripts/jobs/quality-tour.ts).
 * The tour only runs read-only audits; nothing here touches the database.
 */

export type StepStatus = 'passed' | 'findings' | 'error' | 'skipped';
export type Metrics = Record<string, number>;

export interface TourStep {
  id: string;
  title: string;
  command: string[];
  needsDatabase: boolean;
  group: 'code' | 'bank';
  /** Exit codes that mean "ran correctly and found something", not "crashed". */
  findingExitCodes?: number[];
  metrics?: (stdout: string) => Metrics;
  /** Metrics whose non-zero value marks the step as having findings. */
  findingMetrics?: string[];
}

export interface StepResult {
  id: string;
  title: string;
  status: StepStatus;
  exitCode: number | null;
  durationMs: number;
  metrics: Metrics;
  note?: string;
}

export interface TourRun {
  date: string;
  startedAt: string;
  gitCommit: string | null;
  gitDirty: boolean;
  database: DatabaseTarget | null;
  steps: StepResult[];
}

export interface DatabaseTarget {
  host: string;
  database: string;
  isLocal: boolean;
}

export interface MetricChange {
  step: string;
  metric: string;
  previous: number | null;
  current: number | null;
  delta: number | null;
}

export interface StatusChange {
  step: string;
  previous: StepStatus;
  current: StepStatus;
}

export interface TourComparison {
  previousDate: string;
  statusChanges: StatusChange[];
  metricChanges: MetricChange[];
}

/** Host and database name only. Credentials and query parameters are never returned. */
export function describeDatabaseTarget(url: string | undefined): DatabaseTarget | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return {
      host,
      database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
      isLocal: ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host),
    };
  } catch {
    return null;
  }
}

export function redactConnectionStrings(text: string): string {
  return text.replace(/\b(postgres(?:ql)?|mysql|redis):\/\/[^\s"'`]+/gi, '$1://[redacted]');
}

/** The audit scripts print one pretty-printed JSON object as the last thing on stdout. */
export function lastJsonObject(stdout: string): Record<string, unknown> | null {
  const starts: number[] = [];
  if (stdout.startsWith('{')) starts.push(0);
  for (let i = stdout.indexOf('\n{'); i !== -1; i = stdout.indexOf('\n{', i + 1)) starts.push(i + 1);
  for (const start of starts.reverse()) {
    try {
      const value = JSON.parse(stdout.slice(start).trim());
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    } catch { /* not the start of the final object */ }
  }
  return null;
}

/** Top-level numbers plus one level of the named count maps (e.g. byRule). */
export function jsonMetrics(stdout: string, countMaps: string[] = []): Metrics {
  const json = lastJsonObject(stdout);
  const metrics: Metrics = {};
  if (!json) return metrics;
  for (const [key, value] of Object.entries(json)) {
    if (typeof value === 'number' && Number.isFinite(value)) metrics[key] = value;
    else if (countMaps.includes(key) && value && typeof value === 'object') {
      for (const [inner, count] of Object.entries(value)) {
        if (typeof count === 'number' && Number.isFinite(count)) metrics[`${key}.${inner}`] = count;
      }
    }
  }
  return metrics;
}

export function coverageMetrics(stdout: string): Metrics {
  const json = lastJsonObject(stdout);
  const metrics: Metrics = {};
  if (!json) return metrics;
  if (typeof json.totalGaps === 'number') metrics.totalGaps = json.totalGaps;
  for (const report of Array.isArray(json.reports) ? json.reports : []) {
    if (report && typeof report.profile === 'string' && typeof report.gaps === 'number') {
      metrics[`gaps.${report.profile}`] = report.gaps;
    }
  }
  return metrics;
}

function firstNumber(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  return match ? Number(match[1]) : undefined;
}

export function irtHealthMetrics(stdout: string): Metrics {
  const metrics: Metrics = {};
  const fields: Array<[string, RegExp]> = [
    ['activeItems', /Total ACTIVE items:\s*(\d+)/],
    ['zeroInformationItems', /Zero-information items[^:]*:\s*(\d+)/],
    ['paramSource.synthetic', /synthetic \(untagged\):\s*(\d+)/],
    ['paramSource.prior', /prior \(norm-based\):\s*(\d+)/],
    ['paramSource.calibrated', /calibrated \(real\):\s*(\d+)/],
    ['itemsWithIqs', /IQS coverage:\s*(\d+)\//],
  ];
  for (const [name, pattern] of fields) {
    const value = firstNumber(stdout, pattern);
    if (value !== undefined) metrics[name] = value;
  }
  return metrics;
}

export function contentQualityMetrics(stdout: string): Metrics {
  const metrics: Metrics = {};
  const scanned = firstNumber(stdout, /scanned=(\d+)/);
  const flagged = firstNumber(stdout, /flagged=(\d+)/);
  if (scanned !== undefined) metrics.scanned = scanned;
  if (flagged !== undefined) metrics.flagged = flagged;
  const byCode = stdout.match(/flags by code:\s*(\{.*\})/);
  if (byCode) {
    try {
      for (const [code, count] of Object.entries(JSON.parse(byCode[1]))) {
        if (typeof count === 'number') metrics[`flag.${code}`] = count;
      }
    } catch { /* summary line changed shape; totals are still recorded */ }
  }
  return metrics;
}

const npx = (...args: string[]) => ['npx', ...args];

/** Every step is read-only. Do not add a step that writes to the database. */
export const TOUR_STEPS: TourStep[] = [
  { id: 'type-check', title: 'TypeScript type check', group: 'code', needsDatabase: false, command: npx('tsc', '--noEmit') },
  { id: 'unit-tests', title: 'Unit tests', group: 'code', needsDatabase: false, command: npx('vitest', 'run', '--reporter=dot') },
  { id: 'item-content', title: 'ACTIVE/PRETEST editorial audit', group: 'bank', needsDatabase: true,
    command: npx('tsx', 'scripts/audit-active-item-content.ts'),
    metrics: out => jsonMetrics(out, ['byRule']), findingMetrics: ['blockerCount', 'reviewCount'] },
  { id: 'item-evidence', title: 'Review evidence audit', group: 'bank', needsDatabase: true,
    command: npx('tsx', 'scripts/audit-item-evidence.ts'),
    metrics: out => jsonMetrics(out, ['byRule']),
    findingMetrics: ['blockedItems', 'itemsNeedingEditorialReview', 'itemsWithEvidenceGaps'] },
  { id: 'listening-media', title: 'Listening media audit', group: 'bank', needsDatabase: true,
    command: npx('tsx', 'scripts/audit-listening-media.ts'),
    metrics: out => jsonMetrics(out), findingMetrics: ['invalidLocalWav'] },
  { id: 'coverage', title: 'Skill/CEFR coverage per product', group: 'bank', needsDatabase: true,
    command: npx('tsx', 'scripts/verify-skill-coverage.ts', '--json'), findingExitCodes: [1],
    metrics: coverageMetrics, findingMetrics: ['totalGaps'] },
  { id: 'irt-health', title: 'IRT parameter health', group: 'bank', needsDatabase: true,
    command: npx('tsx', 'scripts/verify-irt-health.ts'), findingExitCodes: [1],
    metrics: irtHealthMetrics, findingMetrics: ['zeroInformationItems'] },
  { id: 'content-quality', title: 'Content IQS scan', group: 'bank', needsDatabase: true,
    command: npx('tsx', 'scripts/jobs/scan-content-quality.ts'),
    metrics: contentQualityMetrics, findingMetrics: ['flagged'] },
];

export function classifyStep(step: TourStep, exitCode: number | null, metrics: Metrics): StepStatus {
  if (exitCode === null) return 'error';
  if (exitCode !== 0) return step.findingExitCodes?.includes(exitCode) ? 'findings' : 'error';
  return step.findingMetrics?.some(name => (metrics[name] ?? 0) > 0) ? 'findings' : 'passed';
}

/**
 * What moved since the previous run, over the steps both runs contain (a
 * --skip-code run is not a regression in the code steps). A step that errored
 * or was skipped on either side has no trustworthy numbers, so only its status
 * change is reported.
 */
export function compareRuns(previous: TourRun, current: TourRun): TourComparison {
  const statusChanges: StatusChange[] = [];
  const metricChanges: MetricChange[] = [];
  const before = new Map(previous.steps.map(step => [step.id, step]));
  const measured = (step?: StepResult) => step?.status === 'passed' || step?.status === 'findings';

  for (const now of current.steps) {
    const id = now.id;
    const old = before.get(id);
    if (!old) continue;
    if (old.status !== now.status) statusChanges.push({ step: id, previous: old.status, current: now.status });
    if (!measured(old) || !measured(now)) continue;
    for (const metric of new Set([...Object.keys(old.metrics), ...Object.keys(now.metrics)])) {
      const a = old.metrics[metric] ?? null, b = now.metrics[metric] ?? null;
      if (a === b) continue;
      metricChanges.push({ step: id, metric, previous: a, current: b, delta: a !== null && b !== null ? b - a : null });
    }
  }
  return { previousDate: previous.date, statusChanges, metricChanges };
}
