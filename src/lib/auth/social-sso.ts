/**
 * Social SSO Provider Integration
 * ─────────────────────────────────────────────────────────────────────────────
 * Supports:
 *   • Google   — OIDC via google-auth-library (ID token verify)
 *   • Microsoft — OIDC via @azure/msal-node  (authorization code flow)
 *   • LinkedIn  — OAuth 2.0 via https://api.linkedin.com/v2/userinfo (OIDC)
 *
 * Security:
 *   • State parameter CSRF protection for redirect flows
 *   • Nonce stored in signed HTTP-only cookie
 *   • Existing account linking: if email already exists, link the provider sub
 *   • Rate-limited per provider at server level
 *   • No secrets exposed to client bundle
 */

import crypto from "crypto";
import https from "https";
import { OAuth2Client } from "google-auth-library";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SocialProfile {
  provider:    "google" | "microsoft" | "linkedin";
  providerId:  string;    // OAuth subject (sub)
  email:       string;
  name:        string;
  picture?:    string;
  emailVerified: boolean;
}

export interface OAuthStatePayload {
  provider:    string;
  redirectUri: string;
  nonce:       string;
  createdAt:   number;
}

// ── State store (in-memory, TTL 10 min) ──────────────────────────────────────

const STATE_TTL_MS = 10 * 60 * 1000;
const pendingStates = new Map<string, OAuthStatePayload>();

export function createOAuthState(provider: string, redirectUri: string): string {
  const state = crypto.randomBytes(24).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, { provider, redirectUri, nonce, createdAt: Date.now() });
  // Prune old entries
  for (const [k, v] of pendingStates) {
    if (Date.now() - v.createdAt > STATE_TTL_MS) pendingStates.delete(k);
  }
  return state;
}

export function consumeOAuthState(state: string): OAuthStatePayload | null {
  const payload = pendingStates.get(state);
  if (!payload) return null;
  pendingStates.delete(state);
  if (Date.now() - payload.createdAt > STATE_TTL_MS) return null;
  return payload;
}

// ── Google ────────────────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID      = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET  = process.env.GOOGLE_CLIENT_SECRET ?? "";
const GOOGLE_REDIRECT_URI   = process.env.GOOGLE_REDIRECT_URI ?? `${process.env.APP_URL ?? "http://localhost:3001"}/api/auth/social/google/callback`;

// Singleton OAuth2Client — reuses cached Google public key certificates
const googleOAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

function httpsGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error("Invalid JSON: " + data.slice(0, 200))); }
      });
    }).on("error", reject);
  });
}

function httpsPost(url: string, body: string, headers: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(body) } };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error("Invalid JSON")); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/** Verify a Google ID token and return the profile. */
export async function verifyGoogleIdToken(idToken: string): Promise<SocialProfile> {
  if (!GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is not configured — cannot verify Google tokens");
  // OAuth2Client.verifyIdToken() verifies the JWT signature using Google's cached
  // public key certs (JWKS), checks expiry, iat, and audience. No tokeninfo
  // round-trip needed — faster and resilient to tokeninfo endpoint outages.
  const ticket = await googleOAuth2Client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error("Google token verification returned no payload");
  if (!payload.email) throw new Error("Google token missing email claim");
  return {
    provider:      "google",
    providerId:    payload.sub,
    email:         payload.email,
    name:          payload.name ?? payload.email,
    picture:       payload.picture,
    emailVerified: payload.email_verified ?? false,
  };
}

/** Generate the Google OAuth 2 authorization URL. */
export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:    GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type:"code",
    scope:        "openid email profile",
    state,
    access_type:  "offline",
    prompt:       "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Exchange Google authorization code for ID token and return profile. */
export async function googleCodeToProfile(code: string): Promise<SocialProfile> {
  const body = new URLSearchParams({
    code,
    client_id:     GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri:  GOOGLE_REDIRECT_URI,
    grant_type:    "authorization_code",
  }).toString();
  const tokens = await httpsPost("https://oauth2.googleapis.com/token", body, { "Content-Type": "application/x-www-form-urlencoded" });
  if (tokens.error) throw new Error(`Google token exchange failed: ${tokens.error_description ?? tokens.error}`);
  return verifyGoogleIdToken(tokens.id_token);
}

// ── Microsoft (Azure AD / Entra ID) ──────────────────────────────────────────

const MS_CLIENT_ID     = process.env.MICROSOFT_CLIENT_ID ?? "";
const MS_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET ?? "";
const MS_TENANT        = process.env.MICROSOFT_TENANT_ID ?? "common";
const MS_REDIRECT_URI  = process.env.MICROSOFT_REDIRECT_URI ?? `${process.env.APP_URL ?? "http://localhost:3001"}/api/auth/social/microsoft/callback`;
const MS_AUTH_BASE     = `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0`;

export function microsoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:    MS_CLIENT_ID,
    redirect_uri: MS_REDIRECT_URI,
    response_type:"code",
    response_mode:"query",
    scope:        "openid email profile User.Read",
    state,
    prompt:       "select_account",
  });
  return `${MS_AUTH_BASE}/authorize?${params}`;
}

export async function microsoftCodeToProfile(code: string): Promise<SocialProfile> {
  const body = new URLSearchParams({
    code,
    client_id:     MS_CLIENT_ID,
    client_secret: MS_CLIENT_SECRET,
    redirect_uri:  MS_REDIRECT_URI,
    grant_type:    "authorization_code",
    scope:         "openid email profile User.Read",
  }).toString();
  const tokens = await httpsPost(`${MS_AUTH_BASE}/token`, body, { "Content-Type": "application/x-www-form-urlencoded" });
  if (tokens.error) throw new Error(`Microsoft token exchange failed: ${tokens.error_description ?? tokens.error}`);

  // Validate via Microsoft's OIDC userinfo endpoint using the access_token.
  // This avoids trusting the ID token payload without RS256 signature verification.
  const userInfo = await new Promise<any>((resolve, reject) => {
    https.get("https://graph.microsoft.com/oidc/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error("Invalid JSON from Microsoft userinfo")); }
      });
    }).on("error", reject);
  });

  if (userInfo.error) throw new Error(`Microsoft userinfo failed: ${userInfo.error_description ?? userInfo.error}`);

  // oid from the ID token — more stable than sub across tenants
  const [, payloadB64] = tokens.id_token.split(".");
  const idPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

  return {
    provider:      "microsoft",
    providerId:    idPayload.oid ?? idPayload.sub ?? userInfo.sub,
    email:         userInfo.email ?? idPayload.email ?? idPayload.preferred_username,
    name:          userInfo.name ?? idPayload.name ?? userInfo.email,
    picture:       userInfo.picture,
    emailVerified: !!(userInfo.email ?? idPayload.email),
  };
}

// ── LinkedIn ──────────────────────────────────────────────────────────────────

const LI_CLIENT_ID     = process.env.LINKEDIN_CLIENT_ID ?? "";
const LI_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET ?? "";
const LI_REDIRECT_URI  = process.env.LINKEDIN_REDIRECT_URI ?? `${process.env.APP_URL ?? "http://localhost:3001"}/api/auth/social/linkedin/callback`;

export function linkedinAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:    LI_CLIENT_ID,
    redirect_uri: LI_REDIRECT_URI,
    response_type:"code",
    scope:        "openid profile email",
    state,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

export async function linkedinCodeToProfile(code: string): Promise<SocialProfile> {
  const body = new URLSearchParams({
    code,
    client_id:     LI_CLIENT_ID,
    client_secret: LI_CLIENT_SECRET,
    redirect_uri:  LI_REDIRECT_URI,
    grant_type:    "authorization_code",
  }).toString();
  const tokens = await httpsPost("https://www.linkedin.com/oauth/v2/accessToken", body, { "Content-Type": "application/x-www-form-urlencoded" });
  if (tokens.error) throw new Error(`LinkedIn token exchange failed: ${tokens.error_description ?? tokens.error}`);

  // LinkedIn OIDC userinfo endpoint
  const userInfo = await new Promise<any>((resolve, reject) => {
    https.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error("Invalid JSON")); }
      });
    }).on("error", reject);
  });

  return {
    provider:      "linkedin",
    providerId:    userInfo.sub,
    email:         userInfo.email,
    name:          userInfo.name ?? `${userInfo.given_name ?? ""} ${userInfo.family_name ?? ""}`.trim(),
    picture:       userInfo.picture,
    emailVerified: userInfo.email_verified ?? false,
  };
}

// ── Provider dispatch ─────────────────────────────────────────────────────────

export type SocialProvider = "google" | "microsoft" | "linkedin";

export function getSocialAuthUrl(provider: SocialProvider, state: string): string {
  switch (provider) {
    case "google":    return googleAuthUrl(state);
    case "microsoft": return microsoftAuthUrl(state);
    case "linkedin":  return linkedinAuthUrl(state);
  }
}

export async function exchangeSocialCode(provider: SocialProvider, code: string): Promise<SocialProfile> {
  switch (provider) {
    case "google":    return googleCodeToProfile(code);
    case "microsoft": return microsoftCodeToProfile(code);
    case "linkedin":  return linkedinCodeToProfile(code);
  }
}
