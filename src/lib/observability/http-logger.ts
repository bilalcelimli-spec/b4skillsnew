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
  serializers: {
    req(req) {
      return { id: req.id, method: req.method, url: req.url, remoteAddress: req.remoteAddress };
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
