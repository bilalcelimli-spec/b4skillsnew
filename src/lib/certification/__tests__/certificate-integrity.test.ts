/**
 * Certificate Integrity — Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  canonicalJson,
  computeIntegrityHash,
  generateProof,
  verifyProof,
  verifyCertificate,
  buildVerificationUrl,
  type CertificateCanonicalFields,
  type CertificateProof,
} from "../certificate-integrity.js";

const NOW = new Date().toISOString();
const FUTURE = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
const PAST = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

const FIELDS: CertificateCanonicalFields = {
  id: "cert-abc-123",
  sessionId: "session-456",
  candidateId: "user-789",
  organizationId: "org-001",
  cefrLevel: "B2",
  theta: 0.842,
  issuedAt: NOW,
  expiresAt: FUTURE,
};

// ─── canonicalJson ─────────────────────────────────────────────────────────────

describe("canonicalJson()", () => {
  it("produces the same string regardless of field insertion order", () => {
    const shuffled: CertificateCanonicalFields = {
      theta: FIELDS.theta,
      expiresAt: FIELDS.expiresAt,
      id: FIELDS.id,
      issuedAt: FIELDS.issuedAt,
      cefrLevel: FIELDS.cefrLevel,
      organizationId: FIELDS.organizationId,
      candidateId: FIELDS.candidateId,
      sessionId: FIELDS.sessionId,
    };
    expect(canonicalJson(FIELDS)).toBe(canonicalJson(shuffled));
  });

  it("sorts keys lexicographically", () => {
    const json = canonicalJson(FIELDS);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const keys = Object.keys(parsed);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });

  it("produces valid JSON", () => {
    expect(() => JSON.parse(canonicalJson(FIELDS))).not.toThrow();
  });

  it("is sensitive to field value changes", () => {
    const modified = { ...FIELDS, cefrLevel: "C1" };
    expect(canonicalJson(FIELDS)).not.toBe(canonicalJson(modified));
  });
});

// ─── computeIntegrityHash ──────────────────────────────────────────────────────

describe("computeIntegrityHash()", () => {
  it("returns a 64-character hex string (SHA-256 = 32 bytes = 64 hex chars)", () => {
    const hash = computeIntegrityHash(FIELDS);
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it("is deterministic — same input produces same hash", () => {
    expect(computeIntegrityHash(FIELDS)).toBe(computeIntegrityHash(FIELDS));
  });

  it("changes when any field changes (tamper detection)", () => {
    const original = computeIntegrityHash(FIELDS);
    expect(computeIntegrityHash({ ...FIELDS, cefrLevel: "C2" })).not.toBe(original);
    expect(computeIntegrityHash({ ...FIELDS, theta: 1.234 })).not.toBe(original);
    expect(computeIntegrityHash({ ...FIELDS, candidateId: "hacker" })).not.toBe(original);
  });
});

// ─── generateProof ─────────────────────────────────────────────────────────────

describe("generateProof()", () => {
  it("returns a proof with HMAC-SHA256-v1 algorithm", () => {
    const proof = generateProof(FIELDS);
    expect(proof.alg).toBe("HMAC-SHA256-v1");
  });

  it("includes a 64-char hex hash", () => {
    const proof = generateProof(FIELDS);
    expect(proof.hash).toHaveLength(64);
  });

  it("includes a createdAt ISO timestamp", () => {
    const proof = generateProof(FIELDS);
    expect(() => new Date(proof.createdAt)).not.toThrow();
    expect(new Date(proof.createdAt).getTime()).not.toBeNaN();
  });
});

// ─── verifyProof ───────────────────────────────────────────────────────────────

describe("verifyProof()", () => {
  it("returns true for a freshly-generated proof", () => {
    const proof = generateProof(FIELDS);
    expect(verifyProof(FIELDS, proof)).toBe(true);
  });

  it("returns false when certificate field has been tampered with", () => {
    const proof = generateProof(FIELDS);
    expect(verifyProof({ ...FIELDS, cefrLevel: "C2" }, proof)).toBe(false);
  });

  it("returns false when proof hash is corrupted", () => {
    const proof = generateProof(FIELDS);
    const badProof: CertificateProof = { ...proof, hash: "0".repeat(64) };
    expect(verifyProof(FIELDS, badProof)).toBe(false);
  });

  it("returns false for unknown algorithm version", () => {
    const proof = generateProof(FIELDS);
    const unknownAlg = { ...proof, alg: "HMAC-SHA512-v2" } as CertificateProof;
    expect(verifyProof(FIELDS, unknownAlg)).toBe(false);
  });

  it("returns false when hash length is wrong (prevents timing side-channel)", () => {
    const proof = generateProof(FIELDS);
    const shortHash: CertificateProof = { ...proof, hash: proof.hash.slice(0, 32) };
    expect(verifyProof(FIELDS, shortHash)).toBe(false);
  });
});

// ─── verifyCertificate ─────────────────────────────────────────────────────────

describe("verifyCertificate()", () => {
  it("returns verified=true for a valid, non-expired certificate", () => {
    const proof = generateProof(FIELDS);
    const result = verifyCertificate(FIELDS, proof);
    expect(result.verified).toBe(true);
    expect(result.expired).toBe(false);
    expect(result.certId).toBe(FIELDS.id);
    expect(result.cefrLevel).toBe(FIELDS.cefrLevel);
  });

  it("returns verified=false when integrity hash is wrong", () => {
    const proof = generateProof(FIELDS);
    const result = verifyCertificate({ ...FIELDS, theta: 9.999 }, proof);
    expect(result.verified).toBe(false);
    expect(result.reason).toMatch(/INTEGRITY_HASH_MISMATCH/);
  });

  it("returns verified=false for an expired certificate", () => {
    const expiredFields: CertificateCanonicalFields = { ...FIELDS, expiresAt: PAST };
    const proof = generateProof(expiredFields);
    const result = verifyCertificate(expiredFields, proof);
    expect(result.verified).toBe(false);
    expect(result.expired).toBe(true);
    expect(result.reason).toMatch(/CERTIFICATE_EXPIRED/);
  });

  it("integrity check takes priority over expiry (tampered AND expired → INTEGRITY_HASH_MISMATCH)", () => {
    // Generate proof for original, then tamper with expiresAt AND make it expired
    const proof = generateProof(FIELDS);
    const tampered: CertificateCanonicalFields = { ...FIELDS, expiresAt: PAST, theta: 99 };
    const result = verifyCertificate(tampered, proof);
    expect(result.verified).toBe(false);
    expect(result.reason).toMatch(/INTEGRITY_HASH_MISMATCH/);
  });

  it("includes cert metadata in the result", () => {
    const proof = generateProof(FIELDS);
    const result = verifyCertificate(FIELDS, proof);
    expect(result.candidateId).toBe(FIELDS.candidateId);
    expect(result.organizationId).toBe(FIELDS.organizationId);
    expect(result.issuedAt).toBe(FIELDS.issuedAt);
  });
});

// ─── buildVerificationUrl ──────────────────────────────────────────────────────

describe("buildVerificationUrl()", () => {
  it("constructs a URL from base + certId", () => {
    const url = buildVerificationUrl("cert-abc-123", "https://b4skills.com");
    expect(url).toBe("https://b4skills.com/verify/cert-abc-123");
  });

  it("trims trailing slash from base URL", () => {
    const url = buildVerificationUrl("cert-abc-123", "https://b4skills.com/");
    expect(url).toBe("https://b4skills.com/verify/cert-abc-123");
  });

  it("falls back to relative path when no base provided", () => {
    const url = buildVerificationUrl("cert-xyz", "");
    expect(url).toBe("/verify/cert-xyz");
  });
});
