import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ count: vi.fn(), responses: vi.fn() }));
vi.mock('../../prisma.js', () => ({ prisma: { session: { count: db.count }, response: { findMany: db.responses } } }));
import { computeQwkSlo, generateSloReport } from '../slo-monitor.js';

beforeEach(() => { vi.clearAllMocks(); db.count.mockResolvedValue(0); db.responses.mockResolvedValue([]); });
const metric = (report: Awaited<ReturnType<typeof generateSloReport>>, name: string) => report.metrics.find(m => m.sloName === name)!;
describe('SLO database evidence', () => {
  it('reports empty samples as unknown and never claims overall health', async () => {
    const report = await generateSloReport();
    expect(report.metrics.every(m => m.achieved === null && m.compliant === null)).toBe(true);
    expect(report.summary.overallHealthy).toBe(false);
  });
  it('does not claim overall health when database queries fail', async () => {
    db.count.mockRejectedValue(new Error('offline')); db.responses.mockRejectedValue(new Error('offline'));
    const report = await generateSloReport();
    expect(report.summary.unknownSlos).toBe(report.metrics.length);
    expect(report.summary.overallHealthy).toBe(false);
  });
  it('compares started terminal attempts, excluding scheduled, paused and scoring attempts', async () => {
    db.count.mockResolvedValueOnce(10).mockResolvedValueOnce(9);
    const report = await generateSloReport();
    expect(metric(report, 'session_success_rate').achieved).toBe(.9);
    expect(db.count.mock.calls[0][0].where).toMatchObject({ startedAt: { not: null }, OR: [
      { status: 'COMPLETED', completedAt: { gte: expect.any(Date) } }, { status: 'EXPIRED', updatedAt: { gte: expect.any(Date) } },
    ] });
  });
  it('counts actual AI success/failure and ignores pending, integrity-rejected and human-only answers', async () => {
    db.responses.mockImplementation(({ select }) => !select.humanScore ? Promise.resolve([
      { aiScore: .8, metadata: { scoreSource: 'ai_auto' } },
      { aiScore: .7, metadata: { scoreSource: 'human' } },
      { aiScore: null, metadata: { scoreSource: 'ai_unavailable' } },
      { aiScore: null, metadata: { scoreSource: 'human', aiUnavailable: true } },
      { aiScore: null, metadata: { pendingAsyncScore: true } },
      { aiScore: 0, metadata: { scoreSource: 'rejected_integrity' } },
      { aiScore: null, metadata: { scoreSource: 'human' } },
    ]) : Promise.resolve([]));
    const report = await generateSloReport();
    expect(metric(report, 'ai_scoring_availability')).toMatchObject({ achieved: .5, compliant: false });
    expect(db.responses.mock.calls[0][0].where).toMatchObject({ isPretest: false, item: { OR: [{ skill: { in: ['WRITING', 'SPEAKING'] } }, { type: 'INTEGRATED_TASK' }] } });
  });
  it('does not infer historical AI success or failure from an incomplete legacy label', async () => {
    db.responses.mockResolvedValue([{aiScore:null,metadata:{scoreSource:'ai_auto'}}]);
    const report = await generateSloReport();
    expect(metric(report,'ai_scoring_availability')).toMatchObject({achieved:null,compliant:null});
    expect(metric(report,'ai_scoring_availability').note).toContain('1 legacy responses');
  });
  it('uses real QWK so systematic score offsets cannot masquerade as perfect agreement', async () => {
    db.responses.mockResolvedValue(Array.from({ length: 12 }, (_, i) => ({ aiScore: (i % 6) / 6, humanScore: (i % 6 + 1) / 6 })));
    const writing = await computeQwkSlo('WRITING', 30);
    expect(writing.sampleSize).toBe(12);
    expect(writing.achieved).toBeLessThan(1);
    expect(writing.achieved).toBeCloseTo(1 - 12 / 82, 5);
    expect(db.responses.mock.calls[0][0].where).toMatchObject({ OR: [{ item: { skill: 'WRITING' } }, { item: { type: 'INTEGRATED_TASK' }, metadata: { path: ['scoringMode'], equals: 'WRITING' } }], aiScore: { not: null }, humanScore: { not: null } });
    await computeQwkSlo('SPEAKING', 30);
    expect(db.responses.mock.calls[1][0].where.OR[0].item.skill).toBe('SPEAKING');
  });
  it('rejects invalid pairs and keeps insufficient QWK samples unknown', async () => {
    db.responses.mockResolvedValue([...Array.from({ length: 9 }, () => ({ aiScore: .5, humanScore: .5 })),
      { aiScore: NaN, humanScore: .5 }, { aiScore: .5, humanScore: 2 }, { aiScore:.5,humanScore:.5,metadata:{aiUnavailable:true} }]);
    expect(await computeQwkSlo('WRITING', 30)).toEqual({ achieved: null, sampleSize: 9 });
  });
  it('keeps degenerate single-band agreement unknown even with ten observations', async () => {
    db.responses.mockResolvedValue(Array.from({ length: 12 }, () => ({ aiScore: .5, humanScore: .5 })));
    expect(await computeQwkSlo('WRITING', 30)).toEqual({ achieved: null, sampleSize: 12 });
  });
  it.each([0, -1, 366, 2.5, NaN])('rejects invalid window %s before querying', async days => {
    await expect(generateSloReport(days)).rejects.toThrow('windowDays');
    expect(db.count).not.toHaveBeenCalled(); expect(db.responses).not.toHaveBeenCalled();
  });
});
