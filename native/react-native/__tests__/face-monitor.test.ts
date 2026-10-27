import { FaceMonitor } from '../src/proctoring/faceMonitor';
it('requires five continuous seconds without a face and does not flood events', () => {
  const m = new FaceMonitor();
  for (let t = 0; t < 5000; t += 1000) expect(m.sample(0, t)).toBeNull();
  expect(m.sample(0, 5000)).toBe('FACE_NOT_DETECTED');
  for (let t = 6000; t < 60000; t += 1000) expect(m.sample(0, t)).toBeNull();
});
it('requires three seconds of multiple faces, including changing counts above one', () => {
  const m = new FaceMonitor();
  [2, 3, 2].forEach((n, i) => expect(m.sample(n, i * 1000)).toBeNull());
  expect(m.sample(4, 3000)).toBe('MULTIPLE_FACES');
});
it('resets duration on detection errors, missing frames, and single-face recovery', () => {
  const m = new FaceMonitor();
  for (const [n, t] of [[0, 0], [0, 1000], [0, 2000], [null, 3000], [0, 4000], [0, 5000], [0, 9000], [1, 10000], [0, 11000], [0, 12000]] as const) expect(m.sample(n, t)).toBeNull();
});
it('ignores stale clocks and applies cooldown across camera reopen', () => {
  const m = new FaceMonitor();
  for (let t = 0; t < 6000; t += 1000) m.sample(0, t);
  m.reset();
  for (let t = 6000; t < 35000; t += 1000) expect(m.sample(0, t)).toBeNull();
  expect(m.sample(0, 100)).toBeNull();
  expect(m.sample(0, 35000)).toBe('FACE_NOT_DETECTED');
});
