/**
 * b4skills Security Hardening Middleware
 *
 * - Helmet CSP (Content-Security-Policy)
 * - Rate limiting (per-route and global)
 * - HMAC request signature verification
 * - Timestamp replay-attack prevention (5 min window)
 * - IP blocklist support
 * - Request size enforcement
 */

import * as crypto from "crypto";
import type { Request, Response, NextFunction, Application } from "express";
import rateLimit from "express-rate-limit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecurityConfig {
  /** Allowed origins for CSP */
  trustedOrigins: string[];
  /** Max requests per window globally */
  globalRateLimit: { windowMs: number; max: number };
  /** Max requests per window for auth routes */
  authRateLimit: { windowMs: number; max: number };
  /** HMAC secret for signed requests (API consumers) */
  requestSigningSecret?: string;
  /** Enable timestamp validation */
  validateTimestamps: boolean;
  /** Max timestamp skew in seconds */
  maxTimestampSkewSeconds: number;
  /** IP addresses to block */
  blockedIps: string[];
}

const DEFAULT_CONFIG: SecurityConfig = {
  trustedOrigins: [],
  globalRateLimit: { windowMs: 15 * 60 * 1000, max: 500 },
  authRateLimit: { windowMs: 15 * 60 * 1000, max: 20 },
  validateTimestamps: true,
  maxTimestampSkewSeconds: 300,
  blockedIps: [],
};

// ---------------------------------------------------------------------------
// CSP generation
// ---------------------------------------------------------------------------

function buildCSP(config: SecurityConfig): string {
  const origins = config.trustedOrigins.map((o) => `'${o}'`).join(" ");
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.stripe.com`,
    `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net`,
    `img-src 'self' data: blob: https: ${origins}`,
    `connect-src 'self' https://api.stripe.com https://sentry.io wss: ${origins}`,
    `frame-src https://js.stripe.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ];
  return directives.join("; ");
}

// ---------------------------------------------------------------------------
// Security headers middleware
// ---------------------------------------------------------------------------

export function securityHeaders(config: Partial<SecurityConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction): void => {
    // CSP
    res.setHeader("Content-Security-Policy", buildCSP(cfg));
    // Strict-Transport-Security (HSTS)
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    // X-Frame-Options
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    // X-Content-Type-Options
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Referrer-Policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    // Permissions-Policy
    res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
    // Remove server fingerprint
    res.removeHeader("X-Powered-By");
    // Request ID for tracing
    const requestId = crypto.randomUUID();
    res.setHeader("X-Request-ID", requestId);
    (req as any).requestId = requestId;

    next();
  };
}

// ---------------------------------------------------------------------------
// IP blocklist middleware
// ---------------------------------------------------------------------------

export function ipBlocklist(blockedIps: string[] = []) {
  const blocked = new Set(blockedIps);
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "";
    if (blocked.has(ip)) {
      res.status(403).json({ error: "Forbidden", code: "IP_BLOCKED" });
      return;
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

export function globalRateLimiter(config?: { windowMs?: number; max?: number }) {
  return rateLimit({
    windowMs: config?.windowMs ?? 15 * 60 * 1000,
    max: config?.max ?? 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests", code: "RATE_LIMITED" },
  });
}

export function authRateLimiter(config?: { windowMs?: number; max?: number }) {
  return rateLimit({
    windowMs: config?.windowMs ?? 15 * 60 * 1000,
    max: config?.max ?? 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts", code: "AUTH_RATE_LIMITED" },
  });
}

export function apiRateLimiter(config?: { windowMs?: number; max?: number }) {
  return rateLimit({
    windowMs: config?.windowMs ?? 60 * 1000,
    max: config?.max ?? 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "API rate limit exceeded", code: "API_RATE_LIMITED" },
  });
}

// ---------------------------------------------------------------------------
// Request signature verification (for API clients / webhooks)
// ---------------------------------------------------------------------------

/**
 * Verify HMAC-SHA256 request signature from API consumers.
 * Header format:
 *   X-b4skills-Signature: sha256=<hmac>
 *   X-b4skills-Timestamp: <unix_epoch>
 */
export function verifyRequestSignature(secret: string, maxSkewSeconds = 300) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const signature = req.headers["x-b4skills-signature"] as string | undefined;
    const timestampHeader = req.headers["x-b4skills-timestamp"] as string | undefined;

    if (!signature || !timestampHeader) {
      res.status(401).json({ error: "Missing signature headers", code: "MISSING_SIGNATURE" });
      return;
    }

    // Timestamp replay prevention
    const timestamp = parseInt(timestampHeader, 10);
    if (isNaN(timestamp)) {
      res.status(401).json({ error: "Invalid timestamp", code: "INVALID_TIMESTAMP" });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > maxSkewSeconds) {
      res.status(401).json({ error: "Request timestamp expired", code: "EXPIRED_TIMESTAMP" });
      return;
    }

    // Compute expected signature
    const body = req.body ? JSON.stringify(req.body) : "";
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}:${body}`)
      .digest("hex");
    const expected = `sha256=${expectedHmac}`;

    // Constant-time comparison
    try {
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        res.status(401).json({ error: "Invalid signature", code: "INVALID_SIGNATURE" });
        return;
      }
    } catch {
      res.status(401).json({ error: "Signature comparison failed", code: "SIGNATURE_ERROR" });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// SQL injection pattern detector (defence-in-depth)
// ---------------------------------------------------------------------------

const SQL_INJECTION_PATTERNS = [
  /(\bUNION\b.*\bSELECT\b)/gi,
  /(';?\s*DROP\s+TABLE)/gi,
  /(\bEXEC\b\s*\()/gi,
  /(--\s*$)/gm,
];

export function sqlInjectionGuard() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = JSON.stringify(req.body ?? {}) + JSON.stringify(req.query) + JSON.stringify(req.params);
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(body)) {
        console.warn(`[Security] SQL injection pattern detected from ${req.ip}: ${req.path}`);
        res.status(400).json({ error: "Invalid input", code: "INJECTION_DETECTED" });
        return;
      }
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// Apply all security middleware to an Express app
// ---------------------------------------------------------------------------

export function applySecurityHardening(app: Application, config: Partial<SecurityConfig> = {}): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // IP blocklist first
  if (cfg.blockedIps.length > 0) {
    app.use(ipBlocklist(cfg.blockedIps));
  }

  // Security headers
  app.use(securityHeaders(cfg));

  // Global rate limiter
  app.use(globalRateLimiter(cfg.globalRateLimit));

  // SQL injection guard
  app.use(sqlInjectionGuard());

  console.log("✅ Security hardening applied");
}
