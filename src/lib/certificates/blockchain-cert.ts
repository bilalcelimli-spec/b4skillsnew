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
import { prisma } from '../prisma.js';
import { CertificateService, CertificateNotReadyError, isCertificateReady } from '../certification/certificate-service.js';
export class CertificateSigningUnavailableError extends Error {}

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

  if (process.env.NODE_ENV === 'production') throw new CertificateSigningUnavailableError('CERT_SIGNING_KEY_PEM is required for durable certificate signatures');
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
  const sorted = (value: unknown): unknown => Array.isArray(value) ? value.map(sorted) :
    value !== null && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a < b ? -1 : a > b ? 1 : 0).map(([key,item])=>[key,sorted(item)])) : value;
  return JSON.stringify(sorted(obj));
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
    verificationUrl: `${(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || process.env.APP_BASE_URL || "https://b4skills.com").replace(/\/$/, "")}/verify/${payload.id}`,
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
  const onChainValid = null; // Full on-chain check requires ethers.js call

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
    // @ts-ignore — optional peer dependency
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

// ── Durable registry backed by the authoritative score report ───────────────

const includeSession = {session:{include:{candidate:true,organization:true,responses:{include:{item:{select:{skill:true}}}}}}} as const;
function matchesReport(cert: IssuedCertificate, report: any): boolean {
  if (!cert || !cert.payload || typeof cert.payload !== 'object' || !cert.payload.skillScores) return false;
  const session = report.session;
  if (!isCertificateReady(report,session)) return false;
  const authoritative = CertificateService.mapToCertificate(report,session.candidate,{organizationId:session.organizationId,name:session.organization.name},session);
  const scores = Object.fromEntries(Object.entries(authoritative.skillScores).filter(([,score])=>typeof score==='number').map(([skill,score])=>[skill.toUpperCase(),score]));
  return cert.payload.id === report.id && cert.payload.sessionId === report.sessionId && cert.payload.candidateId === session.candidateId &&
    cert.payload.organizationId === session.organizationId && cert.payload.overallScore === report.overallScore && cert.payload.cefrLevel === report.overallCefr &&
    cert.payload.expiresAt === authoritative.expiresAt.toISOString() && canonicalJSON(cert.payload.skillScores) === canonicalJSON(scores);
}

export async function storeCertificate(cert: IssuedCertificate): Promise<void> {
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${cert.payload.sessionId} FOR UPDATE`;
    const report = await tx.scoreReport.findUnique({where:{id:cert.payload.id},include:includeSession});
    if (!report || !matchesReport(cert,report)) throw new CertificateNotReadyError('Signed certificate does not match completed scoring evidence');
    await tx.scoreReport.update({where:{id:report.id},data:{diagnosticReport:{...((report.diagnosticReport ?? {}) as Record<string,unknown>),signedCertificate:JSON.parse(JSON.stringify(cert))}}});
  });
}

export async function lookupCertificate(id: string): Promise<IssuedCertificate | null> {
  const report = await prisma.scoreReport.findUnique({where:{id},include:includeSession});
  const cert = (report?.diagnosticReport as any)?.signedCertificate as IssuedCertificate | undefined;
  return cert && report && matchesReport(cert,report) ? cert : null;
}

export async function listCertificatesByCandidate(candidateId: string): Promise<IssuedCertificate[]> {
  const reports = await prisma.scoreReport.findMany({where:{session:{candidateId},isVerified:true,certificateUrl:{not:null}},include:includeSession});
  return reports.flatMap(report=>{
    const cert = (report.diagnosticReport as any)?.signedCertificate as IssuedCertificate | undefined;
    return cert && matchesReport(cert,report) ? [cert] : [];
  });
}
