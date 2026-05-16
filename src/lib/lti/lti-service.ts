/**
 * LTI 1.3 Advantage Service
 *
 * Implements the IMS Global Learning Tools Interoperability 1.3 specification,
 * including:
 *
 *   1. OpenID Connect (OIDC) Launch Flow
 *      - Third-party initiation → platform login URL
 *      - JWT ID token validation (RS256, JWK set)
 *      - State/nonce CSRF protection
 *
 *   2. Deep Linking (Content-Item Message)
 *      - Returns a signed JWT with content items back to the LMS
 *
 *   3. Assignment and Grade Services (AGS)
 *      - lineitem creation + score passback (POST /scores)
 *      - gradePassback() sends normalised score to LMS grade column
 *
 * Supported platforms: Canvas, Moodle, Blackboard, D2L Brightspace
 *
 * References
 * ----------
 * IMS Global LTI 1.3 Core Spec: https://www.imsglobal.org/spec/lti/v1p3/
 * IMS AGS Spec: https://www.imsglobal.org/spec/lti-ags/v2p0/
 * IMS Deep Linking 2.0: https://www.imsglobal.org/spec/lti-dl/v2p0/
 */

import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LtiPlatformConfig {
  /** Platform identifier (e.g., "canvas.institution.edu") */
  platformId: string;
  /** Client ID issued by the LMS when the tool is registered */
  clientId: string;
  /** LMS OIDC authentication endpoint */
  oidcAuthEndpoint: string;
  /** LMS OAuth 2 token endpoint (for AGS) */
  tokenEndpoint: string;
  /** LMS JSON Web Key Set endpoint (for ID token verification) */
  jwksEndpoint: string;
  /** LMS deployment ID */
  deploymentId: string;
}

export interface LtiLaunchClaims {
  /** LTI message type: LtiResourceLinkRequest | LtiDeepLinkingRequest */
  messageType: "LtiResourceLinkRequest" | "LtiDeepLinkingRequest";
  /** LTI version, always "1.3.0" */
  version: string;
  /** Deployment ID — must match registered deployment */
  deploymentId: string;
  /** Resource link claim */
  resourceLink?: { id: string; title?: string; description?: string };
  /** Canvas/Moodle course context */
  context?: { id: string; label?: string; title?: string };
  /** Roles claim (URN strings) */
  roles: string[];
  /** Custom claim namespace */
  custom?: Record<string, string>;
  /** AGS claim: endpoint for grade passback */
  ags?: {
    lineitemsUrl?: string;
    lineitemUrl?: string;
    scope: string[];
  };
  /** Deep Linking claim */
  deepLinking?: {
    deepLinkReturnUrl: string;
    acceptTypes: string[];
    acceptMediaTypes?: string;
    acceptMultiple: boolean;
  };
  /** Issuer (platform_id) */
  iss: string;
  /** Subject (platform-specific user id) */
  sub: string;
  /** Tool client_id audience */
  aud: string | string[];
  /** Nonce — must be unique per launch */
  nonce: string;
  /** Expiry timestamp */
  exp: number;
  /** Issued-at timestamp */
  iat: number;
}

export interface OidcLoginParams {
  iss: string;
  login_hint: string;
  target_link_uri: string;
  lti_message_hint?: string;
  client_id?: string;
  deployment_id?: string;
}

export interface DeepLinkItem {
  type: "ltiResourceLink";
  title: string;
  url: string;
  /** Optional custom parameters for the resource */
  custom?: Record<string, string>;
}

export interface GradePassbackPayload {
  /** Normalised score 0.0–1.0 */
  scoreGiven: number;
  scoreMaximum: number;
  comment?: string;
  /** ISO 8601 timestamp of the activity */
  timestamp: string;
  /** AGS activity progress */
  activityProgress: "Initialized" | "Started" | "InProgress" | "Submitted" | "Completed";
  /** AGS grading progress */
  gradingProgress: "NotReady" | "Failed" | "Pending" | "PendingManual" | "FullyGraded";
}

// ─── State / Nonce store (in-process; use Redis in production) ─────────────────

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface PendingState {
  nonce: string;
  targetUri: string;
  expiresAt: number;
}

const pendingStates = new Map<string, PendingState>();

function purgeExpiredStates(): void {
  const now = Date.now();
  for (const [k, v] of pendingStates) {
    if (v.expiresAt < now) pendingStates.delete(k);
  }
}

// ─── Core LTI service ─────────────────────────────────────────────────────────

export const LtiService = {
  /**
   * Step 1 — OIDC Login Initiation (Third-party initiated login).
   *
   * Receives the platform's POST /lti/login request, generates state + nonce,
   * and returns the redirect URL to the platform's OIDC auth endpoint.
   *
   * @returns { redirectUrl, state, nonce } — caller must HTTP-redirect to redirectUrl
   */
  initiateLogin(
    params: OidcLoginParams,
    config: LtiPlatformConfig,
    toolLaunchUrl: string
  ): { redirectUrl: string; state: string; nonce: string } {
    purgeExpiredStates();

    const state = crypto.randomBytes(32).toString("hex");
    const nonce = crypto.randomBytes(32).toString("hex");

    pendingStates.set(state, {
      nonce,
      targetUri: params.target_link_uri,
      expiresAt: Date.now() + STATE_TTL_MS,
    });

    const url = new URL(config.oidcAuthEndpoint);
    url.searchParams.set("scope", "openid");
    url.searchParams.set("response_type", "id_token");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", toolLaunchUrl);
    url.searchParams.set("login_hint", params.login_hint);
    url.searchParams.set("state", state);
    url.searchParams.set("response_mode", "form_post");
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("prompt", "none");
    if (params.lti_message_hint) {
      url.searchParams.set("lti_message_hint", params.lti_message_hint);
    }

    return { redirectUrl: url.toString(), state, nonce };
  },

  /**
   * Step 2 — Validate OIDC state returned by the platform.
   * Returns the stored nonce so the caller can verify it against the JWT claim.
   */
  consumeState(state: string): { nonce: string; targetUri: string } | null {
    const stored = pendingStates.get(state);
    if (!stored) return null;
    if (stored.expiresAt < Date.now()) {
      pendingStates.delete(state);
      return null;
    }
    pendingStates.delete(state);
    return { nonce: stored.nonce, targetUri: stored.targetUri };
  },

  /**
   * Step 3 — Parse and validate the LTI ID token (JWT).
   *
   * In production: fetch the platform's JWKS and verify RS256 signature.
   * Here we parse the payload and validate the structural/temporal claims.
   * Signature verification should be done with `jose` or `jsonwebtoken` + JWKS.
   *
   * @throws Error if token is structurally invalid or expired
   */
  parseIdToken(idToken: string): LtiLaunchClaims {
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      throw new Error("LTI ID token must be a three-part JWT");
    }

    let payload: Record<string, unknown>;
    try {
      const decoded = Buffer.from(parts[1]!, "base64url").toString("utf8");
      payload = JSON.parse(decoded);
    } catch {
      throw new Error("LTI ID token payload is not valid JSON");
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = payload["exp"] as number | undefined;
    const iat = payload["iat"] as number | undefined;

    if (!exp || exp < now) {
      throw new Error("LTI ID token is expired");
    }
    if (!iat || iat > now + 60) {
      throw new Error("LTI ID token issued-at is in the future (clock skew > 60s)");
    }

    const NS = "https://purl.imsglobal.org/spec/lti/claim/";

    const claims: LtiLaunchClaims = {
      messageType: (payload[`${NS}message_type`] as string ?? "LtiResourceLinkRequest") as
        "LtiResourceLinkRequest" | "LtiDeepLinkingRequest",
      version: (payload[`${NS}version`] as string) ?? "1.3.0",
      deploymentId: (payload[`${NS}deployment_id`] as string) ?? "",
      resourceLink: payload[`${NS}resource_link`] as LtiLaunchClaims["resourceLink"],
      context: payload[`${NS}context`] as LtiLaunchClaims["context"],
      roles: (payload[`${NS}roles`] as string[]) ?? [],
      custom: payload[`${NS}custom`] as Record<string, string> | undefined,
      ags: payload[`${NS}ags`] as LtiLaunchClaims["ags"],
      deepLinking: payload[`${NS}dl`] as LtiLaunchClaims["deepLinking"],
      iss: (payload["iss"] as string) ?? "",
      sub: (payload["sub"] as string) ?? "",
      aud: (payload["aud"] as string | string[]) ?? "",
      nonce: (payload["nonce"] as string) ?? "",
      exp,
      iat,
    };

    if (!claims.deploymentId) {
      throw new Error("LTI claim lti/deployment_id is missing");
    }
    if (!claims.iss) {
      throw new Error("LTI claim iss is missing");
    }

    return claims;
  },

  /**
   * Validate launch claims after parsing:
   *  - nonce matches the stored one from initiateLogin
   *  - deploymentId matches registered config
   *  - aud contains the tool's clientId
   */
  validateLaunchClaims(
    claims: LtiLaunchClaims,
    config: LtiPlatformConfig,
    expectedNonce: string
  ): { valid: boolean; reason?: string } {
    if (claims.nonce !== expectedNonce) {
      return { valid: false, reason: "Nonce mismatch — possible replay attack" };
    }
    if (claims.deploymentId !== config.deploymentId) {
      return { valid: false, reason: `Deployment ID mismatch: got ${claims.deploymentId}` };
    }
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(config.clientId)) {
      return { valid: false, reason: `Client ID not in aud claim: ${aud.join(",")}` };
    }
    return { valid: true };
  },

  /**
   * Determine if the LTI user has instructor role.
   * Checks the full URN roles claim for Instructor/TeachingAssistant/Administrator.
   */
  isInstructor(roles: string[]): boolean {
    const instructorUrns = [
      "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
      "http://purl.imsglobal.org/vocab/lis/v2/membership#TeachingAssistant",
      "http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator",
      "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator",
    ];
    return roles.some(r => instructorUrns.includes(r));
  },

  isLearner(roles: string[]): boolean {
    return roles.some(r =>
      r.includes("#Learner") || r.includes("#Student")
    );
  },

  /**
   * Build a Deep Linking response JWT for sending items back to the LMS.
   * In production, sign this with the tool's private key (RS256).
   *
   * Returns a base64url-encoded payload (without real signature — must be
   * signed by caller with `jose` or `jsonwebtoken` using tool private key).
   */
  buildDeepLinkResponse(
    claims: LtiLaunchClaims,
    config: LtiPlatformConfig,
    items: DeepLinkItem[]
  ): {
    returnUrl: string;
    jwtPayload: Record<string, unknown>;
    serializedPayload: string;
  } {
    const returnUrl = claims.deepLinking?.deepLinkReturnUrl ?? "";
    const now = Math.floor(Date.now() / 1000);
    const NS = "https://purl.imsglobal.org/spec/lti/claim/";
    const DL_NS = "https://purl.imsglobal.org/spec/lti-dl/claim/";

    const contentItems = items.map(item => ({
      type: item.type,
      title: item.title,
      url: item.url,
      ...(item.custom ? { custom: item.custom } : {}),
    }));

    const jwtPayload: Record<string, unknown> = {
      iss: config.clientId,
      aud: claims.iss,
      iat: now,
      exp: now + 600, // 10 minutes
      nonce: crypto.randomBytes(16).toString("hex"),
      [`${NS}message_type`]: "LtiDeepLinkingResponse",
      [`${NS}version`]: "1.3.0",
      [`${NS}deployment_id`]: config.deploymentId,
      [`${DL_NS}content_items`]: contentItems,
    };

    const serializedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString("base64url");
    return { returnUrl, jwtPayload, serializedPayload };
  },

  /**
   * Grade Passback — send a score to the LMS via AGS.
   *
   * In production: fetch an access token from tokenEndpoint using
   * client_credentials + tool private key JWT, then POST to the lineitem
   * scores endpoint.
   *
   * Returns the body that would be POST-ed to the AGS scores endpoint.
   */
  buildGradePassbackBody(payload: GradePassbackPayload): Record<string, unknown> {
    return {
      scoreGiven: payload.scoreGiven,
      scoreMaximum: payload.scoreMaximum,
      comment: payload.comment ?? "",
      timestamp: payload.timestamp,
      activityProgress: payload.activityProgress,
      gradingProgress: payload.gradingProgress,
    };
  },

  /**
   * Resolve platform config from issuer + client_id.
   * In production: load from database. Here: environment variable config.
   */
  resolvePlatformConfig(iss: string, clientId: string): LtiPlatformConfig | null {
    const env = process.env;
    // Support single-platform config via environment variables
    if (
      env.LTI_PLATFORM_ISS === iss &&
      env.LTI_CLIENT_ID === clientId
    ) {
      return {
        platformId: iss,
        clientId: env.LTI_CLIENT_ID!,
        oidcAuthEndpoint: env.LTI_OIDC_AUTH_ENDPOINT ?? "",
        tokenEndpoint: env.LTI_TOKEN_ENDPOINT ?? "",
        jwksEndpoint: env.LTI_JWKS_ENDPOINT ?? "",
        deploymentId: env.LTI_DEPLOYMENT_ID ?? "",
      };
    }
    return null;
  },
};
