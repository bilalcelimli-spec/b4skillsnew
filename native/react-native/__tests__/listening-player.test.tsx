import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { B4Native } from '../src/native';
import { useListeningPlayer } from '../src/useListeningPlayer';

jest.mock('../src/native', () => {
  const listeners = new Map<string, (mockEvent?: any) => void>();
  return { B4Native: { play: jest.fn(), stopPlayback: jest.fn() },
    nativeEvents: { addListener: jest.fn((name: string, fn: (mockE?: any) => void) => {
      listeners.set(name, fn); return { remove: () => listeners.delete(name) };
    }) }, emit: (name: string, event?: any) => listeners.get(name)?.(event),
  };
});
let player: ReturnType<typeof useListeningPlayer>;
let tree: ReactTestRenderer;
function Probe() { player = useListeningPlayer('https://example.test/audio.m4a'); return null; }
const emit = (name: string, event?: any) => act(() => require('../src/native').emit(name, event));
beforeEach(async () => { jest.clearAllMocks(); await act(async () => { tree = create(<Probe />); }); });
afterEach(async () => { await act(async () => tree.unmount()); });

it('charges only when native playback actually starts and blocks duplicate loading taps', async () => {
  let start!: () => void;
  (B4Native.play as jest.Mock).mockImplementation(() => new Promise<void>(resolve => { start = resolve; }));
  let attempt!: Promise<void>;
  act(() => { attempt = player.play(); });
  expect(player.state).toBe('loading'); expect(player.left).toBe(2);
  await act(async () => { await player.play(); });
  expect(B4Native.play).toHaveBeenCalledTimes(1);
  await act(async () => { start(); await attempt; });
  expect(player.state).toBe('playing'); expect(player.left).toBe(1);
});

it('preserves both rights after any number of loading failures', async () => {
  (B4Native.play as jest.Mock).mockRejectedValue(new Error('HTTP 404'));
  for (let i = 0; i < 3; i++) await act(async () => { await player.play(); });
  expect(player.left).toBe(2); expect(player.state).toBe('idle'); expect(player.error).toBe('HTTP 404');
});

it('refunds a stream failure exactly once and allows a retry', async () => {
  (B4Native.play as jest.Mock).mockResolvedValue(undefined);
  await act(async () => { await player.play(); }); expect(player.left).toBe(1);
  emit('B4PlaybackFailed', { message: 'Connection lost' });
  emit('B4PlaybackFailed', { message: 'Duplicate event' }); expect(player.left).toBe(2);
  await act(async () => { await player.play(); }); expect(player.left).toBe(1);
});

it('does not refund manual stops or completed attempts, and enforces the limit', async () => {
  (B4Native.play as jest.Mock).mockResolvedValue(undefined);
  await act(async () => { await player.play(); }); act(() => player.stop());
  expect(player.left).toBe(1);
  await act(async () => { await player.play(); }); emit('B4PlaybackEnded');
  expect(player.left).toBe(0);
  await act(async () => { await player.play(); }); expect(B4Native.play).toHaveBeenCalledTimes(2);
});

it('ignores a late start after cancelling a loading attempt', async () => {
  let start!: () => void;
  (B4Native.play as jest.Mock).mockImplementation(() => new Promise<void>(resolve => { start = resolve; }));
  let attempt!: Promise<void>;
  act(() => { attempt = player.play(); }); act(() => player.stop());
  await act(async () => { start(); await attempt; });
  expect(player.state).toBe('idle'); expect(player.left).toBe(2);
});
