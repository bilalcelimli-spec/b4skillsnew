import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { logger } from "./logger.js";

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = (req.headers["x-request-id"] as string) || (req.headers["x-correlation-id"] as string);
    const id = existing || randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} ${res.statusCode} ${err.message}`,
  customProps: (req: any) => {
    // Enrich every log line with session/org context when available.
    // These are attached to req by auth middleware (server.ts checkAuth).
    const props: Record<string, unknown> = {};
    if (req.user?.id) props["userId"] = req.user.id;
    if (req.user?.organizationId) props["organizationId"] = req.user.organizationId;
    if (req.user?.role) props["userRole"] = req.user.role;
    // sessionId may be set by exam session routes
    if (req.sessionId) props["sessionId"] = req.sessionId;
    return props;
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
        // Redact sensitive paths from URL query strings
        urlSafe: (req.url || "").replace(/[?&](token|password|secret|key)=[^&]*/gi, "$1=[REDACTED]"),
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
  autoLogging: {
    ignore: (req) => {
      const url = req.url || "";
      return url.startsWith("/healthz") || url.startsWith("/readyz") || url.startsWith("/assets/") || url === "/favicon.ico";
    },
  },
});
