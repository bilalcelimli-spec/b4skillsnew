import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { B4Native } from '../src/native';
import { useExamMonitor } from '../src/proctoring/useExamMonitor';
import type { Backend } from '../src/api';

const mockApp = { state: 'active', handlers: new Set<(s: string) => void>() };
const mockFaces = new Set<(e: { count: number | null; monotonicMs: number; runId: number }) => void>();
const mockCameraState = new Set<(e: { state: string; runId: number }) => void>();
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    get currentState() { return mockApp.state; },
    addEventListener: jest.fn((_n: string, h: (s: string) => void) => { mockApp.handlers.add(h); return { remove: () => mockApp.handlers.delete(h) }; }),
  },
}));
jest.mock('../src/native', () => {
  const prefs = new Map<string, string>(); let run = 0;
  return {
    B4Native: {
      startCamera: jest.fn(async () => ++run),
      stopCamera: jest.fn(),
      captureCamera: jest.fn(async () => ({ base64: 'AAAA', bytes: 3, sha256: 'a'.repeat(64), faceCount: 1, capturedAt: '2026-10-28T09:00:00.000Z' })),
      newRequestId: jest.fn(async () => '716e724c-f93e-4684-a1a2-b611bc67d823'),
      getPref: jest.fn(async (k: string) => prefs.get(k) ?? null),
      setPrefAsync: jest.fn(async (k: string, v: string) => { prefs.set(k, v); }),
    },
    nativeEvents: { addListener: jest.fn((n: string, h: any) => {
      const set: Set<any> = n === 'B4CameraState' ? mockCameraState : mockFaces;
      set.add(h); return { remove: () => set.delete(h) };
    }) },
  };
});

let tree: ReactTestRenderer, hook: ReturnType<typeof useExamMonitor>;
const enqueue = jest.fn(async () => {});
const recordFace = jest.fn(async () => {});
let session = 0;
async function mount(enabled: boolean, cameraPolicy = jest.fn(async () => ({ enabled, retentionDays: 7 }))) {
  const backend = { cameraPolicy } as unknown as Backend;
  const id = `s${session++}`;
  function Probe() { hook = useExamMonitor(backend, id, { enqueue }, recordFace, true); return null; }
  await act(async () => { tree = create(<Probe />); });
  return id;
}
const face = async (count: number, ms: number, runId = 1) =>
  act(async () => { for (const h of mockFaces) h({ count, monotonicMs: ms, runId }); });

beforeEach(() => { jest.clearAllMocks(); mockApp.state = 'active'; jest.useFakeTimers({ now: 0 }); });
afterEach(async () => { await act(async () => tree?.unmount()); mockApp.handlers.clear(); jest.useRealTimers(); });

it('starts the camera with the exam and takes one baseline photo once a single face is steady', async () => {
  const id = await mount(true);
  expect(B4Native.startCamera).toHaveBeenCalledTimes(1);
  expect(hook.status).toBe('active');
  const runId = await (B4Native.startCamera as jest.Mock).mock.results[0].value;
  await face(1, 1000, runId);
  expect(B4Native.captureCamera).not.toHaveBeenCalled(); // not steady yet
  jest.setSystemTime(2500);
  await face(1, 3500, runId);
  expect(B4Native.captureCamera).toHaveBeenCalledTimes(1);
  expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ sessionId: id, platform: 'ipad', faceCount: 1 }));
  expect(hook.baselineSent).toBe(true);
  jest.setSystemTime(6000);
  await face(1, 7000, runId);
  expect(B4Native.captureCamera).toHaveBeenCalledTimes(1); // only once per session
});

it('records a missing face as an observation and shows a warning', async () => {
  await mount(true);
  const runId = await (B4Native.startCamera as jest.Mock).mock.results[0].value;
  for (const ms of [0, 1000, 2000, 3000, 4000, 5000, 6000]) await face(0, ms, runId);
  expect(recordFace).toHaveBeenCalledWith('FACE_NOT_DETECTED');
  expect(hook.warning).toBe('FACE_NOT_DETECTED');
});

it('keeps the camera off when the institution disables it', async () => {
  await mount(false);
  expect(B4Native.startCamera).not.toHaveBeenCalled();
  expect(hook.status).toBe('off');
});

it('stops the camera in the background and restarts it on return', async () => {
  await mount(true);
  await act(async () => { mockApp.state = 'background'; for (const h of mockApp.handlers) h('background'); });
  expect(B4Native.stopCamera).toHaveBeenCalled();
  expect(hook.status).toBe('paused');
  await act(async () => { mockApp.state = 'active'; for (const h of mockApp.handlers) h('active'); });
  expect(B4Native.startCamera).toHaveBeenCalledTimes(2);
  expect(hook.status).toBe('active');
});

it('shows an interruption while the system holds the camera and recovers when it returns', async () => {
  await mount(true);
  const runId = await (B4Native.startCamera as jest.Mock).mock.results[0].value;
  await act(async () => { for (const h of mockCameraState) h({ state: 'interrupted', runId }); });
  expect(hook.status).toBe('interrupted');
  expect(hook.faceCount).toBeNull();
  await act(async () => { for (const h of mockCameraState) h({ state: 'interrupted', runId: runId + 99 }); }); // stale run
  await act(async () => { for (const h of mockCameraState) h({ state: 'resumed', runId }); });
  expect(hook.status).toBe('active');
  expect(hook.detail).toBeNull();
});

it('retry re-reads the camera policy after the first request failed', async () => {
  const policy = jest.fn().mockRejectedValueOnce(new Error('Ağ hatası')).mockResolvedValue({ enabled: true, retentionDays: 7 });
  await mount(true, policy as any);
  expect(hook.status).toBe('unavailable');
  expect(B4Native.startCamera).not.toHaveBeenCalled();
  await act(async () => { await hook.retry(); });
  expect(policy).toHaveBeenCalledTimes(2);
  expect(B4Native.startCamera).toHaveBeenCalledTimes(1);
  expect(hook.status).toBe('active');
});
