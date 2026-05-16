/**
 * OIDC SSO Service — Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  OidcSsoService,
  generateCodeVerifier,
  computeCodeChallenge,
  type OidcProviderConfig,
  type OidcIdTokenClaims,
} from "../oidc-sso.js";

const BASE_CONFIG: OidcProviderConfig = {
  provider: "generic",
  organizationId: "org-test-001",
  clientId: "client-abc-123",
  clientSecret: "super-secret",
  issuer: "https://idp.example.com",
  authorizationEndpoint: "https://idp.example.com/oauth2/authorize",
  tokenEndpoint: "https://idp.example.com/oauth2/token",
  jwksEndpoint: "https://idp.example.com/.well-known/jwks.json",
};

const CALLBACK_URL = "https://app.b4skills.com/api/auth/sso/callback";

beforeEach(() => {
  OidcSsoService._resetForTests();
});

// ─── PKCE helpers ──────────────────────────────────────────────────────────────

describe("generateCodeVerifier()", () => {
  it("returns a string of 43–128 URL-safe characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(/^[A-Za-z0-9\-._~]+$/.test(verifier) || /^[A-Za-z0-9_-]+$/.test(verifier)).toBe(true);
  });

  it("generates unique verifiers on each call", () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    expect(v1).not.toBe(v2);
  });
});

describe("computeCodeChallenge()", () => {
  it("produces a base64url string (no padding = chars)", () => {
    const challenge = computeCodeChallenge("test-verifier");
    expect(challenge).not.toContain("=");
    expect(challenge).not.toContain("+");
    expect(challenge).not.toContain("/");
  });

  it("is deterministic for the same verifier", () => {
    const v = generateCodeVerifier();
    expect(computeCodeChallenge(v)).toBe(computeCodeChallenge(v));
  });

  it("produces different challenges for different verifiers", () => {
    expect(computeCodeChallenge("abc")).not.toBe(computeCodeChallenge("xyz"));
  });
});

// ─── initiateAuthorizationRequest ─────────────────────────────────────────────

describe("OidcSsoService.initiateAuthorizationRequest()", () => {
  it("returns an authorizationUrl pointing to the IdP", () => {
    const req = OidcSsoService.initiateAuthorizationRequest(BASE_CONFIG, CALLBACK_URL);
    expect(req.authorizationUrl).toContain("idp.example.com");
    expect(req.authorizationUrl).toContain("authorize");
  });

  it("includes all required OIDC parameters in the URL", () => {
    const req = OidcSsoService.initiateAuthorizationRequest(BASE_CONFIG, CALLBACK_URL);
    const url = new URL(req.authorizationUrl);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe(BASE_CONFIG.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(CALLBACK_URL);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe(req.state);
    expect(url.searchParams.get("nonce")).toBe(req.nonce);
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
  });

  it("includes openid, email, profile scopes", () => {
    const req = OidcSsoService.initiateAuthorizationRequest(BASE_CONFIG, CALLBACK_URL);
    const url = new URL(req.authorizationUrl);
    const scope = url.searchParams.get("scope") ?? "";
    expect(scope).toContain("openid");
    expect(scope).toContain("email");
    expect(scope).toContain("profile");
  });

  it("appends additional scopes when configured", () => {
    const cfg = { ...BASE_CONFIG, additionalScopes: ["offline_access", "groups"] };
    const req = OidcSsoService.initiateAuthorizationRequest(cfg, CALLBACK_URL);
    const url = new URL(req.authorizationUrl);
    const scope = url.searchParams.get("scope") ?? "";
    expect(scope).toContain("offline_access");
    expect(scope).toContain("groups");
  });

  it("generates unique state and nonce on each call", () => {
    const r1 = OidcSsoService.initiateAuthorizationRequest(BASE_CONFIG, CALLBACK_URL);
    const r2 = OidcSsoService.initiateAuthorizationRequest(BASE_CONFIG, CALLBACK_URL);
    expect(r1.state).not.toBe(r2.state);
    expect(r1.nonce).not.toBe(r2.nonce);
  });
});

// ─── consumeState ──────────────────────────────────────────────────────────────

describe("OidcSsoService.consumeState()", () => {
  it("returns the stored pending state on valid state", () => {
    const req = OidcSsoService.initiateAuthorizationRequest(BASE_CONFIG, CALLBACK_URL);
    const pending = OidcSsoService.consumeState(req.state);
    expect(pending).not.toBeNull();
    expect(pending!.organizationId).toBe(BASE_CONFIG.organizationId);
    expect(pending!.nonce).toBe(req.nonce);
    expect(pending!.codeVerifier).toBe(req.codeVerifier);
  });

  it("returns null for unknown state", () => {
    expect(OidcSsoService.consumeState("not-a-real-state")).toBeNull();
  });

  it("state is consumed and cannot be reused (replay protection)", () => {
    const req = OidcSsoService.initiateAuthorizationRequest(BASE_CONFIG, CALLBACK_URL);
    OidcSsoService.consumeState(req.state);
    expect(OidcSsoService.consumeState(req.state)).toBeNull();
  });

  it("stores redirectAfterLogin when provided", () => {
    const req = OidcSsoService.initiateAuthorizationRequest(
      BASE_CONFIG,
      CALLBACK_URL,
      "/dashboard"
    );
    const pending = OidcSsoService.consumeState(req.state);
    expect(pending!.redirectAfterLogin).toBe("/dashboard");
  });
});

// ─── buildTokenExchangeBody ────────────────────────────────────────────────────

describe("OidcSsoService.buildTokenExchangeBody()", () => {
  it("returns URLSearchParams with required fields", () => {
    const body = OidcSsoService.buildTokenExchangeBody(
      BASE_CONFIG,
      "auth-code-xyz",
      "verifier-abc",
      CALLBACK_URL
    );
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code-xyz");
    expect(body.get("redirect_uri")).toBe(CALLBACK_URL);
    expect(body.get("client_id")).toBe(BASE_CONFIG.clientId);
    expect(body.get("client_secret")).toBe(BASE_CONFIG.clientSecret);
    expect(body.get("code_verifier")).toBe("verifier-abc");
  });
});

// ─── parseAndValidateIdToken ───────────────────────────────────────────────────

describe("OidcSsoService.parseAndValidateIdToken()", () => {
  function buildJwt(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${header}.${body}.fakesig`;
  }

  const now = Math.floor(Date.now() / 1000);

  const validPayload: OidcIdTokenClaims = {
    iss: "https://idp.example.com",
    sub: "user-sub-123",
    aud: BASE_CONFIG.clientId,
    exp: now + 600,
    iat: now,
    nonce: "expected-nonce",
    email: "user@example.com",
    name: "Test User",
  };

  it("parses and returns valid claims", () => {
    const jwt = buildJwt(validPayload);
    const claims = OidcSsoService.parseAndValidateIdToken(jwt, BASE_CONFIG, "expected-nonce");
    expect(claims.sub).toBe("user-sub-123");
    expect(claims.email).toBe("user@example.com");
  });

  it("throws on malformed JWT (not 3 parts)", () => {
    expect(() =>
      OidcSsoService.parseAndValidateIdToken("only.two", BASE_CONFIG, "n")
    ).toThrow("three-part");
  });

  it("throws on expired token", () => {
    const expired = { ...validPayload, exp: now - 100 };
    const jwt = buildJwt(expired);
    expect(() =>
      OidcSsoService.parseAndValidateIdToken(jwt, BASE_CONFIG, "expected-nonce")
    ).toThrow("expired");
  });

  it("throws on future iat (clock skew > 60s)", () => {
    const future = { ...validPayload, iat: now + 120 };
    const jwt = buildJwt(future);
    expect(() =>
      OidcSsoService.parseAndValidateIdToken(jwt, BASE_CONFIG, "expected-nonce")
    ).toThrow("future");
  });

  it("throws on audience mismatch", () => {
    const wrongAud = { ...validPayload, aud: "different-client" };
    const jwt = buildJwt(wrongAud);
    expect(() =>
      OidcSsoService.parseAndValidateIdToken(jwt, BASE_CONFIG, "expected-nonce")
    ).toThrow(/audience/i);
  });

  it("throws on nonce mismatch", () => {
    const jwt = buildJwt(validPayload);
    expect(() =>
      OidcSsoService.parseAndValidateIdToken(jwt, BASE_CONFIG, "wrong-nonce")
    ).toThrow(/nonce/i);
  });

  it("accepts aud as array containing the client_id", () => {
    const arrayAud = { ...validPayload, aud: [BASE_CONFIG.clientId, "other-client"] };
    const jwt = buildJwt(arrayAud);
    expect(() =>
      OidcSsoService.parseAndValidateIdToken(jwt, BASE_CONFIG, "expected-nonce")
    ).not.toThrow();
  });
});

// ─── extractUserProfile ────────────────────────────────────────────────────────

describe("OidcSsoService.extractUserProfile()", () => {
  const claims: OidcIdTokenClaims = {
    iss: "https://idp.example.com",
    sub: "user-sub-456",
    aud: BASE_CONFIG.clientId,
    exp: Math.floor(Date.now() / 1000) + 600,
    iat: Math.floor(Date.now() / 1000),
    nonce: "n",
    email: "john.doe@example.com",
    name: "John Doe",
    given_name: "John",
    family_name: "Doe",
    picture: "https://photos.example.com/john.jpg",
  };

  it("extracts email and name from standard claims", () => {
    const profile = OidcSsoService.extractUserProfile(claims, BASE_CONFIG);
    expect(profile.email).toBe("john.doe@example.com");
    expect(profile.name).toBe("John Doe");
  });

  it("sets externalId as provider:sub", () => {
    const profile = OidcSsoService.extractUserProfile(claims, BASE_CONFIG);
    expect(profile.externalId).toBe(`generic:user-sub-456`);
  });

  it("extracts firstName and lastName", () => {
    const profile = OidcSsoService.extractUserProfile(claims, BASE_CONFIG);
    expect(profile.firstName).toBe("John");
    expect(profile.lastName).toBe("Doe");
  });

  it("resolves role from groups claim when roleMapping configured", () => {
    const cfg: OidcProviderConfig = {
      ...BASE_CONFIG,
      claimMapping: { role: "custom_role" },
      roleMapping: { teacher: "INSTRUCTOR", student: "LEARNER" },
    };
    const claimsWithRole = { ...claims, custom_role: "teacher" };
    const profile = OidcSsoService.extractUserProfile(claimsWithRole, cfg);
    expect(profile.resolvedRole).toBe("INSTRUCTOR");
  });

  it("resolves role from groups array", () => {
    const cfg: OidcProviderConfig = {
      ...BASE_CONFIG,
      roleMapping: { "sg-instructors": "INSTRUCTOR" },
    };
    const claimsWithGroups = { ...claims, groups: ["sg-users", "sg-instructors"] };
    const profile = OidcSsoService.extractUserProfile(claimsWithGroups, cfg);
    expect(profile.resolvedRole).toBe("INSTRUCTOR");
  });
});

// ─── validateConfig ────────────────────────────────────────────────────────────

describe("OidcSsoService.validateConfig()", () => {
  it("returns valid for a complete config", () => {
    const result = OidcSsoService.validateConfig(BASE_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("reports missing fields", () => {
    const partial = { organizationId: "org-1", clientId: "client-1" };
    const result = OidcSsoService.validateConfig(partial);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("clientSecret");
    expect(result.missing).toContain("authorizationEndpoint");
    expect(result.missing).toContain("tokenEndpoint");
  });
});

// ─── getStaticDefaults ─────────────────────────────────────────────────────────

describe("OidcSsoService.getStaticDefaults()", () => {
  it("returns Azure AD endpoints for provider=azure", () => {
    const defaults = OidcSsoService.getStaticDefaults("azure", "my-tenant-id");
    expect(defaults.authorizationEndpoint).toContain("microsoftonline.com");
    expect(defaults.authorizationEndpoint).toContain("my-tenant-id");
  });

  it("returns Google endpoints for provider=google", () => {
    const defaults = OidcSsoService.getStaticDefaults("google");
    expect(defaults.authorizationEndpoint).toContain("accounts.google.com");
  });

  it("returns empty for unknown provider", () => {
    const defaults = OidcSsoService.getStaticDefaults("okta");
    expect(Object.keys(defaults).length).toBe(0);
  });
});
