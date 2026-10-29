// Writing aids change the measured skill, so every exam answer field must switch them off.
import React from 'react';
import { TextInput } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { AssessmentItem } from '../src/api';
import { ItemScreen } from '../src/screens/ItemScreen';
jest.mock('../src/components/Icon', () => ({ Icon: () => null }));
jest.mock('../src/native', () => ({ B4Native: { stopPlayback: jest.fn() }, nativeEvents: { addListener: jest.fn(() => ({ remove: jest.fn() })) } }));

const expected = {
  autoCorrect: false, spellCheck: false, autoComplete: 'off', importantForAutofill: 'no',
  textContentType: 'none', smartInsertDelete: false, contextMenuHidden: true,
};
const store: any = { mediaUrl: () => null, submit: jest.fn(), busy: false };

async function inputsFor(item: AssessmentItem) {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<ItemScreen item={item} store={store} recorder={{ recording: false } as any} wide={false} />); });
  const inputs = tree.root.findAllByType(TextInput).map(node => node.props);
  await act(async () => tree.unmount());
  return inputs;
}

it('turns writing aids off in the essay editor', async () => {
  const inputs = await inputsFor({ id: 'w', type: 'WRITING_PROMPT', skill: 'WRITING', metadata: { prompt: 'Describe your town.' } } as AssessmentItem);
  expect(inputs).toHaveLength(1);
  expect(inputs[0]).toMatchObject(expected);
});

it('turns writing aids off in every typed blank', async () => {
  const inputs = await inputsFor({ id: 'b', type: 'FILL_IN_BLANKS', skill: 'GRAMMAR', metadata: { prompt: 'I ___ to school and ___ home.' } } as AssessmentItem);
  expect(inputs).toHaveLength(2);
  inputs.forEach(props => expect(props).toMatchObject(expected));
});
