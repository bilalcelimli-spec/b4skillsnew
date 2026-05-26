/**
 * Certificate Integrity — Tamper-Evident Verification
 *
 * Adds a cryptographic HMAC-SHA256 integrity proof to every certificate.
 * The proof is computed over the canonical (sorted-key) JSON representation
 * of the certificate's immutable fields, keyed with a server-side secret.
 *
 * Verification workflow:
 *   1. Third party visits  GET /verify/:certId
 *   2. Server fetches certificate from DB
 *   3. Server re-computes the expected hash and compares with stored hash
 *   4. Returns { verified: true, certificate } or { verified: false, reason }
 *
 * Security properties
 * -------------------
 * - HMAC-SHA256 with a 256-bit secret: 2^256 brute-force resistance
 * - Canonical JSON (sorted keys) prevents re-ordering attacks
 * - The secret (CERT_HMAC_SECRET env var) never leaves the server
 * - Version field allows algorithm migration without breaking existing certs
 *
 * Note: For blockchain-style public verifiability, the hash can be anchored
 * to a public ledger (e.g., Ethereum attestation, IPFS CID). The hash output
 * from `computeIntegrityHash()` is the canonical input for anchoring.
 */

import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CertificateCanonicalFields {
  id: string;
  sessionId: string;
  candidateId: string;
  organizationId: string;
  cefrLevel: string;
  /** Theta rounded to 3 decimal places — avoids float drift across encodings */
  theta: number;
  issuedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
}

export interface CertificateProof {
  /** Algorithm identifier for future migration */
  alg: "HMAC-SHA256-v1";
  /** Hex-encoded HMAC-SHA256 digest of the canonical JSON */
  hash: string;
  /** Timestamp of proof creation (ISO 8601) */
  createdAt: string;
}

export interface VerificationResult {
  verified: boolean;
  reason?: string;
  certId: string;
  cefrLevel?: string;
  candidateId?: string;
  organizationId?: string;
  issuedAt?: string;
  expiresAt?: string;
  /** Whether the certificate has passed its expiry date */
  expired?: boolean;
}

// ─── Secret key ───────────────────────────────────────────────────────────────

/**
 * Load the HMAC secret from the environment.
 * Falls back to a deterministic dev-only key when running tests (not production).
 */
function getHmacSecret(): Buffer {
  const envSecret = process.env.CERT_HMAC_SECRET;
  if (envSecret) {
    return Buffer.from(envSecret, "hex");
  }
  // Dev/test fallback — never use in production
  if (process.env.NODE_ENV === "production") {
    throw new Error("CERT_HMAC_SECRET environment variable is required in production");
  }
  return Buffer.alloc(32, 0x5a); // 0x5a5a...5a — obviously-fake test key
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Produce the canonical JSON string for a certificate's immutable fields.
 * Keys are sorted lexicographically to guarantee a deterministic encoding
 * regardless of the order fields were added to the object.
 */
export function canonicalJson(fields: CertificateCanonicalFields): string {
  const sorted = Object.keys(fields).sort().reduce<Record<string, unknown>>(
    (acc, key) => {
      acc[key] = (fields as unknown as Record<string, unknown>)[key];
      return acc;
    },
    {}
  );
  return JSON.stringify(sorted);
}

/**
 * Compute the HMAC-SHA256 integrity hash for a set of canonical certificate fields.
 *
 * @returns Hex-encoded digest (64 characters)
 */
export function computeIntegrityHash(fields: CertificateCanonicalFields): string {
  const secret = getHmacSecret();
  const canonical = canonicalJson(fields);
  return crypto.createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
}

/**
 * Generate a full CertificateProof for a certificate's immutable fields.
 */
export function generateProof(fields: CertificateCanonicalFields): CertificateProof {
  return {
    alg: "HMAC-SHA256-v1",
    hash: computeIntegrityHash(fields),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verify a certificate proof.
 *
 * Uses `crypto.timingSafeEqual` to prevent timing side-channel attacks.
 *
 * @param fields  The canonical fields as stored/returned by the certificate endpoint
 * @param proof   The stored proof to verify
 * @returns true if the hash matches and the certificate has not been tampered with
 */
export function verifyProof(
  fields: CertificateCanonicalFields,
  proof: CertificateProof
): boolean {
  if (proof.alg !== "HMAC-SHA256-v1") {
    // Algorithm mismatch — unknown version
    return false;
  }

  const expectedHash = computeIntegrityHash(fields);

  if (proof.hash.length !== expectedHash.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(proof.hash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Full verification workflow — checks both integrity and expiry.
 *
 * @param fields   Canonical certificate fields from the database
 * @param proof    Stored HMAC proof
 * @returns        VerificationResult with verified status and metadata
 */
export function verifyCertificate(
  fields: CertificateCanonicalFields,
  proof: CertificateProof
): VerificationResult {
  const base: Pick<VerificationResult, "certId" | "cefrLevel" | "candidateId" | "organizationId" | "issuedAt" | "expiresAt"> = {
    certId: fields.id,
    cefrLevel: fields.cefrLevel,
    candidateId: fields.candidateId,
    organizationId: fields.organizationId,
    issuedAt: fields.issuedAt,
    expiresAt: fields.expiresAt,
  };

  const expired = new Date(fields.expiresAt) < new Date();

  const integrityOk = verifyProof(fields, proof);

  if (!integrityOk) {
    return {
      ...base,
      verified: false,
      expired,
      reason: "INTEGRITY_HASH_MISMATCH — certificate data has been modified",
    };
  }

  if (expired) {
    return {
      ...base,
      verified: false,
      expired: true,
      reason: `CERTIFICATE_EXPIRED — expired on ${fields.expiresAt}`,
    };
  }

  return { ...base, verified: true, expired: false };
}

/**
 * Generate a public verification URL for embedding in QR codes and PDF reports.
 */
export function buildVerificationUrl(certId: string, baseUrl?: string): string {
  const base = (baseUrl ?? process.env.APP_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/verify/${certId}` : `/verify/${certId}`;
}
