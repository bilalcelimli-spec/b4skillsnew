import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Onboarding } from '../src/screens/Onboarding';
import { Button } from '../src/components/ui';
import { selectLanguage } from '../src/i18n/store';
jest.mock('../src/components/Icon', () => ({ Icon: () => null }));
jest.mock('../src/components/LogoHalo', () => ({ LogoHalo: () => null }));
jest.mock('../src/native', () => ({ B4Native: { setPrefAsync: jest.fn(async () => {}) } }));
it('keeps onboarding body out of transformed AppKit layers across language changes', async () => {
  const os = Platform.OS; Object.defineProperty(Platform, 'OS', { configurable: true, value: 'macos' });
  let tree!: ReactTestRenderer;
  try {
    await act(async () => { await selectLanguage('ar'); tree = create(<Onboarding store={{ restoring: false, setError: jest.fn() } as any} introSeen={false} onIntroSeen={() => {}} onHelp={() => {}} />); });
    const next = tree.root.findAllByType(Button).find(node => node.props.label === 'متابعة')!;
    await act(async () => next.props.onPress());
    const animatedBody = () => tree.root.findAllByType(View).find(node => StyleSheet.flatten(node.props.style)?.gap !== undefined)!;
    expect(StyleSheet.flatten(animatedBody().props.style).transform).toBeUndefined();
    await act(async () => { await selectLanguage('en'); });
    expect(StyleSheet.flatten(animatedBody().props.style).transform).toBeUndefined();
  } finally {
    await act(async () => { tree?.unmount(); await selectLanguage('tr'); });
    Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
  }
});

it('keeps the Mac scroll viewport LTR while changing document direction with the UI language', async () => {
  const { ScrollView } = require('../src/i18n/ScrollView');
  const { ScrollView: NativeScrollView } = require('react-native');
  const os = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'macos' });
  let tree!: ReactTestRenderer;
  try {
    await act(async () => { await selectLanguage('ar'); tree = create(<ScrollView><></></ScrollView>); });
    const viewport = () => tree.root.findByType(NativeScrollView);
    expect(StyleSheet.flatten(viewport().props.style).direction).toBe('ltr');
    expect(StyleSheet.flatten(viewport().props.contentContainerStyle).direction).toBe('rtl');
    await act(async () => { await selectLanguage('en'); });
    expect(StyleSheet.flatten(viewport().props.contentContainerStyle).direction).toBe('ltr');
  } finally {
    await act(async () => { tree?.unmount(); await selectLanguage('tr'); });
    Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
  }
});
