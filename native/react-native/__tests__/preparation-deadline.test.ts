import { preparationDeadline } from '../src/proctoring/deadline';
afterEach(() => jest.useRealTimers());
it('lets a successful permission response through and clears the deadline', async () => {
  jest.useFakeTimers();
  await expect(preparationDeadline(Promise.resolve(true), 20000, 'Timeout')).resolves.toBe(true);
  expect(jest.getTimerCount()).toBe(0);
});
it('rejects a hung OS callback so preparation can release its busy state', async () => {
  jest.useFakeTimers();
  let finish!: (value: boolean) => void;
  const native = new Promise<boolean>(resolve => { finish = resolve; });
  const checked = expect(preparationDeadline(native, 20000, 'Mikrofon izin isteği tamamlanmadı.')).rejects.toThrow(/Mikrofon/);
  jest.advanceTimersByTime(20000); await checked;
  finish(true); await Promise.resolve(); expect(jest.getTimerCount()).toBe(0);
});
