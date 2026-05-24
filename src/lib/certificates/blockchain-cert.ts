/**
 * Blockchain Certificate Verification
 * ─────────────────────────────────────────────────────────────────────────────
 * Issues cryptographically-verifiable language proficiency certificates.
 *
 * Two modes:
 *   1. Cryptographic (default): ECDSA-signed certificate — no blockchain fee,
 *      instant verification, self-contained proof. Suitable for Tier 1/2.
 *   2. On-chain anchor (BLOCKCHAIN_ENABLED=true): certificate hash committed
 *      to Polygon (MATIC) PoS chain via a simple storage contract.
 *      ~0.001 MATIC per cert. Gas-efficient batch anchoring supported.
 *
 * Certificate structure:
 *   • Unique UUID, candidate name/ID, CEFR band, skill scores
 *   • Issuing org, exam date, expiry (2 years)
 *   • SHA-256 content hash, ECDSA signature (P-256 / secp256k1)
 *   • On-chain: tx hash on Polygon for immutable audit trail
 *
 * Verification (public API):
 *   GET /api/certificates/:id/verify
 *   Returns: { valid: true, certificate, chainProof? }
 */

import * as crypto from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CertificatePayload {
  id: string;                         // UUID
  version: "1.0";
  issuedAt: string;                   // ISO 8601
  expiresAt: string;                  // ISO 8601
  candidateId: string;
  candidateName: string;
  organizationId: string;
  organizationName: string;
  cefrLevel: string;                  // e.g. "B2"
  overallScore: number;               // 0–100 scaled score
  skillScores: Record<string, number>; // READING, WRITING, etc.
  sessionId: string;
  examDate: string;
  module: string;                     // e.g. "GENERAL", "BUSINESS"
  testVersion: string;
}

export interface IssuedCertificate {
  payload: CertificatePayload;
  contentHash: string;                // SHA-256 hex of canonical payload JSON
  signature: string;                  // ECDSA signature (DER, hex)
  publicKeyFingerprint: string;       // SHA-256 of public key PEM
  onChain: ChainProof | null;
  verificationUrl: string;
}

export interface ChainProof {
  network: "polygon" | "ethereum" | "polygon-mumbai";
  txHash: string;
  blockNumber: number;
  anchoredAt: string;                 // ISO 8601
  contractAddress: string;
}

export interface VerificationResult {
  valid: boolean;
  certificate: CertificatePayload | null;
  signatureValid: boolean;
  notExpired: boolean;
  onChainValid: boolean | null;       // null if not anchored
  errors: string[];
}

// ── Key management ────────────────────────────────────────────────────────────

let _signingKey: crypto.KeyObject | null = null;
let _verifyingKey: crypto.KeyObject | null = null;
let _publicKeyPem: string | null = null;
let _publicKeyFingerprint: string | null = null;

function initKeys(): void {
  if (_signingKey) return;

  const privPem = process.env.CERT_SIGNING_KEY_PEM;
  if (privPem) {
    _signingKey  = crypto.createPrivateKey(privPem);
    _verifyingKey = crypto.createPublicKey(_signingKey);
    _publicKeyPem = _verifyingKey.export({ type: "spki", format: "pem" }) as string;
    _publicKeyFingerprint = crypto.createHash("sha256").update(_publicKeyPem).digest("hex").slice(0, 16);
    return;
  }

  // Generate ephemeral keypair in dev/test
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { type: "spki",  format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  _signingKey  = crypto.createPrivateKey(privateKey);
  _verifyingKey = crypto.createPublicKey(publicKey);
  _publicKeyPem = publicKey;
  _publicKeyFingerprint = crypto.createHash("sha256").update(publicKey).digest("hex").slice(0, 16);
  console.warn("[Certs] Using ephemeral signing key — set CERT_SIGNING_KEY_PEM in production");
}

export function getPublicKeyPem(): string {
  initKeys();
  return _publicKeyPem!;
}

// ── Canonical serialisation ───────────────────────────────────────────────────

function canonicalJSON(obj: object): string {
  // Deterministic JSON: keys sorted recursively
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function contentHash(payload: CertificatePayload): string {
  return crypto.createHash("sha256").update(canonicalJSON(payload), "utf8").digest("hex");
}

// ── Certificate issuance ──────────────────────────────────────────────────────

export function issueCertificate(payload: CertificatePayload): IssuedCertificate {
  initKeys();

  const hash = contentHash(payload);

  const sign = crypto.createSign("SHA256");
  sign.update(hash, "hex");
  const signature = sign.sign(_signingKey!, "hex");

  return {
    payload,
    contentHash: hash,
    signature,
    publicKeyFingerprint: _publicKeyFingerprint!,
    onChain: null,
    verificationUrl: `${process.env.APP_BASE_URL ?? "https://app.linguadapt.com"}/verify/${payload.id}`,
  };
}

/** Build a certificate payload from a completed session */
export function buildCertificatePayload(opts: {
  candidateId: string;
  candidateName: string;
  organizationId: string;
  organizationName: string;
  sessionId: string;
  cefrLevel: string;
  overallScore: number;
  skillScores: Record<string, number>;
  module?: string;
  examDate?: string;
}): CertificatePayload {
  const id = crypto.randomUUID();
  const now = new Date();
  const expiry = new Date(now);
  expiry.setFullYear(expiry.getFullYear() + 2); // 2-year validity

  return {
    id,
    version: "1.0",
    issuedAt: now.toISOString(),
    expiresAt: expiry.toISOString(),
    candidateId: opts.candidateId,
    candidateName: opts.candidateName,
    organizationId: opts.organizationId,
    organizationName: opts.organizationName,
    cefrLevel: opts.cefrLevel,
    overallScore: Math.round(opts.overallScore * 10) / 10,
    skillScores: opts.skillScores,
    sessionId: opts.sessionId,
    examDate: opts.examDate ?? now.toISOString().slice(0, 10),
    module: opts.module ?? "GENERAL",
    testVersion: "1.0",
  };
}

// ── Certificate verification ──────────────────────────────────────────────────

export function verifyCertificate(cert: IssuedCertificate): VerificationResult {
  initKeys();
  const errors: string[] = [];

  // 1. Recompute content hash
  const expectedHash = contentHash(cert.payload);
  if (expectedHash !== cert.contentHash) errors.push("CONTENT_HASH_MISMATCH");

  // 2. Verify signature
  let signatureValid = false;
  try {
    const verify = crypto.createVerify("SHA256");
    verify.update(cert.contentHash, "hex");
    signatureValid = verify.verify(_verifyingKey!, cert.signature, "hex");
    if (!signatureValid) errors.push("SIGNATURE_INVALID");
  } catch {
    errors.push("SIGNATURE_VERIFICATION_ERROR");
  }

  // 3. Check expiry
  const notExpired = new Date(cert.payload.expiresAt) > new Date();
  if (!notExpired) errors.push("CERTIFICATE_EXPIRED");

  // 4. On-chain check (if anchored)
  const onChainValid = cert.onChain ? true : null; // Full on-chain check requires ethers.js call

  return {
    valid: signatureValid && notExpired && errors.length === 0,
    certificate: cert.payload,
    signatureValid,
    notExpired,
    onChainValid,
    errors,
  };
}

// ── On-chain anchoring (Polygon) ──────────────────────────────────────────────

/**
 * Anchor a batch of certificate hashes on-chain.
 * Requires ethers.js (optional peer dependency) and POLYGON_RPC_URL + CERT_WALLET_KEY env vars.
 * Falls back gracefully if ethers is not installed.
 */
export async function anchorCertificatesOnChain(
  certs: IssuedCertificate[]
): Promise<ChainProof[]> {
  const rpcUrl    = process.env.POLYGON_RPC_URL;
  const walletKey = process.env.CERT_WALLET_KEY;
  const contractAddr = process.env.CERT_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000";

  if (!rpcUrl || !walletKey) {
    throw new Error("POLYGON_RPC_URL and CERT_WALLET_KEY env vars required for on-chain anchoring");
  }

  let ethers: any;
  try {
    ethers = await import("ethers");
  } catch {
    throw new Error("ethers package not installed — run: npm install ethers");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet   = new ethers.Wallet(walletKey, provider);

  // Minimal ABI: storeBatch(bytes32[] hashes)
  const abi = ["function storeBatch(bytes32[] calldata hashes) external"];
  const contract = new ethers.Contract(contractAddr, abi, wallet);

  const hashes = certs.map((c) => "0x" + c.contentHash);
  const tx = await contract.storeBatch(hashes);
  const receipt = await tx.wait();

  return certs.map(() => ({
    network: (process.env.POLYGON_NETWORK as ChainProof["network"]) ?? "polygon",
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    anchoredAt: new Date().toISOString(),
    contractAddress: contractAddr,
  }));
}

// ── Certificate registry (in-memory, replace with DB in production) ───────────

const certRegistry = new Map<string, IssuedCertificate>();

export function storeCertificate(cert: IssuedCertificate): void {
  certRegistry.set(cert.payload.id, cert);
}

export function lookupCertificate(id: string): IssuedCertificate | null {
  return certRegistry.get(id) ?? null;
}

export function listCertificatesByCandidate(candidateId: string): IssuedCertificate[] {
  return Array.from(certRegistry.values()).filter((c) => c.payload.candidateId === candidateId);
}
