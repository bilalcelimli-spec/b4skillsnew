/**
 * Encryption at rest for secrets the server must read back (webhook signing
 * secrets): AES-256-GCM with a 32-byte key from the environment.
 *
 * Stored form: `enc:v1:<keyId>:<iv>:<tag>:<ciphertext>` (base64url parts).
 *  - `purpose` is bound as additional authenticated data, so a value encrypted
 *    for one column cannot be decrypted as another.
 *  - `keyId` is the first 8 hex chars of SHA-256(key). Rotation: set the new key
 *    as SECRET_ENCRYPTION_KEY and the old one as SECRET_ENCRYPTION_KEY_PREVIOUS;
 *    values under the old key still decrypt and can be re-encrypted.
 *  - A value without the `enc:` prefix is legacy plaintext; `isEncrypted`
 *    lets callers migrate it.
 *
 * Keys: `openssl rand -base64 32` (base64 or 64-char hex accepted).
 */
import crypto from "node:crypto";

const PREFIX = "enc:v1:";

export class SecretBoxError extends Error {}

interface Key { id: string; bytes: Buffer }

function parseKey(raw: string | undefined, name: string): Key | null {
  if (!raw) return null;
  const value = raw.trim();
  const bytes = /^[0-9a-fA-F]{64}$/.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (bytes.length !== 32) throw new SecretBoxError(`${name} must be 32 bytes (base64 or 64 hex characters)`);
  return { id: crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 8), bytes };
}

function keys(): { current: Key | null; all: Key[] } {
  const current = parseKey(process.env.SECRET_ENCRYPTION_KEY, "SECRET_ENCRYPTION_KEY");
  const previous = parseKey(process.env.SECRET_ENCRYPTION_KEY_PREVIOUS, "SECRET_ENCRYPTION_KEY_PREVIOUS");
  return { current, all: [current, previous].filter((k): k is Key => k !== null) };
}

export function encryptionConfigured(): boolean {
  return keys().current !== null;
}

/** Prefix of values encrypted under the current key, or null without a key. */
export function currentKeyPrefix(): string | null {
  const key = keys().current;
  return key ? `${PREFIX}${key.id}:` : null;
}

export function isEncrypted(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

/** Encrypts with the current key; throws when no key is configured. */
export function encryptSecret(plaintext: string, purpose: string): string {
  const key = keys().current;
  if (!key) throw new SecretBoxError("SECRET_ENCRYPTION_KEY is not configured");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key.bytes, iv);
  cipher.setAAD(Buffer.from(purpose, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${key.id}:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

/** Decrypts a stored value; legacy plaintext (no prefix) is returned as is. */
export function decryptSecret(stored: string, purpose: string): string {
  if (!isEncrypted(stored)) return stored;
  const [keyId, ivPart, tagPart, dataPart, extra] = stored.slice(PREFIX.length).split(":");
  if (!keyId || !ivPart || !tagPart || dataPart === undefined || extra !== undefined) {
    throw new SecretBoxError("Malformed encrypted secret");
  }
  const key = keys().all.find((k) => k.id === keyId);
  if (!key) throw new SecretBoxError(`No configured key matches key id ${keyId}`);
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key.bytes, Buffer.from(ivPart, "base64url"));
    decipher.setAAD(Buffer.from(purpose, "utf8"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new SecretBoxError("Encrypted secret failed authentication");
  }
}

/** True when a stored value should be rewritten (plaintext, or under a previous key). */
export function needsReencryption(stored: string): boolean {
  const current = keys().current;
  if (!current) return false;
  if (!isEncrypted(stored)) return true;
  return stored.slice(PREFIX.length).split(":")[0] !== current.id;
}
