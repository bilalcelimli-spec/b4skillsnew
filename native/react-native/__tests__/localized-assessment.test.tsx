import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { ItemScreen } from '../src/screens/ItemScreen';
import { Button } from '../src/components/ui';
import { Text } from '../src/i18n/Text';
import { selectLanguage, useLanguage } from '../src/i18n/store';
import { LanguagePicker } from '../src/i18n/LanguagePicker';
jest.mock('../src/components/Icon', () => ({ Icon: () => null }));
jest.mock('../src/native', () => ({ B4Native: { setPrefAsync: jest.fn(async () => {}), stopPlayback: jest.fn() } }));
const answer = 'Reading and writing remain English. علي {0}';
const item: any = { id: 'writing-1', skill: 'WRITING', type: 'WRITING_PROMPT', metadata: { prompt: 'Write about your school.' } };
function Harness({ store }: { store: any }) {
  const { rtl } = useLanguage();
  return <View testID="localized-root" style={{ direction: rtl ? 'rtl' : 'ltr' }}><LanguagePicker /><ItemScreen item={item} store={store} recorder={{ recording: false } as any} wide={false} /></View>;
}
it('changes UI language and direction without remounting the exam or changing an English answer', async () => {
  let tree!: ReactTestRenderer;
  const store = { mediaUrl: () => null, submit: jest.fn(), busy: false };
  await act(async () => { await selectLanguage('tr'); tree = create(<Harness store={store} />); });
  const editor = () => tree.root.findByType(TextInput);
  act(() => editor().props.onChangeText(answer));
  await act(async () => { await selectLanguage('ar'); });
  expect(tree.root.findByProps({ testID: 'localized-root' }).props.style.direction).toBe('rtl');
  expect(editor().props.value).toBe(answer);
  expect(StyleSheet.flatten(editor().props.style).writingDirection).toBe('ltr');
  expect(tree.root.findAllByType(Text).some(node => node.props.children === 'Write about your school.' && node.props.direction === 'ltr')).toBe(true);
  const arabicSubmit = tree.root.findAllByType(Button).find(node => node.props.label === 'إرسال الإجابة');
  expect(arabicSubmit).toBeDefined();
  await act(async () => { await selectLanguage('en'); });
  expect(editor().props.value).toBe(answer);
  const submit = tree.root.findAllByType(Button).find(node => node.props.label === 'Submit answer')!;
  act(() => submit.props.onPress()); expect(store.submit).toHaveBeenCalledWith({ kind: 'text', text: answer });
  await act(async () => { tree.unmount(); await selectLanguage('tr'); });
});
