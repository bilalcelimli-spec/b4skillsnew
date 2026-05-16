/**
 * OIDC SSO Service — Authorization Code Flow
 *
 * Implements OpenID Connect Authorization Code Flow for enterprise Single
 * Sign-On. Supports the three major identity providers used by universities
 * and corporations:
 *
 *   - Azure Active Directory / Microsoft Entra ID
 *   - Google Workspace (formerly G Suite)
 *   - Okta (generic OIDC)
 *   - Generic OIDC (any RFC 6749 + OIDC Core compliant IdP)
 *
 * Flow:
 *   1. GET  /api/auth/sso/authorize?org=<orgId>
 *      → Redirects to IdP with code_challenge (PKCE S256)
 *
 *   2. GET  /api/auth/sso/callback?code=<code>&state=<state>
 *      → Exchanges code for tokens, validates ID token,
 *        provisions/maps user, issues platform JWT
 *
 * Security
 * --------
 * - PKCE (RFC 7636) S256 — prevents authorization code interception attacks
 * - State parameter — CSRF protection
 * - Nonce in ID token — replay protection
 * - ID token validation: iss, aud, exp, nonce claims checked
 * - Access tokens are NOT stored — only the platform-issued JWT is kept
 *
 * References
 * ----------
 * OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
 * RFC 7636 PKCE: https://www.rfc-editor.org/rfc/rfc7636
 * Microsoft OIDC: https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc
 */

import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OidcProvider = "azure" | "google" | "okta" | "generic";

export interface OidcProviderConfig {
  provider: OidcProvider;
  /** Organization ID this config belongs to */
  organizationId: string;
  /** Client ID registered with the IdP */
  clientId: string;
  /** Client secret (confidential clients only) */
  clientSecret: string;
  /** OIDC issuer URL (used to discover endpoints) */
  issuer: string;
  /** Authorization endpoint URL */
  authorizationEndpoint: string;
  /** Token endpoint URL */
  tokenEndpoint: string;
  /** JWKS endpoint URL (for ID token verification) */
  jwksEndpoint: string;
  /** UserInfo endpoint URL (optional) */
  userInfoEndpoint?: string;
  /** Requested scopes — always includes "openid email profile" */
  additionalScopes?: string[];
  /** Attribute mapping: IdP claim → platform field */
  claimMapping?: {
    email?: string;      // default: "email"
    name?: string;       // default: "name"
    firstName?: string;  // default: "given_name"
    lastName?: string;   // default: "family_name"
    role?: string;       // optional: map IdP group claim to platform role
  };
  /** Role mapping: IdP role/group value → platform role */
  roleMapping?: Record<string, string>;
}

export interface OidcAuthorizationRequest {
  /** Redirect URL to send the user to after initiating login */
  authorizationUrl: string;
  /** State token — must be stored in session/cookie */
  state: string;
  /** Code verifier — must be stored in session/cookie for PKCE exchange */
  codeVerifier: string;
  /** Nonce — must be stored to verify in ID token */
  nonce: string;
}

export interface OidcIdTokenClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  /** Azure AD specific */
  preferred_username?: string;
  /** Okta/generic groups claim */
  groups?: string[];
  [key: string]: unknown;
}

export interface OidcUserProfile {
  /** External identity provider subject (for linking) */
  externalId: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  /** Platform role resolved from IdP claims */
  resolvedRole?: string;
  /** Raw ID token claims (for audit) */
  rawClaims: OidcIdTokenClaims;
}

export interface PendingOidcState {
  organizationId: string;
  codeVerifier: string;
  nonce: string;
  redirectAfterLogin?: string;
  expiresAt: number;
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

/**
 * Generate a PKCE code verifier (43–128 random URL-safe characters).
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString("base64url").slice(0, 128);
}

/**
 * Compute the PKCE code challenge (S256 method).
 * challenge = BASE64URL(SHA256(ASCII(verifier)))
 */
export function computeCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier, "ascii").digest("base64url");
}

// ─── State store (in-process; replace with Redis/DB in production) ────────────

const STATE_TTL_MS = 10 * 60 * 1000;
const oidcPendingStates = new Map<string, PendingOidcState>();

function purgeExpiredOidcStates(): void {
  const now = Date.now();
  for (const [k, v] of oidcPendingStates) {
    if (v.expiresAt < now) oidcPendingStates.delete(k);
  }
}

// ─── Well-known discovery cache ───────────────────────────────────────────────

const discoveryCache = new Map<string, Record<string, unknown>>();

/**
 * Build a static config for well-known providers to avoid discovery lookups
 * in environments where fetch is unavailable.
 */
function getStaticProviderConfig(provider: OidcProvider, tenantId?: string): Partial<OidcProviderConfig> {
  switch (provider) {
    case "azure":
      return {
        authorizationEndpoint: `https://login.microsoftonline.com/${tenantId ?? "common"}/oauth2/v2.0/authorize`,
        tokenEndpoint: `https://login.microsoftonline.com/${tenantId ?? "common"}/oauth2/v2.0/token`,
        jwksEndpoint: `https://login.microsoftonline.com/${tenantId ?? "common"}/discovery/v2.0/keys`,
        issuer: `https://login.microsoftonline.com/${tenantId ?? "common"}/v2.0`,
      };
    case "google":
      return {
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        jwksEndpoint: "https://www.googleapis.com/oauth2/v3/certs",
        issuer: "https://accounts.google.com",
      };
    default:
      return {};
  }
}

// ─── Core service ─────────────────────────────────────────────────────────────

export const OidcSsoService = {
  /**
   * Build the authorization URL and PKCE state for the login redirect.
   * Call this from GET /api/auth/sso/authorize.
   */
  initiateAuthorizationRequest(
    config: OidcProviderConfig,
    callbackUrl: string,
    redirectAfterLogin?: string
  ): OidcAuthorizationRequest {
    purgeExpiredOidcStates();

    const state = crypto.randomBytes(32).toString("hex");
    const nonce = crypto.randomBytes(32).toString("hex");
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = computeCodeChallenge(codeVerifier);

    oidcPendingStates.set(state, {
      organizationId: config.organizationId,
      codeVerifier,
      nonce,
      redirectAfterLogin,
      expiresAt: Date.now() + STATE_TTL_MS,
    });

    const scopes = ["openid", "email", "profile", ...(config.additionalScopes ?? [])];

    const url = new URL(config.authorizationEndpoint);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", callbackUrl);
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    // Force account selection for multi-tenant providers
    url.searchParams.set("prompt", "select_account");

    return { authorizationUrl: url.toString(), state, codeVerifier, nonce };
  },

  /**
   * Consume the OIDC state and return stored PKCE / nonce values.
   * Returns null if state is invalid or expired.
   */
  consumeState(state: string): PendingOidcState | null {
    const stored = oidcPendingStates.get(state);
    if (!stored) return null;
    if (stored.expiresAt < Date.now()) {
      oidcPendingStates.delete(state);
      return null;
    }
    oidcPendingStates.delete(state);
    return stored;
  },

  /**
   * Build the token exchange request body for the callback handler.
   * The caller must POST this to config.tokenEndpoint.
   */
  buildTokenExchangeBody(
    config: OidcProviderConfig,
    code: string,
    codeVerifier: string,
    callbackUrl: string
  ): URLSearchParams {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: codeVerifier,
    });
    return body;
  },

  /**
   * Parse and validate an OIDC ID token JWT.
   * Validates: structure, exp, iat, iss, aud, nonce.
   * Signature verification must be done by the caller using the JWKS endpoint
   * (jose library recommended for production).
   *
   * @throws Error on any validation failure
   */
  parseAndValidateIdToken(
    idToken: string,
    config: OidcProviderConfig,
    expectedNonce: string
  ): OidcIdTokenClaims {
    const parts = idToken.split(".");
    if (parts.length !== 3) throw new Error("ID token must be a three-part JWT");

    let claims: OidcIdTokenClaims;
    try {
      claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as OidcIdTokenClaims;
    } catch {
      throw new Error("ID token payload is not valid JSON");
    }

    const now = Math.floor(Date.now() / 1000);

    if (!claims.exp || claims.exp < now) {
      throw new Error("ID token is expired");
    }
    if (!claims.iat || claims.iat > now + 60) {
      throw new Error("ID token issued-at is in the future (clock skew > 60s)");
    }

    // iss validation — Azure uses tenant-specific issuers; relax for "common" endpoint
    const issuer = config.issuer.replace("{tenantid}", "");
    if (!claims.iss.startsWith(issuer.replace("common", "").replace("organizations", ""))) {
      // Only enforce strict iss check for non-tenant-wildcard providers
      if (config.provider !== "azure" || !config.issuer.includes("common")) {
        throw new Error(`ID token issuer mismatch: expected ${config.issuer}, got ${claims.iss}`);
      }
    }

    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(config.clientId)) {
      throw new Error(`ID token audience does not include client_id: ${aud.join(",")}`);
    }

    if (claims.nonce !== expectedNonce) {
      throw new Error("ID token nonce mismatch — possible replay attack");
    }

    return claims;
  },

  /**
   * Extract a normalised user profile from OIDC ID token claims,
   * applying the organisation's claim mapping and role mapping.
   */
  extractUserProfile(
    claims: OidcIdTokenClaims,
    config: OidcProviderConfig
  ): OidcUserProfile {
    const mapping = config.claimMapping ?? {};

    const email = String(
      claims[mapping.email ?? "email"] ??
      claims["preferred_username"] ??
      claims["upn"] ??
      ""
    );

    const name = String(
      claims[mapping.name ?? "name"] ??
      `${claims["given_name"] ?? ""} ${claims["family_name"] ?? ""}`.trim() ??
      email.split("@")[0]
    );

    const firstName = mapping.firstName
      ? String(claims[mapping.firstName] ?? "")
      : String(claims["given_name"] ?? "");

    const lastName = mapping.lastName
      ? String(claims[mapping.lastName] ?? "")
      : String(claims["family_name"] ?? "");

    // Role resolution
    let resolvedRole: string | undefined;
    if (config.roleMapping && mapping.role) {
      const roleClaimValue = String(claims[mapping.role] ?? "");
      resolvedRole = config.roleMapping[roleClaimValue];
    }
    // Also check groups claim
    if (!resolvedRole && config.roleMapping && Array.isArray(claims.groups)) {
      for (const group of claims.groups) {
        const mapped = config.roleMapping[group];
        if (mapped) { resolvedRole = mapped; break; }
      }
    }

    return {
      externalId: `${config.provider}:${claims.sub}`,
      email,
      name,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      picture: String(claims["picture"] ?? ""),
      resolvedRole,
      rawClaims: claims,
    };
  },

  /**
   * Get static provider config for well-known providers.
   * Useful for pre-filling form fields in the org SSO configuration UI.
   */
  getStaticDefaults(provider: OidcProvider, tenantId?: string): Partial<OidcProviderConfig> {
    return getStaticProviderConfig(provider, tenantId);
  },

  /**
   * Validate that an OidcProviderConfig has all required fields.
   */
  validateConfig(config: Partial<OidcProviderConfig>): { valid: boolean; missing: string[] } {
    const required: (keyof OidcProviderConfig)[] = [
      "organizationId", "clientId", "clientSecret",
      "authorizationEndpoint", "tokenEndpoint", "jwksEndpoint",
    ];
    const missing = required.filter(f => !config[f]);
    return { valid: missing.length === 0, missing };
  },

  /** Reset state store — for tests only */
  _resetForTests(): void {
    oidcPendingStates.clear();
  },
};
