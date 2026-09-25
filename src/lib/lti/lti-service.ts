/**
 * LTI 1.3 Tool Provider
 *
 * Two layers:
 *  1. `LtiService` — pure stateless class. Builds redirect URLs, parses/validates
 *     id_tokens without I/O. Unit-testable without a database.
 *  2. Top-level async functions (`initiateLogin`, `handleLaunch`, `sendGradePassback`)
 *     — DB-backed orchestration used by Express routes.
 *
 * Spec references:
 *  - IMS LTI 1.3 Core: https://www.imsglobal.org/spec/lti/v1p3/
 *  - IMS LTI Advantage AGS: https://www.imsglobal.org/spec/lti-ags/v2p0/
 *  - IMS Deep Linking 2.0: https://www.imsglobal.org/spec/lti-dl/v2p0/
 */

import * as crypto from "crypto";
import { prisma } from "../prisma.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LtiPlatformConfig {
  platformId: string;
  clientId: string;
  oidcAuthEndpoint: string;
  tokenEndpoint: string;
  jwksEndpoint: string;
  deploymentId: string;
}

export interface OidcLoginParams {
  iss: string;
  login_hint: string;
  target_link_uri: string;
  lti_message_hint?: string;
  client_id?: string;
}

export interface LtiLaunchClaims {
  messageType: string;
  version: string;
  deploymentId: string;
  roles: string[];
  iss: string;
  sub: string;
  aud: string | string[];
  nonce: string;
  exp: number;
  iat: number;
  // Optional enrichment
  email?: string;
  name?: string;
  context?: { id: string; title?: string };
  resourceLink?: { id: string; title?: string };
  ags?: { lineitem?: string; scoreMaximum?: number; lineitems?: string };
  deepLinking?: {
    deepLinkReturnUrl: string;
    acceptTypes: string[];
    acceptMultiple: boolean;
  };
  [key: string]: unknown;
}

export interface DeepLinkItem {
  type: string;
  title?: string;
  url?: string;
  [key: string]: unknown;
}

// ── LtiService — pure stateless utility class ─────────────────────────────────

// In-process state store (development / single-instance). Production uses DB.
const _stateStore = new Map<string, { nonce: string; targetUri: string; expiresAt: number }>();

const NS = "https://purl.imsglobal.org/spec/lti/claim/";
const DL_NS = "https://purl.imsglobal.org/spec/lti-dl/claim/";

export class LtiService {
  /**
   * Build the OIDC redirect URL for the login initiation step.
   * Returns { redirectUrl, state, nonce }.
   */
  static initiateLogin(
    params: OidcLoginParams,
    config: LtiPlatformConfig,
    redirectUri: string
  ): { redirectUrl: string; state: string; nonce: string } {
    const state = crypto.randomBytes(16).toString("hex");
    const nonce = crypto.randomBytes(16).toString("hex");

    _stateStore.set(state, { nonce, targetUri: params.target_link_uri, expiresAt: Date.now() + 5 * 60_000 });

    const url = new URL(config.oidcAuthEndpoint);
    url.searchParams.set("scope", "openid");
    url.searchParams.set("response_type", "id_token");
    url.searchParams.set("response_mode", "form_post");
    url.searchParams.set("prompt", "none");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("login_hint", params.login_hint);
    if (params.lti_message_hint) url.searchParams.set("lti_message_hint", params.lti_message_hint);

    return { redirectUrl: url.toString(), state, nonce };
  }

  /** Consume state from in-memory store. Returns null if missing or expired. */
  static consumeState(state: string): { nonce: string; targetUri: string } | null {
    const entry = _stateStore.get(state);
    if (!entry) return null;
    _stateStore.delete(state);
    if (entry.expiresAt < Date.now()) return null;
    return { nonce: entry.nonce, targetUri: entry.targetUri };
  }

  /**
   * Decode and parse an id_token JWT (no signature verification — caller must
   * verify signature separately before trusting the result).
   */
  static parseIdToken(idToken: string): LtiLaunchClaims {
    const parts = idToken.split(".");
    if (parts.length !== 3) throw new Error("id_token must be a three-part JWT");

    let claims: Record<string, unknown>;
    try {
      claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    } catch {
      throw new Error("Could not base64url-decode id_token payload");
    }

    const now = Math.floor(Date.now() / 1000);
    if (claims.exp && (claims.exp as number) < now) throw new Error("id_token is expired");

    const deploymentId = claims[`${NS}deployment_id`] as string | undefined;
    if (!deploymentId) throw new Error("id_token missing deployment_id claim");

    return {
      messageType: (claims[`${NS}message_type`] as string) ?? "LtiResourceLinkRequest",
      version: (claims[`${NS}version`] as string) ?? "1.3.0",
      deploymentId,
      roles: (claims[`${NS}roles`] as string[]) ?? [],
      iss: claims.iss as string,
      sub: claims.sub as string,
      aud: claims.aud as string | string[],
      nonce: claims.nonce as string,
      exp: claims.exp as number,
      iat: claims.iat as number,
      email: claims.email as string | undefined,
      name: claims.name as string | undefined,
      context: claims[`${NS}context`] as LtiLaunchClaims["context"],
      resourceLink: claims[`${NS}resource_link`] as LtiLaunchClaims["resourceLink"],
      ags: claims["https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"] as LtiLaunchClaims["ags"],
      deepLinking: claims[`${DL_NS}deep_linking_settings`] as LtiLaunchClaims["deepLinking"],
    };
  }

  /** Validate parsed claims against a platform config and expected nonce. */
  static validateLaunchClaims(
    claims: LtiLaunchClaims,
    config: LtiPlatformConfig,
    expectedNonce: string
  ): { valid: boolean; reason?: string } {
    if (claims.nonce !== expectedNonce) return { valid: false, reason: "nonce mismatch" };

    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(config.clientId)) return { valid: false, reason: `aud does not include clientId (${config.clientId})` };

    if (claims.deploymentId !== config.deploymentId) {
      return { valid: false, reason: `deployment_id mismatch: expected ${config.deploymentId}` };
    }

    return { valid: true };
  }

  /** True if roles contain an Instructor (or TeachingAssistant) URN. */
  static isInstructor(roles: string[]): boolean {
    return roles.some(r =>
      r.includes("Instructor") || r.includes("TeachingAssistant") || r.includes("Faculty") || r.includes("Staff")
    );
  }

  /** True if roles contain a Learner / Student URN. */
  static isLearner(roles: string[]): boolean {
    return roles.some(r => r.includes("Learner") || r.includes("Student"));
  }

  /**
   * Build the payload for an LtiDeepLinkingResponse JWT (tool → platform).
   * Returns { returnUrl, jwtPayload, serializedPayload }.
   */
  static buildDeepLinkResponse(
    claims: LtiLaunchClaims,
    config: LtiPlatformConfig,
    items: DeepLinkItem[]
  ): { returnUrl: string; jwtPayload: Record<string, unknown>; serializedPayload: string } {
    const returnUrl = claims.deepLinking?.deepLinkReturnUrl ?? "";
    const now = Math.floor(Date.now() / 1000);

    const jwtPayload: Record<string, unknown> = {
      iss: config.clientId,
      aud: claims.iss,
      sub: claims.sub,
      iat: now,
      exp: now + 600,
      nonce: crypto.randomBytes(12).toString("hex"),
      [`${NS}message_type`]: "LtiDeepLinkingResponse",
      [`${NS}version`]: "1.3.0",
      [`${NS}deployment_id`]: config.deploymentId,
      [`${DL_NS}content_items`]: items.map(item => ({
        type: item.type,
        title: item.title,
        url: item.url,
        ...item,
      })),
    };

    const serializedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString("base64url");
    return { returnUrl, jwtPayload, serializedPayload };
  }
}

// ── Key management ────────────────────────────────────────────────────────────

let _keyPair: { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject; kid: string } | null = null;

export function getToolKeyPair() {
  if (!_keyPair) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    } as any);
    _keyPair = {
      privateKey: crypto.createPrivateKey(privateKey as any),
      publicKey: crypto.createPublicKey(publicKey as any),
      kid: crypto.randomUUID(),
    };
  }
  return _keyPair;
}

export function buildJwks() {
  const { publicKey, kid } = getToolKeyPair();
  const jwk = publicKey.export({ format: "jwk" }) as Record<string, string>;
  return { keys: [{ ...jwk, use: "sig", alg: "RS256", kid }] };
}

// ── DB-backed OIDC login initiation ──────────────────────────────────────────

export interface LoginParams {
  iss: string;
  loginHint: string;
  targetLinkUri: string;
  ltiMessageHint?: string;
  clientId?: string;
}

export async function initiateLogin(params: LoginParams, appBaseUrl: string) {
  const reg = await prisma.ltiRegistration.findFirst({
    where: { platformIss: params.iss, active: true },
  });
  if (!reg) throw new LtiError(400, `No LTI registration found for issuer: ${params.iss}`);

  const nonce = crypto.randomBytes(16).toString("hex");
  const state = crypto.randomBytes(16).toString("hex");

  await prisma.ltiSession.create({
    data: {
      registrationId: reg.id,
      nonce,
      state,
      targetLinkUri: params.targetLinkUri,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  const redirectUri = `${appBaseUrl}/lti/launch`;
  const url = new URL(reg.authEndpoint);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("response_type", "id_token");
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("prompt", "none");
  url.searchParams.set("client_id", reg.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("login_hint", params.loginHint);
  if (params.ltiMessageHint) url.searchParams.set("lti_message_hint", params.ltiMessageHint);

  return { redirectUrl: url.toString() };
}

// ── DB-backed launch handler ──────────────────────────────────────────────────

export interface LaunchResult {
  sub: string;
  email?: string;
  name?: string;
  roles: string[];
  courseId?: string;
  courseTitle?: string;
  assignmentId?: string;
  lineItemUrl?: string;
  scoreMaximum?: number;
  deepLinkReturnUrl?: string;
  registrationId: string;
  ltiSessionId: string;
  organizationId: string;
}

export async function handleLaunch(idToken: string, state: string): Promise<LaunchResult> {
  const ltiSession = await prisma.ltiSession.findUnique({ where: { state } });
  if (!ltiSession) throw new LtiError(400, "Unknown or expired LTI state");
  if (ltiSession.expiresAt < new Date()) {
    await prisma.ltiSession.delete({ where: { id: ltiSession.id } });
    throw new LtiError(400, "LTI OIDC session expired — please launch again");
  }

  const reg = await prisma.ltiRegistration.findUnique({ where: { id: ltiSession.registrationId } });
  if (!reg) throw new LtiError(400, "LTI registration not found");

  // Decode without verification first (to get kid/iss)
  const claims = LtiService.parseIdToken(idToken);

  // Nonce check
  if (claims.nonce !== ltiSession.nonce) throw new LtiError(400, "Nonce mismatch");

  // iss / aud checks
  if (claims.iss !== reg.platformIss) throw new LtiError(400, "iss mismatch");
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(reg.clientId)) throw new LtiError(400, "aud does not include client_id");

  // Verify signature against platform JWKS
  await verifyJwtSignature(idToken, reg.jwksUrl);

  // deployment_id check
  const allowedDeployments = reg.deploymentIds.split(",").map(s => s.trim()).filter(Boolean);
  if (allowedDeployments.length > 0 && !allowedDeployments.includes(claims.deploymentId)) {
    throw new LtiError(403, `deployment_id ${claims.deploymentId} not registered`);
  }

  const lineItemUrl = claims.ags?.lineitem;
  const scoreMaximum = claims.ags?.scoreMaximum;

  await prisma.ltiSession.update({
    where: { id: ltiSession.id },
    data: {
      platformUserId: claims.sub,
      platformCourseId: claims.context?.id,
      platformCourseTitle: claims.context?.title,
      lineItemUrl,
      scoreMaximum,
      launchedAt: new Date(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
  });

  return {
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    roles: claims.roles,
    courseId: claims.context?.id,
    courseTitle: claims.context?.title,
    assignmentId: claims.resourceLink?.id,
    lineItemUrl,
    scoreMaximum,
    deepLinkReturnUrl: claims.deepLinking?.deepLinkReturnUrl,
    registrationId: reg.id,
    ltiSessionId: ltiSession.id,
    organizationId: reg.organizationId,
  };
}

// ── Grade passback ────────────────────────────────────────────────────────────

export async function sendGradePassback(opts: {
  ltiSessionId: string;
  scoreGiven: number;
  comment?: string;
}) {
  const ltiSession = await prisma.ltiSession.findUnique({ where: { id: opts.ltiSessionId } });
  if (!ltiSession?.lineItemUrl || !ltiSession.platformUserId) return;

  const reg = await prisma.ltiRegistration.findUnique({ where: { id: ltiSession.registrationId } });
  if (!reg) return;

  const accessToken = await getAgsAccessToken(reg);
  const scoreUrl = ltiSession.lineItemUrl.endsWith("/scores")
    ? ltiSession.lineItemUrl
    : `${ltiSession.lineItemUrl}/scores`;

  const payload = {
    userId: ltiSession.platformUserId,
    scoreGiven: opts.scoreGiven,
    scoreMaximum: ltiSession.scoreMaximum ?? 1,
    activityProgress: "Completed",
    gradingProgress: "FullyGraded",
    timestamp: new Date().toISOString(),
    comment: opts.comment,
  };

  const res = await fetch(scoreUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.ims.lis.v1.score+json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[LTI] AGS score passback failed ${res.status}: ${body}`);
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getAgsAccessToken(reg: { tokenEndpoint: string; clientId: string }): Promise<string> {
  const { privateKey, kid } = getToolKeyPair();
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = Buffer.from(JSON.stringify({ alg: "RS256", kid, typ: "JWT" })).toString("base64url");
  const jwtPayload = Buffer.from(JSON.stringify({
    iss: reg.clientId,
    sub: reg.clientId,
    aud: reg.tokenEndpoint,
    iat: now,
    exp: now + 300,
    jti: crypto.randomUUID(),
  })).toString("base64url");
  const signingInput = `${jwtHeader}.${jwtPayload}`;
  const sig = crypto.sign("sha256", Buffer.from(signingInput), privateKey);
  const clientAssertion = `${signingInput}.${sig.toString("base64url")}`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: clientAssertion,
    scope: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
  });

  const res = await fetch(reg.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`LTI token endpoint error ${res.status}`);
  const json = await res.json() as { access_token: string };
  return json.access_token;
}

const jwksCache: Record<string, { keys: any[]; fetchedAt: number }> = {};

async function verifyJwtSignature(idToken: string, jwksUrl: string) {
  const parts = idToken.split(".");
  let header: Record<string, string>;
  try { header = JSON.parse(Buffer.from(parts[0], "base64url").toString()); }
  catch { throw new LtiError(400, "Could not decode id_token header"); }

  const kid: string | undefined = header.kid;
  const cached = jwksCache[jwksUrl];
  let keys = cached && Date.now() - cached.fetchedAt < 3_600_000 ? cached.keys : null;

  if (!keys) {
    const res = await fetch(jwksUrl);
    if (!res.ok) throw new LtiError(502, "Could not fetch platform JWKS");
    const json = await res.json() as { keys: any[] };
    keys = json.keys;
    jwksCache[jwksUrl] = { keys, fetchedAt: Date.now() };
  }

  const matchingKey = kid ? keys.find((k: any) => k.kid === kid) : keys[0];
  if (!matchingKey) throw new LtiError(400, `No JWK found for kid: ${kid}`);

  const publicKey = crypto.createPublicKey({ key: matchingKey, format: "jwk" });
  const signingInput = `${parts[0]}.${parts[1]}`;
  const signature = Buffer.from(parts[2], "base64url");
  const valid = crypto.verify("sha256", Buffer.from(signingInput), publicKey, signature);
  if (!valid) throw new LtiError(401, "id_token signature verification failed");
}

export class LtiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "LtiError";
  }
}
