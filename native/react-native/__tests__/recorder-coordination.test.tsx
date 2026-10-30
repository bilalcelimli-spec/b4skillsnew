import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { B4Native } from '../src/native';
import { useRecorder } from '../src/useRecorder';
import { proctoringCoordinator } from '../src/proctoring/coordinator';
jest.mock('../src/native', () => ({ B4Native: {
  startRecording: jest.fn(async () => {}), stopRecording: jest.fn(), cancelRecording: jest.fn(), recordingLevel: jest.fn(async () => ({ level: 0, seconds: 0 })),
}, nativeEvents: { addListener: jest.fn(() => ({ remove: jest.fn() })) } }));
let recorder: ReturnType<typeof useRecorder>, tree: ReactTestRenderer;
function Probe() { recorder = useRecorder(); return null; }
beforeEach(async () => { jest.clearAllMocks(); await act(async () => { tree = create(<Probe />); }); });
afterEach(async () => { await act(async () => tree.unmount()); });
it('blocks playback while recording and releases microphone ownership when cleared', async () => {
  await act(async () => { await recorder.start(); });
  expect(() => proctoringCoordinator.acquire('playback', Symbol(), jest.fn())).toThrow(/Ses kaydı/);
  act(() => recorder.clear());
  const release = proctoringCoordinator.acquire('playback', Symbol(), jest.fn()); release();
});
it('does not resurrect a recording that was cleared while native start was pending', async () => {
  let finish!: () => void;
  (B4Native.startRecording as jest.Mock).mockImplementationOnce(() => new Promise<void>(done => { finish = done; }));
  let starting!: Promise<void>;
  act(() => { starting = recorder.start(); });
  act(() => recorder.clear());
  await act(async () => { finish(); await starting; });
  expect(recorder.recording).toBe(false); expect(B4Native.cancelRecording).toHaveBeenCalled();
  const release = proctoringCoordinator.acquire('playback', Symbol(), jest.fn()); release();
});
it('discards a late stop result after changing the item and prevents overlapping starts during stop', async () => {
  let finish!: (clip: any) => void;
  (B4Native.stopRecording as jest.Mock).mockImplementationOnce(() => new Promise(done => { finish = done; }));
  await act(async () => { await recorder.start(); });
  let stopping!: Promise<void>;
  act(() => { stopping = recorder.stop(); });
  await act(async () => { await recorder.start(); });
  expect(B4Native.startRecording).toHaveBeenCalledTimes(1);
  act(() => recorder.clear());
  await act(async () => { finish({ base64: 'OLD', bytes: 3, durationMs: 1000 }); await stopping; });
  expect(recorder.clip).toBeNull(); expect(recorder.recording).toBe(false);
});
