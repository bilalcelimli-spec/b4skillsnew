import { Backend, canRender, normaliseBaseUrl, responseMode, AssessmentItem } from '../src/api';

type Call = { url: string; init: RequestInit };

function mockFetch(responses: Array<{ status: number; body?: unknown }>) {
  const calls: Call[] = [];
  (globalThis as any).fetch = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error('unexpected request');
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      text: async () => (next.body === undefined ? '' : JSON.stringify(next.body)),
    };
  });
  return calls;
}

const item = (over: Partial<AssessmentItem>): AssessmentItem => ({
  id: 'i1', skill: 'READING', type: 'MULTIPLE_CHOICE', metadata: { prompt: 'Q?', options: ['a', { text: 'b' }] }, ...over,
});

describe('normaliseBaseUrl', () => {
  it('accepts https origins and strips trailing slashes', () => {
    expect(normaliseBaseUrl(' https://app.b4skills.com/ ')).toBe('https://app.b4skills.com');
  });
  it('accepts http only for local development hosts', () => {
    expect(normaliseBaseUrl('http://localhost:3001')).toBe('http://localhost:3001');
    expect(normaliseBaseUrl('http://192.168.1.20:3001')).toBe('http://192.168.1.20:3001');
    expect(() => normaliseBaseUrl('http://example.com')).toThrow(/HTTPS/);
  });
  it('rejects paths, credentials and queries', () => {
    expect(() => normaliseBaseUrl('https://a.com/api')).toThrow();
    expect(() => normaliseBaseUrl('https://user:pw@a.com')).toThrow();
    expect(() => normaliseBaseUrl('https://a.com?x=1')).toThrow();
  });
});

describe('response modes', () => {
  it('maps canonical writing and speaking prompt types', () => {
    expect(responseMode(item({}))).toBe('choice');
    expect(responseMode(item({ skill: 'WRITING', type: 'WRITING_PROMPT' }))).toBe('text');
    expect(responseMode(item({ skill: 'SPEAKING', type: 'SPEAKING_PROMPT' }))).toBe('audio');
    expect(responseMode(item({ type: 'DRAG_DROP' }))).toBe('unsupported');
  });
  it('blocks listening items without media', () => {
    expect(canRender(item({ skill: 'LISTENING', metadata: { prompt: 'Q', options: ['a'] } }))).toBe(false);
    expect(canRender(item({ skill: 'LISTENING', metadata: { prompt: 'Q', options: ['a'], audioUrl: '/audio/x.mp3' } }))).toBe(true);
  });
});

describe('Backend', () => {
  const api = new Backend('http://localhost:3001');

  it('sends a zero-based choice index and typed audio payload', async () => {
    const calls = mockFetch([{ status: 200, body: { success: true } }, { status: 200, body: { success: true } }]);
    await api.respond('s/1', 'i1', { kind: 'choice', index: 2 }, 1234.4);
    await api.respond('s/1', 'i2', { kind: 'audio', base64: 'AAA=' }, -5);
    expect(calls[0].url).toBe('http://localhost:3001/api/sessions/s%2F1/respond');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ itemId: 'i1', value: 2, latencyMs: 1234 });
    expect(JSON.parse(calls[1].init.body as string)).toEqual({ itemId: 'i2', value: { audio: 'AAA=', mimeType: 'audio/mp4' }, latencyMs: 0 });
    expect(calls[0].init.credentials).toBe('include');
  });

  it('refreshes once after a 401 and replays only that request', async () => {
    const calls = mockFetch([
      { status: 401, body: { error: 'expired' } },
      { status: 200, body: {} },
      { status: 200, body: { status: 'IN_PROGRESS', progress: 3, maxItems: 40 } },
    ]);
    const status = await api.status('s1');
    expect(status.progress).toBe(3);
    expect(calls.map(c => c.url.replace('http://localhost:3001/', ''))).toEqual(['api/sessions/s1/status', 'api/auth/refresh', 'api/sessions/s1/status']);
  });

  it('does not retry a respond POST that failed on the network', async () => {
    (globalThis as any).fetch = jest.fn(async () => { throw new TypeError('Network request failed'); });
    await expect(api.respond('s1', 'i1', { kind: 'text', text: 'hi' }, 10)).rejects.toThrow(/ulaşılamadı/);
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
  });

  it('surfaces the backend message with the HTTP status', async () => {
    mockFetch([{ status: 403, body: { message: 'Lisans bulunamadı' } }]);
    await expect(api.launch('General English')).rejects.toThrow('Lisans bulunamadı (HTTP 403)');
  });

  it('resolves relative media against the backend origin only', () => {
    expect(api.mediaUrl('/audio/a.mp3')).toBe('http://localhost:3001/audio/a.mp3');
    expect(api.mediaUrl('https://cdn.example.com/a.mp3')).toBe('https://cdn.example.com/a.mp3');
    expect(api.mediaUrl('//evil.example/a.mp3')).toBeNull();
  });
});
