import { describe, expect, it, vi } from 'vitest';
import { retrieveSloReport } from '../scripts/fetch-slo-report';
const options = { baseUrl: 'https://example.test', secret: 'test-secret' };
const report = { windowDays: 30, metrics: [{ compliant: null }], summary: { totalSlos: 1, compliantSlos: 0, nonCompliantSlos: 0, unknownSlos: 1 } };
const response = (body: unknown, contentType = 'application/json', status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': contentType } });
describe('SLO workflow client', () => {
  it('always retrieves structured JSON so default Markdown output cannot bypass compliance checks', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(report));
    expect(await retrieveSloReport({ ...options, fetchImpl })).toEqual(report);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url.searchParams.get('format')).toBe('json'); expect(init.redirect).toBe('error');
    expect(init.headers.Authorization).toBe('Bearer test-secret');
  });
  it('rejects HTML fallbacks and HTTP errors', async () => {
    for (const mock of [response('<html>ok</html>', 'text/html'), response({}, 'application/json', 503)]) {
      await expect(retrieveSloReport({ ...options, fetchImpl: vi.fn().mockResolvedValue(mock) })).rejects.toThrow();
    }
  });
  it.each([
    {}, { ...report, windowDays: 7 }, { ...report, summary: { ...report.summary, nonCompliantSlos: -1 } },
    { ...report, summary: { ...report.summary, nonCompliantSlos: 1 } }, { ...report, metrics: [{ compliant: false }] },
  ])('rejects malformed or contradictory report counts: %j', async body => {
    await expect(retrieveSloReport({ ...options, fetchImpl: vi.fn().mockResolvedValue(response(body)) })).rejects.toThrow('invalid report');
  });
  it('rejects missing credentials and bad windows without contacting the API', async () => {
    const fetchImpl = vi.fn();
    await expect(retrieveSloReport({ ...options, secret: '', fetchImpl })).rejects.toThrow('required');
    await expect(retrieveSloReport({ ...options, days: '30;echo injected', fetchImpl })).rejects.toThrow('WINDOW_DAYS');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
