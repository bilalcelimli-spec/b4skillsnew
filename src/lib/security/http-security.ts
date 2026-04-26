import helmet, { HelmetOptions } from "helmet";
import cors, { CorsOptions } from "cors";
import type { RequestHandler } from "express";

const isProd = process.env.NODE_ENV === "production";

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function buildCorsMiddleware(): RequestHandler {
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
      ? ["'self'"]
      : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    mediaSrc: ["'self'", "data:", "blob:", "https:"],
    connectSrc: [
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

export function assertProductionSecrets(): void {
  if (!isProd) return;
  const required = ["JWT_SECRET", "REFRESH_SECRET", "DATABASE_URL"];
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
}
