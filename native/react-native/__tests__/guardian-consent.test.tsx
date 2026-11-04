import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { GuardianConsentGate } from '../src/components/GuardianConsent';
import { Backend } from '../src/api';
import { Button, Field } from '../src/components/ui';
jest.mock('../src/native', () => ({ B4Native: {} }));
const pending = { allowed: false, ageBand: null, guardianRequired: false, status: 'AGE_REQUIRED', policyVersion: 'v1' };
function setup() {
  const backend = { consentStatus: jest.fn().mockResolvedValue(pending), declareAge: jest.fn().mockResolvedValue({}), requestGuardian: jest.fn().mockResolvedValue({ sent: true }) };
  return { backend, typed: backend as unknown as Backend };
}
const content = (tree: ReactTestRenderer) => tree.root.findAllByType(Text).some(node => node.props.children === 'Assessment content');
it('does not mount the assessment before consent is loaded, and fails closed on server errors', async () => {
  const { backend, typed } = setup(); backend.consentStatus.mockRejectedValue(new Error('offline'));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<GuardianConsentGate backend={typed}><Text>Assessment content</Text></GuardianConsentGate>); });
  expect(content(tree)).toBe(false);
  expect(tree.root.findAllByType(Button).some(node => node.props.label === 'Durumu yenile')).toBe(true);
  await act(async () => { tree.unmount(); });
});
it('allows adults only after server acknowledgement of the age declaration', async () => {
  const { backend, typed } = setup(); let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<GuardianConsentGate backend={typed}><Text>Assessment content</Text></GuardianConsentGate>); });
  expect(content(tree)).toBe(false);
  backend.consentStatus.mockResolvedValue({ ...pending, allowed: true, ageBand: 'ADULT' as any, status: 'READY' });
  await act(async () => { await tree.root.findAllByType(Button).find(node => node.props.label === '18 yaş ve üzeri')!.props.onPress(); });
  expect(backend.declareAge).toHaveBeenCalledWith('ADULT'); expect(content(tree)).toBe(true);
  await act(async () => { tree.unmount(); });
});
it('requests guardian email and remains blocked until school verification is complete', async () => {
  const { backend, typed } = setup(); backend.consentStatus.mockResolvedValue({ ...pending, ageBand: 'UNDER_13' as any, guardianRequired: true, status: 'GUARDIAN_REQUIRED' });
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<GuardianConsentGate backend={typed}><Text>Assessment content</Text></GuardianConsentGate>); });
  await act(async () => { tree.root.findByType(Field).props.onChangeText('guardian@example.invalid'); });
  backend.consentStatus.mockResolvedValue({ ...pending, ageBand: 'UNDER_13' as any, guardianRequired: true, status: 'SCHOOL_VERIFICATION_REQUIRED' });
  await act(async () => { await tree.root.findAllByType(Button).find(node => node.props.label === 'Veliye onay bağlantısı gönder')!.props.onPress(); });
  expect(backend.requestGuardian).toHaveBeenCalledWith('guardian@example.invalid'); expect(content(tree)).toBe(false);
  backend.consentStatus.mockResolvedValue({ ...pending, allowed: true, ageBand: 'UNDER_13' as any, guardianRequired: true, status: 'READY' });
  await act(async () => { await tree.root.findAllByType(Button).find(node => node.props.label === 'Durumu yenile')!.props.onPress(); });
  expect(content(tree)).toBe(true); await act(async () => { tree.unmount(); });
});
