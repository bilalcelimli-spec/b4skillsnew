import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { B4Native } from '../src/native';
import { useProctoringEvents } from '../src/proctoring/useProctoringEvents';
import type { Backend } from '../src/api';
import type { ExamAdmission } from '../src/proctoring/protocol';
jest.mock('react-native', () => ({ Platform: { OS: 'macos' }, AppState: {
  currentState: 'active', addEventListener: jest.fn((_name: string, handler: (state: string) => void) => { mockHandlers.add(handler); return { remove: () => mockHandlers.delete(handler) }; }),
} }));
jest.mock('../src/native', () => {
  const storage = new Map<string, string>(); let id = 0;
  return {
    B4Native: { secureRead: jest.fn(async (key: string) => storage.get(key) ?? null), secureWrite: jest.fn(async (key: string, value: string) => { storage.set(key, value); }), newRequestId: jest.fn(async () => `716e724c-f93e-4684-a1a2-${String(id++).padStart(12, '0')}`), setExamProtection: jest.fn() },
    nativeEvents: { addListener: jest.fn((name: string, handler: (body: { kind: string }) => void) => { mockCapture.set(name, handler); return { remove: () => mockCapture.delete(name) }; }) },
  };
});
const mockCapture = new Map<string, (body: { kind: string }) => void>();
const mockHandlers = new Set<(state: string) => void>();
let tree: ReactTestRenderer, hook: ReturnType<typeof useProctoringEvents>, send: jest.Mock, account = 0;
const admission: ExamAdmission = {
  policy: { version: 1, mode: 'standard', revision: 'a'.repeat(64), enforcePreflight: true, disclosure: 'Technical lifecycle events', required: { microphone: true, lifecycleEvents: true, durableEvents: true, cameraEvidence: false, assessmentMode: false } },
  capabilities: { version: 1, platform: 'macos', microphone: true, lifecycleEvents: true, durableEvents: true, cameraEvidence: false, assessmentMode: false }, acknowledgedAt: '2026-10-24T09:00:00.000Z',
};
async function mount(policy: ExamAdmission | null, active = true) {
  const backend = { baseUrl: 'https://example.test', sendEvent: send } as unknown as Backend;
  const uid = `lifecycle-test-${account++}`;
  function Probe() { hook = useProctoringEvents(backend, uid, 's1', policy, active); return null; }
  await act(async () => { tree = create(<Probe />); });
}
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); send = jest.fn(async () => {}); });
afterEach(async () => { await act(async () => tree?.unmount()); mockHandlers.clear(); jest.useRealTimers(); });
it('records lifecycle events in every exam, even without a tenant policy (web parity)', async () => {
  await mount(null);
  await act(async () => { for (const handler of mockHandlers) handler('background'); jest.advanceTimersByTime(5000); });
  expect(send.mock.calls.map(call => call[0].eventType)).toEqual(['OTHER', 'TAB_BLUR']);
});
it('collects nothing outside an active exam', async () => {
  await mount(null, false);
  await act(async () => { for (const handler of mockHandlers) handler('background'); jest.advanceTimersByTime(5000); });
  expect(send).not.toHaveBeenCalled();
});
it('records focus changes as INFO with platform and no answer contents', async () => {
  await mount(admission);
  await act(async () => { for (const handler of mockHandlers) { handler('background'); handler('active'); } });
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(send.mock.calls.map(call => call[0].eventType)).toEqual(['OTHER', 'TAB_BLUR', 'TAB_FOCUS']);
  expect(send.mock.calls[1][0]).toMatchObject({ sessionId: 's1', platform: 'macos', severity: 'INFO', metadata: { reason: 'native-lifecycle-background' } });
  expect(hook.storageError).toBeNull();
});
it('surfaces local write failure and records a recovery marker before clearing it', async () => {
  (B4Native.secureWrite as jest.Mock).mockRejectedValueOnce(new Error('Keychain locked'));
  await mount(admission);
  expect(hook.storageError).toBe('Keychain locked'); expect(send).not.toHaveBeenCalled();
  await act(async () => { await hook.retry(); });
  expect(hook.storageError).toBeNull();
  expect(send.mock.calls[0][0].metadata.reason).toBe('native-monitoring-recovery-check');
});
it('protects the exam screen and records screen capture as an observation', async () => {
  await mount(null);
  expect(B4Native.setExamProtection).toHaveBeenLastCalledWith(true);
  await act(async () => {
    mockCapture.get('B4ScreenCapture')!({ kind: 'capture-started' });
    mockCapture.get('B4ScreenCapture')!({ kind: 'screenshot' });
    mockCapture.get('B4ScreenCapture')!({ kind: 'unknown-kind' });
    jest.advanceTimersByTime(5000);
  });
  const reasons = send.mock.calls.map(call => call[0].metadata.reason);
  expect(reasons).toEqual(['native-monitoring-attached', 'native-screen-capture-started', 'native-screen-screenshot']);
  expect(send.mock.calls[1][0]).toMatchObject({ eventType: 'OTHER', severity: 'INFO' });
  await act(async () => tree.unmount());
  expect(B4Native.setExamProtection).toHaveBeenLastCalledWith(false);
  expect(mockCapture.has('B4ScreenCapture')).toBe(false);
});
it('leaves the screen unprotected outside an exam', async () => {
  await mount(null, false);
  expect(B4Native.setExamProtection).not.toHaveBeenCalled();
});
