import { afterEach, expect, it, vi } from 'vitest';
import { requestNextItem } from '../src/lib/assessment-engine/next-item-request';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it('accepts items and section transitions', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ item: { id: 'second' } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ sectionTransition: true }) }));
  expect((await requestNextItem('exam')).item.id).toBe('second');
  expect((await requestNextItem('exam')).sectionTransition).toBe(true);
});
it('rejects an empty successful payload instead of leaving a blank screen', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  await expect(requestNextItem('exam')).rejects.toThrow('could not be loaded');
});
it('times out a stuck connection so the candidate can reconnect', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
  })));
  const assertion = expect(requestNextItem('exam', 100)).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(100);
  await assertion;
});
it('also times out when headers arrive but the response body stalls', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => ({ ok: true, json: () => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
  }) })));
  const assertion = expect(requestNextItem('exam', 100)).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(100);
  await assertion;
});
