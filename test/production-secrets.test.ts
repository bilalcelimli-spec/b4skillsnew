import { afterEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { assertProductionSecrets } from '../src/lib/security/http-security';

const valid = {
  NODE_ENV: 'production',
  JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  REFRESH_SECRET: crypto.randomBytes(32).toString('hex'),
  DATABASE_URL: 'postgresql://u:p@db.example.invalid:5432/app',
  APP_URL: 'https://b4skills.example',
  CORS_ORIGINS: 'https://b4skills.example',
  RESEND_API_KEY: 'test-resend-key-value',
  SECRET_ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
  REDIS_URL: 'redis://cache.example.invalid:6379',
};
function withEnv(overrides: Record<string, string>) {
  for (const [key, value] of Object.entries({ ...valid, ...overrides })) vi.stubEnv(key, value);
}
afterEach(() => vi.unstubAllEnvs());

describe('production start-up configuration check', () => {
  it('passes with a complete production configuration', () => {
    withEnv({});
    expect(() => assertProductionSecrets()).not.toThrow();
  });

  it('does nothing outside production', () => {
    withEnv({ NODE_ENV: 'test', JWT_SECRET: '' });
    expect(() => assertProductionSecrets()).not.toThrow();
  });

  it('refuses missing, weak or inconsistent settings', () => {
    withEnv({ RESEND_API_KEY: '' });
    expect(() => assertProductionSecrets()).toThrow(/RESEND_API_KEY/);
    withEnv({ JWT_SECRET: 'changeme' });
    expect(() => assertProductionSecrets()).toThrow(/weak/);
    withEnv({ APP_URL: 'http://b4skills.example', CORS_ORIGINS: 'http://b4skills.example' });
    expect(() => assertProductionSecrets()).toThrow(/https/);
    withEnv({ CORS_ORIGINS: 'https://other.example' });
    expect(() => assertProductionSecrets()).toThrow(/CORS_ORIGINS/);
    withEnv({ SECRET_ENCRYPTION_KEY: 'too-short' });
    expect(() => assertProductionSecrets()).toThrow(/32 bytes/);
  });

  it('allows a local http production build (docker-compose)', () => {
    withEnv({ APP_URL: 'http://localhost:3000', CORS_ORIGINS: '' });
    expect(() => assertProductionSecrets()).not.toThrow();
  });

  it('only warns when optional settings are absent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    withEnv({ SECRET_ENCRYPTION_KEY: '', REDIS_URL: '' });
    expect(() => assertProductionSecrets()).not.toThrow();
    const messages = warn.mock.calls.map((call) => String(call[0])).join('\n');
    expect(messages).toMatch(/SECRET_ENCRYPTION_KEY/);
    expect(messages).toMatch(/REDIS_URL/);
    warn.mockRestore();
  });
});
