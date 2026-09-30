import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8');

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const fetchMock = vi.fn().mockResolvedValue(new Response('network'));
  const cache = { keys: vi.fn().mockResolvedValue([]), delete: vi.fn(), put: vi.fn() };
  const caches = { keys: vi.fn().mockResolvedValue([]), open: vi.fn().mockResolvedValue(cache), delete: vi.fn(), match: vi.fn() };
  const self = { location: { origin: 'https://b4skills.com' }, addEventListener: (type: string, handler: any) => { handlers[type] = handler; }, skipWaiting: vi.fn().mockResolvedValue(undefined), clients: { claim: vi.fn().mockResolvedValue(undefined) } };
  vm.runInNewContext(source, { self, caches, fetch: fetchMock, URL, Response, console });
  return { handlers, fetchMock, cache, caches, self };
}

describe('single assessment-safe service worker', () => {
  it.each(['/api/sessions/exam/next', '/api/sessions/exam/status', '/api/auth/me', '/', '/index.html'])('never serves %s from any cache', async pathname => {
    const w = worker();
    const request = { url: `https://b4skills.com${pathname}`, method: 'GET' };
    let response: Promise<Response> | undefined;
    w.handlers.fetch({ request, respondWith: (value: Promise<Response>) => { response = value; } });
    expect(await (await response!).text()).toBe('network');
    expect(w.fetchMock).toHaveBeenCalledWith(request, { cache: 'no-store' });
    expect(w.caches.match).not.toHaveBeenCalled();
  });

  it('does not fall back to stale exam data when offline', async () => {
    const w = worker();
    w.fetchMock.mockRejectedValue(new Error('offline'));
    let response: Promise<Response> | undefined;
    w.handlers.fetch({ request: { url: 'https://b4skills.com/api/sessions/exam/next', method: 'GET' }, respondWith: (value: Promise<Response>) => { response = value; } });
    await expect(response).rejects.toThrow('offline');
    expect(w.caches.match).not.toHaveBeenCalled();
  });

  it('keeps cached chunks for an already-open tab', async () => {
    const w = worker();
    w.caches.match.mockResolvedValue(new Response('old-chunk'));
    let response: Promise<Response> | undefined;
    w.handlers.fetch({ request: { url: 'https://b4skills.com/assets/index-Old123.js', method: 'GET' }, respondWith: (value: Promise<Response>) => { response = value; } });
    expect(await (await response!).text()).toBe('old-chunk');
    expect(w.fetchMock).not.toHaveBeenCalled();
  });

  it('never caches missing chunks', async () => {
    const w = worker();
    w.fetchMock.mockResolvedValue(new Response('', { status: 404 }));
    let response: Promise<Response> | undefined;
    w.handlers.fetch({ request: { url: 'https://b4skills.com/assets/index-Missing.js', method: 'GET' }, respondWith: (value: Promise<Response>) => { response = value; } });
    expect((await response!).status).toBe(404);
    expect(w.cache.put).not.toHaveBeenCalled();
  });

  it('leaves POSTs and private external media untouched', () => {
    const w = worker();
    const respondWith = vi.fn();
    for (const request of [
      { url: 'https://b4skills.com/api/sessions/exam/respond', method: 'POST' },
      { url: 'https://storage.example/assets/private-Abc123.js', method: 'GET' },
    ]) w.handlers.fetch({ request, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });

  it('removes legacy API/shell caches without deleting pending answers or old chunks', async () => {
    const w = worker();
    w.caches.keys.mockResolvedValue(['api-reads', 'media-assets', 'b4skills-v1-api', 'b4skills-v1-static', 'static-assets', 'unrelated']);
    const html = { url: 'https://b4skills.com/' };
    const chunk = { url: 'https://b4skills.com/assets/index-Old123.js' };
    w.cache.keys.mockResolvedValue([html, chunk]);
    let done: Promise<void> | undefined;
    w.handlers.activate({ waitUntil: (value: Promise<void>) => { done = value; } });
    await done;
    expect(w.caches.delete.mock.calls).toEqual([['api-reads'], ['media-assets'], ['b4skills-v1-api']]);
    expect(w.cache.delete.mock.calls).toEqual([[html]]);
    expect(w.self.clients.claim).toHaveBeenCalledOnce();
    expect(handlersPreserveSync()).toBe(true);
  });
});

function handlersPreserveSync() {
  return source.includes('syncPendingResponses') && source.includes('indexedDB.open("b4skills_offline", 1)');
}
