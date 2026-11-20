import helmet, { HelmetOptions } from "helmet";
import cors, { CorsOptions } from "cors";
import type { RequestHandler } from "express";

const isProd = process.env.NODE_ENV === "production";

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Browser origins allowed to make credentialed requests (CORS and the realtime WebSocket). */
export function buildOriginAllowlist(): Set<string> {
  // APP_URL: explicit; RENDER_EXTERNAL_URL: set on Render.com web services
  const appBase = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  const configured = [
    ...parseOrigins(process.env.CORS_ORIGINS),
    appBase,
  ].filter(Boolean) as string[];

  const allowlist = new Set(configured);

  if (!isProd) {
    allowlist.add("http://localhost:3000");
    allowlist.add("http://localhost:3001");
    allowlist.add("http://localhost:5173");
    allowlist.add("http://127.0.0.1:3001");
  }
  return allowlist;
}

export function buildCorsMiddleware(): RequestHandler {
  const allowlist = buildOriginAllowlist();

  const options: CorsOptions = {
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowlist.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 600,
  };

  return cors(options);
}

export function buildHelmetMiddleware(): RequestHandler {
  const cspDirectives: Record<string, string[] | null> = {
    defaultSrc: ["'self'"],
    scriptSrc: isProd
      ? ["'self'", "https://www.googletagmanager.com"]
      : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    mediaSrc: ["'self'", "data:", "blob:", "https:"],
    connectSrc: [
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://region1.google-analytics.com",
      "https://analytics.google.com",
      "'self'",
      ...(isProd ? [] : ["ws:", "wss:", "http://localhost:*"]),
      "https://*.sentry.io",
      "https://*.ingest.sentry.io",
      "https://*.ingest.us.sentry.io",
      "https://*.ingest.de.sentry.io",
    ],
    workerSrc: ["'self'", "blob:"],
    childSrc: ["'self'", "blob:"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: isProd ? [] : null,
  };

  const options: HelmetOptions = {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: Object.fromEntries(
        Object.entries(cspDirectives).filter(([, v]) => v !== null)
      ) as Record<string, string[]>,
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: isProd
      ? { maxAge: 15552000, includeSubDomains: true, preload: true }
      : false,
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  };

  return helmet(options);
}

/**
 * Refuses to start a production server with missing or unsafe configuration,
 * and warns about optional settings. Called from server.ts right after
 * SecretsManager.load(). On Render a failed start keeps the previous instances
 * serving, so a bad setting blocks the deploy instead of taking the site down.
 */
export function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== "production") return;
  const required = [
    "JWT_SECRET",
    "REFRESH_SECRET",
    "DATABASE_URL",
    "APP_URL",
    "RESEND_API_KEY",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Missing required production secrets: ${missing.join(", ")}. ` +
      `Set them before starting the server.`
    );
  }
  const weak = ["super-secret-default-key", "super-secret-refresh-key", "changeme", "secret"];
  if (weak.includes(process.env.JWT_SECRET!) || weak.includes(process.env.REFRESH_SECRET!)) {
    throw new Error("JWT_SECRET or REFRESH_SECRET is set to a known weak default. Rotate now.");
  }
  const appUrl = process.env.APP_URL!;
  // Local production builds (docker-compose) run on http://localhost.
  const localHttp = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(appUrl);
  if (!appUrl.startsWith("https://") && !localHttp) {
    throw new Error("APP_URL must be an https URL in production.");
  }
  const corsOrigins = parseOrigins(process.env.CORS_ORIGINS);
  if (!localHttp && !corsOrigins.includes(appUrl)) {
    throw new Error("CORS_ORIGINS must include APP_URL in production.");
  }
  // Stripe: warn but don't hard-fail — some deployments may not use payments
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("[startup] WARNING: STRIPE_SECRET_KEY is not set — payment endpoints will fail.");
  }
  // Webhook signing secrets are encrypted at rest; without a key, registration is refused.
  // A malformed key would make every signed delivery fail, so it stops the start.
  const encryptionKey = process.env.SECRET_ENCRYPTION_KEY?.trim();
  if (encryptionKey) {
    const bytes = /^[0-9a-fA-F]{64}$/.test(encryptionKey) ? Buffer.from(encryptionKey, "hex") : Buffer.from(encryptionKey, "base64");
    if (bytes.length !== 32) throw new Error("SECRET_ENCRYPTION_KEY must be 32 bytes (openssl rand -base64 32).");
  } else {
    console.warn("[startup] WARNING: SECRET_ENCRYPTION_KEY is not set — webhook registration is disabled and stored webhook secrets stay unencrypted.");
  }
  // Redis: warn if not set — rate limiting and exposure store will be per-instance
  if (!process.env.REDIS_URL) {
    console.warn("[startup] WARNING: REDIS_URL is not set — rate limiting and exposure tracking will not persist across restarts or scale horizontally.");
  }
}
