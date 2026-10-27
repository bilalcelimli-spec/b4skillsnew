import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { B4Native } from '../src/native';
import { useCameraEvidence } from '../src/proctoring/useCameraEvidence';
let mockFaceListener: (sample: any) => void;
const mockRecordFace = jest.fn().mockResolvedValue(undefined);
const mockHandlers = new Set<(state: string) => void>();
jest.mock('react-native', () => ({ Platform: { OS: 'macos' }, AppState: { addEventListener: jest.fn((_n, handler) => { mockHandlers.add(handler); return { remove: () => mockHandlers.delete(handler) }; }) } }));
jest.mock('../src/native', () => ({ nativeEvents: { addListener: jest.fn((_name, listener) => { mockFaceListener = listener; return { remove: jest.fn() }; }) }, B4Native: { startCamera: jest.fn(), stopCamera: jest.fn(), captureCamera: jest.fn(), newRequestId: jest.fn() } }));
const backend = { enqueue: jest.fn() };
const image = { base64: 'jpeg', bytes: 100, sha256: 'a'.repeat(64), faceCount: 1, capturedAt: '2026-10-24T09:00:00Z' };
let camera: ReturnType<typeof useCameraEvidence>, tree: ReactTestRenderer;
function Probe() { camera = useCameraEvidence({} as any, 'session1', backend, mockRecordFace); return null; }
beforeEach(async () => {
  jest.clearAllMocks(); mockHandlers.clear();
  (B4Native.startCamera as jest.Mock).mockResolvedValue(1);
  (B4Native.captureCamera as jest.Mock).mockResolvedValue(image);
  (B4Native.newRequestId as jest.Mock).mockResolvedValue('stable-evidence-id');
  backend.enqueue.mockResolvedValue(undefined);
  await act(async () => { tree = create(<Probe />); });
});
afterEach(async () => { await act(async () => tree.unmount()); });
it('never opens a camera or sends an image on mount; capture needs explicit upload', async () => {
  expect(B4Native.startCamera).not.toHaveBeenCalled();
  await act(async () => { await camera.start(); }); expect(camera.preview).toBe(true);
  await act(async () => { await camera.capture(); });
  expect(camera.preview).toBe(false); expect(camera.photo).toEqual({ ...image, evidenceId: 'stable-evidence-id' });
  expect(backend.enqueue).not.toHaveBeenCalled();
});
it('preserves the exact photo and ID if durable enqueue fails and clears only after persistence', async () => {
  await act(async () => { await camera.start(); await camera.capture(); });
  backend.enqueue.mockRejectedValueOnce(new Error('network lost'));
  await act(async () => { await camera.send(); });
  expect(camera.photo?.evidenceId).toBe('stable-evidence-id'); expect(camera.delivered).toBe(false);
  await act(async () => { await camera.send(); });
  expect(backend.enqueue.mock.calls[0]).toEqual(backend.enqueue.mock.calls[1]);
  expect(camera.photo).toBeNull(); expect(camera.delivered).toBe(true);
});
it('stops preview on background without uploading the retained photograph', async () => {
  await act(async () => { await camera.start(); });
  await act(async () => { for (const handler of mockHandlers) handler('background'); });
  expect(camera.preview).toBe(false); expect(B4Native.stopCamera).toHaveBeenCalled();
  expect(backend.enqueue).not.toHaveBeenCalled();
});
it('discards a late photo after the camera was stopped', async () => {
  let finish!: (photo: typeof image) => void;
  (B4Native.captureCamera as jest.Mock).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { await camera.start(); });
  let pending!: Promise<void>;
  act(() => { pending = camera.capture(); });
  act(() => camera.stop());
  await act(async () => { finish(image); await pending; });
  expect(camera.photo).toBeNull(); expect(backend.enqueue).not.toHaveBeenCalled();
});
it('reports camera denial and releases the lease so a new attempt succeeds', async () => {
  (B4Native.startCamera as jest.Mock).mockRejectedValueOnce(new Error('permission denied'));
  await act(async () => { await camera.start(); });
  expect(camera.error).toBe('permission denied'); expect(camera.preview).toBe(false);
  await act(async () => { await camera.start(); }); expect(camera.preview).toBe(true);
});
it('does not overlap two camera opening requests', async () => {
  let finish!: () => void;
  (B4Native.startCamera as jest.Mock).mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = camera.start(); });
  await act(async () => { await camera.start(); });
  expect(B4Native.startCamera).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); await pending; });
});
it('allows the system permission sheet to go inactive and return before opening preview', async () => {
  let finish!: () => void;
  (B4Native.startCamera as jest.Mock).mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = camera.start(); });
  await act(async () => { for (const handler of mockHandlers) handler('inactive'); });
  await act(async () => { for (const handler of mockHandlers) handler('active'); finish(); await pending; });
  expect(camera.preview).toBe(true); expect(camera.error).toBeNull();
});

it('counts only the current native camera run and ignores frames after background stop', async () => {
  await act(async () => { await camera.start(); });
  await act(async () => { for (let t = 0; t <= 5000; t += 1000) mockFaceListener({ count: 0, monotonicMs: t, runId: 99 }); });
  expect(camera.faceCount).toBeNull(); expect(mockRecordFace).not.toHaveBeenCalled();
  await act(async () => { for (let t = 0; t <= 5000; t += 1000) mockFaceListener({ count: 0, monotonicMs: t, runId: 1 }); });
  expect(camera.faceCount).toBe(0); expect(mockRecordFace).toHaveBeenCalledWith('FACE_NOT_DETECTED');
  await act(async () => { for (const handler of mockHandlers) handler('background'); mockFaceListener({ count: 2, monotonicMs: 7000, runId: 1 }); });
  expect(camera.faceCount).toBeNull(); expect(mockRecordFace).toHaveBeenCalledTimes(1);
});
