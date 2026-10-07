import { appendFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { sloReportToMarkdown } from '../src/lib/observability/slo-format.js';
import type { SloReport } from '../src/lib/observability/slo-monitor.js';

export async function retrieveSloReport({ baseUrl, secret, days = '30', fetchImpl = fetch }: {
  baseUrl: string; secret: string; days?: string; fetchImpl?: typeof fetch;
}): Promise<SloReport> {
  if (!baseUrl || !secret) throw new Error('APP_URL and INTERNAL_API_SECRET are required');
  if (!/^\d+$/.test(days) || Number(days) < 1 || Number(days) > 365) throw new Error('WINDOW_DAYS must be 1–365');
  const url = new URL('/api/admin/slo/report', baseUrl);
  url.searchParams.set('window', days); url.searchParams.set('format', 'json');
  const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(60000), redirect: 'error' });
  if (!response.ok) throw new Error(`SLO endpoint returned HTTP ${response.status}`);
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('SLO endpoint did not return JSON');
  const report = await response.json() as SloReport;
  const summary = report.summary;
  if (!summary || !Array.isArray(report.metrics) || report.windowDays !== Number(days) ||
      !['totalSlos', 'compliantSlos', 'nonCompliantSlos', 'unknownSlos'].every(key => Number.isInteger(summary[key as keyof typeof summary]) && Number(summary[key as keyof typeof summary]) >= 0) ||
      summary.totalSlos !== report.metrics.length || summary.compliantSlos + summary.nonCompliantSlos + summary.unknownSlos !== summary.totalSlos ||
      report.metrics.filter(m => m.compliant === false).length !== summary.nonCompliantSlos ||
      report.metrics.filter(m => m.compliant === true).length !== summary.compliantSlos ||
      report.metrics.filter(m => m.compliant === null).length !== summary.unknownSlos) {
    throw new Error('SLO endpoint returned an invalid report');
  }
  return report;
}

async function main() {
  const format = process.env.FORMAT || 'markdown';
  if (!['json', 'markdown'].includes(format)) throw new Error('FORMAT must be json or markdown');
  const report = await retrieveSloReport({ baseUrl: process.env.APP_URL || '', secret: process.env.INTERNAL_API_SECRET || '', days: process.env.WINDOW_DAYS || '30' });
  const json = JSON.stringify(report, null, 2);
  writeFileSync('slo-report.json', json + '\n');
  const rendered = format === 'markdown' ? sloReportToMarkdown(report) : '```json\n' + json + '\n```';
  writeFileSync('slo-report.txt', rendered + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, rendered + '\n');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `non_compliant=${report.summary.nonCompliantSlos}\nunknown=${report.summary.unknownSlos}\n`);
  console.log(`SLO report: ${report.summary.nonCompliantSlos} non-compliant, ${report.summary.unknownSlos} unknown`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(`SLO report failed: ${error.message}`); process.exitCode = 1; });
}
