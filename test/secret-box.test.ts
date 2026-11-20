import { afterEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import {
  decryptSecret, encryptSecret, encryptionConfigured, isEncrypted, needsReencryption, SecretBoxError,
} from '../src/lib/security/secret-box';

const keyA = crypto.randomBytes(32).toString('base64');
const keyB = crypto.randomBytes(32).toString('hex');
afterEach(() => vi.unstubAllEnvs());

describe('secret box', () => {
  it('round-trips and never stores the plaintext', () => {
    vi.stubEnv('SECRET_ENCRYPTION_KEY', keyA);
    const stored = encryptSecret('whsec_plain', 'webhook.signing-secret');
    expect(stored).toMatch(/^enc:v1:[0-9a-f]{8}:/);
    expect(stored).not.toContain('whsec_plain');
    expect(encryptSecret('whsec_plain', 'webhook.signing-secret')).not.toBe(stored); // random IV
    expect(decryptSecret(stored, 'webhook.signing-secret')).toBe('whsec_plain');
  });

  it('binds the value to its purpose and detects tampering', () => {
    vi.stubEnv('SECRET_ENCRYPTION_KEY', keyA);
    const stored = encryptSecret('whsec_plain', 'webhook.signing-secret');
    expect(() => decryptSecret(stored, 'other.column')).toThrow(SecretBoxError);
    const parts = stored.split(':');
    parts[5] = Buffer.from('tampered').toString('base64url');
    expect(() => decryptSecret(parts.join(':'), 'webhook.signing-secret')).toThrow(SecretBoxError);
  });

  it('supports rotation through the previous key', () => {
    vi.stubEnv('SECRET_ENCRYPTION_KEY', keyA);
    const underA = encryptSecret('s1', 'p');
    vi.stubEnv('SECRET_ENCRYPTION_KEY', keyB);
    expect(() => decryptSecret(underA, 'p')).toThrow(SecretBoxError);
    vi.stubEnv('SECRET_ENCRYPTION_KEY_PREVIOUS', keyA);
    expect(decryptSecret(underA, 'p')).toBe('s1');
    expect(needsReencryption(underA)).toBe(true);
    expect(needsReencryption(encryptSecret('s1', 'p'))).toBe(false);
  });

  it('treats unprefixed values as legacy plaintext and rejects bad keys', () => {
    vi.stubEnv('SECRET_ENCRYPTION_KEY', '');
    expect(encryptionConfigured()).toBe(false);
    expect(decryptSecret('legacy-plain', 'p')).toBe('legacy-plain');
    expect(isEncrypted('legacy-plain')).toBe(false);
    expect(() => encryptSecret('x', 'p')).toThrow(SecretBoxError);
    vi.stubEnv('SECRET_ENCRYPTION_KEY', 'too-short');
    expect(() => encryptSecret('x', 'p')).toThrow(/32 bytes/);
  });
});
