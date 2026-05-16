/**
 * LTI 1.3 Service — Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LtiService,
  type LtiPlatformConfig,
  type OidcLoginParams,
  type LtiLaunchClaims,
  type DeepLinkItem,
} from "../lti-service.js";

const CONFIG: LtiPlatformConfig = {
  platformId: "canvas.university.edu",
  clientId: "test-client-123",
  oidcAuthEndpoint: "https://canvas.university.edu/api/lti/authorize_redirect",
  tokenEndpoint: "https://canvas.university.edu/login/oauth2/token",
  jwksEndpoint: "https://canvas.university.edu/api/lti/security/jwks",
  deploymentId: "deploy-456",
};

const LOGIN_PARAMS: OidcLoginParams = {
  iss: "https://canvas.university.edu",
  login_hint: "user-hint-abc",
  target_link_uri: "https://platform.b4skills.com/lti/launch",
  lti_message_hint: "msg-hint-xyz",
  client_id: "test-client-123",
};

// ─── initiateLogin ─────────────────────────────────────────────────────────────

describe("LtiService.initiateLogin", () => {
  it("returns a redirect URL pointing to the OIDC auth endpoint", () => {
    const { redirectUrl } = LtiService.initiateLogin(
      LOGIN_PARAMS,
      CONFIG,
      "https://platform.b4skills.com/lti/launch"
    );
    expect(redirectUrl).toContain("canvas.university.edu");
    expect(redirectUrl).toContain("authorize_redirect");
  });

  it("includes all required OIDC parameters", () => {
    const { redirectUrl, state, nonce } = LtiService.initiateLogin(
      LOGIN_PARAMS,
      CONFIG,
      "https://platform.b4skills.com/lti/launch"
    );
    const url = new URL(redirectUrl);
    expect(url.searchParams.get("response_type")).toBe("id_token");
    expect(url.searchParams.get("client_id")).toBe(CONFIG.clientId);
    expect(url.searchParams.get("scope")).toBe("openid");
    expect(url.searchParams.get("response_mode")).toBe("form_post");
    expect(url.searchParams.get("state")).toBe(state);
    expect(url.searchParams.get("nonce")).toBe(nonce);
    expect(url.searchParams.get("prompt")).toBe("none");
  });

  it("includes lti_message_hint when provided", () => {
    const { redirectUrl } = LtiService.initiateLogin(
      LOGIN_PARAMS,
      CONFIG,
      "https://platform.b4skills.com/lti/launch"
    );
    expect(redirectUrl).toContain("lti_message_hint");
  });

  it("generates unique state and nonce per call", () => {
    const r1 = LtiService.initiateLogin(LOGIN_PARAMS, CONFIG, "https://b4skills.com/lti/launch");
    const r2 = LtiService.initiateLogin(LOGIN_PARAMS, CONFIG, "https://b4skills.com/lti/launch");
    expect(r1.state).not.toBe(r2.state);
    expect(r1.nonce).not.toBe(r2.nonce);
  });
});

// ─── consumeState ─────────────────────────────────────────────────────────────

describe("LtiService.consumeState", () => {
  it("returns stored nonce and targetUri on valid state", () => {
    const { state, nonce } = LtiService.initiateLogin(
      LOGIN_PARAMS,
      CONFIG,
      "https://b4skills.com/lti/launch"
    );
    const result = LtiService.consumeState(state);
    expect(result).not.toBeNull();
    expect(result!.nonce).toBe(nonce);
    expect(result!.targetUri).toBe(LOGIN_PARAMS.target_link_uri);
  });

  it("returns null for unknown state", () => {
    expect(LtiService.consumeState("unknown-state-xyz")).toBeNull();
  });

  it("state is consumed and cannot be reused (replay protection)", () => {
    const { state } = LtiService.initiateLogin(LOGIN_PARAMS, CONFIG, "https://b4skills.com/lti/launch");
    LtiService.consumeState(state);
    // Second consumption of same state returns null
    expect(LtiService.consumeState(state)).toBeNull();
  });
});

// ─── parseIdToken ─────────────────────────────────────────────────────────────

describe("LtiService.parseIdToken", () => {
  function buildJwt(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${header}.${body}.fakesig`;
  }

  const NS = "https://purl.imsglobal.org/spec/lti/claim/";

  it("parses a valid LTI resource link request token", () => {
    const now = Math.floor(Date.now() / 1000);
    const jwt = buildJwt({
      iss: "https://canvas.edu",
      sub: "user-123",
      aud: "test-client-123",
      nonce: "nonce-abc",
      exp: now + 600,
      iat: now,
      [`${NS}message_type`]: "LtiResourceLinkRequest",
      [`${NS}version`]: "1.3.0",
      [`${NS}deployment_id`]: "deploy-456",
      [`${NS}roles`]: ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"],
    });

    const claims = LtiService.parseIdToken(jwt);
    expect(claims.messageType).toBe("LtiResourceLinkRequest");
    expect(claims.deploymentId).toBe("deploy-456");
    expect(claims.iss).toBe("https://canvas.edu");
    expect(claims.sub).toBe("user-123");
  });

  it("throws on expired token", () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    const jwt = buildJwt({
      iss: "https://canvas.edu",
      sub: "u1",
      aud: "c1",
      nonce: "n",
      exp: past,
      iat: past - 10,
      [`${NS}deployment_id`]: "d1",
    });
    expect(() => LtiService.parseIdToken(jwt)).toThrow("expired");
  });

  it("throws on malformed token (not 3 parts)", () => {
    expect(() => LtiService.parseIdToken("only.two")).toThrow("three-part");
  });

  it("throws on missing deployment_id", () => {
    const now = Math.floor(Date.now() / 1000);
    const jwt = buildJwt({ iss: "x", sub: "y", aud: "z", nonce: "n", exp: now + 600, iat: now });
    expect(() => LtiService.parseIdToken(jwt)).toThrow("deployment_id");
  });
});

// ─── validateLaunchClaims ─────────────────────────────────────────────────────

describe("LtiService.validateLaunchClaims", () => {
  const baseClaims: LtiLaunchClaims = {
    messageType: "LtiResourceLinkRequest",
    version: "1.3.0",
    deploymentId: "deploy-456",
    roles: [],
    iss: "https://canvas.university.edu",
    sub: "user-1",
    aud: "test-client-123",
    nonce: "expected-nonce",
    exp: Math.floor(Date.now() / 1000) + 600,
    iat: Math.floor(Date.now() / 1000),
  };

  it("returns valid for correct claims", () => {
    const result = LtiService.validateLaunchClaims(baseClaims, CONFIG, "expected-nonce");
    expect(result.valid).toBe(true);
  });

  it("rejects mismatched nonce", () => {
    const result = LtiService.validateLaunchClaims(baseClaims, CONFIG, "wrong-nonce");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/nonce/i);
  });

  it("rejects wrong deploymentId", () => {
    const claims = { ...baseClaims, deploymentId: "wrong-deploy" };
    const result = LtiService.validateLaunchClaims(claims, CONFIG, "expected-nonce");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/deployment/i);
  });

  it("rejects when clientId not in aud", () => {
    const claims = { ...baseClaims, aud: "other-client" };
    const result = LtiService.validateLaunchClaims(claims, CONFIG, "expected-nonce");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/aud/i);
  });

  it("accepts aud as array containing clientId", () => {
    const claims = { ...baseClaims, aud: ["test-client-123", "other"] };
    const result = LtiService.validateLaunchClaims(claims, CONFIG, "expected-nonce");
    expect(result.valid).toBe(true);
  });
});

// ─── role detection ───────────────────────────────────────────────────────────

describe("LtiService role detection", () => {
  it("identifies Instructor roles", () => {
    expect(LtiService.isInstructor([
      "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"
    ])).toBe(true);
  });

  it("identifies Learner roles", () => {
    expect(LtiService.isLearner([
      "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
    ])).toBe(true);
  });

  it("returns false for empty roles", () => {
    expect(LtiService.isInstructor([])).toBe(false);
    expect(LtiService.isLearner([])).toBe(false);
  });
});

// ─── buildDeepLinkResponse ────────────────────────────────────────────────────

describe("LtiService.buildDeepLinkResponse", () => {
  const dlClaims: LtiLaunchClaims = {
    messageType: "LtiDeepLinkingRequest",
    version: "1.3.0",
    deploymentId: "deploy-456",
    roles: [],
    iss: "https://canvas.university.edu",
    sub: "instructor-1",
    aud: "test-client-123",
    nonce: "nonce-dl",
    exp: Math.floor(Date.now() / 1000) + 600,
    iat: Math.floor(Date.now() / 1000),
    deepLinking: {
      deepLinkReturnUrl: "https://canvas.edu/return",
      acceptTypes: ["ltiResourceLink"],
      acceptMultiple: false,
    },
  };

  const items: DeepLinkItem[] = [
    { type: "ltiResourceLink", title: "B2 English Test", url: "https://b4skills.com/test/b2" }
  ];

  it("returns the deep link return URL", () => {
    const result = LtiService.buildDeepLinkResponse(dlClaims, CONFIG, items);
    expect(result.returnUrl).toBe("https://canvas.edu/return");
  });

  it("includes LtiDeepLinkingResponse message type in payload", () => {
    const result = LtiService.buildDeepLinkResponse(dlClaims, CONFIG, items);
    const NS = "https://purl.imsglobal.org/spec/lti/claim/";
    expect(result.jwtPayload[`${NS}message_type`]).toBe("LtiDeepLinkingResponse");
  });

  it("includes content items in payload", () => {
    const result = LtiService.buildDeepLinkResponse(dlClaims, CONFIG, items);
    const DL_NS = "https://purl.imsglobal.org/spec/lti-dl/claim/";
    const contentItems = result.jwtPayload[`${DL_NS}content_items`] as unknown[];
    expect(Array.isArray(contentItems)).toBe(true);
    expect(contentItems).toHaveLength(1);
  });

  it("returns a base64url-serialized payload", () => {
    const result = LtiService.buildDeepLinkResponse(dlClaims, CONFIG, items);
    expect(() => JSON.parse(Buffer.from(result.serializedPayload, "base64url").toString())).not.toThrow();
  });
});
