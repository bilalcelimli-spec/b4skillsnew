import { EventQueue, MAX_QUEUED_EVENTS, QueueStorage } from '../src/proctoring/eventQueue';
import { ProctoringCoordinator } from '../src/proctoring/coordinator';
const sample = { sessionId: 's1', platform: 'ipad' as const, eventType: 'TAB_BLUR' as const, severity: 'INFO' as const, metadata: { reason: 'native-lifecycle-background' } };
let value: string | null, storage: QueueStorage, send: jest.Mock, id: number;
beforeEach(() => {
  value = null; id = 0;
  storage = { read: jest.fn(async () => value), write: jest.fn(async next => { value = next; }) };
  send = jest.fn(async () => {});
});
const queue = () => new EventQueue(storage, send, async () => `716e724c-f93e-4684-a1a2-${String(id++).padStart(12, '0')}`);
it('persists and replays the exact event after process restart and a lost ACK', async () => {
  const first = queue(); await first.append(sample);
  send.mockRejectedValueOnce(new Error('ACK lost'));
  await expect(first.flush()).rejects.toThrow('ACK lost');
  expect(await first.pending()).toBe(1);
  const restarted = queue(); await restarted.flush();
  expect(send.mock.calls[1][0]).toEqual(send.mock.calls[0][0]);
  expect(await restarted.pending()).toBe(0);
  await restarted.append(sample); expect(JSON.parse(value!).events[0].sequence).toBe(1);
});
it('does not deliver an event that could not be saved', async () => {
  (storage.write as jest.Mock).mockRejectedValueOnce(new Error('Keychain locked'));
  const events = queue(); await expect(events.append(sample)).rejects.toThrow('Keychain locked');
  await events.flush(); expect(send).not.toHaveBeenCalled();
});
it('retains acknowledged events if local deletion fails for idempotent retransmission', async () => {
  const events = queue(); await events.append(sample);
  (storage.write as jest.Mock).mockRejectedValueOnce(new Error('Disk unavailable'));
  await expect(events.flush()).rejects.toThrow('Disk unavailable');
  expect(await events.pending()).toBe(1);
  await events.flush(); expect(send.mock.calls[1][0].eventId).toBe(send.mock.calls[0][0].eventId);
});
it('persists new events while delivery is slow, with one drain and monotonic sequences', async () => {
  let resolve!: () => void;
  send.mockImplementationOnce(() => new Promise<void>(done => { resolve = done; }));
  const events = queue(); await events.append(sample);
  const flushing = events.flush(); expect(events.flush()).toBe(flushing);
  await events.append(sample); expect(await events.pending()).toBe(2);
  resolve(); await flushing;
  expect(send.mock.calls.map(call => call[0].sequence)).toEqual([0, 1]);
  expect(await events.pending()).toBe(0);
});
it('never discards older events when the quota is full', async () => {
  const events = queue();
  for (let n = 0; n < MAX_QUEUED_EVENTS; n++) await events.append(sample);
  await expect(events.append(sample)).rejects.toThrow(/dolu/);
  expect(await events.pending()).toBe(MAX_QUEUED_EVENTS);
});
it('refuses corrupt persistence instead of silently resetting evidence', async () => {
  value = '{broken'; await expect(queue().checkStorage()).rejects.toThrow(); expect(value).toBe('{broken');
});
it('scopes queues through injected storage without leaking events to another account', async () => {
  await queue().append(sample); const otherSend = jest.fn();
  await new EventQueue({ read: async () => null, write: async () => {} }, otherSend, async () => 'other').flush();
  expect(otherSend).not.toHaveBeenCalled();
});
it('stops playback before recording, blocks playback during recording and releases the correct lease', () => {
  const coordinator = new ProctoringCoordinator(); const playback = Symbol(), mic = Symbol();
  let releasePlayback!: () => void;
  const stop = jest.fn(() => releasePlayback());
  releasePlayback = coordinator.acquire('playback', playback, stop);
  const releaseMic = coordinator.acquire('microphone', mic, jest.fn()); expect(stop).toHaveBeenCalledTimes(1);
  expect(() => coordinator.acquire('playback', Symbol(), jest.fn())).toThrow(/Ses kaydı/);
  expect(() => coordinator.acquire('microphone', Symbol(), jest.fn())).toThrow(/başka/);
  releaseMic(); expect(() => coordinator.acquire('playback', Symbol(), jest.fn())).not.toThrow();
});
it('stops draining after account cleanup without discarding the next event', async () => {
  const events = queue(); await events.append(sample); await events.append(sample);
  let active = true;
  send.mockImplementationOnce(async () => { active = false; });
  await events.flush(() => active);
  expect(send).toHaveBeenCalledTimes(1); expect(await events.pending()).toBe(1);
  await events.flush(); expect(await events.pending()).toBe(0);
});
