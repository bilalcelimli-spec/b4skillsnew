import React from 'react';
import { TextInput } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import App from '../App';
import { Backend } from '../src/api';
import { B4Native } from '../src/native';
import { Button } from '../src/components/ui';

jest.mock('../src/components/Icon', () => ({ Icon: () => null }));
jest.mock('../src/components/LogoHalo', () => ({ LogoHalo: () => null }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../src/native', () => ({ B4Native: {
  getPref: jest.fn(async (key: string) => key === 'ui-language' ? 'tr' : null), setPref: jest.fn(), setPrefAsync: jest.fn(async () => {}),
  requestMicrophone: jest.fn(async () => true), photoRead: jest.fn().mockResolvedValue(null), photoWrite: jest.fn().mockResolvedValue(undefined), secureRead: jest.fn(async () => null), secureWrite: jest.fn(async () => {}),
    newRequestId: jest.fn(async () => '716e724c-f93e-4684-a1a2-b611bc67d823'),
  cancelRecording: jest.fn(), stopPlayback: jest.fn(), setExamProtection: jest.fn(),
  startRecording: jest.fn(async () => {}), recordingLevel: jest.fn(async () => ({ level: 0, seconds: 1 })),
  stopRecording: jest.fn(async () => ({ base64: 'RECORDED_CLIP', bytes: 500, durationMs: 1000 })),
}, nativeEvents: { addListener: jest.fn(() => ({ remove: jest.fn() })) } }));
jest.mock('../src/api', () => ({ ...jest.requireActual('../src/api'), Backend: jest.fn() }));
jest.setTimeout(30000);
let api: any, tree: ReactTestRenderer;
const press = async (label: string) => {
  await act(async () => {
    const button = tree.root.findAllByType(Button).find(node => node.props.label === label);
    if (!button) throw new Error(`Missing button: ${label}`);
    await button.props.onPress();
  });
};
beforeEach(() => {
  jest.clearAllMocks();
  api = {
    baseUrl: 'http://localhost:3001', me: jest.fn(async () => ({ uid: 'u1', email: 'u@example.test', organizationId: 'o1' })),
    examPolicy: jest.fn(async () => ({ version: 1, revision: 'a'.repeat(64), mode: 'standard', enforcePreflight: false, disclosure: 'Exam conditions', required: { microphone: true, lifecycleEvents: false, durableEvents: false, cameraEvidence: false, assessmentMode: false } })),
    sendEvent: jest.fn(async () => {}),
    cameraPolicy: jest.fn(async () => ({ enabled: false, retentionDays: 7 })),
    launch: jest.fn(async () => ({ sessionId: 's1' })), next: jest.fn(), mediaUrl: jest.fn(() => null),
    status: jest.fn(async () => ({ status: 'IN_PROGRESS', progress: 0, maxItems: 53, answeredItemIds: [] })),
    respond: jest.fn(async () => { throw new Error('Connection lost'); }),
  };
  (Backend as jest.Mock).mockImplementation(() => api);
});
afterEach(async () => { await act(async () => tree?.unmount()); });

it('keeps the writing editor mounted and preserves its text across failed submission and reconciliation', async () => {
  api.next.mockResolvedValue({ stop: false, item: { id: 'w1', skill: 'WRITING', type: 'WRITING_PROMPT', metadata: { prompt: 'Write' } } });
  await act(async () => { tree = create(<App />); });
  await press('Sınav koşullarını ve cihazı kontrol et');
  act(() => tree.root.findAll(n => n.props.accessibilityRole === 'checkbox' && typeof n.props.onPress === 'function')[0].props.onPress());
  await press('Değerlendirmeye başla');
  act(() => { tree.root.findByType(TextInput).props.onChangeText('This is my original draft.'); });
  await press('Yanıtı gönder');
  expect(tree.root.findByType(TextInput).props.value).toBe('This is my original draft.');
  await press('Kaydımı kontrol et');
  expect(tree.root.findByType(TextInput).props.value).toBe('This is my original draft.');
  expect(api.respond).toHaveBeenCalledTimes(1);
});

it('retains the speaking clip until a confirmed answer or an explicit discard', async () => {
  api.next.mockResolvedValue({ stop: false, item: { id: 's1', skill: 'SPEAKING', type: 'SPEAKING_PROMPT', metadata: { prompt: 'Speak' } } });
  await act(async () => { tree = create(<App />); });
  await press('Sınav koşullarını ve cihazı kontrol et');
  act(() => tree.root.findAll(n => n.props.accessibilityRole === 'checkbox' && typeof n.props.onPress === 'function')[0].props.onPress());
  await press('Değerlendirmeye başla'); await press('Kayda başla'); await press('Kaydı bitir');
  const clears = (B4Native.cancelRecording as jest.Mock).mock.calls.length;
  await press('Yanıtı gönder'); await press('Kaydımı kontrol et');
  expect(B4Native.cancelRecording).toHaveBeenCalledTimes(clears);
  const send = tree.root.findAllByType(Button).find(node => node.props.label === 'Yanıtı gönder')!;
  expect(send.props.disabled).toBe(false);
  await press('Yanıtı gönder');
  expect(api.respond).toHaveBeenCalledTimes(2);
  expect(api.respond.mock.calls[1][2]).toEqual({ kind: 'audio', base64: 'RECORDED_CLIP' });
});
