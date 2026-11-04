import React from 'react';
import { Linking } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { LegalLinks } from '../src/components/LegalLinks';
jest.mock('../src/native', () => ({ B4Native: {} }));

it('opens public policy and support pages without sending account or session data, and handles browser failure', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  let tree!: ReactTestRenderer;
  try {
    await act(async () => { tree = create(<LegalLinks />); });
    const links = ['Gizlilik politikası', 'Kullanım koşulları', 'Yardım ve destek'].map(label => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]);
    expect(links).toHaveLength(3);
    for (const link of links) await act(async () => { await link.props.onPress(); });
    expect(open.mock.calls.map(([url]) => url)).toEqual([
      'https://b4skills.com/privacy', 'https://b4skills.com/terms', 'https://b4skills.com/support',
    ]);
    open.mockRejectedValueOnce(new Error('browser unavailable'));
    await act(async () => { await links[0].props.onPress(); });
    expect(tree.root.findAll(node => node.props.accessibilityRole === 'alert').length).toBeGreaterThan(0);
  } finally {
    await act(async () => tree?.unmount());
    open.mockRestore();
  }
});
