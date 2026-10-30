import { Backend, canRender, isExamCode, normaliseBaseUrl, normaliseExamCode, responseMode, AssessmentItem } from '../src/api';

describe('camera evidence transport', () => {
  const photo = { base64: 'jpeg', bytes: 4, sha256: 'a'.repeat(64), faceCount: 1, capturedAt: '2026-10-24T09:00:00Z' };
  it('reserves metadata without image bytes before committing the same evidence ID', async () => {
    const calls = mockFetch([{ status: 200, body: { reserved: true, evidenceId: 'e1' } }, { status: 200, body: { accepted: true, evidenceId: 'e1', eventId: 'evidence_e1' } }]);
    await new Backend('https://app.b4skills.com').sendCameraPhoto('s1', 'e1', photo, 'macos');
    const reserve = JSON.parse(calls[0].init.body as string), commit = JSON.parse(calls[1].init.body as string);
    expect(reserve).not.toHaveProperty('base64'); expect(reserve.platform).toBe('macos');
    expect(commit).toEqual({ version: 1, sessionId: 's1', evidenceId: 'e1', base64: 'jpeg' });
  });
  it('rejects mismatched reservation ACK and never uploads', async () => {
    const calls = mockFetch([{ status: 200, body: { reserved: true, evidenceId: 'other' } }]);
    await expect(new Backend('https://app.b4skills.com').sendCameraPhoto('s1', 'e1', photo, 'ipad')).rejects.toThrow(/rezervasyonu/);
    expect(calls).toHaveLength(1);
  });
  it('rejects an ACK that identifies the right image but a different committed event', async () => {
    mockFetch([{ status: 200, body: { reserved: true, evidenceId: 'e1' } }, { status: 200, body: { accepted: true, evidenceId: 'e1', eventId: 'unrelated-event' } }]);
    await expect(new Backend('https://app.b4skills.com').sendCameraPhoto('s1', 'e1', photo, 'ipad')).rejects.toThrow(/teslimi/);
  });
  it('does not treat a missing server commit ACK as success', async () => {
    mockFetch([{ status: 200, body: { reserved: true, evidenceId: 'e1' } }, { status: 200, body: {} }]);
    await expect(new Backend('https://app.b4skills.com').sendCameraPhoto('s1', 'e1', photo, 'ipad')).rejects.toThrow(/teslimi/);
  });
  it('does not upload image bytes if the account lease changes after reservation', async () => {
    const calls = mockFetch([{ status: 200, body: { reserved: true, evidenceId: 'e1' } }]);
    const current = jest.fn().mockReturnValueOnce(true).mockReturnValue(false);
    await expect(new Backend('https://app.b4skills.com').sendCameraPhoto('s1', 'e1', photo, 'ipad', current)).rejects.toThrow(/iptal/);
    expect(calls).toHaveLength(1); expect(JSON.parse(calls[0].init.body as string)).not.toHaveProperty('base64');
  });
  it('does not start a reservation after logout', async () => {
    const calls = mockFetch([]);
    await expect(new Backend('https://app.b4skills.com').sendCameraPhoto('s1', 'e1', photo, 'ipad', () => false)).rejects.toThrow(/iptal/);
    expect(calls).toHaveLength(0);
  });
  it('does not send photos with zero or multiple faces', async () => {
    const calls = mockFetch([]);
    for (const faceCount of [0, 2]) await expect(new Backend('https://app.b4skills.com').sendCameraPhoto('s1', 'e1', { ...photo, faceCount }, 'ipad')).rejects.toThrow(/bir yüz/);
    expect(calls).toHaveLength(0);
  });
});

describe('exam codes', () => {
  it('follows the backend CodeString rule', () => {
    expect(normaliseExamCode('  ab-12x ')).toBe('AB-12X');
    expect(isExamCode('AB-12X')).toBe(true);
    expect(isExamCode('AB1')).toBe(false);
    expect(isExamCode('AB 12')).toBe(false);
    expect(isExamCode('Ç0DE1')).toBe(false);
  });
});

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

describe('cookie request protection', () => {
  it('sends the configured origin for login, refresh and the retried request', async () => {
    const calls = mockFetch([
      { status: 200, body: {} }, { status: 401 }, { status: 200, body: {} }, { status: 200, body: {user: {uid: 'candidate-1'}} },
    ]);
    const backend = new Backend(normaliseBaseUrl('https://b4skills.com/'));
    await backend.login('candidate@example.test', 'test-only-password');
    expect(calls).toHaveLength(4);
    for (const call of calls) expect(call.init.headers).toMatchObject({ Origin: 'https://b4skills.com' });
  });
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

  it('sends the stable launch receipt and omits a missing organization instead of null', async () => {
    const calls = mockFetch([{ status: 200, body: { sessionId: 's1' } }]);
    await api.launch('General English', null, '716e724c-f93e-4684-a1a2-b611bc67d823');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ productLine: 'General English', launchRequestId: '716e724c-f93e-4684-a1a2-b611bc67d823' });
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

  it('validates an exam code without credentials and redeems it with the candidate details', async () => {
    const calls = mockFetch([
      { status: 200, body: { valid: true, productLine: 'General English', expiresAt: null } },
      { status: 200, body: { success: true, organizationId: 'o1', productLine: 'General English', candidateId: 'u1' } },
    ]);
    expect(await api.validateCode('AB-12')).toEqual({ productLine: 'General English', expiresAt: null });
    const details = { name: 'Ada', surname: 'Y', email: 'ada@example.test', school: 'S', className: '9A' };
    await api.redeemCode('AB-12', 'cand_x1', details);
    expect(calls[0].url).toBe('http://localhost:3001/api/codes/validate');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ code: 'AB-12' });
    expect(JSON.parse(calls[1].init.body as string)).toEqual({ code: 'AB-12', candidateId: 'cand_x1', ...details });
  });

  it('keeps the backend error code for an existing account', async () => {
    mockFetch([{ status: 409, body: { error: 'account_login_required', message: 'Sign in first.' } }]);
    await expect(api.redeemCode('AB-12', 'c', { name: 'a', surname: 'b', email: 'a@b.co', school: 's', className: 'c' }))
      .rejects.toMatchObject({ status: 409, code: 'account_login_required' });
  });

  it('does not refresh tokens on a failed code check', async () => {
    const calls = mockFetch([{ status: 404, body: { error: 'Code not found' } }]);
    await expect(api.validateCode('NOPE1')).rejects.toThrow('Code not found (HTTP 404)');
    expect(calls).toHaveLength(1);
  });

  it('resolves relative media against the backend origin only', () => {
    expect(api.mediaUrl('/audio/a.mp3')).toBe('http://localhost:3001/audio/a.mp3');
    expect(api.mediaUrl('https://cdn.example.com/a.mp3')).toBe('https://cdn.example.com/a.mp3');
    expect(api.mediaUrl('//evil.example/a.mp3')).toBeNull();
  });
});

describe('native event acknowledgements', () => {
  const event = { version: 2 as const, eventId: '716e724c-f93e-4684-a1a2-b611bc67d823', sequence: 0, sessionId: 's1', platform: 'ipad' as const, eventType: 'OTHER' as const, severity: 'INFO' as const, timestamp: '2026-10-24T09:00:00.000Z', metadata: { reason: 'native-monitoring-attached' } };
  it.each([{}, { accepted: true, eventId: 'other' }, { accepted: false, eventId: event.eventId }])('rejects an invalid ACK %j', body => {
    mockFetch([{ status: 200, body }]);
    return expect(new Backend('https://app.b4skills.com').sendEvent(event)).rejects.toThrow(/onayı/);
  });
  it('uses the same event ID when authentication refresh retries delivery', async () => {
    const calls = mockFetch([{ status: 401 }, { status: 200 }, { status: 200, body: { accepted: true, eventId: event.eventId } }]);
    await new Backend('https://app.b4skills.com').sendEvent(event);
    expect(JSON.parse(calls[0].init.body as string)).toEqual(event);
    expect(JSON.parse(calls[2].init.body as string)).toEqual(event);
  });
});
it('preserves explicit backend error codes for preflight recovery', async () => {
  mockFetch([{ status: 409, body: { error: 'Conditions changed', code: 'EXAM_POLICY_CHANGED' } }]);
  await expect(new Backend('https://app.b4skills.com').launch('General English')).rejects.toMatchObject({ status: 409, code: 'EXAM_POLICY_CHANGED' });
});
