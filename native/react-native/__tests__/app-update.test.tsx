// Minimum supported build: block only on an explicit, higher minimum; never on errors.
import React from 'react';
import { act, create } from 'react-test-renderer';
import { updateRequired, APP_BUILD } from '../src/appUpdate';
import { useUpdateGate } from '../src/useUpdateGate';

const config = (minimumBuild: Record<string, unknown>) => ({ version: 1, minimumBuild });

it('requires an update only below an explicit minimum for this platform', () => {
  expect(updateRequired(config({ ipad: 9, macos: 0, android: 0 }), 'ipad', 8)).toBe(true);
  expect(updateRequired(config({ ipad: 8, macos: 0, android: 0 }), 'ipad', 8)).toBe(false);
  expect(updateRequired(config({ ipad: 0, macos: 12, android: 0 }), 'ipad', 8)).toBe(false);
  expect(updateRequired(config({ android: 2 }), 'android', 1)).toBe(true);
});

it('fails open on anything unexpected', () => {
  for (const bad of [null, undefined, 'x', {}, { version: 2, minimumBuild: { ipad: 99 } }, config({ ipad: '99' }), config({ ipad: 9.5 })]) {
    expect(updateRequired(bad, 'ipad', 8)).toBe(false);
  }
});

it('reads the build number shipped with this release', () => {
  expect(Number.isInteger(APP_BUILD) && APP_BUILD > 0).toBe(true);
});

describe('useUpdateGate', () => {
  let state: ReturnType<typeof useUpdateGate>;
  function Probe() { state = useUpdateGate('https://b4skills.com'); return null; }
  const respond = (body: unknown) => jest.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify(body) }));

  it('asks the public endpoint and blocks a build below the minimum', async () => {
    globalThis.fetch = respond(config({ ipad: APP_BUILD + 1, macos: APP_BUILD + 1, android: APP_BUILD + 1 })) as any;
    let tree: ReturnType<typeof create> | undefined;
    await act(async () => { tree = create(<Probe />); });
    expect(state.required).toBe(true);
    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://b4skills.com/api/native/app-config');
    expect(init.method).toBe('GET');
    await act(async () => tree!.unmount());
  });

  it('lets the candidate through when the server cannot be reached', async () => {
    globalThis.fetch = jest.fn(async () => { throw new TypeError('Network request failed'); }) as any;
    let tree: ReturnType<typeof create> | undefined;
    await act(async () => { tree = create(<Probe />); });
    expect(state.required).toBe(false);
    expect(state.checking).toBe(false);
    await act(async () => tree!.unmount());
  });
});
