import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { ApiError, Backend } from '../src/api';
import { B4Native } from '../src/native';
import { useAssessment } from '../src/useAssessment';

let mockIds = 0;
jest.mock('../src/native', () => {
  const prefs = new Map<string, string>();
  return { B4Native: {
    getPref: jest.fn(async (key: string) => prefs.get(key) ?? null),
    setPref: jest.fn((key: string, value: string) => prefs.set(key, value)),
    setPrefAsync: jest.fn(async (key: string, value: string) => { prefs.set(key, value); }),
    requestMicrophone: jest.fn(async () => true), secureRead: jest.fn(async () => null), secureWrite: jest.fn(async () => {}),
    // Unique ids: launch receipts and (always-on) monitoring events both draw from here.
    newRequestId: jest.fn(async () => `716e724c-f93e-4684-a1a2-${String(mockIds++).padStart(12, '0')}`),
    cancelRecording: jest.fn(), stopPlayback: jest.fn(), clearCookies: jest.fn(async () => {}),
  }, prefs };
});
jest.mock('../src/api', () => ({ ...jest.requireActual('../src/api'), Backend: jest.fn() }));

const candidate = { uid: 'u1', email: 'u@example.test', organizationId: 'o1' };
const item = { id: 'q1', skill: 'WRITING', type: 'WRITING_PROMPT', metadata: { prompt: 'Write about your day.' } };
let api: any;
let store: ReturnType<typeof useAssessment>;
let tree: ReactTestRenderer | undefined;
function Probe() { store = useAssessment(); return null; }
async function mount() {
  await act(async () => { tree = create(<Probe />); });
  if (store.phase === 'ready') {
    await act(async () => { await store.prepareExam(); });
    act(() => store.setPolicyAccepted(true));
  }
}
async function run(action: () => Promise<unknown>) { await act(async () => { await action(); }); }

beforeEach(() => {
  jest.clearAllMocks();
  require('../src/native').prefs.clear();
  api = {
    baseUrl: 'http://localhost:3001', me: jest.fn(async () => candidate),
    examPolicy: jest.fn(async () => ({ version: 1, revision: 'a'.repeat(64), mode: 'standard', enforcePreflight: false, disclosure: 'Exam conditions', required: { microphone: true, lifecycleEvents: false, durableEvents: false, cameraEvidence: false, assessmentMode: false } })),
    sendEvent: jest.fn(async () => {}),
    launch: jest.fn(async () => ({ sessionId: 's1' })),
    next: jest.fn(async () => ({ stop: false, item })),
    status: jest.fn(async () => ({ status: 'IN_PROGRESS', progress: 0, maxItems: 53, answeredItemIds: [] })),
    respond: jest.fn(async () => { throw new ApiError('Network failed'); }),
  };
  (Backend as jest.Mock).mockImplementation(() => api);
});
afterEach(async () => { if (tree) await act(async () => { tree!.unmount(); tree = undefined; }); });

it('returns to the outstanding question without automatically replaying a lost answer', async () => {
  await mount(); await run(() => store.launch());
  await run(() => store.submit({ kind: 'text', text: 'My draft' }));
  expect(store.phase).toBe('uncertain');
  await run(() => store.reconcile());
  expect(store.phase).toBe('item'); expect(store.item?.id).toBe('q1');
  expect(api.respond).toHaveBeenCalledTimes(1);
  await run(() => store.submit({ kind: 'text', text: 'My draft' }));
  expect(api.respond).toHaveBeenCalledTimes(2);
});

it.each(['COMPLETED', 'EXPIRED', 'ABORTED'])('opens terminal %s results even if the late answer was rejected', async status => {
  await mount(); await run(() => store.launch());
  await run(() => store.submit({ kind: 'text', text: 'Late draft' }));
  api.status.mockResolvedValue({ status, progress: 0, maxItems: 53, answeredItemIds: [] });
  await run(() => store.reconcile());
  expect(store.phase).toBe('finished'); expect(store.item).toBeNull();
  expect(api.next).toHaveBeenCalledTimes(1); expect(api.respond).toHaveBeenCalledTimes(1);
});

it('advances when the lost response was already committed', async () => {
  await mount(); await run(() => store.launch());
  await run(() => store.submit({ kind: 'text', text: 'Saved draft' }));
  api.status.mockResolvedValue({ status: 'IN_PROGRESS', progress: 1, maxItems: 53, answeredItemIds: ['q1'] });
  api.next.mockResolvedValue({ stop: false, item: { ...item, id: 'q2' } });
  await run(() => store.reconcile());
  expect(store.phase).toBe('item'); expect(store.item?.id).toBe('q2');
  expect(store.answered).toBe(1); expect(api.respond).toHaveBeenCalledTimes(1);
});

it('keeps recovery available when checking the current question fails', async () => {
  await mount(); await run(() => store.launch());
  await run(() => store.submit({ kind: 'text', text: 'Draft' }));
  api.next.mockRejectedValueOnce(new ApiError('Still offline'));
  await run(() => store.reconcile()); expect(store.phase).toBe('uncertain');
  await run(() => store.reconcile()); expect(store.phase).toBe('item');
});

it('persists a launch receipt before sending and reuses it after a lost response', async () => {
  await mount();
  api.launch.mockRejectedValueOnce(new ApiError('Response lost'));
  await run(() => store.launch());
  expect(store.phase).toBe('launchPending');
  expect((B4Native.setPrefAsync as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(api.launch.mock.invocationCallOrder[0]);
  const first = api.launch.mock.calls[0];
  await run(() => store.launch());
  expect(api.launch.mock.calls[1]).toEqual(first);
  expect(new Set(api.launch.mock.calls.map((call: unknown[]) => call[2])).size).toBe(1); // one launch receipt, reused
  expect(store.sessionId).toBe('s1'); expect(store.phase).toBe('item');
});

it('restores an unresolved launch after app restart without generating another receipt', async () => {
  await mount(); api.launch.mockRejectedValueOnce(new ApiError('Response lost'));
  await run(() => store.launch());
  const first = api.launch.mock.calls[0];
  await act(async () => { tree!.unmount(); });
  await mount(); expect(store.phase).toBe('launchPending');
  await run(() => store.launch()); expect(api.launch.mock.calls[1]).toEqual(first);
  expect(new Set(api.launch.mock.calls.map((call: unknown[]) => call[2])).size).toBe(1); // no second receipt after restart
});

it('does not send a launch when its receipt cannot be saved', async () => {
  await mount();
  (B4Native.setPrefAsync as jest.Mock).mockRejectedValueOnce(new Error('Storage unavailable'));
  await run(() => store.launch());
  expect(api.launch).not.toHaveBeenCalled(); expect(store.error).toBe('Storage unavailable');
});

it('does not launch until the current policy was checked and acknowledged', async () => {
  await mount(); act(() => store.setPolicyAccepted(false));
  await run(() => store.launch()); expect(api.launch).not.toHaveBeenCalled();
  act(() => store.setPolicyAccepted(true)); await run(() => store.launch());
  expect(api.launch.mock.calls[0][3]).toMatchObject({ policyRevision: 'a'.repeat(64), accepted: true, capabilities: { platform: 'ipad', cameraEvidence: false, assessmentMode: false } });
});
it('blocks unsupported camera policy and permits a fresh check after a policy gate rejection', async () => {
  await mount();
  api.examPolicy.mockResolvedValueOnce({ ...(await api.examPolicy()), mode: 'monitored', required: { microphone: true, lifecycleEvents: true, durableEvents: true, cameraEvidence: true, assessmentMode: false } });
  await run(() => store.prepareExam()); act(() => store.setPolicyAccepted(true));
  expect(store.capabilityProblems).toContain('Kamera kanıtı');
  await run(() => store.launch()); expect(api.launch).not.toHaveBeenCalled();
  await run(() => store.prepareExam()); act(() => store.setPolicyAccepted(true));
  api.launch.mockRejectedValueOnce(new ApiError('Policy changed', 409, 'EXAM_POLICY_CHANGED'));
  await run(() => store.launch()); expect(store.phase).toBe('ready'); expect(store.canLaunch).toBe(false);
  await run(() => store.prepareExam()); act(() => store.setPolicyAccepted(true));
  await run(() => store.launch()); expect(store.phase).toBe('item');
  expect(new Set(api.launch.mock.calls.map((call: unknown[]) => call[2])).size).toBe(2); // a fresh receipt after the policy gate
});
it('does not switch the monitored session when resuming another candidate is denied', async () => {
  await mount(); await run(() => store.launch());
  api.status.mockRejectedValueOnce(new ApiError('Forbidden', 403));
  await run(() => store.resume('foreign-session'));
  expect(store.sessionId).toBe('s1'); expect(store.phase).toBe('item');
});
it('rejects malformed policy before rendering it or requesting a device permission', async () => {
  await mount(); const before = (B4Native.requestMicrophone as jest.Mock).mock.calls.length;
  api.examPolicy.mockResolvedValueOnce({ version: 1, revision: 'a'.repeat(64), mode: 'standard' });
  await run(() => store.prepareExam());
  expect(store.policy).toBeNull(); expect(store.canLaunch).toBe(false);
  expect(store.error).toMatch(/doğrulanamadı/);
  expect(B4Native.requestMicrophone).toHaveBeenCalledTimes(before);
});
