import type { RequestHandler, Request } from "express";
import { z, ZodError, type ZodType } from "zod";
import { logger } from "../observability/index.js";

export interface ValidateSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Express middleware that validates req.body / req.query / req.params against
 * zod schemas. On success, req.body/query/params are replaced with the parsed
 * (typed, coerced) result. On failure, responds with 400 + structured issues.
 */
export function validate(schemas: ValidateSchemas): RequestHandler {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.defineProperty(req, "query", { value: parsed, writable: true, configurable: true });
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Request["params"];
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
          code: i.code,
        }));
        logger.warn({ path: req.path, method: req.method, issues }, "Validation failed");
        return res.status(400).json({ error: "Validation failed", issues });
      }
      next(err);
    }
  };
}

export { z };
