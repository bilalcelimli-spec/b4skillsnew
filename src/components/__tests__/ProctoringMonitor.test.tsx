// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi, type Mock } from 'vitest';
import { ProctoringMonitor } from '../ProctoringMonitor';
import { loadFaceDetector, type FaceDetector } from '../../lib/proctoring/face-detector';
vi.mock('../../lib/proctoring/face-detector', () => ({ loadFaceDetector: vi.fn() }));
vi.mock('motion/react', () => ({ motion: { div: ({ children }: any) => <div>{children}</div> }, AnimatePresence: ({ children }: any) => children }));
let stop: Mock<() => void>, dispose: Mock<() => void>, estimate: Mock<FaceDetector['estimateFaces']>;
let getUserMedia: ReturnType<typeof vi.fn>;
const originalDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
beforeEach(() => {
  vi.useFakeTimers();
  stop = vi.fn<() => void>(); dispose = vi.fn<() => void>(); estimate = vi.fn<FaceDetector['estimateFaces']>().mockResolvedValue([{}]);
  const stream = { getTracks: () => [{ stop }] };
  getUserMedia = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) } });
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4);
  vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockReturnValue(false);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.mocked(loadFaceDetector).mockReset().mockResolvedValue({ estimateFaces: estimate, dispose });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.useRealTimers();
  if (originalDevices) Object.defineProperty(navigator, 'mediaDevices', originalDevices);
  else Reflect.deleteProperty(navigator, 'mediaDevices');
});
async function start(onEvent = vi.fn()) {
  const view = render(<ProctoringMonitor sessionId="exam" onEvent={onEvent} />);
  await act(async () => {});
  return { ...view, onEvent };
}
it('uses model predictions, never random face warnings', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const { onEvent } = await start();
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(estimate).toHaveBeenCalled();
  expect(onEvent).not.toHaveBeenCalled();
  expect(screen.getByText('Face detection active')).toBeTruthy();
});
it('debounces missing faces and resets after a face returns', async () => {
  estimate.mockResolvedValue([]);
  const { onEvent } = await start();
  await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
  expect(onEvent).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(onEvent).toHaveBeenCalledWith('NO_FACE', 'HIGH', { consecutiveFrames: 5 });
  estimate.mockResolvedValue([{}]);
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  estimate.mockResolvedValue([]);
  await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
  expect(onEvent).toHaveBeenCalledTimes(1);
});
it('requires sustained multiple-face predictions and throttles repeated warnings', async () => {
  estimate.mockResolvedValue([{}, {}]);
  const { onEvent } = await start();
  expect(onEvent).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(onEvent).toHaveBeenCalledTimes(1);
  expect(onEvent).toHaveBeenCalledWith('MULTIPLE_FACES', 'HIGH', { faceCount: 2 });
});
it('does not mislabel model loading or inference errors as face violations', async () => {
  vi.mocked(loadFaceDetector).mockRejectedValue(new Error('Model unavailable'));
  const { onEvent } = await start();
  expect(onEvent).not.toHaveBeenCalled();
  expect(screen.getByRole('status').textContent).toContain('Face detection unavailable');
});
it('does not accumulate missing-face checks on failed inference', async () => {
  estimate.mockRejectedValue(new Error('WebGL unavailable'));
  const { onEvent } = await start();
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(onEvent).not.toHaveBeenCalled();
  expect(screen.getByRole('status').textContent).toContain('unavailable');
});
it('does not infer or invent missing faces when the video is paused', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockReturnValue(true);
  estimate.mockResolvedValue([]);
  const { onEvent } = await start();
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(estimate).not.toHaveBeenCalled();
  expect(onEvent).not.toHaveBeenCalled();
});
it('records camera access failure as a technical event, not a missing-face violation', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  getUserMedia.mockRejectedValue(new Error('Permission denied'));
  const { onEvent } = await start();
  expect(onEvent).toHaveBeenCalledWith('CAMERA_UNAVAILABLE', 'LOW', expect.objectContaining({ reason: 'CAMERA_UNAVAILABLE' }));
  expect(onEvent.mock.calls.some(([type]) => type === 'NO_FACE')).toBe(false);
});
it('stops a camera stream that arrives after exit', async () => {
  let finish!: (value: any) => void;
  getUserMedia.mockResolvedValueOnce({ getTracks: () => [{ stop: vi.fn() }] })
    .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { unmount } = await start();
  unmount();
  await act(async () => { finish({ getTracks: () => [{ stop }] }); });
  expect(stop).toHaveBeenCalledOnce();
  expect(loadFaceDetector).not.toHaveBeenCalled();
});
it('cleans up tracks, model and scheduled inference on exit', async () => {
  const { unmount } = await start();
  const count = estimate.mock.calls.length;
  unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(stop).toHaveBeenCalled();
  expect(dispose).toHaveBeenCalledOnce();
  expect(estimate).toHaveBeenCalledTimes(count);
});
it('disposes a model that finishes loading after the candidate exits', async () => {
  let finish!: (value: any) => void;
  vi.mocked(loadFaceDetector).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { unmount } = await start();
  unmount();
  await act(async () => { finish({ estimateFaces: estimate, dispose }); });
  expect(dispose).toHaveBeenCalledOnce();
  expect(estimate).not.toHaveBeenCalled();
});
it('waits for an in-flight inference before disposing and never logs after exit', async () => {
  let finish!: (value: unknown[]) => void;
  estimate.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { unmount, onEvent } = await start();
  unmount();
  expect(dispose).not.toHaveBeenCalled();
  await act(async () => { finish([]); });
  expect(dispose).toHaveBeenCalledOnce();
  expect(onEvent).not.toHaveBeenCalled();
});
