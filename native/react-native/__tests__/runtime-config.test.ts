import { backendForBuild, editableBackend, PRODUCTION_BACKEND } from '../src/runtimeConfig';
it('uses the requested production service', () => expect(PRODUCTION_BACKEND).toBe('https://b4skills.com'));
it.each([null, 'http://127.0.0.1:3004', 'https://staging.example.test', 'broken preference'])('Release ignores saved developer origin %s', saved => {
  expect(backendForBuild(saved, false)).toBe('https://b4skills.com');
});
it('preserves selectable Debug backends for isolated tests', () => {
  expect(backendForBuild('http://127.0.0.1:3004', true)).toBe('http://127.0.0.1:3004');
});
it('Release cannot be redirected through the connection editor', () => {
  expect(() => editableBackend('https://other.example.test', false)).toThrow(/değiştirilemez/);
  expect(editableBackend(PRODUCTION_BACKEND, false)).toBe(PRODUCTION_BACKEND);
});
