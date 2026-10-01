import { expect, it, vi } from 'vitest';
import { createDatabaseProbe } from '../src/lib/database/availability.js';

it('recovers after failed startup and reports later outages', async () => {
  const query = vi.fn().mockRejectedValueOnce(new Error('pool full'))
    .mockResolvedValueOnce(1).mockRejectedValueOnce(new Error('offline'));
  const update = vi.fn();
  const probe = createDatabaseProbe(query, update);
  expect(await probe()).toBe(false);
  expect(await probe()).toBe(true);
  expect(await probe()).toBe(false);
  expect(update.mock.calls).toEqual([[false], [true], [false]]);
});

it('shares one database query between concurrent health requests', async () => {
  let finish!: (value: number) => void;
  const query = vi.fn(() => new Promise<number>(resolve => { finish = resolve; }));
  const update = vi.fn();
  const probe = createDatabaseProbe(query, update);
  const first = probe();
  const second = probe();
  await Promise.resolve();
  expect(query).toHaveBeenCalledTimes(1);
  finish(1);
  expect(await first).toBe(true);
  expect(await second).toBe(true);
  expect(update).toHaveBeenCalledTimes(1);
});
