import React from 'react';
import { BackHandler, Keyboard, Platform, Text as NativeText } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Onboarding } from '../src/screens/Onboarding';
import { Button, Sheet } from '../src/components/ui';
import { useAndroidKeyboardHeight } from '../src/androidSystem';
jest.mock('../src/components/Icon', () => ({ Icon: () => null }));
jest.mock('../src/components/LogoHalo', () => ({ LogoHalo: () => null }));
jest.mock('../src/native', () => ({ B4Native: { setPrefAsync: jest.fn(async () => {}) } }));

// BackHandler semantics: newest listener first, stop at the first one that returns true.
let listeners: Array<() => boolean> = [];
const pressBack = () => {
  for (const listener of [...listeners].reverse()) if (listener()) return true;
  return false; // Android would leave the app
};
const os = Platform.OS;
const setOS = (value: string) => Object.defineProperty(Platform, 'OS', { configurable: true, value });
beforeEach(() => {
  listeners = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_event: string, listener: () => boolean) => {
    listeners.push(listener);
    return { remove: () => { listeners = listeners.filter(l => l !== listener); } };
  }) as any);
  setOS('android');
});
afterEach(() => { jest.restoreAllMocks(); setOS(os); });

const texts = (tree: ReactTestRenderer) => tree.root.findAllByType(NativeText).map(n => [n.props.children].flat().join(''));
const press = async (tree: ReactTestRenderer, label: string) => {
  const button = tree.root.findAllByType(Button).find(node => node.props.label === label)!;
  await act(async () => button.props.onPress());
};

it('walks back through the introduction and leaves the app only from the logo page', async () => {
  const store = { restoring: false, setError: jest.fn() } as any;
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<Onboarding store={store} introSeen={false} onIntroSeen={() => {}} onHelp={() => {}} />); });
  await press(tree, 'Devam et'); // logo → intro 1
  await press(tree, 'Devam et'); // intro 1 → intro 2
  expect(tree.root.findAllByType(Button).some(b => b.props.label === 'Geri')).toBe(true);
  await act(async () => { expect(pressBack()).toBe(true); }); // intro 2 → intro 1
  expect(tree.root.findAllByType(Button).some(b => b.props.label === 'Geri')).toBe(false);
  await act(async () => { expect(pressBack()).toBe(true); }); // intro 1 → logo
  expect(tree.root.findAllByType(Button).filter(b => b.props.label === 'Devam et')).toHaveLength(1);
  expect(pressBack()).toBe(false); // logo → leave the app
  await act(async () => tree.unmount());
});

it('goes from a sign-in form back to the choices, then to the logo page', async () => {
  const store = { restoring: false, setError: jest.fn() } as any;
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<Onboarding store={store} introSeen onIntroSeen={() => {}} onHelp={() => {}} />); });
  await press(tree, 'Devam et'); // introduction seen: straight to the sign-in screen
  // The innermost pressable that contains the "E-posta ile giriş yap" choice.
  const emailChoice = tree.root.findAll(node => typeof node.props.onPress === 'function'
    && node.findAllByType(NativeText).some(t => [t.props.children].flat().join('') === 'E-posta ile giriş yap')).pop()!;
  await act(async () => emailChoice.props.onPress());
  expect(texts(tree)).toContain('E-posta ile giriş yapın.');
  await act(async () => { expect(pressBack()).toBe(true); });
  expect(texts(tree)).not.toContain('E-posta ile giriş yapın.');
  expect(texts(tree)).toContain('Sınav kodum var');
  expect(store.setError).toHaveBeenCalledWith(null);
  await act(async () => { expect(pressBack()).toBe(true); });
  expect(texts(tree)).not.toContain('Sınav kodum var');
  expect(pressBack()).toBe(false);
  await act(async () => tree.unmount());
});

it('closes an open sheet before the screen beneath handles back', async () => {
  const onClose = jest.fn();
  const screen = jest.fn(() => true);
  BackHandler.addEventListener('hardwareBackPress', screen);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<Sheet visible onClose={onClose} title="Yardım"><></></Sheet>); });
  expect(pressBack()).toBe(true);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen).not.toHaveBeenCalled();
  await act(async () => tree.update(<Sheet visible={false} onClose={onClose} title="Yardım"><></></Sheet>));
  expect(pressBack()).toBe(true);
  expect(screen).toHaveBeenCalledTimes(1);
  await act(async () => tree.unmount());
});

it('registers nothing on iPad and Mac', async () => {
  for (const platform of ['ios', 'macos']) {
    setOS(platform);
    let tree!: ReactTestRenderer;
    await act(async () => { tree = create(<Sheet visible onClose={() => {}} title="Yardım"><></></Sheet>); });
    expect(listeners).toHaveLength(0);
    await act(async () => tree.unmount());
  }
});

it('reports the Android keyboard height and resets it when the keyboard hides', async () => {
  const handlers: Record<string, (e?: any) => void> = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: (e?: any) => void) => {
    handlers[event] = handler;
    return { remove: () => { delete handlers[event]; } };
  }) as any);
  let height = -1;
  const Probe = () => { height = useAndroidKeyboardHeight(); return null; };
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<Probe />); });
  expect(height).toBe(0);
  await act(async () => handlers.keyboardDidShow({ endCoordinates: { height: 320 } }));
  expect(height).toBe(320);
  await act(async () => handlers.keyboardDidHide());
  expect(height).toBe(0);
  await act(async () => tree.unmount());
  expect(Object.keys(handlers)).toHaveLength(0);
});
