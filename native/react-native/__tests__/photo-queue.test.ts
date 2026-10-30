import { PhotoQueue, type QueuedPhoto } from '../src/proctoring/photoQueue';
const now = Date.now();
const image: QueuedPhoto = { evidenceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', sessionId: 'session1', platform: 'macos', base64: '/9j/AA==', bytes: 4, sha256: 'a'.repeat(64), faceCount: 1, capturedAt: new Date(now).toISOString() };
let disk: string | null, storage: { read: jest.Mock; write: jest.Mock }, send: jest.Mock;
beforeEach(() => { disk = null; send = jest.fn().mockResolvedValue(undefined); storage = { read: jest.fn(async () => disk), write: jest.fn(async value => { disk = value; }) }; });
const queue = () => new PhotoQueue(storage, send, () => now);
it('persists before any send and recovers approved photos after process restart', async () => {
  await queue().append(image); expect(send).not.toHaveBeenCalled();
  const recovered = queue(); expect(await recovered.status()).toHaveLength(1);
  await recovered.flush(); expect(send).toHaveBeenCalledWith(image, expect.any(Function)); expect(await queue().status()).toHaveLength(0);
});
it('never sends if persistence fails', async () => {
  storage.write.mockRejectedValue(new Error('disk locked'));
  const q = queue(); await expect(q.append(image)).rejects.toThrow('disk locked'); await q.flush(); expect(send).not.toHaveBeenCalled();
});
it('retains the exact image after network or local ACK persistence failure', async () => {
  const q = queue(); await q.append(image); send.mockRejectedValueOnce(new Error('offline'));
  await expect(q.flush()).rejects.toThrow('offline');
  storage.write.mockRejectedValueOnce(new Error('disk locked'));
  await expect(q.flush()).rejects.toThrow('disk locked');
  const restored = queue(); await restored.flush(); expect(send.mock.calls.map(c => c[0])).toEqual([image, image, image]);
});
it('retries expired local timestamps to recover a previously committed server ACK', async () => {
  await queue().append(image); const q = new PhotoQueue(storage, send, () => now + 3600000);
  await q.flush(); expect(send).toHaveBeenCalledTimes(1); expect(await q.status()).toHaveLength(0);
});
it('makes server expiry and rejection visible and does not loop permanently failed photos', async () => {
  const q = queue(); await q.append(image); send.mockRejectedValueOnce({ status: 410 });
  await q.flush(); await q.flush(); expect(send).toHaveBeenCalledTimes(1);
  expect((await queue().status())[0].failure).toBe('expired'); await q.discard(image.evidenceId); expect(await queue().status()).toHaveLength(0);
});
it('does not send after the account lease is released', async () => {
  const q = queue(); await q.append(image); await q.flush(() => false); expect(send).not.toHaveBeenCalled(); expect(await q.status()).toHaveLength(1);
});
it('rejects malformed storage without overwriting it', async () => {
  disk = '{"version":2,"entries":[]}'; const q = queue(); await expect(q.checkStorage()).rejects.toThrow(); expect(storage.write).not.toHaveBeenCalled();
});
it('bounds the queue, rejects changed UUID reuse, and does not evict approved photos', async () => {
  const q = queue(); await q.append(image); await q.append(image);
  await expect(q.append({ ...image, sha256: 'b'.repeat(64) })).rejects.toThrow();
  for (let i = 1; i < 4; i++) await q.append({ ...image, evidenceId: `${i}${image.evidenceId.slice(1)}` });
  await expect(q.append({ ...image, evidenceId: `5${image.evidenceId.slice(1)}` })).rejects.toThrow('dolu'); expect(await q.status()).toHaveLength(4);
});
it('deduplicates concurrent flushes and permits durable enqueue while transport is blocked', async () => {
  let release!: () => void; send.mockImplementationOnce(() => new Promise<void>(r => { release = r; }));
  const q = queue(); await q.append(image); const first = q.flush();
  while (!release) await Promise.resolve();
  await q.append({ ...image, evidenceId: `2${image.evidenceId.slice(1)}` });
  const second = q.flush(); release(); await Promise.all([first, second]); expect(send).toHaveBeenCalledTimes(2);
});

it('does not permanently reject an old account image when an in-flight request loses its account lease', async () => {
  let active = true;
  send.mockImplementationOnce(async () => { active = false; throw { status: 403 }; });
  const q = queue(); await q.append(image); await expect(q.flush(() => active)).rejects.toMatchObject({ status: 403 });
  expect((await q.status())[0].failure).toBeUndefined();
  active = true; await q.flush(() => active); expect(await q.status()).toHaveLength(0);
});
it('treats the session photo quota as a permanent visible failure, not a rate-limit retry', async () => {
  const q = queue(); await q.append(image); send.mockRejectedValueOnce({ status: 429, code: 'EVIDENCE_QUOTA' });
  await q.flush(); await q.flush(); expect(send).toHaveBeenCalledTimes(1); expect((await q.status())[0].failure).toBe('quota');
});
